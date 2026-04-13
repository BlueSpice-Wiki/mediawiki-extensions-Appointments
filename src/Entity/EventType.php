<?php

namespace MediaWiki\Extension\Appointments\Entity;

use MediaWiki\User\UserIdentity;

readonly class EventType implements \JsonSerializable {

	/**
	 * @param string $guid
	 * @param string $name
	 * @param string $description
	 * @param bool $isSystem
	 * @param UserIdentity $creator
	 * @param array $data
	 */
	public function __construct(
		public string $guid,
		public string $name,
		public string $description,
		public bool $isSystem,
		public UserIdentity $creator,
		public array $data = []
	) {
	}

	public function jsonSerialize(): array {
		return [
			'guid' => $this->guid,
			'name' => $this->name,
			'description' => $this->description,
			'data' => $this->data,
			'system' => $this->isSystem
		];
	}

	/**
	 * @return bool
	 */
	public function isSystem(): bool {
		return $this->isSystem;
	}
}