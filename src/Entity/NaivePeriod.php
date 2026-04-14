<?php

namespace MediaWiki\Extension\Appointments\Entity;

use DateTime;

class NaivePeriod {

	public function __construct(
		protected DateTime $start,
		protected DateTime $end
	) {
	}

	/**
	 * @return DateTime
	 */
	public function getStart(): DateTime {
		return $this->start;
	}

	/**
	 * @return DateTime
	 */
	public function getEnd(): DateTime {
		return $this->end;
	}
}
