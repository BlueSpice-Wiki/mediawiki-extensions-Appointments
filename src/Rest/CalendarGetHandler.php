<?php

namespace MediaWiki\Extension\Appointments\Rest;

use MediaWiki\Extension\Appointments\Store\CalendarStore;
use MediaWiki\Rest\Response;
use MediaWiki\Rest\SimpleHandler;

class CalendarGetHandler extends SimpleHandler {

	/**
	 * @param CalendarStore $calendarStore
	 */
	public function __construct(
		private readonly CalendarStore $calendarStore
	) {
	}

	/**
	 * @return Response
	 */
	public function execute() {
		return $this->getResponseFactory()->createJson( $this->calendarStore->getCalendars() );
	}
}