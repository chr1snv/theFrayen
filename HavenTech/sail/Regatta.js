
//maintains the status of the sailing competition

let rgtaScene = null;
function RGTTA_Init(){

	rgtaScene = new HavenScene( "islandRegatta", RGTTA_SceneLoaded );

}


let bouy_dbB = null;

let bouy = null;
function RGTTA_SceneLoaded( hvnsc ){

	console.log( "RGTTA_SceneLoaded" );
	bouy = graphics.cachedObjs[QuadMesh.name]["islandRegatta"]["inflatableBouy"][0];

	let bouyMaterial = bouy.materials[0];

	bouy_dbB = new DrawBatchBuffer( bouyMaterial );


	let numVerts = bouy.vertBufferForMat[0].length;
	
	QM_SL_GenerateDrawVertsNormsUVsForMat( bouy, null, 0, null );

	RGTTA_AllocSubRngBuffer( numVerts, 0, bouy );
	
	//enable the sub batch buffer to draw this frame
	if( bouy_dbB.sortedSubRngKeys == null )
		bouy_dbB.sortedSubRngKeys = [];
	bouy_dbB.sortedSubRngKeys.push(  0 );
	bouy_dbB.numBufSubRanges += 1;

}


function RGTTA_AllocSubRngBuffer(numVerts, subBufId, obj){

	//BufSubRange(startIdxIn, lenIn, objIn, objMatIdxIn)
	let bouy_sbb = new BufSubRange( bouy_dbB.bufferIdx, numVerts, obj, 0 );
	Matrix_SetIdentity( bouy_sbb.toWorldMatrix );
	bouy_dbB.bufSubRanges[subBufId] = bouy_sbb;
	
	bouy_dbB.bufferIdx += numVerts;
	
	let subRngKeys = Object.keys( bouy_dbB.bufSubRanges );
	for(let i = 0; i < subRngKeys.length; ++i ){
		bouy_dbB.bufSubRanges[subRngKeys[i]].vertsNotYetUploaded = true;
	}
	//txtR_dbB.regenAndUploadEntireBuffer = true;
	
	return obj;
}


let currentBouy = 0;
function RGTTA_Update( time ){



}



function RGTTA_Draw( time ){

	if( !bouy_dbB )
		return null;

	let triG = graphics.triGraphics;

	TRI_G_Setup(triG);
	
	TRI_G_setCamMatrix( graphics.triGraphics, cam.worldToScreenSpaceMat, cam.camTranslation );

	//GLP_setIntUniform( triG.glProgram, 'lightingEnabled', 0 );
	//GLP_setFloatUniform( triG.glProgram, 'texturingEnabled', 0 );
	//GLP_setIntUniform( triG.glProgram, 'skelSkinningEnb', 0 );

	TRI_G_drawTriangles( triG, bouy_dbB.texName,
		bouy_dbB.material.sceneName, bouy_dbB, 0 );

}
