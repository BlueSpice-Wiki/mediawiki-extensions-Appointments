<?php

namespace MediaWiki\Extension\Appointments\Utils;

use DateInterval;
use DateTime;
use DateTimeZone;
use Exception;
use MediaWiki\Extension\Appointments\Entity\Appointment;
use MediaWiki\Extension\Appointments\Entity\CalendarImported;
use MediaWiki\Extension\Appointments\Entity\EventType;
use MediaWiki\Extension\Appointments\Entity\PeriodDefinition;
use MediaWiki\Message\Message;
use RuntimeException;

/**
 * Converts raw ICS (RFC 5545) data into Appointment entities of a given imported calendar.
 */
class ICSToAppointments {

	/** @var int Length of the app_title column */
	private const MAX_TITLE_LENGTH = 255;

	/** @var string[] Properties holding a video conference link, in order of preference */
	private const VIDEO_LINK_PROPERTIES = [
		'X-MICROSOFT-SKYPETEAMSMEETINGURL',
		'X-GOOGLE-CONFERENCE',
		'CONFERENCE',
	];

	/**
	 * Windows timezone identifiers used by Outlook, which PHP does not understand
	 * @var array<string,string>
	 */
	private const WINDOWS_TIMEZONES = [
		'UTC' => 'UTC',
		'GMT STANDARD TIME' => 'Europe/London',
		'GREENWICH STANDARD TIME' => 'Atlantic/Reykjavik',
		'W. EUROPE STANDARD TIME' => 'Europe/Berlin',
		'CENTRAL EUROPE STANDARD TIME' => 'Europe/Budapest',
		'CENTRAL EUROPEAN STANDARD TIME' => 'Europe/Warsaw',
		'ROMANCE STANDARD TIME' => 'Europe/Paris',
		'W. CENTRAL AFRICA STANDARD TIME' => 'Africa/Lagos',
		'E. EUROPE STANDARD TIME' => 'Europe/Chisinau',
		'GTB STANDARD TIME' => 'Europe/Bucharest',
		'FLE STANDARD TIME' => 'Europe/Kiev',
		'RUSSIAN STANDARD TIME' => 'Europe/Moscow',
		'TURKEY STANDARD TIME' => 'Europe/Istanbul',
		'ISRAEL STANDARD TIME' => 'Asia/Jerusalem',
		'INDIA STANDARD TIME' => 'Asia/Kolkata',
		'CHINA STANDARD TIME' => 'Asia/Shanghai',
		'TOKYO STANDARD TIME' => 'Asia/Tokyo',
		'AUS EASTERN STANDARD TIME' => 'Australia/Sydney',
		'NEW ZEALAND STANDARD TIME' => 'Pacific/Auckland',
		'EASTERN STANDARD TIME' => 'America/New_York',
		'CENTRAL STANDARD TIME' => 'America/Chicago',
		'MOUNTAIN STANDARD TIME' => 'America/Denver',
		'PACIFIC STANDARD TIME' => 'America/Los_Angeles',
		'ALASKAN STANDARD TIME' => 'America/Anchorage',
		'HAWAIIAN STANDARD TIME' => 'Pacific/Honolulu',
		'SA EASTERN STANDARD TIME' => 'America/Sao_Paulo',
	];

	/** @var array[] Events that could not be converted, with the reason */
	private array $skipped = [];

	/**
	 * @param EventType|null $eventType Event type to assign to the imported appointments
	 */
	public function __construct( private ?EventType $eventType = null ) {
	}

	/**
	 * @param string $ics Raw ICS data
	 * @param CalendarImported $calendar Calendar the appointments belong to
	 * @return Appointment[]
	 */
	public function convert( string $ics, CalendarImported $calendar ): array {
		$this->skipped = [];
		$appointments = [];

		foreach ( $this->extractEvents( $ics ) as $event ) {
			try {
				$appointment = $this->eventToAppointment( $event, $calendar );
			} catch ( Exception $e ) {
				$this->skipped[] = [
					'uid' => (string)$this->getValue( $event, 'UID' ),
					'reason' => $e->getMessage(),
				];
				continue;
			}
			if ( $appointment ) {
				// Keyed by GUID, so that duplicates within the same feed collapse
				$appointments[$appointment->guid] = $appointment;
			}
		}

		return array_values( $appointments );
	}

	/**
	 * Events of the last conversion that could not be converted
	 *
	 * @return array[] List of [ 'uid' => string, 'reason' => string ]
	 */
	public function getSkipped(): array {
		return $this->skipped;
	}

	/**
	 * Split raw ICS data into VEVENT components, each being a map of property name to occurrences
	 *
	 * @param string $ics
	 * @return array[]
	 */
	private function extractEvents( string $ics ): array {
		$events = [];
		$current = null;
		$nestingLevel = 0;

		foreach ( $this->unfold( $ics ) as $line ) {
			$line = trim( $line );
			if ( $line === '' ) {
				continue;
			}
			$upperLine = strtoupper( $line );

			if ( $current === null ) {
				if ( $upperLine === 'BEGIN:VEVENT' ) {
					$current = [];
					$nestingLevel = 0;
				}
				continue;
			}
			if ( $nestingLevel > 0 ) {
				// Inside a sub-component (VALARM), whose properties must not leak into the event
				if ( str_starts_with( $upperLine, 'BEGIN:' ) ) {
					$nestingLevel++;
				} elseif ( str_starts_with( $upperLine, 'END:' ) ) {
					$nestingLevel--;
				}
				continue;
			}
			if ( $upperLine === 'END:VEVENT' ) {
				$events[] = $current;
				$current = null;
				continue;
			}
			if ( str_starts_with( $upperLine, 'BEGIN:' ) ) {
				$nestingLevel++;
				continue;
			}

			$property = $this->parseProperty( $line );
			if ( $property ) {
				$current[$property['name']][] = $property;
			}
		}

		return $events;
	}

	/**
	 * Undo RFC 5545 line folding and normalize line endings
	 *
	 * @param string $ics
	 * @return string[]
	 */
	private function unfold( string $ics ): array {
		$ics = str_replace( [ "\r\n", "\r" ], "\n", $ics );
		$ics = preg_replace( "/\n[ \t]/", '', $ics );
		return explode( "\n", $ics );
	}

	/**
	 * @param string $line
	 * @return array|null [ 'name' => string, 'params' => array, 'value' => string ]
	 */
	private function parseProperty( string $line ): ?array {
		$colon = $this->findUnquoted( $line, ':' );
		if ( $colon === null ) {
			return null;
		}
		$segments = $this->splitUnquoted( substr( $line, 0, $colon ), ';' );
		$name = strtoupper( trim( (string)array_shift( $segments ) ) );
		if ( $name === '' ) {
			return null;
		}

		$params = [];
		foreach ( $segments as $segment ) {
			$separator = strpos( $segment, '=' );
			if ( $separator === false ) {
				continue;
			}
			$paramName = strtoupper( trim( substr( $segment, 0, $separator ) ) );
			$params[$paramName] = trim( substr( $segment, $separator + 1 ), " \t\"" );
		}

		return [
			'name' => $name,
			'params' => $params,
			'value' => substr( $line, $colon + 1 ),
		];
	}

	/**
	 * @param array $event
	 * @param CalendarImported $calendar
	 * @return Appointment|null Null if the event is not to be imported
	 * @throws RuntimeException
	 */
	private function eventToAppointment( array $event, CalendarImported $calendar ): ?Appointment {
		if ( strtoupper( (string)$this->getValue( $event, 'STATUS' ) ) === 'CANCELLED' ) {
			return null;
		}
		$uid = trim( (string)$this->getValue( $event, 'UID' ) );
		if ( $uid === '' ) {
			throw new RuntimeException( 'Event has no UID' );
		}
		$startProperty = $this->getProperty( $event, 'DTSTART' );
		if ( !$startProperty ) {
			throw new RuntimeException( 'Event has no DTSTART' );
		}

		[ $start, $isAllDay ] = $this->parseDateTimeProperty( $startProperty );
		$end = $this->resolveEnd( $event, $start, $isAllDay );
		if ( !$isAllDay && $start->format( 'Y-m-d' ) !== $end->format( 'Y-m-d' ) ) {
			// The data model can only express multi-day events as all-day events
			$isAllDay = true;
		}

		$periodDefinition = $this->buildPeriodDefinition(
			$start, $end, $isAllDay, $this->parseRecurrence( $event )
		);
		$recurrenceId = trim( (string)$this->getValue( $event, 'RECURRENCE-ID' ) );

		return new Appointment(
			guid: $this->buildGuid( $calendar, $uid, $recurrenceId ),
			title: $this->buildTitle( $event ),
			eventType: $this->getEventType(),
			participants: [],
			calendar: $calendar,
			periodDefinition: $periodDefinition,
			creator: $calendar->creator,
			data: $this->buildData( $event, $uid, $recurrenceId )
		);
	}

	/**
	 * Appointment GUIDs are limited to 32 characters, while ICS UIDs are of arbitrary length.
	 * Hashing keeps the GUID stable across syncs, so that events get updated instead of duplicated.
	 *
	 * @param CalendarImported $calendar
	 * @param string $uid
	 * @param string $recurrenceId
	 * @return string
	 */
	private function buildGuid( CalendarImported $calendar, string $uid, string $recurrenceId ): string {
		return md5( $calendar->guid . '|' . $uid . '|' . $recurrenceId );
	}

	/**
	 * @param array $event
	 * @return string
	 */
	private function buildTitle( array $event ): string {
		$title = trim( (string)preg_replace( '/\s+/u', ' ', $this->getText( $event, 'SUMMARY' ) ) );
		if ( $title === '' ) {
			$title = Message::newFromKey( 'appointments-imported-appointment-untitled' )->text();
		}
		return mb_substr( $title, 0, static::MAX_TITLE_LENGTH );
	}

	/**
	 * @param array $event
	 * @param string $uid
	 * @param string $recurrenceId
	 * @return array
	 */
	private function buildData( array $event, string $uid, string $recurrenceId ): array {
		$external = [
			'source' => 'ics',
			'uid' => $uid,
		];
		if ( $recurrenceId !== '' ) {
			$external['recurrenceId'] = $recurrenceId;
		}
		$sequence = $this->getValue( $event, 'SEQUENCE' );
		if ( $sequence !== null ) {
			$external['sequence'] = (int)$sequence;
		}
		$lastModified = $this->getValue( $event, 'LAST-MODIFIED' );
		if ( $lastModified !== null ) {
			$external['lastModified'] = $lastModified;
		}
		$organizer = $this->stripMailto( (string)$this->getValue( $event, 'ORGANIZER' ) );
		if ( $organizer !== '' ) {
			$external['organizer'] = $organizer;
		}
		$attendees = $this->getAttendees( $event );
		if ( $attendees ) {
			$external['attendees'] = $attendees;
		}

		$data = [
			'agendaPage' => null,
			'external' => $external,
		];
		$location = $this->getText( $event, 'LOCATION' );
		if ( $location !== '' ) {
			$data['location'] = $location;
		}
		$description = $this->getText( $event, 'DESCRIPTION' );
		if ( $description !== '' ) {
			$data['description'] = $description;
		}
		$videoLink = $this->getVideoLink( $event );
		if ( $videoLink !== '' ) {
			$data['videoLink'] = $videoLink;
		}

		return $data;
	}

	/**
	 * Recurrence rules that the data model cannot express are dropped, so that at least
	 * the first occurrence of the event gets imported.
	 *
	 * @param DateTime $start
	 * @param DateTime $end
	 * @param bool $isAllDay
	 * @param RecurrenceRule|null $recurrenceRule
	 * @return PeriodDefinition
	 */
	private function buildPeriodDefinition(
		DateTime $start, DateTime $end, bool $isAllDay, ?RecurrenceRule $recurrenceRule
	): PeriodDefinition {
		try {
			return new PeriodDefinition( clone $start, clone $end, $isAllDay, $recurrenceRule );
		} catch ( Exception $e ) {
			if ( !$recurrenceRule ) {
				throw $e;
			}
		}
		return new PeriodDefinition( clone $start, clone $end, $isAllDay );
	}

	/**
	 * @param array $event
	 * @param DateTime $start
	 * @param bool $isAllDay
	 * @return DateTime
	 */
	private function resolveEnd( array $event, DateTime $start, bool $isAllDay ): DateTime {
		$endProperty = $this->getProperty( $event, 'DTEND' );
		if ( $endProperty ) {
			[ $end, $endIsDate ] = $this->parseDateTimeProperty( $endProperty );
			if ( $endIsDate ) {
				// DTEND of an all-day event is exclusive
				$end->sub( new DateInterval( 'P1D' ) );
			}
			return $end < $start ? clone $start : $end;
		}

		$duration = trim( (string)$this->getValue( $event, 'DURATION' ) );
		if ( $duration !== '' ) {
			$interval = $this->parseDuration( $duration );
			if ( $interval ) {
				$end = clone $start;
				$end->add( $interval );
				if ( $isAllDay ) {
					// Durations of all-day events are exclusive as well
					$end->sub( new DateInterval( 'P1D' ) );
				}
				return $end < $start ? clone $start : $end;
			}
		}

		return clone $start;
	}

	/**
	 * @param array $property
	 * @return array [ DateTime in UTC, bool whether it is a date-only value ]
	 * @throws RuntimeException
	 */
	private function parseDateTimeProperty( array $property ): array {
		$value = trim( $property['value'] );
		$isDate = strtoupper( $property['params']['VALUE'] ?? '' ) === 'DATE' ||
			(bool)preg_match( '/^\d{8}$/', $value );

		if ( $isDate ) {
			$date = DateTime::createFromFormat( 'Ymd', substr( $value, 0, 8 ), new DateTimeZone( 'UTC' ) );
			if ( !$date ) {
				throw new RuntimeException( "Invalid date value: $value" );
			}
			$date->setTime( 0, 0 );
			return [ $date, true ];
		}

		if ( !preg_match( '/^(\d{8}T\d{6})(Z?)$/', $value, $matches ) ) {
			throw new RuntimeException( "Invalid date-time value: $value" );
		}
		$timezone = $matches[2] === 'Z' ?
			new DateTimeZone( 'UTC' ) :
			$this->resolveTimezone( $property['params']['TZID'] ?? null );

		$date = DateTime::createFromFormat( 'Ymd\THis', $matches[1], $timezone );
		if ( !$date ) {
			throw new RuntimeException( "Invalid date-time value: $value" );
		}
		$date->setTimezone( new DateTimeZone( 'UTC' ) );

		return [ $date, false ];
	}

	/**
	 * @param string|null $tzid
	 * @return DateTimeZone Falls back to UTC for unknown identifiers
	 */
	private function resolveTimezone( ?string $tzid ): DateTimeZone {
		$tzid = trim( (string)$tzid );
		if ( $tzid === '' ) {
			// Floating time, treated as UTC
			return new DateTimeZone( 'UTC' );
		}
		try {
			return new DateTimeZone( $tzid );
		} catch ( Exception ) {
			// Not an IANA identifier, fall through to the Windows identifiers used by Outlook
		}

		$windowsZone = static::WINDOWS_TIMEZONES[strtoupper( $tzid )] ?? null;
		if ( $windowsZone ) {
			return new DateTimeZone( $windowsZone );
		}

		return new DateTimeZone( 'UTC' );
	}

	/**
	 * @param string $duration ISO 8601 duration, as used by the DURATION property
	 * @return DateInterval|null
	 */
	private function parseDuration( string $duration ): ?DateInterval {
		$pattern = '/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/';
		if ( !preg_match( $pattern, strtoupper( $duration ), $matches ) ) {
			return null;
		}
		if ( ( $matches[1] ?? '' ) === '-' ) {
			// Negative durations cannot describe an event end
			return null;
		}

		$days = (int)( $matches[2] ?? 0 ) * 7 + (int)( $matches[3] ?? 0 );
		return new DateInterval( sprintf(
			'P%dDT%dH%dM%dS',
			$days, (int)( $matches[4] ?? 0 ), (int)( $matches[5] ?? 0 ), (int)( $matches[6] ?? 0 )
		) );
	}

	/**
	 * @param array $event
	 * @return RecurrenceRule|null Null if the rule cannot be expressed by the data model
	 */
	private function parseRecurrence( array $event ): ?RecurrenceRule {
		$rrule = trim( (string)$this->getValue( $event, 'RRULE' ) );
		if ( $rrule === '' ) {
			return null;
		}

		$parts = [];
		foreach ( explode( ';', $rrule ) as $piece ) {
			$separator = strpos( $piece, '=' );
			if ( $separator === false ) {
				continue;
			}
			$parts[strtoupper( trim( substr( $piece, 0, $separator ) ) )] =
				trim( substr( $piece, $separator + 1 ) );
		}

		if ( (int)( $parts['INTERVAL'] ?? 1 ) > 1 ) {
			return null;
		}
		if ( isset( $parts['BYDAY'] ) && count( explode( ',', $parts['BYDAY'] ) ) > 1 ) {
			// Multiple weekdays per period cannot be expressed
			return null;
		}

		$rule = match ( strtoupper( $parts['FREQ'] ?? '' ) ) {
			'WEEKLY' => RecurrenceRule::RECURRENCE_WEEKLY,
			'MONTHLY' => RecurrenceRule::RECURRENCE_MONTHLY,
			'YEARLY' => RecurrenceRule::RECURRENCE_YEARLY,
			default => null,
		};

		return $rule ? new RecurrenceRule( $rule ) : null;
	}

	/**
	 * @param array $event
	 * @return string
	 */
	private function getVideoLink( array $event ): string {
		foreach ( static::VIDEO_LINK_PROPERTIES as $name ) {
			$value = trim( (string)$this->getValue( $event, $name ) );
			if ( $value !== '' ) {
				return $value;
			}
		}

		$haystack = $this->getText( $event, 'LOCATION' ) . "\n" . $this->getText( $event, 'DESCRIPTION' );
		$pattern = '#https://(?:teams\.microsoft\.com|teams\.live\.com|[\w.-]*zoom\.us|meet\.google\.com)/\S+#i';
		if ( preg_match( $pattern, $haystack, $matches ) ) {
			return rtrim( $matches[0], '.,;)>' );
		}

		return '';
	}

	/**
	 * @param array $event
	 * @return string[]
	 */
	private function getAttendees( array $event ): array {
		$attendees = [];
		foreach ( $event['ATTENDEE'] ?? [] as $property ) {
			$attendee = $this->stripMailto( $property['value'] );
			if ( $attendee !== '' ) {
				$attendees[] = $attendee;
			}
		}
		return array_values( array_unique( $attendees ) );
	}

	/**
	 * @param string $value
	 * @return string
	 */
	private function stripMailto( string $value ): string {
		$value = trim( $value );
		if ( str_starts_with( strtolower( $value ), 'mailto:' ) ) {
			$value = substr( $value, strlen( 'mailto:' ) );
		}
		return trim( $value );
	}

	/**
	 * @return EventType
	 */
	private function getEventType(): EventType {
		$this->eventType ??= new EventType\Imported();
		return $this->eventType;
	}

	/**
	 * @param array $event
	 * @param string $name
	 * @return array|null
	 */
	private function getProperty( array $event, string $name ): ?array {
		return $event[$name][0] ?? null;
	}

	/**
	 * @param array $event
	 * @param string $name
	 * @return string|null
	 */
	private function getValue( array $event, string $name ): ?string {
		return $event[$name][0]['value'] ?? null;
	}

	/**
	 * Value of a property of type TEXT, with escape sequences resolved
	 *
	 * @param array $event
	 * @param string $name
	 * @return string
	 */
	private function getText( array $event, string $name ): string {
		$value = $this->getValue( $event, $name );
		if ( $value === null ) {
			return '';
		}
		return trim( str_replace(
			[ '\\n', '\\N', '\\,', '\\;', '\\\\' ],
			[ "\n", "\n", ',', ';', '\\' ],
			$value
		) );
	}

	/**
	 * @param string $subject
	 * @param string $needle
	 * @return int|null Position of the first occurrence outside of double quotes
	 */
	private function findUnquoted( string $subject, string $needle ): ?int {
		$inQuotes = false;
		$length = strlen( $subject );
		for ( $i = 0; $i < $length; $i++ ) {
			if ( $subject[$i] === '"' ) {
				$inQuotes = !$inQuotes;
			} elseif ( !$inQuotes && $subject[$i] === $needle ) {
				return $i;
			}
		}
		return null;
	}

	/**
	 * @param string $subject
	 * @param string $separator
	 * @return string[]
	 */
	private function splitUnquoted( string $subject, string $separator ): array {
		$segments = [];
		$buffer = '';
		$inQuotes = false;
		$length = strlen( $subject );
		for ( $i = 0; $i < $length; $i++ ) {
			$character = $subject[$i];
			if ( $character === '"' ) {
				$inQuotes = !$inQuotes;
				$buffer .= $character;
			} elseif ( !$inQuotes && $character === $separator ) {
				$segments[] = $buffer;
				$buffer = '';
			} else {
				$buffer .= $character;
			}
		}
		$segments[] = $buffer;

		return $segments;
	}
}
