
var sailScripts = [
	'sail/Ocean.js',
	'sail/Boat.js',
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

let lastFrameMenuTouch = null;
function SAIL_sceneSpecificUpdateAndGatherObjsToDraw( time, cam, rb2DTris, rb3DTris_array, rb3DLines_array ){

	if( ocean && ocean.ready ){
		OCN_Update( ocean, time );
		rb3DTris_array[0].objs[ ocean.uid.val ] = ocean;
	}
	
	let numActiveBatches = 1;

	BOAT_Update( time, 180/180*Math.PI );//to allow animation when scene is started
	rb2DTris.objs[windIndc.uid.val] = windIndc;

	//setup strings to draw and handle gameplay input
	switch( sgMode ){
		case SailModes.Menu:

			//menu heading text
			TR_QueueText( rb2DTris, -0.3, 0.28, 0.02, 0.3, "SAIL", false );
			TR_QueueText( rb2DTris, -0.4, -0.2, 0.02, 0.1, "START", true );
			TR_QueueText( rb2DTris, -0.4, -0.4, 0.02, 0.1, "LEADERBOARD", true );
			
			//menu background overlay
			cenPos        = [ 0        , 0    ];
			wdthHight     = [ 1        , 1    ];
			minUv         = [ 0        , 1    ];
			maxUv         = [ 1        , 0    ];
			TRI_G_prepareScreenSpaceTexturedQuad(graphics.triGraphics, rb2DTris, 'menuBg.png', 'sailDefault',  cenPos, wdthHight, minUv, maxUv, 0.01 );

			break;
		case SailModes.Gameplay:

			TR_QueueText( rb2DTris, -0.9, 0.8, 0.03, 0.1, ":Gear:", true );

			RGTTA_Update( time, cam, boatMatrix, rb3DTris_array[1], rb3DLines_array[1] );
			numActiveBatches = 2;
	}


	//handle menu input
	let touchMDown = (lastFrameMenuTouch == null && touch.menuTouch != null);
	TR_RaycastPointer( rb2DTris, mCoords );

	switch( sgMode ){
		case SailModes.Menu:
			if( mDown || touchMDown ){
				for( let i = 0; i < numMOvrdStrs; ++i )
					if( mOvrdStrs[i] == "START" )
						sgMode = SailModes.Gameplay;
			}
			break;
		case SailModes.Gameplay:
			if( mDown || touchMDown ){
				for( let i = 0; i < numMOvrdStrs; ++i )
					if( mOvrdStrs[i] == ":Gear:" )
						sgMode = SailModes.Menu;
			}
			if( (mDown && mDownCoords.x < 40 && mDownCoords.y < 40) ||
			 (touchMDown && mCoords.x < 40 && mCoords.y < 40) )
				sgMode = SailModes.Menu;
	}

	lastFrameMenuTouch = touch.menuTouch;

	return numActiveBatches;
}


