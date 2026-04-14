const appointmentTime = require( './util/AppointmentTime.js' );
const Appointment = require( '../object/Appointment.js' );
const Participant = require( '../object/Participant.js' );
const Calendar = require( '../object/Calendar.js' );
const CalendarPicker = require( './CalendarPicker.js' );
const EventTypePicker = require( './EventTypePicker.js' );
const EventType = require( './../object/EventType.js' );

const appointmentEditor = function ( config ) {
	appointmentEditor.parent.call( this, $.extend( {
		expanded: false,
		padded: true
	}, config ) );

	this.appointment = config.appointment;
	this.dirty = !this.appointment;
	this.dialog = null;
	this.defaultDate = config.defaultDate || null;
};

OO.inheritClass( appointmentEditor, OO.ui.PanelLayout );

appointmentEditor.prototype.setDialog = function ( dialog ) {
	this.dialog = dialog;
};

appointmentEditor.prototype.onReady = function () {
	this.setAbilities();
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
	const appointmentData = this.appointment ? this.appointment.data || {} : {};

	this.name = new OO.ui.TextInputWidget( {
		required: true,
		value: this.appointment ? this.appointment.title : '',
	} );
	this.name.connect( this, { change: 'onInputChange' } );

	this.calendar = new CalendarPicker( {
		$overlay: this.dialog ? this.dialog.$overlay : true,
		value: this.appointment && this.appointment.calendar ? this.appointment.calendar.guid : null,
	} );
	this.calendar.connect( this, {
		select: () => {
			this.eventType.load( this.calendar.getSelectedCalendar() );
			this.onInputChange();
		}
	} );

	this.eventType = new EventTypePicker(
		this.appointment && this.appointment.eventType ? this.appointment.eventType.guid : null,
		appointmentData
	);
	this.eventType.connect( this, {
		select: 'onInputChange',
		selectEventType: ( eventType ) => {
			this.setupCustomPanel( eventType );
		},
		typeCustomPanelChange: 'onInputChange'
	} );

	this.calendar.load();

	this.participants = new OOJSPlus.ui.widget.UserGroupMultiselectWidget( {
		$overlay: this.dialog ? this.dialog.$overlay : true,
		placeholder: mw.message( 'appointments-ui-field-participants-placeholder' ).text(),
	} );
	if ( this.appointment && this.appointment.participants ) {
		this.participants.setValue( this.appointment.participants.map( participant => ( {
			key: participant.getValue(),
			type: participant.getKey()
		} ) ) );
	}
	this.participants.connect( this, {
		change: () => {
			this.dialog.updateSize();
			this.onInputChange();
		}
	} );

	this.time = new appointmentTime(
		this.appointment ? this.appointment.periodDefinition : null, {
			dialog: this.dialog,
			defaultDate: this.defaultDate
		}
	);
	if ( this.appointment && this.appointment.periodDefinition ) {
		this.time.setValue( this.appointment.periodDefinition );
	}
	this.time.connect( this, {
		change: () => {
			this.onInputChange();
		}
	} );

	this.notifyInAdvance = new OO.ui.CheckboxInputWidget( {
		value: appointmentData.notifyInAdvance || false,
	} );
	this.notifyInAdvance.connect( this, { change: 'onInputChange' } );

	this.$element.append(
		new OO.ui.FieldLayout( this.name, {
			label: mw.message( 'appointments-ui-field-appointment-name' ).text()
		} ).$element,
		new OO.ui.FieldLayout( this.calendar, {
			label: mw.message( 'appointments-ui-field-calendar-name' ).text()
		} ).$element,
		new OO.ui.FieldLayout( this.eventType, {
			label: mw.message( 'appointments-ui-field-event-type' ).text()
		} ).$element,
		new OO.ui.FieldLayout( this.participants, {
			label: mw.message( 'appointments-ui-field-participants' ).text()
		} ).$element,
		new OO.ui.FieldLayout( this.notifyInAdvance, {
			label: mw.message( 'appointments-ui-field-notify-in-advance' ).text()
		} ).$element,
		new OO.ui.FieldLayout( this.time, {
			label: mw.message( 'appointments-ui-field-time' ).text()
		} ).$element
	);

	this.setAbilities();
};

appointmentEditor.prototype.isDirty = function () {
	return this.dirty;
};

appointmentEditor.prototype.save = async function ( entity ) {
	await ext.appointments.api.saveAppointment( entity );
};

appointmentEditor.prototype.getUpdatedEntity = function () {
	if ( !this.appointment ) {
		this.appointment = new Appointment(null );
	}

	this.appointment.title = this.name.getValue();
	this.appointment.calendar = new Calendar( this.calendar.getValue() );
	this.appointment.eventType = new EventType( this.eventType.getValue() );
	const data = this.appointment.data || {};
	if ( this.eventTypeCustomPanel && this.eventTypeObject ) {
		Object.assign( data, this.eventTypeObject.getCustomFieldValues( this.eventTypeCustomPanel ) );
	}
	data.notifyInAdvance = this.notifyInAdvance.getValue();
	this.appointment.data = data;

	this.appointment.participants = this.participants.getValue()
		.map( item => new Participant( item.type, item.key ) );
	this.appointment.periodDefinition = this.time.getValue();

	return this.appointment;
};

appointmentEditor.prototype.onInputChange = function () {
	this.dirty = true;
	this.setAbilities();
};

appointmentEditor.prototype.setAbilities = function () {
	if ( this.dialog ) {
		if (
			this.name.getValue() &&
			this.calendar.getValue() &&
			this.time.isValid() &&
			this.eventType.getValue()
		) {
			this.dialog.actions.setAbilities( { save: true } );
		} else {
			this.dialog.actions.setAbilities( { save: false } );
		}
	}
};

appointmentEditor.prototype.setupCustomPanel = function ( eventType ) {
	if ( this.eventTypeCustomPanel ) {
		this.eventTypeCustomPanel.disconnect( this );
		this.eventTypeCustomPanel.$element.remove();
	}
	this.eventTypeObject = eventType;
	const editPanel = eventType.getEditPanel( this.appointment ? this.appointment.data : {} );
	if ( editPanel ) {
		this.eventTypeCustomPanel = editPanel;
		this.eventTypeCustomPanel.connect( this, {
			change: 'onInputChange'
		} );
		this.$element.append( this.eventTypeCustomPanel.$element );
	}
	this.dialog.updateSize();
};

module.exports = appointmentEditor;
