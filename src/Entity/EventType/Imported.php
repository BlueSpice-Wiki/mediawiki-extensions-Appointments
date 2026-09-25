<?php

namespace MediaWiki\Extension\Appointments\Entity\EventType;

use MediaWiki\Extension\Appointments\Entity\EventType;
use MediaWiki\Message\Message;
use MediaWiki\User\User;

readonly class Imported extends EventType {

	public function __construct() {
		parent::__construct(
			'imported',
			Message::newFromKey( 'appointments-imported-event-type-name' )->text(),
			Message::newFromKey( 'appointments-imported-event-type-description' )->text(),
			true,
			User::newSystemUser( User::MAINTENANCE_SCRIPT_USER, [ 'steal' => true ] )
		);
	}
}
