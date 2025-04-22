
//maintains the status of the sailing competition

var rgtaScene = null;
let rgtaSceneName = "islandRegatta";
function RGTTA_Init(){
	rgtaScene = new HavenScene( rgtaSceneName, RGTTA_SceneLoaded );
}


const WaypointType = {
	RoundBouy: 0,
	StartLine: 1
};

function WaypointInfo( bouyNameIn, roundDirection, wayTypeIn, instrStringIn ){
	this.bouyName = bouyNameIn;
	this.origLoc = Vect3_New();
	this.bouyQm = null;
	this.roundDirection = roundDirection; //false == port , true == stbd
	this.wayType = wayTypeIn;
	this.instrString = instrStringIn;
}

//regatta course definition
let bouyInfos = new Array(4);
bouyInfos[0] = new WaypointInfo( "inflatableBouy",       false, WaypointType.StartLine, "Cross the Start Line" );
bouyInfos[1] = new WaypointInfo( "inflatableBouy_s.001", false, WaypointType.RoundBouy, "Round the Windward Bouy" );
bouyInfos[2] = new WaypointInfo( "inflatableBouy_s.002", false, WaypointType.RoundBouy, "Round the Downwind offset Bouy" );
bouyInfos[3] = new WaypointInfo( "inflatableBouy",       false, WaypointType.StartLine, "Cross the Finish Line" );

let startLineBoatQm = null;
let startLineBoatLoc = null;

let directionUiQmInst = null;
let directionUiQmInstMat = null;

var RGTA_Ready = false;
function RGTTA_SceneLoaded( hvnsc ){

	console.log( "RGTTA_SceneLoaded" );
	
	//get refrences to meshes to have follow the water surface
	for( let i = 0; i < bouyInfos.length; ++i ){
		bouyInfos[i].bouyQm = graphics.cachedObjs[QuadMesh.name][rgtaSceneName][bouyInfos[i].bouyName][0];
		bouyInfos[i].origLoc = bouyInfos[i].bouyQm.origin;
	}


	startLineBoatQm = graphics.cachedObjs[QuadMesh.name][rgtaSceneName]['startLineBoat'][0];
	startLineBoatLoc = startLineBoatQm.origin;


	new Model( "wayPtDirec", "windIndc", "textMeshes", null, 
					modelLoadedParameters=null, modelLoadedCallback=Rgta_directionUiQmInstLd, isDynamic=false );

	GRPH_GetCached( "directionUIMat", "windIndc", Material, false, Rgta_directionUiQmInstMatLd, null );

	new Model( "WaypKeepOutRadius", "WaypKeepOutRadius", "RegattaWaypoints", null, 
					modelLoadedParameters=null, modelLoadedCallback=Rgta_WaypKeepOutRadiusLoaded, isDynamic=false );

	new Model( "WaypRoundBeginWall", "WaypRoundBeginWall", "RegattaWaypoints", null, 
					modelLoadedParameters=null, modelLoadedCallback=Rgta_WaypRoundBeginWallLoaded, isDynamic=false );
	new Model( "WaypRoundBeginWall", "WaypRoundBeginWall", "RegattaWaypoints", null, 
					modelLoadedParameters=null, modelLoadedCallback=Rgta_WaypRoundBeginWallLoaded, isDynamic=false );

	let rgtaCam = hvnsc.cameras[ hvnsc.activeCameraIdx ];
	rgtaCam.nearClip = 1.0;
	rgtaCam.farClip = 500.0;
	setSettingsDispCamLimitInputs( rgtaCam );
	Vect3_Copy( rgtaCam.position, mainCam.position);
	Vect3_Copy( rgtaCam.rotation, mainCam.rotation);
	rgtaCam.GenWorldToFromScreenSpaceMats();

	RGTA_Ready = true;
}

function Rgta_directionUiQmInstMatLd(mat){
	directionUiQmInstMat = mat;
	directionUiQmInstMat.diffuseCol = [0,1,0];
	if( directionUiQmInst != null )
		directionUiQmInst.optMaterial = directionUiQmInstMat;
}
function Rgta_directionUiQmInstLd(mdl){
	directionUiQmInst = mdl;
	directionUiQmInst.optMaterial = directionUiQmInstMat;
}

let kpOutRadiusMdl = null;
function Rgta_WaypKeepOutRadiusLoaded( kpOutRadius ){
	kpOutRadiusMdl = kpOutRadius;

	Matrix_SetEulerTransformation( kpOutRadiusMdl.optTransMat, 
				[hitBouyDist,hitBouyDist,1],
				[0, 0, 0],
				[0, 0, 0] );
	kpOutRadiusMdl.optTransformUpdated = true;
}

let waypRoundBeginWall = null;
let waypRoundEndWall   = null;
function Rgta_WaypRoundBeginWallLoaded( rndWall ){
	if( waypRoundBeginWall == null ){
		waypRoundBeginWall = rndWall;
		waypRoundBeginWall.optTransformUpdated = true;
		waypRoundBeginWall.quadmesh.materials[0].lumCol = [0.4,1,0];
	}else{
		waypRoundEndWall = rndWall;
		waypRoundEndWall.optTransformUpdated = true;
	}
}

const RgtaState = {
	NextBouy: 0,
	BeganRoundingBouy: 1,
	InColisionWithBouy: 2
};
let rgtaState = RgtaState.NextBouy;

let secsToShowCourseCompleteText = 2;
let startTimeCCompTextShown = 0;

var rgta_completeMins = -1;
var rgta_completeSecs = -1;
var rgta_completeSecTenths = -1;
let rgta_startTime = 0;
function RGTTA_Start(time){
	//boat position values are negative of boatMapPosition
	boatPosition[0] =  10;
	boatPosition[1] = -10;
	lastBoatUpdateTime = time;
	boatHeading = 35/180*Math.PI;
	playNote( noteFrequencies['G3' ], 0.25 );


	rgta_startTime = time;
	startTimeCCompTextShown = Number.MAX_VALUE;
	rgtaState = RgtaState.NextBouy;
	currentWaypointIdx = 0;
	
	rgta_completeTime = -1;
	
	//move the waypoint keepout indicator
	if( kpOutRadiusMdl != null ){
		let bouyPosition = bouyInfos[currentWaypointIdx].origLoc;
		Matrix_SetEulerTransformation(
			kpOutRadiusMdl.optTransMat, 
			[hitBouyDist,hitBouyDist,1],
			[0, 0, 0],
			bouyPosition
		);
	}
}

let dist_Hdg_VecFromToWaypoint = [0,0, Vect3_New(), Vect3_New()];
function RGTTA_DistAndHdgFromWaypoint( retDistHdgVecFromWayp, waypPos, toPos ){

	//generate vec from waypt
	Vect3_Copy(     retDistHdgVecFromWayp[2], toPos );
	Vect3_Subtract( retDistHdgVecFromWayp[2], waypPos );
	retDistHdgVecFromWayp[0] = Vect3_Normal( retDistHdgVecFromWayp[2] );
	
	//calculate the angle of the vec from waypt
	retDistHdgVecFromWayp[1] = MTH_WrapAng0To2PI( Vec2ToAngle(retDistHdgVecFromWayp[2]) );
	
	//generate unit vect to waypoint
	Vect3_Copy( retDistHdgVecFromWayp[3], retDistHdgVecFromWayp[2] );
	Vect3_MultiplyScalar( retDistHdgVecFromWayp[3], -1 );
}


let ObjTextSize = 0.1;
let incompleteObjColor = [1,1,0];
let completeObjColor   = [0,1,0];
let beginRoundingTxtColor = incompleteObjColor;
let endRoundingTxtColor   = incompleteObjColor;

let hitBouyDist = 7; //distance to bouy position considered to be "in collision with bouy"
let resetPenaltyBouyDist = 20; //distance required to back off from bouy to restart rounding

let rgta_elapsedTime = 0;
let currentWaypointIdx = 0;
let currentBouyRoundDir = false; //false port, true starbd
let prevVecToBouy = Vect3_New();
let prevHdgToBouy = 0;

let vecToPrevBouy = Vect3_New();
let vecToNextBouy = Vect3_New();
let angToPrevBouy = 0;
let angToNextBouy = 0;
let perpendicAngToPrevBouy = 0;
let perpendicAngToNextBouy = 0;

let tempPerpendicVec = Vect_New(2);
let RGT_tempInvMat = Matrix_New();
function RGTTA_Update( time, cam, boatMapPosition, boatToWorldMatrix, rb2DTris, rb3DTris, rb3DLines ){

	let srnAspc = graphics.GetScreenAspect();

	let incrementWaypointIdx = false;




	let bmpTxtX  = -0.95*srnAspc;
	let bmpTxtY  =  0.8;
	let bmpTxtZ  =  0.02;
	let txtSz    =  0.03;
	/*
	bmpTxtX = TR_QueueText( rb2DTris, bmpTxtX , bmpTxtY, bmpTxtZ, txtSz, "Boat Map Position", false );
	bmpTxtX += xKernSpc*5*txtSz;
			TR_QueueNumber( rb2DTris, bmpTxtX , bmpTxtY, bmpTxtZ, txtSz, boatMapPosition[0], 2 );
	bmpTxtX += xKernSpc*7*txtSz;
			TR_QueueNumber( rb2DTris, bmpTxtX , bmpTxtY, bmpTxtZ, txtSz, boatMapPosition[1], 2 );
	*/

	//setup the regatta scene camera from the boat camera and boat translation
	let rgtaCam = rgtaScene.cameras[ rgtaScene.activeCameraIdx ];
	Matrix_Multiply( rb3DTris.worldToScreenSpaceMat, rgtaCam.worldToScreenSpaceMat, boatToWorldMatrix );
	Matrix_Copy( RGT_tempInvMat, rb3DTris.worldToScreenSpaceMat );
	Matrix_Inverse( rb3DTris.screenSpaceToWorldMat, RGT_tempInvMat );
	Matrix_Multiply_Vect3( rb3DTris.camWorldPos, rb3DTris.screenSpaceToWorldMat, Vect3_ZeroConst );
	rb3DTris.fov = cam.fov;
	

	//get the ocean height for each bouy so it can be on the surface
	for( let bouyIdx = 0; bouyIdx < bouyInfos.length; ++bouyIdx ){
		let bouyQm = bouyInfos[bouyIdx].bouyQm;
		let bouyMdl = bouyQm.models[0];
		let bouyPosition = bouyInfos[bouyIdx].origLoc;//bouyQm.origin;
		let height = OCN_GetHeightAtMapPosition( bouyPosition[0], bouyPosition[1] );
		bouyPosition[2] = height;
		Matrix_SetQuatTransformation(
			bouyMdl.optTransMat,
			bouyQm.scale,
			bouyQm.rotation,
			bouyPosition
		);
		bouyMdl.optTransformUpdated = true;
		//rb2DTris, x, y, dpth, size, str, interactive, justify=TxtJustify.Left, overideColor=null
		TR_QueueText( rb3DTris, bouyPosition[0], bouyPosition[1], 4, 1, 
			OCN_HAMP_lvl + " " + OCN_HAMP_quadCoord, 
			false, TxtJustify.Center, overideColor=null, bilboard=true );
			
		if( currentWaypointIdx == bouyIdx ){
			//if the bouy has a keepout radius model also move it vertically with the ocean surface
			//let bouyPosition = bouyInfos[currentWaypointIdx].bouyQm.origin;

			//move the waypoint keepout indicator
			if( kpOutRadiusMdl != null )
				Matrix_SetEulerTransformation( kpOutRadiusMdl.optTransMat, 
				[hitBouyDist,hitBouyDist,1],
				[0, 0, 0],
				bouyPosition );
		}
	}
	//also move the start line boat to the ocean surface
	startLineBoatLoc[2] = OCN_GetHeightAtMapPosition( startLineBoatLoc[0], startLineBoatLoc[1] );
	Matrix_SetQuatTransformation(
			startLineBoatQm.models[0].optTransMat,
			startLineBoatQm.scale,
			startLineBoatQm.rotation,
			startLineBoatLoc
		);
	startLineBoatQm.models[0].optTransformUpdated = true;
	


	HVNSC_UpdateInCamViewAreaAndGatherObjsToDraw( rgtaScene, time, rb3DTris, rb3DLines );

	rgta_elapsedTime = time - rgta_startTime;
	let elapsedMins 	 = Math.floor(rgta_elapsedTime / 60);
	let elapsedSecs 	 = Math.floor(rgta_elapsedTime - (elapsedMins*60));
	let elapsedSecTenths = Math.floor( (rgta_elapsedTime - ((elapsedMins*60)+elapsedSecs))*100 );
	TR_QueueTime( rb2DTris, 0.95*srnAspc, 0.9, 0.02, 0.1, elapsedMins, elapsedSecs, elapsedSecTenths, TxtJustify.Right );

	if( currentWaypointIdx > bouyInfos.length-1 ){
		if( rgta_completeMins == -1 ){
			rgta_completeMins = elapsedMins;
			rgta_completeSecs = elapsedSecs;
			rgta_completeSecTenths = elapsedSecTenths;
		}
		TR_QueueText( rb2DTris, -0.45, 0.6, 0.02, ObjTextSize, "COURSE COMPLETE", false );
		if( startTimeCCompTextShown == Number.MAX_VALUE )
			startTimeCCompTextShown = time;
		if( ( time - startTimeCCompTextShown ) >= secsToShowCourseCompleteText )
			sgMode = SailModes.Leaderboard;
	}else{

		if( kpOutRadiusMdl != null )
			rb3DTris.objs[kpOutRadiusMdl.uid.val] = kpOutRadiusMdl;

		let currentBouyInfo = bouyInfos[currentWaypointIdx];
		let bouyPosition = currentBouyInfo.bouyQm.origin;
		RGTTA_DistAndHdgFromWaypoint( dist_Hdg_VecFromToWaypoint, bouyPosition, boatMapPosition );
		let dirIndcDir = MTH_WrapAng0To2PI(dist_Hdg_VecFromToWaypoint[1] + boatHeading + -0.5*Math.PI);
		
		Matrix_SetEulerTransformation( directionUiQmInst.optTransMat, 
					[.2,.2,.2], 
					[-120/180*Math.PI, dirIndcDir, 0], 
					[0, 0.7, 0] );
		directionUiQmInst.optTransformUpdated = true;
		rb2DTris.objs[directionUiQmInst.uid.val] = directionUiQmInst;

		let bouyRoundDirStr = "PORT";
		if( currentBouyRoundDir )
			bouyRoundDirStr = "STARBORD";
		TR_QueueText(   rb2DTris,  0           , 0.9 , 0.02, ObjTextSize, currentBouyInfo.instrString, 			false, TxtJustify.Center );
		let distX = TR_QueueText(   rb2DTris, -0.95*srnAspc, 0.7 , 0.02, 0.03, "Dist to waypoint", 						false );
		TR_QueueNumber( rb2DTris, distX+xKernSpc*0.03*5, 0.7 , 0.02, 0.03, dist_Hdg_VecFromToWaypoint[0].toFixed(2),  false );
		let hdgX = TR_QueueText(   rb2DTris, -0.95*srnAspc, 0.65, 0.02, 0.03, "Hdg to waypoint", 					false );
		TR_QueueNumber( rb2DTris, hdgX+xKernSpc*0.03*5, 0.65, 0.02, 0.03, 
							(MTH_WrapAng0To2PI(dist_Hdg_VecFromToWaypoint[1]+Math.PI)*180/Math.PI).toFixed(2), 2 );
		
		let vmg = Vect_Dot( boatMapPositionVel, dist_Hdg_VecFromToWaypoint[3] );
		let velX = TR_QueueText(   rb2DTris, -0.95*srnAspc, 0.6 , 0.02, 0.03, "Vel to waypoint", 						false );
		TR_QueueNumber( rb2DTris, velX+xKernSpc*0.03*5, 0.6 , 0.02, 0.03, vmg,  2 );


		if( dist_Hdg_VecFromToWaypoint[0] < hitBouyDist || rgtaState == RgtaState.InColisionWithBouy ){
			rgtaState = RgtaState.InColisionWithBouy;
			TR_QueueText( rb2DTris, 0, 0.4, 0.02, ObjTextSize, "IN COLISION WITH BOUY", false, TxtJustify.Center );
			if( dist_Hdg_VecFromToWaypoint[0] > resetPenaltyBouyDist )
				rgtaState = RgtaState.NextBouy; //clear colision status
		}


		if( rgtaState != RgtaState.InColisionWithBouy ){

			if( currentBouyInfo.wayType == WaypointType.StartLine ){
				if( !currentBouyInfo.roundDirection ){ //bouy is to port of start line
					if( dist_Hdg_VecFromToWaypoint[2][0] < 0 && dist_Hdg_VecFromToWaypoint[2][1] < 0 && prevVecToBouy[1] >= 0 ){
						incrementWaypointIdx = true;
						playNote( noteFrequencies['F3' ], 0.25 );
						playNote( noteFrequencies['A#3'], 0.25 );
					}
				}
			}else if( currentBouyInfo.wayType == WaypointType.RoundBouy ){
				
				//need to cross vec perpendicular to prev bouy, and prpendic to next bouy
				//without hitting bouy
				if( !currentBouyInfo.roundDirection ){ //bouy to be rounded to port side of boat
				
					rb3DTris.objs[waypRoundBeginWall.uid.val] = waypRoundBeginWall;

					if( rgtaState == RgtaState.NextBouy &&
						!MTH_WrappedAngLessThan( perpendicAngToPrevBouy, dist_Hdg_VecFromToWaypoint[1] ) ){
							rgtaState = RgtaState.BeganRoundingBouy;
							playNote( noteFrequencies['D3' ], 0.25 );
					}else if( rgtaState == RgtaState.BeganRoundingBouy ){
						if( !MTH_WrappedAngLessThan( perpendicAngToNextBouy, dist_Hdg_VecFromToWaypoint[1] ) ){
							incrementWaypointIdx = true;
							rgtaState = RgtaState.NextBouy;
							playNote( noteFrequencies['A3' ], 0.25 );
						}
					}

					if( rgtaState == RgtaState.BeganRoundingBouy ){
						beginRoundingTxtColor = completeObjColor;
					}
					if( incrementWaypointIdx ){
						endRoundingTxtColor = completeObjColor;
					}


					let nxtStrXStart = TR_QueueText(   rb2DTris, -0.95*srnAspc				 , 0.5 , 0.02, txtSz, 
														"Hdg to Wayp to begin rounding", 
											false, TxtJustify.Left, beginRoundingTxtColor     );
					nxtStrXStart = Math.ceil( (nxtStrXStart+(xKernSpc*3*txtSz)) * 10 ) / 10;
									   TR_QueueNumber( rb2DTris, nxtStrXStart				 , 0.5 , 0.02, txtSz,
									   			(MTH_WrapAng0To2PI(perpendicAngToPrevBouy+Math.PI)*180/Math.PI).toFixed(2), 2 );
									   TR_QueueText(   rb2DTris, -0.95*srnAspc				 , 0.47, 0.02, txtSz, 
									   					"Hdg to Wayp to complete rounding",
									   		false, TxtJustify.Left, endRoundingTxtColor     );
									   TR_QueueNumber( rb2DTris, nxtStrXStart				 , 0.47, 0.02, txtSz, 
									   			(MTH_WrapAng0To2PI(perpendicAngToNextBouy+Math.PI)*180/Math.PI).toFixed(2), 2 );

				}

			}

		}

		Vect3_Copy( prevVecToBouy, dist_Hdg_VecFromToWaypoint[2] );
		prevHdgToBouy = dist_Hdg_VecFromToWaypoint[1];
		if( incrementWaypointIdx ){
			currentWaypointIdx += 1;
			beginRoundingTxtColor = incompleteObjColor;
			endRoundingTxtColor   = incompleteObjColor;
			
			if( currentWaypointIdx < bouyInfos.length ){
			
				let bouyPosition = bouyInfos[currentWaypointIdx].bouyQm.origin;

				//move the waypoint keepout indicator
				if( kpOutRadiusMdl != null )
					Matrix_SetEulerTransformation( kpOutRadiusMdl.optTransMat, 
					[hitBouyDist,hitBouyDist,1],
					[0, 0, 0],
					bouyPosition );

				if( bouyInfos[currentWaypointIdx].wayType == WaypointType.RoundBouy ){
					//pre calculate / calculate once the course angles required for bouy rounding
					let prevBouyPosition = bouyInfos[currentWaypointIdx-1].bouyQm.origin;
					let nextBouyPosition = bouyInfos[currentWaypointIdx+1].bouyQm.origin;
					
					Vect3_Copy( vecToPrevBouy, prevBouyPosition );
					Vect3_Subtract( vecToPrevBouy, bouyPosition );
					Vect3_Normal( vecToPrevBouy );
					angToPrevBouy = Vec2ToAngle( vecToPrevBouy );
					
					Vect3_Copy( vecToNextBouy, nextBouyPosition );
					Vect3_Subtract( vecToNextBouy, bouyPosition );
					Vect3_Normal( vecToNextBouy );
					angToNextBouy = Vec2ToAngle( vecToNextBouy );
					
					//map coordinates are right hand rule
					//with the boat pointing windward
					//x positive to port
					//y positve downwind
					//z positive up
					//angles are counter clockwise from x positve to y positive
					//(pi/2 is downwind, 
					if( !bouyInfos[currentWaypointIdx].roundDirection ){
						perpendicAngToPrevBouy = MTH_WrapAng0To2PI( angToPrevBouy + Math.PI/2 );
						perpendicAngToNextBouy = MTH_WrapAng0To2PI( angToNextBouy - Math.PI/2 );
					}else{
						perpendicAngToPrevBouy = MTH_WrapAng0To2PI( angToPrevBouy - Math.PI/2 );
						perpendicAngToNextBouy = MTH_WrapAng0To2PI( angToNextBouy + Math.PI/2 );
					}
					
					//position the waypoint begin and end rounding wall indicators
					let rndWallLen = hitBouyDist*3;
					AngleToVec2Unit( tempPerpendicVec, perpendicAngToPrevBouy);
					Vect_MultScal( tempPerpendicVec, rndWallLen+hitBouyDist );
					Matrix_SetEulerTransformation( 
						waypRoundBeginWall.optTransMat,
						[hitBouyDist*3,1,1],
						[Math.PI/2, 0, perpendicAngToPrevBouy],
						[bouyPosition[0]+tempPerpendicVec[0],
						 bouyPosition[1]+tempPerpendicVec[1],
						 0 ]
					);
					
				}

			}
		}
	}
	
	
	if( !incrementWaypointIdx && sgMode == SailModes.NetworkGameplay )
		Client_Update( boatHeading, boatMapPosition, currentWaypointIdx, dist_Hdg_VecFromToWaypoint[0], startTimeCCompTextShown == Number.MAX_VALUE ? -1 : startTimeCCompTextShown );
}

