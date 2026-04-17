<?php

namespace MediaWiki\Extension\Appointments\Rest;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\Appointments\Entity\NaivePeriod;
use MediaWiki\Extension\Appointments\Store\AppointmentStore;
use MediaWiki\Extension\Appointments\Store\CalendarStore;
use MediaWiki\Extension\Appointments\Store\EventTypeStore;
use MediaWiki\Extension\Appointments\UserInterface;
use MediaWiki\Extension\Appointments\Utils\AgendaLinker;
use MediaWiki\Extension\Appointments\Utils\Permissions;
use MediaWiki\Message\Message;
use MediaWiki\Rest\Response;
use Wikimedia\ParamValidator\ParamValidator;

class AppointmentsGetHandler extends AppointmentGetHandler {

	/**
	 * @param CalendarStore $calendarStore
	 * @param AppointmentStore $appointmentStore
	 * @param EventTypeStore $eventTypeStore
	 * @param UserInterface $userInterface
	 * @param Permissions $permissions
	 * @param AgendaLinker $agendaLinker
	 */
	public function __construct(
		private readonly CalendarStore $calendarStore,
		AppointmentStore $appointmentStore,
		private readonly EventTypeStore $eventTypeStore,
		UserInterface $userInterface,
		Permissions $permissions,
		AgendaLinker $agendaLinker
	) {
		parent::__construct( $appointmentStore, $userInterface, $permissions, $agendaLinker );
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
		$personalOnly = $params['onlyPersonal'];
		$user = RequestContext::getMain()->getUser();
		$query = $this->appointmentStore->newQuery();

		$startDate = $params['startDate'];
		$endDate = $params['endDate'];
		$period = null;
		if ( $startDate && $endDate ) {
			$start = \DateTime::createFromFormat( 'Y-m-d', $startDate );
			$start->setTime( 0, 0 );
			$start = $this->userInterface->convertDateTimeForUser( $start, $user );
			$end = \DateTime::createFromFormat( 'Y-m-d', $endDate );
			$end->setTime( 23, 59, 59 );
			$end = $this->userInterface->convertDateTimeForUser( $end, $user );
			$query->forPeriod( new NaivePeriod( $start, $end ) );
		}

		if ( $params['eventTypes'] ) {
			$eventTypes = [];
			foreach ( explode( '|', $params['eventTypes'] ) as $eventType ) {
				$eventTypeObj = $this->eventTypeStore->getEventType( $eventType );
				if ( $eventTypeObj ) {
					$eventTypes[] = $eventTypeObj;
				}
			}

			$query->forEventTypes( $eventTypes );
		}

		if ( $calendar ) {
			$query->forCalendar( $calendar );
		}
		if ( $personalOnly ) {
			$query->forUser( $user );
		}
		if ( $period ) {
			$query->forPeriod( $period );
		}

		$appointments = $query->execute();
		$data = [];
		foreach( $appointments as $appointment ) {
			$data[] = $this->serializeAppointment( $appointment );
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
			'onlyPersonal' => [
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