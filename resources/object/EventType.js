class EventType {
	/**
	 * @param {string} guid
	 * @param {string} name
	 * @param {string} description
	 * @param {Object} data
	 * @param {boolean} isSystem
	 */
	constructor( guid, name, description, data, isSystem ) {
		this.guid = guid;
		this.name = name;
		this.description = description;
		this.data = data || {};
		this.isSystem = isSystem;
	}

	getColor() {
		return this.data.color || '#4d5d72';
	}

	getIcon() {
		return this.data.icon || 'calendar';
	}

	setIcon( icon ) {
		this.data = $.extend( {}, this.data, { icon: icon } );
	}

	setColor( color ) {
		this.data = $.extend( {}, this.data, { color: color } );
	}

	isSystemType() {
		return this.isSystem;
	}
}

module.exports = EventType;
