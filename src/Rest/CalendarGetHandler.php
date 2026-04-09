<?php

namespace MediaWiki\Extension\Appointments\Rest;

use MediaWiki\Extension\Appointments\Store\CalendarStore;
use MediaWiki\Extension\Appointments\Utils\Permissions;
use MediaWiki\Rest\Response;
use MediaWiki\Rest\SimpleHandler;
use RequestContext;

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
		$user = RequestContext::getMain()->getUser();
		$calendars = [];
		foreach ( $this->calendarStore->getCalendars() as $calendar ) {
			$calendarData = $calendar->jsonSerialize();
			$calendarData['permissions'] = [
				'edit' => $this->permissions->canModifyCalendar( $user, $calendar ),
				'delete' => $this->permissions->canDeleteCalendar( $user, $calendar ),
			];
			$calendars[] = $calendarData;
		}
		return $this->getResponseFactory()->createJson( $calendars );
	}
}