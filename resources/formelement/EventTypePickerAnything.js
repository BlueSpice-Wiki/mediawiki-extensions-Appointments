const eventTypePickerAnything = function ( config ) {
	config = config || {};
	config.menu = config.menu || {};
	config.menu.filterFromInput = false;
	config.allowArbitrary = false;

	eventTypePickerAnything.parent.call( this, Object.assign( {}, config ) );
	OO.ui.mixin.PendingElement.call( this, Object.assign( {}, config, {
		$pending: this.$handle
	} ) );

	this.eventTypes = [];
	this.eventTypesByName = {};
	this.loaded = false;
	this.pendingValue = Object.prototype.hasOwnProperty.call( config, 'value' ) ?
		config.value :
		undefined;

	this.connect( this, {
		change: 'onMultiselectChange'
	} );
	this.menu.filterFromInput = false;

	this.load();
};

OO.inheritClass( eventTypePickerAnything, OO.ui.MenuTagMultiselectWidget );
OO.mixinClass( eventTypePickerAnything, OO.ui.mixin.PendingElement );

eventTypePickerAnything.static.tagName = 'div';

eventTypePickerAnything.prototype.getInternalValue = function () {
	return eventTypePickerAnything.parent.prototype.getValue.call( this );
};

eventTypePickerAnything.prototype.getValue = function () {
	return this.getInternalValue();
};

eventTypePickerAnything.prototype.load = function () {
	const valueToRestore = this.loaded ?
		this.getInternalValue().slice() :
		this.pendingValue;
	const wasDisabled = this.isDisabled();

	this.setDisabled( true );
	this.pushPending();

	return ext.appointments.api.getEventTypes()
		.then( ( eventTypes ) => {
			this.eventTypes = eventTypes || [];
			this.eventTypesByName = {};
			this.eventTypes.forEach( ( eventType ) => {
				this.eventTypesByName[ eventType.name ] = eventType;
			} );
			this.loaded = true;
			this.pendingValue = undefined;
			if ( valueToRestore !== undefined ) {
				this.setValue( valueToRestore );
			} else {
				this.updateMenuItems();
			}
		} )
		.then( () => {
			this.setDisabled( wasDisabled );
			this.popPending();
		} );
};

eventTypePickerAnything.prototype.filterEventTypes = function ( inputValue ) {
	const normalizedInput = inputValue.trim().toLowerCase();
	const selected = this.getInternalValue();

	return this.eventTypes.filter( ( eventType ) => {
		if ( selected.indexOf( eventType.name ) !== -1 ) {
			return false;
		}
		if ( normalizedInput === '' ) {
			return true;
		}

		return [
			eventType.name,
			eventType.description || ''
		].some( ( field ) => field.toLowerCase().indexOf( normalizedInput ) !== -1 );
	} );
};

eventTypePickerAnything.prototype.updateMenuItems = function () {
	if ( !this.loaded ) {
		return;
	}

	const inputValue = this.input.getValue();
	const items = this.filterEventTypes( inputValue ).map(
		( eventType ) => new OO.ui.MenuOptionWidget( {
			data: eventType.name,
			label: eventType.name,
			icon: eventType.getIcon()
		} )
	);

	this.menu.clearItems();
	this.menu.addItems( items );

	const firstSelectableItem = items[ 0 ];
	if ( firstSelectableItem ) {
		this.menu.$focusOwner.attr( 'aria-activedescendant', firstSelectableItem.$element.attr( 'id' ) );
	}
};

eventTypePickerAnything.prototype.onMenuChoose = function ( menuItem ) {
	const data = menuItem && menuItem.getData instanceof Function ?
		menuItem.getData() :
		null;

	if ( !data || !this.eventTypesByName[ data ] ) {
		return;
	}

	if ( this.getInternalValue().indexOf( data ) !== -1 ) {
		this.menu.toggle( false );
		this.input.setValue( '' );
		return;
	}

	this.addTag( data, data );
	this.input.setValue( '' );
	this.menu.toggle( false );
	this.updateMenuItems();
};

eventTypePickerAnything.prototype.setValue = function ( value ) {
	if ( !this.loaded ) {
		this.pendingValue = value;
		return;
	}

	const values = Array.isArray( value ) ? value : [ value ];
	const normalizedValues = values.filter( ( name ) =>
		typeof name === 'string' && this.eventTypesByName[ name ]
	);
	const originalAllowArbitrary = this.allowArbitrary;

	this.pendingValue = undefined;
	this.clearItems();
	this.allowArbitrary = true;

	normalizedValues.forEach( ( name ) => {
		this.addTag( name, name );
	} );

	this.allowArbitrary = originalAllowArbitrary;
	this.updateMenuItems();
	this.emit( 'change', this.getValue() );
};

eventTypePickerAnything.prototype.createTagItemWidget = function ( data, label ) {
	const eventType = this.eventTypesByName[ data ];
	if ( eventType ) {
		const tag = new OO.ui.TagItemWidget( {
			data: data,
			label: data
		} );
		tag.$element.prepend(
			new OO.ui.IconWidget( {
				icon: eventType.getIcon(),
				classes: [ 'option-icon' ]
			} ).$element,
			$( '<span>' ).addClass( 'option-color' ).css( 'background-color', eventType.getColor() )
		);
		tag.$element.addClass( 'entityType-menu-option' );
		return tag;
	}
	return new OO.ui.TagItemWidget( { data: data, label: label } );
};

eventTypePickerAnything.prototype.onInputFocus = function () {
	this.updateMenuItems();
	this.menu.toggle( true );
};

eventTypePickerAnything.prototype.onInputChange = function () {
	eventTypePickerAnything.parent.prototype.onInputChange.apply( this, arguments );
	this.updateMenuItems();
};

eventTypePickerAnything.prototype.onMultiselectChange = function () {
	this.input.setValue( '' );
	this.updateMenuItems();
};

// Form element registration
ext.appointments.ui.formelement.EventTypePickerAnythingElement = function () {
	ext.appointments.ui.formelement.EventTypePickerAnythingElement.parent.call( this );
};

OO.inheritClass(
	ext.appointments.ui.formelement.EventTypePickerAnythingElement,
	mw.ext.forms.formElement.InputFormElement
);

ext.appointments.ui.formelement.EventTypePickerAnythingElement.prototype.getElementConfig = function () {
	const config = ext.appointments.ui.formelement.EventTypePickerAnythingElement.parent.prototype
		.getElementConfigInternal.call( this );
	return this.returnConfig( config );
};

ext.appointments.ui.formelement.EventTypePickerAnythingElement.prototype.getType = function () {
	return 'appointment_event_type_multiselect';
};

ext.appointments.ui.formelement.EventTypePickerAnythingElement.prototype.getWidgets = function () {
	return {
		view: OO.ui.LabelWidget,
		edit: eventTypePickerAnything
	};
};

ext.appointments.ui.formelement.EventTypePickerAnythingElement.prototype.getDisplayName = function () {
	return mw.message( 'appointments-ui-event-type-picker' ).text();
};

mw.ext.forms.registry.Type.register(
	'appointment_event_type_multiselect',
	new ext.appointments.ui.formelement.EventTypePickerAnythingElement()
);