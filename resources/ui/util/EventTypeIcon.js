eventTypeIcon = function ( cfg ) {
	cfg = cfg || {};

	this.value = cfg.value || 'calendar';
	this.$overlay = cfg.$overlay || true;

	this.layout = new OO.ui.PanelLayout( {
		expanded: false,
		padded: false
	} );
	const widget = this;

	for ( let i = 0; i < ext.appointments.EVENT_TYPE_ICONS.length; i++ ) {
		const btn = new OO.ui.ButtonWidget( {
			icon: ext.appointments.EVENT_TYPE_ICONS[ i ],
			framed: false,
			data: ext.appointments.EVENT_TYPE_ICONS[ i ]
		} );
		btn.connect( btn, {
			click: function() {
				widget.onIconSelect( btn.getData() );
			}
		} );
		this.layout.$element.append( btn.$element );
	}

	eventTypeIcon.super.call( this, {
		icon: this.value,
		title: mw.msg( 'appointments-ui-select-event-type-icon' ),
		framed: false,
		$overlay: this.$overlay,
		popup: {
			$overlay: this.$overlay,
			$content: this.layout.$element,
			padded: true
		}
	} );
};

OO.inheritClass( eventTypeIcon, OO.ui.PopupButtonWidget );

eventTypeIcon.prototype.onIconSelect = function ( icon ) {
	this.setIcon( icon );
	this.value = icon;
	this.popup.toggle( false );
	this.emit( 'change', this.value );
};

eventTypeIcon.prototype.getValue = function () {
	return this.value;
};

module.exports = eventTypeIcon;
