const AddCalendarButton = function( cfg ) {

	AddCalendarButton.parent.call( this, {
		title: mw.message( 'appointments-ui-create-calendar' ).text(),
		classes: [ 'ext-appointments-create-calendar-button' ],
		framed: false,
		icon: 'add',
		menu: {
			horizontalPosition: 'end',
			items: [
				new OO.ui.MenuOptionWidget( {
					data: 'custom',
					label: mw.message( 'appointments-ui-create-custom-calendar' ).text()
			 	} ),
				new OO.ui.MenuOptionWidget( {
					data: 'predefined',
					label: mw.message( 'appointments-ui-create-predefined-calendar' ).text()
				} )
			]
		}
	} );

	this.menu.connect( this, {
		select: ( item ) => {
			if ( !item ) {
				return;
			}
			if ( item.getData() === 'custom' ) {
				ext.appointments.util.openCalendarEditorDialog().then( ( res ) => {
					if ( res && res.entity ) {
						this.emit( 'created', res.entity );
					}
				} );
			} else if ( item.getData() === 'predefined' ) {
			}
		}
	} );
};

OO.inheritClass( AddCalendarButton, OO.ui.ButtonMenuSelectWidget );

module.exports = AddCalendarButton;