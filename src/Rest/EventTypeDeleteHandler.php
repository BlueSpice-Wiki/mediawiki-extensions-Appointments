<?php

namespace MediaWiki\Extension\Appointments\Rest;

use MediaWiki\Extension\Appointments\Store\EventTypeStore;
use MediaWiki\Extension\Appointments\Utils\Permissions;
use MediaWiki\Rest\HttpException;
use MediaWiki\Rest\Response;
use MediaWiki\Rest\SimpleHandler;
use Psr\Log\LoggerInterface;
use RequestContext;
use Wikimedia\ParamValidator\ParamValidator;

class EventTypeDeleteHandler extends SimpleHandler {

	/**
	 * @param EventTypeStore $eventTypeStore
	 * @param Permissions $permissions
	 * @param LoggerInterface $logger
	 */
	public function __construct(
		private readonly EventTypeStore $eventTypeStore,
		private readonly Permissions $permissions,
		private readonly LoggerInterface $logger
	) {
	}

	/**
	 * @return Response
	 * @throws HttpException
	 */
	public function execute() {
		$user = RequestContext::getMain()->getUser();
		if ( !$this->permissions->canDeleteAppointment( $user ) ) {
			throw new HttpException( 'permissiondenied', 403 );
		}
		$guid = $this->getValidatedParams()['guid'];

		$type = $this->eventTypeStore->getEventType( $guid );
		if ( !$type ) {
			throw new HttpException( 'Event type not found', 404 );
		}

		$this->eventTypeStore->deleteEventType( $type );
		$this->logger->info( "Deleted event type with guid $guid", [
			'user' => $user->getName(),
		] );
		return $this->getResponseFactory()->createJson( [ 'success' => true ] );
	}

	/**
	 * @return array[]
	 */
	public function getParamSettings() {
		return [
			'eventType' => [
				static::PARAM_SOURCE => 'path',
				ParamValidator::PARAM_REQUIRED => true,
				ParamValidator::PARAM_TYPE => 'string',
			],
		];
	}
}
