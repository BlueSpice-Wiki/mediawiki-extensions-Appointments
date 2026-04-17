const notifyInAdvancePicker = function ( value, cfg ) {
	cfg = cfg || {};
	notifyInAdvancePicker.parent.call( this, cfg );

	this.enabled = value && value.enabled;
	this.selectedPeriod = value ? value.period : null;

	this.toggle = new OO.ui.ToggleSwitchWidget( {
		value: this.enabled
	} );
	this.toggle.connect( this, { change: 'onToggleChange' } );

	const periodOptions = this.getPeriodOptions();
	this.period = new OO.ui.DropdownWidget( {
		menu: { items: periodOptions },
		disabled: !this.enabled,
		classes: [ "notify-in-advance-period" ]
	} );
	if ( this.selectedPeriod ) {
		this.period.menu.selectItemByData( this.selectedPeriod );
	} else {
		this.period.menu.selectItemByData( '1h' );
	}

	this.$element.append(
		new OO.ui.HorizontalLayout( {
			items: [ this.toggle, this.period ]
		} ).$element
	);
};

OO.inheritClass( notifyInAdvancePicker, OO.ui.Widget );

notifyInAdvancePicker.prototype.getValue = function () {
	const period = this.period.getMenu().findSelectedItem();
	return {
		enabled: this.toggle.isSelected(),
		period: period ? period.getData() : null
	}
};

notifyInAdvancePicker.prototype.getPeriodOptions = function () {
	const values = {
		'1 hour': mw.message( 'appointments-ui-notify-1h' ).text(),
		'3 hours': mw.message( 'appointments-ui-notify-3h' ).text(),
		'1 day': mw.message( 'appointments-ui-notify-day' ).text(),
		'1 week': mw.message( 'appointments-ui-notify-week' ).text(),
	}
	return Object.entries( values ).map( ( [ data, label ] ) => (
		new OO.ui.MenuOptionWidget( { data: data, label: label } )
	) );

};

notifyInAdvancePicker.prototype.onToggleChange = function ( selected ) {
	this.period.setDisabled( !selected );
}

module.exports = notifyInAdvancePicker;
