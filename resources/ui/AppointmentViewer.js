const AppointmentTimeView = require( './util/AppointmentTimeView.js' );
const ParticipantView = require( './util/ParticipantView.js' );

const appointmentViewer = function ( config ) {
	appointmentViewer.parent.call( this, $.extend( {
		expanded: false,
		padded: true
	}, config ) );

	this.appointment = config.appointment;
	this.render();
	this.$element.addClass( 'appointment-viewer' );
};

OO.inheritClass( appointmentViewer, OO.ui.PanelLayout );

appointmentViewer.prototype.render = function () {
	const titleLabel = new OO.ui.LabelWidget( {
		label: this.appointment.title,
		classes: [ 'appointment-viewer-title' ]
	} );

	const calendarAndTypeLabel = new OO.ui.HorizontalLayout( {
		items: [
			new OO.ui.LabelWidget( {
				label: this.appointment.eventType.name + ' (' + this.appointment.calendar.name + ')',
			} )
		],
		classes: [ 'appointment-viewer-calendar' ]
	} );
	calendarAndTypeLabel.$element.prepend(
		$( '<span>' )
			.css( 'background-color', this.appointment.eventType.getColor() )
			.addClass( 'appointment-viewer-calendar-color' )
	);

	const data = this.appointment.data || {};
	const customDataPanel = this.appointment.eventType.getViewPanel( data );

	const timeView = new AppointmentTimeView( this.appointment.userPeriod );


	this.$element.append(
		titleLabel.$element,
		calendarAndTypeLabel.$element,
		this.buildButtons().$element
	);
	if ( customDataPanel ) {
		this.$element.append( customDataPanel.$element );
	}
	this.$element.append(
		timeView.$element
	);
	if ( this.appointment.participants.length ) {
		this.$element.append( new ParticipantView( this.appointment.participants ).$element );
	}
};

appointmentViewer.prototype.buildButtons = function () {
	const buttons = [];

	if ( this.appointment.canEdit() ) {
		const editButton = new OO.ui.ButtonWidget( {
			label: mw.message( 'appointments-ui-edit' ).text(),
			icon: 'edit',
			flags: [ 'primary', 'progressive' ]
		} );
		editButton.connect( this, {
			click: 'onEditButtonClick'
		} );
		buttons.push( editButton );
	}

	if ( this.appointment.canDelete() ) {
		const deleteButton = new OO.ui.ButtonWidget( {
			label: mw.message( 'appointments-ui-delete' ).text(),
			icon: 'trash',
			flags: [ 'destructive', 'progressive' ]
		} );
		deleteButton.connect( this, {
			click: 'onDeleteButtonClick'
		} );
		buttons.push( deleteButton );
	}

	return new OO.ui.HorizontalLayout( {
		items: buttons,
		classes: [ 'appointment-viewer-buttons' ]
	} );
};

appointmentViewer.prototype.onEditButtonClick = function () {
	this.popup.toggle( false );
	ext.appointments.util.openAppointmentEditorDialog( this.appointment ).then( ( res ) => {
		if ( res && res.entity ) {
			this.emit( 'update', res.entity );
		}
	} );
};

appointmentViewer.prototype.onDeleteButtonClick = function () {
	this.popup.toggle( false );
	ext.appointments.util.deleteAppointmentWithConfirm( this.appointment ).then( () => {
		this.emit( 'delete', this.appointment );
	} );
};

appointmentViewer.prototype.setPopup = function ( popup ) {
	this.popup = popup;
};

module.exports = appointmentViewer;
