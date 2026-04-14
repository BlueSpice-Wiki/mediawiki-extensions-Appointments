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
	const panel = new OO.ui.PanelLayout( { expanded: false, padded: false } );
	return panel;
};

appointmentPopupList.prototype.setAppointments = function ( appointments ) {
	console.log( appointments );
};

module.exports = appointmentPopupList;
