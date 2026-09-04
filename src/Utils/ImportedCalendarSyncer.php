<?php

namespace MediaWiki\Extension\Appointments\Utils;

use MediaWiki\Extension\Appointments\Entity\CalendarImported;
use MediaWiki\Extension\Appointments\Store\AppointmentStore;
use MediaWiki\Extension\Appointments\Store\CalendarStore;
use MediaWiki\Extension\Appointments\Store\EventTypeStore;
use MediaWiki\Extension\Appointments\Store\ParticipantStore;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\User\UserFactory;
use Psr\Log\LoggerInterface;
use RuntimeException;
use Wikimedia\Rdbms\ILoadBalancer;

class ImportedCalendarSyncer {

	/** @var int Minimal time, in seconds, between two syncs of the same calendar */
	private const SYNC_INTERVAL = 60 * 60 * 24;

	/** @var int Timeout, in seconds, for the whole ICS request */
	private const TIMEOUT = 20;

	/** @var int Timeout, in seconds, for establishing the connection */
	private const CONNECT_TIMEOUT = 5;

	/** @var int Maximum accepted size of the ICS payload, in bytes */
	private const MAX_SIZE = 10 * 1024 * 1024;

	/**
	 * @param HttpRequestFactory $httpRequestFactory
	 * @param LoggerInterface $logger
	 * @param ILoadBalancer $loadBalancer
	 * @param ParticipantStore $participantStore
	 * @param UserFactory $userFactory
	 * @param EventTypeStore $eventTypeStore
	 */
	public function __construct(
		private readonly HttpRequestFactory $httpRequestFactory,
		private readonly LoggerInterface $logger,
		private readonly ILoadBalancer $loadBalancer,
		private readonly ParticipantStore $participantStore,
		private readonly UserFactory $userFactory,
		private readonly EventTypeStore $eventTypeStore
	) {
	}

	/**
	 * @param CalendarImported $calendar
	 * @param CalendarStore $calendarStore
	 * @return bool Whether the calendar has been synced
	 */
	public function syncCalendar( CalendarImported $calendar, CalendarStore $calendarStore ): bool {
		$lastSync = $calendar->data['lastSync'] ?? 0;
		if ( time() - $lastSync < static::SYNC_INTERVAL ) {
			return false;
		}

		$ics = $this->retrieveIcsData( $calendar );
		$this->logger->info( 'Retrieved ICS data for calendar {guid}: {bytes} bytes', [
			'guid' => $calendar->guid,
			'bytes' => strlen( $ics ),
		] );
		$converter = new ICSToAppointments();
		$appointments = $converter->convert( $ics, $calendar );

		$appointmentStore = new AppointmentStore(
			$this->loadBalancer,
			$this->participantStore,
			$calendarStore,
			$this->userFactory,
			$this->eventTypeStore
		);
		$appointmentStore->deleteForCalendar( $calendar );
		foreach ( $appointments as $appointment ) {
			$appointmentStore->storeAppointment( $appointment );
		}
		return true;
	}

	/**
	 * Retrieve raw ICS data of an imported calendar.
	 *
	 * @param CalendarImported $calendar
	 * @return string
	 * @throws RuntimeException
	 */
	public function retrieveIcsData( CalendarImported $calendar ): string {
		if ( ( $calendar->data['type'] ?? '' ) !== 'ics' ) {
			throw new RuntimeException( "Calendar {$calendar->guid} is not of a supported import type" );
		}
		$url = $calendar->data['url'] ?? '';
		if ( !$url ) {
			throw new RuntimeException( "Calendar {$calendar->guid} has no source URL" );
		}

		return $this->retrieveIcsDataFromUrl( $url );
	}

	/**
	 * Retrieve raw ICS data from a given URL.
	 *
	 * @param string $url
	 * @return string
	 * @throws RuntimeException
	 */
	public function retrieveIcsDataFromUrl( string $url ): string {
		$url = $this->normalizeUrl( $url );

		$request = $this->httpRequestFactory->create( $url, [
			'method' => 'GET',
			'timeout' => static::TIMEOUT,
			'connectTimeout' => static::CONNECT_TIMEOUT,
			'followRedirects' => true,
		], __METHOD__ );
		$request->setHeader( 'Accept', 'text/calendar, text/plain;q=0.9, */*;q=0.8' );

		$content = '';
		$exceededMaxSize = false;
		$request->setCallback( static function ( $resource, $buffer ) use ( &$content, &$exceededMaxSize ) {
			$length = strlen( $buffer );
			if ( !$exceededMaxSize ) {
				if ( strlen( $content ) + $length > self::MAX_SIZE ) {
					$exceededMaxSize = true;
				} else {
					$content .= $buffer;
				}
			}
			// Must always report the full length, otherwise the transfer is aborted as failed
			return $length;
		} );

		$status = $request->execute();
		if ( !$status->isOK() ) {
			$this->logger->error( 'Failed to retrieve ICS data from {url}: {error}', [
				'url' => $url,
				'error' => (string)$status,
			] );
			throw new RuntimeException( "Failed to retrieve ICS data from $url" );
		}
		if ( $exceededMaxSize ) {
			throw new RuntimeException( "ICS data from $url exceeds the maximum allowed size" );
		}

		$content = $this->stripByteOrderMark( $content );
		if ( !str_contains( $content, 'BEGIN:VCALENDAR' ) ) {
			throw new RuntimeException( "Data retrieved from $url is not a valid ICS feed" );
		}

		return $content;
	}

	/**
	 * Providers like Outlook hand out "webcal://" links, which are plain HTTP(S) resources.
	 *
	 * @param string $url
	 * @return string
	 * @throws RuntimeException
	 */
	private function normalizeUrl( string $url ): string {
		$url = trim( $url );
		if ( str_starts_with( strtolower( $url ), 'webcal://' ) ) {
			$url = 'https://' . substr( $url, strlen( 'webcal://' ) );
		}

		$scheme = strtolower( (string)parse_url( $url, PHP_URL_SCHEME ) );
		if ( !in_array( $scheme, [ 'http', 'https' ], true ) ) {
			throw new RuntimeException( "Unsupported URL scheme for ICS source: $url" );
		}

		return $url;
	}

	/**
	 * @param string $content
	 * @return string
	 */
	private function stripByteOrderMark( string $content ): string {
		if ( str_starts_with( $content, "\xEF\xBB\xBF" ) ) {
			return substr( $content, 3 );
		}
		return $content;
	}
}
