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
			width: 500
		}
	} );

	this.appointment = appointment;

	this.startTimeLabel = new OO.ui.LabelWidget( {
		label: appointment.periodDefinition.getStartTime(),
		classes: [ 'appointment-entry-start-time' ]
	} );
	this.setLabel( appointment.title );
	this.$label.addClass( 'appointment-entry-title' );

	this.$button.prepend( this.startTimeLabel.$element );
	this.$element.addClass( 'appointment-entry' );
};

OO.inheritClass( appointmentEntry, OO.ui.PopupButtonWidget );

module.exports = appointmentEntry;