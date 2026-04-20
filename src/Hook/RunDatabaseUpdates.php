<?php

namespace MediaWiki\Extension\Appointments\Hook;

use MediaWiki\Installer\Hook\LoadExtensionSchemaUpdatesHook;

class RunDatabaseUpdates implements LoadExtensionSchemaUpdatesHook {

	/**
	 * @inheritDoc
	 */
	public function onLoadExtensionSchemaUpdates( $updater ) {
		$dbType = $updater->getDB()->getType();
		$dir = dirname( __DIR__, 2 );

		$updater->addExtensionTable(
			'calendars',
			"$dir/db/$dbType/calendars.sql"
		);
		$updater->addExtensionTable(
			'appointments',
			"$dir/db/$dbType/appointments.sql"
		);
		$updater->addExtensionTable(
			'appointment_participants',
			"$dir/db/$dbType/appointment_participants.sql"
		);
		$updater->addExtensionTable(
			'appointment_event_types',
			"$dir/db/$dbType/appointment_event_types.sql"
		);
		$updater->addExtensionTable(
			'appointment_event_type_assignments',
			"$dir/db/$dbType/appointment_event_type_assignments.sql"
		);
	}
}
