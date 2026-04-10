const AppointmentViewer = require( './AppointmentViewer.js' );

const appointmentEntry = function (appointment) {
	this.viewer = new AppointmentViewer( { appointment: appointment } );
	this.viewer.connect( this, {
		update: () => { this.emit( 'change' ) },
		delete: () => { this.emit( 'change' ) }
	} );
	appointmentEntry.parent.call( this, {
		framed: false,
		popup: {
			head: false,
			position: 'after',
			$content: this.viewer.$element,
			$overlay: true,
			width: 500
		}
	} );

	this.appointment = appointment;
	this.startTimeLabel = new OO.ui.LabelWidget( {
		classes: [ 'appointment-entry-start-time' ]
	} );

	if ( !appointment.periodDefinition.isAllDay() ) {
		this.startTimeLabel.setLabel(appointment.periodDefinition.getStartTime());
	}

	this.setLabel( appointment.title );
	this.$label.addClass( 'appointment-entry-title' );

	this.$button.prepend( this.startTimeLabel.$element );
	this.$element.addClass( 'appointment-entry' );
	this.$element.attr( 'data-appointment', appointment.guid );
	this.$element.attr( 'data-calendar', appointment.calendar.guid );
};

OO.inheritClass( appointmentEntry, OO.ui.PopupButtonWidget );

module.exports = appointmentEntry;