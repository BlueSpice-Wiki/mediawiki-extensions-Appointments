<?php

namespace MediaWiki\Extension\Appointments\Rest;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\Appointments\Entity\CalendarImported;
use MediaWiki\Extension\Appointments\Store\CalendarStore;
use MediaWiki\Extension\Appointments\Utils\Permissions;
use MediaWiki\Message\Message;
use MediaWiki\Rest\HttpException;
use MediaWiki\Rest\Response;
use MediaWiki\Rest\SimpleHandler;
use Psr\Log\LoggerInterface;
use Wikimedia\ParamValidator\ParamValidator;

class ClearCalendarSyncInfo extends SimpleHandler {

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
		$params = $this->getValidatedParams();

		$calendar = $this->calendarStore->getCalendar( $params['calendar'] );
		if ( !( $calendar instanceof CalendarImported ) ) {
			throw new HttpException( Message::newFromKey( 'appointments-error-calendar-not-found' )->text() );
		}

		if ( !$this->permissions->canModifyCalendar( RequestContext::getMain()->getUser(), $calendar ) ) {
			throw new HttpException( Message::newFromKey( 'appointments-error-no-permission' )->text(), 403 );
		}

		$calendar->clearSync();
		$this->calendarStore->storeCalendar( $calendar );

		$this->logger->info( 'Imported calendar {guid}: sync cleared by user {user}', [
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
