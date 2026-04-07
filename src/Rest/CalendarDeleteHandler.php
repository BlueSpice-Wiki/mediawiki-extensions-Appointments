<?php

namespace MediaWiki\Extension\Appointments\Rest;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\Appointments\Store\AppointmentStore;
use MediaWiki\Extension\Appointments\Store\CalendarStore;
use MediaWiki\Extension\Appointments\Utils\Permissions;
use MediaWiki\HookContainer\HookContainer;
use MediaWiki\Message\Message;
use MediaWiki\Rest\HttpException;
use MediaWiki\Rest\Response;
use MediaWiki\Rest\SimpleHandler;
use Psr\Log\LoggerInterface;
use Wikimedia\ParamValidator\ParamValidator;

class CalendarDeleteHandler extends SimpleHandler {

	/**
	 * @param CalendarStore $calendarStore
	 * @param AppointmentStore $appointmentStore
	 * @param Permissions $permissions
	 * @param HookContainer $hookContainer
	 * @param LoggerInterface $logger
	 */
	public function __construct(
		private readonly CalendarStore $calendarStore,
		private readonly AppointmentStore $appointmentStore,
		private readonly Permissions $permissions,
		private readonly HookContainer $hookContainer,
		private readonly LoggerInterface $logger
	) {}

	/**
	 * @return Response
	 * @throws HttpException
	 */
	public function execute() {
		$body = $this->getValidatedBody();
		$params = $this->getValidatedParams();

		$calendar = $this->calendarStore->getCalendar( $params['calendar'] );
		if ( !$calendar ) {
			throw new HttpException( Message::newFromKey( 'appointments-error-calendar-not-found' )->text() );
		}
		$user = RequestContext::getMain()->getUser();
		if ( !$this->permissions->canDeleteCalendar( $user, $calendar ) ) {
			throw new HttpException( Message::newFromKey( 'appointments-error-no-permission' )->text(), 403 );
		}
		if ( $body['appointment_move_to'] ) {
			$targetCalendar = $this->calendarStore->getCalendar( $body['appointment_move_to'] );
			if ( !$targetCalendar ) {
				$this->logger->warning( 'Target calendar {target} for moving appointments not found', [
					'target' => $body['appointment_move_to'],
				] );
				throw new HttpException( Message::newFromKey( 'appointments-error-calendar-not-found' )->text() );
			}
			$this->logger->info( 'Moving appointments from calendar {source} to {target} by user {user}', [
				'source' => $calendar->guid,
				'target' => $targetCalendar->guid,
				'user' => $user->getName(),
			] );
			$this->appointmentStore->moveToCalendar( $calendar, $targetCalendar );
		} else {
			$this->logger->info( 'Deleting appointments for calendar {calendar} by user {user}', [
				'calendar' => $calendar->guid,
				'user' => $user->getName(),
			] );
			$this->appointmentStore->deleteForCalendar( $calendar );
		}
		$this->calendarStore->deleteCalendar( $calendar );

		$this->hookContainer->run( 'AppointmentsCalendarDeleted', [ $calendar, $user ] );
		$this->logger->info( 'Deleted calendar {guid} by user {user}', [
			'guid' => $calendar->guid,
			'user' => $user->getName(),
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
			]
		];
	}

	/**
	 * @return array[]
	 */
	public function getBodyParamSettings(): array {
		return [
			'appointment_move_to' => [
				static::PARAM_SOURCE => 'body',
				ParamValidator::PARAM_REQUIRED => false,
				ParamValidator::PARAM_TYPE => 'string',
			]
		];
	}

}