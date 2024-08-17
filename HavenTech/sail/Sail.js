
var sailScripts = [
	'sail/Ocean.js',
	'sail/Boat.js',
	//'sail/WindAndTide.js',
	'sail/Regatta.js'
];
let ocean = null;
function SAIL_ScriptLoadCmp(){
	ocean = new Ocean(mainScene);

	RGTTA_Init();

	BOAT_Init();

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

	if( ocean && ocean.ready )
		OCN_Update( ocean, time );


	//handle menu input
	switch( sgMode ){
		case SailModes.Menu:
			if( mDown ){
				for( let i = 0; i < numMOvrdStrs; ++i )
					if( mOvrdStrs[i] == "START" )
						sgMode = SailModes.Gameplay;
			}
			
			//menu heading text
			TR_QueueText( -0.3, 0.28, 0.02, 0.3, "SAIL", false );
			TR_QueueText( -0.4, -0.2, 0.02, 0.1, "START", true );
			
			break;
		case SailModes.Gameplay:
		
			TR_QueueText( -0.9, 0.8, 0.03, 0.1, ":Gear:", true );
		
			//WNT_Update( time );
			
			BOAT_Update( time, 180/180*Math.PI );
			
			RGTTA_Update( time );
			
			
			if( mDown ){
				for( let i = 0; i < numMOvrdStrs; ++i )
					if( mOvrdStrs[i] == ":Gear:" )
						sgMode = SailModes.Menu;
			}
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

	//3d mode
	RGTTA_Draw();

	//2d orthographic mode
	if( sgMode == SailModes.Menu ){
		//menu background overlay
		cenPos        = [ 0        , 0    ];
		wdthHight     = [ 1        , 1    ];
		minUv         = [ 0        , 1    ];
		maxUv         = [ 1        , 0    ];
		TRI_G_drawScreenSpaceTexturedQuad(graphics.triGraphics, 'menuBg.png', 'sailDefault',  cenPos, wdthHight, minUv, maxUv, 0.01 );
	}
	//sets up orthographic matrix
	TR_DrawText();

	if( sgMode == SailModes.Gameplay && windIndc_dbB != null ){
		TRI_G_drawTriangles( graphics.triGraphics, windIndc_dbB.texName,
			windIndc_dbB.material.sceneName, windIndc_dbB, 0 );
	}

	//cleanup
	TR_DeactivateFrameGlyphs();

}
