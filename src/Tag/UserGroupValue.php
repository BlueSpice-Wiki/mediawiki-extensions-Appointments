<?php

namespace MediaWiki\Extension\Appointments\Tag;

use JsonException;
use MediaWiki\User\UserFactory;
use MWStake\MediaWiki\Component\InputProcessor\Processor\StringValue;
use StatusValue;

class UserGroupValue extends StringValue {

	public function __construct( private readonly UserFactory $userFactory ) {
	}

	/**
	 * @param mixed $value
	 * @param string $fieldKey
	 * @return StatusValue
	 */
	public function process( mixed $value, string $fieldKey ): StatusValue {
		try {
			$decoded = json_decode( $value, true, 512, JSON_THROW_ON_ERROR );
		} catch ( JsonException ) {
			return StatusValue::newFatal( 'appointments-param-validation-user-group', $fieldKey, $value );
		}
		$res = [];
		foreach ( $decoded as $item ) {
			if ( !isset( $item['type'] ) || !isset( $item['key'] ) ) {
				return StatusValue::newFatal( 'appointments-param-validation-user-group', $fieldKey, $value );
			}
			if ( $item['type'] !== 'user' && $item['type'] !== 'group' ) {
				return StatusValue::newFatal( 'appointments-param-validation-user-group', $fieldKey, $value );
			}
			if ( $item['type'] === 'user' ) {
				$userObject = $this->userFactory->newFromName( $item['key'] );
				if ( $userObject && $userObject->isRegistered() ) {
					$res[] = [
						'type' => 'user',
						'key' => $userObject
					];
				}
			} else {
				$res[] = $item;
			}
		}
		return StatusValue::newGood( $res );
	}
}
