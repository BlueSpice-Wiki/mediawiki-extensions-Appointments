<?php

namespace MediaWiki\Extension\Appointments\Store;

use MediaWiki\Extension\Appointments\Entity\Calendar;
use MediaWiki\Extension\Appointments\Entity\CalendarImported;
use MediaWiki\Extension\Appointments\Utils\ImportedCalendarSyncer;
use MediaWiki\User\UserFactory;
use MediaWiki\User\UserIdentity;
use stdClass;
use Wikimedia\Rdbms\ILoadBalancer;

class CalendarStore {

	private const CALENDAR_FIELDS = [
		'cal_guid', 'cal_name', 'cal_description', 'cal_created_at', 'cal_creator', 'cal_wiki_id', 'cal_data'
	];

	private array $calendars = [];

	/**
	 * @param ILoadBalancer $lb
	 * @param UserFactory $userFactory
	 * @param EventTypeStore $eventTypeStore
	 * @param ImportedCalendarSyncer $calendarSyncer
	 */
	public function __construct(
		private ILoadBalancer $lb,
		private UserFactory $userFactory,
		private EventTypeStore $eventTypeStore,
		private readonly ImportedCalendarSyncer $calendarSyncer
	) {
	}

	/**
	 * @param Calendar $calendar
	 * @return void
	 */
	public function storeCalendar( Calendar $calendar ): void {
		if ( $this->exists( $calendar->guid ) ) {
			$this->updateCalendar( $calendar );
		} else {
			$this->insertCalendar( $calendar );
		}
		$this->assignCalendar( $calendar, $calendar->creator );
		$this->eventTypeStore->assignToCalendar( $calendar->eventTypes, $calendar );
		$this->calendars[ $calendar->guid ] = $calendar;
	}

	/**
	 * @param Calendar $calendar
	 * @return void
	 */
	public function deleteCalendar( Calendar $calendar ): void {
		$this->lb->getConnection( DB_PRIMARY )->newDeleteQueryBuilder()
			->deleteFrom( 'calendars' )
			->where( [ 'cal_guid' => $calendar->guid ] )
			->caller( __METHOD__ )
			->execute();
		$this->eventTypeStore->unassignFromCalendar( $calendar );
		unset( $this->calendars[ $calendar->guid ] );
	}

	/**
	 * @param string $guid
	 * @return Calendar|null
	 */
	public function getCalendar( string $guid ): ?Calendar {
		if ( isset( $this->calendars[ $guid ] ) ) {
			return $this->calendars[ $guid ];
		}
		$row = $this->lb->getConnection( DB_REPLICA )->newSelectQueryBuilder()
			->select( static::CALENDAR_FIELDS )
			->from( 'calendars' )
			->where( [ 'cal_guid' => $guid ] )
			->caller( __METHOD__ )
			->fetchRow();

		$this->calendars[ $guid ] = $row ? $this->rowToCalendar( $row ) : null;
		return $this->calendars[ $guid ];
	}

	/**
	 * @param string $name
	 * @return Calendar|null
	 */
	public function getCalendarByName( string $name ): ?Calendar {
		$row = $this->lb->getConnection( DB_REPLICA )->newSelectQueryBuilder()
			->select( static::CALENDAR_FIELDS )
			->from( 'calendars' )
			->where( [ 'cal_name' => $name ] )
			->caller( __METHOD__ )
			->fetchRow();

		if ( !$row ) {
			return null;
		}
		if ( isset( $this->calendars[ $row->cal_guid ] ) ) {
			return $this->calendars[ $row->cal_guid ];
		}
		return $this->rowToCalendar( $row );
	}

	/**
	 * @param Calendar $calendar
	 * @param UserIdentity $actor
	 * @return void
	 */
	public function assignCalendar( Calendar $calendar, UserIdentity $actor ): void {
		$this->lb->getConnection( DB_PRIMARY )->newInsertQueryBuilder()
			->insertInto( 'calendars_assignments' )
			->row( [ 'cala_calendar' => $calendar->guid, 'cala_user' => $actor->getId() ] )
			->caller( __METHOD__ )
			->ignore()
			->execute();
	}

	/**
	 * @param Calendar $calendar
	 * @return void
	 */
	public function unassignCalendar( Calendar $calendar ): void {
		$this->lb->getConnection( DB_PRIMARY )->newDeleteQueryBuilder()
			->delete( 'calendars_assignments' )
			->where( [ 'cala_calendar' => $calendar->guid ] )
			->caller( __METHOD__ )
			->execute();
	}

	/**
	 * @param bool $onlyAssigned
	 * @return Calendar[]
	 */
	public function getCalendars( bool $onlyAssigned = false ): array {
		$query = $this->lb->getConnection( DB_REPLICA )->newSelectQueryBuilder()
			->select( static::CALENDAR_FIELDS )
			->from( 'calendars' )
			->caller( __METHOD__ );

		if ( $onlyAssigned ) {
			$query->from( 'calendars_assignments', 'ca' );
			$query->join( 'calendars_assignments', 'ca', [ 'cala_calendar = cal_guid' ] );
		}

		$res = $query->fetchResultSet();
		$calendars = [];
		foreach ( $res as $row ) {
			$calendar = $this->rowToCalendar( $row );
			if ( $calendar instanceof CalendarImported ) {
				try {
					if ( $this->calendarSyncer->syncCalendar( $calendar, $this ) ) {
						$calendar->recordSync();
						$this->storeCalendar( $calendar );
					}
				} catch ( \Exception ) {
					$calendar->data['syncError'] = true;
				}
			}
			$calendars[] = $calendar;
		}
		return $calendars;
	}

	/**
	 * @param stdClass $row
	 * @return Calendar
	 */
	private function rowToCalendar( stdClass $row ): Calendar {
		$data = json_decode( $row->cal_data, true ) ?? [];
		$class = Calendar::class;
		$imported = false;
		if ( $data['imported'] ?? false ) {
			$class = CalendarImported::class;
			$imported = true;
		}
		return new $class(
			guid: $row->cal_guid,
			name: $row->cal_name,
			description: $row->cal_description,
			creator: $this->userFactory->newFromId( $row->cal_creator ),
			wikiId: $row->cal_wiki_id,
			eventTypes: $this->eventTypeStore->getEventsForCalendarGuid( $row->cal_guid ),
			data: json_decode( $row->cal_data, true ) ?? []
		);
	}

	/**
	 * @param string $guid
	 * @return bool
	 */
	private function exists( string $guid ): bool {
		if ( isset( $this->calendars[ $guid ] ) ) {
			return true;
		}
		return $this->lb->getConnection( DB_REPLICA )->newSelectQueryBuilder()
			->select( 'cal_guid' )
			->from( 'calendars' )
			->where( [ 'cal_guid' => $guid ] )
			->caller( __METHOD__ )
			->fetchField() !== false;
	}

	/**
	 * @param Calendar $calendar
	 * @return void
	 */
	private function insertCalendar( Calendar $calendar ): void {
		$db = $this->lb->getConnection( DB_PRIMARY );
		$row = [
			'cal_guid' => $calendar->guid,
			'cal_name' => $calendar->name,
			'cal_description' => $calendar->description,
			'cal_created_at' => $db->timestamp(),
			'cal_creator' => $calendar->creator->getId(),
			'cal_wiki_id' => $calendar->wikiId,
			'cal_data' => json_encode( $calendar->data ),
		];
		$db->newInsertQueryBuilder()
			->insertInto( 'calendars' )
			->row( $row )
			->caller( __METHOD__ )
			->execute();
	}

	/**
	 * @param Calendar $calendar
	 * @return void
	 */
	private function updateCalendar( Calendar $calendar ): void {
		$this->lb->getConnection( DB_PRIMARY )->newUpdateQueryBuilder()
			->update( 'calendars' )
			->set( [
				'cal_name' => $calendar->name,
				'cal_description' => $calendar->description,
				'cal_data' => json_encode( $calendar->data ),
			] )
			->where( [ 'cal_guid' => $calendar->guid ] )
			->caller( __METHOD__ )
			->execute();
	}
}
