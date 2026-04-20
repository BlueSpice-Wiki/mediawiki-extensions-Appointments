<?php

namespace MediaWiki\Extension\Appointments\Tests\Utils;

use DateTime;
use MediaWiki\Extension\Appointments\Entity\Appointment;
use MediaWiki\Extension\Appointments\Entity\Calendar;
use MediaWiki\Extension\Appointments\Entity\EventType;
use MediaWiki\Extension\Appointments\Entity\PeriodDefinition;
use MediaWiki\Extension\Appointments\Utils\NotificationDateTimeFormatter;
use MediaWiki\Language\Language;
use MediaWiki\User\UserIdentity;
use PHPUnit\Framework\TestCase;

/**
 * @covers \MediaWiki\Extension\Appointments\Utils\NotificationDateTimeFormatter
 */
class NotificationDateTimeFormatterTest extends TestCase {

	public function testGetTimeStringForSingleDayAllDayAppointment(): void {
		$formatter = new NotificationDateTimeFormatter( $this->newLanguageMock() );
		$appointment = $this->newAppointment(
			new PeriodDefinition(
				new DateTime( '2024-01-10 09:00:00' ),
				new DateTime( '2024-01-10 18:00:00' ),
				true
			)
		);

		$this->assertSame(
			'date:20240110000000',
			$formatter->getTimeString( $appointment )
		);
	}

	public function testGetTimeStringForMultiDayAllDayAppointment(): void {
		$formatter = new NotificationDateTimeFormatter( $this->newLanguageMock() );
		$appointment = $this->newAppointment(
			new PeriodDefinition(
				new DateTime( '2024-01-10 00:00:00' ),
				new DateTime( '2024-01-12 00:00:00' ),
				true
			)
		);

		$this->assertSame(
			'date:20240110000000 - date:20240112000000',
			$formatter->getTimeString( $appointment )
		);
	}

	public function testGetTimeStringForTimedAppointment(): void {
		$formatter = new NotificationDateTimeFormatter( $this->newLanguageMock() );
		$appointment = $this->newAppointment(
			new PeriodDefinition(
				new DateTime( '2024-01-10 09:15:00' ),
				new DateTime( '2024-01-10 11:45:00' )
			)
		);

		$this->assertSame(
			'date:20240110091500, 09:15 - 11:45',
			$formatter->getTimeString( $appointment )
		);
	}

	private function newLanguageMock(): Language {
		$language = $this->createMock( Language::class );
		$language->method( 'date' )->willReturnCallback(
			static fn ( string $timestamp ) => "date:$timestamp"
		);

		return $language;
	}

	private function newAppointment( PeriodDefinition $periodDefinition ): Appointment {
		$creator = $this->createMock( UserIdentity::class );
		$eventType = new EventType(
			'event-type-guid',
			'Meeting',
			'Meeting event',
			false,
			$creator
		);
		$calendar = new Calendar(
			'calendar-guid',
			'Main calendar',
			'Calendar description',
			$creator,
			'testwiki'
		);

		return new Appointment(
			'appointment-guid',
			'Test appointment',
			$eventType,
			[],
			$calendar,
			$periodDefinition,
			$creator,
			[]
		);
	}
}
