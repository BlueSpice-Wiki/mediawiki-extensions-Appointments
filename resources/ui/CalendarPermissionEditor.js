const calendarPermissionEditor = function ( config ) {
	calendarPermissionEditor.parent.call( this, $.extend( {
		expanded: false,
		padded: true
	}, config ) );

	this.calendar = config.calendar;
	this.dirty = false;
	this.dialog = null;

	this.$element.addClass( 'calendar-permission-editor' );
};

OO.inheritClass( calendarPermissionEditor, OO.ui.PanelLayout );

calendarPermissionEditor.prototype.setDialog = function ( dialog ) {
	this.dialog = dialog;
};

calendarPermissionEditor.prototype.onReady = function () {
	// NOOP
};

calendarPermissionEditor.prototype.getLabel = function () {
	return mw.msg( 'appointments-ui-edit-calendar-permissions' );
};

calendarPermissionEditor.prototype.focus = function () {
	// NOOP
};

calendarPermissionEditor.prototype.init = function () {
	this.disclaimer = new OO.ui.MessageWidget( {
		type: 'info',
		label: mw.msg( 'appointments-ui-calendar-permissions-disclaimer' )
	} );
	this.disclaimer.$element.css( 'margin-top', '1em' );

	const calendarData = this.calendar.data || {};
	const access = calendarData.access || { readers: [], editors: [], deleters: [] };

	this.readers = new OOJSPlus.ui.widget.UserGroupMultiselectWidget( {
		$overlay: this.dialog ? this.dialog.$overlay : true,
		placeholder: mw.msg( 'appointments-ui-calendar-permissions-role-reader-placeholder' )
	} );
	this.readers.connect( this, { change: ( value ) => this.onChange( this.readers, value ) } );
	if ( access.readers ) {
		this.readers.setValue( access.readers );
	}
	this.editors = new OOJSPlus.ui.widget.UserGroupMultiselectWidget( {
		$overlay: this.dialog ? this.dialog.$overlay : true,
		placeholder: mw.msg( 'appointments-ui-calendar-permissions-role-edit-delete-placeholder' )
	} );
	this.editors.connect( this, { change: ( value ) => this.onChange( this.editors, value ) } );
	if ( access.editors ) {
		this.editors.setValue( access.editors );
	}
	this.deleters = new OOJSPlus.ui.widget.UserGroupMultiselectWidget( {
		$overlay: this.dialog ? this.dialog.$overlay : true,
		placeholder: mw.msg( 'appointments-ui-calendar-permissions-role-edit-delete-placeholder' )
	} );
	this.deleters.connect( this, { change: ( value ) => this.onChange( this.deleters, value ) } );
	if ( access.deleters ) {
		this.deleters.setValue( access.deleters );
	}

	this.readersLayout = new OO.ui.FieldLayout( this.readers, {
		label: mw.msg( 'appointments-ui-calendar-permissions-role-reader' ),
		align: 'top'
	} );
	this.editorsLayout = new OO.ui.FieldLayout( this.editors, {
		label: mw.msg( 'appointments-ui-calendar-permissions-role-editor' ),
		align: 'top'
	} );
	this.deletersLayout = new OO.ui.FieldLayout( this.deleters, {
		label: mw.msg( 'appointments-ui-calendar-permissions-role-deleter' ),
		align: 'top'
	} );

	this.$element.append(
		this.readersLayout.$element,
		this.editorsLayout.$element,
		this.deletersLayout.$element,
		this.disclaimer.$element,
	);
};

calendarPermissionEditor.prototype.isDirty = function () {
	return this.dirty;
};

calendarPermissionEditor.prototype.save = async function ( entity ) {
	await ext.appointments.api.saveCalendar( entity );
};

calendarPermissionEditor.prototype.getUpdatedEntity = function () {
	const readers = this.readers.getValue();
	const editors = this.editors.getValue();
	const deleters = this.deleters.getValue();
	let type = 'edit';
	if ( readers.length > 0 ) {
		type = 'read_edit';
	} else if ( editors.length === 0 && deleters.length === 0 ) {
		type = 'none';
	}
	this.calendar.setRestrictions( type, readers, editors, deleters );

	return this.calendar;
};

calendarPermissionEditor.prototype.onChange = function( picker, value ) {
	if ( value.length === 0 ) {
		picker.inputPlaceholder = picker === this.readers ?
			mw.msg( 'appointments-ui-calendar-permissions-role-reader-placeholder' ) :
			mw.msg( 'appointments-ui-calendar-permissions-role-edit-delete-placeholder' );
		picker.input.$input.attr( 'placeholder', picker.inputPlaceholder );
	} else {
		picker.input.$input.attr( 'placeholder', '' );
		picker.inputPlaceholder = '';
	}
	this.dialog.updateSize();
	this.dirty = true;
};

module.exports = calendarPermissionEditor;
