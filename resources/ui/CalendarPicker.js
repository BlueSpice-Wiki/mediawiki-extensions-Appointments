const CalendarMenuOption = require( './util/CalendarMenuOption.js' );
const calendarPicker = function ( config ) {
	calendarPicker.parent.call( this, $.extend( {}, config ) );

	this.value = config.value || null;

	this.menu.connect( this, {
		select: ( item ) => {
			this.value = item.getData();
		}
	} );
};

OO.inheritClass( calendarPicker, OO.ui.DropdownWidget );

calendarPicker.prototype.load = async function () {
	const calendars = await ext.appointments.api.getCalendars();
	this.menu.clearItems();

	calendars.forEach( calendar => {
		this.menu.addItems( [ new CalendarMenuOption( calendar ) ] );
	} );

	if ( this.value ) {
		this.menu.selectItemByData( this.value );
	} else {
		this.value = calendars[0] ? calendars[0].guid : null;
		if ( this.value ) {
			this.menu.selectItemByData( this.value );
		}
	}
};

calendarPicker.prototype.getValue = function () {
	return this.value;
};

module.exports = calendarPicker;
