<?php

namespace MediaWiki\Extension\Appointments\Entity;

use MediaWiki\User\UserIdentity;

readonly class Calendar {

	/**
	 * @param string $guid
	 * @param string $name
	 * @param string $description
	 * @param UserIdentity $creator
	 * @param string $wikiId
	 */
	public function __construct(
		public string $guid,
		public string $name,
		public string $description,
		public UserIdentity $creator,
		public string $wikiId
	) {
	}
}