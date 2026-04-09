const Calendar = require( '../object/Calendar.js' );

const calendarEditor = function ( config ) {
	calendarEditor.parent.call( this, $.extend( {
		expanded: false,
		padded: true
	}, config ) );

	this.calendar = config.calendar;
	this.dirty = !this.calendar;
	this.dialog = null;
};

OO.inheritClass( calendarEditor, OO.ui.PanelLayout );

calendarEditor.prototype.setDialog = function ( dialog ) {
	this.dialog = dialog;
};

calendarEditor.prototype.onReady = function () {
	// NOOP
};

calendarEditor.prototype.getLabel = function () {
	if ( this.calendar ) {
		return mw.message( 'appointments-ui-edit-calendar' ).text()
	} else {
		return mw.message( 'appointments-ui-create-calendar' ).text()
	}
};

calendarEditor.prototype.focus = function () {
	this.name.focus();
};

calendarEditor.prototype.init = function () {
	this.name = new OO.ui.TextInputWidget( {
		required: true,
		value: this.calendar ? this.calendar.name : '',
	} );
	this.description = new OO.ui.MultilineTextInputWidget( {
		value: this.calendar ? this.calendar.description : '',
		rows: 2
	} );

	this.$element.append(
		new OO.ui.FieldLayout( this.name, {
			label: mw.message( 'appointments-ui-field-calendar-name' ).text(),
		} ).$element,
		new OO.ui.FieldLayout( this.description, {
			label: mw.message( 'appointments-ui-field-calendar-description' ).text(),
		} ).$element
	);
};

calendarEditor.prototype.isDirty = function () {
	return this.dirty;
};

calendarEditor.prototype.save = async function ( entity ) {
	await ext.appointments.api.saveCalendar( entity );
};

calendarEditor.prototype.getUpdatedEntity = function () {
	if ( !this.calendar ) {
		this.calendar = new Calendar();
	}

	if ( this.name.getValue() !== this.calendar.name ) {
		this.dirty = true;
		this.calendar.name = this.name.getValue();
	}
	if ( this.description.getValue() !== this.calendar.description ) {
		this.dirty = true;
		this.calendar.description = this.description.getValue();
	}

	return this.calendar;
};

module.exports = calendarEditor;