( function () {

	$( '#oojsplus-skeleton-cnt' ).remove();

	const app = document.getElementById( 'appointments-app' );
	if ( !app ) {
		return;
	}

	const scheduler = new ext.appointments.ui.Scheduler( {
		onlyPersonal: false
	} );
	app.replaceChildren( scheduler.$element[ 0 ] );
}() );