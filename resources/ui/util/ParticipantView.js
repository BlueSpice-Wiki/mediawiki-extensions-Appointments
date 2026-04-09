const participantView = function ( participants ) {
	let items = [
		new OO.ui.IconWidget( { icon: 'userGroup' } )
	];

	const count = participants.length;
	let primary = participants, leftOver = null;
	if ( count > 3 ) {
		primary = participants.slice( 0, 3 );
		leftOver = participants.slice( 3 );
	}

	items = items.concat( this.getParticipantWidgets( primary ) );
	if ( leftOver ) {
		const leftOverLayout = new OO.ui.PanelLayout( {
			expanded: false,
			padded: false
		} );
		leftOverLayout.$element.append(
			this.getParticipantWidgets( leftOver ).map( widget => widget.$element )
		);

		items.push(
			new OO.ui.PopupButtonWidget( {
				framed: false,
				label: '+' + leftOver.length,
				$overlay: true,
				popup: {
					$content: new OO.ui.PanelLayout( {
						$content: leftOverLayout.$element,
						padded: false,
						expanded: false
					} ).$element,
					padded: true
				}
			} )
		);
	}

	participantView.parent.call( this, {
		items: items,
		classes: [ 'entity-wrapper' ]
	} );
};


OO.inheritClass( participantView, OO.ui.HorizontalLayout );

participantView.prototype.getParticipantWidgets = function ( participants ) {
	const participantWidgets = [];
	for ( let i = 0; i < participants.length; i++ ) {
		const participant = participants[i];
		if ( participant.getKey() === 'user' ) {
			participantWidgets.push(
				new OOJSPlus.ui.widget.UserWidget({user_name: participant.getValue()})
			);
		}
		if ( participant.getKey() === 'group' ) {
			participantWidgets.push(
				new OOJSPlus.ui.widget.GroupWidget({group_name: participant.getValue()})
			);
		}
	}

	return participantWidgets;
};

module.exports = participantView;
