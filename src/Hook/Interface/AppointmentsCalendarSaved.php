<?php

namespace MediaWiki\Extension\Appointments\Hook\Interface;

use MediaWiki\Extension\Appointments\Entity\Calendar;
use MediaWiki\Permissions\Authority;

interface AppointmentsCalendarSaved {

	/**
	 * @param Calendar $calendar
	 * @param Authority $creator
	 * @return mixed
	 */
	public function onAppointmentsCalendarSaved( Calendar $calendar, Authority $creator );
}
