<?php

namespace MediaWiki\Extension\Appointments\Utils;

use MediaWiki\Extension\Appointments\Entity\Appointment;
use MediaWiki\Extension\Appointments\UserInterface;
use MediaWiki\User\User;

class AppointmentSerializer {

	/**
	 * @param Permissions $permissions
	 * @param AgendaLinker $agendaLinker
	 * @param UserInterface $userInterface
	 */
	public function __construct(
		private Permissions $permissions,
		private AgendaLinker $agendaLinker,
		private UserInterface $userInterface
	) {}

	/**
	 * @param Appointment $appointment
	 * @param User $user
	 * @return array
	 */
	public function serializeForOutput( Appointment $appointment, User $user ): array {
		$calendar = $appointment->calendar->jsonSerialize();
		$calendar['permissions'] = [
			'edit' => $this->permissions->canModifyCalendar( $user, $appointment->calendar ),
			'delete' => $this->permissions->canDeleteCalendar( $user, $appointment->calendar ),
		];
		return [
			'guid' => $appointment->guid,
			'title' => $appointment->title,
			'calendar' => $calendar,
			'eventType' => $appointment->eventType,
			'periodDefinition' => $this->userInterface->serializePeriodDefinition(
				$appointment->periodDefinition, $user
			),
			'periodUTC' => $this->userInterface->serializePeriodDefinition(
				$appointment->periodDefinition
			),
			'userPeriod' => $this->userInterface->serializePeriodDefinitionForUser(
				$appointment->periodDefinition, $user
			),
			'participants' => $appointment->participants,
			'creator' => $appointment->creator->getName(),
			'data' => $appointment->data,
			'agendaLink' => $this->agendaLinker->getAgendaLink( $appointment ),
			'permissions' => [
				'edit' => $this->permissions->canModifyAppointment( $user, $appointment, $appointment->calendar ),
				'delete' => $this->permissions->canDeleteAppointment( $user, $appointment, $appointment->calendar ),
			]
		];
	}
}