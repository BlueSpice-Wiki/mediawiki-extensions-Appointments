class Appointment {
	/**
	 * @param {string} guid
	 * @param {string} title
	 * @param {Participant[]} participants
	 * @param {Calendar} calendar
	 * @param {PeriodDefinition} periodDefinition
	 * @param {string} creator Username of the creator
	 * @param {Object} data
	 */
	constructor( guid, title, participants, calendar, periodDefinition, creator, data ) {
		this.guid = guid;
		this.title = title;
		this.participants = participants;
		this.calendar = calendar;
		this.periodDefinition = periodDefinition;
		this.creator = creator;
		this.data = data;
	}
}

module.exports = Appointment;