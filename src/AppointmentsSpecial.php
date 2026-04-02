<?php

namespace MediaWiki\Extension\Appointments;

use Html;
use MediaWiki\Html\TemplateParser;
use OOJSPlus\Special\OOJSSpecialPage;

class AppointmentsSpecial extends OOJSSpecialPage {

	public function __construct() {
		parent::__construct( 'Appointments' );
		$this->templateParser = new TemplateParser(
			dirname( __DIR__ ) . '/resources/templates'
		);
	}

	/**
	 * @param string $subPage
	 * @return void
	 */
	protected function doExecute( $subPage ) {
		parent::doExecute( $subPage );

		$this->getOutput()->addModules( [ 'ext.appointments.special' ] );
		$this->getOutput()->addHTML( Html::element( 'div', [ 'id' => 'appointments-app' ] ) );
	}

	/**
	 * @return string
	 */
	public function getTemplateName() {
		return 'calendar-skeleton';
	}
}
