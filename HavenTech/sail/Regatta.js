
//maintains the status of the sailing competition

let rgtaScene = null;
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

let directionUiQmInst = null;

var RGTA_Ready = false;
function RGTTA_SceneLoaded( hvnsc ){

	console.log( "RGTTA_SceneLoaded" );

	for( let i = 0; i < bouyInfos.length; ++i ){
		bouyInfos[i].bouyQm = graphics.cachedObjs[QuadMesh.name][rgtaSceneName][bouyInfos[i].bouyName][0];
	}
	
	directionUiQmInst = new Model( "wayPtDirec", "windIndc", "textMeshes", null, 
					modelLoadedParameters=null, modelLoadedCallback=null, isDynamic=false );

	new Model( "WaypKeepOutRadius", "WaypKeepOutRadius", "RegattaWaypoints", null, 
					modelLoadedParameters=null, modelLoadedCallback=Rgta_WaypKeepOutRadiusLoaded, isDynamic=false );

	new Model( "WaypRoundBeginWall", "WaypRoundBeginWall", "RegattaWaypoints", null, 
					modelLoadedParameters=null, modelLoadedCallback=Rgta_WaypRoundBeginWallLoaded, isDynamic=false );

	RGTA_Ready = true;
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
	if( waypRoundBeginWall == null )
		waypRoundBeginWall = rndWall;
	else
		waypRoundEndWall = rndWall;
}

const RgtaState = {
	NextBouy: 0,
	BeganRoundingBouy: 1,
	InColisionWithBouy: 2
};
let rgtaState = RgtaState.NextBouy;

let secsToShowCourseCompleteText = 2;
let startTimeCCompTextShown = 0;

let rgta_startTime = 0;
function RGTTA_Start(time){
	rgta_startTime = time;
	startTimeCCompTextShown = Number.MAX_VALUE;
	rgtaState = RgtaState.NextBouy;
	currentWaypointIdx = 0;
	
	//move the waypoint keepout indicator
	let bouyPosition = bouyInfos[currentWaypointIdx].bouyQm.origin;
	Matrix_SetEulerTransformation( kpOutRadiusMdl.optTransMat, 
	[hitBouyDist,hitBouyDist,1],
	[0, 0, 0],
	bouyPosition );
}

let dist_Hdg_VecFromWaypoint = [0,0, Vect3_New()];
function RGTTA_DistAndHdgFromWaypoint( retDistHdgVecFromWayp, waypPos, toPos ){
	Vect3_Copy(     retDistHdgVecFromWayp[2], toPos );
	Vect3_Subtract( retDistHdgVecFromWayp[2], waypPos );
	retDistHdgVecFromWayp[0] = Vect3_Length( retDistHdgVecFromWayp[2] );
	Vect3_Unit( retDistHdgVecFromWayp[2] );
	retDistHdgVecFromWayp[1] = MTH_WrapAng0To2PI( Vec2ToAngle(retDistHdgVecFromWayp[2]) );
}

let incompleteObjColor = [1,1,0];
let completeObjColor   = [0,1,0];
let beginRoundingTxtColor = incompleteObjColor;
let endRoundingTxtColor   = incompleteObjColor;

let hitBouyDist = 7;
let resetPenaltyBouyDist = 20;

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
function RGTTA_Update( time, cam, boatMapPosition, boatMatrix, rb2DTris, rb3DTris, rb3DLines ){

	let srnAspc = graphics.GetScreenAspect();

	let incrementWaypointIdx = false;


	rb3DTris.objs[kpOutRadiusMdl.uid.val] = kpOutRadiusMdl;


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
	Matrix_Multiply( rb3DTris.worldToScreenSpaceMat, cam.worldToScreenSpaceMat, boatMatrix );
	Matrix_Multiply_Vect3( rb3DTris.camWorldPos, boatMatrix, Vect3_ZeroConst );
	rb3DTris.fov = cam.fov;

	HVNSC_UpdateInCamViewAreaAndGatherObjsToDraw( rgtaScene, time, rb3DTris, rb3DLines );

	rgta_elapsedTime = time - rgta_startTime;
	let elapsedMins = Math.floor(rgta_elapsedTime / 60);
	let elapsedSecs = Math.floor(rgta_elapsedTime - (elapsedMins*60));
	TR_QueueTime( rb2DTris, 0.95*srnAspc, 0.9, 0.02, 0.1, elapsedMins, elapsedSecs, TxtJustify.Right );

	if( currentWaypointIdx > bouyInfos.length-1 ){
		TR_QueueText( rb2DTris, -0.45, 0.6, 0.02, 0.1, "COURSE COMPLETE", false );
		if( startTimeCCompTextShown == Number.MAX_VALUE )
			startTimeCCompTextShown = time;
		if( ( time - startTimeCCompTextShown ) >= secsToShowCourseCompleteText )
			sgMode = SailModes.Leaderboard;
	}else{


		let currentBouyInfo = bouyInfos[currentWaypointIdx];
		let bouyPosition = currentBouyInfo.bouyQm.origin;
		RGTTA_DistAndHdgFromWaypoint( dist_Hdg_VecFromWaypoint, bouyPosition, boatMapPosition );
		let dirIndcDir = MTH_WrapAng0To2PI(dist_Hdg_VecFromWaypoint[1] + boatHeading + -0.5*Math.PI);
		
		Matrix_SetEulerTransformation( directionUiQmInst.optTransMat, 
					[.2,.2,.2], 
					[-120/180*Math.PI, dirIndcDir, 0], 
					[0, 0.7, 0] );
		directionUiQmInst.optTransformUpdated = true;
		rb2DTris.objs[directionUiQmInst.uid.val] = directionUiQmInst;

		let bouyRoundDirStr = "PORT";
		if( currentBouyRoundDir )
			bouyRoundDirStr = "STARBORD";
		TR_QueueText(   rb2DTris,  0           , 0.9 , 0.02, 0.05, currentBouyInfo.instrString, 			false, TxtJustify.Center );
		TR_QueueText(   rb2DTris, -0.95*srnAspc, 0.7 , 0.02, 0.03, "Dist to waypoint", 						false );
		TR_QueueNumber( rb2DTris, -0.6 *srnAspc, 0.7 , 0.02, 0.03, dist_Hdg_VecFromWaypoint[0].toFixed(2),  false );
		TR_QueueText(   rb2DTris, -0.95*srnAspc, 0.65, 0.02, 0.03, "Hdg from waypoint", 					false );
		TR_QueueNumber( rb2DTris, -0.6 *srnAspc, 0.65, 0.02, 0.03, MTH_WrapAng0To2PI(dist_Hdg_VecFromWaypoint[1]).toFixed(2), 2 );


		if( dist_Hdg_VecFromWaypoint[0] < hitBouyDist || rgtaState == RgtaState.InColisionWithBouy ){
			rgtaState = RgtaState.InColisionWithBouy;
			TR_QueueText( rb2DTris, 0, 0.4, 0.02, 0.07, "IN COLISION WITH BOUY", false, TxtJustify.Center );
			if( dist_Hdg_VecFromWaypoint[0] > resetPenaltyBouyDist )
				rgtaState = RgtaState.NextBouy; //clear colision status
		}


		if( rgtaState != RgtaState.InColisionWithBouy ){

			if( currentBouyInfo.wayType == WaypointType.StartLine ){
				if( !currentBouyInfo.roundDirection ){ //bouy is to port of start line
					if( dist_Hdg_VecFromWaypoint[2][0] < 0 && dist_Hdg_VecFromWaypoint[2][1] < 0 && prevVecToBouy[1] >= 0 )
						incrementWaypointIdx = true;
				}
			}else if( currentBouyInfo.wayType == WaypointType.RoundBouy ){
				
				//need to cross vec perpendicular to prev bouy, and prpendic to next bouy
				//without hitting bouy
				if( !currentBouyInfo.roundDirection ){ //bouy to be rounded to port side of boat

					if( rgtaState == RgtaState.NextBouy &&
						!MTH_WrappedAngLessThan( perpendicAngToPrevBouy, dist_Hdg_VecFromWaypoint[1] ) ){
							rgtaState = RgtaState.BeganRoundingBouy;
					}else if( rgtaState == RgtaState.BeganRoundingBouy ){
						if( !MTH_WrappedAngLessThan( perpendicAngToNextBouy, dist_Hdg_VecFromWaypoint[1] ) ){
							incrementWaypointIdx = true;
							rgtaState = RgtaState.NextBouy;
						}
					}

					if( rgtaState == RgtaState.BeganRoundingBouy ){
						beginRoundingTxtColor = completeObjColor;
					}
					if( incrementWaypointIdx ){
						endRoundingTxtColor = completeObjColor;
					}


					let nxtStrXStart = TR_QueueText(   rb2DTris, -0.95*srnAspc				 , 0.5 , 0.02, txtSz, 
														"Hdg frm Wayp to begin rounding", 
											false, TxtJustify.Left, beginRoundingTxtColor     );
					nxtStrXStart = Math.ceil( (nxtStrXStart+(xKernSpc*3*txtSz)) * 10 ) / 10;
									   TR_QueueNumber( rb2DTris, nxtStrXStart				 , 0.5 , 0.02, txtSz,
									   					perpendicAngToPrevBouy.toFixed(2), 2 );
									   TR_QueueText(   rb2DTris, -0.95*srnAspc				 , 0.47, 0.02, txtSz, 
									   					"Hdg frm Wayp to complete rounding",
									   		false, TxtJustify.Left, endRoundingTxtColor     );
									   TR_QueueNumber( rb2DTris, nxtStrXStart				 , 0.47, 0.02, txtSz, 
									   					perpendicAngToNextBouy.toFixed(2), 2 );

				}

			}

		}

		Vect3_Copy( prevVecToBouy, dist_Hdg_VecFromWaypoint[2] );
		prevHdgToBouy = dist_Hdg_VecFromWaypoint[1];
		if( incrementWaypointIdx ){
			currentWaypointIdx += 1;
			beginRoundingTxtColor = incompleteObjColor;
			endRoundingTxtColor   = incompleteObjColor;
			
			if( currentWaypointIdx < bouyInfos.length ){
			
				let bouyPosition = bouyInfos[currentWaypointIdx].bouyQm.origin;

				//move the waypoint keepout indicator
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
					Vect3_Unit( vecToPrevBouy );
					angToPrevBouy = Vec2ToAngle( vecToPrevBouy );
					
					Vect3_Copy( vecToNextBouy, nextBouyPosition );
					Vect3_Subtract( vecToNextBouy, bouyPosition );
					Vect3_Unit( vecToNextBouy );
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
				}

			}
		}
	}
}

