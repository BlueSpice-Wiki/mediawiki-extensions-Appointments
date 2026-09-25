<?php

namespace MediaWiki\Extension\Appointments\Rest;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\Appointments\Store\CalendarStore;
use MediaWiki\Extension\Appointments\Utils\Permissions;
use MediaWiki\Rest\Response;
use MediaWiki\Rest\SimpleHandler;
use Wikimedia\ParamValidator\ParamValidator;

class CalendarGetHandler extends SimpleHandler {

	/**
	 * @param CalendarStore $calendarStore
	 * @param Permissions $permissions
	 */
	public function __construct(
		private readonly CalendarStore $calendarStore,
		private readonly Permissions $permissions
	) {
	}

	/**
	 * @return Response
	 */
	public function execute() {
		$params = $this->getValidatedParams();
		$onlyAssigned = $params['assigned'] ?? false;
		$user = RequestContext::getMain()->getUser();
		$calendars = [];
		foreach ( $this->calendarStore->getCalendars( $onlyAssigned ) as $calendar ) {
			if ( !$this->permissions->canReadCalendar( $user, $calendar ) ) {
				continue;
			}
			$calendarData = $calendar->jsonSerialize();
			$calendarData['permissions'] = [
				'edit' => $this->permissions->canModifyCalendar( $user, $calendar ),
				'delete' => $this->permissions->canDeleteCalendar( $user, $calendar ),
			];
			$calendars[$calendar->name] = $calendarData;
		}
		// Sort alphabetically
		uksort( $calendars, 'strcasecmp' );
		return $this->getResponseFactory()->createJson( array_values( $calendars ) );
	}

	/**
	 * @return array[]
	 */
	public function getParamSettings() {
		return [
			'assigned' => [
				static::PARAM_SOURCE => 'query',
				ParamValidator::PARAM_REQUIRED => false,
				ParamValidator::PARAM_TYPE => 'boolean',
				ParamValidator::PARAM_DEFAULT => false,
			]
		];
	}
}
