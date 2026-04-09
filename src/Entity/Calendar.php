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
	 * @param array $data
	 */
	public function __construct(
		public string $guid,
		public string $name,
		public string $description,
		public UserIdentity $creator,
		public string $wikiId,
		public array $data = []
	) {
	}

	public function jsonSerialize(): array {
		return [
			'guid' => $this->guid,
			'name' => $this->name,
			'description' => $this->description,
			'creator' => $this->creator->getName(),
			'wikiId' => $this->wikiId,
			'data' => $this->data
		];
	}
}