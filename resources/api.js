const api = {
	normalizeCollectionResponse: function ( res ) {
		if ( Array.isArray( res ) ) {
			return res;
		}

		return Object.values( res || {} );
	},
	toEventType: function ( eventTypeData ) {
		require( './object/eventType/Meeting.js' );
		require( './object/eventType/Imported.js' );

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
			calendarData.permissions || {},
			calendarData.imported || false
		);
	},
	toAppointment: function( appointmentData ) {
		if ( appointmentData instanceof ext.appointments.objects.Appointment ) {
			return appointmentData;
		}

		const participants = ( appointmentData.participants || [] ).map( ( p ) => {
			const key = p && typeof p.getKey === 'function' ? p.getKey() : p.key;
			const value = p && typeof p.getValue === 'function' ? p.getValue() : p.value;
			return new ext.appointments.objects.Participant( key, value );
		} );

		const toPeriod = ( periodData ) => {
			if ( periodData instanceof ext.appointments.objects.PeriodDefinition ) {
				return periodData;
			}

			const data = periodData || {};
			const get = ( key, method, fallback = null ) => {
				if ( data && typeof data[ method ] === 'function' ) {
					return data[ method ]();
				}
				return Object.prototype.hasOwnProperty.call( data, key ) ? data[ key ] : fallback;
			};

			return new ext.appointments.objects.PeriodDefinition(
				get( 'startDate', 'getStartDate' ),
				get( 'startTime', 'getStartTime' ),
				get( 'endDate', 'getEndDate' ),
				get( 'endTime', 'getEndTime' ),
				get( 'isAllDay', 'isAllDay', false ),
				get( 'recurrenceRule', 'getRecurrenceRule', null )
			);
		};

		return new ext.appointments.objects.Appointment(
			appointmentData.guid,
			appointmentData.title,
			participants,
			api.toCalendar( appointmentData.calendar ),
			api.toEventType( appointmentData.eventType ),
			toPeriod( appointmentData.periodDefinition ),
			toPeriod( appointmentData.periodUTC ),
			toPeriod( appointmentData.userPeriod ),
			appointmentData.creator,
			appointmentData.data,
			appointmentData.agendaLink,
			appointmentData.permissions
		);
	},
	getCalendars: async function ( onlyAssigned ) {
		const res = await ext.appointments.api._get( onlyAssigned ? 'calendars?assigned=1' : 'calendars' );

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
	assignCalendar: function ( calendar ) {
		return ext.appointments.api._post( `calendar/assign/${calendar.guid}` );
	},
	unassignCalendar: function ( calendar ) {
		return ext.appointments.api._post( `calendar/unassign/${calendar.guid}` );
	},
	importCalendar: function ( type, data ) {
		return ext.appointments.api._post( 'calendar/import', {
			type: type,
			data: data
		} );
	},
	clearImportedCalendarSync: function ( calendar ) {
		return ext.appointments.api._post( `calendar/import/clear-sync/${calendar.guid}` );
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
