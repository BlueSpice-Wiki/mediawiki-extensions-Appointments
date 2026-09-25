<?php

namespace MediaWiki\Extension\Appointments\Tests\Utils;

use MediaWiki\Extension\Appointments\Entity\CalendarImported;
use MediaWiki\Extension\Appointments\Entity\EventType;
use MediaWiki\Extension\Appointments\Utils\ICSToAppointments;
use MediaWiki\User\UserIdentity;
use PHPUnit\Framework\TestCase;

/**
 * @covers \MediaWiki\Extension\Appointments\Utils\ICSToAppointments
 */
class ICSToAppointmentsTest extends TestCase {

	public function testConvertParsesIcsIntoAppointments(): void {
		$eventType = $this->newEventType();
		$calendar = $this->newCalendar();
		$converter = new ICSToAppointments( $eventType );

		$appointments = $converter->convert( $this->readFixture( 'import-basic.ics' ), $calendar );

		$this->assertCount( 2, $appointments );
		$this->assertSame( [], $converter->getSkipped() );

		$timed = $appointments[0];
		$this->assertSame( md5( 'calendar-guid|event-1@example.com|' ), $timed->guid );
		$this->assertMatchesRegularExpression( '/^[a-f0-9]{32}$/', $timed->guid );
		$this->assertSame( 'Team sync', $timed->title );
		$this->assertSame( $eventType, $timed->eventType );
		$this->assertSame( $calendar->creator, $timed->creator );
		$this->assertFalse( $timed->periodDefinition->isAllDay() );
		$this->assertSame( '2025-01-15 09:00:00', $timed->periodDefinition->getStart()->format( 'Y-m-d H:i:s' ) );
		$this->assertSame( '2025-01-15 10:30:00', $timed->periodDefinition->getEnd()->format( 'Y-m-d H:i:s' ) );
		$this->assertSame( 'weekly', $timed->periodDefinition->getRecurrenceRule()?->getRule() );
		$this->assertSame( 'owner@example.com', $timed->data['external']['organizer'] );
		$this->assertSame( [ 'a@example.com', 'b@example.com' ], $timed->data['external']['attendees'] );
		$this->assertSame( "Line 1\nLine 2", $timed->data['description'] );
		$this->assertSame( 'Room, 42', $timed->data['location'] );
		$this->assertSame(
			'https://teams.microsoft.com/l/meetup-join/abc',
			$timed->data['videoLink']
		);
		$this->assertStringNotContainsString( 'Do not leak', $timed->data['description'] );

		$allDay = $appointments[1];
		$this->assertTrue( $allDay->periodDefinition->isAllDay() );
		$this->assertSame( '2025-01-20 00:00:00', $allDay->periodDefinition->getStart()->format( 'Y-m-d H:i:s' ) );
		$this->assertSame( '2025-01-21 00:00:00', $allDay->periodDefinition->getEnd()->format( 'Y-m-d H:i:s' ) );
		$this->assertSame(
			'https://meet.google.com/aaa-bbbb-ccc',
			$allDay->data['videoLink']
		);
	}

	public function testConvertSkipsInvalidAndCancelledAndDeduplicatesByGuid(): void {
		$converter = new ICSToAppointments( $this->newEventType() );
		$calendar = $this->newCalendar();

		$appointments = $converter->convert( $this->readFixture( 'import-skip-and-dedupe.ics' ), $calendar );

		$this->assertCount( 1, $appointments );
		$this->assertSame( md5( 'calendar-guid|dup@example.com|' ), $appointments[0]->guid );

		$skipped = $converter->getSkipped();
		$this->assertCount( 1, $skipped );
		$this->assertSame( 'no-start@example.com', $skipped[0]['uid'] );
		$this->assertSame( 'Event has no DTSTART', $skipped[0]['reason'] );
	}

	public function testConvertDropsUnsupportedRecurrenceRule(): void {
		$converter = new ICSToAppointments( $this->newEventType() );
		$calendar = $this->newCalendar();

		$appointments = $converter->convert( $this->readFixture( 'import-unsupported-rrule.ics' ), $calendar );

		$this->assertCount( 1, $appointments );
		$this->assertNull( $appointments[0]->periodDefinition->getRecurrenceRule() );
	}

	private function readFixture( string $name ): string {
		$path = __DIR__ . '/fixtures/' . $name;
		return (string)file_get_contents( $path );
	}

	private function newCalendar(): CalendarImported {
		return new CalendarImported(
			'calendar-guid',
			'Imported Calendar',
			'Test calendar',
			$this->newUserIdentity(),
			'testwiki',
			[],
			[
				'imported' => true,
				'url' => 'https://example.test/calendar.ics',
			]
		);
	}

	private function newEventType(): EventType {
		return new EventType(
			'event-type-guid',
			'Imported test type',
			'Used in ICSToAppointments tests',
			true,
			$this->newUserIdentity()
		);
	}

	private function newUserIdentity(): UserIdentity {
		$userIdentity = $this->createMock( UserIdentity::class );
		$userIdentity->method( 'getName' )->willReturn( 'UnitTestUser' );
		return $userIdentity;
	}
}
