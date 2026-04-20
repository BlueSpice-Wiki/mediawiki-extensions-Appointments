<?php

namespace MediaWiki\Extension\Appointments\Tests\Entity;

use DateTime;
use MediaWiki\Extension\Appointments\Entity\NaivePeriod;
use MediaWiki\Extension\Appointments\Entity\PeriodDefinition;
use MediaWiki\Extension\Appointments\Utils\RecurrenceRule;
use PHPUnit\Framework\TestCase;

/**
 * @covers \MediaWiki\Extension\Appointments\Entity\PeriodDefinition
 */
class PeriodDefinitionTest extends TestCase {

	public function testConstructorNormalizesAllDayPeriodToMidnight(): void {
		$period = new PeriodDefinition(
			new DateTime( '2024-06-01 15:30:00' ),
			new DateTime( '2024-06-01 17:45:00' ),
			true
		);

		$this->assertTrue( $period->isAllDay() );
		$this->assertSame( '2024-06-01 00:00:00', $period->getStart()->format( 'Y-m-d H:i:s' ) );
		$this->assertSame( '2024-06-01 00:00:00', $period->getEnd()->format( 'Y-m-d H:i:s' ) );
	}

	public function testGetMatchInPeriodReturnsSelfForNonRecurringOverlap(): void {
		$period = new PeriodDefinition(
			new DateTime( '2024-06-10 10:00:00' ),
			new DateTime( '2024-06-10 11:00:00' )
		);
		$visiblePeriod = new NaivePeriod(
			new DateTime( '2024-06-01 00:00:00' ),
			new DateTime( '2024-06-30 23:59:59' )
		);

		$this->assertSame( $period, $period->getMatchInPeriod( $visiblePeriod ) );
	}

	public function testGetMatchInPeriodReturnsNullForNonRecurringNoOverlap(): void {
		$period = new PeriodDefinition(
			new DateTime( '2024-06-10 10:00:00' ),
			new DateTime( '2024-06-10 11:00:00' )
		);
		$visiblePeriod = new NaivePeriod(
			new DateTime( '2024-06-11 00:00:00' ),
			new DateTime( '2024-06-12 23:59:59' )
		);

		$this->assertNull( $period->getMatchInPeriod( $visiblePeriod ) );
	}

	public function testGetMatchInPeriodAdvancesRecurringPeriodUntilItOverlaps(): void {
		$period = new PeriodDefinition(
			new DateTime( '2024-01-01 09:00:00' ),
			new DateTime( '2024-01-01 10:00:00' ),
			false,
			new RecurrenceRule( RecurrenceRule::RECURRENCE_WEEKLY )
		);
		$visiblePeriod = new NaivePeriod(
			new DateTime( '2024-01-15 00:00:00' ),
			new DateTime( '2024-01-15 23:59:59' )
		);

		$this->assertSame( $period, $period->getMatchInPeriod( $visiblePeriod ) );
		$this->assertSame( '2024-01-15 09:00:00', $period->getStart()->format( 'Y-m-d H:i:s' ) );
		$this->assertSame( '2024-01-15 10:00:00', $period->getEnd()->format( 'Y-m-d H:i:s' ) );
	}

	public function testGetMatchInPeriodWithMatchNextSkipsCurrentOccurrence(): void {
		$period = new PeriodDefinition(
			new DateTime( '2024-01-01 09:00:00' ),
			new DateTime( '2024-01-01 10:00:00' ),
			false,
			new RecurrenceRule( RecurrenceRule::RECURRENCE_WEEKLY )
		);
		$visiblePeriod = new NaivePeriod(
			new DateTime( '2024-01-01 00:00:00' ),
			new DateTime( '2024-01-01 23:59:59' )
		);

		$this->assertNull( $period->getMatchInPeriod( $visiblePeriod, true ) );
		$this->assertSame( '2024-01-08 09:00:00', $period->getStart()->format( 'Y-m-d H:i:s' ) );
		$this->assertSame( '2024-01-08 10:00:00', $period->getEnd()->format( 'Y-m-d H:i:s' ) );
	}
}
