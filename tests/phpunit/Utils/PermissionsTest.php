<?php

namespace MediaWiki\Extension\Appointments\Tests\Utils;

use DateTime;
use MediaWiki\Extension\Appointments\Entity\Appointment;
use MediaWiki\Extension\Appointments\Entity\Calendar;
use MediaWiki\Extension\Appointments\Entity\EventType;
use MediaWiki\Extension\Appointments\Entity\PeriodDefinition;
use MediaWiki\Extension\Appointments\Utils\Permissions;
use MediaWiki\Permissions\Authority;
use MediaWiki\Permissions\PermissionManager;
use MediaWiki\User\UserIdentity;
use PHPUnit\Framework\TestCase;

/**
 * @covers \MediaWiki\Extension\Appointments\Utils\Permissions
 */
class PermissionsTest extends TestCase {

	public function testAppointmentAndCalendarPermissionChecksReturnTrue(): void {
		$creator = $this->newUserIdentity( 1 );
		$actorUser = $this->newUserIdentity( 2 );
		$actor = $this->createMock( Authority::class );
		$actor->method( 'getUser' )->willReturn( $actorUser );

		$calendar = $this->newCalendar( $creator );
		$appointment = $this->newAppointment( $creator, $calendar );
		$permissions = new Permissions( $this->createMock( PermissionManager::class ) );

		$this->assertTrue( $permissions->canModifyAppointment( $actor, $appointment, $calendar ) );
		$this->assertTrue( $permissions->canDeleteAppointment( $actor, $appointment, $calendar ) );
		$this->assertTrue( $permissions->canCreateAppointment( $actor, $calendar ) );
		$this->assertTrue( $permissions->canModifyCalendar( $actor, $calendar ) );
		$this->assertTrue( $permissions->canDeleteCalendar( $actor, $calendar ) );
		$this->assertTrue( $permissions->canCreateCalendar( $actor ) );
		$this->assertTrue( $permissions->canModifyEventTypes( $actor ) );
		$this->assertTrue( $permissions->canDeleteEventTypes( $actor ) );
	}

	private function newUserIdentity( int $id ): UserIdentity {
		$user = $this->createMock( UserIdentity::class );
		$user->method( 'isRegistered' )->willReturn( true );
		$user->method( 'getId' )->willReturn( $id );

		return $user;
	}

	private function newCalendar( UserIdentity $creator ): Calendar {
		return new Calendar(
			'calendar-guid',
			'Calendar',
			'Description',
			$creator,
			'testwiki'
		);
	}

	private function newAppointment( UserIdentity $creator, Calendar $calendar ): Appointment {
		$eventType = new EventType(
			'event-type-guid',
			'Meeting',
			'Meeting type',
			false,
			$creator
		);
		$period = new PeriodDefinition(
			new DateTime( '2024-01-01 10:00:00' ),
			new DateTime( '2024-01-01 11:00:00' )
		);

		return new Appointment(
			'appointment-guid',
			'Appointment',
			$eventType,
			[],
			$calendar,
			$period,
			$creator,
			[]
		);
	}
}
