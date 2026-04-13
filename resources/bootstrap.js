const editorClass = require("./ui/EditorDialog.js");
const appointmentEditor = require("./ui/AppointmentEditor.js");
const eventTypeEditor = require("./ui/EventTypeEditor.js");
const calendarEditor = require("./ui/CalendarEditor.js");

window.ext = window.ext || {};
window.ext.appointments = {
	ui: {
		Scheduler: require( './ui/Scheduler.js' )
	},
	api: require( './api.js' ),
	objects: {
		Calendar: require( './object/Calendar.js' ),
		Appointment: require( './object/Appointment.js' ),
		EventType: require( './object/EventType.js' ),
		Participant: require( './object/Participant.js' ),
		PeriodDefinition: require( './object/PeriodDefinition.js' )
	},
	util: {
		openDialog: function ( dialog ) {
			const windowManager = new OO.ui.WindowManager();
			$( document.body ).append( windowManager.$element );
			windowManager.addWindows( [ dialog ] );
			const promise = windowManager.openWindow( dialog ).closed;

			promise.then( () => {
				windowManager.destroy();
			} );
			return promise;
		},
		openCalendarEditorDialog: function ( calendar ) {
			const dialog = new editorClass( {
				entity: new calendarEditor( {
					calendar: calendar
				} ),
				size: 'large'
			} );
			return this.openDialog( dialog );
		},
		openAppointmentEditorDialog: function ( appointment, config ) {
			config = config || {};
			const dialog = new editorClass( {
				entity: new appointmentEditor( $.extend( {
					appointment: appointment
				}, config ) ),
				size: 'larger'
			} );

			return this.openDialog( dialog );
		},
		openEventTypeDialog: function ( eventType, config ) {
			config = config || {};
			const dialog = new editorClass( {
				entity: new eventTypeEditor( $.extend( {
					eventType: eventType
				}, config ) )
			} );

			return this.openDialog( dialog );
		},
		deleteAppointmentWithConfirm: function ( appointment ) {
			const dfd = $.Deferred();

			OO.ui.confirm(
				mw.msg( 'appointments-ui-delete-appointment-confirmation' ), {
					actions: [
						{
							label: mw.msg( 'appointments-ui-delete' ),
							flags: [ 'destructive' ],
							action: 'accept'
						},
						{
							label: mw.msg( 'appointments-ui-cancel' ),
							action: 'cancel'
						}
					]
				} )
				.done( async ( confirmed ) => {
					if ( !confirmed ) {
						dfd.reject();
					} else {
						try {
							await ext.appointments.api.deleteAppointment( appointment.guid );
							dfd.resolve();
						} catch ( e ) {
							mw.notify( mw.msg( 'appointments-ui-delete-appointment-failed' ), { type: 'error' } );
							dfd.reject( e );
						}
					}
				} );

			return dfd.promise();
		},
		deleteCalendarWithConfirm: function ( calendar ) {
			const dfd = $.Deferred();

			OO.ui.confirm(
				mw.msg( 'appointments-ui-delete-calendar-confirmation' ), {
					actions: [
						{
							label: mw.msg( 'appointments-ui-delete' ),
							flags: [ 'destructive' ],
							action: 'accept'
						},
						{
							label: mw.msg( 'appointments-ui-cancel' ),
							action: 'cancel'
						}
					]
				} )
				.done( async ( confirmed ) => {
					if ( !confirmed ) {
						dfd.reject();
					} else {
						try {
							await ext.appointments.api.deleteCalendar( calendar.guid );
							dfd.resolve( true );
						} catch ( e ) {
							mw.notify( mw.msg( 'appointments-ui-delete-calendar-failed' ), { type: 'error' } );
							dfd.reject( e );
						}
					}
				} );

			return dfd.promise();
		},
		deleteEventTypeWithConfirm: function ( eventType ) {
			const dfd = $.Deferred();

			OO.ui.confirm(
				mw.msg( 'appointments-ui-delete-event-type-confirmation' ), {
					actions: [
						{
							label: mw.msg( 'appointments-ui-delete' ),
							flags: [ 'destructive' ],
							action: 'accept'
						},
						{
							label: mw.msg( 'appointments-ui-cancel' ),
							action: 'cancel'
						}
					]
				} )
				.done( async ( confirmed ) => {
					if ( !confirmed ) {
						dfd.reject();
					} else {
						try {
							await ext.appointments.api.deleteEventType( eventType );
							dfd.resolve( true );
						} catch ( e ) {
							mw.notify( mw.msg( 'appointments-ui-delete-event-type-failed' ), { type: 'error' } );
							dfd.reject( e );
						}
					}
				} );

			return dfd.promise();
		}
	},
	CALENDAR_COLORS: {
		// Default
		'#4d5d72': true,

		// Blues
		'#3F6F9F': true,
		'#5A9BD5': true,
		'#4F81BD': true,

		// Greens
		'#4C8C43': true,
		'#5FAE56': true,
		'#4F9A94': true,
		'#3E7F7A': true,

		// Purples
		'#9A5D8C': true,
		'#B07AA1': true,
		'#7A5A78': true,
		'#9F86B8': true,

		// Reds / pinks
		'#C94C4E': true,
		'#E06C75': true,
		'#B85C82': true,
		'#D98DA4': false,

		// Oranges
		'#D9791F': true,
		'#E89A4C': true,
		'#C96500': true,
		'#E5A96E': false,

		// Teals
		'#5FA7A3': true
	}
};
