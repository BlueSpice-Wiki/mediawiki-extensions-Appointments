<?php

namespace MediaWiki\Extension\Appointments\ResourceLoader;

use Config;
use MediaWiki\ResourceLoader\Context;

class ConfigCallback {

	/**
	 * @param Context $context
	 * @param Config $config
	 * @return array[]
	 */
	public static function handleConfigRequest( Context $context, Config $config ) {
		return [
			'i18n' => [
				'January' => $context->msg( 'appointments-january' )->text(),
				'February' => $context->msg( 'appointments-february' )->text(),
				'March' => $context->msg( 'appointments-march' )->text(),
				'April' => $context->msg( 'appointments-april' )->text(),
				'May' => $context->msg( 'appointments-may' )->text(),
				'June' => $context->msg( 'appointments-june' )->text(),
				'July' => $context->msg( 'appointments-july' )->text(),
				'August' => $context->msg( 'appointments-august' )->text(),
				'September' => $context->msg( 'appointments-september' )->text(),
				'October' => $context->msg( 'appointments-october' )->text(),
				'November' => $context->msg( 'appointments-november' )->text(),
				'December' => $context->msg( 'appointments-december' )->text(),
				'Sunday' => $context->msg( 'appointments-sunday' )->text(),
				'Monday' => $context->msg( 'appointments-monday' )->text(),
				'Tuesday' => $context->msg( 'appointments-tuesday' )->text(),
				'Wednesday' => $context->msg( 'appointments-wednesday' )->text(),
				'Thursday' => $context->msg( 'appointments-thursday' )->text(),
				'Friday' => $context->msg( 'appointments-friday' )->text(),
				'Saturday' => $context->msg( 'appointments-saturday' )->text(),
				'Done' => $context->msg( 'appointments-calendarjs-done' )->text(),
				'Reset' => $context->msg( 'appointments-calendarjs-reset' )->text(),
			]
		];
	}
}