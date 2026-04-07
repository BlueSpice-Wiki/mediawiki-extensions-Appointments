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
			const windowManager = OO.ui.getWindowManager();
			windowManager.addWindows( [ dialog ] );
			return windowManager.openWindow( dialog ).closed;
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
				} )
			} );

			return this.openDialog( dialog );
		}
	}
};
