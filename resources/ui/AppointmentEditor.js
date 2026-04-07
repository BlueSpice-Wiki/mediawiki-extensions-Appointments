const appointmentEditor = function ( config ) {
	appointmentEditor.parent.call( this, $.extend( {
		expanded: false,
		padded: true
	}, config ) );

	this.appointment = config.appointment;
	this.dirty = !this.appointment;
	this.dialog = null;
};

OO.inheritClass( appointmentEditor, OO.ui.PanelLayout );

appointmentEditor.prototype.setDialog = function ( dialog ) {
	this.dialog = dialog;
};

appointmentEditor.prototype.getLabel = function () {
	if ( this.appointment ) {
		return mw.message( 'appointments-ui-edit-appointment' ).text()
	} else {
		return mw.message( 'appointments-ui-create-appointment' ).text()
	}
};

appointmentEditor.prototype.focus = function () {
	this.name.focus();
};

appointmentEditor.prototype.init = function () {
	this.name = new OO.ui.TextInputWidget( {
		required: true,
		value: this.calendar ? this.calendar.name : '',
	} );
	this.calendar = new ( require( './CalendarPicker.js' ) )( {
		$overlay: this.dialog ? this.dialog.$overlay : true
	} );
	this.calendar.load();


	this.$element.append(
		new OO.ui.FieldLayout( this.name, {
			label: mw.message( 'appointments-ui-field-appointment-name' ).text(),
		} ).$element,
		new OO.ui.FieldLayout( this.calendar, {
			label: mw.message( 'appointments-ui-field-calendar-name' ).text(),
		} ).$element
	);
};

appointmentEditor.prototype.isDirty = function () {
	return this.dirty;
};

appointmentEditor.prototype.save = async function ( entity ) {
	await ext.appointments.api.saveAppointment( entity );
};

appointmentEditor.prototype.getUpdatedEntity = function () {
	if ( !this.appointment ) {
		this.appointment = new ( require( '../object/Appointment.js' ) )();
	}

	if ( this.name.getValue() !== this.appointment.name ) {
		this.dirty = true;
		this.appointment.name = this.name.getValue();
	}
	if ( this.calendar.getValue() !== this.appointment.calendar ) {
		this.dirty = true;
		this.appointment.calendar = this.calendar.getValue();
	}

	return this.appointment;
};

module.exports = appointmentEditor;