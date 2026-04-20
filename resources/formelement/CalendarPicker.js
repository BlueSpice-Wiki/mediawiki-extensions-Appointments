const CalendarPicker = require( '../ui/CalendarPicker.js' );

ext.appointments.ui.formelement.CalendarPickerElement = function () {
	ext.appointments.ui.formelement.CalendarPickerElement.parent.call( this );
};

OO.inheritClass( ext.appointments.ui.formelement.CalendarPickerElement, mw.ext.forms.formElement.InputFormElement );

ext.appointments.ui.formelement.CalendarPickerElement.prototype.getElementConfig = function () {
	const config = ext.appointments.ui.formelement.CalendarPickerElement.parent.prototype.getElementConfigInternal.call( this );
	return this.returnConfig( config );
};

ext.appointments.ui.formelement.CalendarPickerElement.prototype.getType = function () {
	return 'appointment_calendar';
};

ext.appointments.ui.formelement.CalendarPickerElement.prototype.getWidgets = function () {
	return {
		view: OO.ui.LabelWidget,
		edit: CalendarPicker
	};
};

ext.appointments.ui.formelement.CalendarPickerElement.prototype.getDisplayName = function () {
	return mw.message( 'appointments-ui-calendar-picker' ).text();
};

mw.ext.forms.registry.Type.register( 'appointment_calendar', new ext.appointments.ui.formelement.CalendarPickerElement() );