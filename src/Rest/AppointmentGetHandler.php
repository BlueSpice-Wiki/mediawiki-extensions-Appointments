<?php

namespace MediaWiki\Extension\Appointments\Rest;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\Appointments\Entity\Appointment;
use MediaWiki\Extension\Appointments\Store\AppointmentStore;
use MediaWiki\Extension\Appointments\UserInterface;
use MediaWiki\Extension\Appointments\Utils\Permissions;
use MediaWiki\Message\Message;
use MediaWiki\Rest\Response;
use MediaWiki\Rest\SimpleHandler;
use Wikimedia\ParamValidator\ParamValidator;

class AppointmentGetHandler extends SimpleHandler {

	/**
	 * @param AppointmentStore $appointmentStore
	 * @param UserInterface $userInterface
	 * @param Permissions $permissions
	 */
	public function __construct(
		protected readonly AppointmentStore $appointmentStore,
		protected readonly UserInterface $userInterface,
		protected readonly Permissions $permissions
	) {
	}

	/**
	 * @return Response
	 */
	public function execute() {
		$params = $this->getValidatedParams();

		$appointment = $this->appointmentStore->getAppointment( $params['guid'] );
		if ( !$appointment ) {
			throw new \InvalidArgumentException( Message::newFromKey( 'appointments-error-appointment-not-found' )->text() );
		}
		return $this->getResponseFactory()->createJson( $this->serializeAppointment( $appointment ) );
	}

	/**
	 * @return array[]
	 */
	public function getParamSettings() {
		return [
			'guid' => [
				static::PARAM_SOURCE => 'path',
				ParamValidator::PARAM_REQUIRED => true,
				ParamValidator::PARAM_TYPE => 'string',
			],
		];
	}

	/**
	 * @param Appointment $appointment
	 * @return array
	 */
	protected function serializeAppointment( Appointment $appointment ): array {
		$user = RequestContext::getMain()->getUser();

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
			'permissions' => [
				'edit' => $this->permissions->canModifyAppointment( $user, $appointment, $appointment->calendar ),
				'delete' => $this->permissions->canDeleteAppointment( $user, $appointment, $appointment->calendar ),
			]
		];
	}
}