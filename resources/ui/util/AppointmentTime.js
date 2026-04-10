const timePicker = require( './TimePicker.js' );
const periodDefinition = require( './../../object/PeriodDefinition.js' );

const appointmentTime = function ( period, cfg ) {
	cfg = cfg || {};
	appointmentTime.parent.apply( this, cfg );
	this.dialog = cfg.dialog;

	this.period = period;
	this.today = moment().format( 'YYYY-MM-DD' );
	this.defaultDate = cfg.defaultDate || this.today;
	const hourNow = this.getUserTime();
	if ( hourNow ) {
		this.defaultStart = `${ hourNow }:00`;
		this.defaultEnd = `${ hourNow }:30`;
	}

	this.timedAppointment = this.makeTimed();
	this.timedAppointment.$element.hide();
	this.allDayAppointment = this.makeAllDay();
	this.allDayAppointment.$element.hide();

	this.recurrence = this.makeRecurrence();
	this.allDayCheck = new OO.ui.CheckboxInputWidget();
	this.allDayCheck.connect( this, { change: 'onAllDayChange' } );



	this.render();
	this.setValue( period );

	this.$element.addClass( 'appointments-appointment-time' );
};

OO.inheritClass( appointmentTime, OO.ui.Widget );

appointmentTime.prototype.makeTimed = function () {
	// Make DatePicker + start and end date dropdowns in 30 minute intervals
	this.date = new OOJSPlus.ui.widget.DateInputWidget( {
		mustBeAfter: this.today,
		$overlay: this.dialog ? this.dialog.$overlay : true,
		value: this.defaultDate
	} );
	this.date.connect( this, { change: 'onItemChange' } );
	this.startTime = new timePicker( { $overlay: this.dialog ? this.dialog.$overlay : true } );
	if ( this.defaultStart ) {
		console.log( this.defaultStart );
		this.startTime.setValue( this.defaultStart );
	}
	this.startTime.connect( this, { change: 'onItemChange' } );
	this.endTime = new timePicker( { $overlay: this.dialog ? this.dialog.$overlay : true } );
	if ( this.defaultEnd ) {
		this.endTime.setValue( this.defaultEnd );
	}
	this.endTime.connect( this, { change: 'onItemChange' } );

	return new OO.ui.HorizontalLayout( {
		items: [
			new OO.ui.FieldLayout( this.date, { label: mw.msg( 'appointments-ui-date' ), align: 'top' } ),
			new OO.ui.FieldLayout( this.startTime, { label: mw.msg( 'appointments-ui-time-start' ), align: 'top' } ),
			new OO.ui.FieldLayout( this.endTime, { label: mw.msg( 'appointments-ui-time-end' ), align: 'top' } ),
		],
		classes: [ 'appointments-timed-appointment' ]
	} );
};

appointmentTime.prototype.makeAllDay = function () {
	// Make DatePicker
	this.dateStart = new OOJSPlus.ui.widget.DateInputWidget( {
		mustBeAfter: this.today,
		$overlay: this.dialog ? this.dialog.$overlay : true,
		value: this.defaultDate
	} );
	this.dateStart.connect( this, { change: 'onItemChange' } );
	this.dateEnd = new OOJSPlus.ui.widget.DateInputWidget( {
		mustBeAfter: this.today,
		$overlay: this.dialog ? this.dialog.$overlay : true,
		value: this.defaultDate
	} );
	this.dateEnd.connect( this, { change: 'onItemChange' } );

	return new OO.ui.HorizontalLayout( {
		items: [
			new OO.ui.FieldLayout( this.dateStart, { label: mw.msg( 'appointments-ui-date-start' ), align: 'top' } ),
			new OO.ui.FieldLayout( this.dateEnd, { label: mw.msg( 'appointments-ui-date-end' ), align: 'top' } ),
		],
		classes: [ 'appointments-all-day-appointment' ]
	} );
};

appointmentTime.prototype.makeRecurrence = function () {
	// Make dropdown for recurrence options (none, daily, weekly, monthly)
	this.recurrenceSelect = new OO.ui.DropdownInputWidget( {
		options: [
			{ data: 'none', label: mw.msg( 'appointments-ui-recurrence-none' ) },
			{ data: 'weekly', label: mw.msg( 'appointments-ui-recurrence-weekly' ) },
			{ data: 'monthly', label: mw.msg( 'appointments-ui-recurrence-monthly' ) },
			{ data: 'yearly', label: mw.msg( 'appointments-ui-recurrence-yearly' ) },
		],
		$overlay: this.dialog ? this.dialog.$overlay : true,
	} );
	this.recurrenceSelect.connect( this, { change: 'onItemChange' } );
	return new OO.ui.FieldLayout( this.recurrenceSelect, { label: mw.msg( 'appointments-ui-recurrence' ), align: 'top' } );
};

appointmentTime.prototype.render = function () {
	this.$element.append(
		this.timedAppointment.$element,
		this.allDayAppointment.$element,
		new OO.ui.HorizontalLayout( {
			items: [
				new OO.ui.FieldLayout( this.recurrenceSelect, { label: mw.msg( 'appointments-ui-recurrence' ), align: 'left' } ),
				new OO.ui.FieldLayout( this.allDayCheck, { label: mw.msg( 'appointments-ui-all-day' ), align: 'inline' } )
			],
			classes: [ 'appointments-appointment-options' ]
		} ).$element
	);
};

appointmentTime.prototype.onAllDayChange = function ( checked ) {
	if ( checked ) {
		this.timedAppointment.$element.hide();
		this.allDayAppointment.$element.show();
	} else {
		this.timedAppointment.$element.show();
		this.allDayAppointment.$element.hide();
	}
	this.onItemChange();
};

appointmentTime.prototype.getValue = function () {
	const isAllDay = this.allDayCheck.isSelected();
	let startDate, endDate;
	let startTime = '00:00', endTime = '00:00';
	let recurrenceRule = null;

	if ( isAllDay ) {
		startDate = this.dateStart.getValue();
		endDate = this.dateEnd.getValue();
	} else {
		startDate = this.date.getValue();
		endDate = this.date.getValue();
		startTime = this.startTime.getValue();
		endTime = this.endTime.getValue();
	}
	if ( this.recurrenceSelect.getValue() !== 'none' ) {
		recurrenceRule = this.recurrenceSelect.getValue();
	}

	return new periodDefinition(
		startDate,
		startTime,
		endDate,
		endTime,
		isAllDay,
		recurrenceRule
	);
};

appointmentTime.prototype.setValue = function ( value ) {
	this.onAllDayChange( false );
	if ( !value ) {
		return;
	}
	this.allDayCheck.setValue( value.isAllDay() );
	if ( value.isAllDay() ) {
		this.dateStart.setValue( value.getStartDate() );
		this.dateEnd.setValue( value.getEndDate() );
	} else {
		this.date.setValue( value.getStartDate());
		this.startTime.setValue( value.getStartTime() );
		this.endTime.setValue( value.getEndTime() );
	}
	if ( value.getRecurrenceRule() ) {
		this.recurrenceSelect.setValue( value.getRecurrenceRule() );
	}
};

appointmentTime.prototype.onItemChange = function () {
	this.emit( 'change', this.getValue() );
};

appointmentTime.prototype.isValid = function () {
	let startDate;
	if ( this.allDayCheck.isSelected() ) {
		startDate = this.dateStart.getValue();
		return startDate && startDate >= this.today &&
			this.dateEnd.getValue() && startDate <= this.dateEnd.getValue();
	} else {
		const startTime = this.startTime.getRaw();
		const endTime = this.endTime.getRaw();
		startDate = this.date.getValue();
		return startDate && startDate >= this.today && endTime > startTime;
	}
};

appointmentTime.prototype.getUserTime = function () {
	const value = mw.user.options.get('timecorrection') || 'System';
	if ( value === 'System' ) {
		return moment().format('HH');
	}
	const [ type, offset, tz ] = value.split('|');

	if ( ( type === 'ZoneInfo' || type === 'Offset' ) && offset) {
		return moment().utcOffset(parseInt(offset, 10)).format('HH');
	}

	if (type === 'Offset' && offset) {
		return moment().utcOffset(parseInt(offset, 10)).format('HH');
	}

	return moment().format('HH');
}

module.exports = appointmentTime;
