const calendarCheckboxMenuOption = function ( calendar ) {
	calendarCheckboxMenuOption.parent.call( this, {
		data: calendar.guid,
		label: calendar.name
	} );

	this.editButton = new OO.ui.ButtonWidget( {
		icon: 'edit',
		framed: false,
		title: mw.msg( 'appointments-ui-edit-calendar' ),
	} );
	this.deleteButton = new OO.ui.ButtonWidget( {
		icon: 'trash',
		framed: false,
		title: mw.msg( 'appointments-ui-delete-calendar' ),
		flags: [ 'destructive' ]
	} );
	this.editButton.connect( this, {
		click: () => {
			ext.appointments.util.openCalendarEditorDialog( calendar ).then( ( res ) => {
				if ( res && res.entity ) {
					this.emit( 'edit', res.entity );
				}
			} );
		}
	} );
	this.deleteButton.connect( this, {
		click: () => {
			ext.appointments.util.deleteCalendarWithConfirm( calendar ).then( ( res ) => {
				console.log( res );
				if ( res ) {
					this.emit( 'delete', calendar.guid );
				}
			} );
		}
	} );

	this.$element.append( this.editButton.$element, this.deleteButton.$element );
};

OO.inheritClass( calendarCheckboxMenuOption, OO.ui.CheckboxMultioptionWidget );

module.exports = calendarCheckboxMenuOption;
