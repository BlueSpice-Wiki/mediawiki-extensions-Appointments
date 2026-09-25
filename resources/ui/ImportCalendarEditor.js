const importCalendarEditor = function ( config ) {
	importCalendarEditor.parent.call( this, $.extend( {
		expanded: false,
		padded: true
	}, config ) );

	this.dirty = true;
	this.dialog = null;
};

OO.inheritClass( importCalendarEditor, OO.ui.PanelLayout );

importCalendarEditor.prototype.setDialog = function ( dialog ) {
	this.dialog = dialog;
};

importCalendarEditor.prototype.onReady = function () {
	// NOOP
};

importCalendarEditor.prototype.getLabel = function () {
	return mw.message( 'appointments-ui-import-ics-calendar' ).text();
};

importCalendarEditor.prototype.getSaveLabel = function () {
	return mw.message( 'appointments-ui-action-import' ).text();
};

importCalendarEditor.prototype.focus = function () {
	this.url.focus();
};

importCalendarEditor.prototype.init = function () {
	this.name = new OO.ui.TextInputWidget( {
		required: true
	} );
	this.name.connect( this, { change: 'onInputChange' } );

	this.url = new OO.ui.MultilineTextInputWidget( {
		required: true,
		rows: 2
	} );
	this.url.connect( this, { change: 'onInputChange' } );

	this.$element.append(
		new OO.ui.FieldLayout( this.name, {
			label: mw.message( 'appointments-ui-field-calendar-name' ).text(),
		} ).$element,
		new OO.ui.FieldLayout( this.url, {
			label: mw.message( 'appointments-ui-field-calendar-ics-url' ).text(),
		} ).$element
	);
};

importCalendarEditor.prototype.isDirty = function () {
	return this.dirty;
};

importCalendarEditor.prototype.save = async function ( entity ) {
	await ext.appointments.api.importCalendar( entity.type, entity.data );
};

importCalendarEditor.prototype.onInputChange = function () {
	this.dirty = true;
	if ( this.dialog ) {
		this.dialog.updateSize();
	}
}

importCalendarEditor.prototype.isValid = function() {
	return this.name.getValue() && this.url.getValue() && this.isValidUrl( this.url.getValue() );
};

importCalendarEditor.prototype.isValidUrl = function( url ) {
	try {
		new URL( url );
		return true;
	} catch ( e ) {
		return false;
	}
};

importCalendarEditor.prototype.getUpdatedEntity = function () {
	return { type: 'ics', data: { name: this.name.getValue(), url: this.url.getValue() } };
};

module.exports = importCalendarEditor;