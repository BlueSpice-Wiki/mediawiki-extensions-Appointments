const AppointmentViewer = require( './AppointmentViewer.js' );

const appointmentEntry = function (appointment, cell) {
	this.viewer = new AppointmentViewer( { appointment: appointment } );
	this.viewer.connect( this, {
		update: ( appointment ) => { this.emit( 'update', appointment ) },
		delete: ( appointment ) => { this.emit( 'delete', appointment ) }
	} );
	appointmentEntry.parent.call( this, {
		framed: false,
		floatableContainer: $( cell ),
		$overlay: true,
		popup: {
			head: false,
			//position: 'after',
			$content: this.viewer.$element,
			width: 500
		},
		classes: [ 'appointment-entry-popup-button' ]
	} );
	this.viewer.setPopup( this.popup );

	this.appointment = appointment;
	this.startTimeLabel = new OO.ui.LabelWidget( {
		classes: [ 'appointment-entry-start-time' ]
	} );

	if ( !appointment.periodDefinition.isAllDay() ) {
		this.startTimeLabel.setLabel(appointment.periodDefinition.getStartTime());
	}
	if ( appointment.periodDefinition.getRecurrenceRule() ) {
		this.startTimeLabel.$element.append(
			new OO.ui.IconWidget( {
				icon: 'reload',
				title: mw.msg( 'appointments-ui-recurring-appointment' ),
				classes: [ 'appointment-entry-recurring-icon' ]
			} ).$element
		);
	}

	this.setLabel( appointment.title );
	this.$label.addClass( 'appointment-entry-title' );
	this.setTitle( appointment.title );

	const icon = appointment.eventType.getIcon();
	if ( icon ) {
		this.setIcon( icon );
	}

	this.$button.prepend( this.startTimeLabel.$element );
	this.$element.addClass( 'appointment-entry' );
	this.$element.attr( 'data-appointment', appointment.guid );
	this.$element.attr( 'data-calendar', appointment.calendar.guid );
	if ( appointment.periodDefinition.isAllDay() ) {
		this.$element.addClass( 'appointment-entry-all-day' );
	}
	if ( appointment.periodDefinition.isMultiDay() ) {
		this.$element.addClass('appointment-entry-multi-day');
	}

	this.$element.on( {
		mouseenter: this.onMouseEnter.bind( this ),
		mouseleave: this.onMouseLeave.bind( this )
	} );

	const color = appointment.eventType.getColor();
	if ( color in ext.appointments.CALENDAR_COLORS && !ext.appointments.CALENDAR_COLORS[ color ] ) {
		this.$element.addClass( 'dark-text' );
	}
	this.$element.css( 'background-color', color );

};

OO.inheritClass( appointmentEntry, OO.ui.PopupButtonWidget );

appointmentEntry.prototype.onMouseEnter = function () {
	this.toggleSelectedState( true );
};

appointmentEntry.prototype.onMouseLeave = function ( event ) {
	const relatedTarget = event.relatedTarget ||
		( event.originalEvent && event.originalEvent.relatedTarget );
	const relatedEntry = relatedTarget && relatedTarget.nodeType === Node.ELEMENT_NODE ?
		relatedTarget.closest( '.appointment-entry' ) :
		null;

	if (
		relatedEntry &&
		relatedEntry.getAttribute( 'data-appointment' ) === this.appointment.guid
	) {
		return;
	}

	this.toggleSelectedState( false );
};

appointmentEntry.prototype.toggleSelectedState = function ( selected ) {
	const $scheduler = this.$element.closest( '.ext-appointments-scheduler' );
	const root = $scheduler.length ? $scheduler[ 0 ] : document;

	root.querySelectorAll( '.appointment-entry[data-appointment]' ).forEach( ( element ) => {
		if ( element.getAttribute( 'data-appointment' ) === this.appointment.guid ) {
			element.classList.toggle( 'selected', selected );
		}
	} );
};

module.exports = appointmentEntry;
