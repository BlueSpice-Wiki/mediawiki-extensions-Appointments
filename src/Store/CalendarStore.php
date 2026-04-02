<?php

namespace MediaWiki\Extension\Appointments\Store;

use MediaWiki\Extension\Appointments\Entity\Calendar;
use Wikimedia\Rdbms\ILoadBalancer;

readonly class CalendarStore {

	/**
	 * @param ILoadBalancer $lb
	 * @param AppointmentStore $appointmentStore
	 */
	public function __construct(
		private ILoadBalancer    $lb,
		private AppointmentStore $appointmentStore
	) {
	}

	public function storeCalendar( Calendar $calendar ) {

	}

	public function getCalendars(): array {
		return [];
	}
}