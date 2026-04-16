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
		add: () => {
			let defaultDate = null;
			if ( this.viewObject ) {
				defaultDate = this.viewObject.selectedDate;
			}
			ext.appointments.util.openAppointmentEditorDialog( null, { defaultDate: defaultDate } )
				.then( ( res ) => {
					if ( res && res.entity ) {
						if ( res.res.guid ) {
							res.entity.guid = res.res.guid;
							this.dataProvider.onAppointmentChange( res.entity );
						}
					}
				} );
		},
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

	this.calendarPicker = new CalendarMultiselect( {
		value: this.localPreferences.getPreference( 'selectedCalendars' ) || null
	} );
	this.calendarPicker.connect( this, {
		reload: async ( value ) => {
			this.dataProvider.onCalendarUpdate( value );
		}
	} );
	const calendarInitializationPromise = new Promise( resolve => {
		this.calendarPicker.connect( this, {
			initialize: ( value ) => {
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

module.exports = scheduler;
