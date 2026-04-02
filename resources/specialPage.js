( function () {
	const calendarjs = require( 'ext.appointments.lib.calendarjs' );

	$( '#oojsplus-skeleton-cnt' ).remove();

	const app = document.getElementById( 'appointments-app' );
	if ( !app ) {
		return;
	}

	// Container for the calendar date picker
	const calendarEl = document.createElement( 'div' );
	calendarEl.id = 'appointments-calendar';

	// Container for the weekly schedule
	const scheduleEl = document.createElement( 'div' );
	scheduleEl.id = 'appointments-schedule';

	app.replaceChildren( calendarEl, scheduleEl );

	const today = calendarjs.Helpers.toString( new Date(), true ); // 'YYYY-MM-DD'

	// Stamps each .lm-calendar-content day cell with data-date="YYYY-MM-DD".
	// The grid is always 42 cells. Cell 0 starts at the day-of-week of the 1st of
	// the displayed month, offset by startingDay (first day of week setting).
	const stampCalendarDates = function () {
		const year = calendar.cursor.y;
		const month = calendar.cursor.m; // 0-indexed
		const startingDay = calendar.startingDay || 0;
		const firstDayOfMonth = new Date( Date.UTC( year, month, 1 ) );
		const startOffset = ( firstDayOfMonth.getUTCDay() - startingDay + 7 ) % 7;

		const cells = calendarEl.querySelectorAll( '.lm-calendar-content > div' );
		cells.forEach( function ( cell, index ) {
			const dayOffset = index - startOffset + 1; // 1 = first of month
			const date = new Date( Date.UTC( year, month, dayOffset ) );
			cell.setAttribute( 'data-date', date.toISOString().substring( 0, 10 ) );
		} );
	};

	// Renders a coloured chip for each schedule event into the matching calendar day cell.
	// Called after any event change and after every calendar re-render (month navigation
	// wipes custom DOM, so chips must be re-injected).
	const renderEventChips = function () {
		// Remove all previously injected chips
		calendarEl.querySelectorAll( '.appointments-chip' ).forEach( function ( el ) {
			el.remove();
		} );

		schedule.getData().forEach( function ( event ) {
			const cell = calendarEl.querySelector( '[data-date="' + event.date.substring( 0, 10 ) + '"]' );
			if ( !cell ) {
				return; // event is outside the currently visible month
			}

			const chip = document.createElement( 'span' );
			chip.className = 'appointments-chip';
			chip.textContent = event.title;
			chip.style.backgroundColor = event.color || '#3f51b5';
			chip.setAttribute( 'data-guid', event.guid );
			cell.appendChild( chip );
		} );
	};

	// Stamp dates then render chips — called after every calendar re-render.
	const refreshCalendar = function () {
		stampCalendarDates();
		renderEventChips();
	};

	// Watch for any DOM change inside the calendar grid (covers prev/next month,
	// year/month picker drill-down, and lemonade reactive re-renders).
	// disconnect() + reconnect() pattern prevents the observer from re-triggering
	// itself when refreshCalendar() injects chips back into the DOM.
	const calendarObserver = new MutationObserver( function () {
		calendarObserver.disconnect();
		refreshCalendar();
		calendarObserver.observe( calendarEl, { childList: true, subtree: true } );
	} );

	calendarjs.setDictionary({
		'January': 'Enero',
		'February': 'Febrero',
		'March': 'Marzo',
		'April': 'Abril',
		'May': 'Mayo',
		'June': 'Junio',
		'July': 'Julio',
		'August': 'Agosto',
		'September': 'Septiembre',
		'October': 'Octubre',
		'November': 'Noviembre',
		'December': 'Diciembre',
		'Sunday': 'Domingo',
		'Monday': 'Lunes',
		'Tuesday': 'Martes',
		'Wednesday': 'Miércoles',
		'Thursday': 'Jueves',
		'Friday': 'Viernes',
		'Saturday': 'Sábado',
		'Done': 'Hecho',
		'Reset': 'Restablecer'
	});

	// --- Inline calendar (date picker) ---
	// Passing data here will be updated by syncCalendarDots after any schedule change.
	const calendar = calendarjs.Calendar( calendarEl, {
		type: 'inline',
		value: today,
		grid: true,
		wheel: false,
		data: []
	} );

	// --- Weekly schedule (appointments view) ---
	const schedule = calendarjs.Schedule( scheduleEl, {
		type: 'week',
		grid: 30,
		data: [],

		oncreate: function ( self, events ) {
			renderEventChips();
			// eslint-disable-next-line no-console
			console.log( 'Appointment created', events );
		},
		onchangeevent: function ( self, newValue ) {
			renderEventChips();
			// eslint-disable-next-line no-console
			console.log( 'Appointment updated', newValue );
		},
		ondelete: function ( self, event ) {
			renderEventChips();
			// eslint-disable-next-line no-console
			console.log( 'Appointment deleted', event );
		}
	} );

	// Expose instances for later programmatic use
	window.ext.appointments.calendar = calendar;
	window.ext.appointments.schedule = schedule;

	// Stamp data-date and render chips on initial paint, then start observing.
	refreshCalendar();
	calendarObserver.observe( calendarEl, { childList: true, subtree: true } );
}() );