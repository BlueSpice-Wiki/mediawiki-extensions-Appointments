<?php

namespace MediaWiki\Extension\Appointments\Store;

use MediaWiki\Extension\Appointments\Entity\Appointment;
use MediaWiki\Extension\Appointments\Entity\Participant;
use MediaWiki\User\UserIdentity;
use Wikimedia\Rdbms\Database;
use Wikimedia\Rdbms\IDatabase;
use Wikimedia\Rdbms\ILoadBalancer;
use Wikimedia\Rdbms\IResultWrapper;

class ParticipantStore {

	/**
	 * @param ILoadBalancer $lb
	 */
	public function __construct(
		private readonly ILoadBalancer $lb
	) {
	}

	/**
	 * @param string $appointmentId
	 * @return array
	 */
	public function getAppointmentParticipants( string $appointmentId ): array {
		$raw = $this->lb->getConnection( DB_REPLICA )->newSelectQueryBuilder()
			->select( [ 'ap_key', 'ap_value' ] )
			->from( 'appointment_participants' )
			->where( [ 'ap_app' => $appointmentId ] )
			->caller( __METHOD__ )
			->fetchResultSet();

		$participants = [];
		foreach ( $raw as $p ) {
			$participants[] = new Participant(
				$p->ap_key,
				$p->ap_value
			);
		}
		return $participants;
	}

	/**
	 * @param UserIdentity $user
	 * @return array
	 */
	public function getAppointmentIdsForUser( UserIdentity $user ): array {
		$db = $this->lb->getConnection( DB_REPLICA );
		$res = $db->newSelectQueryBuilder()
			->select( 'apa_app' )
			->from( 'appointment_participants' )
			->where( $this->getParticipantCondition( $user, $db ) )
			->caller( __METHOD__ )
			->fetchResultSet();

		$appointmentIds = [];
		foreach ( $res as $row ) {
			$appointmentIds[] = $row->apa_app;
		}
		return $appointmentIds;
	}

	/**
	 * Get condition to select appointments where the user is a participant.
	 * @param UserIdentity $user
	 * @param Database $db
	 * @return string
	 */
	public function getParticipantCondition( UserIdentity $user, IDatabase $db ): string {
		$rows = [
			$db->makeList( [
				'ap_key' => 'user',
				'ap_value' => $user->getName()
			], LIST_AND )
		];
		$userGroups = $this->getUserGroups( $user );
		foreach ( $userGroups as $userGroupRow ) {
			$rows[] = $db->makeList( [
				'ap_key' => 'group',
				'ap_value' => $userGroupRow->ug_group,
			], LIST_AND );
		}

		return $db->makeList( $rows, LIST_OR );

	}

	/**
	 * @param Appointment $appointment
	 * @return void
	 */
	public function storeParticipants( Appointment $appointment ): void {
		$rows = [];
		foreach ( $appointment->participants as $participant ) {
			$rows[] = [
				'ap_app' => $appointment->guid,
				'ap_key' => $participant->getKey(),
				'ap_value' => $participant->getValue(),
			];
		}
		if ( empty( $rows ) ) {
			return;
		}
		$this->lb->getConnection( DB_PRIMARY )->newInsertQueryBuilder()
			->insertInto( 'appointment_participants' )
			->rows( $rows )
			->caller( __METHOD__ )
			->execute();
	}

	/**
	 * @param UserIdentity $user
	 * @return IResultWrapper
	 */
	private function getUserGroups( UserIdentity $user ): IResultWrapper {
		$db = $this->lb->getConnection( DB_REPLICA );
		return $db->newSelectQueryBuilder()
			->select( [ 'ug_group' ] )
			->from( 'user_groups' )
			->where( [
				'ug_user' => $user->getId()
			] )
			->caller( __METHOD__ )
			->fetchResultSet();
	}

	/**
	 * @param Appointment $appointment
	 * @return void
	 */
	public function clearForAppointment( Appointment $appointment ): void {
		$db = $this->lb->getConnection( DB_PRIMARY );
		$db->newDeleteQueryBuilder()
			->deleteFrom( 'appointment_participants' )
			->where( [ 'ap_app' => $appointment->guid ] )
			->caller( __METHOD__ )
			->execute();
	}
}
