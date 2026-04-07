<?php

namespace MediaWiki\Extension\Appointments\Store;

use DateTime;
use MediaWiki\Extension\Appointments\Entity\Appointment;
use MediaWiki\Extension\Appointments\Entity\Calendar;
use MediaWiki\Extension\Appointments\Entity\PeriodDefinition;
use MediaWiki\Extension\Appointments\Utils\RecurrenceRule;
use MediaWiki\User\UserFactory;
use stdClass;
use Wikimedia\Rdbms\ILoadBalancer;

readonly class AppointmentStore {

	public const APPOINTMENT_FIELDS = [
		'app_guid', 'app_calendar_guid', 'app_title', 'app_start', 'app_end',
		'app_is_all_day', 'app_recurring', 'app_creator', 'app_created_at', 'app_data'
	];

	/**
	 * @param ILoadBalancer $lb
	 * @param ParticipantStore $participantStore
	 * @param CalendarStore $calendarStore
	 * @param UserFactory $userFactory
	 */
	public function __construct(
		private ILoadBalancer    $lb,
		private ParticipantStore $participantStore,
		private CalendarStore    $calendarStore,
		private UserFactory      $userFactory
	) {
	}

	public function storeAppointment( Appointment $appointment ): void {
		$db = $this->lb->getConnection( DB_PRIMARY );
		$db->startAtomic( __METHOD__ );
		$this->participantStore->clearForAppointment( $appointment );
		if ( $this->hasAppointment( $appointment->guid ) ) {
			$this->update( $appointment );
		} else {
			$this->insert( $appointment );
		}
		$this->participantStore->storeParticipants( $appointment );
		$db->endAtomic( __METHOD__ );
	}

	public function hasAppointment( string $guid ): bool {
		return $this->lb->getConnection( DB_REPLICA )->newSelectQueryBuilder()
			->select( 'app_guid' )
			->from( 'appointments' )
			->where( [ 'app_guid' => $guid ] )
			->caller( __METHOD__ )
			->fetchField() !== false;
	}

	/**
	 * @param string $guid
	 * @return Appointment|null
	 */
	public function getAppointment( string $guid ): ?Appointment {
		$row = $this->lb->getConnection( DB_REPLICA )->newSelectQueryBuilder()
			->select( self::APPOINTMENT_FIELDS )
			->from( 'appointments' )
			->where( [ 'app_guid' => $guid ] )
			->caller( __METHOD__ )
			->fetchRow();

		if ( !$row ) {
			return null;
		}
		return $this->appointmentFromRow( $row );
	}

	/**
	 * @param Calendar $calendar
	 * @return array
	 */
	public function getAppointmentsForCalendar( Calendar $calendar ): array {
		$res = $this->lb->getConnection( DB_REPLICA )->newSelectQueryBuilder()
			->select( static::APPOINTMENT_FIELDS )
			->from( 'appointments' )
			->where( [ 'app_calendar_guid' => $calendar->guid ] )
			->caller( __METHOD__ )
			->fetchResultSet();

		return $this->appointmentsFromResultSet( $res );
	}

	/**
	 * @param Appointment $appointment
	 * @return void
	 */
	public function deleteAppointment( Appointment $appointment ): void {
		$db = $this->lb->getConnection( DB_PRIMARY );
		$db->startAtomic( __METHOD__ );
		$db->newDeleteQueryBuilder()
			->deleteFrom( 'appointments' )
			->where( [ 'app_guid' => $appointment->guid ] )
			->caller( __METHOD__ )
			->execute();
		$this->participantStore->clearForAppointment( $appointment );
		$db->endAtomic( __METHOD__ );
	}

	/**
	 * @param Calendar $calendar
	 * @return void
	 */
	public function deleteForCalendar( Calendar $calendar ): void {
		$appointments = $this->getAppointmentsForCalendar( $calendar );
		foreach ( $appointments as $appointment ) {
			$this->deleteAppointment( $appointment );
		}
	}

	/**
	 * @param Calendar $source
	 * @param Calendar $target
	 * @return void
	 */
	public function moveToCalendar( Calendar $source, Calendar $target ): void {
		$this->lb->getConnection( DB_PRIMARY )->newUpdateQueryBuilder()
			->update( 'appointments' )
			->set( [ 'app_calendar_guid' => $target->guid ] )
			->where( [ 'app_calendar_guid' => $source->guid ] )
			->caller( __METHOD__ )
			->execute();
	}

	/**
	 * @return AppointmentQuery
	 */
	public function newQuery(): AppointmentQuery {
		return new AppointmentQuery( $this, $this->lb->getConnection( DB_REPLICA ), $this->participantStore );
	}

	/**
	 * @param Appointment $appointment
	 * @return void
	 */
	private function insert( Appointment $appointment ): void {
		$db = $this->lb->getConnection( DB_PRIMARY );
		$db->newInsertQueryBuilder()
			->insert( 'appointments' )
			->row( [
				'app_guid' => $appointment->guid,
				'app_calendar_guid' => $appointment->calendar->guid,
				'app_title' => $appointment->title,
				'app_start' => $appointment->periodDefinition->getStart()->format( 'YmdHis' ),
				'app_end' => $appointment->periodDefinition->getEnd()->format( 'YmdHis' ),
				'app_is_all_day' => $appointment->periodDefinition->isAllDay() ? 1 : 0,
				'app_recurring' => $appointment->periodDefinition->getRecurrenceRule()?->getRule(),
				'app_creator' => $appointment->creator->getId(),
				'app_created_at' => $db->timestamp(),
				'app_data' => json_encode( $appointment->data ),
			] )
			->caller( __METHOD__ )
			->execute();
	}

	/**
	 * @param Appointment $appointment
	 * @return void
	 */
	private function update( Appointment $appointment ): void {
		$this->lb->getConnection( DB_PRIMARY )->newUpdateQueryBuilder()
			->update( 'appointments' )
			->set( [
				'app_calendar_guid' => $appointment->calendar->guid,
				'app_title' => $appointment->title,
				'app_start' => $appointment->periodDefinition->getStart()->format( 'YmdHis' ),
				'app_end' => $appointment->periodDefinition->getEnd()->format( 'YmdHis' ),
				'app_is_all_day' => $appointment->periodDefinition->isAllDay() ? 1 : 0,
				'app_recurring' => $appointment->periodDefinition->getRecurrenceRule()?->getRule(),
				'app_data' => json_encode( $appointment->data ),
			] )
			->where( [ 'app_guid' => $appointment->guid ] )
			->caller( __METHOD__ )
			->execute();
	}

	/**
	 * @param $res
	 * @return array
	 */
	private function appointmentsFromResultSet( $res ): array {
		$appointments = [];
		foreach ( $res as $row ) {
			$appointments[] = $this->appointmentFromRow( $row );
		}
		return $appointments;
	}

	/**
	 * @param stdClass $row
	 * @return Appointment
	 */
	public function appointmentFromRow( stdClass $row ): Appointment {
		$calendar = $this->calendarStore->getCalendar( $row->app_calendar_guid );
		if ( !$calendar ) {
			throw new \UnexpectedValueException( "Calendar with guid {$row->app_calendar_guid} not found" );
		}
		$participants = $this->participantStore->getAppointmentParticipants( $row->app_guid );
		return new Appointment(
			guid: $row->app_guid,
			title: $row->app_title,
			participants: $participants,
			calendar: $calendar,
			periodDefinition: new PeriodDefinition(
				start: DateTime::createFromFormat( 'YmdHis', $row->app_start ),
				end: DateTime::createFromFormat( 'YmdHis', $row->app_end ),
				isAllDay: (bool)$row->app_is_all_day,
				recurrenceRule: $row->app_recurring ? new RecurrenceRule( $row->app_recurring ) : null,
			),
			creator: $this->userFactory->newFromId( $row->app_creator ),
			data: json_decode( $row->app_data, true ) ?? []
		);
	}
}
