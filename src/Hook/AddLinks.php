<?php

namespace MediaWiki\Extension\Appointments\Hook;

use Config;
use MediaWiki\Extension\Appointments\Utils\OverviewActionEntryPoint;
use MediaWiki\Hook\SkinTemplateNavigation__UniversalHook;
use MediaWiki\SpecialPage\SpecialPageFactory;
use MWStake\MediaWiki\Component\CommonUserInterface\Hook\MWStakeCommonUIRegisterSkinSlotComponents;

readonly class AddLinks implements
	MWStakeCommonUIRegisterSkinSlotComponents,
	SkinTemplateNavigation__UniversalHook
{

	/**
	 * @param SpecialPageFactory $spf
	 * @param Config $config
	 */
	public function __construct(
		private SpecialPageFactory $spf, private Config $config
	) {
	}

	/**
	 * @inheritDoc
	 */
	public function onMWStakeCommonUIRegisterSkinSlotComponents( $registry ): void {
		if ( $this->config->get( 'AppointmentsShowInMainLinks' ) ) {
			$registry->register(
				'MainLinksPanel',
				[
					'appointments-overview' => [
						'factory' => function () {
							return new OverviewActionEntryPoint( $this->spf );
						},
						'position' => 30
					]
				]
			);
		}
	}

	/**
	 * @inheritDoc
	 */
	public function onSkinTemplateNavigation__Universal( $skinTemplate, &$links ): void {
		$user = $skinTemplate->getUser();
		$overviewSpecial = $this->spf->getPage( 'Appointments' );
		$links['user-menu']['appointments_myappointments'] = [
			'id' => 'pt-appointments_myappointments',
			'href' => $overviewSpecial->getPageTitle( $user->getName() )->getLocalURL(),
			'text' => $skinTemplate->msg( 'appointments-action-link-my-appointments' )->plain(),
			'position' => 50,
		];
	}
}
