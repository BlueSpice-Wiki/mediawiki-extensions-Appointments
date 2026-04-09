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

	this.reload();

};

OO.inheritClass( calendarMultiselect, OO.ui.Widget );

calendarMultiselect.prototype.reload = function () {
	ext.appointments.api.getCalendars().then( calendars => {
		const items = [];
		for ( const calendar of calendars ) {
			const option = new calendarMenuOption( calendar );
			option.connect( this, {
				edit: ( updatedCalendar ) => {
					this.emit( 'datasetUpdate', updatedCalendar );
					this.reload();
				},
				delete: ( deletedCalendarGuid ) => {
					this.emit( 'datasetUpdate', deletedCalendarGuid );
					this.reload();
				}

			} );
			items.push( option );
		}
		this.selector = new OO.ui.CheckboxMultiselectWidget( { items: items } );
		this.selector.connect( this, {
			select: () => {
				this.emit( 'select', this.selector.findSelectedItemsData() );
			}
		} );
		this.selector.selectItemsByData( calendars.map( calendar => calendar.guid ) );
		this.$options.html( this.selector.$element );
	} ).catch( ( e ) => {
		this.$element.html( new OO.ui.MessageWidget( {
			type: 'error',
			label: mw.message( 'appointments-ui-load-calendars-failed' ).text()
		} ).$element );
	} );
}

module.exports = calendarMultiselect;
