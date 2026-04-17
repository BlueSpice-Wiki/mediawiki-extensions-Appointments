<?php

use MediaWiki\Extension\Appointments\Store\AppointmentStore;
use MediaWiki\Extension\Appointments\Store\CalendarStore;
use MediaWiki\Extension\Appointments\Store\EventTypeStore;
use MediaWiki\Extension\Appointments\Store\ParticipantStore;
use MediaWiki\Extension\Appointments\UserInterface;
use MediaWiki\Extension\Appointments\Utils\AgendaLinker;
use MediaWiki\Extension\Appointments\Utils\UserResolver;
use MediaWiki\Extension\Appointments\Utils\Permissions;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;

return [
	'Appointments.AppointmentStore' => static function ( MediaWikiServices $services ) {
		return new AppointmentStore(
			$services->getDBLoadBalancer(),
			$services->getService( 'Appointments.ParticipantStore' ),
			$services->getService( 'Appointments.CalendarStore' ),
			$services->getUserFactory(),
			$services->getService( 'Appointments.EventTypeStore' )
		);
	},
	'Appointments.CalendarStore' => static function ( MediaWikiServices $services ) {
		return new CalendarStore(
			$services->getDBLoadBalancer(),
			$services->getUserFactory(),
			$services->getService( 'Appointments.EventTypeStore' )
		);
	},
	'Appointments.ParticipantStore' => static function ( MediaWikiServices $services ) {
		return new ParticipantStore( $services->getDBLoadBalancer() );
	},
	'Appointments.EventTypeStore' => static function ( MediaWikiServices $services ) {
		$typeAttribute = ExtensionRegistry::getInstance()->getAttribute( 'AppointmentsEventTypes' );
		$systemTypes = [];
		foreach ( $typeAttribute as $key => $spec ) {
			$type = $services->getObjectFactory()->createObject( $spec );
			if ( !( $type instanceof MediaWiki\Extension\Appointments\Entity\EventType ) ) {
				throw new InvalidArgumentException( "Invalid event type for key $key" );
			}
			$systemTypes[$type->guid] = $type;
		}

		return new EventTypeStore(
			$services->getDBLoadBalancer(),
			$services->getUserFactory(),
			$systemTypes
		);
	},
	'Appointments._UserInterface' => static function ( MediaWikiServices $services ) {
		return new UserInterface(
			$services->getLanguageFactory(),
			$services->getContentLanguage(),
			$services->getUserOptionsLookup(),
			$services->getMainConfig()
		);
	},
	'Appointments._UserResolver' => static function ( MediaWikiServices $services ) {
		return new UserResolver(
			$services->getDBLoadBalancer(),
			$services->getUserFactory()
		);
	},
	'Appointments._Permissions' => static function ( MediaWikiServices $services ) {
		return new Permissions(
			$services->getPermissionManager(), $services->getService( 'Appointments._UserResolver' )
		);
	},
	'Appointments._Logger' => static function () {
		return LoggerFactory::getInstance( 'Appointments' );
	},
	'Appointments._AgendaLinker' => static function( MediaWikiServices $services ) {
		return new AgendaLinker(
			$services->getTitleFactory()
		);
	},
];
