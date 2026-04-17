<?php

namespace MediaWiki\Extension\Appointments\Hook;

use Exception;
use MediaWiki\Extension\Appointments\Entity\Appointment;
use MediaWiki\Extension\Appointments\Event\AppointmentAssignedEvent;
use MediaWiki\Extension\Appointments\Hook\Interface\AppointmentsAppointmentCreated;
use MediaWiki\Extension\Appointments\Hook\Interface\AppointmentsAppointmentModified;
use MediaWiki\Extension\Appointments\Utils\NotificationDateTimeFormatter;
use MediaWiki\Extension\Appointments\Utils\UserResolver;
use MediaWiki\Language\Language;
use MediaWiki\Permissions\Authority;
use MediaWiki\SpecialPage\SpecialPageFactory;
use MWStake\MediaWiki\Component\Events\Notifier;

readonly class SendNotificationsOnUpdate implements AppointmentsAppointmentModified, AppointmentsAppointmentCreated {

	public function __construct(
		private UserResolver       $userResolver,
		private Notifier           $notifier,
		private SpecialPageFactory $specialPageFactory,
		private Language           $contentLanguage
	) {}

	/**
	 * @inheritDoc
	 */
	public function onAppointmentsAppointmentCreated( Appointment $appointment, Authority $creator ) {
		$users = [];
		foreach ( $appointment->participants as $participant ) {
			$users = array_merge( $users, $this->userResolver->resolveToUsers( $participant ) );
		}
		$this->notify( $appointment, $users, $creator );
	}

	/**
	 * @inheritDoc
	 */
	public function onAppointmentsAppointmentModified(
		Appointment $appointment, Authority $actor, array $removedParticipants, array $addedParticipants
	) {
		$this->notify( $appointment, $addedParticipants, $actor );
	}

	/**
	 * @param Appointment $appointment
	 * @param array $audience
	 * @param Authority $actor
	 * @return void
	 * @throws Exception
	 */
	private function notify( Appointment $appointment, array $audience, Authority $actor ): void {
		if ( empty( $audience ) ) {
			return;
		}
		$event = new AppointmentAssignedEvent(
			$actor->getUser(),
			$appointment->title,
			$appointment->eventType->name,
			$audience,
			( new NotificationDateTimeFormatter( $this->contentLanguage ) )->getTimeString( $appointment ),
			$this->specialPageFactory->getPage( 'Appointments' )?->getPageTitle( '_personal' )
		);

		$this->notifier->emit( $event );
	}
}