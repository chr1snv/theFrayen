
var sailScripts = [
	'sail/Ocean.js',
	'sail/Boat.js',
	'sail/WindAndTide.js',
	'sail/Regatta.js'
];

function SAIL_ScriptLoadCmp(){
	ocean = new Ocean(mainScene);

	sailLdCmpCb();
}

let sailLdCmpCb = null;
function SAIL_sceneSpecificLoad(cmpCb){
	sailLdCmpCb = cmpCb;

	incFileIdx = 0;
	incFileList = sailScripts;
	loadScriptCmpCb = SAIL_ScriptLoadCmp;

	loadScriptLoop();
}


const SailModes = {
	Menu: 0,
	Gameplay: 1
};

let sgMode = SailModes.Menu;

function SAIL_sceneSpecificUpdate( time ){

	if( ocean.ready )
		OCN_Update( ocean, time );


	//handle menu input
	switch( sgMode ){
		case SailModes.Menu:
			if( mDown || touch.menuTouch != null )
				sgMode = SailModes.Gameplay;
			
			//menu heading text
			TR_QueueText( -0.3, 0.28, 0.02, 0.3, "SAIL" );
			TR_QueueText( -0.4, -0.2, 0.02, 0.1, "START" );
			
		case SailModes.Gameplay:
		
			TR_QueueText( -0.9, 0.8, 0.03, 0.1, ":Gear:" );
		
			WNT_Update( time );
			
			BOAT_Update( time );
			
			RGTTA_Update( time );
			
			if( mDownCoords.x < 40 && mDownCoords.y < 40 )
				sgMode = SailModes.Menu;
	}
	
	TR_RaycastPointer( mCoords );

}


function SAIL_sceneSpecificObjects( objMap ){

	if( ocean.ready )
		objMap.set( ocean.uid.val, ocean );

	//if( windIndc.ready )
	//	objMap.set( windIndc.uid.val, windIndc );

}


function SAIL_sceneSpecificDraw( ){

	if( sgMode == SailModes.Menu ){

		//menu background overlay
		cenPos        = [ 0        , 0    ];
		wdthHight     = [ 1        , 1    ];
		minUv         = [ 0        , 1    ];
		maxUv         = [ 1        , 0    ];
		TRI_G_drawScreenSpaceTexturedQuad(graphics.triGraphics, 'menuBg.png', 'sailDefault',  cenPos, wdthHight, minUv, maxUv, 0.01 );

	}


	TR_DrawText();

	TR_DeactivateFrameGlyphs();

}
