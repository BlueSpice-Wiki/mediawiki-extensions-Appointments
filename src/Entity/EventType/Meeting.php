<?php

namespace MediaWiki\Extension\Appointments\Entity\EventType;

use MediaWiki\Extension\Appointments\Entity\EventType;
use MediaWiki\Message\Message;
use MediaWiki\User\User;

readonly class Meeting extends EventType {

	public function __construct() {
		parent::__construct(
			'meeting',
			Message::newFromKey( 'appointments-meeting-event-type-name' )->text(),
			Message::newFromKey( 'appointments-meeting-event-type-description' )->text(),
			true,
			User::newSystemUser( 'MediaWiki default' ),
			[
				'color' => '#6FAF88',
				'icon' => 'calendar'
			]
		);
	}
}