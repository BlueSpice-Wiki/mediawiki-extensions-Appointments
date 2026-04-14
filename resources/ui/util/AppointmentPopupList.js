
const AppointmentTimeView = require("./AppointmentTimeView.js");
const AppointmentEntry = require("./../AppointmentEntry.js");

const appointmentPopupList = function ( hiddenCount ) {
	this.appointmentList = this.makeAppointmentList();
	appointmentPopupList.parent.call( this, {
		label: '+' + hiddenCount,
		title: mw.msg( 'appointments-more-appointments', hiddenCount ),
		classes: [ 'appointment-day-overflow' ],
		framed: false,
		$overlay: true,
		popup: {
			head: false,
			$content: this.appointmentList.$element,
			width: 500
		}
	} );
};

OO.inheritClass( appointmentPopupList, OO.ui.PopupButtonWidget );

appointmentPopupList.prototype.makeAppointmentList = function () {
	this.contentPanel = new OO.ui.PanelLayout( { expanded: false, padded: true, classes: [ 'appointment-popup-list' ] } );
	return this.contentPanel;
};

appointmentPopupList.prototype.setAppointments = function ( appointments, cell ) {
	this.contentPanel.$element.empty();

	for ( const appointment of appointments ) {
		const entry = new AppointmentEntry( appointment, cell );
		this.contentPanel.$element.append( entry.$element );
		/*const titleLabel = new OO.ui.LabelWidget( {
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
		appointmentLayout.$element.append(
			titleLabel.$element,
			calendarAndTypeLabel.$element,
			timeView.$element
		);
		this.contentPanel.$element.append( appointmentLayout.$element );*/
	}
};

module.exports = appointmentPopupList;
