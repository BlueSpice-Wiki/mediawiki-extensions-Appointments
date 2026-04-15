<?php

namespace MediaWiki\Extension\Appointments\Hook;

use MediaWiki\Extension\Appointments\Utils\Permissions;
use MediaWiki\Hook\BeforePageDisplayHook;

readonly class AddJSVariables implements BeforePageDisplayHook {

	/**
	 * @param Permissions $permissions
	 */
	public function __construct(
		private Permissions $permissions
	) {
	}

	/**
	 * @inheritDoc
	 */
	public function onBeforePageDisplay( $out, $skin ): void {
		$out->addJsConfigVars( [
			'wgAppointmentsPermissions' => [
				'create-appointment' => $this->permissions->canCreateAppointment( $out->getUser(), null ),
				'create-calendar' => $this->permissions->canCreateCalendar( $out->getUser() ),
			]
		] );
	}
}