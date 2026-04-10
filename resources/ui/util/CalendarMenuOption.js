const calendarMenuOption = function ( calendar ) {
	calendarMenuOption.parent.call( this, {
		data: calendar.guid,
		label: calendar.name
	} );
	this.$element.prepend(
		$( '<span>' ).addClass( 'calendar-menu-option-color' ).css( 'background-color', calendar.getColor() )
	);
	this.$element.addClass( 'calendar-menu-option' );
};

OO.inheritClass( calendarMenuOption, OO.ui.MenuOptionWidget );

module.exports = calendarMenuOption;
