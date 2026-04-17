<?php

namespace MediaWiki\Extension\Appointments\Hook;

use MediaWiki\Extension\Appointments\UserInterface;
use MediaWiki\Extension\Appointments\Utils\Permissions;
use MediaWiki\Hook\BeforePageDisplayHook;

readonly class AddJSVariables implements BeforePageDisplayHook {

	/**
	 * @param Permissions $permissions
	 * @param UserInterface $userInterface
	 */
	public function __construct(
		private Permissions $permissions,
		private UserInterface $userInterface
	) {
	}

	/**
	 * @inheritDoc
	 */
	public function onBeforePageDisplay( $out, $skin ): void {
		$out->addModules( [ 'ext.appointments.lib.fullcalendar' ] );
		$out->addJsConfigVars( [
			'wgAppointmentsPermissions' => [
				'create-appointment' => $this->permissions->canCreateAppointment( $out->getUser(), null ),
				'create-calendar' => $this->permissions->canCreateCalendar( $out->getUser() ),
				'change-calendar-permissions' => $this->permissions->canChangeCalendarPermissions( $out->getUser() ),
			],
			'wgAppointmentsLocale' => $this->userInterface->getUserLocale( $out->getUser() ),
		] );
	}
}