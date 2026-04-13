class Appointment {
	/**
	 * @param {string} guid
	 * @param {string} title
	 * @param {Participant[]} participants
	 * @param {Calendar} calendar
	 * @param {EventType} eventType
	 * @param {PeriodDefinition} periodDefinition
	 * @param {PeriodDefinition} periodUTC
	 * @param {PeriodDefinition} userPeriod
	 * @param {string} creator Username of the creator
	 * @param {Object} data
	 * @param {Object} permissions
	 */
	constructor( guid, title, participants, calendar, eventType,
				 periodDefinition, periodUTC, userPeriod, creator, data, permissions
	) {
		this.guid = guid;
		this.title = title;
		this.participants = participants;
		this.calendar = calendar;
		this.eventType = eventType;
		this.periodDefinition = periodDefinition;
		this.periodUTC = periodUTC;
		this.userPeriod = userPeriod;
		this.creator = creator;
		this.data = data;
		this.permissions = permissions || {};
	}

	canEdit() {
		return this.calendar.canEdit() && ( this.permissions.edit || false );
	}

	canDelete() {
		return this.calendar.canDelete() && ( this.permissions.delete || false );
	}
}

module.exports = Appointment;