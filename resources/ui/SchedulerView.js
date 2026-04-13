const CalendarJS = require( 'ext.appointments.lib.calendarjs' );
const ExtensionConfig = require( './../config.json' );
const AppointmentEntry = require("./AppointmentEntry.js");

const SchedulerMonth = function ( config ) {
	SchedulerMonth.parent.call( this, $.extend( {
		expanded: false,
		padded: false
	}, config ) );

	CalendarJS.setDictionary( ExtensionConfig.i18n );

	this.today = moment().format( 'YYYY-MM-DD' );
	this.scheduler = config.scheduler;
	this.last = null;
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
	} );

	this.last = this.getVisibleRange();

	// 1) programmatic navigation
	const origNext = this.calendar.next.bind(this.calendar);
	const origPrev = this.calendar.prev.bind(this.calendar);
	const origSetValue = this.calendar.setValue.bind(this.calendar);

	this.calendar.next = (...a) => { const r = origNext(...a); this.emitRangeChangeIfChanged(); return r; };
	this.calendar.prev = (...a) => { const r = origPrev(...a); this.emitRangeChangeIfChanged(); return r; };
	this.calendar.setValue = (...a) => { const r = origSetValue(...a); this.emitRangeChangeIfChanged(); return r; };

	// 2) UI navigation (header buttons / keyboard)
	const content = this.calendar.el.querySelector('.lm-calendar-content');
	const mo = new MutationObserver(() => this.emitRangeChangeIfChanged());
	mo.observe(content, { childList: true, subtree: true });

	this.stampCells();

	this.renderNavigation();
};

SchedulerMonth.prototype.emitRangeChangeIfChanged = function () {
	this.stampCells();
	const now = this.getVisibleRange();
	if ( !now ) {
		return;
	}
	if ( !this.last || now['start'] !== this.last['start'] || now['end'] !== this.last['end'] ) {
		this.last = now;
		this.emit( 'rangeChange', now );
	}
};

SchedulerMonth.prototype.renderNavigation = function () {
	this.nextButton = new OO.ui.ButtonWidget( {
		icon: 'next',
		title: mw.msg( 'appointments-next-month' ),
		flags: [ 'progressive' ]
	} );
	this.prevButton = new OO.ui.ButtonWidget( {
		icon: 'previous',
		title: mw.msg( 'appointments-previous-month' ),
		flags: [ 'progressive' ]
	} );
	this.nextButton.on( 'click', () => this.calendar.next() );
	this.prevButton.on( 'click', () => this.calendar.prev() );
	this.$element.find( '.lm-calendar-navigation' ).replaceWith( new OO.ui.HorizontalLayout( {
		items: [ this.prevButton, this.nextButton ],
	} ).$element );
};

SchedulerMonth.prototype.removeForCalendar = function ( calendarGuid ) {
	const entries = this.$element[0]
		.querySelectorAll( `.lm-calendar-content .appointment-entry[data-calendar="${calendarGuid}"]` );
	entries.forEach( entry => entry.remove() );

	// Reset spanning-bar row counts and cell padding so stacking is recalculated
	const grid = this.$element[0].querySelector( '.lm-calendar-content' );
	if ( grid ) {
		grid._spanRowCounts = {};
		grid.querySelectorAll( ':scope > div[data-date]' ).forEach( ( cell ) => {
			cell.style.paddingTop = '';
		} );
	}
};

SchedulerMonth.prototype.addAppointment = function ( appointment ) {
	const start = appointment.periodDefinition.getStartDate();
	const end = appointment.periodDefinition.getEndDate();
	this.addMultiDayAppointment( appointment, start, end );
};

/**
 * Render a multi-day appointment as one spanning bar per calendar row it
 * touches.  Each bar is absolutely positioned inside `.lm-calendar-content`
 * so that it stretches from the first visible day-cell to the last, giving the
 * appearance of a single unified entity across columns.
 *
 * When the appointment crosses a week boundary the bar is split: one segment
 * per grid-row, each independently positioned.
 */
SchedulerMonth.prototype.addMultiDayAppointment = function ( appointment, start, end ) {
	const grid = this.$element[ 0 ].querySelector( '.lm-calendar-content' );
	if ( !grid ) {
		return;
	}
	const cells = Array.from( grid.querySelectorAll( ':scope > div[data-date]' ) );
	if ( !cells.length ) {
		return;
	}

	const visibleStart = cells[ 0 ].getAttribute( 'data-date' );
	const visibleEnd = cells[ cells.length - 1 ].getAttribute( 'data-date' );
	const renderStart = start < visibleStart ? visibleStart : start;
	const renderEnd = end > visibleEnd ? visibleEnd : end;

	if ( renderStart > renderEnd ) {
		return;
	}

	// Build an ordered list of cell-indices that fall inside the appointment range
	const hitIndices = [];
	for ( let i = 0; i < cells.length; i++ ) {
		const d = cells[ i ].getAttribute( 'data-date' );
		if ( d >= renderStart && d <= renderEnd ) {
			hitIndices.push( i );
		}
	}
	if ( !hitIndices.length ) {
		return;
	}

	// Split into segments per visual row (rows of 7)
	const segments = [];
	let seg = [ hitIndices[ 0 ] ];
	for ( let i = 1; i < hitIndices.length; i++ ) {
		if ( Math.floor( hitIndices[ i ] / 7 ) !== Math.floor( seg[ 0 ] / 7 ) ) {
			segments.push( seg );
			seg = [];
		}
		seg.push( hitIndices[ i ] );
	}
	segments.push( seg );

	// Count how many spanning bars already exist in each row so we can stack them
	if ( !grid._spanRowCounts ) {
		grid._spanRowCounts = {};
	}

	segments.forEach( ( indices ) => {
		const firstCell = cells[ indices[ 0 ] ];
		const lastCell = cells[ indices[ indices.length - 1 ] ];
		const row = Math.floor( indices[ 0 ] / 7 );

		const slotIndex = grid._spanRowCounts[ row ] || 0;
		grid._spanRowCounts[ row ] = slotIndex + 1;

		const cell = cells[ indices[ 0 ] ];

		const entry = new AppointmentEntry( appointment, cell );
		entry.connect( this, {
			change: ( calendar ) => {
				console.log( calendar );
				this.scheduler.onDatasetChange( calendar );
			}
		} );

		const el = entry.$element[ 0 ];
		el.classList.add( 'appointment-entry-span' );
		el.setAttribute( 'data-span-row', row );
		el.setAttribute( 'data-span-slot', slotIndex );

		// Position will be calculated by layoutSpanningEntries after all
		// appointments are added, because cell sizes may not be final yet.
		el._spanFirstCell = firstCell;
		el._spanLastCell = lastCell;

		grid.appendChild( el );
	} );
};

/**
 * (Re-)position every `.appointment-entry-span` element inside the grid.
 *
 * Call once after all appointments for the visible range have been added
 * so that cell dimensions are stable.
 */
SchedulerMonth.prototype.layoutSpanningEntries = function () {
	const grid = this.$element[ 0 ].querySelector( '.lm-calendar-content' );
	if ( !grid ) {
		return;
	}

	const barHeight = 24;
	const barGap = 2;
	const topOffset = 25; // leave room for the day number

	// Absolutely position each spanning bar.
	const gridRect = grid.getBoundingClientRect();
	const spans = grid.querySelectorAll( '.appointment-entry-span' );
	spans.forEach( ( el ) => {
		const first = el._spanFirstCell;
		const last = el._spanLastCell;
		if ( !first || !last ) {
			return;
		}
		const firstRect = first.getBoundingClientRect();
		const lastRect = last.getBoundingClientRect();
		const slot = parseInt( el.getAttribute( 'data-span-slot' ) ) || 0;

		el.style.position = 'absolute';
		el.style.left = ( firstRect.left - gridRect.left ) + 'px';
		el.style.width = ( lastRect.right - firstRect.left ) + 'px';
		el.style.top = ( firstRect.top - gridRect.top + topOffset + slot * ( barHeight + barGap ) ) + 'px';
		el.style.height = barHeight + 'px';
		el.style.zIndex = '1';
	} );
};

SchedulerMonth.prototype.getVisibleRange = function ( ) {
	if ( !this.calendar ) {
		return;
	}
	if (this.calendar.view !== 'days' || !this.calendar.options || this.calendar.options.length < 42) {
		return this.getFromCursor();
	}
	const startNum = this.calendar.options[0].number;
	const endNum = this.calendar.options[41].number;
	return {
		start: this.calendar.helpers.numToDate(startNum).slice(0, 10),
		end: this.calendar.helpers.numToDate(endNum).slice(0, 10)
	};
};

SchedulerMonth.prototype.getFromCursor = function () {
	const year = this.calendar.cursor.y;
	const month = this.calendar.cursor.m; // 0-indexed
	const firstDayOfMonth = new Date( Date.UTC( year, month, 1 ) );
	const lastDayOfMonth = new Date( Date.UTC( year, month + 1, 0 ) );
	return {
		start: firstDayOfMonth.toISOString().substring( 0, 10 ),
		end: lastDayOfMonth.toISOString().substring( 0, 10 )
	};
};

SchedulerMonth.prototype.stampCells = function () {
	const cells = this.$element[0].querySelectorAll( '.lm-calendar-content > div' );
	if (
		this.calendar.options &&
		this.calendar.options.length >= cells.length &&
		this.calendar.helpers &&
		this.calendar.helpers.numToDate
	) {
		cells.forEach( ( cell, index ) => {
			cell.setAttribute(
				'data-date',
				this.calendar.helpers.numToDate( this.calendar.options[ index ].number ).slice( 0, 10 )
			);
		} );
		return;
	}

	const year = this.calendar.cursor.y;
	const month = this.calendar.cursor.m; // 0-indexed
	const startingDay = this.calendar.startingDay || 0;
	const firstDayOfMonth = new Date( Date.UTC( year, month, 1 ) );
	const startOffset = ( firstDayOfMonth.getUTCDay() - startingDay + 7 ) % 7;

	cells.forEach( ( cell, index ) => {
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
