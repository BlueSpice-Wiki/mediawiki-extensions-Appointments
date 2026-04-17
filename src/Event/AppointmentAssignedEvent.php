<?php

namespace MediaWiki\Extension\Appointments\Event;

use MediaWiki\MediaWikiServices;
use MediaWiki\Message\Message;
use MediaWiki\Title\Title;
use MediaWiki\User\UserIdentity;
use MWStake\MediaWiki\Component\Events\Delivery\IChannel;
use MWStake\MediaWiki\Component\Events\Delivery\IExternalChannel;
use MWStake\MediaWiki\Component\Events\EventLink;
use MWStake\MediaWiki\Component\Events\NotificationEvent;

class AppointmentAssignedEvent extends NotificationEvent {

	public function __construct(
		UserIdentity $agent,
		private readonly string $appointmentTitle,
		private readonly string $eventType,
		private readonly array $targetUsers,
		private readonly string $timeString,
		private readonly ?Title $appointmentsSp
	) {
		parent::__construct( $agent );
	}

	/**
	 * @return string
	 */
	public function getKey(): string {
		return 'appointments-assignment';
	}

	/**
	 * @return Message
	 */
	public function getKeyMessage(): Message {
		return Message::newFromKey( 'appointments-event-assign-key' );
	}

	/**
	 * @return array
	 */
	public function getTargetUsers(): array {
		return $this->targetUsers;
	}

	/**
	 * @inheritDoc
	 */
	public static function getArgsForTesting(
		UserIdentity $agent, MediaWikiServices $services, array $extra = []
	): array {
		$params = parent::getArgsForTesting( $agent, $services, $extra );
		$params[] = 'Dummy';
		$params[] = 'Foo';
		$params[] = [ $extra['targetUser'] ];
		$params[] = '2026-02-02, 10:00 - 10:30';
		$params[] = $services->getSpecialPageFactory()->getPage( 'Appointment' );


		return $params;
	}

	/**
	 * @param IChannel $forChannel
	 * @return Message
	 */
	public function getMessage( IChannel $forChannel ): Message {
		return Message::newFromKey( 'appointments-event-assign-message', $this->getMessageParams() );
	}

	/**
	 * @param IChannel $forChannel
	 * @return array|EventLink[]
	 */
	public function getLinks( IChannel $forChannel ): array {
		if ( !$this->appointmentsSp ) {
			return [];
		}

		return [
			new EventLink(
				$forChannel instanceof IExternalChannel ?
					$this->appointmentsSp->getFullURL() : $this->appointmentsSp->getLocalURL(),
				Message::newFromKey( 'appointments-event-link-target-label' )
			)
		];
	}

	/**
	 * @return array
	 */
	protected function getMessageParams(): array {
		return [
			$this->appointmentTitle,
			$this->eventType,
			$this->timeString,
		];
	}
}
