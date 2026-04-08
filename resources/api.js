const api = {
	getCalendars: async function () {
		const res = await ext.appointments.api._get( 'calendars' );

		const calendars = [];
		for ( let i = 0; i < res.length; i++ ) {
			const calendarData = res[ i ];
			const calendar = new ext.appointments.objects.Calendar(
				calendarData.guid,
				calendarData.name,
				calendarData.description,
				calendarData.data
			);
			calendars.push( calendar );
		}
		return calendars;
	},
	saveCalendar: function ( calendar ) {
		return ext.appointments.api._post( 'calendar', {
			guid: calendar.guid || null,
			name: calendar.name,
			description: calendar.description,
			data: JSON.stringify( calendar.data )
		} );
	},
	deleteCalendar: function ( guid, moveAppointmentsTo ) {
		return ext.appointments.api._post( `calendar/delete/${guid}`, {
			appointment_move_to: moveAppointmentsTo || null
		} );

	},

	getAppointments: async function ( calendarId, onlyPersonal, startDate, endDate ) {
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
		const res = await ext.appointments.api._get( `appointments?${ params.toString() }` );
		console.log( res );
	},
	saveAppointment: function ( appointment ) {
		return ext.appointments.api._post( 'appointment', {
			guid: appointment.guid || null,
			title: appointment.title,
			participants: appointment.participants.map( p => p.serialize() ),
			calendar_guid: appointment.calendar.guid,
			start_date: appointment.periodDefinition.getStartDate(),
			start_time: appointment.periodDefinition.getStartTime(),
			end_date: appointment.periodDefinition.getEndDate(),
			end_time: appointment.periodDefinition.getEndTime(),
			is_all_day: appointment.periodDefinition.isAllDay(),
			recurrence: appointment.periodDefinition.getRecurrenceRule(),
			data: JSON.stringify( appointment.data )
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
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify( params )
		};
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