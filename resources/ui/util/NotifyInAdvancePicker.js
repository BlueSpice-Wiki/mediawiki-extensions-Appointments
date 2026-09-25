const notifyInAdvancePicker = function ( value, cfg ) {
	cfg = cfg || {};
	notifyInAdvancePicker.parent.call( this, cfg );
	this.dialog = cfg.dialog;

	this.enabled = value && value.enabled;
	this.selectedPeriod = value ? value.period : null;

	const periodOptions = this.getPeriodOptions();
	this.period = new OO.ui.DropdownWidget( {
		menu: { items: periodOptions },
		classes: [ "notify-in-advance-period" ],
		$overlay: this.dialog ? this.dialog.$overlay : true,
	} );

	if ( this.selectedPeriod ) {
		this.period.menu.selectItemByData( this.selectedPeriod );
	} else {
		this.period.menu.selectItemByData( '1h' );
	}
	if ( !this.enabled ) {
		this.period.menu.selectItemByData( 'none' );
	}

	this.$element.append(
		this.period.$element
	);
};

OO.inheritClass( notifyInAdvancePicker, OO.ui.Widget );

notifyInAdvancePicker.prototype.getValue = function () {
	const period = this.period.getMenu().findSelectedItem();
	let periodValue = period ? period.getData() : null;
	let enabled = true;
	if ( periodValue === 'none' ) {
		periodValue = null;
		enabled = false;
	}
	return {
		enabled: enabled,
		period: periodValue
	}
};

notifyInAdvancePicker.prototype.getPeriodOptions = function () {
	const values = {
		'none': mw.message( 'appointments-ui-notify-remind-period-none' ).text(),
		'1 hour': mw.message( 'appointments-ui-notify-1h' ).text(),
		'3 hours': mw.message( 'appointments-ui-notify-3h' ).text(),
		'1 day': mw.message( 'appointments-ui-notify-day' ).text(),
		'1 week': mw.message( 'appointments-ui-notify-week' ).text(),
	}
	return Object.entries( values ).map( ( [ data, label ] ) => (
		new OO.ui.MenuOptionWidget( { data: data, label: label } )
	) );

};

module.exports = notifyInAdvancePicker;
