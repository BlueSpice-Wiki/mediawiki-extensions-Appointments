const EventType = require( '../object/EventType.js' );
const EntityColor = require( './util/EntityColor.js' );
const EventTypeIcon = require( './util/EventTypeIcon.js' );

const eventTypeEditor = function ( config ) {
	eventTypeEditor.parent.call( this, $.extend( {
		expanded: false,
		padded: true
	}, config ) );

	this.eventType = config.eventType;
	this.dirty = !this.calendar;
	this.dialog = null;
};

OO.inheritClass( eventTypeEditor, OO.ui.PanelLayout );

eventTypeEditor.prototype.setDialog = function ( dialog ) {
	this.dialog = dialog;
};

eventTypeEditor.prototype.onReady = function () {
	// NOOP
};

eventTypeEditor.prototype.getLabel = function () {
	if ( this.calendar ) {
		return mw.message( 'appointments-ui-edit-event-type' ).text()
	} else {
		return mw.message( 'appointments-ui-create-event-type' ).text()
	}
};

eventTypeEditor.prototype.focus = function () {
	this.name.focus();
};

eventTypeEditor.prototype.init = function () {
	this.name = new OO.ui.TextInputWidget( {
		required: true,
		value: this.eventType ? this.eventType.name : '',
	} );
	this.name.connect( this, { change: 'onInputChange' } );
	this.description = new OO.ui.MultilineTextInputWidget( {
		value: this.eventType ? this.eventType.description : '',
		rows: 2
	} );
	this.description.connect( this, { change: 'onInputChange' } );

	this.color = new EntityColor( {
		value: this.eventType ? this.eventType.getColor() : null,
	} );
	this.color.connect( this, { change: 'onInputChange' } );

	this.icon = new EventTypeIcon( {
		value: this.eventType ? this.eventType.getIcon() : null,
		$overlay: this.dialog ? this.dialog.$overlay : true,
	} );
	this.icon.connect( this, { change: 'onInputChange' } );

	this.$element.append(
		new OO.ui.FieldLayout( this.name, {
			label: mw.message( 'appointments-ui-field-entity-type-name' ).text(),
		} ).$element,
		new OO.ui.FieldLayout( this.description, {
			label: mw.message( 'appointments-ui-field-entity-type-description' ).text(),
		} ).$element,
		new OO.ui.FieldLayout( this.color, {
			label: mw.message( 'appointments-ui-field-entity-type-color' ).text(),
		} ).$element,
		new OO.ui.FieldLayout( this.icon, {
			label: mw.message( 'appointments-ui-field-entity-type-icon' ).text(),
		} ).$element
	);
};

eventTypeEditor.prototype.isDirty = function () {
	return this.dirty;
};

eventTypeEditor.prototype.save = async function ( entity ) {
	await ext.appointments.api.saveEventType( entity );
};

eventTypeEditor.prototype.onInputChange = function () {
	this.dirty = true;
}

eventTypeEditor.prototype.getUpdatedEntity = function () {
	if ( !this.eventType ) {
		this.eventType = new EventType();
	}

	this.eventType.name = this.name.getValue();
	this.eventType.description = this.description.getValue();
	this.eventType.setColor( this.color.getValue() );
	this.eventType.setIcon( this.icon.getValue() );

	return this.eventType;
};

module.exports = eventTypeEditor;