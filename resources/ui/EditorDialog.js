const editorDialog = function (config ) {
	this.entity = config.entity;
	editorDialog.parent.call( this, config );
};

OO.inheritClass( editorDialog, OO.ui.ProcessDialog );

editorDialog.static.name = 'entityEditorDialog';
editorDialog.static.title = '';
editorDialog.static.actions = [
	{
		action: 'save',
		label: mw.message( 'appointments-ui-save' ).text(),
		flags: [ 'primary', 'progressive' ]
	},
	{
		action: 'cancel',
		label: mw.message( 'appointments-ui-cancel' ).text(),
		flags: [ 'safe', 'close' ]
	}
];

editorDialog.prototype.initialize = function () {
	editorDialog.parent.prototype.initialize.call( this );
	this.entity.setDialog( this );
	this.entity.init();
	this.$body.append( this.entity.$element );
	this.$body.addClass( 'appointments-ui-editor-dialog-body' );
};

editorDialog.prototype.getSetupProcess = function (data ) {
	return editorDialog.parent.prototype.getSetupProcess.call( this, data )
		.next( () => {
			this.title.setLabel( this.entity.getLabel() );
			this.entity.focus();
			this.entity.onReady();
		} );
};

editorDialog.prototype.getActionProcess = function (action ) {
	if ( action === 'save' ) {
		return new OO.ui.Process( async () => {
			const dfd = $.Deferred();
			this.pushPending();

			const updatedEntity = this.entity.getUpdatedEntity();
			if ( !this.entity.isDirty() ) {
				this.close();
				return;
			}
			try {
				const res = await this.entity.save( updatedEntity );
				this.close( { entity: updatedEntity, res: res } );
			} catch ( e ) {
				this.popPending();
				dfd.reject( new OO.ui.Error( e ) );
			}

			return dfd.promise();
		} );
	}
	if ( action === 'cancel' ) {
		return new OO.ui.Process( () => {
			this.close();
		} );
	}

	return editorDialog.parent.prototype.getActionProcess.call( this, action );
};

editorDialog.prototype.getBodyHeight = function () {
	if ( !this.$errors.hasClass( 'oo-ui-element-hidden' ) ) {
		return this.$element.find( '.oo-ui-processDialog-errors' )[ 0 ].scrollHeight;
	}
	return this.$element.find( '.oo-ui-window-body' )[ 0 ].scrollHeight + 20;
};

editorDialog.prototype.onDismissErrorButtonClick = function () {
	this.hideErrors();
	this.updateSize();
};

editorDialog.prototype.showErrors = function () {
	editorDialog.parent.prototype.showErrors.call( this, arguments );
	this.updateSize();
};


module.exports = editorDialog;