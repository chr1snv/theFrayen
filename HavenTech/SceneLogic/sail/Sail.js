
var sailScripts = [
	'SceneLogic/sail/Ocean.js',
	'SceneLogic/sail/Boat.js',
	'SceneLogic/sail/Regatta.js',
	'SceneLogic/sail/SailMissions.js'
];
let ocean = null;
function SAIL_ScriptLoadCmp(){
	ocean = new Ocean(mainScene);

	RGTTA_Init();

	BOAT_Init(mainScene);


	cntrlsTxtElm.innerText = "Touch / Mouse swipe left or right to change course";
	let sailCam = mainScene.cameras[ mainScene.activeCameraIdx ];
	sailCam.nearClip = 1.0;
	sailCam.farClip = 500.0;

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

const NumMultiplayerGamePlayers = 4;


const SailModes = {
	Menu				: 0,
	Gameplay			: 1,
	Leaderboard			: 2,
	HostWaitingForPlayers: 3,
	ClntWatingForStart	: 4,
	NetworkGameplay		: 5,
	Credits				: 6
};

var sgMode = SailModes.Menu;

let menuSongs = ['smooth-684-cm-54202.ogg'];
let gameplaySongs = [
	'electro-beat-new-wave-disco-332630.ogg',
	'lifestyle-230682.ogg',
	'paragliding-156745.ogg',
	'seize-the-moment-335067.ogg',
	'the-nu-disco-276597.ogg' 
	];
let menuSongIdx = 0;
let gameplaySongIdx = 0;

let sgMusicMode = 0;
let lastSgMusicMode = 0;


function SAIL_stopMusicAndSelectNewSongs(){
	SND_playSoundFile( 'music/menu/' + menuSongs[menuSongIdx], 'sailDefault', 0, playOrStop=false );
	SND_playSoundFile( 'music/gameplay/' + gameplaySongs[gameplaySongIdx], 'sailDefault', 0, playOrStop=false);
	menuSongIdx = Math.round(Math.random()*(menuSongs.length-1));
	gameplaySongIdx = Math.round(Math.random()*(gameplaySongs.length-1));
	
}
function SAIL_PlayMusicForMode( sgMode ){


	switch( sgMode ){
		case SailModes.Menu:
		case SailModes.Leaderboard:
		case SailModes.HostWaitingForPlayers:
		case SailModes.ClntWatingForStart:
		case SailModes.Credits:
			sgMusicMode = 0;
			break;
		case SailModes.Gameplay:
		case SailModes.NetworkGameplay:
			sgMusicMode = 1;
		
			break;
	}

	if( lastSgMusicMode != sgMusicMode ){
		SAIL_stopMusicAndSelectNewSongs();
	}
	
	switch( sgMusicMode ){
		case 0:
			SND_playSoundFile( 'music/menu/'+menuSongs[menuSongIdx], 'sailDefault', vol=0.5, true, true); //name, sceneName, vol=1.0, playOrStop=true, clearCanPlayOnce=false 
			break;
		case 1:
			SND_playSoundFile( 'music/gameplay/'+gameplaySongs[gameplaySongIdx], 'sailDefault', vol=0.5, true, true);
	}

	lastSgMusicMode = sgMusicMode;

}

let sailMenuBgCenPos    = [ 0        , 0    ];
let sailMenuBgWdthHight = [ 1        , 1    ];
let sailMenuBgMinUv     = [ 0        , 1    ];
let sailMenuBgMaxUv     = [ 1        , 0    ];

let menuTxtColor = new Float32Array([0.5, 0.5, 0.8]);
let menuHdgColor = new Float32Array([0.5, 0.5, 0.5]);
let ldrbTimeColor = new Float32Array([0.6, 0.5, 0.7]);
let creditsColor = new Float32Array([0.4, 0.4, 0.4]);


function SAIL_sceneSpecificUpdateAndGatherObjsToDraw( time, cam, rb2DTris, rb3DTris_array, rb3DLines_array ){


	let numActiveBatches = 1;

	//update the boat scene
	BOAT_Update( rb2DTris, time, 180/180*Math.PI );//to allow animation when scene is started

	GatherModelsToDrawForDefaultMainCam(1); //begin queuing boat scene models to draw

	//camera for skybox
	if( sgMode == SailModes.Menu ){
		Matrix_Copy( rb3DTris_array[0].worldToScreenSpaceMat, rastBatch3dTris_array[1].worldToScreenSpaceMat);
	}
	Matrix_CopyOnlyRotateScale(cubeWorldToCamMat, rb3DTris_array[0].worldToScreenSpaceMat);



	rb2DTris.mdls[windIndc.uid.val] = windIndc;

	if( ocean && ocean.ready ){
		OCN_Update( ocean, rb3DTris_array[0], time, boatHeading,sgMode == SailModes.Menu );
		//need regatta scene camera update to draw ocean
		rb3DTris_array[0].activeForFrame = true;
	}
	
	SAIL_PlayMusicForMode( sgMode );

	//setup strings to draw and handle gameplay input
	switch( sgMode ){
		case SailModes.Menu:
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
		case SailModes.HostWaitingForPlayers:
			TR_QueueText( rb2DTris, 0.0, -0.4, 0.02, 0.07, "START REGATTA", true, TxtJustify.Center, menuTxtColor);
			//also do the below if host (update display of clients waiting for the game to start)
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
					BOAT_DrawOtherPlayer( rb3DTris_array[0], cli.hdg, cli.boatMapPosition, cliUid );
				}
			}
		case SailModes.Gameplay:

			TR_QueueText( rb2DTris, -0.95*graphics.GetScreenAspect(), 0.87, 0.03, 0.1, ":Gear:", true );

			RGTTA_Update( time, cam, boatMapPosition, boatToWorldMatrix, rb2DTris, rb3DTris_array[0], rb3DLines_array[0] );
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
			TR_QueueText( rb2DTris, -0.43, 0.05, 0.02, 0.06, "audio design", false, TxtJustify.Left, creditsColor );
			TR_QueueText( rb2DTris, -0.43, -0.0, 0.02, 0.06, "effects and voice overs by", false, TxtJustify.Left, creditsColor );
			TR_QueueText( rb2DTris, -0.43, -0.06, 0.02, 0.07, "stillelectric", false, TxtJustify.Left, creditsColor );

			TR_QueueText( rb2DTris, -0.43, -0.16, 0.02, 0.06, "menu music", false, TxtJustify.Left, creditsColor );
			TR_QueueText( rb2DTris, -0.43, -0.2, 0.02, 0.04, "pixabay.com sound effects smooth 684 cm 54202", false, TxtJustify.Left, creditsColor );


			TR_QueueText( rb2DTris, -0.43, -0.35, 0.02, 0.06, "skybox by bluecloud", false, TxtJustify.Left, creditsColor );
			TR_QueueText( rb2DTris, -0.43, -0.39, 0.02, 0.04, "opengameart.org content cloudy skyboxes", false, TxtJustify.Left, creditsColor );

			//menu background overlay
			TRI_G_prepareScreenSpaceTexturedQuad(graphics.triGraphics, rb2DTris,
					'menuBg0.png', 'sailDefault',
					sailMenuBgCenPos, sailMenuBgWdthHight,
					sailMenuBgMinUv, sailMenuBgMaxUv, 0.01 );
	}


	lastSgMode = sgMode;


	//handle menu input
	let mNowDown   = (!lastFrameMDown && mDown);
	let touchMDown = (lastFrameMenuTouch == null && touch.menuTouch != null);
	let inptDownThisFrame = mNowDown || touchMDown;
	TR_RaycastPointer( rb2DTris, mCoords ); //returns mOvrdStrs and mOvrdStrs by checking the AABB's of queued text

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
							Boat_SetupToDrawNMultiplayerOtherPlayers(NumMultiplayerGamePlayers-1, mainScene);
							Host_startListening(NumMultiplayerGamePlayers);
						}
						if( mOvrdStrs[i] == "CLIENT" ){
							Boat_SetupToDrawNMultiplayerOtherPlayers(NumMultiplayerGamePlayers-1, mainScene);
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
				case SailModes.HostWaitingForPlayers:
					if( mOvrdStrs[i] == "Main Menu" ){
						Network_LeaveGame();
						sgMode = SailModes.Menu;
					}
					if( mOvrdStrs[i] == "START REGATTA" ){
						Host_startGame();
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



