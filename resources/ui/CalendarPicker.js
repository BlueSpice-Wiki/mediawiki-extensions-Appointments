const calendarPicker = function ( config ) {
	calendarPicker.parent.call( this, $.extend( {}, config ) );

	this.value = config.value || null;
	this.calendars = {};
	this.selectedCalendar = null;

	this.menu.connect( this, {
		select: ( item ) => {
			this.value = item.getData();
			this.selectedCalendar = this.calendars[this.value] || null;
			this.emit( 'select', item );
		}
	} );
};

OO.inheritClass( calendarPicker, OO.ui.DropdownWidget );

calendarPicker.prototype.load = async function () {
	this.calendars = await ext.appointments.api.getCalendars();
	this.menu.clearItems();

	this.calendars.forEach( calendar => {
		this.menu.addItems( [ new OO.ui.MenuOptionWidget( {
			data: calendar.guid,
			label: calendar.name
		} ) ] );
		this.calendars[calendar.guid] = calendar;
	} );

	if ( this.value ) {
		this.menu.selectItemByData( this.value );
	} else {
		this.value = this.calendars[0] ? this.calendars[0].guid : null;
		if ( this.value ) {
			this.menu.selectItemByData( this.value );
		}
	}
};

calendarPicker.prototype.getValue = function () {
	return this.value;
};

calendarPicker.prototype.getSelectedCalendar = function () {
	return this.selectedCalendar;
};

module.exports = calendarPicker;
