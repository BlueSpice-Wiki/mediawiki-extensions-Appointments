<?php

namespace MediaWiki\Extension\Appointments\Rest;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\Appointments\Entity\PeriodDefinition;
use MediaWiki\Extension\Appointments\Store\AppointmentStore;
use MediaWiki\Extension\Appointments\Store\CalendarStore;
use MediaWiki\Message\Message;
use MediaWiki\Rest\Response;
use MediaWiki\Rest\SimpleHandler;
use Wikimedia\ParamValidator\ParamValidator;

class AppointmentGetHandler extends SimpleHandler {

	/**
	 * @param CalendarStore $calendarStore
	 * @param AppointmentStore $appointmentStore
	 */
	public function __construct(
		private readonly CalendarStore $calendarStore,
		private readonly AppointmentStore $appointmentStore
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
			);
		}
		$query = $this->appointmentStore->newQuery();

		if ( $calendar ) {
			$query->forCalendar( $calendar );
		}
		if ( $personalOnly ) {
			$query->forUser( RequestContext::getMain()->getUser() );
		}
		if ( $period ) {
			$query->forPeriod( $period );
		}

		return $this->getResponseFactory()->createJson( $query->execute() );

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