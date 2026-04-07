const calendarMenuOption = function ( calendar ) {
	calendarMenuOption.parent.call( this, {
		data: calendar.guid,
		label: calendar.name
	} );
};

OO.inheritClass( calendarMenuOption, OO.ui.MenuOptionWidget );

module.exports = calendarMenuOption;
