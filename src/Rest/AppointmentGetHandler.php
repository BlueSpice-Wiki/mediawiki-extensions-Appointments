<?php

namespace MediaWiki\Extension\Appointments\Rest;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\Appointments\Store\AppointmentStore;
use MediaWiki\Extension\Appointments\Utils\AppointmentSerializer;
use MediaWiki\Message\Message;
use MediaWiki\Rest\Response;
use MediaWiki\Rest\SimpleHandler;
use Wikimedia\ParamValidator\ParamValidator;

class AppointmentGetHandler extends SimpleHandler {

	/**
	 * @param AppointmentStore $appointmentStore
	 * @param AppointmentSerializer $serializer
	 */
	public function __construct(
		protected readonly AppointmentStore $appointmentStore,
		protected readonly AppointmentSerializer $serializer
	) {
	}

	/**
	 * @return Response
	 */
	public function execute() {
		$params = $this->getValidatedParams();

		$appointment = $this->appointmentStore->getAppointment( $params['guid'] );
		if ( !$appointment ) {
			throw new \InvalidArgumentException(
				Message::newFromKey( 'appointments-error-appointment-not-found' )->text()
			);
		}
		return $this->getResponseFactory()->createJson(
			$this->serializer->serializeForOutput( $appointment, RequestContext::getMain()->getUser() )
		);
	}

	/**
	 * @return array[]
	 */
	public function getParamSettings() {
		return [
			'guid' => [
				static::PARAM_SOURCE => 'path',
				ParamValidator::PARAM_REQUIRED => true,
				ParamValidator::PARAM_TYPE => 'string',
			],
		];
	}
}
