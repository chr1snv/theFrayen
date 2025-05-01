
var sailScripts = [
	'SceneLogic/sail/Ocean.js',
	'SceneLogic/sail/Boat.js',
	'SceneLogic/sail/Regatta.js'
];
let ocean = null;
function SAIL_ScriptLoadCmp(){
	ocean = new Ocean(mainScene);

	RGTTA_Init();

	BOAT_Init(mainScene);

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
	Menu				: 0,
	Gameplay			: 1,
	Leaderboard			: 2,
	SvrWaitingForPlayers: 3,
	ClntWatingForStart	: 4,
	NetworkGameplay		: 5,
	Credits				: 6
};

var sgMode = SailModes.Menu;

let sailMenuBgCenPos    = [ 0        , 0    ];
let sailMenuBgWdthHight = [ 1        , 1    ];
let sailMenuBgMinUv     = [ 0        , 1    ];
let sailMenuBgMaxUv     = [ 1        , 0    ];

let menuTxtColor = new Float32Array([0.5, 0.5, 0.8]);
let menuHdgColor = new Float32Array([0.5, 0.5, 0.5]);
let ldrbTimeColor = new Float32Array([0.6, 0.5, 0.7]);
let creditsColor = new Float32Array([0.4, 0.4, 0.4]);

let lastFrameMDown = false;
let lastFrameMenuTouch = null;
function SAIL_sceneSpecificUpdateAndGatherObjsToDraw( time, cam, rb2DTris, rb3DTris_array, rb3DLines_array ){


	let numActiveBatches = 1;

	BOAT_Update( rb2DTris, time, 180/180*Math.PI );//to allow animation when scene is started
	//Matrix_Copy( cubeWorldToCamMat, boatMatrixRotate );
	//Matrix_SetIdentity(cubeWorldToCamMat);
	//Matrix_Copy(tempMat, boatMatrixRotate);
	//Matrix_Multiply(cubeWorldToCamMat, boatMatrixRotate, cam.camToWorldRotMat); //generate the skybox/cube map rotation matrix from the boat to world rotation
	//Matrix_Inverse(cubeWorldToCamMat, tempMat);
	Matrix_CopyOnlyRotateScale(cubeWorldToCamMat, rb3DTris_array[1].worldToScreenSpaceMat);
	
	rb2DTris.objs[windIndc.uid.val] = windIndc;

	if( ocean && ocean.ready ){
		OCN_Update( ocean, rb3DTris_array[1], time, boatHeading );
		//need regatta scene camera update to draw ocean
		rb3DTris_array[1].activeForFrame = true;
	}

	//setup strings to draw and handle gameplay input
	switch( sgMode ){
		case SailModes.Menu:
			SND_playSoundFile( 'music/smooth-684-cm-54202.mp3', 'sailDefault');

			//menu heading text
			TR_QueueText( rb2DTris,  0.0, 0.28, 0.02, 0.3, "SAIL", false, TxtJustify.Center );
			//rb2DTris, x, y, dpth, size, str, interactive, justify=TxtJustify.Left, overideColor=null
			TR_QueueText( rb2DTris, -0.4,  0.17, 0.02, 0.07, "LOCAL",       false, TxtJustify.Left,   menuHdgColor );
			TR_QueueText( rb2DTris,  0.0,  0.05, 0.02, 0.1,  "START",       true,  TxtJustify.Center, menuTxtColor );
			TR_QueueText( rb2DTris, -0.4, -0.07, 0.02, 0.07, "Multiplayer", false, TxtJustify.Left,   menuHdgColor );
			TR_QueueText( rb2DTris, -0.38, -0.2, 0.02, 0.1,  "HOST",      true,  TxtJustify.Left,   menuTxtColor );
			TR_QueueText( rb2DTris,  0.08, -0.2, 0.02, 0.1,  "CLIENT",      true,  TxtJustify.Left,   menuTxtColor );
			TR_QueueText( rb2DTris,  0.0, -0.34, 0.02, 0.1,  "LEADERBOARD", true,  TxtJustify.Center, menuTxtColor );
			TR_QueueText( rb2DTris,  0.0, -0.46, 0.02, 0.1,  "CREDITS", true,  TxtJustify.Center, menuTxtColor );

			//menu background overlay
			TRI_G_prepareScreenSpaceTexturedQuad(graphics.triGraphics, rb2DTris, 
					'menuBg0.png', 'sailDefault',
					sailMenuBgCenPos, sailMenuBgWdthHight,
					sailMenuBgMinUv, sailMenuBgMaxUv, 0.01 );

			break;
		case SailModes.SvrWaitingForPlayers:
			TR_QueueText( rb2DTris, 0.0, -0.4, 0.02, 0.07, "START REGATTA", true, TxtJustify.Center, menuTxtColor);
		case SailModes.ClntWatingForStart:
			TR_QueueText( rb2DTris,-0.43,  0.19, 0.02, 0.07, "Main Menu", true, TxtJustify.Left, menuTxtColor );
			TR_QueueText( rb2DTris,  0.0, 0.28, 0.02, 0.3, "SAIL", false, TxtJustify.Center );
			//rb2DTris, x, y, dpth, size, str, interactive, justify=TxtJustify.Left, overideColor=null
			let gameStatusStr = "";
			if( networkGame != null ){
				switch( networkGame.status ){
					case NetworkGameModes.GatheringPlayers:
						gameStatusStr = "Waiting For Players";
						break;
					case NetworkGameModes.InProgress:
						gameStatusStr = "In Progress";
						break;
					default:
						gameStatusStr = "Unknown";
				}
				TR_QueueText( rb2DTris, 0.43,  0.17, 0.02, 0.05, gameStatusStr,   false, TxtJustify.Right,   menuHdgColor );
				TR_QueueText( rb2DTris, -0.4,  0.07, 0.01, 0.07, "Svr Uid " + networkGame.svrUidVal, false, TxtJustify.Left, menuHdgColor );
				TR_QueueText( rb2DTris, -0.4,  0.0, 0.01, 0.07, "Max Players " + networkGame.maxPlayers, false, TxtJustify.Left, menuHdgColor );
				TR_QueueText( rb2DTris, -0.4,  -0.1, 0.02, 0.07, "Connected clients ", false, TxtJustify.Left, menuHdgColor );
				let cliIdx = 0;
				for( let cliUid in networkGame.clients ){
					let uidColr = menuHdgColor;
					if( cliUid == localUid.val )
						uidColr = menuTxtColor;
					TR_QueueText( rb2DTris, -0.3,  -0.15-((cliIdx)*0.05), 0.02, 0.07,
						""+cliUid, false, TxtJustify.Left, uidColr );
					++cliIdx;
				}
			}
			
			//menu background overlay
			TRI_G_prepareScreenSpaceTexturedQuad(graphics.triGraphics, rb2DTris,
					'menuBg0.png', 'sailDefault',
					sailMenuBgCenPos, sailMenuBgWdthHight,
					sailMenuBgMinUv, sailMenuBgMaxUv, 0.01 );
			break;
		case SailModes.NetworkGameplay:
			let place = NetworkGame_CliUidPlace( networkGame, localUid );
			let placeStr = positionToStr(place);
			TR_QueueText( rb2DTris, 0.95*graphics.GetScreenAspect(), 0.83, 0.03, 0.1, placeStr, false, TxtJustify.Right );
			
			for( let cliUid in networkGame.clients ){
				if( cliUid != localUid.val ){
					let cli = networkGame.clients[ cliUid ];
					BOAT_DrawOtherPlayer( rb3DTris_array[1], cli.hdg, cli.boatMapPosition );
				}
			}
		case SailModes.Gameplay:

			TR_QueueText( rb2DTris, -0.95*graphics.GetScreenAspect(), 0.87, 0.03, 0.1, ":Gear:", true );

			RGTTA_Update( time, cam, boatMapPosition, boatToWorldMatrix, rb2DTris, rb3DTris_array[1], rb3DLines_array[1] );
			numActiveBatches = 2;
			break;
		case SailModes.Leaderboard:
		
			TR_QueueText( rb2DTris, 0.0, 0.34, 0.02, 0.13, "LEADERBOARD", false, TxtJustify.Center );
			TR_QueueText( rb2DTris, -0.43, 0.19, 0.02, 0.1, "Return to Main Menu", true, TxtJustify.Left, menuTxtColor );
			if( rgta_completeMins == -1 )
				TR_QueueText( rb2DTris, -0.43, 0.0, 0.02, 0.05, "No completions yet", false, TxtJustify.Left, menuTxtColor  );
			else
				TR_QueueTime( rb2DTris, -0.43, 0.0, 0.02, 0.1, rgta_completeMins, rgta_completeSecs, rgta_completeSecTenths, TxtJustify.Left, ldrbTimeColor );
			
			//menu background overlay
			TRI_G_prepareScreenSpaceTexturedQuad(graphics.triGraphics, rb2DTris, 
					'menuBg2.png', 'sailDefault',  
					sailMenuBgCenPos, sailMenuBgWdthHight, 
					sailMenuBgMinUv, sailMenuBgMaxUv, 0.01 );
			break;
		case SailModes.Credits:
			TR_QueueText( rb2DTris, -0.43, 0.19, 0.02, 0.1, "Return to Main Menu", true, TxtJustify.Left, menuTxtColor );
			//rb2DTris, x, y, dpth, size, str
			TR_QueueText( rb2DTris, -0.43, -0.0, 0.02, 0.07, "audio voice overs by", false, TxtJustify.Left, creditsColor );
			TR_QueueText( rb2DTris, -0.43, -0.05, 0.02, 0.07, "stillelectric", false, TxtJustify.Left, creditsColor );

			TR_QueueText( rb2DTris, -0.43, -0.16, 0.02, 0.06, "menu music", false, TxtJustify.Left, creditsColor );
			TR_QueueText( rb2DTris, -0.43, -0.2, 0.02, 0.04, "pixabay.com sound effects smooth 684 cm 54202", false, TxtJustify.Left, creditsColor );
			
			
			TR_QueueText( rb2DTris, -0.43, -0.35, 0.02, 0.06, "skybox by bluecloud", false, TxtJustify.Left, creditsColor );
			TR_QueueText( rb2DTris, -0.43, -0.39, 0.02, 0.04, "opengameart.org content cloudy skyboxes", false, TxtJustify.Left, creditsColor );
			
			"menu music"
"https://pixabay.com/sound-effects/smooth-684-cm-54202/"

			//menu background overlay
			TRI_G_prepareScreenSpaceTexturedQuad(graphics.triGraphics, rb2DTris,
					'menuBg0.png', 'sailDefault',
					sailMenuBgCenPos, sailMenuBgWdthHight,
					sailMenuBgMinUv, sailMenuBgMaxUv, 0.01 );
	}


	//handle menu input
	let mNowDown   = (!lastFrameMDown && mDown);
	let touchMDown = (lastFrameMenuTouch == null && touch.menuTouch != null);
	let inptDownThisFrame = mNowDown || touchMDown;
	TR_RaycastPointer( rb2DTris, mCoords );

	if( inptDownThisFrame ){
		for( let i = 0; i < numMOvrdStrs; ++i ){
			switch( sgMode ){
				case SailModes.Menu:
					if( RGTA_Ready ){
						if( mOvrdStrs[i] == "START" ){
							RGTTA_Start(time); //init the regatta
							sgMode = SailModes.Gameplay;
						}
						if( mOvrdStrs[i] == "HOST" ){
							Server_startListening(4);
						}
						if( mOvrdStrs[i] == "CLIENT" ){
							Client_joinGame(4);
						}
					}
					if( mOvrdStrs[i] == "LEADERBOARD" ){
						sgMode = SailModes.Leaderboard;
					}
					if( mOvrdStrs[i] == "CREDITS" ){
						sgMode = SailModes.Credits;
					}
					break;
				case SailModes.SvrWaitingForPlayers:
					if( mOvrdStrs[i] == "Main Menu" ){
						Network_LeaveGame();
						sgMode = SailModes.Menu;
					}
					if( mOvrdStrs[i] == "START REGATTA" ){
						Server_startGame();
					}
					break;
				case SailModes.ClntWatingForStart:
					if( mOvrdStrs[i] == "Main Menu" ){ //remove from networkGame and return to main menu
						Network_LeaveGame();
						sgMode = SailModes.Menu;
					}
					break;
				case SailModes.NetworkGameplay:
				case SailModes.Gameplay:
					if( mOvrdStrs[i] == ":Gear:" )
						sgMode = SailModes.Menu;
					if( (mDown && mDownCoords.x < 40 && mDownCoords.y < 40) ||
				   (touchMDown && mCoords.x < 40 && mCoords.y < 40) )
						sgMode = SailModes.Menu;
					break;
				case SailModes.Leaderboard:
					if( mOvrdStrs[i] == "Return to Main Menu" ){
						sgMode = SailModes.Menu;
					}
				case SailModes.Credits:
					if( mOvrdStrs[i] == "Return to Main Menu" ){
						sgMode = SailModes.Menu;
					}
			}
		}
	}

	lastFrameMenuTouch = touch.menuTouch;
	lastFrameMDown     = mDown;

	return numActiveBatches;
}


