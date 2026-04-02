<?php

namespace MediaWiki\Extension\Appointments\Entity;

readonly class Participant {

	/**
	 * @param string $key
	 * @param string $value
	 */
	public function __construct(
		private string $key,
		private string $value
	) {
	}

	/**
	 * @return string
	 */
	public function getKey(): string {
		return $this->key;
	}

	/**
	 * @return string
	 */
	public function getValue(): string {
		return $this->value;
	}
}
