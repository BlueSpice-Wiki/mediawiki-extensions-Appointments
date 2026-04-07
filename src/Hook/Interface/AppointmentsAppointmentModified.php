<?php

namespace MediaWiki\Extension\Appointments\Hook\Interface;

use MediaWiki\Extension\Appointments\Entity\Appointment;
use MediaWiki\Permissions\Authority;

interface AppointmentsAppointmentModified {

	/**
	 * @param Appointment $appointment
	 * @param Authority $actor
	 * @param array $removedParticipants
	 * @param array $addedParticipants
	 * @return mixed
	 */
	public function onAppointmentsAppointmentModified(
		Appointment $appointment, Authority $actor, array $removedParticipants, array $addedParticipants
	);
}
