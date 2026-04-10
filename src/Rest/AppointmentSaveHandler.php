<?php

namespace MediaWiki\Extension\Appointments\Rest;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\Appointments\Entity\Appointment;
use MediaWiki\Extension\Appointments\Entity\PeriodDefinition;
use MediaWiki\Extension\Appointments\Store\AppointmentStore;
use MediaWiki\Extension\Appointments\Store\CalendarStore;
use MediaWiki\Extension\Appointments\UserInterface;
use MediaWiki\Extension\Appointments\Utils\GuidGenerator;
use MediaWiki\Extension\Appointments\Utils\ParticipantResolver;
use MediaWiki\Extension\Appointments\Utils\Permissions;
use MediaWiki\Extension\Appointments\Utils\RecurrenceRule;
use MediaWiki\HookContainer\HookContainer;
use MediaWiki\Message\Message;
use MediaWiki\Rest\HttpException;
use MediaWiki\Rest\Response;
use MediaWiki\Rest\SimpleHandler;
use MediaWiki\WikiMap\WikiMap;
use Psr\Log\LoggerInterface;
use Wikimedia\ParamValidator\ParamValidator;

class AppointmentSaveHandler extends SimpleHandler {

	/**
	 * @param CalendarStore $calendarStore
	 * @param AppointmentStore $appointmentStore
	 * @param UserInterface $userInterface
	 * @param Permissions $permissions
	 * @param ParticipantResolver $participantResolver
	 * @param HookContainer $hookContainer
	 * @param LoggerInterface $logger
	 */
	public function __construct(
		private readonly CalendarStore $calendarStore,
		private readonly AppointmentStore $appointmentStore,
		private readonly UserInterface $userInterface,
		private readonly Permissions $permissions,
		private readonly ParticipantResolver $participantResolver,
		private readonly HookContainer $hookContainer,
		private readonly LoggerInterface $logger
	) {}

	/**
	 * @return Response
	 * @throws HttpException
	 */
	public function execute() {
		$body = $this->getValidatedBody();

		$user = RequestContext::getMain()->getUser();
		$calendarGuid = $body['calendar_guid'];
		$calendar = $this->calendarStore->getCalendar( $calendarGuid );
		if ( !$calendar ) {
			throw new HttpException( Message::newFromKey( 'appointments-error-calendar-not-found' )->text() );
		}

		$oldAppointment = null;
		if ( $body['guid'] ) {
			$oldAppointment = $this->appointmentStore->getAppointment( $body['guid'] );
			if ( !$oldAppointment ) {
				throw new HttpException( Message::newFromKey( 'appointments-error-appointment-not-found' )->text() );
			}
			if ( !$this->permissions->canModifyAppointment( $user, $oldAppointment, $calendar ) ) {
				throw new HttpException( Message::newFromKey( 'appointments-error-no-permission' )->text(), 403 );
			}
		}
		if ( !$this->permissions->canCreateAppointment( $user, $calendar ) ) {
			throw new HttpException( Message::newFromKey( 'appointments-error-no-permission' )->text(), 403 );
		}

		try {
			$start = $this->userInterface->convertUserInputToUTC( $body['start_date' ], $body['start_time'], $user );
			$end = $this->userInterface->convertUserInputToUTC( $body['end_date' ], $body['end_time'], $user );
			if ( $body['is_all_day'] ) {
				$start->setTime( 0, 0, 0 );
				$end->setTime( 0, 0, 0 );
			}
		} catch ( \Exception $e ) {
			throw new HttpException( Message::newFromKey( 'appointments-error-invalid-date-time' )->text() );
		}

		$guidGenerator = new GuidGenerator( WikiMap::getCurrentWikiId() );
		$participants = $this->participantResolver->participantsFromData( $body['participants'] );

		$recurrenceRule = $body['recurrence'] ? new RecurrenceRule( $body['recurrence'] ) : null;
		$periodDefinition = new PeriodDefinition(
			start: $start,
			end: $end,
			isAllDay: $body['is_all_day'],
			recurrenceRule: $recurrenceRule
		);

		$this->assertDataJsonSerializable( $body['data'] );

		$appointment = new Appointment(
			guid: $oldAppointment ? $oldAppointment->guid : $guidGenerator->generateAppointmentGuid(),
			title: $body['title'],
			participants: $participants,
			calendar: $calendar,
			periodDefinition: $periodDefinition,
			creator: $oldAppointment ? $oldAppointment->creator : $user,
			data: $body['data']
		);

		$this->appointmentStore->storeAppointment( $appointment );

		if ( !$oldAppointment ) {
			$this->hookContainer->run( 'AppointmentsAppointmentCreated', [ $appointment, $user ] );
			$this->logger->info( "Appointment created: {$appointment->guid} by user {$user->getId()}" );
		} else {
			[ $removed, $added ] = $this->participantResolver->getParticipantDifference(
				$oldAppointment->participants,
				$appointment->participants
			);
			$this->hookContainer->run( 'AppointmentsAppointmentModified', [ $appointment, $user, $removed, $added ] );
			$this->logger->info( "Appointment modified: {$appointment->guid} by user {$user->getId()}", [
				'removed_participants' => array_map( fn( $p ) => $p->getUser()->getName(), $removed ),
				'added_participants' => array_map( fn( $p ) => $p->getUser()->getName(), $added )
			] );
		}

		return $this->getResponseFactory()->createJson( [ 'guid' => $appointment->guid ] );
	}


	public function getBodyParamSettings(): array {
		return [
			'calendar_guid' => [
				static::PARAM_SOURCE => 'body',
				ParamValidator::PARAM_REQUIRED => true,
				ParamValidator::PARAM_TYPE => 'string',
			],
			'guid' => [
				static::PARAM_SOURCE => 'body',
				ParamValidator::PARAM_REQUIRED => false,
				ParamValidator::PARAM_TYPE => 'string',
			],
			'title' => [
				static::PARAM_SOURCE => 'body',
				ParamValidator::PARAM_REQUIRED => true,
				ParamValidator::PARAM_TYPE => 'string',
			],
			'start_date' => [
				static::PARAM_SOURCE => 'body',
				ParamValidator::PARAM_REQUIRED => true,
				ParamValidator::PARAM_TYPE => 'string',
			],
			'end_date' => [
				static::PARAM_SOURCE => 'body',
				ParamValidator::PARAM_REQUIRED => true,
				ParamValidator::PARAM_TYPE => 'string',
			],
			'start_time' => [
				static::PARAM_SOURCE => 'body',
				ParamValidator::PARAM_REQUIRED => true,
				ParamValidator::PARAM_TYPE => 'string',
			],
			'end_time' => [
				static::PARAM_SOURCE => 'body',
				ParamValidator::PARAM_REQUIRED => true,
				ParamValidator::PARAM_TYPE => 'string',
			],
			'is_all_day' => [
				static::PARAM_SOURCE => 'body',
				ParamValidator::PARAM_REQUIRED => true,
				ParamValidator::PARAM_TYPE => 'boolean',
				ParamValidator::PARAM_DEFAULT => false,
			],
			'recurrence' => [
				static::PARAM_SOURCE => 'body',
				ParamValidator::PARAM_REQUIRED => false,
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_DEFAULT => null,
			],
			'participants' => [
				static::PARAM_SOURCE => 'body',
				ParamValidator::PARAM_REQUIRED => false,
				ParamValidator::PARAM_TYPE => 'array',
				ParamValidator::PARAM_DEFAULT => []
			],
			'data' => [
				static::PARAM_SOURCE => 'body',
				ParamValidator::PARAM_REQUIRED => false,
				ParamValidator::PARAM_TYPE => 'array',
				ParamValidator::PARAM_DEFAULT => [],
			]
		];
	}

	/**
	 * @param mixed $data
	 * @return void
	 * @throws HttpException
	 */
	private function assertDataJsonSerializable( mixed $data ) {
		if ( !is_array( $data ) ) {
			throw new HttpException( Message::newFromKey( 'appointments-error-data-must-be-array' )->text() );
		}
		try {
			json_encode( $data );
		} catch ( \Exception $e ) {
			throw new HttpException( Message::newFromKey( 'appointments-error-data-not-serializable' )->text() );
		}
	}

}