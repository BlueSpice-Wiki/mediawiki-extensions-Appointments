const EventTypePicker = require( '../ui/EventTypePicker.js' );

ext.appointments.ui.formelement.EventTypePickerElement = function () {
	ext.appointments.ui.formelement.EventTypePickerElement.parent.call( this );
};

OO.inheritClass( ext.appointments.ui.formelement.EventTypePickerElement, mw.ext.forms.formElement.InputFormElement );

ext.appointments.ui.formelement.EventTypePickerElement.prototype.getElementConfig = function () {
	const config = ext.appointments.ui.formelement.EventTypePickerElement.parent.prototype.getElementConfigInternal.call( this );
	return this.returnConfig( config );
};

ext.appointments.ui.formelement.EventTypePickerElement.prototype.getType = function () {
	return 'appointment_event_type_multiselect';
};

ext.appointments.ui.formelement.EventTypePickerElement.prototype.getWidgets = function () {
	return {
		view: OO.ui.LabelWidget,
		edit: EventTypePicker
	};
};

ext.appointments.ui.formelement.EventTypePickerElement.prototype.getDisplayName = function () {
	return mw.message( 'appointments-ui-event-type-picker' ).text();
};

mw.ext.forms.registry.Type.register( 'appointment_event_type_multiselect', new ext.appointments.ui.formelement.EventTypePickerElement() );