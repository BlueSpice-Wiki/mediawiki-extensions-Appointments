const CalendarMultiselect = require( './CalendarMultiselect.js' );
const makeToolbar = require( './util/MainToolbar.js' );
const MonthView = require( './SchedulerMonthView.js' );
const WeekDayView = require( './SchedulerWeekDayView.js' );
const CalendarDataProvider = require( './../CalendarDataProvider.js' );
const UserLocalPreferences = require( './../UserLocalPreferences.js' );

const scheduler = function ( config ) {
	scheduler.parent.call( this, $.extend( {
		expanded: false,
		padded: true
	}, config ) );

	this.views = { month: null, week: null, day: null };
	this.dataProvider = new CalendarDataProvider( this );
	this.localPreferences = new UserLocalPreferences();

	this.onlyPersonal = config.onlyPersonal;

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
			const view = this.views[this.view];
			let defaultDate = null;
			if ( view ) {
				if ( view.calendar && typeof view.calendar.getValue === 'function' ) {
					defaultDate = view.calendar.getValue();
				} else if ( view.scheduler && view.scheduler.value ) {
					defaultDate = view.scheduler.value;
				}
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
			if ( this.view && this.views[this.view] ) {
				this.views[this.view].onViewChange();
			}
			this.view = view;
			this.localPreferences.setPreference( 'defaultView', view );
			await this.renderScheduler().then( ( range ) => {
				this.dataProvider.onViewChange( range );
			} );
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
	const view = this.views[ this.view ];
	if ( !view ) {
		return;
	}
	view.setData( data );
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
	const view = this.views[ this.view ];
	if ( view && typeof view.getVisibleRange === 'function' ) {
		return view.getVisibleRange();
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
		if ( this.view && !this.views[this.view] ) {
			let view;
			if ( this.view === 'month' ) {
				view = new MonthView( { controller: this } );
			} else {
				view = new WeekDayView( { view: this.view, controller: this } );
			}
			const page = this.getPage( this.view, view );
			this.views[this.view] = view;
			this.mainBooklet.addPages( [ page ] );
			view.connect( this, {
				rangeChange: ( span ) => {
					this.dataProvider.onRangeChange( span );
				}
			} );
			needsRender = true;
		}
		this.views[this.view].onViewChange();
		this.mainBooklet.setPage( this.view );
		if ( needsRender ) {
			setTimeout( () => {
				this.views[this.view].render();
				resolve( this.views[this.view].getVisibleRange() );
			}, 1 );
		} else {
			 resolve( this.views[this.view].getVisibleRange() );
		}
	} );
};

scheduler.prototype.getPage = function( name, view ) {
	function page( name, view ) {
		page.super.call( this, name, { expanded: false, padded: false } );
		this.$element.append( view.$element );
	}

	OO.inheritClass( page, OO.ui.PageLayout );

	return new page( name, view );
};

module.exports = scheduler;
