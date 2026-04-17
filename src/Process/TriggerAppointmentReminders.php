<?php

namespace MediaWiki\Extension\Appointments\Process;

use MediaWiki\Extension\Appointments\Store\AppointmentStore;
use MediaWiki\Extension\Appointments\Utils\AppointmentProximityNotifier;
use MediaWiki\Extension\Appointments\Utils\UserResolver;
use MediaWiki\Language\Language;
use MediaWiki\SpecialPage\SpecialPageFactory;
use MWStake\MediaWiki\Component\Events\Notifier;
use MWStake\MediaWiki\Component\ProcessManager\IProcessStep;
use Psr\Log\LoggerInterface;

class TriggerAppointmentReminders implements IProcessStep {

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
	 * @param array $data
	 * @return array
	 */
	public function execute( $data = [] ): array {
		$proximityNotifier = new AppointmentProximityNotifier(
			$this->appointmentStore,
			$this->notifier,
			$this->userResolver,
			$this->specialPageFactory,
			$this->contentLanguage,
			$this->logger
		);
		return $proximityNotifier->notify();
	}
}
