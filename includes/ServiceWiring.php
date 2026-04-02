<?php

use MediaWiki\Extension\Appointments\UserInterface;
use MediaWiki\Extension\Appointments\Utils\ParticipantResolver;
use MediaWiki\MediaWikiServices;

return [
	'Appointments._UserInterface' => static function ( MediaWikiServices $services ) {
		return new UserInterface(
			$services->getLanguageFactory(),
			$services->getContentLanguage(),
			$services->getUserOptionsLookup(),
			$services->getMainConfig()
		);
	},
	'Appointments._ParticipantResolver' => static function ( MediaWikiServices $services ) {
		return new ParticipantResolver(
			$services->getDBLoadBalancer(),
			$services->getUserFactory()
		);
	},
];
