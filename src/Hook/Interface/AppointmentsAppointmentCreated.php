<?php

namespace MediaWiki\Extension\Appointments\Hook\Interface;

use MediaWiki\Extension\Appointments\Entity\Appointment;
use MediaWiki\Permissions\Authority;

interface AppointmentsAppointmentCreated {

	/**
	 * @param Appointment $appointment
	 * @param Authority $creator
	 * @return mixed
	 */
	public function onAppointmentsAppointmentCreated( Appointment $appointment, Authority $creator );
}
