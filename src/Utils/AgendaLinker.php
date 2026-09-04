<?php

namespace MediaWiki\Extension\Appointments\Utils;

use MediaWiki\Extension\Appointments\Entity\Appointment;
use MediaWiki\Extension\Appointments\Entity\Calendar;
use MediaWiki\Extension\Appointments\Entity\EventType;
use MediaWiki\Extension\Appointments\Entity\PeriodDefinition;
use MediaWiki\HookContainer\HookContainer;
use MediaWiki\Title\Title;
use MediaWiki\Title\TitleFactory;
use MediaWiki\WikiMap\WikiMap;

final class AgendaLinker {

	/**
	 * @param TitleFactory $titleFactory
	 * @param HookContainer $hookContainer
	 */
	public function __construct(
		private readonly TitleFactory $titleFactory,
		private readonly HookContainer $hookContainer
	) {
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
		$title = $this->titleFactory->newFromText( "Minutes:$key" );
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
	 * @return array<string,bool> Page link, exists
	 */
	public function getAgendaLink( Appointment $appointment ): array {
		$data = $appointment->data;
		if ( !isset( $data['agendaPage'] ) || !$data['agendaPage'] ) {
			return [ '', false ];
		}
		$agendaPageData = $data['agendaPage'];
		if ( !is_array( $agendaPageData ) ) {
			$agendaPageData = [ 'title' => $agendaPageData, 'wiki' => WikiMap::getCurrentWikiId() ];
		}
		if ( !empty( $agendaPageData['wiki'] ) && $agendaPageData['wiki'] !== WikiMap::getCurrentWikiId() ) {
			// Interwiki
			$prefix = '';
			$this->hookContainer->run( 'GetInterwikiPrefixFromWikiId', [ $agendaPageData['wiki'], &$prefix ] );
			$agendaTitle = $this->titleFactory->newFromText( $prefix . ':' . $agendaPageData['title'] );
			$exists = true;
		} else {
			$agendaTitle = $this->titleFactory->newFromText( $agendaPageData['title'] );
			$exists = $agendaTitle->exists();
		}

		if ( !$agendaTitle ) {
			return [ '', false ];
		}
		if ( !$agendaTitle->exists() && !$agendaTitle->getInterwiki() ) {
			$preload = $this->getPreloadTemplate( $appointment );
			if ( $preload ) {
				return [
					$agendaTitle->getLocalURL( [ 'action' => 'edit', 'preload' => $preload->getPrefixedText() ] ),
					false
				];
			}
		}
		return [ $agendaTitle->getFullURL(), $exists ];
	}

	/**
	 * @param Appointment $appointment
	 * @return Title|null
	 */
	private function getPreloadTemplate( Appointment $appointment ): ?Title {
		$key = $appointment->calendar->name . '/' . $appointment->eventType->name;
		return $this->titleFactory->makeTitle( NS_TEMPLATE, $key );
	}
}
