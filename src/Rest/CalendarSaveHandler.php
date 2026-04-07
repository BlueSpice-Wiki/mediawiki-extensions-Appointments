<?php

namespace MediaWiki\Extension\Appointments\Rest;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\Appointments\Entity\Calendar;
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

class CalendarSaveHandler extends SimpleHandler {

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

		$oldCalendar = null;
		if ( $body['guid'] ) {
			$oldCalendar = $this->calendarStore->getCalendar( $body['guid'] );
			if ( !$oldCalendar ) {
				throw new HttpException( Message::newFromKey( 'appointments-error-calendar-not-found' )->text() );
			}
			 if ( !$this->permissions->canModifyCalendar( RequestContext::getMain()->getUser(), $oldCalendar ) ) {
				throw new HttpException( Message::newFromKey( 'appointments-error-no-permission' )->text(), 403 );
			 }
		}

		$data = $body['data'] ?? [];
		if ( $data ) {
			$data = json_decode( $data, true );
			 if ( json_last_error() !== JSON_ERROR_NONE ) {
				throw new HttpException( Message::newFromKey( 'appointments-error-invalid-data' )->text(), 400 );
			 }
		}

		$wikiId = WikiMap::getCurrentWikiId();
		$guidGenerator = new GuidGenerator( $wikiId );
		if ( !$body['name'] ) {
			throw new HttpException( Message::newFromKey( 'appointments-error-name-required' )->text(), 400 );
		}

		$calendar = new Calendar(
			guid: $oldCalendar?->guid ?? $guidGenerator->generateCalendarGuid(),
			name: $body['name'],
			description: $body['description'] ?? '',
			creator: RequestContext::getMain()->getUser(),
			wikiId: $oldCalendar?->wikiId ?? $wikiId,
			data: $data
		);

		$this->calendarStore->storeCalendar( $calendar );
		$this->hookContainer->run( 'AppointmentsCalendarSaved', [ $calendar, RequestContext::getMain()->getUser() ] );

		$this->logger->info( 'Saved calendar {guid} by user {user}', [
			'guid' => $calendar->guid,
			'user' => RequestContext::getMain()->getUser()->getName(),
		] );

		return $this->getResponseFactory()->createJson( [ 'success' => true ] );
	}


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
				ParamValidator::PARAM_REQUIRED => false
			]
		];
	}

}