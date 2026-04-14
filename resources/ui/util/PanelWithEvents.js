panelWithEvents = function ( cfg ) {
	cfg = cfg || {};

	panelWithEvents.super.call( this, cfg );
	OO.EventEmitter.call( this );
};

OO.inheritClass( panelWithEvents, OO.ui.PanelLayout );
OO.mixinClass( panelWithEvents, OO.EventEmitter );

module.exports = panelWithEvents;
