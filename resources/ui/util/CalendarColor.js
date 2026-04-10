calendarColor = function ( cfg ) {
	cfg = cfg || {};
	console.log( cfg );

	calendarColor.super.call( this, cfg );

	this.colorBlocks = {};
	this.selectedColor = null;

	for ( const color in ext.appointments.CALENDAR_COLORS ) {
		let darkText = true;
		if ( ext.appointments.CALENDAR_COLORS[ color ] ) {
			darkText = false;
		}
		this.colorBlocks[ color ] = $( '<div>' )
			.addClass( 'calendar-color-option' )
			.css( {
				'background-color': color
			} )
			.attr( 'data-color', color )
			.on( 'click', () => {
				this.setValue( color );
				this.emit( 'select', this.getValue() );
			} );
		if ( darkText ) {
			this.colorBlocks[ color ].addClass( 'dark-text' );
		}

		this.$element.append( this.colorBlocks[ color ] );
	}

	this.setValue( cfg.value || Object.keys( ext.appointments.CALENDAR_COLORS )[ 0 ] );

	this.$element.addClass( 'calendar-color-picker' );
};

OO.inheritClass( calendarColor, OO.ui.Widget );

calendarColor.prototype.getValue = function () {
	if ( !this.selectedColor ) {
		return null;
	}
	return this.selectedColor;
};

calendarColor.prototype.setValue = function ( value ) {
	this.clearValue();
	if ( this.colorBlocks[ value ] ) {
		this.colorBlocks[ value ].addClass( 'selected' );
		this.selectedColor = value;
		this.emit( 'change', this.selectedColor );
	}
};

calendarColor.prototype.clearValue = function () {
	for ( const color in this.colorBlocks ) {
		if ( Object.prototype.hasOwnProperty.call( this.colorBlocks, color ) ) {
			this.colorBlocks[ color ].removeClass( 'selected' );
		}
	}
	this.selectedColor = null;
};

module.exports = calendarColor;
