const CalendarJS = require( 'ext.appointments.lib.calendarjs' );
const ExtensionConfig = require( './../config.json' );

const SchedulerMonth = function ( config ) {
	SchedulerMonth.parent.call( this, $.extend( {
		expanded: false,
		padded: false
	}, config ) );

	CalendarJS.setDictionary( ExtensionConfig.i18n );

	this.today = moment().format( 'YYYY-MM-DD' );
};

OO.inheritClass( SchedulerMonth, OO.ui.PanelLayout );

SchedulerMonth.prototype.render = function () {
	this.calendar = CalendarJS.Calendar( this.$element[0], {
		type: 'inline',
		value: this.today,
		grid: true,
		wheel: false,
		footer: false,
		data: [],

		onupdate: () => {
			console.log( "UP" );
			this.emit( 'calendarUpdate', this.getVisibleRange() );
		}
	} );

	this.stampCells();
}

SchedulerMonth.prototype.renderAppointments = function ( appointments ) {

};

SchedulerMonth.prototype.getVisibleRange = function ( ) {
	const year = this.calendar.cursor.y;
	const month = this.calendar.cursor.m; // 0-based
	const startingDay = this.calendar.startingDay || 0;

	const firstOfMonth = new Date(Date.UTC(year, month, 1));
	const startOffset = (firstOfMonth.getUTCDay() - startingDay + 7) % 7;

	const visibleStart = new Date(Date.UTC(year, month, 1 - startOffset));
	const visibleEnd = new Date(Date.UTC(
		visibleStart.getUTCFullYear(),
		visibleStart.getUTCMonth(),
		visibleStart.getUTCDate() + 41 // 6 weeks grid
	));

	return {
		start: visibleStart.toISOString().slice(0, 10),
		end: visibleEnd.toISOString().slice(0, 10)
	};
};

SchedulerMonth.prototype.stampCells = function () {
	const year = this.calendar.cursor.y;
	const month = this.calendar.cursor.m; // 0-indexed
	const startingDay = this.calendar.startingDay || 0;
	const firstDayOfMonth = new Date( Date.UTC( year, month, 1 ) );
	const startOffset = ( firstDayOfMonth.getUTCDay() - startingDay + 7 ) % 7;

	const cells = this.$element[0].querySelectorAll( '.lm-calendar-content > div' );
	cells.forEach( function ( cell, index ) {
		const dayOffset = index - startOffset + 1; // 1 = first of month
		const date = new Date( Date.UTC( year, month, dayOffset ) );
		cell.setAttribute( 'data-date', date.toISOString().substring( 0, 10 ) );
	} );
};

const SchedulerWeekDay = function ( config ) {
	this.view = config.view;
	SchedulerWeekDay.parent.call( this, config );
};

OO.inheritClass( SchedulerWeekDay, SchedulerMonth );

SchedulerWeekDay.prototype.render = function () {
	this.scheduler = CalendarJS.Schedule( this.$element[0], {
		type: this.view,
		grid: 30,
		data: []
	} );
};

module.exports = {
	MonthView: SchedulerMonth,
	WeekDayView: SchedulerWeekDay
}
