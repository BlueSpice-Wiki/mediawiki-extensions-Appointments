<?php

namespace MediaWiki\Extension\Appointments\Entity;

use MediaWiki\User\UserIdentity;

class Appointment {

	/**
	 * @param string $guid
	 * @param string $title
	 * @param EventType $eventType
	 * @param array $participants
	 * @param Calendar $calendar
	 * @param PeriodDefinition $periodDefinition
	 * @param UserIdentity $creator
	 * @param array $data
	 */
	public function __construct(
		public readonly string $guid,
		public readonly string $title,
		public readonly EventType $eventType,
		public readonly array $participants,
		public readonly Calendar $calendar,
		public PeriodDefinition $periodDefinition,
		public readonly UserIdentity $creator,
		public readonly array $data
	) {
	}
}