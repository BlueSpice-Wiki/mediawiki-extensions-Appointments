<?php

namespace MediaWiki\Extension\Appointments\Entity\EventType;

use MediaWiki\Extension\Appointments\Entity\EventType;
use MediaWiki\Message\Message;
use MediaWiki\User\User;

readonly class Birthday extends EventType {

	public function __construct() {
		parent::__construct(
			'birthday',
			Message::newFromKey( 'appointments-birthday-event-type-name' )->text(),
			Message::newFromKey( 'appointments-birthday-event-type-description' )->text(),
			true,
			User::newSystemUser( User::MAINTENANCE_SCRIPT_USER, [ 'steal' => true ] ),
			[
				'color' => '#4F5F78',
				'icon' => 'calendar'
			]
		);
	}
}
