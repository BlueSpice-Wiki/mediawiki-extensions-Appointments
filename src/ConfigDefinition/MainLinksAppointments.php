<?php

namespace MediaWiki\Extension\Appointments\ConfigDefinition;

use BlueSpice\ConfigDefinition\BooleanSetting;
use BlueSpice\ConfigDefinition\IOverwriteGlobal;

class MainLinksAppointments extends BooleanSetting implements IOverwriteGlobal {

	/**
	 * @return array
	 */
	public function getPaths() {
		return [
			static::MAIN_PATH_FEATURE . '/' . static::FEATURE_SKINNING . '/Appointments',
			static::MAIN_PATH_EXTENSION . '/Appointments/' . static::FEATURE_SKINNING,
			static::MAIN_PATH_PACKAGE . '/' . static::PACKAGE_PRO . '/Appointments',
		];
	}

	/**
	 * @return string
	 */
	public function getLabelMessageKey() {
		return 'appointments-config-mainlinks-overview-label';
	}

	/**
	 * @return string
	 */
	public function getHelpMessageKey() {
		return 'appointments-config-mainlinks-overview-help';
	}

	/**
	 * @return string
	 */
	public function getGlobalName() {
		return 'wgAppointmentsShowInMainLinks';
	}
}
