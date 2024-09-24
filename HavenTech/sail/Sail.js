
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

	sgMode = SailModes.Menu;

}


const SailModes = {
	Menu		: 0,
	Gameplay	: 1,
	Leaderboard	: 2
};

let sgMode = SailModes.Menu;

let sailMenuBgCenPos    = [ 0        , 0    ];
let sailMenuBgWdthHight = [ 1        , 1    ];
let sailMenuBgMinUv     = [ 0        , 1    ];
let sailMenuBgMaxUv     = [ 1        , 0    ];

let menuTxtColor = new Float32Array([0.5, 0.5, 0.8]);
let ldrbTimeColor = new Float32Array([0.6, 0.5, 0.7]);

let lastFrameMenuTouch = null;
function SAIL_sceneSpecificUpdateAndGatherObjsToDraw( time, cam, rb2DTris, rb3DTris_array, rb3DLines_array ){


	let numActiveBatches = 1;

	BOAT_Update( rb2DTris, time, 180/180*Math.PI );//to allow animation when scene is started
	rb2DTris.objs[windIndc.uid.val] = windIndc;

	if( ocean && ocean.ready ){
		OCN_Update( ocean, rb3DTris_array[0], time, boatHeading );
	}

	//setup strings to draw and handle gameplay input
	switch( sgMode ){
		case SailModes.Menu:

			//menu heading text
			TR_QueueText( rb2DTris,  0.0, 0.28, 0.02, 0.3, "SAIL", false, TxtJustify.Center );
			//rb2DTris, x, y, dpth, size, str, interactive, justify=TxtJustify.Left, overideColor=null
			TR_QueueText( rb2DTris, -0.4, -0.2, 0.02, 0.1, "START", true, TxtJustify.Left, menuTxtColor );
			TR_QueueText( rb2DTris, -0.4, -0.4, 0.02, 0.1, "LEADERBOARD", true, TxtJustify.Left, menuTxtColor );

			//menu background overlay
			TRI_G_prepareScreenSpaceTexturedQuad(graphics.triGraphics, rb2DTris, 
					'menuBg0.png', 'sailDefault',  
					sailMenuBgCenPos, sailMenuBgWdthHight, 
					sailMenuBgMinUv, sailMenuBgMaxUv, 0.01 );

			break;
		case SailModes.Gameplay:

			TR_QueueText( rb2DTris, -0.95*graphics.GetScreenAspect(), 0.87, 0.03, 0.1, ":Gear:", true );

			RGTTA_Update( time, cam, boatMapPosition, boatMatrix, rb2DTris, rb3DTris_array[1], rb3DLines_array[1] );
			numActiveBatches = 2;
			break;
		case SailModes.Leaderboard:
		
			TR_QueueText( rb2DTris, 0.0, 0.34, 0.02, 0.13, "LEADERBOARD", false, TxtJustify.Center );
			TR_QueueText( rb2DTris, -0.43, 0.19, 0.02, 0.1, "Main Menu", true, TxtJustify.Left, menuTxtColor );
			if( rgta_completeMins == -1 )
				TR_QueueText( rb2DTris, -0.43, 0.0, 0.02, 0.05, "No completions yet", false, TxtJustify.Left, menuTxtColor  );
			else
				TR_QueueTime( rb2DTris, -0.43, 0.0, 0.02, 0.1, rgta_completeMins, rgta_completeSecs, TxtJustify.Left, ldrbTimeColor );
			
			//menu background overlay
			TRI_G_prepareScreenSpaceTexturedQuad(graphics.triGraphics, rb2DTris, 
					'menuBg2.png', 'sailDefault',  
					sailMenuBgCenPos, sailMenuBgWdthHight, 
					sailMenuBgMinUv, sailMenuBgMaxUv, 0.01 );
	}


	//handle menu input
	let touchMDown = (lastFrameMenuTouch == null && touch.menuTouch != null);
	TR_RaycastPointer( rb2DTris, mCoords );

	switch( sgMode ){
		case SailModes.Menu:
			if( mDown || touchMDown ){
				for( let i = 0; i < numMOvrdStrs; ++i ){
					if( mOvrdStrs[i] == "START" && RGTA_Ready ){
						//boat position values are negative of boatMapPosition
						boatPosition[0] =  10; 
						boatPosition[1] = -10;
						lastBoatUpdateTime = time;
						boatHeading = 35/180*Math.PI;
						RGTTA_Start(time);
						sgMode = SailModes.Gameplay;
						playNote( noteFrequencies['G3' ], 0.25 );
					}
					if( mOvrdStrs[i] == "LEADERBOARD" ){
						sgMode = SailModes.Leaderboard;
					}
				}
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
			break;
		case SailModes.Leaderboard:
			if( mDown || touchMDown ){
				for( let i = 0; i < numMOvrdStrs; ++i )
					if( mOvrdStrs[i] == "Main Menu" ){
						sgMode = SailModes.Menu;
					}
			}
	}

	lastFrameMenuTouch = touch.menuTouch;

	return numActiveBatches;
}


