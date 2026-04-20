<?php

namespace MediaWiki\Extension\Appointments\Entity\EventType;

use MediaWiki\Extension\Appointments\Entity\EventType;
use MediaWiki\Message\Message;
use MediaWiki\User\User;

readonly class Vacation extends EventType {

	public function __construct() {
		parent::__construct(
			'vacation',
			Message::newFromKey( 'appointments-vacation-event-type-name' )->text(),
			Message::newFromKey( 'appointments-vacation-event-type-description' )->text(),
			true,
			User::newSystemUser( 'MediaWiki default' ),
			[
				'color' => '#B25F52',
				'icon' => 'calendar'
			]
		);
	}
}
