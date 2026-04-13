<?php

namespace MediaWiki\Extension\Appointments\Rest;

use MediaWiki\Extension\Appointments\Store\EventTypeStore;
use MediaWiki\Rest\Response;
use MediaWiki\Rest\SimpleHandler;

class EventTypeGetHandler extends SimpleHandler {

	/**
	 * @param EventTypeStore $eventTypeStore
	 */
	public function __construct(
		private readonly EventTypeStore $eventTypeStore
	) {
	}

	/**
	 * @return Response
	 */
	public function execute() {
		return $this->getResponseFactory()->createJson( $this->eventTypeStore->getEventTypes() );
	}
}
