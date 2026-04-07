<?php

namespace MediaWiki\Extension\Appointments\Entity;

use MediaWiki\User\UserIdentity;

readonly class Appointment {

	/**
	 * @param string $guid
	 * @param string $title
	 * @param array $participants
	 * @param Calendar $calendar
	 * @param PeriodDefinition $periodDefinition
	 * @param UserIdentity $creator
	 * @param array $data
	 */
	public function __construct(
		public string $guid,
		public string $title,
		public array $participants,
		public Calendar $calendar,
		public PeriodDefinition $periodDefinition,
		public UserIdentity $creator,
		public array $data
	) {
	}
}