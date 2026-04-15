const calendarMenuOption = require( './util/CalendarCheckboxMenuOption.js' );

const calendarMultiselect = function ( config ) {
	calendarMultiselect.parent.call( this, $.extend( {}, config ) );

	this.$options = $( '<div>' ).addClass( 'ext-appointments-calendar-multiselect-options' );
	this.$options.html( new OO.ui.ProgressBarWidget( { progress: false } ).$element );
	this.$element.append( this.$options );

	this.addCalendarButton = new OO.ui.ButtonWidget( {
		label: mw.message( 'appointments-ui-create-calendar' ).text(),
		framed: false,
		icon: 'add',
		flags: [ 'progressive' ]
	} );
	this.addCalendarButton.connect( this, {
		click: () => {
			ext.appointments.util.openCalendarEditorDialog().then( ( res ) => {
				if ( res && res.entity ) {
					this.reload();
				}
			} );
		}
	} );
	this.$element.append( this.addCalendarButton.$element );

	this.isInitialized = false;
	this.reload( config.value || null );
};

OO.inheritClass( calendarMultiselect, OO.ui.Widget );

calendarMultiselect.prototype.reload = function ( value ) {
	const preValue = value || this.getValue();
	ext.appointments.api.getCalendars().then( calendars => {
		const items = [];
		for ( const calendar of calendars ) {
			const option = new calendarMenuOption( calendar );
			option.connect( this, {
				select: ( item, selected ) => {
					const value = {};
					value[item.getData()] = item.getValue();
					this.emit( 'select', value, selected );
				},
				edit: () => {
					this.reload();
				},
				delete: () => {
					this.reload();
				}
			} );
			items.push( option );
		}
		this.selector = new OO.ui.CheckboxMultiselectWidget( { items: items } );
		this.selector.connect( this, {
			select: ( item, selected ) => {
				const value = {};
				value[item.getData()] = item.getValue();
				if ( !selected ) {
					item.unselectEventTypes();
				}
				this.emit( 'select', value, selected );
			}
		} );
		if ( !preValue ) {
			this.selector.selectItemsByData( calendars.map( calendar => calendar.guid ) );
			this.selectedAllEventTypes();
		} else {
			this.setValue( preValue );
		}
		this.$options.html( this.selector.$element );
		if ( !this.isInitialized ) {
			this.emit( 'initialize', this.getValue() );
			this.isInitialized = true;
		} else {
			this.emit('reload', this.getValue());
		}
	} ).catch( ( e ) => {
		console.error( e ); // eslint-disable-line no-console
		this.$element.html( new OO.ui.MessageWidget( {
			type: 'error',
			label: mw.message( 'appointments-ui-load-calendars-failed' ).text()
		} ).$element );
	} );
};

calendarMultiselect.prototype.getValue = function () {
	if ( !this.selector ) {
		return null;
	}
	// Find all selected options
	const selectedCalendars = this.selector.findSelectedItems();
	const value = {};
	for ( const calendarOption of selectedCalendars ) {
		value[calendarOption.getData()] = calendarOption.getValue();
	}

	return value;
};

calendarMultiselect.prototype.setValue = function ( value ) {
	if ( !this.selector ) {
		return;
	}
	const selectedCalendars = [];
	for ( const calendarGuid in value ) {
		selectedCalendars.push( calendarGuid );
		const calendarOption = this.selector.findItemFromData( calendarGuid );
		if ( calendarOption ) {
			calendarOption.setValue( value[calendarGuid] );
		}
	}
	this.selector.selectItemsByData( selectedCalendars );

}

calendarMultiselect.prototype.selectedAllEventTypes = function () {
	const selectedCalendars = this.selector.findSelectedItems();
	for ( const calendarOption of selectedCalendars ) {
		calendarOption.selectAllEventTypes();
	}
}

module.exports = calendarMultiselect;
