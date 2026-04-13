const CalendarMultiselect = require( './CalendarMultiselect.js' );
const makeToolbar = require( './util/MainToolbar.js' );
const { MonthView, WeekDayView } = require( './SchedulerView.js' );

const scheduler = function ( config ) {
	scheduler.parent.call( this, $.extend( {
		expanded: false,
		padded: true
	}, config ) );

	this.views = { month: null, week: null, day: null };

	this.onlyPersonal = config.onlyPersonal;

	this.$calendarPicker = $( '<div>' ).addClass( 'ext-appointments-scheduler-calendars' );
	this.$header = $( '<div>' ).addClass( 'ext-appointments-scheduler-header' );
	this.$calendarCnt = $( '<div>' )
		.attr( 'id', 'appointments-calendar' )
		.addClass( 'ext-appointments-scheduler-calendar-cnt' );

	this.$element.append(  this.$header, this.$calendarPicker, this.$calendarCnt );
	this.$element.addClass( 'ext-appointments-scheduler' );

	this.view = 'month';

	this.toolbar = makeToolbar( this.view );
	this.toolbar.connect( this, {
		add: () => {
			const view = this.views[this.view];
			let defaultDate = null;
			if ( view ) {
				defaultDate = view.calendar.getValue();
			}
			ext.appointments.util.openAppointmentEditorDialog( null, { defaultDate: defaultDate } )
				.then( ( res ) => {
					if ( res && res.entity ) {
						this.onDatasetChange( res.entity.calendar );
					}
				} );
		},
		viewChange: ( view ) => {
			this.view = view;
			this.renderScheduler();
		}
	} );
	this.$header.append( this.toolbar.$element );

	this.calendarPicker = new CalendarMultiselect( {} );
	this.calendarPicker.connect( this, {
		datasetUpdate: async () => {
			await this.calendarPicker.reload();
		},
		select: async ( value, selected ) => {
			this.onCalendarSetChange( value, selected );
		}
	} );
	this.$calendarPicker.append( this.calendarPicker.$element );
	this.visibleCalendars = {};

	this.renderScheduler();
};

OO.inheritClass( scheduler, OO.ui.PanelLayout );

scheduler.prototype.onCalendarSetChange = async function ( calendars, selected ) {
	// When calendar selection changes, we need to load appointments for newly added calendars and remove appointments for removed calendars
	if ( !this.views[this.view] ) {
		return;
	}
	const view = this.views[this.view];

	for ( const guid in calendars ) {
		const selectedTypes = calendars[ guid ];
		if ( selectedTypes.length === 0 || !selected ) {
			// Calendar was visible but now is not, remove it
			if ( !this.visibleCalendars[ guid ] ) {
				continue;
			}
			delete this.visibleCalendars[ guid ];
			view.removeForCalendar( guid );
		} else {
			if ( this.visibleCalendars[ guid ] && this.visibleCalendars[ guid ].join() === selectedTypes.join() ) {
				// Calendar is already visible with the same event types, no need to do anything
				continue;
			}
			// Calendar is still visible, but event types selection changed, so we need to reload it
			this.loadAppointments( guid );
			this.visibleCalendars[ guid ] = selectedTypes;
		}
	}
};

scheduler.prototype.loadForVisibleCalendars = function ( range ) {
	if ( !this.visibleCalendars ) {
		return;
	}
	for ( const guid in this.visibleCalendars ) {
		this.loadAppointments( guid, range );
	}
};

scheduler.prototype.loadAppointments = async function ( calendarGuid, range ) {
	const view = this.views[this.view];
	if ( !view ) {
		return;
	}
	if ( !calendarGuid ) {
		return;
	}
	range = range || await new Promise((resolve) => {
		// Give some time for the view to update its visible range if needed, e.g. when calendar is changed
		setTimeout(() => {
			resolve(view.getVisibleRange());
		}, 100);
	});
	if ( !range ) {
		return;
	}
	const apps = await ext.appointments.api.getAppointments(
		calendarGuid, this.visibleCalendars[calendarGuid], this.onlyPersonal, range.start, range.end
	);
	// Sort longest-spanning appointments first so they render on top rows
	apps.sort( ( a, b ) => {
		const aStart = a.periodDefinition.getStartDate() < range.start ?
			range.start :
			a.periodDefinition.getStartDate();
		const aEnd = a.periodDefinition.getEndDate() > range.end ?
			range.end :
			a.periodDefinition.getEndDate();
		const bStart = b.periodDefinition.getStartDate() < range.start ?
			range.start :
			b.periodDefinition.getStartDate();
		const bEnd = b.periodDefinition.getEndDate() > range.end ?
			range.end :
			b.periodDefinition.getEndDate();
		const aSpan = new Date( aEnd ) - new Date( aStart );
		const bSpan = new Date( bEnd ) - new Date( bStart );
		return bSpan - aSpan;
	} );
	view.removeForCalendar( calendarGuid );
	apps.forEach( app => {
		view.addAppointment( app );
	} );
	if ( typeof view.layoutSpanningEntries === 'function' ) {
		view.layoutSpanningEntries();
	}
};

scheduler.prototype.onDatasetChange = function ( calendar ) {
	console.log( "DSC", calendar );
	// When new appointment is added or edited
	if ( !calendar ) {
		return;
	}
	console.log( "LOAD" );
	this.loadAppointments( calendar.guid );
};

scheduler.prototype.renderScheduler = function () {
	let wasNew = false;
	if ( this.view === 'month' ) {
		if ( !this.views['month'] ) {
			this.views['month'] = new MonthView( { scheduler: this } );
			wasNew = true;
		}
		this.$calendarCnt.empty().append( this.views['month'].$element );
	} else {
		if ( !this.views[this.view] ) {
			this.views[this.view] = new WeekDayView( { view: this.view, scheduler: this } );
			 wasNew = true;
		}
		this.$calendarCnt.empty().append( this.views[this.view].$element );
	}

	if ( wasNew ) {
		setTimeout( () => {
			this.views[this.view].connect( this, {
				rangeChange: ( span ) => {
					this.loadForVisibleCalendars( span );
				}
			} );
			this.views[this.view].render();
		}, 100 );
	}
};

module.exports = scheduler;
