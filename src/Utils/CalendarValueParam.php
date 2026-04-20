<?php

namespace MediaWiki\Extension\Appointments\Utils;

use MediaWiki\Extension\Appointments\Store\CalendarStore;
use MWStake\MediaWiki\Component\InputProcessor\Processor\StringValue;
use StatusValue;

class CalendarValueParam extends StringValue {

	/**
	 * @param CalendarStore $calendarStore
	 */
	public function __construct(
		private readonly CalendarStore $calendarStore
	) {
	}

	/**
	 * @inheritDoc
	 */
	public function process( mixed $value, string $fieldKey ): StatusValue {
		$parentStatus = parent::process( $value, $fieldKey );
		if ( !$parentStatus->isGood() ) {
			return $parentStatus;
		}
		if ( !$this->isRequired() && $value === null ) {
			return StatusValue::newGood( $this->getDefaultValue() );
		}
		$value = $parentStatus->getValue();
		$calendar = $this->calendarStore->getCalendarByName( $value );
		if ( !$calendar ) {
			return StatusValue::newFatal( 'appointments-param-validation-calendar', $fieldKey, $value );
		}

		return StatusValue::newGood( $calendar );
	}

	/**
	 * @return mixed
	 */
	public function jsonSerialize(): mixed {
		return array_merge( parent::jsonSerialize(), [
			'type' => 'calendar'
		] );
	}
}
