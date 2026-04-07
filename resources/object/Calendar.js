class Calendar {
	/**
	 * @param {string} guid
	 * @param {string} name
	 * @param {string} description
	 * @param {Object} data
	 */
	constructor( guid, name, description, data ) {
		this.guid = guid;
		this.name = name;
		this.description = description;
		this.data = data;
	}
}

module.exports = Calendar;