require( './formelement/CalendarPicker.js' );
require( './formelement/EventTypePickerAnything.js' );

( function () {
	$( '.appointment-timeline-tag' ).each( function () {
		const data = $( this ).data( 'appointments' );
		if ( !data ) {
			return;
		}
		const appointments = data.map( ( appointmentData ) => ext.appointments.api.toAppointment( appointmentData ) );
		const view = new ext.appointments.ui.SchedulerView( {
			view: $( this ).data( 'view' ),
			initialDate: $( this ).data( 'initialDate' ),
			editable: false,
			isList: true
		} );
		$( this ).html( view.$element );
		view.render();
		view.setData( appointments );
	}  );
}() );