<?php

namespace MediaWiki\Extension\Appointments\Utils;

use MediaWiki\Extension\Appointments\Event\AppointmentReminderEvent;
use MediaWiki\Extension\Appointments\Store\AppointmentStore;
use MediaWiki\Language\Language;
use MediaWiki\SpecialPage\SpecialPageFactory;
use MWStake\MediaWiki\Component\Events\BotAgent;
use MWStake\MediaWiki\Component\Events\Notifier;
use Psr\Log\LoggerInterface;

readonly final class AppointmentProximityNotifier {

	/**
	 * @param AppointmentStore $appointmentStore
	 * @param Notifier $notifier
	 * @param UserResolver $userResolver
	 * @param SpecialPageFactory $specialPageFactory
	 * @param Language $contentLanguage
	 * @param LoggerInterface $logger
	 */
	public function __construct(
		private AppointmentStore $appointmentStore,
		private Notifier $notifier,
		private UserResolver $userResolver,
		private SpecialPageFactory $specialPageFactory,
		private Language $contentLanguage,
		private LoggerInterface $logger
	) {
	}

	/**
	 * @return void
	 */
	public function notify(): array {
		$appointmentsWithinNextWeek = $this->appointmentStore->newQuery()
			->forNextWeek()
			->execute();

		$rs = [];

		$now = new \DateTime();
		foreach ( $appointmentsWithinNextWeek as $appointment ) {
			$data = $appointment->data;
			$notifyConfig = $data['notifyInAdvance'] ?? null;
			if ( !$notifyConfig ) {
				continue;
			}
			if ( !( $notifyConfig['enabled'] ?? false ) ) {
				continue;
			}
			$appointmentStart = clone $appointment->periodDefinition->getStart();
			try {
				$window = ( clone $appointmentStart )->modify( '-' . $notifyConfig['period'] );
				$this->logger->debug( 'Proximity check', [
					'appointmentGuid' => $appointment->guid,
					'appointmentTitle' => $appointment->title,
					'windowStart' => $window->format( 'Y-m-d H:i:s' ),
					'now' => $now->format( 'Y-m-d H:i:s' ),
					'appointmentStart' => $appointmentStart->format( 'Y-m-d H:i:s' ),
					'fits' => $appointmentStart > $window && $appointmentStart <= $now,
					'advancePeriod' => $notifyConfig['period']
				] );
				if ( $appointmentStart > $window && $appointmentStart <= $now ) {
					// Send notification
					foreach ( $appointment->participants as $participant ) {
						$users = $this->userResolver->resolveToUsers( $participant );
						if ( empty( $user ) ) {
							continue;
						}
						$event = new AppointmentReminderEvent(
							new BotAgent(),
							$appointment->title,
							$appointment->eventType->name,
							$users,
							( new NotificationDateTimeFormatter( $this->contentLanguage ) )
								->getTimeString( $appointment ),
							$this->specialPageFactory->getPage( 'Appointments' )?->getPageTitle( '_personal' )
						);
						$this->notifier->emit( $event );
					}
				}
			} catch ( \Exception $e ) {
				// Invalid period format or other issue, skip
				$this->logger->error( 'Error processing appointment for proximity notification: ' . $e->getMessage(), [
					'appointmentGuid' => $appointment->guid,
					'appointmentTitle' => $appointment->title,
				] );
				continue;
			}
		}
		return $rs;
	}

}
