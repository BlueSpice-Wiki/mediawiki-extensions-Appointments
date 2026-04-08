const newCalendarMenuOptionClass = require( './util/NewCalendarMenuOption.js' );

const calendarMultiselect = function ( config ) {
	calendarMultiselect.parent.call( this, $.extend( {
		allowArbitrary: false,
		menu: {
			highlightOnFilter: false
		}
	}, config ) );

	this.menu.connect( this, {
		select: ( items ) => {
			for ( let i = 0; i < items.length; i++ ) {
				if ( items[i].getData() === '_create' ) {
					// Make sure that "new calendar" option is never selected
					this.menu.unselectItem(items[i]);
				}
			}
			const selected = [];
			for ( const item of items ) {
				if ( item.getData() !== '_create' ) {
					selected.push( item.getData() );
				}
			}
			this.emit( 'select', selected );
		}
	} );
};

OO.inheritClass( calendarMultiselect, OO.ui.MenuTagMultiselectWidget );

calendarMultiselect.prototype.load = async function () {
	const selected = this.getValue();

	this.setDisabled( true );
	this.menu.clearItems();

	const calendars = await ext.appointments.api.getCalendars();
	const values = selected;
	for ( const calendar of calendars ) {
		this.menu.addItems( [ this.addOptionFromCalendar( calendar ) ] );
		if ( selected.length === 0 ) {
			values.push( calendar.guid );
		}
	}
	this.setValue( values );

	const newCalendarOption = new newCalendarMenuOptionClass();
	newCalendarOption.connect( this, {
		calendarCreated: ( calendar ) => {
			this.emit( 'calendarCreated', calendar );
		}
	} );
	this.menu.addItems( [ newCalendarOption ] );
	this.setDisabled( false );
};

calendarMultiselect.prototype.addOptionFromCalendar = function ( calendar ) {
	return new ( require( './util/CalendarMenuOption.js' ) )( calendar );
}

calendarMultiselect.prototype.addTag = function ( data, label ) {
	if ( data === '_create' ) {
		return;
	}
	return calendarMultiselect.parent.prototype.addTag.call( this, data, label );
};

calendarMultiselect.prototype.onMenuChoose = function ( item, selected ) {
	if ( !item ) {
		return;
	}
	if ( item instanceof newCalendarMenuOptionClass ) {
		item.onSelect();
		return;
	}
	calendarMultiselect.parent.prototype.onMenuChoose.call( this, item, selected );
};

module.exports = calendarMultiselect;
