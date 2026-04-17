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
	const access = calendarData.access || { type: 'none', readers: [], editors: [], deleters: [] };

	const icons = {
		none: { icon: 'unLock' },
		edit: { icon: 'lock' },
		read_edit: { icon: 'lock', flags: [ 'destructive' ] },
	};

	this.accessType = new OO.ui.DropdownWidget( {
		$overlay: this.dialog ? this.dialog.$overlay : true,
		icon: icons[access.type].icon,
		menu: {
			items: [
				new OO.ui.MenuOptionWidget( Object.assign( {
					label: mw.msg( 'appointments-ui-calendar-permissions-nothing' ),
					data: 'none'
				}, icons.none ) ),
				new OO.ui.MenuOptionWidget( Object.assign( {
					label: mw.msg( 'appointments-ui-calendar-permissions-edit' ),
					data: 'edit'
				}, icons.edit ) ),
				new OO.ui.MenuOptionWidget( Object.assign( {
					label: mw.msg( 'appointments-ui-calendar-permissions-read-edit' ),
					data: 'read_edit'
				}, icons.read_edit ) ),
			]
		}
	} );
	this.accessType.menu.selectItemByData( access.type );
	this.accessType.menu.connect( this, {
		select: ( item ) => {
			this.setControlVisibility( item.getData() );
			this.accessType.setIcon( icons[item.getData()].icon );
			this.dialog.updateSize();
			this.dirty = true;
		}
	} );

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
		console.log( access.editors );
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
		this.accessType.$element,
		this.readersLayout.$element,
		this.editorsLayout.$element,
		this.deletersLayout.$element,
		this.disclaimer.$element,
	);

	this.setControlVisibility( access.type );
};

calendarPermissionEditor.prototype.isDirty = function () {
	return this.dirty;
};

calendarPermissionEditor.prototype.save = async function ( entity ) {
	await ext.appointments.api.saveCalendar( entity );
};

calendarPermissionEditor.prototype.getUpdatedEntity = function () {
	const type = this.accessType.menu.findSelectedItem().getData();

	if ( type === 'none' ) {
		this.calendar.setRestrictions( 'none', [], [], [] );
		return this.calendar;
	}

	const readers = this.readers.getValue();
	const editors = this.editors.getValue();
	const deleters = this.deleters.getValue();

	if ( type === 'edit' ) {
		this.calendar.setRestrictions( 'edit', [], editors, deleters );
		return this.calendar;
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

calendarPermissionEditor.prototype.setControlVisibility = function ( accessType ) {
	if ( accessType === 'none' ) {
		this.readersLayout.$element.hide();
		this.editorsLayout.$element.hide();
		this.deletersLayout.$element.hide();
		this.disclaimer.$element.hide();
	} else if ( accessType === 'edit' ) {
		this.readersLayout.$element.hide();
		this.editorsLayout.$element.show();
		this.deletersLayout.$element.show();
		this.disclaimer.$element.show();
	} else {
		this.readersLayout.$element.show();
		this.editorsLayout.$element.show();
		this.deletersLayout.$element.show();
		this.disclaimer.$element.show();
	}
};

module.exports = calendarPermissionEditor;
