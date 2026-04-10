const periodDefinition = require( './../../object/PeriodDefinition.js' );

const appointmentTimeView = function ( period ) {
	this.period = period;
	this.timeLabel = new OO.ui.LabelWidget( {
		classes: [ 'appointment-time-view-time' ]
	} );

	const startEqualsEnd = period.getStartDate() === period.getEndDate();
	if ( period.isAllDay() ) {
		if ( startEqualsEnd ) {
			this.timeLabel.setLabel( period.getStartDate() );
		} else {
			this.timeLabel.setLabel( period.getStartDate() + ' - ' + period.getEndDate() );
		}
	} else {
		const startDate = period.getStartDate();
		const startTime = period.getStartTime();
		const endTime = period.getEndTime();
		this.timeLabel.setLabel( `${ startDate }, ${ startTime } - ${ endTime }`)
	}

	appointmentTimeView.parent.call( this, {
		items: [
			new OO.ui.IconWidget( { icon: 'clock' } ),
			this.timeLabel
		],
		classes: [ 'appointment-time-view', 'entity-wrapper' ]
	} );
};

OO.inheritClass( appointmentTimeView, OO.ui.HorizontalLayout );

module.exports = appointmentTimeView;
