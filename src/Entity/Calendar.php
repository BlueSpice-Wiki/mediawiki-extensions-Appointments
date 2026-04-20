<?php

namespace MediaWiki\Extension\Appointments\Entity;

use MediaWiki\User\UserIdentity;

readonly class Calendar implements \JsonSerializable {

	/**
	 * @param string $guid
	 * @param string $name
	 * @param string $description
	 * @param UserIdentity $creator
	 * @param string $wikiId
	 * @param EventType[] $eventTypes
	 * @param array $data
	 */
	public function __construct(
		public string $guid,
		public string $name,
		public string $description,
		public UserIdentity $creator,
		public string $wikiId,
		public array $eventTypes = [],
		public array $data = []
	) {
	}

	public function jsonSerialize(): array {
		return [
			'guid' => $this->guid,
			'name' => $this->name,
			'description' => $this->description,
			'creator' => $this->creator->getName(),
			'eventTypes' => $this->eventTypes,
			'wikiId' => $this->wikiId,
			'data' => $this->data
		];
	}
}
