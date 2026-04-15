class UserLocalPreferences {
	constructor() {
		this._preferences = this.load();
	}

	getPreference(key) {
		return this._preferences[key];
	}

	setPreference(key, value) {
		this._preferences[key] = value;
		this.save();
	}

	load() {
		const storedPreferences = localStorage.getItem( 'appointmentsUserPreferences' );
		return storedPreferences ? JSON.parse( storedPreferences ) : {};
	}

	save() {
		localStorage.setItem('appointmentsUserPreferences', JSON.stringify(this._preferences));
	}
}

module.exports = UserLocalPreferences;