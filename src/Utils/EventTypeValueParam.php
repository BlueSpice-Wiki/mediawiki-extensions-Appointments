<?php

namespace MediaWiki\Extension\Appointments\Utils;

use MediaWiki\Extension\Appointments\Store\EventTypeStore;
use MWStake\MediaWiki\Component\InputProcessor\Processor\StringValue;
use StatusValue;

class EventTypeValueParam extends StringValue {

	/**
	 * @param EventTypeStore $eventTypeStore
	 */
	public function __construct(
		private EventTypeStore $eventTypeStore
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
		$eventType = $this->eventTypeStore->getEventTypes();
		foreach ( $eventType as $type ) {
			if ( $type->getName() === $value ) {
				return StatusValue::newGood( $type );
			}
		}
		return StatusValue::newFatal( 'appointments-param-validation-event-type', $fieldKey, $value );
	}

	/**
	 * @return mixed
	 */
	public function jsonSerialize(): mixed {
		return array_merge( parent::jsonSerialize(), [
			'type' => 'event_type'
		] );
	}
}
