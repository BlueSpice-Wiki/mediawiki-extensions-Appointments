class Calendar {
	/**
	 * @param {string} guid
	 * @param {string} name
	 * @param {string} description
	 * @param {Object} eventTypes
	 * @param {string} creator
	 * @param {string} wikiId
	 * @param {Object} data
	 * @param {Object} permissions
	 */
	constructor( guid, name, description, eventTypes, creator, wikiId, data, permissions ) {
		this.guid = guid;
		this.name = name;
		this.description = description;
		this.eventTypes = eventTypes;
		this.creator = creator;
		this.wikiId = wikiId;
		this.data = data || {};
		this.permissions = permissions || {}
	}

	canEdit() {
		return this.permissions.edit || false;
	}

	canDelete() {
		return this.permissions.delete || false;
	}
}

module.exports = Calendar;