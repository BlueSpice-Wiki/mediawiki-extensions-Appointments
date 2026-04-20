<?php

namespace MediaWiki\Extension\Appointments\Hook;

use MediaWiki\Extension\Appointments\Store\CalendarStore;
use MediaWiki\Extension\Appointments\Store\EventTypeStore;
use MediaWiki\Extension\Appointments\Tag\AppointmentTimelineTag;
use MediaWiki\User\UserFactory;
use MWStake\MediaWiki\Component\GenericTagHandler\Hook\MWStakeGenericTagHandlerInitTagsHook;

readonly class AddTag implements MWStakeGenericTagHandlerInitTagsHook {

	/**
	 * @param UserFactory $userFactory
	 * @param CalendarStore $calendarStore
	 * @param EventTypeStore $eventTypeStore
	 */
	public function __construct(
		private UserFactory $userFactory,
		private CalendarStore $calendarStore,
		private EventTypeStore $eventTypeStore
	) {
	}

	/**
	 * @inheritDoc
	 */
	public function onMWStakeGenericTagHandlerInitTags( array &$tags ) {
		$tags[] = new AppointmentTimelineTag( $this->userFactory, $this->calendarStore, $this->eventTypeStore );
	}
}
