const CalendarJS = require( 'ext.appointments.lib.calendarjs' );
const ExtensionConfig = require( './../config.json' );
const AppointmentEntry = require("./AppointmentEntry.js");
const AppointmentPopupList = require( './util/AppointmentPopupList.js' );

const SPAN_BAR_HEIGHT = 24;
const SPAN_BAR_GAP = 2;
const SPAN_TOP_OFFSET = 25;
const DAY_OVERFLOW_BUTTON_HEIGHT = 18;
const DAY_OVERFLOW_BUTTON_GAP = 2;

const SchedulerMonth = function ( config ) {
	SchedulerMonth.parent.call( this, $.extend( {
		expanded: false,
		padded: false
	}, config ) );

	CalendarJS.setDictionary( ExtensionConfig.i18n );

	this.today = moment().format( 'YYYY-MM-DD' );
	this.controller = config.controller;
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
	this.nextButton.connect( this, {
		click: () => this.calendar.next()
	} );
	this.prevButton.connect( this, {
		click: () => this.calendar.prev()
	} );

	const header = this.$element[ 0 ].querySelector( '.lm-calendar-header > div:first-child' );
	const labels = header ? header.querySelector( '.lm-calendar-labels' ) : null;
	const navigation = header ? header.querySelector( '.lm-calendar-navigation' ) : null;

	if ( !header || !labels || !navigation ) {
		return;
	}

	header.classList.add( 'appointments-scheduler-period-navigation' );
	labels.classList.add( 'appointments-scheduler-period-label' );
	labels.classList.add( 'appointments-scheduler-month-label' );

	navigation.remove();
	header.insertBefore( this.prevButton.$element[ 0 ], labels );
	header.appendChild( this.nextButton.$element[ 0 ] );
};

SchedulerMonth.prototype.removeAllAppointments = function () {
	const entries = this.$element[ 0 ]
		.querySelectorAll( '.lm-calendar-content .appointment-entry' );
	entries.forEach( ( entry ) => entry.remove() );
	this.$element[ 0 ].querySelectorAll( '.appointment-day-overflow' ).forEach( ( button ) => {
		button.remove();
	} );
};

SchedulerMonth.prototype.removeForCalendar = function ( calendarGuid ) {
	const entries = this.$element[0]
		.querySelectorAll( `.lm-calendar-content .appointment-entry[data-calendar="${calendarGuid}"]` );
	entries.forEach( entry => entry.remove() );
	this.$element[ 0 ].querySelectorAll( '.appointment-day-overflow' ).forEach( ( button ) => {
		button.remove();
	} );
};

SchedulerMonth.prototype.addAppointment = function ( appointment ) {
	const start = appointment.periodDefinition.getStartDate();
	const end = appointment.periodDefinition.getEndDate();
	this.addMultiDayAppointment( appointment, start, end );
};

SchedulerMonth.prototype.findAvailableSpanSlot = function ( grid, segments ) {
	const existingSpans = Array.from( grid.querySelectorAll( '.appointment-entry-span' ) );
	let slotIndex = 0;

	while ( true ) {
		const hasCollision = existingSpans.some( ( span ) => {
			const existingSlot = parseInt( span.getAttribute( 'data-span-slot' ), 10 );
			if ( existingSlot !== slotIndex ) {
				return false;
			}

			const existingRow = parseInt( span.getAttribute( 'data-span-row' ), 10 );
			const existingStartCol = parseInt( span.getAttribute( 'data-span-start-col' ), 10 );
			const existingEndCol = parseInt( span.getAttribute( 'data-span-end-col' ), 10 );

			return segments.some( ( segment ) =>
				segment.row === existingRow &&
				segment.startCol <= existingEndCol &&
				segment.endCol >= existingStartCol
			);
		} );

		if ( !hasCollision ) {
			return slotIndex;
		}

		slotIndex++;
	}
};

SchedulerMonth.prototype.getDaySpans = function ( spans, row, col ) {
	return spans
		.filter( ( span ) => {
			const spanRow = parseInt( span.getAttribute( 'data-span-row' ), 10 );
			const startCol = parseInt( span.getAttribute( 'data-span-start-col' ), 10 );
			const endCol = parseInt( span.getAttribute( 'data-span-end-col' ), 10 );

			return spanRow === row && col >= startCol && col <= endCol;
		} )
		.sort( ( a, b ) =>
			parseInt( a.getAttribute( 'data-span-slot' ), 10 ) -
			parseInt( b.getAttribute( 'data-span-slot' ), 10 )
		);
};

SchedulerMonth.prototype.applyOverflowHandling = function ( grid ) {
	const cells = Array.from( grid.querySelectorAll( ':scope > div[data-date]' ) );
	const spans = Array.from( grid.querySelectorAll( '.appointment-entry-span' ) );
	const hiddenSpans = new Set();

	grid.querySelectorAll( '.appointment-day-overflow' ).forEach( ( button ) => {
		button.remove();
	} );
	spans.forEach( ( span ) => {
		span.style.display = '';
	} );

	cells.forEach( ( cell, index ) => {
		const row = Math.floor( index / 7 );
		const col = index % 7;
		const daySpans = this.getDaySpans( spans, row, col );
		const cellHeight = cell.getBoundingClientRect().height;
		const availableHeight = Math.max( 0, cellHeight - SPAN_TOP_OFFSET );
		const maxSlotsWithoutOverflow = Math.max(
			0,
			Math.floor( ( availableHeight + SPAN_BAR_GAP ) / ( SPAN_BAR_HEIGHT + SPAN_BAR_GAP ) )
		);
		const needsOverflowButton = daySpans.some( ( span ) =>
			parseInt( span.getAttribute( 'data-span-slot' ), 10 ) >= maxSlotsWithoutOverflow
		);
		let maxVisibleSlots = maxSlotsWithoutOverflow;

		if ( needsOverflowButton ) {
			const availableHeightWithOverflow = Math.max(
				0,
				availableHeight - DAY_OVERFLOW_BUTTON_HEIGHT - DAY_OVERFLOW_BUTTON_GAP
			);
			maxVisibleSlots = Math.max(
				0,
				Math.floor(
					( availableHeightWithOverflow + SPAN_BAR_GAP ) / ( SPAN_BAR_HEIGHT + SPAN_BAR_GAP )
				)
			);
		}

		daySpans.forEach( ( span ) => {
			const slot = parseInt( span.getAttribute( 'data-span-slot' ), 10 );

			if ( slot >= maxVisibleSlots ) {
				hiddenSpans.add( span );
			}
		} );
	} );

	spans.forEach( ( span ) => {
		if ( hiddenSpans.has( span ) ) {
			span.style.display = 'none';
		}
	} );

	cells.forEach( ( cell, index ) => {
		const row = Math.floor( index / 7 );
		const col = index % 7;
		const daySpans = this.getDaySpans( spans, row, col );
		const hiddenDaySpans = daySpans.filter( ( span ) => hiddenSpans.has( span ) );

		if ( !hiddenDaySpans.length ) {
			return;
		}

		const overflowButton = new AppointmentPopupList({
			hiddenCount: hiddenDaySpans.length,
			controller: this.controller,
			$cell: $( cell )
		} );
		const appointments = daySpans.reduce( ( items, span ) => {
			if (
				span._appointment &&
				!items.some( ( item ) => item.guid === span._appointment.guid )
			) {
				items.push( span._appointment );
			}
			return items;
		}, [] );
		overflowButton.setAppointments( appointments );

		cell.appendChild( overflowButton.$element[0] );
	} );
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
	const segmentIndices = [];
	let seg = [ hitIndices[ 0 ] ];
	for ( let i = 1; i < hitIndices.length; i++ ) {
		if ( Math.floor( hitIndices[ i ] / 7 ) !== Math.floor( seg[ 0 ] / 7 ) ) {
			segmentIndices.push( seg );
			seg = [];
		}
		seg.push( hitIndices[ i ] );
	}
	segmentIndices.push( seg );

	const segments = segmentIndices.map( ( indices ) => ( {
		firstCell: cells[ indices[ 0 ] ],
		lastCell: cells[ indices[ indices.length - 1 ] ],
		row: Math.floor( indices[ 0 ] / 7 ),
		startCol: indices[ 0 ] % 7,
		endCol: indices[ indices.length - 1 ] % 7
	} ) );
	const slotIndex = this.findAvailableSpanSlot( grid, segments );

	segments.forEach( ( segment ) => {
		const cell = segment.firstCell;

		const entry = new AppointmentEntry( appointment, cell );
		entry.connect( this, {
			update: ( calendar ) => {
				this.controller.onAppointmentUpdate( appointment );
			},
			delete: ( appointment ) => {
				this.controller.onAppointmentDelete( appointment );
			}
		} );

		const el = entry.$element[ 0 ];
		el.classList.add( 'appointment-entry-span' );
		el.setAttribute( 'data-span-row', segment.row );
		el.setAttribute( 'data-span-slot', slotIndex );
		el.setAttribute( 'data-span-start-col', segment.startCol );
		el.setAttribute( 'data-span-end-col', segment.endCol );

		// Position will be calculated by layoutSpanningEntries after all
		// appointments are added, because cell sizes may not be final yet.
		el._spanFirstCell = segment.firstCell;
		el._spanLastCell = segment.lastCell;
		el._appointment = appointment;

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
		el.style.top = ( firstRect.top - gridRect.top + SPAN_TOP_OFFSET + slot * ( SPAN_BAR_HEIGHT + SPAN_BAR_GAP ) ) + 'px';
		el.style.height = SPAN_BAR_HEIGHT + 'px';
		el.style.zIndex = '1';
	} );
	this.applyOverflowHandling( grid );
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

SchedulerMonth.prototype.setData = function( data ) {
	const range = this.last;
	// Sort all-day appointments first, then longest visible spans first
	data.sort( ( a, b ) => {
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
	this.removeAllAppointments();
	data.forEach( ( app ) => {
		this.addAppointment( app );
	} );
	this.layoutSpanningEntries();
};

module.exports = SchedulerMonth;
