<?php

namespace MediaWiki\Extension\Appointments\Event;

use MediaWiki\MediaWikiServices;
use MediaWiki\Message\Message;
use MediaWiki\Title\Title;
use MediaWiki\User\UserIdentity;
use MWStake\MediaWiki\Component\Events\Delivery\IChannel;

class AppointmentReminderEvent extends AppointmentAssignedEvent {

	public function __construct(
		UserIdentity $agent,
		string $appointmentTitle,
		string $eventType,
		array $targetUsers,
		string $timeString,
		?Title $appointmentsSp
	) {
		parent::__construct( $agent, $appointmentTitle, $eventType, $targetUsers, $timeString, $appointmentsSp );
	}

	/**
	 * @return string
	 */
	public function getKey(): string {
		return 'appointments-reminder';
	}

	/**
	 * @return Message
	 */
	public function getKeyMessage(): Message {
		return Message::newFromKey( 'appointments-event-remind-key' );
	}

	/**
	 * @inheritDoc
	 */
	public static function getArgsForTesting(
		UserIdentity $agent, MediaWikiServices $services, array $extra = []
	): array {
		return AppointmentAssignedEvent::getArgsForTesting( $agent, $services, $extra );
	}

	/**
	 * @param IChannel $forChannel
	 * @return Message
	 */
	public function getMessage( IChannel $forChannel ): Message {
		return Message::newFromKey( 'appointments-event-remind-message', $this->getMessageParams() );
	}
}
