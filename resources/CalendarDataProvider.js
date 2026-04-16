class CalendarDataProvider {
	constructor( scheduler, onlyPersonal ) {
		this.scheduler = scheduler;
		this.onlyPersonal = onlyPersonal || false;
	}

	#initialized = false;
	#initializing = false;

	#loadedCalendars = [];
	#calendarSet = {};
	#appointments = [];
	#currentRange = null;

	async initialize( calendarSet, range ) {
		if ( !range ) {
			return;
		}
		this.#initializing = true;
		this.#calendarSet = calendarSet;
		await this.loadRange( range );
		this.scheduler.setData( this.getForCalendarSet() );
		this.#initialized = true;
		this.#initializing = false;
	}

	async onViewChange( range ) {
		await this.loadRange( range );
		this.scheduler.setData( this.getForCalendarSet() );
	}

	async onRangeChange( range ) {
		await this.loadRange( range );
		this.scheduler.setData( this.getForCalendarSet() );
	}

	async onCalendarSetChange( calendar, selected ) {
		// Happens when calendar selection changes
		for ( const guid in calendar ) {
			if ( !selected ) {
				delete this.#calendarSet[guid];
				continue;
			}
			if ( !this.#loadedCalendars.includes( guid ) ) {
				await this.loadCalendar( guid, this.#currentRange );
			}
			this.#calendarSet[guid] = calendar[guid];
		}
		this.scheduler.setData( this.getForCalendarSet() );
	}

	async onCalendarUpdate( calendarSet ) {
		// Happens when calendar dataset changes (edited, created, deleted)
		const oldKeys = Object.keys( this.#calendarSet );
		const newKeys = Object.keys( calendarSet );
		const added = newKeys.filter( x => !oldKeys.includes( x ) );
		const removed = oldKeys.filter( x => !newKeys.includes( x ) );
		const updated = newKeys.filter( x => oldKeys.includes( x ) );

		for ( const guid of added ) {
			this.#calendarSet[guid] = calendarSet[guid];
			await this.loadCalendar( guid, this.#currentRange );
		}
		for ( const guid of removed ) {
			delete this.#calendarSet[guid];
			for ( const appIndex in this.#appointments ) {
				const appointment = this.#appointments[appIndex];
				if ( appointment.calendar.guid === guid ) {
					delete this.#appointments[appIndex];
				}
			}
		}

		for ( const guid of updated ) {
			if ( JSON.stringify( this.#calendarSet[guid] ) === JSON.stringify( calendarSet[guid] ) ) {
				continue;
			}
			// Added types
			const oldTypes = this.#calendarSet[guid] || [];
			const newTypes = calendarSet[guid] || [];
			const addedTypes = newTypes.filter( x => !oldTypes.includes( x ) );

			if ( addedTypes.length > 0 ) {
				await this.loadCalendar( guid, this.#currentRange );
			}
		}
		this.scheduler.setData( this.getForCalendarSet() );
	}

	async onAppointmentChange( appointment ) {
		if ( !appointment.guid ) {
			return;
		}
		await this.loadCalendar( appointment.calendar.guid, this.#currentRange );
		this.scheduler.setData( this.getForCalendarSet() );
	}

	async onAppointmentDelete( appointment ) {
		for ( const appIndex in this.#appointments ) {
			const app = this.#appointments[appIndex];
			if ( app.guid === appointment.guid ) {
				delete this.#appointments[appIndex];
			}
			this.scheduler.setData( this.getForCalendarSet() );
			return;
		}
	}

	getForCalendarSet() {
		const fittingAppointments = [];
		for ( const appIndex in this.#appointments ) {
			const appointment = this.#appointments[appIndex];
			for ( const calendarGuid in this.#calendarSet ) {
				const eventTypes = this.#calendarSet[calendarGuid] || [];
				if ( appointment.calendar.guid === calendarGuid && eventTypes.includes( appointment.eventType.guid ) ) {
					fittingAppointments.push( appointment );
				}
			}
		}
		return fittingAppointments;
	}

	async loadRange( range ) {
		if ( !this.#initializing && !this.#initialized ) {
			return;
		}
		const rangeComparison = this.compareRange( range );
		if ( rangeComparison.result === 'fresh' ) {
			this.#appointments = [];
			this.#currentRange = range;
			await this.doLoad( range );
		} else if ( rangeComparison.result === 'adjacent' ) {
			await this.doLoad( rangeComparison.rangeDiff );
			this.#currentRange = rangeComparison.extendedRange;
		}
		// Already loaded
	}

	async doLoad( range ) {
		for ( const calendarGuid in this.#calendarSet ) {
			if ( this.#calendarSet[calendarGuid] ) {
				try {
					await this.loadCalendar( calendarGuid, range );
				} catch ( e ) {
					this.scheduler.onDataError( mw.message( 'appointments-ui-load-calendar-failed' ).text() );
				}
			}
		}
	}

	async loadCalendar( calendarGuid, range ) {
		const appointments = await ext.appointments.api.getAppointments(
			calendarGuid, null, this.onlyPersonal, range.start, range.end
		);
		for ( const newAppIndex in appointments ) {
			const newAppointment = appointments[newAppIndex];
			for ( const appIndex in this.#appointments ) {
				const existingAppointment = this.#appointments[appIndex];
				if ( this.areDuplicates( existingAppointment, newAppointment ) ) {
					delete this.#appointments[appIndex];
				}
			}
		}
		this.#appointments.push( ...appointments );
		this.#loadedCalendars.push( calendarGuid );
	}

	areDuplicates( a, b ) {
		return a.guid === b.guid &&
			a.periodDefinition.getStartDate() === b.periodDefinition.getStartDate() &&
			a.periodDefinition.getEndDate() === b.periodDefinition.getEndDate();
	}

	compareRange( range ) {
		if ( !this.#currentRange ) {
			return { result: 'fresh' };
		}
		if ( this.#currentRange.start <= range.start && this.#currentRange.end >= range.end ) {
			return { result: 'fits' };
		}

		// New range ends in previous range
		if ( range.start < this.#currentRange.start && range.end >= this.#currentRange.start && range.end <= this.#currentRange.end ) {
			return {
				result: 'adjacent',
				rangeDiff: { start: range.start, end: this.#currentRange.start },
				extendedRange: { start: range.start, end: this.#currentRange.end }
			};
		}
		// New range starts in previous range
		if ( range.end > this.#currentRange.end && range.start >= this.#currentRange.start && range.start <= this.#currentRange.end ) {
			return {
				result: 'adjacent',
				rangeDiff: { start: this.#currentRange.end, end: range.end },
				extendedRange: { start: this.#currentRange.start, end: range.end }
			};
		}

		// New range is adjacent to previous range in front
		if ( DateUtils.isAdjacent( range.end, this.#currentRange.start ) ) {
			return {
				result: 'adjacent',
				rangeDiff: range,
				extendedRange: { start: range.start, end: this.#currentRange.end }
			};
		}
		// New range is adjacent to previous range in back
		if ( DateUtils.isAdjacent( range.start, this.#currentRange.end ) ) {
			return {
				result: 'adjacent',
				rangeDiff: range,
				extendedRange: { start: this.#currentRange.start, end: range.end }
			};
		}

		return { result: 'fresh' };
	}

}

const DateUtils = {

	// ✅ Validate format YYYY-MM-DD
	isValid(date) {
		return /^\d{4}-\d{2}-\d{2}$/.test(date);
	},

	// ✅ Parse into numbers
	parse(date) {
		const [y, m, d] = date.split('-').map(Number);
		return { y, m, d };
	},

	// ✅ Format back to string
	format(y, m, d) {
		return `${y.toString().padStart(4,'0')}-${m.toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`;
	},

	// ✅ Leap year check
	isLeapYear(year) {
		return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
	},

	// ✅ Days in month
	daysInMonth(year, month) {
		return [
			31,
			this.isLeapYear(year) ? 29 : 28,
			31, 30, 31, 30,
			31, 31, 30, 31, 30, 31
		][month - 1];
	},

	// ✅ Compare dates
	compare(a, b) {
		if (a === b) return 0;
		return a < b ? -1 : 1;
	},

	isBefore(a, b) {
		return a < b;
	},

	isAfter(a, b) {
		return a > b;
	},

	isBetween(date, start, end) {
		return date >= start && date <= end;
	},

	// ✅ Add N days
	addDays(date, n) {
		let { y, m, d } = this.parse(date);

		d += n;

		while (d > this.daysInMonth(y, m)) {
			d -= this.daysInMonth(y, m);
			m++;
			if (m > 12) {
				m = 1;
				y++;
			}
		}

		while (d < 1) {
			m--;
			if (m < 1) {
				m = 12;
				y--;
			}
			d += this.daysInMonth(y, m);
		}

		return this.format(y, m, d);
	},

	// ✅ Convenience
	addOneDay(date) {
		return this.addDays(date, 1);
	},

	subtractOneDay(date) {
		return this.addDays(date, -1);
	},

	// ✅ Adjacency check
	isAdjacent(a, b) {
		return this.addOneDay(a) === b || this.subtractOneDay(a) === b;
	}
};

module.exports = CalendarDataProvider;

