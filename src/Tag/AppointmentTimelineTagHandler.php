<?php

namespace MediaWiki\Extension\Appointments\Tag;

use DateTime;
use DateTimeZone;
use MediaWiki\Extension\Appointments\Entity\Appointment;
use MediaWiki\Extension\Appointments\Entity\NaivePeriod;
use MediaWiki\Extension\Appointments\Store\AppointmentStore;
use MediaWiki\Extension\Appointments\UserInterface;
use MediaWiki\Extension\Appointments\Utils\AppointmentSerializer;
use MediaWiki\Html\Html;
use MediaWiki\Html\TemplateParser;
use MediaWiki\Parser\Parser;
use MediaWiki\Parser\PPFrame;
use MediaWiki\User\UserFactory;
use MediaWiki\User\UserIdentity;
use MWStake\MediaWiki\Component\GenericTagHandler\ITagHandler;

class AppointmentTimelineTagHandler implements ITagHandler {
	private TemplateParser $templateParser;

	/**
	 * @var string[]
	 */
	private $viewMap = [
		'this_week' => 'listWeek',
		'next_week' => 'listWeek',
		'this_month' => 'listMonth',
		'next_month' => 'listMonth',
	];

	/**
	 * @param AppointmentStore $appointmentStore
	 * @param AppointmentSerializer $serializer
	 * @param UserInterface $userInterface
	 * @param UserFactory $userFactory
	 */
	public function __construct(
		private readonly AppointmentStore $appointmentStore,
		private readonly AppointmentSerializer $serializer,
		private readonly UserInterface $userInterface,
		private readonly UserFactory $userFactory
	) {
		$this->templateParser = new TemplateParser(
			dirname( __DIR__, 2 ) . '/resources/templates'
		);
	}

	/**
	 * @inheritDoc
	 */
	public function getRenderedContent( string $input, array $params, Parser $parser, PPFrame $frame ): string {
		$query = $this->appointmentStore->newQuery();
		if ( $params['assignees'] ) {
			$query->forAssignees( $params['assignees'] );
		}
		if ( $params['calendar'] ) {
			$query->forCalendar( $params['calendar'] );
		}
		if ( $params['eventType'] ) {
			$query->forEventTypes( $params['eventType'] );
		}

		$period = $this->getPeriod( $params, $parser->getUserIdentity() );
		if ( $period ) {
			$query->forPeriod( $period );
		}

		$view = $this->viewMap[ $params['period'] ?? 'this_week' ] ?? 'listWeek';

		$appointments = $query->execute();
		$user = $this->userFactory->newFromUserIdentity( $parser->getUserIdentity() );

		$parser->getOutput()->addModules( [ 'ext.oojsplus.special.skeleton.styles' ] );
		return Html::rawElement( 'div', [
			'class' => 'appointment-timeline-tag ext-appointments-scheduler-calendar-cnt',
			'data-appointments' => json_encode( array_map( function ( Appointment $appointment ) use ( $user ) {
				return $this->serializer->serializeForOutput( $appointment, $user );
			}, $appointments ) ),
			'data-view' => $view,
			'data-initial-date' => $period?->getStart()->format( 'Y-m-d' ),
		], $this->getSkeletonHtml() );
	}

	/**
	 * @return string
	 */
	private function getSkeletonHtml(): string {
		return $this->templateParser->processTemplate( 'appointment-timeline-skeleton', [] );
	}

	private function getPeriod( array $params, UserIdentity $user ): ?NaivePeriod {
		$now = new DateTime( 'now', new DateTimeZone( 'UTC' ) );
		$period = $params['period'] ?? 'this_week';
		$start = $this->userInterface->convertDateTimeForUser( $now, $user );
		$start->setTime( 0, 0, 0 );
		$end = clone $start;

		switch ( $period ) {
			case 'this_week':
				$start->modify( 'monday this week' );
				$end = clone $start;
				$end->modify( '+1 week' );
				break;
			case 'next_week':
				$start->modify( 'monday next week' );
				$end = clone $start;
				$end->modify( '+1 week' );
				break;
			case 'this_month':
				$start->modify( 'first day of this month' );
				$end = clone $start;
				$end->modify( '+1 month' );
				break;
			case 'next_month':
				$start->modify( 'first day of next month' );
				$end = clone $start;
				$end->modify( '+1 month' );
				break;
			default:
				return null;
		}
		return new NaivePeriod( $start, $end );
	}
}
