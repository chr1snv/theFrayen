//HavenScene.js
//to request use or code/art please contact chris@itemfactorystudio.com

//haven scenes are collections of models, lights, cameras, etc
//that make up an enviroment (area) in a haven tech game
//they may be layered as with a menu or ui placed on top of a scene

//haven scene handles 

//loading (saving to be added) from a text file

//updating per frame the objects in the oct tree

//drawing by

//gathering objects to draw from the oct tree camera frustrum intersection

//grouping geometry to draw by 
//	shader
//		material
//			transformation matrix
//				object (level of detail may change based on distance)
//					vert transform matrix (maybe a vertex shader with vert weights and bind/pose matricies would be faster than cpu skel anim transforms)

let skelAttrCards = [vertCard, colCard];
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


function GetSkelBatchBuffer(shdrName, numAttrs, attrCards){
	let dbB = drawBatchBuffers[shdrName];
	if( dbB == undefined ){
		dbB = new SkelDrawBatchBuffer( numAttrs, attrCards);
		drawBatchBuffers[shdrName] = dbB;
	}
	return dbB;
}



function BufSubRange(startIdxIn, lenIn){
	this.lastStartIdx = 0;
	this.lastLen = 0;
	this.startIdx = startIdxIn;
	this.len      = lenIn;
	this.toWorldMatrix   = Matrix_New();
	this.skelAnim = null;
}

//const MAX_VERTS = 65536;
let nextBufID = TRI_G_VERT_ATTRIB_UID_START;
function DrawBatchBuffer(material){
	this.bufID = nextBufID; //the gl BufferId in TriGraphics
	nextBufID += 4; //increment by 4 because vert, norm, uv buffer, and bnWght buffer are + 1,2,3,4
	this.material        = material;
	this.vertBuffer      = null;
	this.normBuffer      = null;
	this.uvBuffer        = null;
	this.bnIdxWghtBuffer = null;
	
	this.bufferIdx       = 0;
	this.lastBufferIdx   = 0;
	
	this.bufferUpdated   = true;
	this.isAnimated      = false;
	this.hasSkelAnim     = false;
	this.texName         = null;
	
	this.numSubBufferUpdatesToBeValid = 0;
	
	this.bufSubRanges = {};
	
	this.diffuseCol = Vect_New(4);
}

function AllocateBatchBufferArrays(dbB){
	if( dbB.vertBuffer != null ){
		//deallocate previous
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

let drawBatchBuffers = {};

function GetDrawBatchBufferForMaterial(material){
	let dbB = drawBatchBuffers[material.uid.val];
	if( dbB == undefined ){
		dbB = new DrawBatchBuffer(material);
		drawBatchBuffers[material.uid.val] = dbB;
	}
	return dbB;
}


//reset indicies between frames incase the objects
//within the camera frustum to be drawn are different
function ResetDrawAndSubBatchBufferIdxs(){
	//sub batch buffer
	let dbbKeys = Object.keys(drawBatchBuffers);
	for( let i = 0; i < dbbKeys.length; ++i ){
		let dbb = drawBatchBuffers[dbbKeys[i]];
		dbb.lastBufferIdx = dbb.bufferIdx;
		dbb.numSubBufferUpdatesToBeValid = 0;
		//dbb.bufferUpdated = false; //done in TRI_G_drawTriangles
		dbb.bufferIdx = 0;
		
		let sbbKeys = Object.keys( dbb.bufSubRanges );
		for( let j = 0; j < sbbKeys.length; ++j ){
			let subRange = dbb.bufSubRanges[ sbbKeys[j] ];
			subRange.lastStartIdx = subRange.startIdx;
			subRange.lastLen = subRange.len;
			subRange.startIdx = 0;
			subRange.len = 0;
		}
	}

}

function ReallocateDrawBatchBuffersIfNecessary(){
	let dbbKeys = Object.keys(drawBatchBuffers);
	for( let i = 0; i < dbbKeys.length; ++i ){
		let drawBatch = drawBatchBuffers[dbbKeys[i]];

		if( drawBatch.vertBuffer == null)
			AllocateBatchBufferArrays(drawBatch);
		else{
			let drawBatchNumVertsAllocated = drawBatch.vertBuffer.length/3;
			if( drawBatchNumVertsAllocated < drawBatch.bufferIdx )
				AllocateBatchBufferArrays(drawBatch);
		}
	}
	
}

function GetDrawSubBatchBuffer(dbB, subRangeId, numVerts){
	let subRange = dbB.bufSubRanges[ subRangeId ];


	if( subRange == undefined ){ //obj+material hasn't been drawn
		subRange = new BufSubRange(dbB.bufferIdx, numVerts);
		dbB.bufSubRanges[ subRangeId ] = subRange;
		dbB.bufferIdx += numVerts;
		dbB.numSubBufferUpdatesToBeValid += 1;
	}else if( subRange.len == 0 ){
		//this object was in previous frames
		//though this subrange has been reset (in check for allocation phase) for this frame
		subRange.startIdx = dbB.bufferIdx;
		subRange.len = numVerts;
		dbB.bufferIdx += numVerts;
		if( subRange.len != subRange.lastLen ||
			subRange.lastStartIdx != subRange.startIdx ){
			dbB.bufferUpdated = true;
			dbB.numSubBufferUpdatesToBeValid += 1;
		}
	}

	return subRange;
}

function CleanUpDrawBatchBuffers(){
	for( dbB in drawBatchBuffers ){
		delete( dbB );
	}
	drawBatchBuffers = {};
	//there aren't any skeletal animation debug draw batch buffers 
	//( they are in draw batch buffers with the key 'line' instead of a material uid )
}


function HavenScene( sceneNameIn, sceneLoadedCallback ){

	this.sceneLoadedCallback = sceneLoadedCallback;

	this.sceneName = sceneNameIn;
	this.isValid = false;

	this.ambientColor = Vect3_NewVals(0.05, 0.05, 0.1); 

	//will likely be removed since stored in oct tree and a per scene
	//array of objects may become very big
	this.models    = {};
	this.lights    = new Array(8);
	this.numLights = 0;
	this.cameras   = [];
	this.armatures = [];

	this.pendingObjsToLoad = {};

	this.boneMatTexture = null;

	this.activeCamera = "";
	this.activeCameraIdx = -1;

	//the main structure for holding scene elements
	const tDim = 100;
	this.octTree = null;

	//using the camera frustum only objects within view 
	//can be drawn / simulated in high fidelity

	this.framesSec = 25.0;

	//gl graphics card memory managment (geometry array generation and reuse) 
	//for rasterizing scene objects
	//this.renderBufferManager = new RenderBufferManager( this.sceneName );
	//now unused because drawing is raytraced 
	//(maybe will come back / be replaced by spectral image for denoising)


	//constructor functionality begin asynchronous fetch of scene description
	this.pendingObjsAdded = 0;
	loadTextFile("scenes/"+this.sceneName+".hvtScene",
				HVNSC_textFileLoadedCallback, this);

}

function CheckIsValidFor( hvnsc, operationName ){

	if(!hvnsc.isValid){
		DTPrintf(hvnsc.sceneName + ' was asked to ' + operationName + ' but is not valid', "havenScene: ", 'orange');
		return false;
	}
	if(hvnsc.activeCameraIdx == -1){
		DTPrintf( hvnsc.sceneName + ' was asked to ' + operationName + ' but has no active camera', 
			'havenScene: ', 'orange');
		return false;
	}
	return true;
}

//updates the entire scene
//only parts of the oct tree that are active should be updated
//(animated objects within the field of view, or area's with 
//dynamic events occuring) to minimize compute / power required
//because parts of the scene may be on seperate nodes/comp should be parallelized
let frus_temp3 = Vect_New(3);
let frus_temp3Remap = Vect_New(3);

let cam = null;
let nodeMap = new Map();
let objMap = new Map();
function HVNSC_Update( hvnsc, time ){

	if(!CheckIsValidFor( hvnsc, 'Update' ) )
		return;

	//generate the camera matrix
	cam = hvnsc.cameras[ hvnsc.activeCameraIdx ];
	cam.GenWorldToFromScreenSpaceMats();

	//Matrix_Print( cam.worldToScreenSpaceMat, "cam.worldToScreenSpaceMat" );
	
//	let frusUpFwdLeft = [Vect3_New(), Vect3_New(), Vect3_New()];
//	let frusCenter = Vect3_New();
//	Matrix_Multiply_Vect3( frusCenter, cam.screenSpaceToWorldMat, [0,0,0] );
//	Matrix_Multiply_Vect3( frusUpFwdLeft[0], cam.screenSpaceToWorldMat, [0,1,0] );
//	Vect3_Subtract( frusUpFwdLeft[0], frusCenter );
//	Vect3_Normal( frusUpFwdLeft[0] );
//	Matrix_Multiply_Vect3( frusUpFwdLeft[1], cam.screenSpaceToWorldMat, [0,0,1] );
//	Vect3_Subtract( frusUpFwdLeft[1], frusCenter );
//	Vect3_Normal( frusUpFwdLeft[1] );
//	Matrix_Multiply_Vect3( frusUpFwdLeft[2], cam.screenSpaceToWorldMat, [1,0,0] );
//	Vect3_Subtract( frusUpFwdLeft[2], frusCenter );
//	Vect3_Normal( frusUpFwdLeft[2] );
//	
//	DTPrintf( "frusWorldCenter " + Vect_ToFixedPrecisionString(frusCenter, 5), "hvnsc debug" );
//	DTPrintf( "frusWorldUp "     + Vect_ToFixedPrecisionString(frusUpFwdLeft[0], 5), "hvnsc debug" );
//	DTPrintf( "frusWorldFwd "    + Vect_ToFixedPrecisionString(frusUpFwdLeft[1], 5), "hvnsc debug" );
//	DTPrintf( "frusWorldLeft "   + Vect_ToFixedPrecisionString(frusUpFwdLeft[2], 5), "hvnsc debug" );
//	
//	DTPrintf( "cam.nearClip " + cam.nearClip, "hvnsc debug" );
//	DTPrintf( "cam.farClip "  + cam.farClip, "hvnsc debug" );
//	
//	DTPrintf( "cam.position " + Vect_ToFixedPrecisionString(cam.position, 5), "hvnsc debug" );
//	Matrix_Multiply_Vect3( frus_testCoord, cam.screenSpaceToWorldMat, [0,0,-1] );
//	DTPrintf( "cam near coord wrld " + Vect_ToFixedPrecisionString(frus_testCoord, 5), "hvnsc debug" );
//	frus_testCoord[3] = 1;
//	Matrix_Multiply_Vect( frus_tempCoord, cam.worldToScreenSpaceMat, frus_testCoord );
//	DTPrintf( "nearCoord in clipSpc " + Vect_ToFixedPrecisionString(frus_tempCoord, 5), "hvnsc debug" );
//	
//	Matrix_Multiply_Vect3( frus_testCoord, cam.screenSpaceToWorldMat, [0,0,1] );
//	DTPrintf( "cam far coord " + Vect_ToFixedPrecisionString(frus_testCoord, 5), "hvnsc debug" );
//	//Vect3_Add( frus_testCoord, cam.position );
//	frus_testCoord[3] = 1;
//	Matrix_Multiply_Vect( frus_tempCoord, cam.worldToScreenSpaceMat, frus_testCoord );
//	DTPrintf( "farCoord in clipSpc " + Vect_ToFixedPrecisionString(frus_tempCoord, 5), "hvnsc debug" );
//	
//	Matrix_Multiply_Vect3( frus_testCoord, cam.screenSpaceToWorldMat, [0,1,-3] );
//	DTPrintf( "cam neg far coord wrld " + Vect_ToFixedPrecisionString(frus_testCoord, 5), "hvnsc debug" );
//	//Vect3_Add( frus_testCoord, cam.position );
//	frus_testCoord[3] = 1;
//	Matrix_Multiply_Vect( frus_tempCoord, cam.worldToScreenSpaceMat, frus_testCoord );
//	DTPrintf( "cam neg far coord clipSpc " + Vect_ToFixedPrecisionString(frus_tempCoord, 5), "hvnsc debug" );

//	AABB_Gen8Corners(hvnsc.octTree.AABB);

//	Vect_SetScalar(frus_aabbMin, Number.POSITIVE_INFINITY);
//	Vect_SetScalar(frus_aabbMax, Number.NEGATIVE_INFINITY);

//	for( let i = 0; i < 8; ++i ){
//		DTPrintf( "node corner " + i + " " + Vect_ToFixedPrecisionString(AABB_8Corners[i], 5), "hvnsc debug" );
//		Vect3_Copy( frus_temp3, AABB_8Corners[i] );
//		Vect3_Subtract( frus_temp3, frusCenter );
//		Vect_DotProdCoordRemap( frus_temp3Remap, frus_temp3, frusUpFwdLeft );
//		DTPrintf( "corner in frusWorldSpaceUpFwdLeft coords " +  Vect_ToFixedPrecisionString(frus_temp3Remap, 5), "hvnsc debug" );
//		Matrix_Multiply_Vect( frus_tempCoord, cam.worldToScreenSpaceMat, AABB_8Corners[i] );
//		Vect_minMax( frus_aabbMin, frus_aabbMax, frus_tempCoord );
//		DTPrintf( "corner in clipSpace " + i + " " + Vect_ToFixedPrecisionString(frus_tempCoord, 5), "hvnsc debug" );
//		if( frus_tempCoord[2] < 0 )
//			frus_tempCoord[2] = -frus_tempCoord[2];
//		WDivide( frus_temp3, frus_tempCoord );
//		DTPrintf("corner in ndcSpace " + Vect_ToFixedPrecisionString( frus_temp3, 5), "hvnsc debug" );
//		
//		DTPrintf( " ", "hvnsc debug");
//	}
//	
//	DTPrintf( "node minCoord clipSpace  " + Vect_ToFixedPrecisionString(frus_aabbMin, 5), "hvnsc debug" );
//	DTPrintf( "node maxCoord clipSpace  " + Vect_ToFixedPrecisionString(frus_aabbMax, 5), "hvnsc debug" );

	//get the nodes within view
	//only call update on in view nodes and nodes/objects that need to be actively simulated/updated
	objMap.clear();
	nodeMap.clear();
	TND_GetNodesInFrustum( hvnsc.octTree, cam.worldToScreenSpaceMat, cam.fov, cam.camTranslation, nodeMap );

	for( const [key,node] of nodeMap ){
		if( simPhys ){
//			DTPrintf("=====Apply User input " + time.toPrecision(3), "loop");
//			//if( queuedMouseEvents.length < 1 ){
//			//	releasePointerLock(lFetCanvas);
//			//}else{
//			while( lFetCanvas.pointerHandler.queuedEvents.length > 0 ){
//				let mevent = lFetCanvas.pointerHandler.queuedEvents.shift(1);
//				preformMouseEvent(mevent);
//			}
			//}
			DTPrintf("=====detect colis " + time.toPrecision(3), "loop");
			TND_ApplyExternAccelAndDetectCollisions(node, time);
			DTPrintf("=====link graphs " + time.toPrecision(3), "loop");
			TND_LinkPhysGraphs(node, time);
			TND_AppyInterpenOffset(node, time);
			
			//need to do this to prevent inerpenetation of objects, though
			//for performace idealy the number of iterations is low
			let numAddionalColis = 1;
			while( numAddionalColis > 0 ){
				DTPrintf("=====trans energy " + time.toPrecision(3), "loop" );
				TND_TransferEnergy(node, time);
				DTPrintf("=====detect additional " + time.toPrecision(3), "loop" );
				numAddionalColis = TND_DetectAdditionalCollisions(node, time);
				if( numAddionalColis > 0 ){
					DTPrintf("======link numAdditional " + numAddionalColis + " time " + time.toPrecision(3), "loop" );
					TND_LinkPhysGraphs(node, time);
					TND_AppyInterpenOffset(node, time);
				}
			}
			DTPrintf( "===update " + time.toPrecision(3), "loop" );
			TND_Update(node, time);

		}
		
		TND_addObjsInNodeToMap( node, objMap );
	}
	//DTPrintf( "nodeMap size " + nodeMap.size, "hvnsc debug", "color:white", 0 );

	sceneSpecificUpdate( hvnsc.sceneName, time ); //run the game code

}

var AnimTransformDrawingEnabled = false;

const maxObjsToDraw = 64;
function HVNSC_Draw(hvnsc){

	if(!CheckIsValidFor( hvnsc, 'Draw' ) )
		return;

	//draw the scene

	//after watching how unreal5 nanite works https://youtu.be/TMorJX3Nj6U 
	//(the state of the art polygon rasterizer in 2022-2024 that uses automatic level of detal generation)
	
	//a simpler way to render would be ray casting with allot of fast memory
	//because rasterization cost increases with overdraw 
	//if there are more polygons than pixels
	//rendering based on casting rays from the camera
	// vs transforming all verticies in view and scan line rendering polygons
	//will have better performance and realisim
	//
	//however the problem though is randomly accessing memory is more expensive than compute
	//loading all objects in the scene at full level of detail
	//and the time cost of updating octTrees for animated objects
	//requires more compare and branch operations vs scanline rasterization 
	//indepndent parallel multiplication of numbers is very fast and energy efficent
	//vs the non local/upredicatble memory access dependent pattern of ray casting

	//having compute in memory per world area will make ray casting/tracing more practical, though
	//until the hardware for it is commonplace 
	//(i.e ray tracing gpus, 
	//chips like Qualcom NPU Hexagon Tensor, 
	//Hailo-8,
	//or a distributed compute cluster with low latency networking
	//vertex and fragment shader rendering with polygons larger than pixels will outpreform it)

	//for raycast rendering
	//objects can move from one region to another passed
	//(via network / intraprocessor connections) to the memory and 
	//simulation in the new region
	//there are optimizations, reStir, metropolus light transport for 
	//decreasing the number of rays that need
	//to be cast, and also denoising can be applied after 
	//( idea of the spectral image structure )
	//by caching world space lighting rays, rays from previous frames, 
	//using importance sampling,
	//distributed computing/streaming from a compute farm, and possibly 
	//gpu compute shader implementations
	//of some of the tracing hopefully interactive framerates with 
	//photorealisim and minimal noise and can be achieved


	//generate the camera matrix
	//let cam = hvnsc.cameras[ hvnsc.activeCameraIdx ];
	//cam.GenWorldToFromScreenSpaceMats();
	
	ResetDrawAndSubBatchBufferIdxs();
	
	if(AnimTransformDrawingEnabled){
		//get the number of armatures and line verts for them
		for( let i = 0; i < hvnsc.armatureInsertIdx; ++i ){
			let numLineVerts = hvnsc.armatures[i].bones.length * numLineVertsPerBone;
			let drawBatch = GetSkelBatchBuffer( 'line', 2, skelAttrCards );
			let subBB = GetDrawSubBatchBuffer( drawBatch, i, numLineVerts);
		}
		//gather the line vert positions
		for( let i = 0; i < hvnsc.armatureInsertIdx; ++i ){
			let numLineVerts = hvnsc.armatures[i].bones.length * numLineVertsPerBone;
			let drawBatch = GetSkelBatchBuffer( 'line', 2, skelAttrCards );
			let subBB = GetDrawSubBatchBuffer( drawBatch, i, numLineVerts);
			if( drawBatch.buffers[0] == null )
				AllocateBatchAttrBuffers(drawBatch);
			SkelA_ArmatureDebugDraw( hvnsc.armatures[i], drawBatch, subBB );
		}
	}

	//get the objects in view
	//objMap.clear();
	//TND_GetObjectsInFrustum( hvnsc.octTree, cam.worldToScreenSpaceMat, cam.fov, cam.camTranslation, objMap );

	sceneSpecificObjects( hvnsc.sceneName, objMap );


	//for each material check sub draw batch allocations for each object using it
	//and that enough array buffer space is allocated for the batches
	for( const [key,val] of objMap ){
		let qm = val.quadmesh;
		for( let matID = 0; matID < qm.materials.length; ++matID ){
			let material = qm.materials[matID];
			let drawBatch = GetDrawBatchBufferForMaterial( material );
			let subBatchBuffer = GetDrawSubBatchBuffer( drawBatch, key, qm.faceVertsCtForMat[matID] );
		}
	}
	
	ReallocateDrawBatchBuffersIfNecessary();

	//for each object in view
	//update the draw batch buffers corresponding to the object materials
	for( const [key,val] of objMap ){ 
		let qm = val.quadmesh;

		//for each material in the object
		for(let matIdx = 0; matIdx < qm.materials.length; ++matIdx ){
			let material = qm.materials[matIdx];

			let drawBatch = GetDrawBatchBufferForMaterial( material );
			let subBatchBuffer = GetDrawSubBatchBuffer( drawBatch, key, qm.faceVertsCtForMat[matIdx] );
			subBatchBuffer.qm = qm; //for debugging to trace the sub batch buffer that doesn't have verts allocated

			if( qm.isAnimated || drawBatch.bufferUpdated ){
				Matrix_Copy( subBatchBuffer.toWorldMatrix, qm.toWorldMatrix );
			}



			if( qm.materialHasntDrawn[matIdx] || drawBatch.bufferUpdated ){

				let numGenVerts = QM_SL_GenerateDrawVertsNormsUVsForMat( qm,
						drawBatch, subBatchBuffer.startIdx, matIdx, 
						subBatchBuffer, cam.worldToScreenSpaceMat ) - subBatchBuffer.startIdx;
				if( numGenVerts != subBatchBuffer.len )
					DPrintf( "error numGenVerts " + numGenVerts + " subBatchBuffer.len " + subBatchBuffer.len );

				//set the texture or material properties for the draw batch
				if( material.texture ){
					drawBatch.texName = material.texture.texName;
				}else{
					drawBatch.texName = null;
					Vect3_Copy( drawBatch.diffuseCol, material.diffuseCol);
					drawBatch.diffuseCol[3] = material.diffuseMix;
				}
			}

		}
	}

	//clear the render buffer and reset rendering state
	graphics.Clear();
	graphics.ClearDepth();
	//graphics.ClearLights();


	//enable/switch to the triangle glProgram
	TRI_G_Setup(graphics.triGraphics);

	TRI_G_SetupLights(graphics.triGraphics, hvnsc.lights, hvnsc.numLights, hvnsc.ambientColor);

	if( hvnsc.boneMatTexture != null )
		SkelA_writeCombinedBoneMatsToGL(hvnsc);
		
	TRI_G_setCamMatrix( graphics.triGraphics, cam.worldToScreenSpaceMat, cam.camTranslation );
	let dbBKeys = Object.keys( drawBatchBuffers );
	for( let i = 0; i < dbBKeys.length; ++i ){
		if( dbBKeys[i] == 'line' )
			continue;
		let dbB = drawBatchBuffers[dbBKeys[i]];
		//if(dbB.bufferIdx > MAX_VERTS )
		//	dbB.bufferIdx = MAX_VERTS;
		if( dbB.numSubBufferUpdatesToBeValid <= 0 ){
		
			let numAnimMatricies = 0;
			if( hvnsc.combinedBoneMats )
				numAnimMatricies = hvnsc.combinedBoneMats.length/matrixCard;
				
			if( dbB.material == undefined )
				console.log("probably skelAnim lines");
			TRI_G_drawTriangles( graphics.triGraphics, dbB.texName, 
				dbB.material.sceneName, dbB, numAnimMatricies );
		}
		//if( dbB.isAnimated )
		//	dbB.bufferIdx = 0; //repeat refilling values
	}
	
	if(AnimTransformDrawingEnabled){
		//if there are armature buffers draw them
		if( hvnsc.armatureInsertIdx > 0 ){
			graphics.enableDepthTest(false);
			LINE_G_Setup(graphics.lineGraphics);
			LINE_G_setCamMatrix( graphics.lineGraphics, cam.worldToScreenSpaceMat );
			LINE_G_drawLines( graphics.lineGraphics, drawBatchBuffers['line'] );
			graphics.enableDepthTest(true);
		}
	}
	
	
	/*  //old rasterization code here
	
	
	//with an oct tree, nodes in the camera frustrum should be drawn
	//update objects / lights / cameras to oct tree nodes (parallelizable)
	//update global illumination bounce lighting (trace rays and update textures)
	
	//find the oct tree nodes within in the camera frustrum (paralleizable)
	var frustum = hvnsc.cameras[hvnsc.activeCameraIdx].GetFrustum();
	var nodesToDraw = OctTree_GetNodesThatOverlapOrAreInsideFrustum(hvnsc.octTree, frustum);
	
	
	//for nodes that have changed / are new / have been removed since last frame
	//update them in the render buffer manager (scene graph)
	
	//lights are objects in scene nodes, let them update / affect lighting themselves during updates
	//for(var i=0; i<hvnsc.lights.length; ++i)
	//    graphics.BindLight(hvnsc.lights[i]);

	//    (using links between model instances and buffer indicies, update the models in parallel)
	//render a frame (gpu does in parallel if using the same shader program)
	hvnsc.renderBufferManager.Draw( hvnsc.cameras[hvnsc.activeCameraIdx], nodesToDraw );
	
	*/
	
}

//trace a ray from a screen point with the active camera into the scene to find
//the closest model that was hit (if one was)
function HVNSC_HitModel(hvnsc, screenCoords){
	let rayOrig;
	let rayDir;
	if(hvnsc.activeCameraIdx == -1)
		return "";
	hvnsc.cameras[activeCameraIdx].GenerateWorldCoordRay(
									rayOrig, rayDir, screenCoords);
	
	let temp;
	Vect3_Copy(temp, rayDir);
	Vect3_Add(temp, rayOrig);

	return hvnsc.octTree.ClosestRayIntersection(rayOrig, rayDir);
}

//check if finished asynchronously loading the scene
function HVNSC_checkIfIsLoaded(hvnsc){
	if( hvnsc.pendingObjsAdded <= 5 ){
		DPrintf("models left to load " + hvnsc.pendingObjsAdded );
		//let notYetLoadedObjsStr = '';
		//let objsToLoad = Object.keys(hvnsc.pendingObjsToLoad);
		//for( let i = 0; i < objsToLoad.length; ++i )
		//	notYetLoadedObjsStr += objsToLoad[i] + ' ' + objsToLoad[i].quadMesh + ' \n';
		//DPrintf("not yet loaded models " + notYetLoadedObjsStr );
	}
	
	if( hvnsc.pendingObjsAdded <= 0 ){
	
		//look up and set its index
		for(let j=0; j<hvnsc.cameras.length; ++j){
			if(hvnsc.cameras[j].cameraName == hvnsc.activeCamera){
				hvnsc.activeCameraIdx = j;
				setCamLimitInputs(hvnsc.cameras[j]);
				break;
			}
		}
		
		//allocate the float texture for armatures
		SkelA_AllocateCombinedBoneMatTexture(hvnsc.armatures, hvnsc);
	
		HVNSC_Update( hvnsc, 0.0 ); //init animated objs
		hvnsc.isValid = true;
		hvnsc.sceneLoadedCallback(hvnsc);
	}
}

function HVNSC_ObjLoadedCallback(obj, hvnsc){
	statusElm.innerHTML = "Loading " + hvnsc.pendingObjsAdded + " Objs";
	hvnsc.pendingObjsAdded-=1;
	if( obj.constructor.name == Camera.name ){
		hvnsc.cameras[hvnsc.camInsertIdx++] = obj;
	}else if( obj.constructor.name == Model.name ){
		MDL_Update( obj, 0 ); //update to generate AABB
		MDL_AddToOctTree( obj, hvnsc.octTree );
		delete hvnsc.pendingObjsToLoad[obj.modelName];
	}else if( obj.constructor.name == SkeletalAnimation.name ){
		hvnsc.armatures[hvnsc.armatureInsertIdx++] = obj;
	}
	HVNSC_checkIfIsLoaded(hvnsc);
}

//called to read from text file models, lights, and cameras in the scene
function HVNSC_parseSceneTextFile( hvnsc, textFileLines )
{
	//read the overall scene aabb size and num objs first
	let revStartIdx = textFileLines.length-1;
	while( textFileLines[ revStartIdx ].length < 1 )
		--revStartIdx;
	let sceneAABBDimTxt = textFileLines[revStartIdx-1].split(' ');
	let sceneMin = Vect3_NewVals( 
		parseFloat( sceneAABBDimTxt[1] ), 
		parseFloat( sceneAABBDimTxt[2] ), 
		parseFloat( sceneAABBDimTxt[3] ) );
	let sceneMax = Vect3_NewVals( 
		parseFloat( sceneAABBDimTxt[5] ), 
		parseFloat( sceneAABBDimTxt[6] ), 
		parseFloat( sceneAABBDimTxt[7] ) );
	hvnsc.octTree = new TreeNode( sceneMin, sceneMax, null );
	hvnsc.octTree.name = hvnsc.sceneName + " scene";
	
	let sceneObjLghtCamCtTxt = textFileLines[revStartIdx-2].split(' ');
	let numObjs		 = parseInt( sceneObjLghtCamCtTxt[2] );
	let numLghts	 = parseInt( sceneObjLghtCamCtTxt[4] );
	let numCams		 = parseInt( sceneObjLghtCamCtTxt[6] );
	let numArmatures = parseInt( sceneObjLghtCamCtTxt[8] );
	
	hvnsc.pendingObjsAdded = numObjs + numCams + numArmatures + 1;
	
	hvnsc.cameras = new Array(numCams);
	hvnsc.camInsertIdx = 0;
	hvnsc.armatures = new Array(numArmatures);
	hvnsc.armatureInsertIdx = 0;
	
	//per obj vars while parsing
	let scneObjName = '';
	let mdlMeshName = '';
	let mAABB = null;
	let mdlAABBmin = Vect3_NewZero();
	let mdlAABBmax = Vect3_NewZero();
	let mdlLoc = Vect3_NewZero();
	let mdlRot = Vect3_NewZero();
	
	let armatureName = '';
	
	let lcol = Vect3_NewZero();
	let lenrg = 0;
	let lspotsz = 0;
	let lanim = '';
	
	let camAng = 0;
	let camStart = 0;
	let camEnd = 0;
	let camIpoName = '';
	
	let txtNumLines = textFileLines.length;
	for( let i = 0; i<txtNumLines; ++i )
	{
		statusElm.innerHTML = "Parsing " + (i+1) + "/" + txtNumLines;
		let txtLineParts = textFileLines[i].split( ' ' );

		if(txtLineParts[0] == 'm' ){ //this is a model to be read in 
		//(load the model and then append it to the scenegraph)
			scneObjName = txtLineParts[1];
			mdlMeshName = scneObjName;
		}else if( txtLineParts[0] == 'maabb' ){
			Vect3_parse( mdlAABBmin, txtLineParts, 3 );
			Vect3_parse( mdlAABBmax, txtLineParts, 7 );
			
			//try to read in an AABB from the model description line
			//if there aren't values set the not a number flag
			
			if( !Vect3_containsNaN( mdlAABBmin ) && !Vect3_containsNaN( mdlAABBmax ) )
				mAABB = new AABB( mdlAABBmin, mdlAABBmax );
				
		}else if( txtLineParts[0] == 'mloc' ){
			Vect3_parse( mdlLoc, txtLineParts, 1 );
		}else if( txtLineParts[0] == 'mrot' ){
			Vect3_parse( mdlRot, txtLineParts, 1 );
		}else if( txtLineParts[0] == 'mEnd' ){
			
			//compared in check if is loaded
			//to check if all models have finished loading
			newMdl    = new Model( scneObjName, mdlMeshName, 
					        hvnsc.sceneName, mAABB, hvnsc, HVNSC_ObjLoadedCallback );
			hvnsc.pendingObjsToLoad[scneObjName] = newMdl;
			
		}
		
		else if( txtLineParts[0] == 'a' ){ //this is an armature to be read in
			graphics.GetCached( txtLineParts[1], hvnsc.sceneName, SkeletalAnimation, 
				null,
				HVNSC_ObjLoadedCallback, hvnsc );
		}
		
		
		
		//lights and cameras are simple to load can be loaded synchronously 
		//as they don't require loading additional files
		//(info is one line in the text file)
		//this is a light to be read in
		else if(txtLineParts[0] == "l"){
			scneObjName = txtLineParts[1];
			lanim = '';
		}else if( txtLineParts[0] == 'ltype' ){
			lampType = txtLineParts[1];
		}else if( txtLineParts[0] == 'lloc' ){
			Vect3_parse(mdlLoc, txtLineParts, 1);
		}else if( txtLineParts[0] == 'lrot' ){
			Vect3_parse(mdlRot, txtLineParts, 1);
		}else if( txtLineParts[0] == 'lcol' ){
			Vect3_parse(lcol, txtLineParts, 1);
		}else if( txtLineParts[0] == 'lenrg' ){
			lenrg = parseFloat( txtLineParts[1] )
		}else if( txtLineParts[0] == 'lspotsz'){
			lspotsz = parseFloat( txtLineParts[1] )
		}else if( txtLineParts[0] == 'l_anim'){
			lanim = txtLinePars[1];
		}else if( txtLineParts[0] == 'lEnd' ){
			hvnsc.lights[hvnsc.numLights++] = 
				new Light(scneObjName, hvnsc.sceneName, 
					lcol, lenrg, lampType, mdlLoc, mdlRot, lspotsz, lanim);
		}
		
		//this is a camera to be read in
		else if(txtLineParts[0] == 'c')
		{
			scneObjName	= txtLineParts[1];
		}else if( txtLineParts[0] == 'cloc' ){
			Vect3_parse( mdlLoc, txtLineParts, 1 );
		}else if( txtLineParts[0] == 'crot' ){
			Vect3_parse( mdlRot, txtLineParts, 1 );
		}else if( txtLineParts[0] == 'cang' ){
			camAng = parseFloat( txtLineParts[1] );
		}else if( txtLineParts[0] == 'cstartend' ){
			camStart = parseFloat( txtLineParts[1] );
			camEnd = parseFloat( txtLineParts[2] );
		}else if( txtLineParts[0] == 'c_anim' ){
			camIpoName = txtLineParts[1];
		}else if( txtLineParts[0] == 'cEnd' ){

			graphics.GetCached(scneObjName, hvnsc.sceneName, Camera, 
				[camIpoName, camAng, camStart, camEnd, mdlLoc, mdlRot], HVNSC_ObjLoadedCallback, hvnsc);
		}
		//this is the name of the active camera to be read in
		else if( txtLineParts[0] == 'ac' )
		{
			hvnsc.activeCamera = txtLineParts[1];
		}
	}
	
	--hvnsc.pendingObjsAdded;
	HVNSC_checkIfIsLoaded(hvnsc);
}

function HVNSC_textFileLoadedCallback(txtFile, thisP) 
//called after scene description text file has been fetched
{
	let textFileLines = txtFile.split("\n");
	
	//begin loading the scene from text file
	HVNSC_parseSceneTextFile( thisP, textFileLines );
}


