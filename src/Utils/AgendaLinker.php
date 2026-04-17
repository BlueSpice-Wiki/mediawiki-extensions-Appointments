<?php

namespace MediaWiki\Extension\Appointments\Utils;

use MediaWiki\Extension\Appointments\Entity\Appointment;
use MediaWiki\Extension\Appointments\Entity\Calendar;
use MediaWiki\Extension\Appointments\Entity\EventType;
use MediaWiki\Extension\Appointments\Entity\PeriodDefinition;
use MediaWiki\Title\Title;
use MediaWiki\Title\TitleFactory;

readonly final class AgendaLinker {

	/**
	 * @param TitleFactory $titleFactory
	 */
	public function __construct( private readonly TitleFactory $titleFactory ) {
	}

	/**
	 * @param Calendar $calendar
	 * @param EventType $eventType
	 * @param PeriodDefinition $periodDefinition
	 * @param string $appTitle
	 * @param int $iteration
	 * @return Title|null
	 */
	public function getAgendaTitle(
		Calendar $calendar, EventType $eventType,
		PeriodDefinition $periodDefinition, string $appTitle, int $iteration = 1
	): ?Title {
		$timeString = $periodDefinition->getStart()->format( 'Y-m-d' );
		if ( $periodDefinition->isMultiDay() ) {
			$timeString .= '-' . $periodDefinition->getEnd()->format( 'Y-m-d' );
		}
		$key = $calendar->name . '/' . $eventType->name . '/' . $timeString . '/' . $appTitle;
		if ( $iteration > 1 ) {
			$key .= '-' . $iteration;
		}
		$title = $this->titleFactory->newFromText( "Meeting_Minutes:$key" );
		if ( !$title ) {
			return null;
		}
		if ( $title->exists() ) {
			if ( $iteration > 10 ) {
				// Give up after 10 iterations to avoid infinite loops
				return null;
			}
			return $this->getAgendaTitle(
				$calendar, $eventType, $periodDefinition, $appTitle . '-' . $iteration, $iteration + 1
			);
		}
		return $title;
	}

	/**
	 * @param Appointment $appointment
	 * @return string
	 */
	public function getAgendaLink( Appointment $appointment ): string {
		$data = $appointment->data;
		if ( !isset( $data['agendaPage'] ) ) {
			return '';
		}
		$agendaTitle = $this->titleFactory->newFromText( $data['agendaPage'] );
		if ( !$agendaTitle || !$agendaTitle->canExist() ) {
			return '';
		}
		if ( !$agendaTitle->exists() ) {
			$preload = $this->getPreloadTemplate( $appointment );
			if ( $preload ) {
				return $agendaTitle->getLocalURL( [ 'action' => 'edit', 'preload' => $preload->getPrefixedText() ] );
			}
		}
		return $agendaTitle->getLocalURL();
	}

	/**
	 * @param Appointment $appointment
	 * @return Title|null
	 */
	private function getPreloadTemplate( Appointment $appointment ): ?Title {
		$key = $appointment->calendar->name . '/' . $appointment->eventType->name;
		return $this->titleFactory->makeTitle( NS_TEMPLATE,  $key );
	}
}