<?php

namespace MediaWiki\Extension\Appointments\Entity\EventType;

use MediaWiki\Extension\Appointments\Entity\EventType;
use MediaWiki\Message\Message;
use MediaWiki\User\User;

readonly class Travel extends EventType {

	public function __construct() {
		parent::__construct(
			'travel',
			Message::newFromKey( 'appointments-travel-event-type-name' )->text(),
			Message::newFromKey( 'appointments-travel-event-type-description' )->text(),
			true,
			User::newSystemUser( 'MediaWiki default' ),
			[
				'color' => '#A06FAF',
				'icon' => 'calendar'
			]
		);
	}
}