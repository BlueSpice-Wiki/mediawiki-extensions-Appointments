const CalendarMultiselect = require( './CalendarMultiselect.js' );
const makeToolbar = require( './util/MainToolbar.js' );
const SchedulerView = require( './SchedulerView.js' );
const CalendarDataProvider = require( './../CalendarDataProvider.js' );
const UserLocalPreferences = require( './../UserLocalPreferences.js' );

const scheduler = function ( config ) {
	scheduler.parent.call( this, $.extend( {
		expanded: false,
		padded: true
	}, config ) );

	this.viewObject = null;

	this.localPreferences = new UserLocalPreferences();
	this.permissions = mw.config.get( 'wgAppointmentsPermissions' );

	this.viewMap = {
		'year': 'dayGridYear',
		'month': 'dayGridMonth',
		'week': 'timeGridWeek',
		'day': 'timeGridDay',
	};

	this.onlyPersonal = config.onlyPersonal;
	this.dataProvider = new CalendarDataProvider( this, this.onlyPersonal );

	this.$header = $( '<div>' ).addClass( 'ext-appointments-scheduler-header' );

	this.mainBooklet = new OO.ui.BookletLayout( {
		classes: [ 'ext-appointments-scheduler-main-booklet', 'ext-appointments-scheduler-calendar-cnt' ],
		expanded: false,
		outlined: true
	} );
	this.mainBooklet.$menu.empty();
	this.mainBooklet.$menu.addClass( 'ext-appointments-scheduler-calendars' );

	this.$element.append(  this.$header, this.mainBooklet.$element, );
	this.$element.addClass( 'ext-appointments-scheduler' );

	this.view = this.localPreferences.getPreference( 'defaultView' ) || 'month';

	this.toolbar = makeToolbar( this.view );
	this.toolbar.connect( this, {
		viewChange: async ( view ) => {
			this.view = view;
			this.localPreferences.setPreference( 'defaultView', view );
			if ( this.viewObject ) {
				const view = this.viewMap[ this.view ];
				this.viewObject.fc.changeView( view );
			}
		},
		toggleCalendars: ( visible ) => {
			this.mainBooklet.$menu.toggle( visible );
		}
	} );
	this.$header.append( this.toolbar.$element );

	this.newEventButton = new OO.ui.ButtonWidget( {
		label: mw.msg( 'appointments-ui-new-appointment' ),
		icon: 'add',
		flags: [ 'primary', 'progressive' ],
		classes: [ 'ext-appointments-scheduler-new-event-button' ],
		disabled: true
	} );
	this.mainBooklet.$content.children( '.oo-ui-bookletLayout-stackLayout' ).prepend( this.newEventButton.$element );

	this.newEventButton.connect( this, {
		click: () => {
			let defaultDate = null;
			if ( this.viewObject ) {
				defaultDate = this.viewObject.selectedDate;
			}
			ext.appointments.util.openAppointmentEditorDialog( null, { defaultDate: defaultDate } )
				.then( ( res ) => {
					if ( res && res.entity ) {
						if ( res.res && res.res.guid ) {
							res.entity.guid = res.res.guid;
							// Make sure the calendar/event type of the new
							// appointment is selected, otherwise it would not be visible.
							this.calendarPicker.ensureSelected(
								res.entity.calendar && res.entity.calendar.guid,
								res.entity.eventType && res.entity.eventType.guid
							);
							this.dataProvider.onAppointmentChange( res.entity );
						} else {
							mw.notify( mw.message( 'appointments-ui-error-saving-appointment' ).text(), { type: 'error' } );
						}
					}
				} );
		}
	} );

	this.calendarPicker = new CalendarMultiselect( {
		value: this.localPreferences.getPreference( 'selectedCalendars' ) || null
	} );
	this.calendarPicker.connect( this, {
		reload: async ( value, calendarItems ) => {
			this.dataProvider.onCalendarUpdate( value );
			if ( calendarItems.length === 0 ) {
				this.newEventButton.setDisabled( true );
			}
		},
		created: function () {
			this.enableAddButtonIfAllowed();
		}
	} );
	const calendarInitializationPromise = new Promise( resolve => {
		this.calendarPicker.connect( this, {
			initialize: ( value, calendarItems ) => {
				if ( calendarItems.length ) {
					this.enableAddButtonIfAllowed();
				}
				this.calendarPicker.connect( this, {
					select: ( value, selected ) => {
						this.localPreferences.setPreference( 'selectedCalendars', this.calendarPicker.getValue() );
						this.dataProvider.onCalendarSetChange( value, selected );
					}
				} );
				resolve( value );
			}
		} );
	} );

	this.mainBooklet.$menu.attr( 'id', 'ext-appointments-scheduler-calendars' );
	this.mainBooklet.$menu.append( this.calendarPicker.$element );

	const initialRenderPromise = this.renderScheduler();

	// When both calendars and initial view are ready, load data for the view
	Promise.all( [ calendarInitializationPromise, initialRenderPromise ] ).then( ( [ calendarSet, range ] ) => {
		this.dataProvider.initialize( calendarSet, range );
	} );
};

OO.inheritClass( scheduler, OO.ui.PanelLayout );

scheduler.prototype.setData = function ( data ) {
	if ( this.viewObject ) {
		this.viewObject.setData( data );
	}
};

scheduler.prototype.onDataError = function( error ) {
	if ( this.errorMessage ) {
		this.errorMessage.setLabel( error );
	} else {
		this.errorMessage = new OO.ui.MessageWidget( {
			type: 'error',
			label: error
		} );
	}
};

scheduler.prototype.getRange = function () {
	if ( this.viewObject ) {
		return this.viewObject.getVisibleRange();
	}
	return null;
}

scheduler.prototype.onAppointmentUpdate = function ( appointment ) {
	this.dataProvider.onAppointmentChange( appointment );
};

scheduler.prototype.onAppointmentDelete = function ( appointment ) {
	this.dataProvider.onAppointmentDelete( appointment );
};

scheduler.prototype.renderScheduler = function () {
	return new Promise( async ( resolve ) =>  {
		let needsRender = false;
		if ( !this.viewObject ) {
			const view = new SchedulerView( { controller: this, view: this.viewMap[ this.view ] } );
			const page = this.getPage( view );
			this.viewObject = view;
			this.mainBooklet.addPages( [ page ] );
			view.connect( this, {
				rangeChange: ( span ) => {
					this.dataProvider.onRangeChange( span );
				}
			} );
			needsRender = true;
		}
		this.mainBooklet.setPage( this.view );
		if ( needsRender ) {
			setTimeout( () => {
				this.viewObject.render();
				resolve( this.viewObject.getVisibleRange() );
			}, 1 );
		} else {
			 resolve( this.viewObject.getVisibleRange() );
		}
	} );
};

scheduler.prototype.getPage = function( view ) {
	function page( view ) {
		page.super.call( this, 'schedulerView', { expanded: false, padded: false } );
		this.$element.append( view.$element );
	}

	OO.inheritClass( page, OO.ui.PageLayout );

	return new page( view );
};

scheduler.prototype.enableAddButtonIfAllowed = function () {
	if ( this.permissions['create-appointment'] ) {
		this.newEventButton.setDisabled( false );
	}
};

module.exports = scheduler;
