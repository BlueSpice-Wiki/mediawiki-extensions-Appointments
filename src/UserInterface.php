<?php

namespace MediaWiki\Extension\Appointments;

use DateTime;
use DateTimeZone;
use MediaWiki\Language\Language;
use MediaWiki\Languages\LanguageFactory;
use MediaWiki\MainConfigNames;
use MediaWiki\User\User;
use MediaWiki\User\UserIdentity;
use MediaWiki\User\UserOptionsLookup;
use MediaWiki\User\UserTimeCorrection;

/**
 * Purpose of this class is to convert times between user specific timezones and UTC which is what backend operates on
 */
class UserInterface {

	public function __construct(
		private readonly LanguageFactory $languageFactory,
		private readonly Language $contentLanguage,
		private readonly UserOptionsLookup $userOptionsLookup,
		private readonly \Config $mainConfig
	) {
	}

	/**
	 * @param string $date
	 * @param string $time
	 * @param UserIdentity $user
	 * @return DateTime
	 * @throws \Exception
	 */
	public function convertUserInputToUTC( string $date, string $time, UserIdentity $user ): DateTime {
		$userTZ = $this->getUserTimezone( $user );
		$dateTimeStr = $date . ' ' . $time;

		$dateTime = new DateTime( $dateTimeStr, $userTZ ?: new DateTimeZone( 'UTC' ) );
		$dateTime->setTimezone( new DateTimeZone( 'UTC' ) );

		return $dateTime;
	}

	/**
	 * @param DateTime $utcTime
	 * @param UserIdentity $user
	 * @return DateTime
	 */
	public function convertDateTimeForUser( DateTime $utcTime, UserIdentity $user ) {
		$userTime = clone $utcTime;
		$userTZ = $this->getUserTimezone( $user );
		if ( $userTZ ) {
			$userTime->setTimezone( $userTZ );
		}
		return $userTime;
	}

	/**
	 * @param DateTime $time
	 * @param UserIdentity $user
	 * @return array [ 'time' => string, 'date' => string, 'dateTime' => string ]
	 */
	public function formatDateTimeForUser( DateTime $time, UserIdentity $user ): array {
		$lang = $this->getUserLanguage( $user );
		return [
			'time' => $lang->userTime( $time->format( 'YmdHis' ), $user, [ 'timecorrection' => true ] ),
			'date' => $lang->userDate( $time->format( 'YmdHis' ), $user, [ 'timecorrection' => true ] ),
			'dateTime' => $lang->userTimeAndDate( $time->format( 'YmdHis' ), $user, [ 'timecorrection' => true ] )
		];
	}

	/**
	 * @param UserIdentity $user
	 * @return DateTimeZone|null
	 */
	private function getUserTimezone( UserIdentity $user ): ?DateTimeZone {
		$localTZoffset = $this->mainConfig->get( MainConfigNames::LocalTZoffset );
		$tz = $this->userOptionsLookup->getOption( $user, 'timecorrection' );
		$timeCorrection = new UserTimeCorrection( (string)$tz, null, $localTZoffset );
		return $timeCorrection->getTimeZone();
	}

	/**
	 * @param UserIdentity $user
	 * @return Language
	 */
	private function getUserLanguage( UserIdentity $user ): Language {
		$userLangCode = $this->userOptionsLookup->getOption( $user, 'language' );
		if ( $userLangCode ) {
			try {
				return $this->languageFactory->getLanguage( $userLangCode );
			} catch ( \InvalidArgumentException $ex ) {
				return $this->contentLanguage;
			}
		}
		return $this->contentLanguage;
	}

	/**
	 * @param Entity\PeriodDefinition $periodDefinition
	 * @param User|null $user
	 * @return array
	 */
	public function serializePeriodDefinition( Entity\PeriodDefinition $periodDefinition, ?User $user = null ): array {
		$start = $periodDefinition->getStart();
		$end = $periodDefinition->getEnd();
		if ( $user ) {
			$start = $this->convertDateTimeForUser( $start, $user );
			$end = $this->convertDateTimeForUser( $end, $user );

		}
		return [
			'startDate' => $start->format( 'Y-m-d' ),
			'startTime' => $start->format( 'H:i' ),
			'endDate' => $end->format( 'Y-m-d' ),
			'endTime' => $end->format( 'H:i' ),
			'isAllDay' => $periodDefinition->isAllDay(),
			'recurrenceRule' => $periodDefinition->getRecurrenceRule()?->getRule() ?? null,
			'tz' => $start->getTimezone() ? $start->getTimezone()->getName() : null,
		];
	}

	/**
	 * @param Entity\PeriodDefinition $periodDefinition
	 * @param User $user
	 * @return array
	 */
	public function serializePeriodDefinitionForUser( Entity\PeriodDefinition $periodDefinition, User $user ): array {
		$userFormattedStart = $this->formatDateTimeForUser( $periodDefinition->getStart(), $user );
		$userFormattedEnd = $this->formatDateTimeForUser( $periodDefinition->getEnd(), $user );

		return [
			'startDate' => $userFormattedStart['date'],
			'startTime' => $userFormattedStart['time'],
			'endDate' => $userFormattedEnd['date'],
			'endTime' => $userFormattedEnd['time'],
			'isAllDay' => $periodDefinition->isAllDay(),
			'recurrenceRule' => $periodDefinition->getRecurrenceRule()?->getRule() ?? null
		];
	}

}