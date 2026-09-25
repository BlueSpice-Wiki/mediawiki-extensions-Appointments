const editorClass = require("./ui/EditorDialog.js");
const appointmentEditor = require("./ui/AppointmentEditor.js");
const eventTypeEditor = require("./ui/EventTypeEditor.js");
const calendarEditor = require("./ui/CalendarEditor.js");
const importCalendarEditor = require("./ui/ImportCalendarEditor.js");
const addExistingCalendarEditor = require( "./ui/AddExistingCalendarEditor.js" );
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
		openImportCalendarDialog: function () {
			const dialog = new editorClass( {
				entity: new importCalendarEditor( {} ),
				size: 'large'
			} );
			return this.openDialog( dialog );
		},
		openAddExistingCalendarDialog: function () {
			const dialog = new editorClass( {
				entity: new addExistingCalendarEditor( {} ),
				size: 'medium'
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
			const confirmDeleteCalendarDialog = function ( config ) {
				confirmDeleteCalendarDialog.super.call( this, config );
			};
			OO.inheritClass( confirmDeleteCalendarDialog, OO.ui.ProcessDialog );
			confirmDeleteCalendarDialog.static.name = 'confirmDeleteCalendarDialog';
			confirmDeleteCalendarDialog.static.title = mw.msg( 'appointments-ui-delete-calendar' ).text();
			confirmDeleteCalendarDialog.static.actions = [
				{
					label: mw.msg( 'appointments-ui-delete' ),
					flags: [ 'destructive', 'primary' ],
					action: 'accept'
				},
				{
					label: mw.msg( 'appointments-ui-cancel' ),
					action: 'cancel',
					flags: [ 'safe' ]
				}
			];
			confirmDeleteCalendarDialog.prototype.initialize = function () {
				confirmDeleteCalendarDialog.super.prototype.initialize.apply( this, arguments );
				this.content = new OO.ui.PanelLayout( {
					padded: true,
					expanded: false
				} );
				this.content.$element.append(
					$( '<p>' ).text( mw.msg( 'appointments-ui-delete-calendar-confirmation' ) )
				);
				this.$body.append( this.content.$element );
			};
			confirmDeleteCalendarDialog.prototype.getActionProcess = function ( action ) {
				if ( action === 'accept' ) {
					return new OO.ui.Process( () => this.close( { action } ) );
				}
				return new OO.ui.Process( () => this.close( { action: 'cancel' } ) );
			};

			const dialog = new confirmDeleteCalendarDialog( { size: 'medium' } );
			this.openDialog( dialog ).done( async ( data ) => {
				if ( data && data.action === 'accept' ) {
					try {
						await ext.appointments.api.deleteCalendar( calendar.guid );
						dfd.resolve( true );
					} catch ( e ) {
						mw.notify( mw.msg( 'appointments-ui-delete-calendar-failed' ), { type: 'error' } );
						dfd.reject( e );
					}
				} else {
					dfd.reject();
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
		},
		unassignCalendarWithConfirmation: function ( calendar ) {
			const dfd = $.Deferred();

			OO.ui.confirm(
				mw.msg( 'appointments-ui-unassign-calendar-confirmation' ), {
					actions: [
						{
							label: mw.msg( 'appointments-ui-action-hide' ),
							flags: [ 'destructive' ],
							action: 'accept'
						},
						{
							label: mw.msg( 'appointments-ui-cancel' ),
							action: 'cancel'
						}
					],
					size: 'large'
				} )
				.done( async ( confirmed ) => {
					if ( !confirmed ) {
						dfd.reject();
					} else {
						try {
							await ext.appointments.api.unassignCalendar( calendar );
							dfd.resolve( true );
						} catch ( e ) {
							mw.notify( mw.msg( 'appointments-ui-unassign-calendar-failed' ), { type: 'error' } );
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
