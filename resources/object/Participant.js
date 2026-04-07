class Participant {
	/**
	 * @param {string} key
	 * @param {string} value
	 */
	constructor( key, value ) {
		this.#key = key;
		this.#value = value;
	}

	#key;
	#value;

	/**
	 * @return {string}
	 */
	getKey() {
		return this.#key;
	}

	/**
	 * @return {string}
	 */
	getValue() {
		return this.#value;
	}

	serialize() {
		return {
			key: this.#key,
			value: this.#value,
		};
	}
}

module.exports = Participant;
