<?php

namespace MediaWiki\Extension\Appointments\Store;

use MediaWiki\Extension\Appointments\Entity\Appointment;
use MediaWiki\Extension\Appointments\Entity\Participant;
use MediaWiki\User\UserIdentity;
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

	public function getAppointmentParticipants( string $appointmentId ): array {
		$raw = $this->queryParticipants( [ 'apa_app' => $appointmentId ] );

		$participants = [];
		foreach ( $raw as $p ) {
			$participants[] = new Participant(
				$p->pap_key,
				$p->pap_value
			);
		}
		return $participants;
	}

	public function getAppointmentIdsForUser( UserIdentity $user ): array {
		$rows = [
			[
				'ap_key' => 'user',
				'ap_value' => $user->getName()
			]
		];
		$userGroups = $this->getUserGroups( $user );
		foreach ( $userGroups as $userGroupRow ) {
			$rows[] = [
				'ap_key' => 'group',
				'ap_value' => $userGroupRow->ug_group,
			];
		}

		$db = $this->lb->getConnection( DB_REPLICA );
		$participantRows = $db->newSelectQueryBuilder()
			->select( 'apa_id' )
			->from( 'appointment_participant_assignments', 'apa' )
			->from( 'appointment_participants', 'ap' )
			->join( 'appointment_participants', 'ap', [ 'ap.ap_id = apa.apa_participant' ] )
			->where( $db->makeList( [
				'apa.apa_key' => array_column( $rows, 'ap_key' ),
				'apa.apa_value' => array_column( $rows, 'ap_value' )
			], LIST_OR ) )
			->caller( __METHOD__ )
			->fetchResultSet();

		$appointmentIds = [];
		foreach ( $participantRows as $row ) {
			$appointmentIds[] = $row->apa_id;
		}
		return $appointmentIds;
	}

	public function storeParticipants( Appointment $appointment ) {


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
}