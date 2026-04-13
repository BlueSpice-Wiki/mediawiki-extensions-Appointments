entityColor = function ( cfg ) {
	cfg = cfg || {};
	console.log( cfg );

	entityColor.super.call( this, cfg );

	this.colorBlocks = {};
	this.selectedColor = null;

	for ( const color in ext.appointments.CALENDAR_COLORS ) {
		let darkText = true;
		if ( ext.appointments.CALENDAR_COLORS[ color ] ) {
			darkText = false;
		}
		this.colorBlocks[ color ] = $( '<div>' )
			.addClass( 'entity-color-option' )
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

	this.$element.addClass( 'entity-color-picker' );
};

OO.inheritClass( entityColor, OO.ui.Widget );

entityColor.prototype.getValue = function () {
	if ( !this.selectedColor ) {
		return null;
	}
	return this.selectedColor;
};

entityColor.prototype.setValue = function ( value ) {
	this.clearValue();
	if ( this.colorBlocks[ value ] ) {
		this.colorBlocks[ value ].addClass( 'selected' );
		this.selectedColor = value;
		this.emit( 'change', this.selectedColor );
	}
};

entityColor.prototype.clearValue = function () {
	for ( const color in this.colorBlocks ) {
		if ( Object.prototype.hasOwnProperty.call( this.colorBlocks, color ) ) {
			this.colorBlocks[ color ].removeClass( 'selected' );
		}
	}
	this.selectedColor = null;
};

module.exports = entityColor;
