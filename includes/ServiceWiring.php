<?php

use MediaWiki\Extension\Appointments\Store\AppointmentStore;
use MediaWiki\Extension\Appointments\Store\CalendarStore;
use MediaWiki\Extension\Appointments\Store\ParticipantStore;
use MediaWiki\Extension\Appointments\UserInterface;
use MediaWiki\Extension\Appointments\Utils\ParticipantResolver;
use MediaWiki\Extension\Appointments\Utils\Permissions;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;

return [
	'Appointments.AppointmentStore' => static function ( MediaWikiServices $services ) {
		return new AppointmentStore(
			$services->getDBLoadBalancer(),
			$services->getService( 'Appointments.ParticipantStore' ),
			$services->getService( 'Appointments.CalendarStore' ),
			$services->getUserFactory()
		);
	},
	'Appointments.CalendarStore' => static function ( MediaWikiServices $services ) {
		return new CalendarStore(
			$services->getDBLoadBalancer(),
			$services->getUserFactory()
		);
	},
	'Appointments.ParticipantStore' => static function ( MediaWikiServices $services ) {
		return new ParticipantStore( $services->getDBLoadBalancer() );
	},
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
	'Appointments._Permissions' => static function ( MediaWikiServices $services ) {
		return new Permissions( $services->getPermissionManager() );
	},
	'Appointments._Logger' => static function ( MediaWikiServices $services ) {
		return LoggerFactory::getInstance( 'Appointments' );
	},
];
