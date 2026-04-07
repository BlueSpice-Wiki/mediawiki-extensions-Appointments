const newCalendarMenuOption = function () {
	newCalendarMenuOption.parent.call( this, {
		data: '_create',
		icon: 'add',
		label: mw.message( 'appointments-ui-create-new-calendar' ).text()
	} );
};

OO.inheritClass( newCalendarMenuOption, OO.ui.MenuOptionWidget );

newCalendarMenuOption.prototype.onSelect = function () {
	ext.appointments.util.openCalendarEditorDialog( null ).then( ( res ) => {
		if ( res && res.entity ) {
			this.emit( 'calendarCreated', res.entity );
		}
	} );
};

module.exports = newCalendarMenuOption;
