
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


function WaypointInfo( bouyNameIn, roundDirection, instrStringIn ){
	this.bouyName = bouyNameIn;
	this.bouyQm = null;
	this.roundDirection = roundDirection;
	this.instrString = instrStringIn;
}

//regatta course definition
let bouyInfos = new Array(4);
bouyInfos[0] = new WaypointInfo( "inflatableBouy", false, "Cross the Start Line" );
bouyInfos[1] = new WaypointInfo( "inflatableBouy_s.001", false, "Round the Windward Bouy" );
bouyInfos[2] = new WaypointInfo( "inflatableBouy_s.002", false, "Downwind offset Bouy" );
bouyInfos[3] = new WaypointInfo( "inflatableBouy", false, "Cross the Finish Line" );

var RGTA_Ready = false;
function RGTTA_SceneLoaded( hvnsc ){

	console.log( "RGTTA_SceneLoaded" );

	for( let i = 0; i < bouyInfos.length; ++i ){

		bouyInfos[i].bouyQm = graphics.cachedObjs[QuadMesh.name][rgtaSceneName][bouyInfos[i].bouyName][0];

	}

	RGTA_Ready = true;
}

let rgta_startTime = 0;
function RGTTA_Start(time){
	rgta_startTime = time;
}

let roundBouyDist = 3;

let rgta_elapsedTime = 0;
let currentBouyIdx = 0;
let currentBouyRoundDir = false; //false port, true starbd
let vecToBouy = Vect3_New();
function RGTTA_Update( time, cam, boatPosition, boatMatrix, rb2DTris, rb3DTris, rb3DLines ){

	//setup the regatta scene camera from the boat camera and boat translation
	Matrix_Multiply( rb3DTris.worldToScreenSpaceMat, cam.worldToScreenSpaceMat, boatMatrix );
	Matrix_Multiply_Vect3( rb3DTris.camWorldPos, boatMatrix, Vect3_ZeroConst );
	rb3DTris.fov = cam.fov;

	HVNSC_UpdateInCamViewAreaAndGatherObjsToDraw( rgtaScene, time, rb3DTris, rb3DLines );

	rgta_elapsedTime = time - rgta_startTime;
	let elapsedMins = Math.floor(rgta_elapsedTime / 60);
	let elapsedSecs = Math.floor(rgta_elapsedTime - (elapsedMins*60));
	TR_QueueTime( rb2DTris, 0.3, 0.9, 0.02, 0.1, elapsedMins, elapsedSecs );
	
	if( currentBouyIdx > bouyInfos.length-1 ){
		TR_QueueText( rb2DTris, -0.4, 0.9, 0.02, 0.1, "COURSE COMPLETE", false );
	}else{

		let currentBouyInfo = bouyInfos[currentBouyIdx];

		let bouyPosition = currentBouyInfo.bouyQm.origin;
		Vect3_Copy( vecToBouy, bouyPosition);
		Vect3_Add( vecToBouy, boatPosition ); //boat position is negative
		let distToBouy = Vect3_Length( vecToBouy );
		Vect3_Unit( vecToBouy );
		let hdgToBouy = Vec2ToAngle(vecToBouy);
		let boatRelHdgToBouy = MTH_WrapAng0To2PI( hdgToBouy - boatHeading );
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
		TR_QueueText( rb2DTris, -0.4, 0.9, 0.02, 0.05, currentBouyInfo.instrString, false );
		TR_QueueText( rb2DTris, -0.45, 0.7, 0.02, 0.1, "DIST ", false );
		TR_QueueNumber( rb2DTris, -0.25, 0.7, 0.02, 0.1, distToBouy.toPrecision(2) );
		TR_QueueText( rb2DTris, -0.45, 0.6, 0.02, 0.1, "HDG ", false );
		TR_QueueNumber( rb2DTris, -0.25, 0.6, 0.02, 0.1, MTH_WrapAng0To2PI(hdgToBouy).toPrecision(2), 2 );

		if( distToBouy < roundBouyDist ){
			currentBouyIdx += 1;
		}

	}
}

