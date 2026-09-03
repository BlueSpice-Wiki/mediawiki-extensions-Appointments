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
			User::newSystemUser( User::MAINTENANCE_SCRIPT_USER, [ 'steal' => true ] ),
			[
				'color' => '#4F8F6B',
				'icon' => 'app-meeting'
			]
		);
	}
}
