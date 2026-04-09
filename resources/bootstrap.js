const editorClass = require("./ui/EditorDialog.js");

window.ext = window.ext || {};
window.ext.appointments = {
	ui: {
		Scheduler: require( './ui/Scheduler.js' )
	},
	api: require( './api.js' ),
	objects: {
		Calendar: require( './object/Calendar.js' ),
		Appointment: require( './object/Appointment.js' ),
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
				entity: new ( require( './ui/CalendarEditor.js' ) )( {
					calendar: calendar
				} )
			} );
			return this.openDialog( dialog );
		},
		openAppointmentEditorDialog: function ( appointment ) {
			const dialog = new editorClass( {
				entity: new ( require( './ui/AppointmentEditor.js' ) )( {
					appointment: appointment
				} ),
				size: 'larger'
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
		}
	}
};
