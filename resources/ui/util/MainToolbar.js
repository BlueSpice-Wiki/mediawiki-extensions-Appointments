makeToolbar = function ( view ) {
	const toolFactory = new OO.ui.ToolFactory();
	const toolGroupFactory = new OO.ui.ToolGroupFactory();
	const toolbar = new OO.ui.Toolbar( toolFactory, toolGroupFactory );
	toolbar.$element.addClass( 'appointments-main-toolbar' );

	view = view || 'month';

	function NewAppointmentTool() {
		NewAppointmentTool.super.apply( this, arguments );
	}
	OO.inheritClass( NewAppointmentTool, OO.ui.Tool );

	NewAppointmentTool.static.name = 'addAppointment';
	NewAppointmentTool.static.icon = 'add';
	NewAppointmentTool.static.displayBothIconAndLabel = true;
	NewAppointmentTool.static.title = mw.msg( 'appointments-ui-new-appointment' );
	NewAppointmentTool.static.flags = [ 'primary', 'progressive' ];
	NewAppointmentTool.prototype.onSelect = function () {
		toolbar.emit( 'add' );
		return true;
	};
	NewAppointmentTool.prototype.onUpdateState = function () {};
	toolFactory.register( NewAppointmentTool );

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
			include: [ 'addAppointment', 'calendar_view' ]
		}
	] );
	return toolbar;
};

module.exports = makeToolbar;