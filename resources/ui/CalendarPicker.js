const calendarPicker = function ( config ) {
	calendarPicker.parent.call( this, $.extend( {}, config ) );

	this.value = config.value || null;
	this.calendars = {};
	this.selectedCalendar = null;
	this.allowNone = config.allowNone || false;
	this.returnName = config.returnName || false;
	this.autoLoad = config.autoLoad || false;
	this.onlyAssigned = typeof config.onlyAssigned === 'boolean' ? config.onlyAssigned : true;
	this.onlyUnassigned = typeof config.onlyUnassigned === 'boolean' ? config.onlyUnassigned : false;
	this.noneLabel = config.noneLabel || mw.msg( 'appointments-ui-calendar-picker-none' );

	this.menu.connect( this, {
		select: ( item ) => {
			this.value = item.getData();
			this.selectedCalendar = this.calendars[this.value] || null;
			this.setSelectedLabel();
			this.emit( 'change', this.getValue() );
			this.emit( 'select', item );
		}
	} );

	if ( this.autoLoad ) {
		this.load();
	}
};

OO.inheritClass( calendarPicker, OO.ui.DropdownWidget );

calendarPicker.prototype.setSelectedLabel = function () {
	if ( this.value === null ) {
		this.setLabel( this.noneLabel );
		return;
	}
	this.setLabel( this.selectedCalendar ? this.selectedCalendar.name : '' );
};

calendarPicker.prototype.getCalendarOptionLabel = function ( calendar ) {
	const $label = $( '<div>' ).addClass( 'ext-appointments-calendar-picker-option' );
	$( '<div>' )
		.addClass( 'ext-appointments-calendar-picker-option-name' )
		.text( calendar.name || '' )
		.appendTo( $label );

	const description = ( calendar.description || '' ).trim();
	if ( description ) {
		$( '<div>' )
			.addClass( 'ext-appointments-calendar-picker-option-description' )
			.text( description )
			.appendTo( $label );
	}

	return $label;
};

calendarPicker.prototype.load = async function () {
	this.calendars = await ext.appointments.api.getCalendars( this.onlyAssigned );
	if ( this.onlyUnassigned ) {
		const assigned = await ext.appointments.api.getCalendars( true );
		const assignedGuids = assigned.map( calendar => calendar.guid );
		this.calendars.forEach( calendar => {
			calendar.assigned = assignedGuids.includes( calendar.guid );
		} );
	}

	this.menu.clearItems();
	if ( this.allowNone ) {
		this.menu.addItems( [ new OO.ui.MenuOptionWidget( {
			data: null,
			label: this.noneLabel
		} ) ] );

	}

	const addedCalendars = [];
	this.calendars.forEach( calendar => {
		if ( this.onlyUnassigned && calendar.assigned ) {
			return;
		}
		this.menu.addItems( [ new OO.ui.MenuOptionWidget( {
			data: calendar.guid,
			label: this.getCalendarOptionLabel( calendar )
		} ) ] );
		addedCalendars.push( calendar.guid );
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
			this.setSelectedLabel();
			return;
		}
		this.value = addedCalendars[0] || null;
		if ( this.value ) {
			this.menu.selectItemByData( this.value );
		}
	}
	if ( addedCalendars.length === 0 ) {
		this.emit( 'empty' );
	}
	this.setSelectedLabel();
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
