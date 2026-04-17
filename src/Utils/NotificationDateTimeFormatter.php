<?php

namespace MediaWiki\Extension\Appointments\Utils;

use MediaWiki\Extension\Appointments\Entity\Appointment;
use MediaWiki\Language\Language;

readonly class NotificationDateTimeFormatter {

	/**
	 * @param Language $contentLanguage
	 */
	public function __construct( private Language $contentLanguage ) {
	}

	/**
	 * @param Appointment $appointment
	 * @return string
	 */
	public function getTimeString( Appointment $appointment ): string {
		// Format period to a string
		$period = $appointment->periodDefinition;
		if ( $period->isAllDay() ) {
			$start = $this->contentLanguage->date( $period->getStart()->format( 'YmdHis' ) );
			if ( $period->isMultiDay() ) {
				$end = $this->contentLanguage->date( $period->getEnd()->format( 'YmdHis' ) );
				return "$start - $end";
			}
			return $start;
		}
		$date = $this->contentLanguage->date( $period->getStart()->format( 'YmdHis' ) );
		$timeStart = $period->getStart()->format( 'H:i' );
		$timeEnd = $period->getEnd()->format( 'H:i' );

		return "$date, $timeStart - $timeEnd";
	}
}