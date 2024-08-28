//collection of draw and subDraw Batch buffers with a common 
//"camera" world to screen space projection matrix to render to the screen

//reason for it is to keep as much data buffered in gl between frames 
//(minimize vertex attribute and uniform changes)
//to maximize performance across the cpu / gpu transfer bandwith/latency bottleneck
//and group together verticies to be drawn with common gl state
//to minimize number of gl calls to draw a frame


let triAttrCards   = [vertCard, normCard, bnIdxWghtCard];
let skelAttrCards  = [vertCard, colCard];
let nextSkelBuffId = 0;
function SkelDrawBatchBuffer(numAttrs, attrCards){
	this.bufID = nextSkelBuffId;
	nextSkelBuffId += numAttrs;
	
	this.attrCards = attrCards;
	
	this.buffers = new Array(numAttrs);
	
	this.bufferIdx = 0;
	
	this.bufSubRanges = {};
	
	this.bufferUpdated   = true;
}

function AllocateBatchAttrBuffers(dbB){

	for( let i = 0; i < dbB.attrCards.length; ++i ){
		dbB.buffers[i] = new Float32Array( dbB.bufferIdx*dbB.attrCards[i] );
	}

}

function GetSkelBatchBuffer(rastBatch, shdrName, numAttrs, attrCards){
	let dbB = rastBatch.drawBatchBuffers[shdrName];
	if( dbB == undefined ){
		dbB = new SkelDrawBatchBuffer( numAttrs, attrCards);
		rastBatch.drawBatchBuffers[shdrName] = dbB;
	}
	return dbB;
}






function BufSubRange(startIdxIn, lenIn, objIn, objMatIdxIn){
	//this.lastStartIdx = 0;
	this.obj = objIn;
	this.objMatIdx = objMatIdxIn;
	this.maxLen = 0;
	this.startIdx = startIdxIn;
	this.len      = lenIn;
	this.toWorldMatrix   = Matrix_New();
	this.skelAnim = null;
	this.vertsNotYetUploaded = true;
}
//const MAX_VERTS = 65536;
let nextBufID = TRI_G_VERT_ATTRIB_UID_START;
function DrawBatchBuffer(material){
	this.bufID = nextBufID; //the gl BufferId in TriGraphics
	nextBufID += 4; //increment by 4 because vert, norm, uv buffer, and bnWght buffer are + 1,2,3,4
	this.material        = material;
	//this.vertBuffer      = null;
	//this.normBuffer      = null;
	//this.uvBuffer        = null;
	//this.bnIdxWghtBuffer = null;
	
	this.bufferIdx       = 0;
	this.lastBufferIdx   = 0;
	
	this.lastAllocatedSize = 0; //should be a power of two
	
	this.regenAndUploadEntireBuffer   = true;
	this.vertexAnimated             = false; //for static / dynamic gl attrib buffer usage
	this.hasSkelAnim                = false;
	this.texName                    = null;
	
	this.numSubBufferUpdatesToBeValid = 0;
	
	this.bufSubRanges = {};
	this.sortedSubRngKeys = null;
	this.numBufSubRanges = 0;
	
	
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
	let dbB = rastBatch.drawBatchBuffers[material.uid.val];
	if( dbB == undefined ){
		dbB = new DrawBatchBuffer(material);
		rastBatch.drawBatchBuffers[material.uid.val] = dbB;
	}
	return dbB;
}


//keep the sub batch buffers in place (even if not active (len == 0) until
//the bufferIdx is > or less than a block allocation threshold amount
//(to prevent frequent regeneration of verts,norms,uv's

//reset indicies between frames incase the objects
//within the camera frustum to be drawn are different
function RastB_ResetDrawAndSubBatchBufferIdxs(rastBatch){
	//sub batch buffer
	for( let key in rastBatch.drawBatchBuffers ){
		let dbb = rastBatch.drawBatchBuffers[key];
		dbb.lastBufferIdx = dbb.bufferIdx;
		dbb.numSubBufferUpdatesToBeValid = 0;
		//dbb.bufferUpdated = false; //done in TRI_G_drawTriangles
		//dbb.bufferIdx = 0;

		for( let skey in dbb.bufSubRanges ){
			let subRange = dbb.bufSubRanges[ skey ];
			//subRange.lastStartIdx = subRange.startIdx;
			if( subRange.maxLen < subRange.len )
				subRange.maxLen = subRange.len;
			//subRange.startIdx = 0;
			subRange.len = 0;
		}
	}

}

function CmpSbbObjs(a,b){
	let objA = cmpSbb.bufSubRanges[a].obj;
	let objB = cmpSbb.bufSubRanges[b].obj;
	let distToA = Vect3_Distance( cam.position, objA.AABB.center);
	let distToB = Vect3_Distance( cam.position, objB.AABB.center);
	return distToA-distToB;
}

//each frame sort objects by their distance to the camera,
//if a object stays in the same position for many frames move it's
//actual position in the attribBufferArray
let cmpSbb = null;
/*
function CmpSBBList(a,b){
	let objA = undefined;
	if( a != 0 )
		cmpSbb.bufSubRanges[a].obj;
	let objB = undefined;
	if( b != 0 )
		cmpSbb.bufSubRanges[b].obj;
	
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
let sortedSubRngKeysTemp = new Array(32);
function GenSortedSubBatchBufferList(dbB){
	//sort the sub batches by object distance to camera (front to back)
	
	dbB.sortedSubRngKeys = Object.keys(dbB.bufSubRanges);
	dbB.numBufSubRanges = dbB.sortedSubRngKeys.length;
	cmpSbb = dbB;
	dbB.sortedSubRngKeys.sort( CmpSbbObjs );
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


function SortSubBatches(rastBatch){
	//called each frame between finding all objects to draw in the frame
	//and getting verticies from them if necessary
	for( let key in rastBatch.drawBatchBuffers ){
		let drawBatch = rastBatch.drawBatchBuffers[key];
		
		GenSortedSubBatchBufferList(drawBatch);
		
//		if( drawBatch.vertBuffer == null)
//			AllocateBatchBufferArrays(drawBatch);
//		else{
			//let drawBatchNumVertsAllocated = drawBatch.vertBuffer.length/3;
			if( drawBatch.bufferIdx > drawBatch.lastBufferIdx )
				drawBatch.regenAndUploadEntireBuffer = true;//AllocateBatchBufferArrays(drawBatch);
//		}
	}
	
}

function GetDrawSubBatchBuffer( dbB, subRangeId, numVerts, subRangeQm, qmMatIdx ){
	let subRange = dbB.bufSubRanges[ subRangeId ];


	if( subRange == undefined ){ //obj+material hasn't been drawn
		//create a new sub batch buffer
		subRange = new BufSubRange( dbB.bufferIdx, numVerts, subRangeQm, qmMatIdx );
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
function DefragmentBatchBufferAllocations(rastBatch){
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

function CleanUpDrawBatchBuffers(rastBatch){
	for( dbB in rastBatch.drawBatchBuffers ){
		delete( dbB );
	}
	rastBatch.drawBatchBuffers = {};
	//there aren't any skeletal animation debug draw batch buffers 
	//( they are in draw batch buffers with the key 'line' instead of a material uid )
}
function RastB_PrepareBatchToDraw( rastBatch ){
	//for each material check sub draw batch allocations for each object using it
	for( let key in rastBatch.objs ){
		let objUid = key;
		let obj = rastBatch.objs[objUid]; 
		let qm = obj.quadmesh;
		for( let matID = 0; matID < qm.materials.length; ++matID ){
			let material = qm.materials[matID];
			//get the material buffer and sub buffer for object verts to ensure enough space is allocated
			//in SortSubBatches...(rastBatch)
			if( qm.faceVertsCtForMat[matID] > 0 ){ //ignore materials with no verts assigned
				let drawBatch = GetDrawBatchBufferForMaterial( rastBatch, material );
				let subBatchBuffer = GetDrawSubBatchBuffer( drawBatch, objUid, qm.faceVertsCtForMat[matID], qm, matID );
			}
		}
	}
	
	SortSubBatches(rastBatch); //sorts sub batches by distance from camera and checks if
	//the vertex gl attribute buffers need to be resized (in which case make sure each object is ready to upload to gl)

	
	for( let key in rastBatch.objs ){//for( let i = 0; i < objKeys.length; ++i ){
		let objUid = key;//objKeys[i];
		let obj = rastBatch.objs[objUid];
		let qm = obj.quadmesh;
		
		//for each object in view
		//update the model matrix, and sub buffer verts,norms,uvs,bnWghts if necessary

		//for each material in the object
		for(let matIdx = 0; matIdx < qm.materials.length; ++matIdx ){
			let material = qm.materials[matIdx];
			
			if( qm.faceVertsCtForMat[matIdx] < 1 ) //ignore materials with no verts assigned
				continue;

			let drawBatch = GetDrawBatchBufferForMaterial( rastBatch, material );
			let subBatchBuffer = GetDrawSubBatchBuffer( drawBatch, objUid, qm.faceVertsCtForMat[matIdx], obj );

			if( qm.isAnimated || drawBatch.regenAndUploadEntireBuffer ){
				Matrix_Copy( subBatchBuffer.toWorldMatrix, qm.toWorldMatrix );
			}

			if( qm.materialHasntDrawn[matIdx] || drawBatch.regenAndUploadEntireBuffer ){


				let numGenVerts = QM_SL_GenerateDrawVertsNormsUVsForMat( qm,
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

function RastB_DrawTris( rastBatch ){

	//enable/switch to the triangle glProgram
	TRI_G_Setup(graphics.triGraphics);

	if( rastBatch.ambientColor )
		TRI_G_SetupLights(graphics.triGraphics, rastBatch.lights, rastBatch.numLights, rastBatch.ambientColor);



	TRI_G_setCamMatrix( graphics.triGraphics, rastBatch.worldToScreenSpaceMat, cam.camTranslation );
	for( let key in rastBatch.drawBatchBuffers ){
		
		let dbB = rastBatch.drawBatchBuffers[key];
		//if(dbB.bufferIdx > MAX_VERTS )
		//	dbB.bufferIdx = MAX_VERTS;
		if( dbB.numSubBufferUpdatesToBeValid <= 0 ){

			let numAnimMatricies = 0;
			if( rastBatch.combinedBoneMats )
				numAnimMatricies = rastBatch.combinedBoneMats.length/matrixCard;

			if( dbB.material == undefined )
				console.log("probably skelAnim lines");


			TRI_G_drawTriangles( graphics.triGraphics, dbB, numAnimMatricies );
		}
		//if( dbB.isAnimated )
		//	dbB.bufferIdx = 0; //repeat refilling values
	}

}

function RastB_DrawLines( rastBatch ){

	//if there are armature buffers draw them
	//if( rastBatch.armatureInsertIdx > 0 ){
		graphics.enableDepthTest(false);
		LINE_G_Setup(graphics.lineGraphics);
		LINE_G_setCamMatrix( graphics.lineGraphics, cam.worldToScreenSpaceMat );
		LINE_G_drawLines( graphics.lineGraphics, rastBatch.drawBatchBuffers['line'] );
		graphics.enableDepthTest(true);
	//}

}

function RastB_ClearObjsAndInitListsForNewFrame(rb){
	//clear the list of objects to be rendered in this frame
	rb.objs = {};
	
	//reset the number of verticies to be drawn (to be re-counted for this frame)
	RastB_ResetDrawAndSubBatchBufferIdxs(rb);
}

//initalized in GRPH_initRastBatches after Line and Tri graphics gl programs loaded
var rastBatch2dTris  = new RasterBatch( RastB_DrawTris );
var rastBatch3dTris  = new RasterBatch( RastB_DrawTris );
var rastBatch3dLines = new RasterBatch( RastB_DrawLines );
function RasterBatch( drawFunc ){

	this.DrawFunc = drawFunc;

	this.camWorldToScreenSpaceMat = null;

	this.objs = {};
	
	this.combinedBoneMats = null;

	this.drawBatchBuffers = {};

}
