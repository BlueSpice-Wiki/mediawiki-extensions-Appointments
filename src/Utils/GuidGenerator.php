<?php

namespace MediaWiki\Extension\Appointments\Utils;

readonly final class GuidGenerator {

	/**
	 * @param string $wikiId
	 */
	public function __construct( private string $wikiId ) {
	}

	/**
	 * @return string
	 */
	public function generateAppointmentGuid(): string {
		return md5( $this->wikiId . '-' . microtime( true ) . '-' . rand() );
	}

	/**
	 * @return string
	 */
	public function generateCalendarGuid(): string {
		return md5( uniqid( $this->wikiId . '-' ) );
	}

	/**
	 * @param string $name
	 * @return string
	 */
	public function generateEventTypeGuid( string $name ): string {
		return md5( uniqid( $this->wikiId . '-' . $name . '-' ) );
	}
}
