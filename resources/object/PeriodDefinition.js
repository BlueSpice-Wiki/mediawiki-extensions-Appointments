class PeriodDefinition {
	/**
	 * @param {string} startDate
	 * @param {string} startTime
	 * @param {string} endDate
	 * @param {string} endTime
	 * @param {boolean} isAllDay
	 * @param {string|null} recurrenceRule
	 */
	constructor( startDate, startTime, endDate, endTime,isAllDay = false, recurrenceRule = null ) {
		this.#startDate = startDate;
		this.#startTime = startTime;
		this.#endDate = endDate;
		this.#endTime = endTime;
		this.#isAllDay = isAllDay;
		this.#recurrenceRule = recurrenceRule;
	}

	#startDate;
	#startTime;
	#endDate;
	#endTime;
	#isAllDay;
	#recurrenceRule;


	getStartDate() {
		return this.#startDate;
	}

	getStartTime() {
		return this.#startTime;
	}

	getEndDate() {
		return this.#endDate;
	}

	getEndTime() {
		return this.#endTime;
	}

	/**
	 * @return {boolean}
	 */
	isAllDay() {
		return this.#isAllDay;
	}

	/**
	 * @return {string|null}
	 */
	getRecurrenceRule() {
		return this.#recurrenceRule;
	}

	isMultiDay() {
		return this.getStartDate() !== this.getEndDate();
	}
}

module.exports = PeriodDefinition;
