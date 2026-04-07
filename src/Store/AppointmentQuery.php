<?php

namespace MediaWiki\Extension\Appointments\Store;

use MediaWiki\Extension\Appointments\Entity\Appointment;
use MediaWiki\Extension\Appointments\Entity\Calendar;
use MediaWiki\Extension\Appointments\Entity\PeriodDefinition;
use MediaWiki\User\UserIdentity;
use Wikimedia\Rdbms\IDatabase;

class AppointmentQuery {

	/** @var array */
	private array $conds = [];

	/**
	 * @param AppointmentStore $appointmentStore
	 * @param IDatabase $db
	 * @param ParticipantStore $participantStore
	 */
	public function __construct(
		private readonly AppointmentStore $appointmentStore,
		private readonly IDatabase $db,
		private readonly ParticipantStore $participantStore
	) {}

	/**
	 * @param Calendar $calendar
	 * @return $this
	 */
	public function forCalendar( Calendar $calendar ): self {
		$this->conds['app_calendar_guid'] = $calendar->guid;
		return $this;
	}

	/**
	 * @param UserIdentity $user
	 * @return $this
	 */
	public function forUser( UserIdentity $user ): self {
		$this->conds[] = $this->participantStore->getParticipantCondition( $user, $this->db );
		return $this;
	}

	/**
	 * @param PeriodDefinition $periodDefinition
	 * @return $this
	 */
	public function forPeriod( PeriodDefinition $periodDefinition ): self {
		$this->conds[] = $this->db->makeList( [
			[
				'app_start >= ' . $periodDefinition->getStart()->format( 'Ymd' ),
				'app_end <= ' . $periodDefinition->getEnd()->format( 'Ymd' ),
			],
			'app_recurring IS NULL'
		], LIST_OR );

		return $this;
	}

	/**
	 * @return Appointment[]
	 */
	public function execute(): array {
		$res = $this->db->newSelectQueryBuilder()
			->from( 'appointments', 'a' )
			->from( 'appointment_participants', 'ap' )
			->select( AppointmentStore::APPOINTMENT_FIELDS )
			->where( $this->conds )
			->join( 'appointment_participants', 'ap', 'ap.ap_app = a.app_guid' )
			->caller( __METHOD__ )
			->fetchResultSet();

		$appointments = [];
		foreach ( $res as $row ) {
			$appointments[] = $this->appointmentStore->appointmentFromRow( $row );
		}
		return $appointments;
	}
}