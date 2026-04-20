<?php

namespace MediaWiki\Extension\Appointments\ContentDroplets;

use MediaWiki\Extension\ContentDroplets\Droplet\TagDroplet;
use MediaWiki\Message\Message;

class AppointmentTimelineDroplet extends TagDroplet {

	/**
	 * @inheritDoc
	 */
	public function getName(): Message {
		return Message::newFromKey( 'appointments-tag-timeline' );
	}

	/**
	 * @inheritDoc
	 */
	public function getDescription(): Message {
		return Message::newFromKey( 'appointments-tag-timeline-desc' );
	}

	/**
	 * @inheritDoc
	 */
	public function getIcon(): string {
		return 'calendar';
	}

	/**
	 * @inheritDoc
	 */
	public function getRLModules(): array {
		return [];
	}

	/**
	 * @return array
	 */
	public function getCategories(): array {
		return [ 'data' ];
	}

	/**
	 *
	 * @return string
	 */
	protected function getTagName(): string {
		return 'appointment-timeline';
	}

	/**
	 * @return array
	 */
	protected function getAttributes(): array {
		return [];
	}

	/**
	 * @return bool
	 */
	protected function hasContent(): bool {
		return false;
	}

	/**
	 * @return string|null
	 */
	public function getVeCommand(): ?string {
		return 'appointment-timelineCommand';
	}

}
