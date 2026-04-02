<?php

namespace MediaWiki\Extension\Appointments\Utils;

use DateTime;
use InvalidArgumentException;

final class RecurrenceRule {

	public const string RECURRENCE_WEEKLY = 'weekly';
	public const string RECURRENCE_MONTHLY = 'monthly';
	public const string RECURRENCE_YEARLY = 'yearly';

	private static array $validRules = [
		self::RECURRENCE_WEEKLY,
		self::RECURRENCE_MONTHLY,
		self::RECURRENCE_YEARLY
	];

	private static array $secondsInPeriod = [
		self::RECURRENCE_WEEKLY => 7 * 24 * 3600,
		self::RECURRENCE_MONTHLY => 30 * 24 * 3600, // Approximation
		self::RECURRENCE_YEARLY => 365 * 24 * 3600 // Approximation
	];

	/**
	 * @param string $rule
	 */
	public function __construct( private string $rule ) {
		if ( !in_array( $rule, RecurrenceRule::$validRules ) ) {
			throw new InvalidArgumentException( "Invalid recurrence rule: $rule" );
		}
	}

	/**
	 * @return string
	 */
	public function getRule(): string {
		return $this->rule;
	}

	/**
	 * If appointment is multi-day, it must fit in period: eg. weekly => appointment cannot span two weeks
	 * @param DateTime $start
	 * @param DateTime $end
	 * @return bool
	 */
	public function supportsAppointmentDuration( DateTime $start, DateTime $end ): bool {
		$secDuration = $end->getTimestamp() - $start->getTimestamp();

		return $secDuration < RecurrenceRule::$secondsInPeriod[$this->rule];
	}

	/**
	 * Move provided DateTimes to next occurrence according to the rule.
	 * eg. weekly => +7days
	 *
	 * @param DateTime $start
	 * @param DateTime $end
	 * @return void
	 */
	public function moveToNext( DateTime $start, DateTime $end ) {
		switch ( $this->rule ) {
			case self::RECURRENCE_WEEKLY:
				$start->modify( '+1 week' );
				$end->modify( '+1 week' );
				break;
			case self::RECURRENCE_MONTHLY:
				$start->modify( '+1 month' );
				$end->modify( '+1 month' );
				break;
			case self::RECURRENCE_YEARLY:
				$start->modify( '+1 year' );
				$end->modify( '+1 year' );
				break;
		}
	}
}