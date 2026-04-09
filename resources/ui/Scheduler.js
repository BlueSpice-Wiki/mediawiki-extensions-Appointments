const CalendarMultiselect = require( './CalendarMultiselect.js' );
const AppointmentEntry = require( './AppointmentEntry.js' );
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
			ext.appointments.util.openAppointmentEditorDialog( null ).then( ( res ) => {
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
		select: async ( calendarGuids ) => {
			this.loadAndRenderAppointments( calendarGuids );
		}
	} );
	this.$calendarPicker.append( this.calendarPicker.$element );

	this.renderScheduler();
};

OO.inheritClass( scheduler, OO.ui.PanelLayout );

scheduler.prototype.loadAndRenderAppointments = async function ( calendarGuids ) {
	const appointments = [];
	for ( const calendarGuid of calendarGuids ) {
		const calendarAppointments = await ext.appointments.api.getAppointments( calendarGuid, this.onlyPersonal );

		appointments.push( ...calendarAppointments );
	}

	for ( const appointment of appointments ) {
		const entry = new AppointmentEntry( appointment );
		entry.connect( this, {
			change: ( calendar ) => {
				this.onDatasetChange( calendar );
			}
		} );
		//this.$calendarCnt.append( entry.$element );
	}
};

scheduler.prototype.onDatasetChange = function ( calendar ) {
	// Happens whenever there is a change requiring reload of the calendar
	console.log( "UPDATE CAL", calendar.guid );
};

scheduler.prototype.renderScheduler = function () {
	let wasNew = false;
	if ( this.view === 'month' ) {
		if ( !this.views['month'] ) {
			this.views['month'] = new MonthView();
			this.views['month'].connect( this, {
				calendarUpdate: ( span ) => {
					console.log( span );
				}
			} );
			wasNew = true;
		}
		this.$calendarCnt.empty().append( this.views['month'].$element );
	} else {
		if ( !this.views[this.view] ) {
			this.views[this.view] = new WeekDayView( { view: this.view } );
			 wasNew = true;
		}
		this.$calendarCnt.empty().append( this.views[this.view].$element );
	}
	if ( wasNew ) {
		setTimeout( () => {
			this.views[this.view].render();
		}, 100 );
	}
}

module.exports = scheduler;
