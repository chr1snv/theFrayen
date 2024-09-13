
//maintains the status of the sailing competition

let rgtaScene = null;
let rgtaSceneName = "islandRegatta";
function RGTTA_Init(){
	rgtaScene = new HavenScene( rgtaSceneName, RGTTA_SceneLoaded );
}


function RGTTA_AllocSubRngBuffer(dbB, numVerts, subBufId, obj){
	//BufSubRange(startIdxIn, lenIn, objIn, objMatIdxIn)
	let sbb = new BufSubRange( dbB.bufferIdx, numVerts, obj, 0 );
	Matrix_SetIdentity( sbb.toWorldMatrix );
	dbB.bufSubRanges[subBufId] = sbb;

	dbB.bufferIdx += numVerts;

	let subRngKeys = Object.keys( dbB.bufSubRanges );
	for(let i = 0; i < subRngKeys.length; ++i ){
		dbB.bufSubRanges[subRngKeys[i]].vertsNotYetUploaded = true;
	}
	//txtR_dbB.regenAndUploadEntireBuffer = true;

	return sbb;
}

function InitAndAllocOneObjBuffer(obj){
	let matIdx = 0;
	//qm, drawBatch, matIdx, subBatchBuffer
	QM_SL_GenerateDrawVertsNormsUVsForMat( obj, null, matIdx, null );

	let material = obj.materials[matIdx];
	let dbB = new DrawBatchBuffer( material );
	let numVerts = obj.vertBufferForMat[matIdx].length;
	let subBufId = 0;
	RGTTA_AllocSubRngBuffer( dbB, numVerts, subBufId, obj );
	//enable the sub batch buffer to draw this frame
	if( dbB.sortedSubRngKeys == null )
		dbB.sortedSubRngKeys = [];
	dbB.sortedSubRngKeys.push( subBufId );
	dbB.numBufSubRanges += 1;

	return dbB;
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

var RGTA_Ready = false;
function RGTTA_SceneLoaded( hvnsc ){

	console.log( "RGTTA_SceneLoaded" );

	for( let i = 0; i < bouyInfos.length; ++i ){

		bouyInfos[i].bouyQm = graphics.cachedObjs[QuadMesh.name][rgtaSceneName][bouyInfos[i].bouyName][0];

	}

	RGTA_Ready = true;
}

const RgtaState = {
	NextBouy: 0,
	BeganRoundingBouy: 1,
	InColisionWithBouy: 2
};
let rgtaState = RgtaState.NextBouy;


let rgta_startTime = 0;
function RGTTA_Start(time){
	rgta_startTime = time;
}

let dist_Hdg_VecFromWaypoint = [0,0, Vect3_New()];
function RGTTA_DistAndHdgFromWaypoint( retDistHdgVecFromWayp, waypPos, toPos ){
	Vect3_Copy(     retDistHdgVecFromWayp[2], toPos );
	Vect3_Subtract( retDistHdgVecFromWayp[2], waypPos );
	retDistHdgVecFromWayp[0] = Vect3_Length( retDistHdgVecFromWayp[2] );
	Vect3_Unit( retDistHdgVecFromWayp[2] );
	retDistHdgVecFromWayp[1] = MTH_WrapAng0To2PI( Vec2ToAngle(retDistHdgVecFromWayp[2]) );
}

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

	let bmpTxtX  = -0.95*srnAspc;
	let bmpTxtY  =  0.6;
	let bmpTxtZ  =  0.02;
	let bmpTxtSz =  0.03;
	bmpTxtX = TR_QueueText( rb2DTris, bmpTxtX , bmpTxtY, bmpTxtZ, bmpTxtSz, "Boat Map Position", false );
	bmpTxtX += xKernSpc*3*bmpTxtSz;
			TR_QueueNumber( rb2DTris, bmpTxtX , bmpTxtY, bmpTxtZ, bmpTxtSz, boatMapPosition[0], 2 );
	bmpTxtX += 0.07;
			TR_QueueNumber( rb2DTris, bmpTxtX , bmpTxtY, bmpTxtZ, bmpTxtSz, boatMapPosition[1], 2 );

	//setup the regatta scene camera from the boat camera and boat translation
	Matrix_Multiply( rb3DTris.worldToScreenSpaceMat, cam.worldToScreenSpaceMat, boatMatrix );
	Matrix_Multiply_Vect3( rb3DTris.camWorldPos, boatMatrix, Vect3_ZeroConst );
	rb3DTris.fov = cam.fov;

	HVNSC_UpdateInCamViewAreaAndGatherObjsToDraw( rgtaScene, time, rb3DTris, rb3DLines );

	rgta_elapsedTime = time - rgta_startTime;
	let elapsedMins = Math.floor(rgta_elapsedTime / 60);
	let elapsedSecs = Math.floor(rgta_elapsedTime - (elapsedMins*60));
	TR_QueueTime( rb2DTris, 0.3, 0.9, 0.02, 0.1, elapsedMins, elapsedSecs );

	if( currentWaypointIdx > bouyInfos.length-1 ){
		TR_QueueText( rb2DTris, -0.45, 0.6, 0.02, 0.1, "COURSE COMPLETE", false );
	}else{

		let currentBouyInfo = bouyInfos[currentWaypointIdx];
		let bouyPosition = currentBouyInfo.bouyQm.origin;
		RGTTA_DistAndHdgFromWaypoint( dist_Hdg_VecFromWaypoint, bouyPosition, boatMapPosition );
		//Vect3_Copy( vecToWaypoint, bouyPosition);
		//Vect3_Add( vecToWaypoint, boatPosition ); //boat position is negative
		//let distToBouy = Vect3_Length( vecToWaypoint );
		//Vect3_Unit( vecToWaypoint );
		//let hdgToBouy = Vec2ToAngle(vecToWaypoint);
		
		//let boatRelHdgToBouy = MTH_WrapAng0To2PI( hdgToBouy - boatHeading );
		/*
		console.log( "vecToBouy "         + vecToBouy[0].toPrecision(2) + " " + vecToBouy[1].toPrecision(2) + 
					 " distToBouy "       + distToBouy.toPrecision(2) + 
					 " hdgToBouy "        + hdgToBouy.toPrecision(2) + 
					 " boatHeading "      + boatHeading.toPrecision(2) +
					 " boatRelHdgToBouy " + boatRelHdgToBouy.toPrecision(2) );
		*/

		let bouyRoundDirStr = "PORT";
		if( currentBouyRoundDir )
			bouyRoundDirStr = "STARBORD";
		TR_QueueText(   rb2DTris,  0           , 0.9 , 0.02, 0.05, currentBouyInfo.instrString, false, TxtJustify.Center );
		TR_QueueText(   rb2DTris, -0.95*srnAspc, 0.7 , 0.02, 0.03, "Dist to waypoint", false );
		TR_QueueNumber( rb2DTris, -0.7 *srnAspc, 0.7 , 0.02, 0.03, dist_Hdg_VecFromWaypoint[0].toFixed(2) );
		TR_QueueText(   rb2DTris, -0.95*srnAspc, 0.65, 0.02, 0.03, "Hdg from waypoint", false );
		TR_QueueNumber( rb2DTris, -0.7 *srnAspc, 0.65, 0.02, 0.03, MTH_WrapAng0To2PI(dist_Hdg_VecFromWaypoint[1]).toFixed(2), 2 );


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
					let nxtStrXStart = TR_QueueText(rb2DTris, -0.95*srnAspc, 0.5, 0.02, 0.03, "Hdg to Wayp to begin rounding" );
					TR_QueueNumber(rb2DTris, nxtStrXStart+(xKernSpc*0.03), 0.5, 0.02, 0.03, perpendicAngToPrevBouy.toFixed(2), 2 );
					if( rgtaState == RgtaState.NextBouy &&
						!MTH_WrappedAngLessThan( perpendicAngToPrevBouy, dist_Hdg_VecFromWaypoint[1] ) ){
							rgtaState = RgtaState.BeganRoundingBouy;
					}else if( rgtaState == RgtaState.BeganRoundingBouy ){
						if( !MTH_WrappedAngLessThan( perpendicAngToNextBouy, dist_Hdg_VecFromWaypoint[1] ) ){
							incrementWaypointIdx = true;
							rgtaState = RgtaState.NextBouy;
						}
					}
				}
			}

		}
		
		Vect3_Copy( prevVecToBouy, dist_Hdg_VecFromWaypoint[2] );
		prevHdgToBouy = dist_Hdg_VecFromWaypoint[1];
		if( incrementWaypointIdx ){
			currentWaypointIdx += 1;
			if( currentWaypointIdx < bouyInfos.length &&
				bouyInfos[currentWaypointIdx].wayType == WaypointType.RoundBouy ){
				//pre calculate / calculate once the course angles required for bouy rounding
				let prevBouyPosition = bouyInfos[currentWaypointIdx-1].bouyQm.origin;
				let bouyPosition = bouyInfos[currentWaypointIdx].bouyQm.origin;
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

