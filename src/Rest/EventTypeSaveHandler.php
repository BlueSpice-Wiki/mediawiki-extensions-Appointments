<?php

namespace MediaWiki\Extension\Appointments\Rest;

use MediaWiki\Extension\Appointments\Entity\EventType;
use MediaWiki\Extension\Appointments\Store\EventTypeStore;
use MediaWiki\Extension\Appointments\Utils\GuidGenerator;
use MediaWiki\Extension\Appointments\Utils\Permissions;
use MediaWiki\Rest\HttpException;
use MediaWiki\Rest\Response;
use MediaWiki\Rest\SimpleHandler;
use MediaWiki\WikiMap\WikiMap;
use Psr\Log\LoggerInterface;
use Wikimedia\ParamValidator\ParamValidator;

class EventTypeSaveHandler extends SimpleHandler {

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
		$user = \RequestContext::getMain()->getUser();
		if ( !$this->permissions->canModifyEventTypes( $user ) ) {
			throw new \MediaWiki\Rest\HttpException( 'permissiondenied', 403 );
		}

		$body = $this->getValidatedBody();
		$newGuid = ( new GuidGenerator( WikiMap::getCurrentWikiId() ) )->generateEventTypeGuid( $body['name'] );
		$type = new EventType(
			$body['guid'] ?? $newGuid,
			$body['name'],
			$body['description'] ?? '',
			false,
			$user,
			$body['data'] ?? []
		);

		$this->eventTypeStore->storeEventType( $type );
		$this->logger->info( "Stored event type with guid {$type->guid}", [
			'name' => $type->name,
			'user' => $user->getName(),
		] );
		return $this->getResponseFactory()->createJson( [ 'success' => true ] );
	}

	/**
	 * @return array[]
	 */
	public function getBodyParamSettings(): array {
		return [
			'guid' => [
				static::PARAM_SOURCE => 'body',
				ParamValidator::PARAM_REQUIRED => false,
				ParamValidator::PARAM_TYPE => 'string',
			],
			'name' => [
				static::PARAM_SOURCE => 'body',
				ParamValidator::PARAM_REQUIRED => true,
				ParamValidator::PARAM_TYPE => 'string',
			],
			'description' => [
				static::PARAM_SOURCE => 'body',
				ParamValidator::PARAM_REQUIRED => false,
				ParamValidator::PARAM_TYPE => 'string',
			],
			'data' => [
				static::PARAM_SOURCE => 'body',
				ParamValidator::PARAM_REQUIRED => false,
				ParamValidator::PARAM_TYPE => 'array',
				ParamValidator::PARAM_DEFAULT => [],
			]
		];
	}
}
