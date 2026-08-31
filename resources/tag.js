require( './formelement/CalendarPicker.js' );
require( './formelement/EventTypePickerAnything.js' );

( function () {
	let observer = null;
	let scanScheduled = false;

	const renderTimeline = function ( $container ) {
		let data;
		try {
			data = JSON.parse( $container.attr( 'data-appointments' ) || '[]' );
		} catch ( e ) {
			return;
		}

		const view = new ext.appointments.ui.SchedulerView( {
			view: $container.attr( 'data-view' ),
			initialDate: $container.attr( 'data-initial-date' ) || null,
			editable: false,
			isList: true
		} );

		$container.empty().append( view.$element );
		view.render();
		view.setData( data.map( ( appointmentData ) => ext.appointments.api.toAppointment( appointmentData ) ) );
	};

	// Presence of the server-rendered skeleton means the tag is not rendered yet.
	// VisualEditor re-inserts the original HTML (including the skeleton) on every update,
	// so this also covers live updates from the tag inspector.
	const renderPending = function () {
		$( '.appointment-timeline-tag' ).has( '.appointments-timeline-skeleton' ).each( function () {
			renderTimeline( $( this ) );
		} );
	};

	const scheduleScan = function () {
		if ( scanScheduled ) {
			return;
		}
		scanScheduled = true;
		setTimeout( function () {
			scanScheduled = false;
			renderPending();
		}, 0 );
	};

	$( function () {
		renderPending();

		if ( typeof MutationObserver !== 'function' ) {
			return;
		}
		observer = new MutationObserver( scheduleScan );
		observer.observe( document.body, { childList: true, subtree: true } );
	} );

	mw.hook( 'wikipage.content' ).add( scheduleScan );
}() );
