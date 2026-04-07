<?php

namespace MediaWiki\Extension\Appointments\Rest;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\Appointments\Store\AppointmentStore;
use MediaWiki\Extension\Appointments\Utils\Permissions;
use MediaWiki\HookContainer\HookContainer;
use MediaWiki\Message\Message;
use MediaWiki\Rest\HttpException;
use MediaWiki\Rest\Response;
use MediaWiki\Rest\SimpleHandler;
use Psr\Log\LoggerInterface;
use Wikimedia\ParamValidator\ParamValidator;

class AppointmentDeleteHandler extends SimpleHandler {

	/**
	 * @param AppointmentStore $appointmentStore
	 * @param Permissions $permissions ,
	 * @param HookContainer $hookContainer
	 * @param LoggerInterface $logger
	 */
	public function __construct(
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
		$params = $this->getValidatedParams();

		$appointment = $this->appointmentStore->getAppointment( $params['appointment'] );
		if ( !$appointment ) {
			throw new HttpException( Message::newFromKey( 'appointments-error-appointment-not-found' )->text() );
		}
		$user = RequestContext::getMain()->getUser();
		if ( !$this->permissions->canDeleteAppointment( $user, $appointment, $appointment->calendar ) ) {
			throw new HttpException( Message::newFromKey( 'appointments-error-no-permission' )->text(), 403 );
		}
		$this->appointmentStore->deleteAppointment( $appointment );
		$this->hookContainer->run( 'AppointmentsAppointmentDeleted', [ $appointment, $user ] );

		$this->logger->info( 'Deleted appointment {guid} by user {user}', [
			'guid' => $appointment->guid,
			'user' => $user->getName(),
		] );

		return $this->getResponseFactory()->createJson( [ 'success' => true ] );
	}


	public function getParamSettings(): array {
		return [
			'appointment' => [
				static::PARAM_SOURCE => 'path',
				ParamValidator::PARAM_REQUIRED => true,
				ParamValidator::PARAM_TYPE => 'string',
			]
		];
	}

}