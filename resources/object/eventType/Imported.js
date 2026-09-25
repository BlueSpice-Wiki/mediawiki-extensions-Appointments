const Meeting = require( './Meeting.js' );

class Imported extends Meeting {
	constructor( guid, name, description, data, isSystem ) {
		super( 'imported', name, description, data, isSystem );
	}
}

ext.appointments.eventTypeRegistry.register( 'imported', Imported );
