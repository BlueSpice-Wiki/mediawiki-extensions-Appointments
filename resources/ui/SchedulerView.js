const AppointmentViewer = require( './AppointmentViewer.js' );
const AppointmentPopupList = require( './util/AppointmentPopupList.js' );
const PeriodDefinition = require("../object/PeriodDefinition.js");

const SchedulerView = function ( config ) {
	SchedulerView.parent.call( this, Object.assign( {
		expanded: false,
		padded: false
	}, config ) );

	this.today = moment().format( 'YYYY-MM-DD' );
	this.controller = config.controller;
	this.last = null;
	this.activePopup = null;
	this.selectedDate = this.today;
	this.view = config.view || 'dayGridMonth';
	this.resizeObserver = null;
	this.windowResizeHandler = null;
	this.resizeRerenderTimer = null;
	this.overflowPopups = {};
	this.appointments = {};
};

OO.inheritClass( SchedulerView, OO.ui.PanelLayout );

SchedulerView.prototype.onViewChange = function () {
	this.clearOverflowPopups();
	if ( this.activePopup ) {
		this.activePopup.toggle( false );
	}
};

SchedulerView.prototype.render = function () {
	const calendarEl = document.createElement( 'div' );
	this.$element[ 0 ].appendChild( calendarEl );

	this.fc = new FullCalendar.Calendar( calendarEl, {
		initialView: this.view,
		initialDate: this.today,
		headerToolbar: false,
		editable: true,
		eventStartEditable: true,
		eventDurationEditable: true,
		dayMaxEvents: 4,
		fixedWeekCount: true,
		height: 'auto',
		// We handle timezones on backend
		timeZone: 'UTC',
		eventDisplay: 'block',
		locale: mw.config.get( 'wgAppointmentsLocale' ),
		datesSet: () => {
			this.clearOverflowPopups();
			this.emitRangeChangeIfChanged();
			this.updatePeriodLabel();
			this.applySelectedDateClass();
		},
		dateClick: (info) => {
			this.selectedDate = info.dateStr;
			this.applySelectedDateClass();
		},
		eventClick: ( info ) => this.onEventClick( info ),
		eventChange: ( info ) => this.onEventChange( info ),
		eventDidMount: ( info ) => this.onEventDidMount( info ),
		eventContent: ( arg ) => this.renderEventContent( arg ),
		moreLinkClick: ( info ) => this.onMoreLinkClick( info ),
		eventOrder: '-allDay,-duration,start,title',
		eventOrderStrict: true
	} );

	this.fc.render();
	this.last = this.getVisibleRange();
	this.renderNavigation();

	this.calendar = {
		getValue: () => moment( this.fc.getDate() ).format( 'YYYY-MM-DD' )
	};

	this.applySelectedDateClass();
	this.bindResizeRerender();
};

SchedulerView.prototype.emitRangeChangeIfChanged = function () {
	const now = this.getVisibleRange();
	if ( !now ) {
		return;
	}
	if ( !this.last || now.start !== this.last.start || now.end !== this.last.end ) {
		this.last = now;
		this.emit( 'rangeChange', now );
	}
};

SchedulerView.prototype.renderNavigation = function () {
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
		click: () => {
			this.fc.next();
		}
	} );
	this.prevButton.connect( this, {
		click: () => {
			this.fc.prev();
		}
	} );

	this.periodLabel = new OO.ui.LabelWidget( { label: '' } );
	this.periodLabel.$element.addClass( 'appointments-scheduler-period-label' );
	this.periodLabel.$element.addClass( 'appointments-scheduler-month-label' );

	const $nav = $( '<div>' ).addClass( 'appointments-scheduler-period-navigation' );
	$nav.append(
		this.prevButton.$element,
		this.periodLabel.$element,
		this.nextButton.$element
	);

	this.$element.prepend( $nav );
	this.updatePeriodLabel();
};

SchedulerView.prototype.updatePeriodLabel = function () {
	if ( !this.fc || !this.periodLabel ) {
		return;
	}
	this.periodLabel.setLabel( this.fc.view.title );
};

SchedulerView.prototype.clearOverflowPopups = function () {
	Object.keys( this.overflowPopups ).forEach( ( key ) => {
		const popup = this.overflowPopups[ key ];
		if ( popup && typeof popup.toggle === 'function' ) {
			popup.toggle( false );
		}
		if ( popup && popup.$element ) {
			popup.$element.remove();
		}
	} );
	this.overflowPopups = {};
};

SchedulerView.prototype.onMoreLinkClick = function ( info ) {
	if ( info.jsEvent ) {
		info.jsEvent.preventDefault();
		info.jsEvent.stopPropagation();
	}

	const seenAppointments = {};
	const appointments = [];
	const daySegs = info.allSegs && info.allSegs.length ?
		info.allSegs :
		( info.hiddenSegs || [] );
	daySegs.forEach( ( seg ) => {
		const appointment = seg.event &&
			seg.event.extendedProps &&
			seg.event.extendedProps.appointment;
		if ( !appointment || seenAppointments[ appointment.guid ] ) {
			return;
		}
		seenAppointments[ appointment.guid ] = true;
		appointments.push( appointment );
	} );

	if ( !appointments.length ) {
		return true;
	}
	this.hideAllOverflowPopups();

	const currentTarget = info.jsEvent &&
		info.jsEvent.currentTarget &&
		info.jsEvent.currentTarget.nodeType === Node.ELEMENT_NODE ?
		info.jsEvent.currentTarget :
		null;
	const dateKey = moment( info.date ).format( 'YYYY-MM-DD' );
	const clickTarget = info.jsEvent &&
		info.jsEvent.target &&
		info.jsEvent.target.nodeType === Node.ELEMENT_NODE ?
		info.jsEvent.target :
		null;
	const moreLinkElement = currentTarget && currentTarget.matches( '.fc-more-link' ) ?
		currentTarget :
		( clickTarget ? clickTarget.closest( '.fc-more-link' ) : null );
	const cellElement = moreLinkElement ?
		moreLinkElement.closest( '.fc-daygrid-day, .fc-timegrid-col' ) :
		( clickTarget ? clickTarget.closest( '.fc-daygrid-day, .fc-timegrid-col' ) : null );
	const $anchor = $( moreLinkElement || cellElement || this.$element[ 0 ] );

	let overflowPopup = this.overflowPopups[ dateKey ];
	if ( !overflowPopup ) {
		overflowPopup = new AppointmentPopupList( {
			hiddenCount: appointments.length,
			controller: this.controller,
			$cell: $anchor
		} );
		this.overflowPopups[ dateKey ] = overflowPopup;
		$( 'body' ).append( overflowPopup.$element );
	} else {
		overflowPopup.$floatableContainer = $anchor;
	}

	overflowPopup.setAppointments( appointments );
	overflowPopup.toggle( true );

	return true;
};

SchedulerView.prototype.bindResizeRerender = function () {
	if ( this.resizeObserver ) {
		this.resizeObserver.disconnect();
	}

	if ( this.windowResizeHandler ) {
		window.removeEventListener( 'resize', this.windowResizeHandler );
		this.windowResizeHandler = null;
	}

	const resizeCallback = () => {
		if ( this.resizeRerenderTimer ) {
			clearTimeout( this.resizeRerenderTimer );
		}

		this.resizeRerenderTimer = setTimeout( () => {
			this.resizeRerenderTimer = null;
			if ( !this.fc ) {
				return;
			}
			this.fc.updateSize();
			this.applySelectedDateClass();
		}, 0 );
	};

	if ( typeof ResizeObserver !== 'function' ) {
		this.windowResizeHandler = resizeCallback;
		window.addEventListener( 'resize', this.windowResizeHandler );
		return;
	}

	const observedElements = [
		this.$element[ 0 ].parentElement,
		this.$element[ 0 ]
	].filter( Boolean );
	this.resizeObserver = new ResizeObserver( resizeCallback );
	observedElements.forEach( ( element ) => {
		this.resizeObserver.observe( element );
	} );
};

SchedulerView.prototype.hideAllOverflowPopups = function () {
	for ( const key in this.overflowPopups ) {
		if (this.overflowPopups.hasOwnProperty(key)) {
			const popup = this.overflowPopups[key];
			if (popup && typeof popup.toggle === 'function') {
				popup.toggle(false);
			}
		}
	}
}

SchedulerView.prototype.applySelectedDateClass = function () {
	if ( !this.fc || !this.selectedDate ) {
		return;
	}

	const root = this.$element[ 0 ];
	root.querySelectorAll( '.appointments-fc-selected-date' ).forEach( ( element ) => {
		element.classList.remove( 'appointments-fc-selected-date' );
	} );

	const selectedCells = root.querySelectorAll(
		`.fc-daygrid-day[data-date="${this.selectedDate}"], .fc-timegrid-col[data-date="${this.selectedDate}"]`
	);
	selectedCells.forEach( ( cell ) => {
		cell.classList.add( 'appointments-fc-selected-date' );
	} );
};

SchedulerView.prototype.renderEventContent = function ( arg ) {
	const appointment = arg.event.extendedProps.appointment;
	const container = document.createElement( 'div' );
	container.className = 'appointments-fc-event-content';

	const icon = appointment.eventType.getIcon();
	if ( icon ) {
		const iconWidget = new OO.ui.IconWidget( { icon: icon } );
		iconWidget.$element.addClass( 'appointments-fc-event-icon' );
		container.appendChild( iconWidget.$element[ 0 ] );
	}

	if ( !appointment.periodDefinition.isAllDay() ) {
		const timeSpan = document.createElement( 'span' );
		timeSpan.className = 'appointments-fc-event-time';
		timeSpan.textContent = appointment.periodDefinition.getStartTime();
		container.appendChild( timeSpan );
	}

	const titleSpan = document.createElement( 'span' );
	titleSpan.className = 'appointments-fc-event-title';
	titleSpan.textContent = appointment.title;
	container.appendChild( titleSpan );

	if ( appointment.periodDefinition.getRecurrenceRule() ) {
		const recurIcon = new OO.ui.IconWidget( {
			icon: 'reload',
			title: mw.msg( 'appointments-ui-recurring-appointment' ),
			classes: [ 'appointments-fc-event-recurring-icon' ]
		} );
		container.appendChild( recurIcon.$element[ 0 ] );
	}

	return { domNodes: [ container ] };
};

SchedulerView.prototype.onEventDidMount = function ( info ) {
	const appointment = info.event.extendedProps.appointment;
	const color = appointment.eventType.getColor();
	if ( color in ext.appointments.CALENDAR_COLORS &&
		!ext.appointments.CALENDAR_COLORS[ color ]
	) {
		info.el.classList.add( 'appointments-fc-dark-text' );
	}
};

SchedulerView.prototype.formatEventRange = function ( eventApi ) {
	if ( !eventApi || !eventApi.start ) {
		return 'unknown';
	}

	const start = moment( eventApi.start );
	let end = eventApi.end ? moment( eventApi.end ) : null;

	if ( eventApi.allDay && end ) {
		end = end.clone().subtract( 1, 'day' );
	}

	if ( eventApi.allDay ) {
		if ( !end || start.isSame( end, 'day' ) ) {
			return { startDate: start.format( 'YYYY-MM-DD' ), endDate: start.format( 'YYYY-MM-DD' ) };
		}
		return { startDate: start.format( 'YYYY-MM-DD' ), endDate: end.format( 'YYYY-MM-DD' ) };
	}

	return {
		startDate: start.format( 'YYYY-MM-DD' ),
		startTime: start.format( 'HH:mm' ),
		endDate: end ? end.format( 'YYYY-MM-DD' ) : null,
		endTime: end ? end.format( 'HH:mm' ) : null
	}
};

SchedulerView.prototype.onEventChange = function ( info ) {
	const eventId = info.event && info.event.id ? info.event.id : 'unknown';
	const newRange = this.formatEventRange( info.event );
	const appointment = this.appointments.find( ( app ) => app.guid === eventId );
	if ( !appointment ) {
		return;
	}
	const oldPeriod = appointment.periodDefinition;
	const newPeriod = new PeriodDefinition(
		newRange.startDate, newRange.startTime || oldPeriod.getStartTime(),
		newRange.endDate, newRange.endTime || oldPeriod.getEndTime(),
		oldPeriod.isAllDay(), oldPeriod.getRecurrenceRule()
	);
	if ( appointment.periodDefinition.isEqual( newPeriod ) ) {
		return;
	}
	appointment.periodDefinition = newPeriod;
	ext.appointments.api.saveAppointment( appointment ).then( ( res ) => {
		if ( res ) {
			this.controller.dataProvider.onAppointmentChange( appointment );
		}
	} );
};

SchedulerView.prototype.onEventClick = function ( info ) {
	info.jsEvent.preventDefault();
	info.jsEvent.stopPropagation();

	if ( this.activePopup ) {
		this.activePopup.toggle( false );
		this.activePopup.$element.remove();
		this.activePopup = null;
	}

	this.hideAllOverflowPopups();

	const appointment = info.event.extendedProps.appointment;
	const viewer = new AppointmentViewer( { appointment: appointment } );

	const popup = new OO.ui.PopupWidget( {
		$floatableContainer: $( info.el ),
		$content: viewer.$element,
		padded: false,
		width: 500,
		position: 'after',
		autoClose: true,
		head: false,
		$overlay: true
	} );

	viewer.setPopup( popup );
	viewer.connect( this, {
		update: function ( app ) {
			this.controller.onAppointmentUpdate( app );
		},
		delete: function ( app ) {
			this.controller.onAppointmentDelete( app );
		}
	} );
	$( 'body' ).append( popup.$element );
	popup.toggle( true );
	this.activePopup = popup;
};

SchedulerView.prototype.getVisibleRange = function () {
	if ( !this.fc ) {
		return null;
	}

	const view = this.fc.view;
	return {
		start: moment( view.activeStart ).format( 'YYYY-MM-DD' ),
		end: moment( view.activeEnd ).subtract( 1, 'day' ).format( 'YYYY-MM-DD' )
	};
};

SchedulerView.prototype.setData = function ( data ) {
	if ( !this.fc ) {
		return;
	}

	this.clearOverflowPopups();
	this.fc.removeAllEvents();

	data.forEach( ( appointment ) => {
		const start = appointment.periodDefinition.getStartDate();
		const end = appointment.periodDefinition.getEndDate();
		const isAllDay = appointment.periodDefinition.isAllDay();
		const isMultiDay = appointment.periodDefinition.isMultiDay();
		const fcEvent = {
			id: appointment.guid,
			group: appointment.periodDefinition.getRecurrenceRule() ? appointment.guid : null,
			title: appointment.title,
			start: isAllDay ? start : start + 'T' + appointment.periodDefinition.getStartTime(),
			allDay: isAllDay || isMultiDay,
			backgroundColor: appointment.eventType.getColor(),
			borderColor: appointment.eventType.getColor(),
			extendedProps: { appointment: appointment }
		};
		if ( appointment.periodDefinition.getRecurrenceRule() ) {
			fcEvent.startEditable = false;
			fcEvent.durationEditable = true;
		}

		// FullCalendar end is exclusive for all-day events
		if ( isAllDay || isMultiDay ) {
			const endDate = new Date( end );
			endDate.setDate( endDate.getDate() + 1 );
			fcEvent.end = endDate.toISOString().slice( 0, 10 );
		} else {
			fcEvent.end = end + 'T' + ( appointment.periodDefinition.getEndTime() || '23:59' );
		}
		this.fc.addEvent( fcEvent );
	} );
	this.appointments = data;
};

module.exports = SchedulerView;
