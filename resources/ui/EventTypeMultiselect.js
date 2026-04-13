const { EventTypeMenuOption, EventTypeTag, NewEventTypeMenuOption } = require( './util/EventTypeMenuOptions.js' );

const eventTypeMultiselect = function ( config ) {
	config = config || {};
	config.menu = config.menu || {};
	config.menu.filterFromInput = false;
	config.allowArbitrary = false;

	eventTypeMultiselect.parent.call( this, Object.assign( {}, config ) );
	OO.ui.mixin.PendingElement.call( this, Object.assign( {}, config, {
		$pending: this.$handle
	} ) );

	this.eventTypes = [];
	this.eventTypesByGuid = {};
	this.loaded = false;
	this.pendingValue = Object.prototype.hasOwnProperty.call( config, 'value' ) ?
		config.value :
		undefined;
	this.previousTagValue = this.getInternalValue().join( '\n' );

	if ( 'name' in config ) {
		this.$hiddenInput = $( '<textarea>' )
			.addClass( 'oo-ui-element-hidden' )
			.attr( 'name', config.name )
			.appendTo( this.$element );
		this.updateHiddenInput();
		this.$hiddenInput.prop( 'defaultValue', JSON.stringify( this.getValue() ) );
	}

	this.connect( this, {
		change: 'onMultiselectChange'
	} );
	this.menu.filterFromInput = false;
};

OO.inheritClass( eventTypeMultiselect, OO.ui.MenuTagMultiselectWidget );
OO.mixinClass( eventTypeMultiselect, OO.ui.mixin.PendingElement );

eventTypeMultiselect.static.tagName = 'div';

eventTypeMultiselect.prototype.getInternalValue = function () {
	return eventTypeMultiselect.parent.prototype.getValue.call( this );
};

eventTypeMultiselect.prototype.normalizeValueItem = function ( item ) {
	if ( !item ) {
		return null;
	}
	if ( typeof item === 'string' ) {
		return item;
	}
	if ( typeof item === 'object' && item.guid ) {
		return item.guid;
	}

	return null;
};

eventTypeMultiselect.prototype.getSelectedEventTypes = function () {
	return this.getInternalValue()
		.map( ( guid ) => this.eventTypesByGuid[ guid ] )
		.filter( ( eventType ) => !!eventType );
};

eventTypeMultiselect.prototype.load = function () {
	const valueToRestore = this.loaded ?
		this.getInternalValue().slice() :
		this.pendingValue;
	const wasDisabled = this.isDisabled();

	this.setDisabled( true );
	this.pushPending();

	return ext.appointments.api.getEventTypes()
		.then( ( eventTypes ) => {
			this.eventTypes = eventTypes || [];
			this.eventTypesByGuid = {};
			this.eventTypes.forEach( ( eventType ) => {
				this.eventTypesByGuid[ eventType.guid ] = eventType;
			} );
			this.loaded = true;
			this.pendingValue = undefined;
			if ( valueToRestore !== undefined ) {
				this.setValue( valueToRestore );
			} else {
				this.updateMenuItems();
			}
		} )
		/*.catch( ( error ) => {
			mw.notify( error.message || String( error ), { type: 'error' } );
			this.menu.clearItems();
			this.menu.toggle( false );
		} )*/
		.then( () => {
			this.setDisabled( wasDisabled );
			this.popPending();
		} );
};

eventTypeMultiselect.prototype.filterEventTypes = function ( inputValue ) {
	const normalizedInput = inputValue.trim().toLowerCase();
	const selected = this.getInternalValue();

	return this.eventTypes.filter( ( eventType ) => {
		if ( selected.indexOf( eventType.guid ) !== -1 ) {
			return false;
		}
		if ( normalizedInput === '' ) {
			return true;
		}

		return [
			eventType.guid,
			eventType.name,
			eventType.description || ''
		].some( ( field ) => field.toLowerCase().indexOf( normalizedInput ) !== -1 );
	} );
};

eventTypeMultiselect.prototype.updateMenuItems = function () {
	if ( !this.loaded ) {
		return;
	}

	const inputValue = this.input.getValue();
	const items = this.filterEventTypes( inputValue ).map(
		( eventType ) => new EventTypeMenuOption( eventType )
	);
	const newEventTypeOption = new NewEventTypeMenuOption();

	newEventTypeOption.connect( this, {
		eventTypeCreated: ( eventType ) => {
			this.emit( 'datasetUpdate', eventType );
			this.load().then( () => {
				this.menu.toggle( true );
			} );
		}
	} );
	items.push( newEventTypeOption );

	this.menu.clearItems();
	this.menu.addItems( items );

	const firstSelectableItem = items[ 0 ];
	if ( firstSelectableItem ) {
		this.menu.$focusOwner.attr( 'aria-activedescendant', firstSelectableItem.$element.attr( 'id' ) );
	}
};

eventTypeMultiselect.prototype.onMenuChoose = function ( menuItem ) {
	const data = menuItem && menuItem.getData instanceof Function ?
		menuItem.getData() :
		null;

	if ( data === '_create' ) {
		this.menu.toggle( false );
		this.input.setValue( '' );
		menuItem.onSelect();
		return;
	}

	if ( !data || !this.eventTypesByGuid[ data ] ) {
		return;
	}

	if ( this.getInternalValue().indexOf( data ) !== -1 ) {
		this.menu.toggle( false );
		this.input.setValue( '' );
		return;
	}

	this.addTag( data, this.eventTypesByGuid[ data ].name );
	this.input.setValue( '' );
	this.menu.toggle( false );
	this.updateMenuItems();
};

eventTypeMultiselect.prototype.setValue = function ( value ) {
	if ( !this.loaded ) {
		this.pendingValue = value;
		return;
	}

	const normalizedValue = ( Array.isArray( value ) ? value : [ value ] )
		.map( this.normalizeValueItem.bind( this ) )
		.filter( ( item ) => item !== null );
	const originalAllowArbitrary = this.allowArbitrary;

	this.pendingValue = undefined;
	this.clearItems();
	this.allowArbitrary = true;

	normalizedValue.forEach( ( guid ) => {
		const eventType = this.eventTypesByGuid[ guid ];
		if ( !eventType ) {
			return;
		}
		this.addTag( eventType.guid, eventType.name );
	} );

	this.allowArbitrary = originalAllowArbitrary;
	this.updateMenuItems();
	this.emit( 'change', this.getValue() );
};

eventTypeMultiselect.prototype.createTagItemWidget = function ( data, label ) {
	const eventType = this.eventTypesByGuid[ data ];
	return new EventTypeTag( eventType );
};

eventTypeMultiselect.prototype.onInputFocus = function () {
	this.updateMenuItems();
	this.menu.toggle( true );
};

eventTypeMultiselect.prototype.onInputChange = function () {
	eventTypeMultiselect.parent.prototype.onInputChange.apply( this, arguments );
	this.updateMenuItems();
};

eventTypeMultiselect.prototype.updateHiddenInput = function () {
	if ( '$hiddenInput' in this ) {
		this.$hiddenInput.val( JSON.stringify( this.getValue() ) );
		this.$hiddenInput.trigger( 'change' );
	}
};

eventTypeMultiselect.prototype.onMultiselectChange = function () {
	this.updateHiddenInput();

	const currentTagValue = this.getInternalValue().join( '\n' );
	if ( currentTagValue !== this.previousTagValue ) {
		this.input.setValue( '' );
		this.updateMenuItems();
	}

	this.previousTagValue = currentTagValue;
};

module.exports = eventTypeMultiselect;
