<?php

namespace MediaWiki\Extension\Appointments\Utils;

use MediaWiki\Message\Message;
use MediaWiki\SpecialPage\SpecialPageFactory;
use MWStake\MediaWiki\Component\CommonUserInterface\Component\ActionLink;

class OverviewActionEntryPoint extends ActionLink {

	/**
	 * @param SpecialPageFactory $spf
	 */
	public function __construct(
		private readonly SpecialPageFactory $spf
	) {
		parent::__construct( [] );
	}

	/**
	 *
	 * @return string
	 */
	public function getId(): string {
		return 'n-appointments-overview';
	}

	/**
	 *
	 * @return string[]
	 */
	public function getPermissions(): array {
		return [ 'read' ];
	}

	/**
	 * @return string
	 */
	public function getHref(): string {
		$sp = $this->spf->getPage( 'Appointments' );
		if ( !$sp ) {
			return '';
		}
		return $sp->getPageTitle()->getLocalURL();
	}

	/**
	 * @return Message
	 */
	public function getText(): Message {
		return Message::newFromKey( 'appointments' );
	}

	/**
	 * @return Message
	 */
	public function getTitle(): Message {
		return Message::newFromKey( 'appointments-overview-description' );
	}

	/**
	 * @return Message
	 */
	public function getAriaLabel(): Message {
		return Message::newFromKey( 'appointments' );
	}

	/**
	 * @inheritDoc
	 */
	public function showActionLabel(): bool {
		return false;
	}
}
