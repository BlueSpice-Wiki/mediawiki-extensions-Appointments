const EventType = require( './../EventType.js' );
const PanelWithEvents = require( './../../ui/util/PanelWithEvents.js' );

class Meeting extends EventType {

	constructor( guid, name, description, data, isSystem ) {
		super( 'meeting', name, description, data, isSystem );
	}

	getEditPanel( data ) {
		const panel = new PanelWithEvents( {
			expanded: false,
			padded: false
		} );

		this.location = new OO.ui.TextInputWidget( {
			icon: 'mapPin',
			value: data ? data.location || '' : '',
		} );
		this.location.connect( this, { change: () => panel.emit( 'change' ) } );

		this.videoLink = new OO.ui.TextInputWidget( {
			icon: 'camera',
			value: data ? data.videoLink || '' : '',
		} );
		this.videoLink.connect( this, { change: () => panel.emit( 'change' ) } );

		panel.$element.append(
			new OO.ui.FieldLayout( this.location, {
				label: mw.message( 'appointments-ui-field-location' ).text()
			} ).$element,
			new OO.ui.FieldLayout( this.videoLink, {
				label: mw.message( 'appointments-ui-field-video-link' ).text()
			} ).$element,
		);
		return panel;
	}

	getViewPanel( data ) {
		const dataWidgets = [];
		if ( 'videoLink' in data && data.videoLink ) {
			dataWidgets.push( new OO.ui.ButtonWidget( {
				href: data.videoLink,
				target: '_blank',
				label: mw.message( 'appointments-ui-video-link-join' ).text(),
				icon: 'camera'
			} ) );
		}
		if ( 'location' in data && data.location ) {
			dataWidgets.push( new OO.ui.HorizontalLayout( {
				items: [
					new OO.ui.IconWidget( { icon: 'mapPin' } ),
					new OO.ui.LabelWidget( {
						label: data.location,
						classes: [ 'appointment-viewer-calendar' ]
					} )
				]
			} ) );
		}

		if ( dataWidgets ) {
			return new OO.ui.HorizontalLayout( {
				items: dataWidgets
			} );
		}

		return null;
	}

	getCustomFieldValues() {
		if ( !this.location ) {
			return {};
		}
		return {
			location: this.location.getValue(),
			videoLink: this.videoLink.getValue()
		}
	}
}

ext.appointments.eventTypeRegistry.register( 'meeting', Meeting );
