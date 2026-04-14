const { EventTypeMenuOption } = require( './util/EventTypeMenuOptions.js' );

const eventTypePicker = function ( value, appointmentData ) {
	eventTypePicker.parent.call( this );

	this.value = value || null;
	this.appointmentData = appointmentData || null;
	this.eventTypes = {};

	this.menu.connect( this, {
		select: ( item ) => {
			this.value = item.getData();
			if ( this.eventTypes[this.value] ) {
				this.emit( 'selectEventType', this.eventTypes[this.value] );
				this.setIcon( this.eventTypes[this.value].getIcon() );
			}
		}
	} );
};

OO.inheritClass( eventTypePicker, OO.ui.DropdownWidget );

eventTypePicker.prototype.load = async function ( calendar ) {
	this.menu.clearItems();
	this.setLabel( '' );
	this.setIcon( '' );
	this.value = '';

	this.eventTypes = {};
	calendar.eventTypes.forEach( eventType => {
		this.menu.addItems( [ new EventTypeMenuOption( eventType ) ] );
		this.eventTypes[eventType.guid] = eventType;
	} );

	if ( this.value ) {
		this.menu.selectItemByData( this.value );
	} else {
		this.value = calendar.eventTypes[0] ? calendar.eventTypes[0].guid : null;
		if ( this.value ) {
			this.menu.selectItemByData( this.value );
		}
	}
};

eventTypePicker.prototype.getValue = function () {
	return this.value;
};

module.exports = eventTypePicker;
