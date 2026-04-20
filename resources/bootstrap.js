const editorClass = require("./ui/EditorDialog.js");
const appointmentEditor = require("./ui/AppointmentEditor.js");
const eventTypeEditor = require("./ui/EventTypeEditor.js");
const calendarEditor = require("./ui/CalendarEditor.js");
const calendarPermissionEditor = require("./ui/CalendarPermissionEditor.js");
const { CALENDAR_COLORS, EVENT_TYPE_ICONS } = require( './consts.js' );

window.ext = window.ext || {};
window.ext.appointments = {
	ui: {
		Scheduler: require( './ui/Scheduler.js' ),
		SchedulerView: require( './ui/SchedulerView.js' ),
		formelement: {}
	},
	eventTypeRegistry: new OO.Registry(),
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
		openCalendarPermissionsDialog: function ( calendar ) {
			const dialog = new editorClass( {
				entity: new calendarPermissionEditor( {
					calendar: calendar
				} ),
				size: 'large'
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
	CALENDAR_COLORS: CALENDAR_COLORS,
	EVENT_TYPE_ICONS: EVENT_TYPE_ICONS
};
