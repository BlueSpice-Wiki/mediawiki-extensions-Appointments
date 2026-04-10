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
	 * @param PeriodDefinition $periodDefinition
	 * @param bool $matchNext
	 * @return PeriodDefinition|null
	 */
	public function getMatchInPeriod( PeriodDefinition $periodDefinition, bool $matchNext = false ): ?PeriodDefinition {
		if ( !$this->recurrenceRule ) {
			// No recurrence, just check if falls within start and end
			if ( !$matchNext && $this->overlapsWith( $periodDefinition ) ) {
				return $this;
			}
			return null;
		}

		if ( $matchNext ) {
			$this->recurrenceRule->moveToNext( $this->start, $this->end );
		}

		// With recurrence, check if falls within any of the recurrences
		while ( $this->start <= $periodDefinition->getEnd() ) {
			if ( $this->overlapsWith( $periodDefinition ) ) {
				return $this;
			}
			$this->recurrenceRule->moveToNext( $this->start, $this->end );
		}
		return null;
	}

	/**
	 * @param PeriodDefinition $toCheck
	 * @return bool
	 */
	public function overlapsWith( PeriodDefinition $toCheck ): bool {
		$startsWithin = $this->start >= $toCheck->getStart() && $this->start <= $toCheck->getEnd();
		$endsWithin = $this->end >= $toCheck->getStart() && $this->end <= $toCheck->getEnd();
		return $startsWithin || $endsWithin;
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

	public function __clone(): void {
		$this->start = clone $this->start;
		$this->end = clone $this->end;
	}
}
