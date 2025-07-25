//collection of draw and subDraw Batch buffers with a common 
//"camera" world to screen space projection matrix to render to the screen

//reason for it is to keep as much data buffered in gl between frames 
//(minimize vertex attribute and vertex/pixel gl uniform changes)
//to maximize performance across the cpu / gpu transfer bandwith/latency bottleneck
//by grouping together verticies to be drawn with common gl state
//to minimize number of gl calls to draw a frame


let triAttrCards   = [vertCard, normCard, bnIdxWghtCard];
let skelAttrCards  = [vertCard, colCard];
let nextSkelBuffId = 0;
function LineDrawBatchBuffer(numAttrs, attrCards){
	this.bufID = nextSkelBuffId;
	nextSkelBuffId += numAttrs;

	this.attrCards = attrCards;

	this.buffers = new Array(numAttrs);

	this.bufferIdx = 0;

	this.bufSubRanges = {};

	this.vertsNotYetUploaded   = true;
}

function AllocateLineBatchAttrBuffers(dbB){

	for( let i = 0; i < dbB.attrCards.length; ++i ){
		dbB.buffers[i] = new Float32Array( dbB.bufferIdx*dbB.attrCards[i] );
	}

}

function GetLineBatchBuffer(rastBatch, shdrName, numAttrs, attrCards){
	let dbB = rastBatch.drawBatchBuffers[shdrName];
	if( dbB == undefined ){
		dbB = new LineDrawBatchBuffer( numAttrs, attrCards);
		rastBatch.drawBatchBuffers[shdrName] = dbB;
	}
	return dbB;
}






function BufSubRange(startIdxIn, lenIn, mdlIn, mdlMatIdxIn){
	//this.lastStartIdx = 0;
	this.mdl                 = mdlIn;
	this.mdlMatIdx           = mdlMatIdxIn;
	this.maxLen              = 0; //over multiple frames the most number of vertices
	this.startIdx            = startIdxIn;
	this.len                 = lenIn;
	this.lastTimeDrawn       = 0;
	this.toWorldMatrix       = Matrix_New();
	this.skelAnim            = null;
	this.vertsNotYetUploaded = true;
	this.overrideColor       = null;
	this.nonHighlightedColor = null;
}
//const MAX_VERTS = 65536;
let nextBufID = TRI_G_VERT_ATTRIB_UID_START;
function DrawBatchBuffer(material){
	this.bufID         = nextBufID; //+0,+1 etc for the GlProgram attribInstID, BufferId in TriGraphics
	nextBufID    += 4; //increment by 4 because vert, norm, uv buffer, and bnWght buffer are + 1,2,3,4
	this.material      = material;


	this.bufferIdx       = 0;
	this.lastBufferIdx   = 0; //for checking if has been reallocated and entire buffer length needs to be re uploaded to gl

	this.lastAllocatedSize = 0; //should be a power of two

	this.regenAndUploadEntireBuffer   = true;
	this.vertexAnimated             = false; //for static / dynamic gl attrib buffer usage
	this.hasSkelAnim                = false;
	this.texName                    = null;

	this.numSubBufferUpdatesToBeValid = 0;

	this.bufSubRanges = {}; //for only updating part of buffer on changes
	this.sortedSubRngKeys = null;
	this.numBufSubRanges = 0;


}

function AllocDrawBufID(){
	let ret = nextBufID;
	nextBufID += 1;
	return ret;
}

/*
function AllocateBatchBufferArrays(dbB){
	if( dbB.vertBuffer != null ){
		//deallocate previous gl uploaded buffer
		graphics.triGraphics.glProgram.cleanupVertexAttribBuff(dbB.bufID);
		graphics.triGraphics.glProgram.cleanupVertexAttribBuff(dbB.bufID+1);
		graphics.triGraphics.glProgram.cleanupVertexAttribBuff(dbB.bufID+2);
		graphics.triGraphics.glProgram.cleanupVertexAttribBuff(dbB.bufID+3);
	}
	dbB.vertBuffer      = new Float32Array( dbB.bufferIdx*vertCard      );
	dbB.normBuffer      = new Float32Array( dbB.bufferIdx*normCard      );
	dbB.uvBuffer        = new Float32Array( dbB.bufferIdx*uvCard        );
	
	dbB.bnIdxWghtBuffer = new Float32Array( dbB.bufferIdx*bnIdxWghtCard );
	
	dbB.bufferUpdated   = true;
	//dbB.bufferIdx = 0;
}
*/

function GetDrawBatchBufferForMaterial(rastBatch, material){
	let dbB = null;
	if( material.alpha < 1.0 || material.diffuseTextureAlpha )
		dbB = rastBatch.alphaDrawBatchBuffers[material.uid.val];
	else
		dbB = rastBatch.drawBatchBuffers[material.uid.val];

	if( dbB == undefined ){
		dbB = new DrawBatchBuffer(material);
		if( material.alpha < 1.0 || material.diffuseTextureAlpha)
			rastBatch.alphaDrawBatchBuffers[material.uid.val] = dbB;
		else
			rastBatch.drawBatchBuffers[material.uid.val] = dbB;
	}
	return dbB;
}


//keep the sub batch buffers in place (even if not active (len == 0) until
//the bufferIdx is > or less than a block allocation threshold amount
//(to prevent frequent regeneration of verts,norms,uv's)

function RastB_ResetDBB( dbB ){
	dbB.lastBufferIdx = dbB.bufferIdx;
	dbB.numSubBufferUpdatesToBeValid = 0;
	//dbb.bufferUpdated = false; //done in TRI_G_drawTriangles
	//dbb.bufferIdx = 0;

	for( let skey in dbB.bufSubRanges ){
		let subRange = dbB.bufSubRanges[ skey ];
		//subRange.lastStartIdx = subRange.startIdx;
		if( subRange.maxLen < subRange.len )
			subRange.maxLen = subRange.len;
		//subRange.startIdx = 0;
		subRange.len = 0;
	}
}

//reset indicies between frames incase the models
//within the camera frustum to be drawn are different
function RastB_ResetDrawAndSubBatchBufferIdxs(rastBatch){

	for( let key in rastBatch.drawBatchBuffers ){
		let dbB = rastBatch.drawBatchBuffers[key];
		RastB_ResetDBB( dbB );
	}
	
	for( let key in rastBatch.alphaDrawBatchBuffers ){
		let dbB = rastBatch.alphaDrawBatchBuffers[key];
		RastB_ResetDBB( dbB );
	}

}

//sort models back to front (for alpha materials)
function CmpSbbMdlsBtoF(a,b){
	let objA = cmpSbb.bufSubRanges[a].mdl;
	let objB = cmpSbb.bufSubRanges[b].mdl;
	let distToA = Vect3_Distance( cmpCamOri, objA.AABB.center);
	let distToB = Vect3_Distance( cmpCamOri, objB.AABB.center);
	return distToB-distToA;
}

//sort models front to back
function CmpSbbMdlsFtoB(a,b){
	let objA = cmpSbb.bufSubRanges[a].mdl;
	let objB = cmpSbb.bufSubRanges[b].mdl;
	let distToA = Vect3_Distance( cmpCamOri, objA.AABB.center);
	let distToB = Vect3_Distance( cmpCamOri, objB.AABB.center);
	return distToA-distToB;
}

//each frame sort models by their distance to the camera,
//if a object stays in the same position for many frames move it's
//actual position in the attribBufferArray
let cmpCamOri = null;
let cmpSbb = null;
/*
function CmpSBBList(a,b){
	let objA = undefined;
	if( a != 0 )
		cmpSbb.bufSubRanges[a].mdl;
	let objB = undefined;
	if( b != 0 )
		cmpSbb.bufSubRanges[b].mdl;
	
	if( objA == undefined ){
		if( objB != undefined )
			return false;
		else
			return true;
	}else if( objB == undefined ){
		if( objA != undefined )
			return true;
		else
			return false;
	}
	//else compare the two
	let distToA = Vect3_Distance( cam.position, objA.AABB.center);
	let distToB = Vect3_Distance( cam.position, objB.AABB.center);
	return distToA<=distToB;
}
*/
//let sortedSubRngKeysTemp = new Array(32);
function GenSortedSubBatchBufferList(dbB, camPos, cmpFunc){
	//sort the sub batches by object distance to camera (front to back)

	dbB.sortedSubRngKeys = Object.keys(dbB.bufSubRanges);

	dbB.numBufSubRanges = dbB.sortedSubRngKeys.length;
	cmpSbb = dbB;
	cmpCamOri = camPos;
	dbB.sortedSubRngKeys.sort( cmpFunc );
	
	
	
	/*
	let nextPotSz = Math.pow(2,Math.ceil(Math.log2(dbB.sortedSubRngKeys.length)));
	while( dbB.sortedSubRngKeys.length < nextPotSz )
		dbB.sortedSubRngKeys.push(0);
	if( sortedSubRngKeysTemp.length < nextPotSz );
		sortedSubRngKeysTemp = new Array( nextPotSz );
	
	if( MergeSort( dbB.sortedSubRngKeys, sortedSubRngKeysTemp, CmpSBBList ) ){ 
		//ret true means the sorted output is in ..keysTemp, 
		//therefore swap keys and keysTemp
		let tmp = dbB.sortedSubRngKeys;
		dbB.sortedSubRngKeys = sortedSubRngKeysTemp;
		sortedSubRngKeysTemp = tmp;
	}
	*/
}


function SortSubBatches(dbBs, camPos, cmpFunc ){
	//called each frame between finding all models to draw in the frame
	//and getting verticies from them if necessary
	for( let key in dbBs ){
		let drawBatch = dbBs[key];
		if( drawBatch.bufferIdx  <= 0 )
			continue;

		GenSortedSubBatchBufferList( drawBatch, camPos, cmpFunc );

//		if( drawBatch.vertBuffer == null)
//			AllocateBatchBufferArrays(drawBatch);
//		else{
			//let drawBatchNumVertsAllocated = drawBatch.vertBuffer.length/3;
			if( drawBatch.bufferIdx > drawBatch.lastBufferIdx )
				drawBatch.regenAndUploadEntireBuffer = true;//AllocateBatchBufferArrays(drawBatch);
//		}
	}

}

function GetDrawSubBatchBuffer( dbB, subRangeId, numVerts, subRangeMdl, mdlMatIdx ){
	let subRange = dbB.bufSubRanges[ subRangeId ];


	if( subRange == undefined ){ //obj+material hasn't been drawn
		//create a new sub batch buffer
		subRange = new BufSubRange( dbB.bufferIdx, numVerts, subRangeMdl, mdlMatIdx );
		dbB.bufSubRanges[ subRangeId ] = subRange;
		dbB.bufferIdx += numVerts;
		dbB.numSubBufferUpdatesToBeValid += 1;
	}else if( subRange.len == 0 ){
		//this object was in previous frames
		//though this subrange has been reset (in check for allocation phase) for this frame
		//subRange.startIdx = dbB.bufferIdx;
		if( numVerts > subRange.maxLen ){//this would happen if the level of detail changed for an object
			//the sub batch buffer needs to be bigger
			//for now, move it to the end of the array
			//when 
			//subRange.lastStartIdx != subRange.startIdx ){
			console.log("resizing sub batch buffer");
			subRange.startIdx = dbB.bufferIdx;
			subRange.len = numVerts;
			dbB.bufferIdx += numVerts;
			//dbB.bufferUpdated = true;
			dbB.numSubBufferUpdatesToBeValid += 1;
		}else{
			subRange.len = numVerts;
			//dbB.bufferIdx += numVerts;
		}
	}

	return subRange;
}

//as sub batch buffers may
function RASTB_DefragBufferAllocs(rastBatch){
/*
	let dbbKeys = Object.keys(rastBatch.drawBatchBuffers);
	for( let i = 0; i < dbbKeys.length; ++i ){
		let dbb = rastBatch.drawBatchBuffers[dbbKeys[i]];
		dbb.lastBufferIdx = dbb.bufferIdx;
		dbb.numSubBufferUpdatesToBeValid = 0;
		//dbb.bufferUpdated = false; //done in TRI_G_drawTriangles
		//dbb.bufferIdx = 0;
		
		let sbbKeys = Object.keys( dbb.bufSubRanges );
		for( let j = 0; j < sbbKeys.length; ++j ){
			let subRange = dbb.bufSubRanges[ sbbKeys[j] ];
			//subRange.lastStartIdx = subRange.startIdx;
			if( subRange.maxLen < subRange.len )
				subRange.maxLen = subRange.len;
			//subRange.startIdx = 0;
			subRange.len = 0;
		}
	}
	*/
}

function CleanUpRasterBatches(){
	for( let i = 0; i < rastBatch3dTris_array.length; ++i ){
		CleanUpDrawBatchBuffer(rastBatch3dTris_array[i]);
	}
	for( let i = 0; i < rastBatch3dLines_array.length; ++i ){
		CleanUpDrawBatchBuffer(rastBatch3dLines_array[i]);
	}
	CleanUpDrawBatchBuffer( rastBatch2dTris );
}

function CleanUpDrawBatchBuffer(rastBatch){
	for( dbB in rastBatch.drawBatchBuffers ){
		delete( dbB );
	}
	rastBatch.drawBatchBuffers = {};
}


function RastB_PrepareBatchToDraw( rastBatch ){
	//for models (tri text handles this update process itself by directly enabling sub batch buffers)
	//for each material check sub draw batch allocations for each model using it
	let mdlKeys = Object.keys(rastBatch.mdls);
	for( let i = 0; i < mdlKeys.length; ++i ){
		let mdlUid = mdlKeys[i];
		let mdl = rastBatch.mdls[mdlUid];
		let qm = mdl.quadmesh;
		for( let matID = 0; matID < mdl.materials.length; ++matID ){
			let material = mdl.materials[matID];
			//get the material buffer and sub buffer for model verts to ensure enough space is allocated
			//in SortSubBatches...(rastBatch)
			if( qm.faceVertsCtForMat[matID] > 0 ){ //ignore materials with no verts assigned
				if( mdl.optMaterial )
					material = mdl.optMaterial;
				let drawBatch = GetDrawBatchBufferForMaterial( rastBatch, material );
				let subBatchBuffer = GetDrawSubBatchBuffer( drawBatch, mdlUid, qm.faceVertsCtForMat[matID], mdl, matID );
				if( mdl.optTransformUpdated )
					Matrix_Copy( subBatchBuffer.toWorldMatrix, mdl.optTransMat );
			}
		}
	}

	//if( mdlKeys.length > 0 ){
		SortSubBatches(rastBatch.drawBatchBuffers, rastBatch.camWorldPos, CmpSbbMdlsFtoB );
		SortSubBatches(rastBatch.alphaDrawBatchBuffers, rastBatch.camWorldPos, CmpSbbMdlsBtoF );
		//sorts sub batches by distance from camera and checks if
		//the vertex gl attribute buffers need to be resized (in which case make sure each model is ready to upload to gl)
	//}


	for( let i = 0; i < mdlKeys.length; ++i ){
		let mdlUid = mdlKeys[i];
		let mdl = rastBatch.mdls[mdlUid];
		let qm = mdl.quadmesh;
		
		//for each model in view
		//update the model matrix, and sub buffer verts,norms,uvs,bnWghts if necessary

		//for each material in the model
		for(let matIdx = 0; matIdx < mdl.materials.length; ++matIdx ){
			let material = mdl.materials[matIdx];

			if( qm.faceVertsCtForMat[matIdx] < 1 ) //ignore materials with no verts assigned
				continue;

			if( mdl.optMaterial )
					material = mdl.optMaterial;

			let drawBatch = GetDrawBatchBufferForMaterial( rastBatch, material );
			let subBatchBuffer = GetDrawSubBatchBuffer( drawBatch, mdlUid, qm.faceVertsCtForMat[matIdx], mdl );

			if( !mdl.optTransformUpdated && mdl.isAnimated || drawBatch.regenAndUploadEntireBuffer ){
				Matrix_Copy( subBatchBuffer.toWorldMatrix, mdl.toWorldMatrix );
			}

			if( mdl.materialHasntDrawn[matIdx] || drawBatch.regenAndUploadEntireBuffer ){

				let numGenVerts = QM_SL_GenerateDrawVertsNormsUVsForMat( mdl,
						drawBatch, matIdx, 
						subBatchBuffer ); //, cam.worldToScreenSpaceMat ); // - subBatchBuffer.startIdx;
				if( numGenVerts != subBatchBuffer.len )
					DPrintf( "error numGenVerts " + numGenVerts + " subBatchBuffer.len " + subBatchBuffer.len );

				if( subBatchBuffer.skelAnim != null )
					drawBatch.hasSkelAnim = true;

			}

		}
	}
}

//helper function for transparent or opaque triangle drawing
function RastB_DrawBatchTris( dbB, numAnimMatricies, time ){
	if( dbB.bufferIdx <= 0 )
		return;
		
	//if(dbB.bufferIdx > MAX_VERTS )
	//	dbB.bufferIdx = MAX_VERTS;
	if( dbB.numSubBufferUpdatesToBeValid <= 0 ){

		if( dbB.material == undefined )
			console.log("probably skelAnim lines");

		TRI_G_drawTriangles( graphics.triGraphics, dbB, numAnimMatricies, time );
	}
	//if( dbB.isAnimated )
	//	dbB.bufferIdx = 0; //repeat refilling values
}


//different functions to setup/feed raster batch data to triangle or line drawing gl programs

function RastB_DrawTris( rastBatch, time, drawTransparentBatches=false ){

	if( rastBatch.ambientColor )
		TRI_G_SetupLights(graphics.triGraphics, rastBatch );

	if( rastBatch.boneMatTexture != null )
		SkelA_EnableBoneMatTexture(rastBatch.boneMatTexture);

	let numAnimMatricies = 0;
	if( rastBatch.combinedBoneMats )
		numAnimMatricies = rastBatch.combinedBoneMats.length/matrixCard;


	if( rastBatch.clearDepthBeforeDrawing && !drawTransparentBatches )
		graphics.ClearDepth();


	TRI_G_setCamMatrix( graphics.triGraphics, rastBatch.worldToScreenSpaceMat, rastBatch.camWorldPos );


	if( !drawTransparentBatches ){ //draw opaque

		GRPH_EnableAlphaBlending(false);
		for( let key in rastBatch.drawBatchBuffers ){
			//if( key == "100069" )
			//	console.log("text draw batch");
			let dbB = rastBatch.drawBatchBuffers[key];
			RastB_DrawBatchTris( dbB, numAnimMatricies, time );
		}

	}else{

		GRPH_EnableAlphaBlending(true);
		graphics.enableDepthMask(false);
		for( let key in rastBatch.alphaDrawBatchBuffers ){
			let dbB = rastBatch.alphaDrawBatchBuffers[key];
			RastB_DrawBatchTris( dbB, numAnimMatricies, time );
		}
		graphics.enableDepthMask(true);

	}

}

function RastB_DrawLines( rastBatch ){

	//if there are armature buffers draw them
	//if( rastBatch.armatureInsertIdx > 0 ){
		graphics.enableDepthTest(false);
		LINE_G_Setup(graphics.lineGraphics);
		LINE_G_setCamMatrix( graphics.lineGraphics, rastBatch.worldToScreenSpaceMat );
		LINE_G_drawLines( graphics.lineGraphics, rastBatch.drawBatchBuffers['line'] );
		graphics.enableDepthTest(true);
	//}

}

function RastB_ClearMdlsAndInitListsForNewFrame(rb){
	//clear the list of models to be rendered in this frame
	rb.mdls = {};
	this.armatureDict = {};
	this.armatures = [];
	//reset the number of verticies to be drawn (to be re-counted for this frame)
	RastB_ResetDrawAndSubBatchBufferIdxs(rb);
	rb.activeForFrame = false;
}

//worldToScreenSpaceMat initalized in GRPH_initRastBatches after Line and Tri graphics gl programs loaded
var rastBatch2dTris  = new RasterBatch( RastB_DrawTris );

//one draw batch per camera i.e. mainScene and regattaScene for sailing game
var rastBatch3dTris_array = new Array(2);
rastBatch3dTris_array[0] = new RasterBatch( RastB_DrawTris );
rastBatch3dTris_array[1] = new RasterBatch( RastB_DrawTris );
var rastBatch3dLines_array = new Array(2);
rastBatch3dLines_array[0] = new RasterBatch( RastB_DrawLines );
rastBatch3dLines_array[1] = new RasterBatch( RastB_DrawLines );

function RasterBatch( drawFunc, clearDepth=false ){

	this.activeForFrame = false;
	this.clearDepthBeforeDrawing = clearDepth;

	this.DrawFunc = drawFunc;

	this.worldToScreenSpaceMat = Matrix_New();
	this.screenSpaceToWorldMat = Matrix_New();
	this.camWorldPos = Vect_New(3);
	this.camFov = 90 / 180 * Math.PI;

	this.mdls = {};

	this.ambientColor = Vect3_NewVals(0.05, 0.05, 0.1);
	this.numLights = 0;
	this.lights = null;


	this.boneMatTexture = null;
	this.armatureDict = {};
	this.armatures = [];
	this.combinedBoneMats = null;

	//per material collections of models/(primatives) to draw
	this.drawBatchBuffers      = {}; 
	this.alphaDrawBatchBuffers = {};

}
