const api = {
	normalizeCollectionResponse: function ( res ) {
		if ( Array.isArray( res ) ) {
			return res;
		}

		return Object.values( res || {} );
	},
	toEventType: function ( eventTypeData ) {
		require( './object/eventType/Meeting.js' );

		let eventType = new ext.appointments.objects.EventType( eventTypeData.guid );
		if ( ext.appointments.eventTypeRegistry.lookup( eventTypeData.guid ) ) {
			eventType = new ( ext.appointments.eventTypeRegistry.lookup( eventTypeData.guid ) )( eventTypeData.guid );
		}
		eventType.name = eventTypeData.name;
		eventType.description = eventTypeData.description;
		eventType.data = eventTypeData.data || {};
		eventType.isSystem = eventTypeData.system || false;

		return eventType;
	},
	toCalendar: function ( calendarData ) {
		const eventTypes = api.normalizeCollectionResponse( calendarData.eventTypes )
			.map( ( eventTypeData ) => api.toEventType( eventTypeData ) );

		return new ext.appointments.objects.Calendar(
			calendarData.guid,
			calendarData.name,
			calendarData.description,
			eventTypes,
			calendarData.creator,
			calendarData.wikiId,
			calendarData.data || {},
			calendarData.permissions || {}
		);
	},
	toAppointment: function( appointmentData ) {
		return new ext.appointments.objects.Appointment(
			appointmentData.guid,
			appointmentData.title,
			appointmentData.participants.map( p => new ext.appointments.objects.Participant( p.key, p.value ) ),
			api.toCalendar( appointmentData.calendar ),
			api.toEventType( appointmentData.eventType ),
			new ext.appointments.objects.PeriodDefinition( ...Object.values( appointmentData.periodDefinition ) ),
			new ext.appointments.objects.PeriodDefinition( ...Object.values( appointmentData.periodUTC ) ),
			new ext.appointments.objects.PeriodDefinition( ...Object.values( appointmentData.userPeriod ) ),
			appointmentData.creator,
			appointmentData.data,
			appointmentData.agendaLink,
			appointmentData.permissions
		);
	},
	getCalendars: async function () {
		const res = await ext.appointments.api._get( 'calendars' );

		return api.normalizeCollectionResponse( res )
			.map( ( calendarData ) => api.toCalendar( calendarData ) );
	},
	saveCalendar: function ( calendar ) {
		return ext.appointments.api._post( 'calendar', {
			guid: calendar.guid || null,
			name: calendar.name,
			eventTypes: calendar.eventTypes.map( et => et.guid ),
			description: calendar.description,
			data: JSON.stringify( calendar.data )
		} );
	},
	deleteCalendar: function ( guid, moveAppointmentsTo ) {
		return ext.appointments.api._post( `calendar/delete/${guid}`, {
			appointment_move_to: moveAppointmentsTo || null
		} );
	},

	getEventTypes: async function () {
		const res = await ext.appointments.api._get( 'event_types' );

		return api.normalizeCollectionResponse( res )
			.map( ( eventTypeData ) => api.toEventType( eventTypeData ) );
	},
	saveEventType: async function ( eventType ) {
		return ext.appointments.api._post( 'event_type', {
			guid: eventType.guid || null,
			name: eventType.name,
			description: eventType.description,
			data: eventType.data
		} );
	},
	deleteEventType: async function ( eventType ) {
		return ext.appointments.api._post( `event_type/delete/${eventType.guid}` );
	},


	getAppointments: async function ( calendarId, eventTypes, onlyPersonal, startDate, endDate ) {
		const params = new URLSearchParams();
		if ( calendarId !== undefined ) {
			params.append( 'calendar', calendarId );
		}
		if ( onlyPersonal !== undefined ) {
			params.append( 'onlyPersonal', onlyPersonal );
		}
		if ( startDate !== undefined ) {
			params.append( 'startDate', startDate );
		}
		if ( endDate !== undefined ) {
			params.append( 'endDate', endDate );
		}
		if ( eventTypes ) {
			params.append( 'eventTypes', eventTypes.join( '|' ) );
		}

		const res = await ext.appointments.api._get( `appointments?${ params.toString() }` );
		const appointments = [];
		for ( let i = 0; i < res.length; i++ ) {
			const appointmentData = res[ i ];
			appointments.push( api.toAppointment( appointmentData ) );
		}
		return appointments;
	},

	getAppointment: async function ( guid ) {
		const res = await ext.appointments.api._get( `appointment/${guid}` );
		return api.toAppointment( res );
	},
	saveAppointment: function ( appointment ) {
		return ext.appointments.api._post( 'appointment', {
			guid: appointment.guid || null,
			title: appointment.title,
			participants: appointment.participants.map( p => p.serialize() ),
			calendar_guid: appointment.calendar.guid,
			event_type: appointment.eventType ? appointment.eventType.guid : null,
			start_date: appointment.periodDefinition.getStartDate(),
			start_time: appointment.periodDefinition.getStartTime(),
			end_date: appointment.periodDefinition.getEndDate(),
			end_time: appointment.periodDefinition.getEndTime(),
			is_all_day: appointment.periodDefinition.isAllDay(),
			recurrence: appointment.periodDefinition.getRecurrenceRule(),
			data: appointment.data
		} );
	},
	deleteAppointment: function ( guid ) {
		return ext.appointments.api._post( `appointment/delete/${guid}` );
	},

	_get: function ( path ) {
		const url = mw.util.wikiScript( 'rest' ) + '/appointments/v0/' + path;
		const options = {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		};
		return fetch( url, options ).then( ( res ) => {
			if ( !res.ok ) {
				throw new Error( `REST request failed: ${ res.status }` );
			}
			return res.json();
		} );
	},
	_post: function ( path, params ) {
		const url = mw.util.wikiScript( 'rest' ) + '/appointments/v0/' + path;
		const options = {
			method: 'POST'
		};
		if ( params !== undefined ) {
			options.headers = {
				'Content-Type': 'application/json'
			}
			options.body = JSON.stringify( params );
		}
		return fetch(url, options).then(async (res) => {
			const data = await res.json().catch(() => null); // handle non-JSON safely

			if (!res.ok) {
				if ( data.message ) {
					throw new Error( data.message );
				}
				throw new Error(`REST request failed: ${res.status} - ${JSON.stringify(data)}`);
			}

			return data;
		});
	}
}

module.exports = api;
