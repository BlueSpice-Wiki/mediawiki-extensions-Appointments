<?php

namespace MediaWiki\Extension\Appointments\Entity;

use DateTime;
use InvalidArgumentException;
use MediaWiki\Extension\Appointments\Utils\RecurrenceRule;
use MediaWiki\Message\Message;

readonly class PeriodDefinition {

	public function __construct(
		private DateTime $start,
		private DateTime $end,
		private bool $isAllDay = false,
		private ?RecurrenceRule $recurrenceRule = null
	) {
		if ( $this->isAllDay ) {
			$this->start->setTime( 0, 0 );
			$this->end->setTime( 0, 0,);
		}
		$this->validate();
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

	/**
	 * @return bool
	 */
	public function isAllDay(): bool {
		return $this->isAllDay;
	}

	/**
	 * @return bool
	 */
	public function isMultiDay(): bool {
		return $this->start->format( 'Y-m-d' ) !== $this->end->format( 'Y-m-d' );
	}

	/**
	 * @return RecurrenceRule|null
	 */
	public function getRecurrenceRule(): ?RecurrenceRule {
		return $this->recurrenceRule;
	}

	/**
	 * Given certain start and end date, get the matching appointment date if it falls within the period definition
	 * (taking into account recurrence rule if exists)
	 * This is to be used to show appointment in calendar (for particular period currently visible in calendar)
	 *
	 * @param DateTime $start
	 * @param DateTime $end
	 * @return PeriodDefinition|null
	 */
	public function getMatchInPeriod( DateTime $start, DateTime $end ): ?PeriodDefinition {
		if ( !$this->recurrenceRule ) {
			// No recurrence, just check if falls within start and end
			if ( $start >= $this->start && $end <= $this->end ) {
				return $this;
			}
			return null;
		}
		// With recurrence, check if falls within any of the recurrences
		$currentStart = clone $this->start;
		$currentEnd = clone $this->end;
		while ( $currentStart <= $end ) {
			if ( $start >= $currentStart && $end <= $currentEnd ) {
				return new PeriodDefinition( $currentStart, $currentEnd, $this->isAllDay );
			}
			$this->recurrenceRule->moveToNext( $currentStart, $currentEnd );
		}
		return null;
	}

	/**
	 * @return void
	 */
	private function validate() {
		// End must be after start
		if ( $this->end <= $this->start ) {
			throw new InvalidArgumentException(
				Message::newFromKey( 'appointments-error-end-before-start' )->text()
			);
		}
		if ( $this->isMultiDay() ) {
			if ( !$this->isAllDay() ) {
				// If multi-day, must be all day
				throw new InvalidArgumentException(
					Message::newFromKey( 'appointments-error-multiday-not-allday' )->text()
				);
			}
			if (
				$this->recurrenceRule &&
				!$this->recurrenceRule->supportsAppointmentDuration( $this->start, $this->end )
			) {
				// If multi-day, must fit in recurrence period
				throw new InvalidArgumentException(
					Message::newFromKey( 'appointments-error-multiday-too-long-for-recurrence' )->text()
				);
			}
		}
	}
}
