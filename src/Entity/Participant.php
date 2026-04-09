<?php

namespace MediaWiki\Extension\Appointments\Entity;

readonly class Participant implements \JsonSerializable {

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

	public function jsonSerialize(): array {
		return [
			'key' => $this->key,
			'value' => $this->value
		];
	}
}
