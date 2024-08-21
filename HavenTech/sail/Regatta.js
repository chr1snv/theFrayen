
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


let bouy_dbB = null;

let windIndc_dbB = null;

let bouy = null;
let wndIndc = null;
function RGTTA_SceneLoaded( hvnsc ){

	console.log( "RGTTA_SceneLoaded" );
	bouy = graphics.cachedObjs[QuadMesh.name][rgtaSceneName]["inflatableBouy"][0];
	bouy_dbB = InitAndAllocOneObjBuffer(bouy);

	wndIndc = graphics.cachedObjs[QuadMesh.name][rgtaSceneName]["windIndc"][0];
	windIndc_dbB = InitAndAllocOneObjBuffer(wndIndc);

}



let currentBouy = 0;
function RGTTA_Update( time ){


}


//expected to be called when triG and 3d cam matrix is already setup
function RGTTA_Draw( time ){

	if( !bouy_dbB )
		return null;
		
	//HVNSC_Draw( rgtaScene );

	TRI_G_drawTriangles( graphics.triGraphics, bouy_dbB, 0 );

}
