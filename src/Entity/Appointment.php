<?php

namespace MediaWiki\Extension\Appointments\Entity;

readonly class Appointment {

	/**
	 * @param string $guid
	 * @param string $title
	 * @param array $participants
	 * @param Calendar $calendar
	 * @param PeriodDefinition $periodDefinition
	 * @param array $data
	 */
	public function __construct(
		public string $guid,
		public string $title,
		public array $participants,
		public Calendar $calendar,
		public PeriodDefinition $periodDefinition,
		public array $data
	) {
	}
}