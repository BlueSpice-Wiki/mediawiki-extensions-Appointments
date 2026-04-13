<?php

namespace MediaWiki\Extension\Appointments\Rest;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\Appointments\Entity\PeriodDefinition;
use MediaWiki\Extension\Appointments\Store\AppointmentStore;
use MediaWiki\Extension\Appointments\Store\CalendarStore;
use MediaWiki\Extension\Appointments\Store\EventTypeStore;
use MediaWiki\Extension\Appointments\UserInterface;
use MediaWiki\Extension\Appointments\Utils\Permissions;
use MediaWiki\Message\Message;
use MediaWiki\Rest\Response;
use MediaWiki\Rest\SimpleHandler;
use Wikimedia\ParamValidator\ParamValidator;

class AppointmentGetHandler extends SimpleHandler {

	/**
	 * @param CalendarStore $calendarStore
	 * @param AppointmentStore $appointmentStore
	
	 * @param EventTypeStore $eventTypeStore
	 * @param UserInterface $userInterface
	 * @param Permissions $permissions
	 */
	public function __construct(
		private readonly CalendarStore $calendarStore,
		private readonly AppointmentStore $appointmentStore,
		private readonly EventTypeStore $eventTypeStore,
		private readonly UserInterface $userInterface,
		private readonly Permissions $permissions
	) {
	}

	/**
	 * @return Response
	 */
	public function execute() {
		$params = $this->getValidatedParams();

		$calendarName = $params['calendar'] ?? null;
		$calendar = null;
		if ( $calendarName ) {
			$calendar = $this->calendarStore->getCalendar( $calendarName );
			if ( !$calendar ) {
				throw new \InvalidArgumentException( Message::newFromKey( 'appointments-error-calendar-not-found' )->text() );
			}
		}
		$personalOnly = $params['personalOnly'];

		$startDate = $params['startDate'];
		$endDate = $params['endDate'];
		$period = null;
		if ( $startDate && $endDate ) {
			$period = new PeriodDefinition(
				start: \DateTime::createFromFormat( 'Y-m-d', $startDate ),
				end: \DateTime::createFromFormat( 'Y-m-d', $endDate ),
				isAllDay:  true
			);
		}

		$eventTypes = [];
		foreach ( explode( '|', $params['eventTypes'] ) as $eventType ) {
			$eventTypeObj = $this->eventTypeStore->getEventType( $eventType );
			if ( $eventTypeObj ) {
				$eventTypes[] = $eventTypeObj;
			}
		}

		$user = RequestContext::getMain()->getUser();
		$query = $this->appointmentStore->newQuery();

		if ( $calendar ) {
			$query->forCalendar( $calendar );
		}
		if ( $personalOnly ) {
			$query->forUser( $user );
		}
		if ( $period ) {
			$query->forPeriod( $period );
		}
		$query->forEventTypes( $eventTypes );

		$appointments = $query->execute();
		$data = [];
		foreach( $appointments as $appointment ) {
			$calendar = $appointment->calendar->jsonSerialize();
			$calendar['permissions'] = [
				'edit' => $this->permissions->canModifyCalendar( $user, $appointment->calendar ),
				'delete' => $this->permissions->canDeleteCalendar( $user, $appointment->calendar ),
			];
			$data[] = [
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
		return $this->getResponseFactory()->createJson( $data );

	}

	/**
	 * @return array[]
	 */
	public function getParamSettings() {
		return [
			'calendar' => [
				static::PARAM_SOURCE => 'query',
				ParamValidator::PARAM_REQUIRED => false,
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_DEFAULT => null,
			],
			'eventTypes' => [
				static::PARAM_SOURCE => 'query',
				ParamValidator::PARAM_REQUIRED => false,
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_DEFAULT => '',
			],
			'personalOnly' => [
				static::PARAM_SOURCE => 'query',
				ParamValidator::PARAM_REQUIRED => false,
				ParamValidator::PARAM_TYPE => 'boolean',
				ParamValidator::PARAM_DEFAULT => false,
			],
			'startDate' => [
				static::PARAM_SOURCE => 'query',
				ParamValidator::PARAM_REQUIRED => false,
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_DEFAULT => null
			],
			'endDate' => [
				static::PARAM_SOURCE => 'query',
				ParamValidator::PARAM_REQUIRED => false,
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_DEFAULT => null
			]
		];
	}
}