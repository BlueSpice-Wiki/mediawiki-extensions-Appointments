<?php

namespace MediaWiki\Extension\Appointments\Hook\Interface;

use MediaWiki\Extension\Appointments\Entity\Calendar;
use MediaWiki\Permissions\Authority;

interface AppointmentsCalendarDeleted {

	/**
	 * @param Calendar $calendar
	 * @param Authority $actor
	 * @return mixed
	 */
	public function onAppointmentsCalendarDeleted( Calendar $calendar, Authority $actor );
}
