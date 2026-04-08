const timePicker = function ( cfg ) {
	// Make options for all hours in the day, in 30 minute intervals
	cfg = cfg || {};

	cfg.options = [];
	for ( let i = 0; i < 24; i++ ) {
		const hour = i.toString().padStart( 2, '0' );
		cfg.options.push( { data: `${ hour }:00`, label: `${ hour }:00` } );
		cfg.options.push( { data: `${ hour }:30`, label: `${ hour }:30` } );
	}
	timePicker.parent.call( this, cfg );
	this.$element.addClass( 'appointments-time-picker' );

	this.dropdownWidget.menu.$clippable.addClass( 'appointments-time-picker-menu' );
};

OO.inheritClass( timePicker, OO.ui.DropdownInputWidget );

timePicker.prototype.getRaw = function () {
	// Convert selected time to minutes after midnight
	const time = this.getValue();
	if ( time ) {
		const [ hours, minutes ] = time.split( ':' ).map( Number );
		return hours * 60 + minutes;
	}
	return 0;
};


module.exports = timePicker;
