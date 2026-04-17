<?php

namespace MediaWiki\Extension\Appointments\Store;

use MediaWiki\Extension\Appointments\Entity\Appointment;
use MediaWiki\Extension\Appointments\Entity\Calendar;
use MediaWiki\Extension\Appointments\Entity\NaivePeriod;
use MediaWiki\Extension\Appointments\Entity\PeriodDefinition;
use MediaWiki\User\UserIdentity;
use Wikimedia\Rdbms\IDatabase;

class AppointmentQuery {

	/** @var array */
	private array $conds = [];

	/** @var PeriodDefinition|null */
	private ?NaivePeriod $queryPeriod = null;

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
	 * @param NaivePeriod $period
	 * @return $this
	 */
	public function forPeriod( NaivePeriod $period ): self {
		$this->conds[] = $this->db->makeList( [
			// Starts within period
			$this->db->makeList( [
				'app_start >= ' . $this->db->addQuotes( $period->getStart()->format( 'YmdHis' ) ),
				'app_start <= ' . $this->db->addQuotes( $period->getEnd()->format( 'YmdHis' ) ),
			], LIST_AND ),
			// Ends within period
			$this->db->makeList( [
				'app_end >= ' . $this->db->addQuotes( $period->getStart()->format( 'YmdHis' ) ),
				'app_end <= ' . $this->db->addQuotes( $period->getEnd()->format( 'YmdHis' ) ),
			], LIST_AND ),
			// Is recurring
			'app_recurring IS NOT NULL'
		], LIST_OR );

		$this->queryPeriod = $period;

		return $this;
	}

	/**
	 * @param array $eventTypes
	 * @return $this
	 */
	public function forEventTypes( array $eventTypes ): self {
		$this->conds[] = 'app_event_type IN (' .
			$this->db->makeList( array_map( fn( $et ) => $et->guid, $eventTypes ) ) .
		')';

		return $this;
	}

	/**
	 * @return self
	 */
	public function forNextWeek(): self {
		$now = ( new \DateTime() )->setTime( 0, 0, 0 );
		$nextWeek = ( new \DateTime() )->modify( '+1 week' )->modify( '+1 day' )->setTime( 0, 0, 0 );
		$this->conds[] = 'app_start >= ' . $this->db->addQuotes( $now->format( 'YmdHis' ) );
		$this->conds[] = 'app_start <= ' . $this->db->addQuotes( $nextWeek->format( 'YmdHis' ) );

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
			->leftJoin( 'appointment_participants', 'ap', 'ap.ap_app = a.app_guid' )
			->caller( __METHOD__ )
			->groupBy( 'a.app_guid' )
			->fetchResultSet();

		$appointments = [];
		foreach ( $res as $row ) {
			$appointment = $this->appointmentStore->appointmentFromRow( $row );
			if ( $this->queryPeriod ) {
				$period = $appointment->periodDefinition;
				$getNext = false;
				do {
					$period = $period->getMatchInPeriod( $this->queryPeriod, $getNext );
					if ( $period ) {
						$appointment = clone $appointment;
						$appointment->periodDefinition = clone $period;
						$appointments[] = $appointment;
						$getNext = true;
					}
				} while ( $period !== null && $period->getRecurrenceRule() );

			} else {
				$appointments[] = $appointment;
			}
		}
		return $appointments;
	}
}