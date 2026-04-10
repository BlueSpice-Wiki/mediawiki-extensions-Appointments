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

	const calendarLabel = new OO.ui.HorizontalLayout( {
		items: [
			new OO.ui.LabelWidget( {
				label: this.appointment.calendar.name
			} )
		],
		classes: [ 'appointment-viewer-calendar' ]
	} );
	calendarLabel.$element.prepend(
		$( '<span>' )
			.css( 'background-color', this.appointment.calendar.getColor() )
			.addClass( 'appointment-viewer-calendar-color' )
	);

	const data = this.appointment.data || {};
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
				new OO.ui.IconWidget( { icon: 'calendar' } ),
				new OO.ui.LabelWidget( {
					label: data.location,
					classes: [ 'appointment-viewer-calendar' ]
				} )
			]
		} ) );
	}

	const timeView = new AppointmentTimeView( this.appointment.userPeriod );
	const participantsView = new ParticipantView( this.appointment.participants );

	this.$element.append(
		titleLabel.$element,
		calendarLabel.$element,
		this.buildButtons().$element,
		new OO.ui.HorizontalLayout( {
			items: dataWidgets
		} ).$element,
		timeView.$element,
		participantsView.$element
	);
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
	ext.appointments.util.openAppointmentEditorDialog( this.appointment ).then( ( updated ) => {
		this.emit( 'update', updated );
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
