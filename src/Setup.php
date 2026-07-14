<?php

namespace MediaWiki\Extension\Appointments;

use MediaWiki\Extension\Appointments\Process\TriggerAppointmentReminders;
use MediaWiki\MediaWikiServices;
use MWStake\MediaWiki\Component\ProcessManager\ManagedProcess;
use MWStake\MediaWiki\Component\WikiCron\WikiCronManager;

class Setup {

	public static function callback() {
		if ( defined( 'MW_PHPUNIT_TEST' ) || defined( 'MW_QUIBBLE_CI' ) ) {
			return;
		}
		$services = MediaWikiServices::getInstance();
		/** @var WikiCronManager $cronManager */
		$cronManager = $services->getService( 'MWStake.WikiCronManager' );

		// Run cron once an hour
		$cronManager->registerCron( 'appointments-trigger-reminders', '0 * * * *', new ManagedProcess( [
			'appointments-remind' => [
				'class' => TriggerAppointmentReminders::class,
				'services' => [
					'Appointments.AppointmentStore', 'MWStake.Notifier', 'Appointments._UserResolver',
					'SpecialPageFactory', 'ContentLanguage', 'Appointments._Logger'
				],
			]
		] ) );
	}
}
