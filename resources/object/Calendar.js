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
	 * @param {boolean} imported
	 */
	constructor( guid, name, description, eventTypes, creator, wikiId, data, permissions, imported ) {
		this.guid = guid;
		this.name = name;
		this.description = description;
		this.eventTypes = eventTypes;
		this.creator = creator;
		this.wikiId = wikiId;
		this.data = data || {};
		this.permissions = permissions || {}
		this.imported = imported || false
	}

	canEdit() {
		return !this.imported && ( this.permissions.edit || false );
	}

	canDelete() {
		return this.permissions.delete || false;
	}

	setRestrictions( type, readers, editors, deleters ) {
		this.data = $.extend( {}, this.data, {
			access: {
				type: type,
				readers: readers,
				editors: editors,
				deleters: deleters
			}
		} );
	}
}

module.exports = Calendar;