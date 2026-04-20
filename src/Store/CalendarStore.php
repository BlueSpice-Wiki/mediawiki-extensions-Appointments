<?php

namespace MediaWiki\Extension\Appointments\Store;

use MediaWiki\Extension\Appointments\Entity\Calendar;
use MediaWiki\User\UserFactory;
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
	 */
	public function __construct(
		private ILoadBalancer $lb,
		private UserFactory $userFactory,
		private EventTypeStore $eventTypeStore
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
	 * @return array
	 */
	public function getCalendars(): array {
		$res = $this->lb->getConnection( DB_REPLICA )->newSelectQueryBuilder()
			->select( static::CALENDAR_FIELDS )
			->from( 'calendars' )
			->caller( __METHOD__ )
			->fetchResultSet();

		$calendars = [];
		foreach ( $res as $row ) {
			$calendars[] = $this->rowToCalendar( $row );
		}
		return $calendars;
	}

	/**
	 * @param stdClass $row
	 * @return Calendar
	 */
	private function rowToCalendar( stdClass $row ): Calendar {
		return new Calendar(
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
