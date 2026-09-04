<?php

namespace MediaWiki\Extension\Appointments\Entity;

class CalendarImported extends Calendar implements \JsonSerializable {

	/**
	 * @return void
	 */
	public function recordSync(): void {
		$this->data['lastSync'] = time();
	}

	/**
	 * @return void
	 */
	public function clearSync(): void {
		unset( $this->data['lastSync'] );
	}

	/**
	 * @return array
	 */
	public function jsonSerialize(): array {
		$data = $this->data;
		unset( $data['imported'] );
		unset( $data['url'] );
		return parent::jsonSerialize() + [
			'imported' => true,
			'data' => $data,
		];
	}
}
