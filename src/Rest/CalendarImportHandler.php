<?php

namespace MediaWiki\Extension\Appointments\Rest;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\Appointments\Entity\Calendar;
use MediaWiki\Extension\Appointments\Entity\EventType\Imported;
use MediaWiki\Extension\Appointments\Store\CalendarStore;
use MediaWiki\Extension\Appointments\Utils\GuidGenerator;
use MediaWiki\Extension\Appointments\Utils\Permissions;
use MediaWiki\HookContainer\HookContainer;
use MediaWiki\Message\Message;
use MediaWiki\Rest\HttpException;
use MediaWiki\Rest\Response;
use MediaWiki\Rest\SimpleHandler;
use MediaWiki\WikiMap\WikiMap;
use Psr\Log\LoggerInterface;
use Wikimedia\ParamValidator\ParamValidator;

class CalendarImportHandler extends SimpleHandler {

	/**
	 * @param CalendarStore $calendarStore
	 * @param Permissions $permissions
	 * @param HookContainer $hookContainer
	 * @param LoggerInterface $logger
	 */
	public function __construct(
		private readonly CalendarStore $calendarStore,
		private readonly Permissions $permissions,
		private readonly HookContainer $hookContainer,
		private readonly LoggerInterface $logger
	) {
	}

	/**
	 * @return Response
	 * @throws HttpException
	 */
	public function execute() {
		$body = $this->getValidatedBody();

		$wikiId = WikiMap::getCurrentWikiId();
		$guidGenerator = new GuidGenerator( $wikiId );

		if ( !$this->permissions->canCreateCalendar( RequestContext::getMain()->getUser() ) ) {
			throw new HttpException( Message::newFromKey( 'appointments-error-no-permission' )->text(), 403 );
		}

		if ( $body['type'] === 'ics' ) {
			$data = $body['data'] ?? [];
			if ( empty( $data['name'] ) || empty( $data['url'] ) ) {
				throw new HttpException( Message::newFromKey( 'appointments-error-invalid-input' )->text(), 400 );
			}
			$calendar = new Calendar(
				guid: $guidGenerator->generateCalendarGuid(),
				name: $data['name'],
				description: $data['description'] ?? '',
				creator: RequestContext::getMain()->getUser(),
				wikiId: $wikiId,
				eventTypes: [ new Imported() ],
				data: [
					'imported' => true,
					'type' => 'ics',
					'url' => $data['url']
				]
			);
		} else {
			throw new HttpException( Message::newFromKey( 'appointments-error-invalid-type' )->text() );
		}

		$this->calendarStore->storeCalendar( $calendar );
		$this->hookContainer->run( 'AppointmentsCalendarSaved', [ $calendar, RequestContext::getMain()->getUser() ] );

		$this->logger->info( 'Imported calendar {guid} by user {user}', [
			'guid' => $calendar->guid,
			'user' => RequestContext::getMain()->getUser()->getName(),
		] );

		return $this->getResponseFactory()->createJson( [ 'success' => true ] );
	}

	public function getBodyParamSettings(): array {
		return [
			'type' => [
				static::PARAM_SOURCE => 'body',
				ParamValidator::PARAM_REQUIRED => false,
				ParamValidator::PARAM_TYPE => 'string',
			],
			'data' => [
				static::PARAM_SOURCE => 'body',
				ParamValidator::PARAM_REQUIRED => true,
				ParamValidator::PARAM_TYPE => 'array',
			]
		];
	}

}
