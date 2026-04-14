const CalendarJS = require( 'ext.appointments.lib.calendarjs' );
const ExtensionConfig = require( './../config.json' );
const PeriodDefinition = require( './../object/PeriodDefinition.js' );
const Appointment = require( './../object/Appointment.js' );

const SchedulerWeekDay = function ( config ) {
	this.view = config.view;

	SchedulerWeekDay.parent.call( this, $.extend( {
		expanded: false,
		padded: false
	}, config ) );

	CalendarJS.setDictionary( ExtensionConfig.i18n );

	this.today = config.today || moment().format( 'YYYY-MM-DD' );
	this.controller = config.controller;
};

OO.inheritClass( SchedulerWeekDay, OO.ui.PanelLayout );

SchedulerWeekDay.prototype.render = function () {
	this.$element.empty();
	this.$navigation = $( '<div>' ).addClass( 'appointments-scheduler-period-navigation' );
	this.$navigationLabel = $( '<div>' ).addClass( 'appointments-scheduler-period-label' );
	this.$schedule = $( '<div>' ).addClass( 'appointments-scheduler-weekday-content' );
	this.$element.append( this.$navigation, this.$schedule );

	this.scheduler = CalendarJS.Schedule( this.$schedule[ 0 ], {
		type: this.view,
		grid: 30,
		data: [],
		value: this.today,
		overlap: true,
		onbeforecreate: this.onBeforeCreateAppointment.bind( this ),
		onchangeevent: this.handleEventChange.bind( this ),
		ondelete: this.onEventDelete.bind( this ),
		ondblclick: this.onEventOpen.bind( this )
	} );

	this.last = this.getVisibleRange();

	const originalNext = this.scheduler.next.bind( this.scheduler );
	const originalPrev = this.scheduler.prev.bind( this.scheduler );
	const originalToday = this.scheduler.today.bind( this.scheduler );
	this.scheduler.el.addEventListener( 'click', ( e ) => {
		const item = e.target.closest( '.lm-schedule-item' );
		if ( !item || !this.scheduler.el.contains( item ) ) {
			return;
		}
		console.log( item.event );
	} );


	const originalUpdateEvent = this.scheduler.updateEvent.bind( this.scheduler );
	this.scheduler.next = ( ...args ) => {
		const result = originalNext( ...args );
		this.emitRangeChangeIfChanged();
		return result;
	};
	this.scheduler.prev = ( ...args ) => {
		const result = originalPrev( ...args );
		this.emitRangeChangeIfChanged();
		return result;
	};
	this.scheduler.today = ( ...args ) => {
		const result = originalToday( ...args );
		this.emitRangeChangeIfChanged();
		return result;
	};
	this.scheduler.updateEvent = ( eventOrGuid, newValue ) => {
		this.currentChangingEventGuid = typeof eventOrGuid === 'object' ?
			eventOrGuid.guid :
			eventOrGuid;

		try {
			return originalUpdateEvent( eventOrGuid, newValue );
		} finally {
			this.currentChangingEventGuid = null;
		}
	};

	this.renderNavigation();
	this.updateNavigationLabel();

	setTimeout( () => {
		this.scrollToCurrentTimeOffset();
	}, 10 );
};

SchedulerWeekDay.prototype.renderNavigation = function () {
	this.prevButton = new OO.ui.ButtonWidget( {
		icon: 'previous',
		title: mw.msg( 'appointments-previous-period' ),
		flags: [ 'progressive' ]
	} );
	this.nextButton = new OO.ui.ButtonWidget( {
		icon: 'next',
		title: mw.msg( 'appointments-next-period' ),
		flags: [ 'progressive' ]
	} );

	this.prevButton.on( 'click', () => this.scheduler.prev() );
	this.nextButton.on( 'click', () => this.scheduler.next() );

	this.$navigation.empty().append(
		this.prevButton.$element,
		this.$navigationLabel,
		this.nextButton.$element
	);
};

SchedulerWeekDay.prototype.emitRangeChangeIfChanged = function () {
	const now = this.getVisibleRange();
	if ( !now ) {
		return;
	}

	this.updateNavigationLabel();
	setTimeout( () => this.scrollToCurrentTimeOffset(), 0 );

	if ( !this.last || now.start !== this.last.start || now.end !== this.last.end ) {
		this.last = now;
		this.emit( 'rangeChange', now );
	}
};

SchedulerWeekDay.prototype.updateNavigationLabel = function () {
	if ( !this.$navigationLabel ) {
		return;
	}

	this.$navigationLabel.text( this.getNavigationLabel() );
};

SchedulerWeekDay.prototype.getNavigationLabel = function () {
	const range = this.getVisibleRange();
	if ( !range ) {
		return '';
	}

	const start = new Date( `${range.start}T00:00:00Z` );
	const end = new Date( `${range.end}T00:00:00Z` );
	const sameYear = start.getUTCFullYear() === end.getUTCFullYear();

	if ( range.start === range.end ) {
		return this.formatNavigationDate( start, {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		} );
	}

	if ( sameYear ) {
		return `${this.formatNavigationDate( start, {
			month: 'long',
			day: 'numeric'
		} )} - ${this.formatNavigationDate( end, {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		} )}`;
	}

	return `${this.formatNavigationDate( start, {
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	} )} - ${this.formatNavigationDate( end, {
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	} )}`;
};

SchedulerWeekDay.prototype.formatNavigationDate = function ( date, options ) {
	return new Intl.DateTimeFormat(
		mw.config.get( 'wgUserLanguage' ) || undefined,
		Object.assign( { timeZone: 'UTC' }, options )
	).format( date );
};

SchedulerWeekDay.prototype.scrollToCurrentTimeOffset = function () {
	if ( !this.scheduler ) {
		return;
	}

	const scheduleEl = this.$element[ 0 ].querySelector( '.lm-schedule' );
	if ( !scheduleEl ) {
		return;
	}

	const gridSize = this.scheduler.grid || 30;
	const now = new Date();
	const targetMinutes = Math.max( 0, now.getHours() * 60 + now.getMinutes() );
	const targetSlot = Math.floor( targetMinutes / gridSize );
	const headerHeight = scheduleEl.querySelector( 'thead' )?.offsetHeight || 0;
	const targetCell = scheduleEl.querySelector( `.lm-schedule tbody td[data-y="${targetSlot}"]` );
	const targetTop = targetCell ? targetCell.offsetTop : targetSlot * gridSize;

	scheduleEl.scrollTop = Math.max( 0, targetTop - headerHeight );
};

SchedulerWeekDay.prototype.onBeforeCreateAppointment = function ( calendarScheduler, events ) {
	events.forEach( ( event ) => {
		const date = event.date;
		const startTime = event.start;
		const endTime = event.end;

		const appointment = new Appointment();
		appointment.periodDefinition = new PeriodDefinition( date, startTime, date, endTime );

		const preview = document.getElementById( event.guid );
		ext.appointments.util.openAppointmentEditorDialog( appointment, {} )
			.then( ( res ) => {
				if ( res && res.entity ) {
					this.controller.onDatasetChange( res.entity.calendar.guid );
				} else {
					if ( preview && calendarScheduler.el && calendarScheduler.el.contains( preview ) ) {
						event.el = preview;
						preview.remove();
					}
				}
			} );
	} );

	return false;
};

SchedulerWeekDay.prototype.onEventChange = function ( calendarScheduler, newValue ) {
	const appointment = this.getAppointment( newValue.guid );
	if ( !appointment ) {
		return;
	}
	const oldPeriod = appointment.periodDefinition;
	const newPeriod = new PeriodDefinition(
		newValue.date, newValue.start, newValue.date, newValue.end, oldPeriod.isAllDay(), oldPeriod.getRecurrenceRule()
	);
	if ( appointment.periodDefinition.isEqual( newPeriod ) ) {
		return;
	}
	appointment.periodDefinition = newPeriod;
	ext.appointments.api.saveAppointment( appointment ).then( ( res ) => {
		if ( res ) {
			this.controller.onDatasetChange( appointment.calendar.guid );
		}
	} );
};

SchedulerWeekDay.prototype.onEventDelete = function ( calendarScheduler, event ) {
	const appointment = this.getAppointment( event.guid );
	if ( appointment ) {
		ext.appointments.api.deleteAppointment( appointment.guid ).then( ( res ) => {
			if ( res ) {
				this.controller.onDatasetChange( appointment.calendar.guid );
			}
		} );
	}
};

SchedulerWeekDay.prototype.onEventOpen = function ( calendarScheduler, event ) {
	const appointment = this.getAppointment( event.guid );
	if ( appointment ) {
		ext.appointments.util.openAppointmentEditorDialog( appointment, {} )
			.then( ( res ) => {
				if ( res && res.entity ) {
					this.controller.onDatasetChange( res.entity.calendar.guid );
				}
			} );
	}
};

SchedulerWeekDay.prototype.handleEventChange = function ( calendarScheduler, newValue, oldValue ) {
	const guid = this.currentChangingEventGuid;

	if ( guid ) {
		if ( newValue ) {
			newValue.guid = guid;
		}
		if ( oldValue ) {
			oldValue.guid = guid;
		}
	}

	return this.onEventChange( calendarScheduler, newValue, oldValue );
};

SchedulerWeekDay.prototype.getAppointment = function( guid ) {
	if ( !this.appointments ) {
		return null;
	}
	return this.appointments.find( ( app ) => app.guid === guid );
};

SchedulerWeekDay.prototype.prependEventIcon = function ( guid ) {
	const appointment = this.getAppointment( guid );
	const scheduleEvent = this.scheduler ?
		this.scheduler.getData().find( ( event ) => event.guid === guid ) :
		null;
	const eventEl = scheduleEvent && scheduleEvent.el ?
		scheduleEvent.el :
		document.getElementById( guid );

	if ( !appointment || !eventEl || !this.$element[ 0 ].contains( eventEl ) ) {
		return;
	}

	const existingTitle = eventEl.querySelector( '.appointment-schedule-title' );
	if ( existingTitle ) {
		existingTitle.remove();
	}
	eventEl.classList.remove( 'appointment-schedule-item-with-icon' );

	const icon = appointment.eventType.getIcon();
	if ( !icon ) {
		return;
	}

	const title = document.createElement( 'span' );
	const label = document.createElement( 'span' );
	const iconWidget = new OO.ui.IconWidget( {
		icon: icon,
		classes: [ 'appointment-schedule-title-icon' ]
	} );

	title.className = 'appointment-schedule-title';
	label.className = 'appointment-schedule-title-label';
	label.textContent = appointment.title;

	const color = appointment.eventType.getColor();
	if ( color in ext.appointments.CALENDAR_COLORS &&
		!ext.appointments.CALENDAR_COLORS[ color ]
	) {
		title.classList.add( 'dark-text' );
	}

	title.append( iconWidget.$element[ 0 ], label );
	eventEl.classList.add( 'appointment-schedule-item-with-icon' );
	eventEl.prepend( title );
};

SchedulerWeekDay.prototype.decorateEventIcons = function () {
	if ( !this.appointments ) {
		return;
	}

	this.appointments.forEach( ( appointment ) => {
		this.prependEventIcon( appointment.guid );
	} );
};

SchedulerWeekDay.prototype.getVisibleRange = function () {
	if ( !this.scheduler || !this.scheduler.value ) {
		return;
	}

	const type = this.scheduler.type || this.view;
	const parts = this.scheduler.value.substring( 0, 10 ).split( '-' ).map( Number );
	const anchor = new Date( Date.UTC( parts[ 0 ], parts[ 1 ] - 1, parts[ 2 ] ) );
	const start = new Date( anchor );
	const end = new Date( anchor );

	if ( type === 'week' ) {
		start.setUTCDate( start.getUTCDate() - start.getUTCDay() );
		end.setTime( start.getTime() );
		end.setUTCDate( end.getUTCDate() + 6 );
	} else if ( type === 'weekdays' ) {
		const weekday = start.getUTCDay() || 7;
		start.setUTCDate( start.getUTCDate() - weekday + 1 );
		end.setTime( start.getTime() );
		end.setUTCDate( end.getUTCDate() + 4 );
	}

	return {
		start: start.toISOString().slice( 0, 10 ),
		end: end.toISOString().slice( 0, 10 )
	};
};

SchedulerWeekDay.prototype.setData = function ( appointments ) {
	if ( !this.scheduler ) {
		return;
	}
	const data = [];
	for ( let i = 0; i < appointments.length; i++ ) {
		const app = appointments[ i ];
		data.push( {
			guid: app.guid,
			title: app.title,
			start: app.periodDefinition.getStartTime(),
			end: app.periodDefinition.getEndTime(),
			date: app.periodDefinition.getStartDate(),
			color: app.eventType.getColor()
		} );
	}
	this.appointments = appointments;
	this.scheduler.setData( data );
	setTimeout( () => this.decorateEventIcons(), 1 );
};

module.exports = SchedulerWeekDay;
