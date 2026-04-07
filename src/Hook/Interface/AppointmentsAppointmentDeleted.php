<?php

namespace MediaWiki\Extension\Appointments\Hook\Interface;

use MediaWiki\Extension\Appointments\Entity\Appointment;
use MediaWiki\Permissions\Authority;

interface AppointmentsAppointmentDeleted {

	/**
	 * @param Appointment $appointment
	 * @param Authority $actor
	 * @return mixed
	 */
	public function onAppointmentsAppointmentDeleted( Appointment $appointment, Authority $actor );
}
