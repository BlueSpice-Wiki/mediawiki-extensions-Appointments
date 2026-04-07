const editorClass = require("./EditorDialog.js");
const scheduler = function ( config ) {
	scheduler.parent.call( this, $.extend( {
		expanded: false,
		padded: true
	}, config ) );

	this.onlyPersonal = config.onlyPersonal;

	this.buildControls();
};

OO.inheritClass( scheduler, OO.ui.PanelLayout );

scheduler.prototype.buildControls = async function () {
	const calendarPickerClass = require( './CalendarMultiselect.js' );
	this.calendarPicker = new calendarPickerClass( {} );
	this.calendarPicker.connect( this, {
		calendarCreated: async () => {
			await this.calendarPicker.load();
		},
		select: async ( calendarGuids ) => {
			this.loadAndRenderAppointments( calendarGuids );
		}
	} );
	await this.calendarPicker.load();

	this.newAppointmentButton = new OO.ui.ButtonWidget( {
		label: mw.message( 'appointments-ui-new-appointment' ).text(),
		icon: 'add',
		flags: [ 'primary', 'progressive' ]
	} );
	this.newAppointmentButton.connect( this, {
		click: () => {
			ext.appointments.util.openAppointmentEditorDialog( null ).then( ( res ) => {
				console.log( "APPOINTMENT DIALOG RESULT", res );
			} );
		}
	} );

	this.$element.append( new OO.ui.HorizontalLayout( {
		items: [
			this.newAppointmentButton,
			new OO.ui.FieldLayout( this.calendarPicker, {
				label: mw.message( 'appointments-ui-calendars' ).text(),
				align: 'left'
			} )
		]
	} ).$element );
};

scheduler.prototype.loadAndRenderAppointments = async function ( calendarGuids ) {
	const appointments = [];
	for ( const calendarGuid of calendarGuids ) {
		const calendarAppointments = await ext.appointments.api.getAppointments( calendarGuid, this.onlyPersonal );
		console.log( "CALENDAR APPOINTMENTS", calendarAppointments );
		//appointments.push( ...calendarAppointments );
	}
	return appointments;
}

module.exports = scheduler;