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

class CalendarAssignHandler extends SimpleHandler {

	/**
	 * @param CalendarStore $calendarStore
	 * @param Permissions $permissions
	 * @param LoggerInterface $logger
	 */
	public function __construct(
		private readonly CalendarStore $calendarStore,
		private readonly Permissions $permissions,
		private readonly LoggerInterface $logger
	) {
	}

	/**
	 * @return Response
	 * @throws HttpException
	 */
	public function execute() {
		$calendarGuid = $this->getValidatedParams()['calendar'];
		$calendar = $this->calendarStore->getCalendar( $calendarGuid );
		if ( !$calendar ) {
			throw new HttpException( Message::newFromKey( 'appointments-error-calendar-not-found' )->text() );
		}

		if ( !$this->permissions->canAssignCalendar( RequestContext::getMain()->getUser(), $calendar ) ) {
			throw new HttpException( Message::newFromKey( 'appointments-error-no-permission' )->text(), 403 );
		}

		$this->calendarStore->assignCalendar(
			$calendar,
			RequestContext::getMain()->getUser()
		);

		$this->logger->info( 'Calendar {guid} assigned by user {user}', [
			'guid' => $calendar->guid,
			'user' => RequestContext::getMain()->getUser()->getName(),
		] );

		return $this->getResponseFactory()->createJson( [ 'success' => true ] );
	}

	/**
	 * @return array[]
	 */
	public function getParamSettings() {
		return [
			'calendar' => [
				static::PARAM_SOURCE => 'path',
				ParamValidator::PARAM_REQUIRED => true,
				ParamValidator::PARAM_TYPE => 'string',
			],
		];
	}
}
