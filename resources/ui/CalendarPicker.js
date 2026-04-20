const calendarPicker = function ( config ) {
	calendarPicker.parent.call( this, $.extend( {}, config ) );

	this.value = config.value || null;
	this.calendars = {};
	this.selectedCalendar = null;
	this.allowNone = config.allowNone || false;
	this.returnName = config.returnName || false;

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
	if ( this.allowNone ) {
		this.menu.addItems( [ new OO.ui.MenuOptionWidget( {
			data: null,
			label: mw.msg( 'appointments-ui-calendar-picker-none' )
		} ) ] );

	}

	this.calendars.forEach( calendar => {
		this.menu.addItems( [ new OO.ui.MenuOptionWidget( {
			data: calendar.guid,
			label: calendar.name
		} ) ] );
		if ( calendar.name === this.value ) {
			this.value = calendar.guid;
		}
		this.calendars[calendar.guid] = calendar;
	} );

	if ( this.value ) {
		this.menu.selectItemByData( this.value );
	} else {
		if ( this.allowNone ) {
			this.menu.selectItemByData( null );
			return;
		}
		this.value = this.calendars[0] ? this.calendars[0].guid : null;
		if ( this.value ) {
			this.menu.selectItemByData( this.value );
		}
	}
};

calendarPicker.prototype.setValue = function ( value ) {
	this.value = value;
	this.load();
}

calendarPicker.prototype.getValue = function () {
	if ( this.returnName ) {
		return this.calendars[this.value] ? this.calendars[this.value].name : null;
	}
	return this.value;
};

calendarPicker.prototype.getSelectedCalendar = function () {
	return this.selectedCalendar;
};

module.exports = calendarPicker;
