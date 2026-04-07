<?php

namespace MediaWiki\Extension\Appointments\Utils;

use MediaWiki\Extension\Appointments\Entity\Participant;
use MediaWiki\User\UserFactory;
use Wikimedia\Rdbms\ILoadBalancer;

readonly class ParticipantResolver {

	/**
	 * @param ILoadBalancer $lb
	 * @param UserFactory $userFactory
	 */
	public function __construct(
		private ILoadBalancer $lb,
		private UserFactory   $userFactory
	) {}

	/**
	 * @param Participant $participant
	 * @return array
	 */
	public function resolveToUsers( Participant $participant ): array {
		if ( $participant->getKey() === 'user' ) {
			return $this->getValidatedUsers( [ $participant->getValue() ] );
		}
		if ( $participant->getKey() === 'group' ) {
			$users = $this->getUsersInGroup( $participant->getValue() );
			return $this->getValidatedUsers( $users );
		}
		return [];
	}

	/**
	 * @param array $participantData
	 * @return array
	 */
	public function participantsFromData( array $participantData ): array {
		$participants = [];
		foreach ( $participantData as $p ) {
			$this->assertValidParticipantData( $p );
			$participants[] = new Participant(
				$p['key'],
				$p['value']
			);
		}

		return $participants;
	}

	/**
	 * @param array $oldParticipants
	 * @param array $newParticipants
	 * @return array
	 */
	public function getParticipantDifference( array $oldParticipants, array $newParticipants ): array {
		$oldUsers = array_reduce( $oldParticipants, function ( $carry, Participant $p ) {
			return array_merge( $carry, $this->resolveToUsers( $p ) );
		}, [] );
		$newUsers = array_reduce( $newParticipants, function ( $carry, Participant $p ) {
			return array_merge( $carry, $this->resolveToUsers( $p ) );
		}, [] );

		$removed = array_diff( $oldUsers, $newUsers );
		$added = array_diff( $newUsers, $oldUsers );

		return [ $removed, $added ];
	}

	/**
	 * @param array $usernames
	 * @return array
	 */
	private function getValidatedUsers( array $usernames ): array {
		$validUsers = [];
		foreach ( $usernames as $username ) {
			$user = $this->userFactory->newFromName( $username );
			if ( !$user || !$user->isRegistered() ) {
				continue;
			}
			if ( $user->getBlock() ) {
				continue;
			}
			$validUsers[] = $user;
		}
		return $validUsers;
	}

	/**
	 * @param string $groupName
	 * @return array
	 */
	private function getUsersInGroup( string $groupName ): array {
		$db = $this->lb->getConnection( ILoadBalancer::DB_REPLICA );
		$res = $db->newSelectQueryBuilder()
			->select( [ 'ug_user', 'user_name' ] )
			->from( 'user_groups' )
			->from( 'user', 'u' )
			->where( [ 'ug_group' => $groupName ] )
			->join( 'user', 'u', [ 'ug_user' => 'user_id' ] )
			->caller( __METHOD__ )
			->fetchResultSet();
		$users = [];
		foreach ( $res as $row ) {
			$users[] = $row->user_name;
		}
		return $users;

	}

	/**
	 * @param mixed $data
	 * @return void
	 */
	private function assertValidParticipantData( mixed $data ): void {
		if ( !is_array( $data ) || !isset( $data['key'] ) || !isset( $data['value'] ) ) {
			throw new \InvalidArgumentException( 'Invalid participant data' );
		}
	}
}