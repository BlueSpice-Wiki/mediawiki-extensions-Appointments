const eventTypeCheckboxMenuOption = function ( eventType ) {
	eventTypeCheckboxMenuOption.parent.call( this, {
		data: eventType.guid,
		label: eventType.name
	} );

	if ( !eventType.isSystemType() ) {
		this.options = new OO.ui.ButtonMenuSelectWidget( {
			icon: 'verticalEllipsis',
			$overlay: true,
			label: mw.msg( 'appointments-ui-entity-type-options' ),
			framed: false,
			invisibleLabel: true,
			menu: {
				items: [
					new OO.ui.MenuOptionWidget( {
						data: 'edit',
						label: mw.msg( 'appointments-ui-edit-event-type' ),
						icon: 'edit'
					} ),
					new OO.ui.MenuOptionWidget( {
						data: 'delete',
						label: mw.msg( 'appointments-ui-delete-event-type' ),
						icon: 'trash',
						flags: [ 'destructive' ]
					} )
				]
			}
		} );

		this.options.menu.connect( this, {
			toggle: ( visible ) => {
				// Prevent flickering
				this.$element.toggleClass( 'options-open', visible );
			},
			select: ( item ) => {
				if ( !item ) {
					return;
				}
				if ( item.getData() === 'edit' ) {
					ext.appointments.util.openEventTypeDialog( eventType ).then( ( res ) => {
						if ( res && res.entity ) {
							this.emit( 'edit', res.entity );
						}
					} );
				} else if ( item.getData() === 'delete' ) {
					ext.appointments.util.deleteEventTypeWithConfirm( eventType ).then( ( res ) => {
						if ( res ) {
							this.emit( 'delete', eventType.guid );
						}
					} );
				}
			}
		} );

		this.$element.append( this.options.$element );
	}

	const color = eventType.getColor();
	if ( this.isSelected() ) {
		this.checkbox.checkIcon.$element.css( 'background-color', color );
	}
	this.connect( this, {
		change: ( selected ) => {
			if ( selected ) {
				this.checkbox.checkIcon.$element.css( 'background-color', color );
			} else {
				this.checkbox.checkIcon.$element.css( 'background-color', '' );
			}
		}
	} );

};

OO.inheritClass( eventTypeCheckboxMenuOption, OO.ui.CheckboxMultioptionWidget );

/** --------------------- */

const eventTypeMenuOption = function (eventType ) {
	eventTypeMenuOption.parent.call( this, {
		data: eventType.guid,
		label: eventType.name,
		icon: eventType.getIcon()
	} );
	this.$element.prepend(
		$( '<span>' ).addClass( 'option-color' ).css( 'background-color', eventType.getColor() ),
	);
	this.$element.addClass( 'entityType-menu-option' );
};

OO.inheritClass( eventTypeMenuOption, OO.ui.MenuOptionWidget );

/** --------------------- */

const eventTypeTag = function ( eventType ) {
	eventTypeTag.parent.call( this, {
		data: eventType.guid,
		label: eventType.name,
	} );
	this.$element.prepend(
		new OO.ui.IconWidget( {
			icon: eventType.getIcon(),
			classes: [ 'option-icon' ]
		} ).$element,
		$( '<span>' ).addClass( 'option-color' ).css( 'background-color', eventType.getColor() ),
	);
	this.$element.addClass( 'entityType-menu-option' );
};

OO.inheritClass( eventTypeTag, OO.ui.TagItemWidget );

/** --------------------- */

const newEventTypeMenuOption = function () {
	newEventTypeMenuOption.parent.call( this, {
		data: '_create',
		label: mw.message( 'appointments-ui-create-new-event-type' ).text(),
		icon: 'add'
	} );
};

OO.inheritClass( newEventTypeMenuOption, OO.ui.MenuOptionWidget );

newEventTypeMenuOption.prototype.onSelect = function () {
	ext.appointments.util.openEventTypeDialog( null ).then( ( res ) => {
		if ( res && res.entity ) {
			this.emit( 'eventTypeCreated', res.entity );
		}
	} );
};

module.exports = {
	EventTypeCheckboxMenuOption: eventTypeCheckboxMenuOption,
	EventTypeMenuOption: eventTypeMenuOption,
	EventTypeTag: eventTypeTag,
	NewEventTypeMenuOption: newEventTypeMenuOption
};
