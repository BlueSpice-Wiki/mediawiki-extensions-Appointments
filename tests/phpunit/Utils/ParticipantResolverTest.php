<?php

namespace MediaWiki\Extension\Appointments\Tests\Utils;

use InvalidArgumentException;
use MediaWiki\Extension\Appointments\Entity\Participant;
use MediaWiki\Extension\Appointments\Utils\ParticipantResolver;
use MediaWiki\User\User;
use MediaWiki\User\UserFactory;
use PHPUnit\Framework\TestCase;
use Wikimedia\Rdbms\FakeResultWrapper;
use Wikimedia\Rdbms\ILoadBalancer;
use Wikimedia\Rdbms\IDatabase;
use Wikimedia\Rdbms\SelectQueryBuilder;

/**
 * @covers \MediaWiki\Extension\Appointments\Utils\ParticipantResolver
 */
class ParticipantResolverTest extends TestCase {

	public function testParticipantsFromDataCreatesParticipantObjects(): void {
		$resolver = new ParticipantResolver(
			$this->createMock( ILoadBalancer::class ),
			$this->createMock( UserFactory::class )
		);

		$participants = $resolver->participantsFromData( [
			[ 'key' => 'user', 'value' => 'Alice' ],
			[ 'key' => 'group', 'value' => 'sysop' ],
		] );

		$this->assertCount( 2, $participants );
		$this->assertInstanceOf( Participant::class, $participants[0] );
		$this->assertSame( 'user', $participants[0]->getKey() );
		$this->assertSame( 'Alice', $participants[0]->getValue() );
		$this->assertSame( 'group', $participants[1]->getKey() );
		$this->assertSame( 'sysop', $participants[1]->getValue() );
	}

	public function testParticipantsFromDataRejectsInvalidData(): void {
		$resolver = new ParticipantResolver(
			$this->createMock( ILoadBalancer::class ),
			$this->createMock( UserFactory::class )
		);

		$this->expectException( InvalidArgumentException::class );
		$this->expectExceptionMessage( 'Invalid participant data' );

		$resolver->participantsFromData( [ 'invalid' ] );
	}

	public function testResolveToUsersReturnsValidatedUserForUserParticipant(): void {
		$validUser = $this->createMock( User::class );
		$validUser->method( 'isRegistered' )->willReturn( true );
		$validUser->method( 'getBlock' )->willReturn( null );

		$userFactory = $this->createMock( UserFactory::class );
		$userFactory->method( 'newFromName' )->willReturnCallback(
			static fn ( string $name ) => $name === 'Alice' ? $validUser : null
		);

		$resolver = new ParticipantResolver(
			$this->createMock( ILoadBalancer::class ),
			$userFactory
		);
		$participants = $resolver->resolveToUsers( new Participant( 'user', 'Alice' ) );

		$this->assertSame( [ $validUser ], $participants );
	}

	public function testResolveToUsersReturnsEmptyForUnknownParticipantKey(): void {
		$resolver = new ParticipantResolver(
			$this->createMock( ILoadBalancer::class ),
			$this->createMock( UserFactory::class )
		);

		$this->assertSame( [], $resolver->resolveToUsers( new Participant( 'unknown', 'Alice' ) ) );
	}

	public function testResolveToUsersReturnsEmptyForUnregisteredUser(): void {
		$unregistered = $this->createMock( User::class );
		$unregistered->method( 'isRegistered' )->willReturn( false );

		$userFactory = $this->createMock( UserFactory::class );
		$userFactory->method( 'newFromName' )->willReturn( $unregistered );

		$resolver = new ParticipantResolver(
			$this->createMock( ILoadBalancer::class ),
			$userFactory
		);

		$this->assertSame( [], $resolver->resolveToUsers( new Participant( 'user', 'Ghost' ) ) );
	}

	public function testResolveToUsersForGroupFetchesAndValidatesGroupMembers(): void {
		$validUser = $this->createMock( User::class );
		$validUser->method( 'isRegistered' )->willReturn( true );
		$validUser->method( 'getBlock' )->willReturn( null );

		$invalidUser = $this->createMock( User::class );
		$invalidUser->method( 'isRegistered' )->willReturn( false );

		$userFactory = $this->createMock( UserFactory::class );
		$userFactory->method( 'newFromName' )->willReturnCallback(
			static fn ( string $name ) => $name === 'Alice' ? $validUser : $invalidUser
		);

		$builder = $this->createMock( SelectQueryBuilder::class );
		$builder->method( 'select' )->willReturnSelf();
		$builder->method( 'from' )->willReturnSelf();
		$builder->method( 'where' )->willReturnSelf();
		$builder->method( 'join' )->willReturnSelf();
		$builder->method( 'caller' )->willReturnSelf();
		$builder->method( 'fetchResultSet' )->willReturn( new FakeResultWrapper( [
			(object)[ 'user_name' => 'Alice' ],
			(object)[ 'user_name' => 'Bob' ],
		] ) );

		$db = $this->createMock( IDatabase::class );
		$db->method( 'newSelectQueryBuilder' )->willReturn( $builder );

		$loadBalancer = $this->createMock( ILoadBalancer::class );
		$loadBalancer->method( 'getConnection' )
			->with( ILoadBalancer::DB_REPLICA )
			->willReturn( $db );

		$resolver = new ParticipantResolver( $loadBalancer, $userFactory );
		$users = $resolver->resolveToUsers( new Participant( 'group', 'sysop' ) );

		$this->assertSame( [ $validUser ], $users );
	}

	public function testGetParticipantDifferenceReturnsRemovedAndAddedLists(): void {
		$resolver = new ParticipantResolver(
			$this->createMock( ILoadBalancer::class ),
			$this->createMock( UserFactory::class )
		);

		[ $removed, $added ] = $resolver->getParticipantDifference(
			[ new Participant( 'unknown', 'A' ) ],
			[ new Participant( 'unknown', 'B' ) ]
		);

		$this->assertSame( [], $removed );
		$this->assertSame( [], $added );
	}
}

