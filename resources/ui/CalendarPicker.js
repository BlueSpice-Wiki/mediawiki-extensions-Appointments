const newCalendarMenuOptionClass = require( './util/NewCalendarMenuOption.js' );

const calendarPicker = function ( config ) {
	calendarPicker.parent.call( this, $.extend( {}, config ) );
};

OO.inheritClass( calendarPicker, OO.ui.DropdownWidget );

calendarPicker.prototype.load = async function () {
	const calendars = await ext.appointments.api.getCalendars();
	this.menu.clearItems();

	calendars.forEach( calendar => {
		this.menu.addItems( [ new ( require( './util/CalendarMenuOption.js' ))( calendar ) ] );
	} );
	this.menu.addItems( [
		new newCalendarMenuOptionClass()
	] );

};

calendarPicker.prototype.onMenuSelect = function ( item ) {
	if ( item && item instanceof newCalendarMenuOptionClass ) {
		item.onSelect();
		return;
	}
	return calendarPicker.parent.prototype.onMenuSelect.call( this, item );
};

module.exports = calendarPicker;
