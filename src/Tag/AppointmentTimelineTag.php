<?php

namespace MediaWiki\Extension\Appointments\Tag;

use MediaWiki\Extension\Appointments\Store\CalendarStore;
use MediaWiki\Extension\Appointments\Store\EventTypeStore;
use MediaWiki\Extension\Appointments\Utils\CalendarValueParam;
use MediaWiki\Extension\Appointments\Utils\EventTypeListValueParam;
use MediaWiki\MediaWikiServices;
use MediaWiki\Message\Message;
use MediaWiki\User\UserFactory;
use MWStake\MediaWiki\Component\FormEngine\StandaloneFormSpecification;
use MWStake\MediaWiki\Component\GenericTagHandler\ClientTagSpecification;
use MWStake\MediaWiki\Component\GenericTagHandler\GenericTag;
use MWStake\MediaWiki\Component\GenericTagHandler\ITagHandler;
use MWStake\MediaWiki\Component\InputProcessor\Processor\KeywordValue;

class AppointmentTimelineTag extends GenericTag {

	/**
	 * @param UserFactory $userFactory
	 * @param CalendarStore $calendarStore
	 * @param EventTypeStore $eventTypeStore
	 */
	public function __construct(
		private readonly UserFactory $userFactory,
		private readonly CalendarStore $calendarStore,
		private readonly EventTypeStore $eventTypeStore
	) {
	}

	/**
	 * @inheritDoc
	 */
	public function getTagNames(): array {
		return [ 'appointment-timeline' ];
	}

	/**
	 * @inheritDoc
	 */
	public function hasContent(): bool {
		return false;
	}

	/**
	 * @inheritDoc
	 */
	public function getParamDefinition(): ?array {
		$forAssignees = new UserGroupValue( $this->userFactory );
		$forAssignees->setRequired( false );

		$calendar = new CalendarValueParam( $this->calendarStore );
		$calendar->setRequired( false );

		$eventType = new EventTypeListValueParam( $this->eventTypeStore );
		$eventType->setRequired( false );
		$eventType->setListSeparator( ',' );

		$period = new KeywordValue();
		$period->setRequired( false );
		$period->setDefaultValue( 'this_week' );
		$period->setKeywords( [
			'this_week',
			'this_month',
			'next_week',
			'next_month'
		] );

		return [
			'assignees' => $forAssignees,
			'calendar' => $calendar,
			'eventTypes' => $eventType,
			'period' => $period,
		];
	}

	public function getResourceLoaderModules(): ?array {
		return [ 'ext.appointments.timeline.tag' ];
	}

	/**
	 * @inheritDoc
	 */
	public function getHandler( MediaWikiServices $services ): ITagHandler {
		return new AppointmentTimelineTagHandler(
			$services->getService( 'Appointments.AppointmentStore' ),
			$services->getService( 'Appointments._AppointmentSerializer' ),
			$services->getService( 'Appointments._UserInterface' ),
			$services->getUserFactory()
		);
	}

	/**
	 * @inheritDoc
	 */
	public function getClientTagSpecification(): ClientTagSpecification|null {
		$formSpec = new StandaloneFormSpecification();
		$formSpec->setItems( [
			[
				'type' => 'user_group_multiselect',
				'name' => 'assignees',
				'label' => Message::newFromKey( 'appointments-ve-attr-user' )->text(),
				'help' => Message::newFromKey( 'appointments-ve-attr-user-help' )->text(),
				'widget_returnJson' => true,
			],
			[
				'type' => 'appointment_calendar',
				'name' => 'calendar',
				'label' => Message::newFromKey( 'appointments-ve-calendar' )->text(),
				'widget_allowNone' => true,
				'widget_returnName' => true,
				'widget_autoLoad' => true,
			],
			[
				'type' => 'appointment_event_type_multiselect',
				'name' => 'eventTypes',
				'label' => Message::newFromKey( 'appointments-ve-event-types' )->text()
			],
			[
				'type' => 'dropdown',
				'name' => 'period',
				'label' => Message::newFromKey( 'appointments-ve-period' )->text(),
				'options' => [
					[
						'data' => 'this_week',
						'label' => Message::newFromKey( 'appointments-ve-period-this-week' )->text(),
					], [
						'data' => 'this_month',
						'label' => Message::newFromKey( 'appointments-ve-period-this-month' )->text(),
					], [
						'data' => 'next_week',
						'label' => Message::newFromKey( 'appointments-ve-period-next-week' )->text(),
					], [
						'data' => 'next_month',
						'label' => Message::newFromKey( 'appointments-ve-period-next-month' )->text(),
					]
				],
			],
		] );

		return new ClientTagSpecification(
			'AppointmentTimeline',
			Message::newFromKey( 'appointments-tag-timeline-desc' ),
			$formSpec,
			Message::newFromKey( 'appointments-tag-timeline' )
		);
	}
}
