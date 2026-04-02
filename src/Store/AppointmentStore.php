<?php

namespace MediaWiki\Extension\Appointments\Store;

use MediaWiki\Extension\Appointments\Entity\Appointment;
use MediaWiki\Extension\Appointments\Entity\Calendar;
use MediaWiki\Extension\Appointments\Entity\Participant;
use MediaWiki\User\UserIdentity;
use Wikimedia\Rdbms\ILoadBalancer;

class AppointmentStore {

	/**
	 * @param ILoadBalancer $lb
	 */
	public function __construct(
		private readonly ILoadBalancer $lb,
		private readonly ParticipantStore $participantStore
	) {
	}

	public function storeAppointment( Appointment $appointment ) {

	}

	public function getAppointment( string $guid ): ?Appointment {
		return null;
	}

	public function getAppointmentsForCalendar( Calendar $calendar ): array {
		return [];
	}

	public function getAppointmentsForUser( UserIdentity $user ): array {
		$appIds = $this->participantStore->getAppointmentIdsForUser( $user );

	}
}