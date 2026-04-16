<?php

namespace MediaWiki\Extension\Appointments\Tests\Utils;

use MediaWiki\Extension\Appointments\Utils\GuidGenerator;
use PHPUnit\Framework\TestCase;

/**
 * @covers \MediaWiki\Extension\Appointments\Utils\GuidGenerator
 */
class GuidGeneratorTest extends TestCase {

	public function testGenerateAppointmentGuidReturnsMd5LikeHash(): void {
		$generator = new GuidGenerator( 'testwiki' );
		$guid = $generator->generateAppointmentGuid();

		$this->assertMatchesRegularExpression( '/^[a-f0-9]{32}$/', $guid );
	}

	public function testGenerateCalendarGuidReturnsMd5LikeHash(): void {
		$generator = new GuidGenerator( 'testwiki' );
		$guid = $generator->generateCalendarGuid();

		$this->assertMatchesRegularExpression( '/^[a-f0-9]{32}$/', $guid );
	}

	public function testGenerateEventTypeGuidReturnsMd5LikeHash(): void {
		$generator = new GuidGenerator( 'testwiki' );
		$guid = $generator->generateEventTypeGuid( 'Meeting' );

		$this->assertMatchesRegularExpression( '/^[a-f0-9]{32}$/', $guid );
	}

	public function testGenerateEventTypeGuidCreatesDifferentValuesOnConsecutiveCalls(): void {
		$generator = new GuidGenerator( 'testwiki' );

		$first = $generator->generateEventTypeGuid( 'Meeting' );
		$second = $generator->generateEventTypeGuid( 'Meeting' );

		$this->assertNotSame( $first, $second );
	}
}

