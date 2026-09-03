makeToolbar = function ( view ) {
	const toolFactory = new OO.ui.ToolFactory();
	const toolGroupFactory = new OO.ui.ToolGroupFactory();
	const toolbar = new OO.ui.Toolbar( toolFactory, toolGroupFactory );
	toolbar.$element.addClass( 'appointments-main-toolbar' );

	view = view || 'month';

	function ToggleCalendarsTool() {
		ToggleCalendarsTool.super.apply( this, arguments );
		this.control = new OO.ui.ToggleButtonWidget( {
			framed: true,
			icon: 'menu',
			title: mw.msg( 'appointments-ui-toggle-calendars' ),
			classes: [ 'ext-appointments-toggle-calendars' ]
		} );
		this.control.$element.children( 'a' ).attr( 'aria-controls', 'ext-appointments-scheduler-calendars' );
		this.control.connect( this, { change: 'onSelect' } );
		this.calendarsVisible = true;
		this.control.setValue( this.calendarsVisible );

		this.$element.html( this.control.$element );
	}
	OO.inheritClass( ToggleCalendarsTool, OO.ui.Tool );

	ToggleCalendarsTool.static.name = 'toggleCalendars';
	ToggleCalendarsTool.prototype.onSelect = function ( value ) {
		this.calendarsVisible = value;
		toolbar.emit( 'toggleCalendars', this.calendarsVisible );
	};
	ToggleCalendarsTool.prototype.onUpdateState = function () {};
	toolFactory.register( ToggleCalendarsTool );

	function ModeSwitchTool() {
		ModeSwitchTool.super.apply( this, arguments );
		this.control = new OO.ui.ButtonSelectWidget( {
			items: [
				new OO.ui.ButtonOptionWidget( {
					data: 'day',
					label: mw.msg( 'appointments-ui-view-day' )
				} ),
				new OO.ui.ButtonOptionWidget( {
					data: 'week',
					label: mw.msg( 'appointments-ui-view-week' )
				} ),
				new OO.ui.ButtonOptionWidget( {
					data: 'month',
					label: mw.msg( 'appointments-ui-view-month' )
				} ),
				new OO.ui.ButtonOptionWidget( {
					data: 'year',
					label: mw.msg( 'appointments-ui-view-year' )
				} )
			]
		} );
		if ( view ) {
			this.control.selectItemByData( view );
		}
		this.control.connect( this, { select: 'onSelect' } );
		this.$element.html( this.control.$element );
	}
	OO.inheritClass( ModeSwitchTool, OO.ui.Tool );

	ModeSwitchTool.static.name = 'calendar_view';
	ModeSwitchTool.prototype.onSelect = function () {
		const selected = this.control.findSelectedItem();
		if ( !selected ) {
			return false;
		}
		toolbar.emit( 'viewChange', selected.getData() );
		return true;
	};
	ModeSwitchTool.prototype.onUpdateState = function () {};
	toolFactory.register( ModeSwitchTool );

	toolbar.setup( [
		{
			name: 'actions',
			classes: [ 'default-actions' ],
			type: 'bar',
			include: [ 'toggleCalendars' ]
		},
		{
			name: 'actions',
			classes: [ 'right-actions' ],
			type: 'bar',
			include: [ 'calendar_view' ]
		}
	] );
	return toolbar;
};

module.exports = makeToolbar;