require( './formelement/CalendarPicker.js' );
require( './formelement/EventTypePickerAnything.js' );

( function () {
	$( '.appointment-timeline-tag' ).each( function () {
		const data = $( this ).data( 'appointments' );
		if ( !data ) {
			return;
		}
		const view = new ext.appointments.ui.SchedulerView( {
			view: $( this ).data( 'view' ),
			editable: false,
			isList: true
		} );
		$( this ).html( view.$element );
		view.render();
		view.setData( data.map( ( appointmentData ) => ext.appointments.api.toAppointment( appointmentData ) ) )
	}  );
}() );