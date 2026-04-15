const { EventTypeCheckboxMenuOption } = require( './EventTypeMenuOptions.js' );

const eventTypeMultiselect = function ( eventTypes ) {
	const options = [];
	for ( const eventType of eventTypes ) {
		const option = new EventTypeCheckboxMenuOption( eventType );
		option.connect( this, {
			edit: () => {
				this.emit( 'edit', arguments );
			},
			delete: () => {
				this.emit( 'delete', );
			}
		} );
		options.push( option );
	}
	eventTypeMultiselect.parent.call( this, {
		items: options
	} );
	this.$element.addClass( 'event-type-multiselect' );

	this.supress = false;
};

OO.inheritClass( eventTypeMultiselect, OO.ui.CheckboxMultiselectWidget );

const calendarCheckboxMenuOption = function ( calendar ) {
	this.calendar = calendar;
	this.typeSelector = null;

	calendarCheckboxMenuOption.parent.call( this, {
		data: calendar.guid,
		label: calendar.name
	} );

	this.options = new OO.ui.ButtonMenuSelectWidget( {
		icon: 'verticalEllipsis',
		$overlay: true,
		label: mw.msg( 'appointments-ui-calendar-options' ),
		framed: false,
		invisibleLabel: true,
		menu: {
			items: [
				new OO.ui.MenuOptionWidget( {
					data: 'edit',
					label: mw.msg( 'appointments-ui-edit-calendar' ),
					icon: 'edit'
				} ),
				new OO.ui.MenuOptionWidget( {
					data: 'delete',
					label: mw.msg( 'appointments-ui-delete-calendar' ),
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
				ext.appointments.util.openCalendarEditorDialog( calendar ).then( ( res ) => {
					if ( res && res.entity ) {
						this.emit( 'edit', res.entity );
					}
				} );
			} else if ( item.getData() === 'delete' ) {
				ext.appointments.util.deleteCalendarWithConfirm( calendar ).then( ( res ) => {
					if ( res ) {
						this.emit( 'delete', calendar.guid );
					}
				} );
			}
		}
	} );

	this.$element.append( this.options.$element );
	this.renderEventTypes();
};

OO.inheritClass( calendarCheckboxMenuOption, OO.ui.CheckboxMultioptionWidget );

calendarCheckboxMenuOption.prototype.renderEventTypes = function () {
	if ( this.calendar.eventTypes.length > 0 ) {
		this.typeSelector = new eventTypeMultiselect( this.calendar.eventTypes );
		this.typeSelector.connect( this, {
			select: () =>  {
				if ( this.suppress ) {
					return;
				}
				this.emit( 'select', this, this.isSelected() );
			},
			edit: () => {
				this.emit( 'edit' );
			},
			delete: () => {
				this.emit( 'delete' );
			}
		} );
		setTimeout( () => this.typeSelector.$element.insertAfter( this.$element ), 1 );
	}
}

calendarCheckboxMenuOption.prototype.getValue = function () {
	if ( this.typeSelector ) {
		return this.typeSelector.findSelectedItemsData();
	}
	return [];
};

calendarCheckboxMenuOption.prototype.setValue = function ( value ) {
	if ( this.typeSelector ) {
		this.typeSelector.selectItemsByData( value );
	}
};

calendarCheckboxMenuOption.prototype.selectAllEventTypes = function () {
	if ( this.typeSelector ) {
		this.suppress = true;
		this.typeSelector.selectItemsByData( this.calendar.eventTypes.map( eventType => eventType.guid ) );
		this.suppress = false;
	}
};

calendarCheckboxMenuOption.prototype.unselectEventTypes = function () {
	if ( this.typeSelector ) {
		this.suppress = true;
		this.typeSelector.selectItemsByData( [] );
		this.suppress = false;
	}
}

module.exports = calendarCheckboxMenuOption;
