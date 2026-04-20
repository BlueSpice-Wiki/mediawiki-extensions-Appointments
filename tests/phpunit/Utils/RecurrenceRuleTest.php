<?php

namespace MediaWiki\Extension\Appointments\Tests\Utils;

use DateTime;
use InvalidArgumentException;
use MediaWiki\Extension\Appointments\Utils\RecurrenceRule;
use PHPUnit\Framework\TestCase;

/**
 * @covers \MediaWiki\Extension\Appointments\Utils\RecurrenceRule
 */
class RecurrenceRuleTest extends TestCase {

	/**
	 * @dataProvider provideValidRules
	 */
	public function testConstructorAcceptsValidRulesAndExposesThem( string $rule ): void {
		$recurrenceRule = new RecurrenceRule( $rule );

		$this->assertSame( $rule, $recurrenceRule->getRule() );
	}

	public static function provideValidRules(): array {
		return [
			'weekly' => [ RecurrenceRule::RECURRENCE_WEEKLY ],
			'monthly' => [ RecurrenceRule::RECURRENCE_MONTHLY ],
			'yearly' => [ RecurrenceRule::RECURRENCE_YEARLY ],
		];
	}

	public function testConstructorRejectsInvalidRule(): void {
		$this->expectException( InvalidArgumentException::class );
		$this->expectExceptionMessage( 'Invalid recurrence rule: invalid' );

		new RecurrenceRule( 'invalid' );
	}

	public function testSupportsAppointmentDurationRequiresDurationToBeStrictlyShorterThanPeriod(): void {
		$rule = new RecurrenceRule( RecurrenceRule::RECURRENCE_WEEKLY );
		$start = new DateTime( '2024-01-01 00:00:00' );

		$withinWeeklyPeriod = new DateTime( '2024-01-07 23:59:59' );
		$exactlyWeeklyPeriod = new DateTime( '2024-01-08 00:00:00' );

		$this->assertTrue( $rule->supportsAppointmentDuration( clone $start, $withinWeeklyPeriod ) );
		$this->assertFalse( $rule->supportsAppointmentDuration( clone $start, $exactlyWeeklyPeriod ) );
	}

	/**
	 * @dataProvider provideMoveToNextCases
	 */
	public function testMoveToNextAdvancesStartAndEnd(
		string $rule,
		string $initialStart,
		string $initialEnd,
		string $expectedStart,
		string $expectedEnd
	): void {
		$recurrenceRule = new RecurrenceRule( $rule );
		$start = new DateTime( $initialStart );
		$end = new DateTime( $initialEnd );

		$recurrenceRule->moveToNext( $start, $end );

		$this->assertSame( $expectedStart, $start->format( 'Y-m-d H:i:s' ) );
		$this->assertSame( $expectedEnd, $end->format( 'Y-m-d H:i:s' ) );
	}

	public static function provideMoveToNextCases(): array {
		return [
			'weekly' => [
				RecurrenceRule::RECURRENCE_WEEKLY,
				'2024-01-10 09:00:00',
				'2024-01-10 10:00:00',
				'2024-01-17 09:00:00',
				'2024-01-17 10:00:00',
			],
			'monthly' => [
				RecurrenceRule::RECURRENCE_MONTHLY,
				'2024-01-10 09:00:00',
				'2024-01-10 10:00:00',
				'2024-02-10 09:00:00',
				'2024-02-10 10:00:00',
			],
			'yearly' => [
				RecurrenceRule::RECURRENCE_YEARLY,
				'2024-01-10 09:00:00',
				'2024-01-10 10:00:00',
				'2025-01-10 09:00:00',
				'2025-01-10 10:00:00',
			],
		];
	}
}
