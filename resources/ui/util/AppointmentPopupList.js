
const AppointmentTimeView = require("./AppointmentTimeView.js");
const AppointmentViewer = require("./../AppointmentViewer.js");

const appointmentPopupList = function ( config ) {
	this.appointmentList = this.makeAppointmentList();
	this.hiddenCount = config.hiddenCount;
	this.controller = config.controller;
	this.$cell = config.$cell;

	appointmentPopupList.parent.call( this, {
		label: '+' + this.hiddenCount,
		title: mw.msg( 'appointments-more-appointments', this.hiddenCount ),
		classes: [ 'appointment-day-overflow' ],
		framed: false,
		$overlay: true,
		popup: {
			head: false,
			$content: this.appointmentList.$element,
			width: 500,
			position: 'after',
			$floatableContainer: this.$cell
		}
	} );
};

OO.inheritClass( appointmentPopupList, OO.ui.PopupButtonWidget );

appointmentPopupList.prototype.makeAppointmentList = function () {
	this.contentPanel = new OO.ui.PanelLayout( { expanded: false, padded: true, classes: [ 'appointment-popup-list' ] } );
	return this.contentPanel;
};

appointmentPopupList.prototype.setAppointments = function ( appointments ) {
	this.contentPanel.$element.empty();

	for ( const appointment of appointments ) {
		const titleLabel = new OO.ui.LabelWidget( {
			label: appointment.title,
			classes: [ 'appointment-viewer-title' ]
		} );

		const calendarAndTypeLabel = new OO.ui.HorizontalLayout( {
			items: [
				new OO.ui.LabelWidget( {
					label: appointment.eventType.name + ' (' + appointment.calendar.name + ')',
				} )
			],
			classes: [ 'appointment-viewer-calendar' ]
		} );
		calendarAndTypeLabel.$element.prepend(
			$( '<span>' )
				.css( 'background-color', appointment.eventType.getColor() )
				.addClass( 'appointment-viewer-calendar-color' )
		);
		const timeView = new AppointmentTimeView( appointment.userPeriod );

		const appointmentLayout = new OO.ui.PanelLayout( { expanded: false, padded: true, classes: [ 'appointment-viewer' ] } );

		const viewer = new AppointmentViewer( { appointment: appointment } );
		viewer.connect( this, {
			update: ( appointment ) => {
				this.controller.dataProvider.onAppointmentChange( appointment );
			},
			delete: ( appointment ) => {
				this.controller.dataProvider.onAppointmentDelete( appointment );
			}
		} );
		const expandButton = new OO.ui.PopupButtonWidget( {
			title: mw.msg( 'appointments-view-appointment' ),
			icon: 'newWindow',
			framed: false,
			$overlay: true,
			popup: {
				head: false,
				position: 'after',
				$content: viewer.$element,
				width: 500,
				$floatableContainer: appointmentLayout.$element
			}
		} );
		viewer.setPopup( expandButton.popup );

		appointmentLayout.$element.append(
			new OO.ui.HorizontalLayout( { items: [ titleLabel, expandButton ] } ).$element,
			calendarAndTypeLabel.$element,
			timeView.$element
		);
		this.contentPanel.$element.append( appointmentLayout.$element );
	}
};

module.exports = appointmentPopupList;
