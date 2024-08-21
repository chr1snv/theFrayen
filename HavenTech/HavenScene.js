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

function GetSkelBatchBuffer(hvnsc, shdrName, numAttrs, attrCards){
	let dbB = hvnsc.drawBatchBuffers[shdrName];
	if( dbB == undefined ){
		dbB = new SkelDrawBatchBuffer( numAttrs, attrCards);
		hvnsc.drawBatchBuffers[shdrName] = dbB;
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

function GetDrawBatchBufferForMaterial(hvnsc, material){
	let dbB = hvnsc.drawBatchBuffers[material.uid.val];
	if( dbB == undefined ){
		dbB = new DrawBatchBuffer(material);
		hvnsc.drawBatchBuffers[material.uid.val] = dbB;
	}
	return dbB;
}


//keep the sub batch buffers in place (even if not active (len == 0) until
//the bufferIdx is > or less than a block allocation threshold amount
//(to prevent frequent regeneration of verts,norms,uv's

//reset indicies between frames incase the objects
//within the camera frustum to be drawn are different
function ResetDrawAndSubBatchBufferIdxs(hvnsc){
	//sub batch buffer
	let dbbKeys = Object.keys(hvnsc.drawBatchBuffers);
	for( let i = 0; i < dbbKeys.length; ++i ){
		let dbb = hvnsc.drawBatchBuffers[dbbKeys[i]];
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

}

//each frame sort objects by their distance to the camera,
//if a object stays in the same position for many frames move it's
//actual position in the attribBufferArray
let cmpSbb = null;
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

function GenSortedSubBatchBufferList(dbB){
	//sort the sub batches by object distance to camera (front to back)
	
	dbB.sortedSubRngKeys = Object.keys(dbB.bufSubRanges);
	dbB.numBufSubRanges = dbB.sortedSubRngKeys.length;
	let nextPotSz = Math.pow(2,Math.ceil(Math.log2(dbB.sortedSubRngKeys.length)));
	while( dbB.sortedSubRngKeys.length < nextPotSz )
		dbB.sortedSubRngKeys.push(0);
	let sortedSubRngKeysTemp = new Array( nextPotSz );
	cmpSbb = dbB;
	if( MergeSort( dbB.sortedSubRngKeys, sortedSubRngKeysTemp, CmpSBBList ) ){ 
		//ret true means the sorted output is in ..keysTemp, 
		//therefore swap keys and keysTemp
		let tmp = dbB.sortedSubRngKeys;
		dbB.sortedSubRngKeys = sortedSubRngKeysTemp;
		sortedSubRngKeysTemp = tmp;
	}
}

function SortSubBatches(hvnsc){
	//called each frame between finding all objects to draw in the frame
	//and getting verticies from them if necessary
	let dbbKeys = Object.keys(hvnsc.drawBatchBuffers);
	for( let i = 0; i < dbbKeys.length; ++i ){
		let drawBatch = hvnsc.drawBatchBuffers[dbbKeys[i]];
		
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

function GetDrawSubBatchBuffer( dbB, subRangeId, numVerts, subRangeQm, qmMatID ){
	let subRange = dbB.bufSubRanges[ subRangeId ];


	if( subRange == undefined ){ //obj+material hasn't been drawn
		//create a new sub batch buffer
		subRange = new BufSubRange( dbB.bufferIdx, numVerts, subRangeQm, qmMatID );
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
function DefragmentBatchBufferAllocations(hvnsc){
/*
	let dbbKeys = Object.keys(hvnsc.drawBatchBuffers);
	for( let i = 0; i < dbbKeys.length; ++i ){
		let dbb = hvnsc.drawBatchBuffers[dbbKeys[i]];
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

function CleanUpDrawBatchBuffers(hvnsc){
	for( dbB in hvnsc.drawBatchBuffers ){
		delete( dbB );
	}
	hvnsc.drawBatchBuffers = {};
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
	
	this.drawBatchBuffers = {};

	//using the camera frustum only objects within view 
	//can be drawn / simulated in high fidelity

	this.framesSec = 25.0;

	//gl graphics card memory managment (geometry array generation and reuse) 
	//for rasterizing scene objects
	//this.renderBufferManager = new RenderBufferManager( this.sceneName );
	//now unused because drawing is raytraced 
	//(maybe will come back / be replaced by spectral image for denoising)


	this.scnId = SceneNameToId( this.sceneName );

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
	
	ResetDrawAndSubBatchBufferIdxs(hvnsc);
	
	if(AnimTransformDrawingEnabled){
		//get the number of armatures and line verts for them
		for( let i = 0; i < hvnsc.armatureInsertIdx; ++i ){
			let numLineVerts = hvnsc.armatures[i].bones.length * numLineVertsPerBone;
			let drawBatch = GetSkelBatchBuffer( hvnsc, 'line', 2, skelAttrCards );
			let subBB = GetDrawSubBatchBuffer( drawBatch, i, numLineVerts );
		}
		//gather the line vert positions
		for( let i = 0; i < hvnsc.armatureInsertIdx; ++i ){
			let numLineVerts = hvnsc.armatures[i].bones.length * numLineVertsPerBone;
			let drawBatch = GetSkelBatchBuffer( hvnsc, 'line', 2, skelAttrCards );
			let subBB = GetDrawSubBatchBuffer( drawBatch, i, numLineVerts);
			if( drawBatch.buffers[0] == null )
				AllocateBatchAttrBuffers(drawBatch);
			SkelA_ArmatureDebugDraw( hvnsc.armatures[i], drawBatch, subBB );
		}
	}

	//get the objects in view
	//objMap.clear();
	//TND_GetObjectsInFrustum( hvnsc.octTree, cam.worldToScreenSpaceMat, cam.fov, cam.camTranslation, objMap );

	//get additional objects from the gameplay code
	sceneSpecificObjects( hvnsc.scnId, objMap );


	//for each material check sub draw batch allocations for each object using it
	//and that enough array buffer space is allocated for the batches
	for( const [objUid,obj] of objMap ){
		let qm = obj.quadmesh;
		for( let matID = 0; matID < qm.materials.length; ++matID ){
			let material = qm.materials[matID];
			//get the material buffer and sub buffer for object verts to ensure enough space is allocated
			//in SortSubBatches...(hvnsc)
			if( qm.faceVertsCtForMat[matID] > 0 ){ //ignore materials with no verts assigned
				let drawBatch = GetDrawBatchBufferForMaterial( hvnsc, material );
				let subBatchBuffer = GetDrawSubBatchBuffer( drawBatch, objUid, qm.faceVertsCtForMat[matID], qm, matID );
			}
		}
	}
	
	SortSubBatches(hvnsc);

	//for each object in view
	//update the model matrix, and sub buffer verts,norms,uvs,bnWghts if necessary
	for( const [objUid,obj] of objMap ){ 
		let qm = obj.quadmesh;

		//for each material in the object
		for(let matIdx = 0; matIdx < qm.materials.length; ++matIdx ){
			let material = qm.materials[matIdx];
			
			if( qm.faceVertsCtForMat[matIdx] < 1 ) //ignore materials with no verts assigned
				continue;

			let drawBatch = GetDrawBatchBufferForMaterial( hvnsc, material );
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

	//clear the render buffer and reset rendering state
	graphics.Clear();
	//graphics.ClearDepth();
	//graphics.Flush();
	//graphics.ClearLights();


	//enable/switch to the triangle glProgram
	TRI_G_Setup(graphics.triGraphics);

	TRI_G_SetupLights(graphics.triGraphics, hvnsc.lights, hvnsc.numLights, hvnsc.ambientColor);

	if( hvnsc.boneMatTexture != null )
		SkelA_writeCombinedBoneMatsToGL(hvnsc);
		
	
	
	TRI_G_setCamMatrix( graphics.triGraphics, cam.worldToScreenSpaceMat, cam.camTranslation );
	let dbBKeys = Object.keys( hvnsc.drawBatchBuffers );
	for( let i = 0; i < dbBKeys.length; ++i ){
		if( dbBKeys[i] == 'line' )
			continue;
		let dbB = hvnsc.drawBatchBuffers[dbBKeys[i]];
		//if(dbB.bufferIdx > MAX_VERTS )
		//	dbB.bufferIdx = MAX_VERTS;
		if( dbB.numSubBufferUpdatesToBeValid <= 0 ){
		
			let numAnimMatricies = 0;
			if( hvnsc.combinedBoneMats )
				numAnimMatricies = hvnsc.combinedBoneMats.length/matrixCard;
				
			if( dbB.material == undefined )
				console.log("probably skelAnim lines");
			
			
			TRI_G_drawTriangles( graphics.triGraphics, dbB, numAnimMatricies );
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
			LINE_G_drawLines( graphics.lineGraphics, hvnsc.drawBatchBuffers['line'] );
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
		DTPrintf("models left to load " + hvnsc.pendingObjsAdded, "hvnsc ld" );
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
		hvnsc.models[obj.uid.val] = obj;
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
		//statusElm.innerHTML = "Scn Lines " + (i+1) + "/" + txtNumLines;
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


