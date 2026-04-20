<?php

namespace MediaWiki\Extension\Appointments\Tag;

use DateTime;
use DateTimeZone;
use Html;
use MediaWiki\Extension\Appointments\Entity\Appointment;
use MediaWiki\Extension\Appointments\Entity\NaivePeriod;
use MediaWiki\Extension\Appointments\Store\AppointmentStore;
use MediaWiki\Extension\Appointments\UserInterface;
use MediaWiki\Extension\Appointments\Utils\AppointmentSerializer;
use MediaWiki\Parser\Parser;
use MediaWiki\Parser\PPFrame;
use MediaWiki\User\UserFactory;
use MediaWiki\User\UserIdentity;
use MWStake\MediaWiki\Component\GenericTagHandler\ITagHandler;

class AppointmentTimelineTagHandler implements ITagHandler {

	/**
	 * @var string[]
	 */
	private $viewMap = [
		'week' => 'listWeek',
		'month' => 'listMonth',
		'year' => 'listYear'
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
	}

	/**
	 * @inheritDoc
	 */
	public function getRenderedContent( string $input, array $params, Parser $parser, PPFrame $frame ): string {
		$query = $this->appointmentStore->newQuery();
		if ( $params['user'] ) {
			$query->forUser( $params['user'] );
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

		$view = $this->viewMap[ $params['period'] ?? 'week' ] ?? 'week';

		$appointments = $query->execute();
		$user = $this->userFactory->newFromUserIdentity( $parser->getUserIdentity() );

		return Html::element( 'div', [
			'class' => 'appointment-timeline-tag ext-appointments-scheduler-calendar-cnt',
			'data-appointments' => json_encode( array_map( function( Appointment $appointment ) use ( $user ) {
				return $this->serializer->serializeForOutput( $appointment, $user );
			}, $appointments ) ),
			'data-view' => $view,
		], '' );
	}

	private function getPeriod( array $params, UserIdentity $user ): ?NaivePeriod {
		$now = new DateTime('now', new DateTimeZone('UTC'));
		$start = $this->userInterface->convertDateTimeForUser( $now, $user );

		$end = clone ( $start );
		$period = $params['period'] ?? 'week';
		switch ( $period ) {
			case 'week':
				$end->modify( '+1 week' );
				break;
			case 'month':
				$end->modify( '+1 month' );
				break;
			case 'year':
				$end->modify( '+1 year' );
				break;
			default:
				return null;
		}
		return new NaivePeriod( $start, $end );
	}
}
