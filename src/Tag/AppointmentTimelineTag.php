<?php

namespace MediaWiki\Extension\Appointments\Tag;

use MediaWiki\Extension\Appointments\Store\CalendarStore;
use MediaWiki\Extension\Appointments\Store\EventTypeStore;
use MediaWiki\Extension\Appointments\Utils\CalendarValueParam;
use MediaWiki\Extension\Appointments\Utils\EventTypeListValueParam;
use MediaWiki\Language\Language;
use MediaWiki\MediaWikiServices;
use MediaWiki\Message\Message;
use MediaWiki\User\UserFactory;
use MWStake\MediaWiki\Component\FormEngine\StandaloneFormSpecification;
use MWStake\MediaWiki\Component\GenericTagHandler\ClientTagSpecification;
use MWStake\MediaWiki\Component\GenericTagHandler\GenericTag;
use MWStake\MediaWiki\Component\GenericTagHandler\ITagHandler;
use MWStake\MediaWiki\Component\InputProcessor\Processor\KeywordValue;
use MWStake\MediaWiki\Component\InputProcessor\Processor\UserValue;

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
		$forUser = new UserValue( $this->userFactory );
		$forUser->setRequired( false );

		$calendar = new CalendarValueParam( $this->calendarStore );
		$calendar->setRequired( false );

		$eventType = new EventTypeListValueParam( $this->eventTypeStore );
		$eventType->setRequired( false );
		$eventType->setListSeparator(',' );

		$period = new KeywordValue();
		$period->setRequired( false );
		$period->setDefaultValue( 'week' );
		$period->setKeywords( [ 'week', 'month', 'year' ] );

		return [
			'user' => $forUser,
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
				'type' => 'user',
				'name' => 'user',
				'label' => Message::newFromKey( 'appointments-ve-attr-user' )->text(),
			],
			[
				'type' => 'appointment_calendar',
				'name' => 'calendar',
				'label' => Message::newFromKey( 'appointments-ve-calendar' )->text(),
				'widget_allowNone' => true,
				'widget_returnName' => true,
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
						'data' => 'week',
						'label' => Message::newFromKey( 'appointments-ve-period-week' )->text(),
					], [
						'data' => 'month',
						'label' => Message::newFromKey( 'appointments-ve-period-month' )->text(),
					], [
						'data' => 'year',
						'label' => Message::newFromKey( 'appointments-ve-period-year' )->text(),
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
