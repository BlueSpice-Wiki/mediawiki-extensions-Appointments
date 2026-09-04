const calendarMenuOption = require( './util/CalendarCheckboxMenuOption.js' );
const AddCalendarButton = require( './util/AddCalendarButton.js' );

const calendarMultiselect = function ( config ) {
	calendarMultiselect.parent.call( this, $.extend( {}, config ) );

	this.$options = $( '<div>' ).addClass( 'ext-appointments-calendar-multiselect-options' );
	this.createPermissions = mw.config.get( 'wgAppointmentsPermissions');

	this.addCalendarButton = new AddCalendarButton();
	this.addCalendarButton.connect( this, {
		created: () => {
			this.emit( 'created' );
			this.reload();
		},
		imported: () => {
			this.reload();
		}
	} );

	this.searchButton = new OO.ui.ButtonWidget( {
		title: mw.msg( 'appointments-ui-search-calendars' ),
		icon: 'search',
		framed: false,
		classes: [ 'ext-appointments-search-button' ]
	} );
	this.searchButton.connect( this, {
		click: () => {
			this.searchInput.$element.toggle();
			if ( this.searchInput.$element.is( ':visible' ) ) {
				this.searchInput.focus();
			} else {
				this.searchInput.setValue( '' );
			}
		}
	} );
	this.searchInput = new OO.ui.SearchInputWidget( {
		classes: [ 'ext-appointments-search-input' ],
		placeholder: mw.msg( 'appointments-ui-search-calendars' )
	} );
	this.searchInput.$element.hide();
	this.searchInput.connect( this, { change: 'onSearchInput' } );

	this.$noCalendarNotice = $( '<div>' ).addClass( 'ext-appointments-no-calendars-notice' );
	this.$element.append( this.$noCalendarNotice );
	this.$element.append( this.searchButton.$element );
	if ( this.createPermissions['create-calendar'] ) {
		this.$element.append( this.addCalendarButton.$element );
	}
	const $floatClear = $( '<div>' ).addClass( 'ext-appointments-float-clear' );
	this.$element.append( $floatClear, this.searchInput.$element );
	this.$element.append( this.$options );

	this.isInitialized = false;
	this.selector = null;
	this.importedSelector = null;
	this.reload( config.value || null );
};

OO.inheritClass( calendarMultiselect, OO.ui.Widget );

calendarMultiselect.prototype.createSelector = function ( items ) {
	const selector = new OO.ui.CheckboxMultiselectWidget( { items: items } );
	selector.connect( this, {
		select: ( item, selected ) => {
			const value = {};
			if ( !selected ) {
				item.unselectEventTypes();
			} else {
				item.selectAllEventTypes();
			}
			value[item.getData()] = item.getValue();
			this.emit( 'select', value, selected );
		}
	} );

	return selector;
};

calendarMultiselect.prototype.getSelectors = function () {
	return [ this.selector, this.importedSelector ].filter( ( selector ) => !!selector );
};

calendarMultiselect.prototype.findItemFromData = function ( data ) {
	for ( const selector of this.getSelectors() ) {
		const option = selector.findItemFromData( data );
		if ( option ) {
			return option;
		}
	}
	return null;
};

calendarMultiselect.prototype.findSelectedItems = function () {
	const selectedItems = [];
	for ( const selector of this.getSelectors() ) {
		selectedItems.push( ...selector.findSelectedItems() );
	}
	return selectedItems;
};

calendarMultiselect.prototype.selectItemsByData = function ( selectedCalendars ) {
	for ( const selector of this.getSelectors() ) {
		selector.selectItemsByData( selectedCalendars );
	}
};

calendarMultiselect.prototype.reload = function ( value ) {
	this.$options.html( new OO.ui.ProgressBarWidget( { progress: false } ).$element );
	const preValue = value || this.getValue();
	ext.appointments.api.getCalendars( true ).then( calendars => {
		const regularItems = [];
		const importedItems = [];
		for ( const calendar of calendars ) {
			const option = new calendarMenuOption( calendar );
			option.connect( this, {
				select: ( item, selected ) => {
					const value = {};
					value[item.getData()] = item.getValue();
					this.emit( 'select', value, selected );
				},
				edit: () => {
					this.reload();
				},
				delete: () => {
					this.reload();
				},
				refresh: () => {
					this.reload();
				}
			} );
			if ( calendar.imported ) {
				importedItems.push( option );
			} else {
				regularItems.push( option );
			}
		}

		this.selector = this.createSelector( regularItems );
		this.importedSelector = importedItems.length ? this.createSelector( importedItems ) : null;

		if ( !preValue ) {
			this.selectItemsByData( calendars.map( calendar => calendar.guid ) );
			this.selectedAllEventTypes();
		} else {
			this.setValue( preValue );
		}

		const allItems = regularItems.concat( importedItems );
		const $options = $( '<div>' );
		$options.append( this.selector.$element );
		if ( this.importedSelector ) {
			$options.append(
				$( '<div>' )
					.addClass( 'ext-appointments-calendar-section-label' )
					.text( mw.message( 'appointments-ui-imported-calendars' ).text() ),
				this.importedSelector.$element
			);
		}
		this.$options.html( $options );

		if ( !this.isInitialized ) {
			this.emit( 'initialize', this.getValue(), allItems );
			this.isInitialized = true;
		} else {
			this.emit( 'reload', this.getValue(), allItems );
		}
		if ( allItems.length === 0 ) {
			this.addNoCalendarNotice();
			this.searchButton.$element.hide();
		} else {
			this.$noCalendarNotice.empty();
			this.searchButton.$element.show();
		}
	} ).catch( ( e ) => {
		console.error( e ); // eslint-disable-line no-console
		this.$element.html( new OO.ui.MessageWidget( {
			type: 'error',
			label: mw.message( 'appointments-ui-load-calendars-failed' ).text()
		} ).$element );
	} );
};

calendarMultiselect.prototype.addNoCalendarNotice = function () {
	this.$noCalendarNotice.empty();
	const noticeLabel = new OO.ui.LabelWidget( {
		label: mw.message( 'appointments-ui-no-calendars' ).text(),
		classes: [ 'ext-appointments-no-calendars-notice-label' ]
	} );
	this.$noCalendarNotice.append( noticeLabel.$element );
	if ( this.createPermissions['create-calendar'] ) {
		const creationInstructionsLabel = new OO.ui.LabelWidget( {
			label: mw.message( 'appointments-ui-create-calendar-instructions' ).text(),
			classes: [ 'ext-appointments-no-calendars-instructions' ]
		} );
		this.$noCalendarNotice.append( creationInstructionsLabel.$element );
	}
};

calendarMultiselect.prototype.getValue = function () {
	if ( !this.selector && !this.importedSelector ) {
		return null;
	}
	// Find all selected options
	const selectedCalendars = this.findSelectedItems();
	const value = {};
	for ( const calendarOption of selectedCalendars ) {
		value[calendarOption.getData()] = calendarOption.getValue();
	}

	return value;
};

calendarMultiselect.prototype.setValue = function ( value ) {
	if ( !this.selector && !this.importedSelector ) {
		return;
	}
	const selectedCalendars = [];
	for ( const calendarGuid in value ) {
		selectedCalendars.push( calendarGuid );
		const calendarOption = this.findItemFromData( calendarGuid );
		if ( calendarOption ) {
			calendarOption.setValue( value[calendarGuid] );
		}
	}
	this.selectItemsByData( selectedCalendars );

}

calendarMultiselect.prototype.selectedAllEventTypes = function () {
	const selectedCalendars = this.findSelectedItems();
	for ( const calendarOption of selectedCalendars ) {
		calendarOption.selectAllEventTypes();
	}
};

calendarMultiselect.prototype.ensureSelected = function ( calendarGuid, eventTypeGuid ) {
	if ( ( !this.selector && !this.importedSelector ) || !calendarGuid ) {
		return;
	}
	const calendarOption = this.findItemFromData( calendarGuid );
	if ( !calendarOption ) {
		return;
	}

	// Selecting a previously unselected calendar selects all of its event
	// types and emits 'select', which updates the data provider and preferences.
	if ( !calendarOption.isSelected() ) {
		calendarOption.setSelected( true );
		return;
	}

	if ( !eventTypeGuid ) {
		return;
	}
	const selectedEventTypes = calendarOption.getValue();
	if ( selectedEventTypes.indexOf( eventTypeGuid ) !== -1 ) {
		return;
	}
	calendarOption.setValue( selectedEventTypes.concat( [ eventTypeGuid ] ) );

	const value = {};
	value[calendarGuid] = calendarOption.getValue();
	this.emit( 'select', value, true );
};

calendarMultiselect.prototype.onSearchInput = function ( value ) {
	if ( !this.selector && !this.importedSelector ) {
		return;
	}
	const query = ( value || '' ).trim().toLowerCase();

	for ( const selector of this.getSelectors() ) {
		let selectorHasVisibleItems = false;
		for ( const calendarOption of selector.items ) {
			const calendarName = ( calendarOption.calendar.name || '' ).toLowerCase();
			const calendarMatches = query === '' || calendarName.indexOf( query ) !== -1;

			let anyEventTypeMatches = false;
			const eventTypeOptions = calendarOption.typeSelector ? calendarOption.typeSelector.items : [];
			for ( const eventTypeOption of eventTypeOptions ) {
				const eventTypeName = ( eventTypeOption.getLabel() || '' ).toString().toLowerCase();
				const eventTypeMatches = query === '' || calendarMatches ||
					eventTypeName.indexOf( query ) !== -1;
				eventTypeOption.$element.toggle( eventTypeMatches );
				if ( eventTypeMatches ) {
					anyEventTypeMatches = true;
				}
			}

			const showCalendar = calendarMatches || anyEventTypeMatches;
			selectorHasVisibleItems = selectorHasVisibleItems || showCalendar;
			calendarOption.$element.toggle( showCalendar );
			if ( calendarOption.typeSelector ) {
				calendarOption.typeSelector.$element.toggle( showCalendar );
			}
		}
		if ( selector === this.importedSelector ) {
			const $label = this.$options.find( '.ext-appointments-calendar-section-label' );
			selector.$element.toggle( selectorHasVisibleItems );
			$label.toggle( selectorHasVisibleItems );
		}
	}
};

module.exports = calendarMultiselect;
