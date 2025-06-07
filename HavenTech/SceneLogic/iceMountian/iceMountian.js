


var iceMScripts = [
	//'iceMountain/*.js',
];

function ICEM_ScriptLoadCmp(){

	//ICEM_Init();

	//ICEM_Init(mainScene);

	iceMLdCmpCb();
}

let iceMLdCmpCb = null;
function ICEM_sceneSpecificLoad(cmpCb){
	iceMLdCmpCb = cmpCb;

	incFileIdx = 0;
	incFileList = iceMScripts;
	loadScriptCmpCb = ICEM_ScriptLoadCmp;

	loadScriptLoop();

	icemMode = IcemModes.Gameplay;

}


const IcemModes = {
	Menu				: 0,
	Gameplay			: 1,
	//Leaderboard			: 2,
	//SvrWaitingForPlayers: 3,
	//ClntWatingForStart  : 4,
	//NetworkGameplay     : 5
};

let icemMode = IcemModes.Menu;

let icemMenuBgCenPos    = [ 0        , 0    ];
let icemMenuBgWdthHight = [ 1        , 1    ];
let icemMenuBgMinUv     = [ 0        , 1    ];
let icemMenuBgMaxUv     = [ 1        , 0    ];

let icemMenuTxtColor = new Float32Array([0.5, 0.5, 0.8]);
let icemMenuHdgColor = new Float32Array([0.5, 0.5, 0.5]);
let icemLdrbTimeColor = new Float32Array([0.6, 0.5, 0.7]);


function ICEM_sceneSpecificUpdateAndGatherObjsToDraw( time, cam, rb2DTris, rb3DTris_array, rb3DLines_array ){


	let numActiveBatches = 1;

	//PLR_Update( rb2DTris, time, 180/180*Math.PI );//to allow animation when scene is started
	//rb2DTris.objs[windIndc.uid.val] = windIndc;


	//setup strings to draw and handle gameplay input
	switch( icemMode ){
		case IcemModes.Menu:

			//menu heading text
			TR_QueueText( rb2DTris,  0.0, 0.28, 0.02, 0.3, "ICE MTN", false, TxtJustify.Center );
			//rb2DTris, x, y, dpth, size, str, interactive, justify=TxtJustify.Left, overideColor=null
			TR_QueueText( rb2DTris, -0.4,  0.17, 0.02, 0.07, "LOCAL",       false, TxtJustify.Left,   menuHdgColor );
			TR_QueueText( rb2DTris,  0.0,  0.05, 0.02, 0.1,  "START",       true,  TxtJustify.Center, menuTxtColor );
			TR_QueueText( rb2DTris, -0.4, -0.07, 0.02, 0.07, "Multiplayer", false, TxtJustify.Left,   menuHdgColor );
			TR_QueueText( rb2DTris, -0.38, -0.2, 0.02, 0.1,  "HOST",      true,  TxtJustify.Left,   menuTxtColor );
			TR_QueueText( rb2DTris,  0.08, -0.2, 0.02, 0.1,  "CLIENT",      true,  TxtJustify.Left,   menuTxtColor );
			TR_QueueText( rb2DTris,  0.0, -0.42, 0.02, 0.1,  "LEADERBOARD", true,  TxtJustify.Center, menuTxtColor );

			//menu background overlay
			TRI_G_prepareScreenSpaceTexturedQuad(graphics.triGraphics, rb2DTris, 
					'menuBg0.png', 'sailDefault',
					sailMenuBgCenPos, sailMenuBgWdthHight,
					sailMenuBgMinUv, sailMenuBgMaxUv, 0.01 );

			break;
		/*
		case IcemModes.SvrWaitingForPlayers:
			TR_QueueText( rb2DTris, 0.0, -0.4, 0.02, 0.07, "START REGATTA", true, TxtJustify.Center, menuTxtColor);
		case IcemModes.ClntWatingForStart:
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
		case IcemModes.NetworkGameplay:
			let place = NetworkGame_CliUidPlace( networkGame, localUid );
			let placeStr = positionToStr(place);
			TR_QueueText( rb2DTris, 0.95*graphics.GetScreenAspect(), 0.83, 0.03, 0.1, placeStr, false, TxtJustify.Right );
			
			for( let cliUid in networkGame.clients ){
				if( cliUid != localUid.val ){
					let cli = networkGame.clients[ cliUid ];
					BOAT_DrawOtherPlayer( rb3DTris_array[1], cli.hdg, cli.boatMapPosition );
				}
			}
		*/

		case IcemModes.Gameplay:

			TR_QueueText( rb2DTris, -0.95*graphics.GetScreenAspect(), 0.87, 0.03, 0.1, ":Gear:", true );
			
			FlyingCameraControlInput(time);

			numActiveBatches = 2;
			break;

		/*
		case IcemModes.Leaderboard:
		
			TR_QueueText( rb2DTris, 0.0, 0.34, 0.02, 0.13, "LEADERBOARD", false, TxtJustify.Center );
			TR_QueueText( rb2DTris, -0.43, 0.19, 0.02, 0.1, "Main Menu", true, TxtJustify.Left, menuTxtColor );
			if( rgta_completeMins == -1 )
				TR_QueueText( rb2DTris, -0.43, 0.0, 0.02, 0.05, "No completions yet", false, TxtJustify.Left, menuTxtColor  );
			else
				TR_QueueTime( rb2DTris, -0.43, 0.0, 0.02, 0.1, rgta_completeMins, rgta_completeSecs, rgta_completeSecTenths, TxtJustify.Left, ldrbTimeColor );
			
			//menu background overlay
			TRI_G_prepareScreenSpaceTexturedQuad(graphics.triGraphics, rb2DTris, 
					'menuBg2.png', 'sailDefault',  
					sailMenuBgCenPos, sailMenuBgWdthHight, 
					sailMenuBgMinUv, sailMenuBgMaxUv, 0.01 );
		*/
	}
	
	Matrix_CopyOnlyRotateScale(cubeWorldToCamMat, rb3DTris_array[0].worldToScreenSpaceMat);
	
	GatherModelsToDrawForDefaultMainCam();


	//handle menu input
	let mNowDown   = (!lastFrameMDown && mDown);
	let touchMDown = (lastFrameMenuTouch == null && touch.menuTouch != null);
	let inptDownThisFrame = mNowDown || touchMDown;
	TR_RaycastPointer( rb2DTris, mCoords );

	if( inptDownThisFrame ){
		for( let i = 0; i < numMOvrdStrs; ++i ){
			switch( icemMode ){
				case IcemModes.Menu:
					if( RGTA_Ready ){
						if( mOvrdStrs[i] == "START" ){
							RGTTA_Start(time); //init the regatta
							sgMode = IcemModes.Gameplay;
						}
						if( mOvrdStrs[i] == "HOST" ){
							Host_startListening(4);
						}
						if( mOvrdStrs[i] == "CLIENT" ){
							Client_joinGame(4);
						}
					}
					if( mOvrdStrs[i] == "LEADERBOARD" ){
						sgMode = IcemModes.Leaderboard;
					}
					break;
				case IcemModes.SvrWaitingForPlayers:
					if( mOvrdStrs[i] == "Main Menu" ){
						Network_LeaveGame();
						sgMode = IcemModes.Menu;
					}
					if( mOvrdStrs[i] == "START REGATTA" ){
						Host_startGame();
					}
					break;
				case IcemModes.ClntWatingForStart:
					if( mOvrdStrs[i] == "Main Menu" ){ //remove from networkGame and return to main menu
						Network_LeaveGame();
						sgMode = IcemModes.Menu;
					}
					break;
				case IcemModes.NetworkGameplay:
				case IcemModes.Gameplay:
					if( mOvrdStrs[i] == ":Gear:" )
						sgMode = IcemModes.Menu;
					if( (mDown && mDownCoords.x < 40 && mDownCoords.y < 40) ||
				   (touchMDown && mCoords.x < 40 && mCoords.y < 40) )
						sgMode = IcemModes.Menu;
					break;
				case IcemModes.Leaderboard:
					if( mOvrdStrs[i] == "Main Menu" ){
						sgMode = IcemModes.Menu;
					}
			}
		}
	}

	lastFrameMenuTouch = touch.menuTouch;
	lastFrameMDown     = mDown;

	return numActiveBatches;
}


