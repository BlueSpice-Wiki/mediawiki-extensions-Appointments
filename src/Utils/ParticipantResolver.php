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
	public function resolveToUsers( Participant $participant ) {
		if ( $participant->getKey() === 'user' ) {
			return $this->getValidatedUsers( [ $participant->get() ] );
		}
		if ( $participant->getKey() === 'group' ) {
			$users = $this->getUsersInGroup( $participant->getValue() );
			return $this->getValidatedUsers( $users );
		}
		return [];
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
}