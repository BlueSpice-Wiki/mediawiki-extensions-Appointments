<?php

namespace MediaWiki\Extension\Appointments\Store;

use MediaWiki\Extension\Appointments\Entity\Calendar;
use MediaWiki\Extension\Appointments\Entity\EventType;
use MediaWiki\User\UserFactory;
use stdClass;
use Wikimedia\Rdbms\ILoadBalancer;

class EventTypeStore {

	private const FIELDS = [
		'aet_guid', 'aet_name', 'aet_description', 'aet_created_at', 'aet_creator', 'aet_data', 'aet_is_system'
	];

	private array $calendars = [];

	/**
	 * @param ILoadBalancer $lb
	 * @param UserFactory $userFactory
	 * @param array $systemTypes
	 */
	public function __construct(
		private ILoadBalancer    $lb,
		private UserFactory 	 $userFactory,
		private array			 $systemTypes
	) {
	}

	/**
	 * @param EventType $eventType
	 * @return void
	 */
	public function storeEventType( EventType $eventType ): void {
		if ( $eventType->isSystem() ) {
			return;
		}
		$db = $this->lb->getConnection( DB_PRIMARY );
		$exists = $db->newSelectQueryBuilder()
			->select( 'aet_is_system' )
			->from( 'appointment_event_types' )
			->where( [ 'aet_guid' => $eventType->guid ] )
			->caller( __METHOD__ )
			->fetchRow();

		if ( $exists && $exists->aet_is_system === '1' ) {
			throw new \InvalidArgumentException( 'Cannot modify system event type' );
		}
		if ( $exists ) {
			$db->newUpdateQueryBuilder()
				->update( 'appointment_event_types' )
				->set( [
					'aet_name' => $eventType->name,
					'aet_description' => $eventType->description,
					'aet_data' => json_encode( $eventType->data ),
				] )
				->where( [ 'aet_guid' => $eventType->guid ] )
				->caller( __METHOD__ )
				->execute();
		} else {
			$db->newInsertQueryBuilder()
				->insertInto( 'appointment_event_types' )
				->row( [
					'aet_guid' => $eventType->guid,
					'aet_name' => $eventType->name,
					'aet_description' => $eventType->description,
					'aet_created_at' => $db->timestamp( time() ),
					'aet_creator' => $eventType->creator->getId(),
					'aet_data' => json_encode( $eventType->data ),
					'aet_is_system' => $eventType->isSystem() ? '1' : '0'
				] )
				->caller( __METHOD__ )
				->execute();
		}
	}

	/**
	 * @param string $guid
	 * @return EventType|null
	 */
	public function getEventType( string $guid ): ?EventType {
		if ( isset( $this->systemTypes[$guid] ) ) {
			return $this->systemTypes[$guid];
		}
		$row = $this->lb->getConnection( DB_REPLICA )->newSelectQueryBuilder()
			->select( self::FIELDS )
			->from( 'appointment_event_types' )
			->where( [ 'aet_guid' => $guid ] )
			->caller( __METHOD__ )
			->fetchRow();

		if ( !$row ) {
			return null;
		}
		return $this->makeFromRow( $row );
	}

	/**
	 * @return array
	 */
	public function getEventTypes(): array {
		$db = $this->lb->getConnection( DB_REPLICA );
		$res = $db->newSelectQueryBuilder()
			->select( self::FIELDS )
			->from( 'appointment_event_types' )
			->caller( __METHOD__ )
			->fetchResultSet();

		$eventTypes = [];
		foreach ( $res as $row ) {
			$eventTypes[] = $this->makeFromRow( $row );
		}
		return array_merge( $this->systemTypes, $eventTypes );
	}

	/**
	 * @param string $calendarGuid
	 * @return array
	 */
	public function getEventsForCalendarGuid( string $calendarGuid ): array {
		$db = $this->lb->getConnection( DB_REPLICA );
		$res = $db->newSelectQueryBuilder()
			->select( self::FIELDS )
			->from( 'appointment_event_types', 'aet' )
			->from( 'appointment_event_type_assignments', 'aeta' )
			->join( 'appointment_event_type_assignments', 'aeta', [ 'aeta_type = aet_guid' ] )
			->where( [ 'aeta_calendar' => $calendarGuid ] )
			->caller( __METHOD__ )
			->fetchResultSet();

		$systemAssignments = $db->newSelectQueryBuilder()
			->select( [ 'aeta_type', 'aet_guid' ] )
			->from( 'appointment_event_type_assignments', 'aeta' )
			->from( 'appointment_event_types', 'aet' )
			->where( [ 'aet_guid IS NULL', 'aeta_calendar' => $calendarGuid ] )
			->leftJoin( 'appointment_event_types', 'aet', [ 'aet.aet_guid = aeta.aeta_type' ] )
			->caller( __METHOD__ )
			->fetchResultSet();


		$eventTypes = [];
		foreach ( $systemAssignments as $assignment ) {
			if ( isset( $this->systemTypes[$assignment->aeta_type] ) ) {
				$eventTypes[] = $this->systemTypes[$assignment->aeta_type];
			}
		}

		foreach ( $res as $row ) {
			$eventTypes[] = $this->makeFromRow( $row );
		}
		return $eventTypes;
	}

	/**
	 * @param EventType $eventType
	 * @return void
	 */
	public function deleteEventType( EventType $eventType ): void  {
		if ( $eventType->isSystem() ) {
			throw new \InvalidArgumentException( 'Cannot delete system event type' );
		}
		$this->lb->getConnection( DB_PRIMARY )->newDeleteQueryBuilder()
			->deleteFrom( 'appointment_event_types' )
			->where( [ 'aet_guid' => $eventType->guid ] )
			->caller( __METHOD__ )
			->execute();
	}

	/**
	 * @param array $eventTypes
	 * @param Calendar $calendar
	 * @return void
	 */
	public function assignToCalendar( array $eventTypes, Calendar $calendar ): void {
		if ( empty( $eventTypes ) ) {
			return;
		}
		$rows = [];
		foreach ( $eventTypes as $eventType ) {
			$rows[] = [
				'aeta_calendar' => $calendar->guid,
				'aeta_type' => $eventType->guid
			];
		}
		$this->unassignFromCalendar( $calendar );

		$this->lb->getConnection( DB_PRIMARY )->newInsertQueryBuilder()
			->insertInto( 'appointment_event_type_assignments' )
			->rows( $rows )
			->caller( __METHOD__ )
			->execute();
	}

	/**
	 * @param Calendar $calendar
	 * @return void
	 */
	public function unassignFromCalendar( Calendar $calendar ): void {
		$this->lb->getConnection( DB_PRIMARY )->newDeleteQueryBuilder()
			->deleteFrom( 'appointment_event_type_assignments' )
			->where( [ 'aeta_calendar' => $calendar->guid ] )
			->caller( __METHOD__ )
			->execute();
	}

	/**
	 * @param stdClass $row
	 * @return EventType
	 */
	private function makeFromRow( stdClass $row ): EventType {
		return new EventType(
			guid: $row->aet_guid,
			name: $row->aet_name,
			description: $row->aet_description,
			isSystem: $row->aet_is_system === '1',
			creator: $this->userFactory->newFromId( $row->aet_creator ),
			data: json_decode( $row->aet_data, true ) ?? []
		);
	}
}
