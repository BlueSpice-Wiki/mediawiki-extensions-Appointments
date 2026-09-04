const CalendarPicker = require( './CalendarPicker.js' );

const addExistingCalendarEditor = function ( config ) {
	addExistingCalendarEditor.parent.call( this, $.extend( {
		expanded: false,
		padded: true
	}, config ) );

	this.dirty = true;
	this.dialog = null;
};

OO.inheritClass( addExistingCalendarEditor, OO.ui.PanelLayout );

addExistingCalendarEditor.prototype.setDialog = function ( dialog ) {
	this.dialog = dialog;
};

addExistingCalendarEditor.prototype.onReady = function () {
	// NOOP
};

addExistingCalendarEditor.prototype.getLabel = function () {
	return mw.message( 'appointments-ui-create-predefined-calendar' ).text();
};

addExistingCalendarEditor.prototype.getSaveLabel = function () {
	return mw.message( 'appointments-ui-action-add' ).text();
};

addExistingCalendarEditor.prototype.focus = function () {
	this.calendarPicker.focus();
};

addExistingCalendarEditor.prototype.init = function () {
	this.calendarPicker = new CalendarPicker( {
		onlyAssigned: false,
		onlyUnassigned: true,
		autoLoad: true,
		$overlay: this.dialog.$overlay,
		noneLabel: mw.message( 'appointments-ui-field-add-existing-calendar-none-label' ).text(),
	} );
	this.calendarPicker.connect( this, {
		change: 'onInputChange',
		empty: () => {
			this.dialog.actions.setAbilities( { 'save': false } );
		}
	} );

	this.$element.append(
		new OO.ui.FieldLayout( this.calendarPicker, {
			label: mw.message( 'appointments-ui-field-calendar-label' ).text(),
			align: 'top',
			classes: [ 'appointments-add-existing-calendar-editor' ]
		} ).$element
	);
};

addExistingCalendarEditor.prototype.isDirty = function () {
	return this.dirty;
};

addExistingCalendarEditor.prototype.save = async function ( entity ) {
	await ext.appointments.api.assignCalendar( entity );
};

addExistingCalendarEditor.prototype.onInputChange = function () {
	this.dirty = true;
	if ( this.dialog ) {
		this.dialog.updateSize();
	}
};

addExistingCalendarEditor.prototype.isValid = function () {
	return !!this.calendarPicker.getValue();
};

addExistingCalendarEditor.prototype.getUpdatedEntity = function () {
	return this.calendarPicker.getSelectedCalendar();
};

module.exports = addExistingCalendarEditor;
