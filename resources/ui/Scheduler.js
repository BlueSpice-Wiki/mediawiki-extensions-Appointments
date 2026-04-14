const CalendarMultiselect = require( './CalendarMultiselect.js' );
const makeToolbar = require( './util/MainToolbar.js' );
const MonthView = require( './SchedulerMonthView.js' );
const WeekDayView = require( './SchedulerWeekDayView.js' );

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
				if ( view.calendar && typeof view.calendar.getValue === 'function' ) {
					defaultDate = view.calendar.getValue();
				} else if ( view.scheduler && view.scheduler.value ) {
					defaultDate = view.scheduler.value;
				}
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
			this.loadForVisibleCalendars();
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
	this.appointmentCache = {};

	this.renderScheduler();
};

OO.inheritClass( scheduler, OO.ui.PanelLayout );

scheduler.prototype.onCalendarSetChange = async function ( calendars, selected ) {
	// When calendar selection changes, we need to load appointments for newly added calendars and remove appointments for removed calendars
	if ( !this.views[this.view] ) {
		return;
	}
	const view = this.views[this.view];
	let needsReload = false;

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
			// Calendar is still visible, but event types selection changed
			this.visibleCalendars[ guid ] = selectedTypes;
			needsReload = true;
		}
	}
	if ( needsReload ) {
		this.loadForVisibleCalendars();
	}
};

scheduler.prototype.loadForVisibleCalendars = async function ( range, onlyForCalendar ) {
	if ( !this.visibleCalendars ) {
		return;
	}
	const view = this.views[ this.view ];
	if ( !view ) {
		return;
	}

	if ( !range ) {
		range = await new Promise( ( resolve ) => {
			setTimeout( () => {
				resolve( view.getVisibleRange() );
			}, 100 );
		} );
	}
	if ( !range ) {
		return;
	}

	const allApps = [];
	for ( const guid in this.visibleCalendars ) {
		const apps = await ext.appointments.api.getAppointments(
			guid, this.visibleCalendars[ guid ], this.onlyPersonal, range.start, range.end
		);
		allApps.push( ...apps );
	}

	if ( this.view === 'month' ) {
		// Sort all-day appointments first, then longest visible spans first
		allApps.sort( ( a, b ) => {
			const aAllDay = a.periodDefinition.isAllDay();
			const bAllDay = b.periodDefinition.isAllDay();
			if ( aAllDay !== bAllDay ) {
				return aAllDay ? -1 : 1;
			}

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
			if ( bSpan !== aSpan ) {
				return bSpan - aSpan;
			}

			const aTime = aAllDay ? '00:00' : a.periodDefinition.getStartTime();
			const bTime = bAllDay ? '00:00' : b.periodDefinition.getStartTime();
			if ( aStart !== bStart ) {
				return aStart.localeCompare( bStart );
			}
			return aTime.localeCompare( bTime );
		} );

		// Clear all and render in one pass
		if ( typeof view.removeAllAppointments === 'function' ) {
			view.removeAllAppointments();
		}
		allApps.forEach( ( app ) => {
			view.addAppointment( app );
		} );
		if ( typeof view.layoutSpanningEntries === 'function' ) {
			view.layoutSpanningEntries();
		}
	} else {
		console.log( allApps );
		view.setData( allApps );
	}
};

scheduler.prototype.onDatasetChange = function ( calendar ) {
	this.loadForVisibleCalendars( null, calendar );
};

scheduler.prototype.renderScheduler = function () {
	let wasNew = false;
	if ( this.view === 'month' ) {
		if ( !this.views['month'] ) {
			this.views['month'] = new MonthView( { controller: this } );
			wasNew = true;
		}
		this.$calendarCnt.empty().append( this.views['month'].$element );
	} else {
		if ( !this.views[this.view] ) {
			this.views[this.view] = new WeekDayView( { view: this.view, controller: this } );
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
