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
let nodeMap = {};
function HVNSC_UpdateInCamViewAreaAndGatherObjsToDraw( hvnsc, time, rastB3DTris, rastB3DLines ){

	if(!CheckIsValidFor( hvnsc, 'Update' ) )
		return;


	//get the nodes within view
	//only call update on in view nodes and nodes/objects that need to be actively simulated/updated
	nodeMap = {};
	TND_GetNodesInFrustum( hvnsc.octTree, cam.worldToScreenSpaceMat, cam.fov, cam.camTranslation, nodeMap );

	//let nodeKeys = Object.keys(nodeMap);
	for( let key in nodeMap ){//for( let i = 0; i < nodeKeys.length; ++i ){
		let node = nodeMap[key];//nodeKeys[i]];
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
			//DTPrintf("=====detect colis " + time.toPrecision(3), "loop");
			TND_ApplyExternAccelAndDetectCollisions(node, time);
			//DTPrintf("=====link graphs " + time.toPrecision(3), "loop");
			TND_LinkPhysGraphs(node, time);
			TND_AppyInterpenOffset(node, time);
			
			//need to do this to prevent inerpenetation of objects, though
			//for performace idealy the number of iterations is low
			let numAddionalColis = 1;
			while( numAddionalColis > 0 ){
				//DTPrintf("=====trans energy " + time.toPrecision(3), "loop" );
				TND_TransferEnergy(node, time);
				//DTPrintf("=====detect additional " + time.toPrecision(3), "loop" );
				numAddionalColis = TND_DetectAdditionalCollisions(node, time);
				if( numAddionalColis > 0 ){
					//DTPrintf("======link numAdditional " + numAddionalColis + " time " + time.toPrecision(3), "loop" );
					TND_LinkPhysGraphs(node, time);
					TND_AppyInterpenOffset(node, time);
				}
			}
			//DTPrintf( "===update " + time.toPrecision(3), "loop" );
			TND_Update(node, time);

		}
		
		TND_addObjsInNodeToMap( node, rastB3DTris.objs );
	}
	//DTPrintf( "nodeMap size " + nodeMap.size, "hvnsc debug", "color:white", 0 );

	rastB3DTris.ambientColor = hvnsc.ambientColor;
	rastB3DTris.lights = hvnsc.lights;
	rastB3DTris.numLights = hvnsc.numLights;


	if(AnimTransformDrawingEnabled){
		let drawBatch = GetSkelBatchBuffer( rastB3DLines, 'line', 2, skelAttrCards );
		//get the number of armatures and line verts for them
		for( let i = 0; i < hvnsc.armatureInsertIdx; ++i ){
			let numLineVerts = hvnsc.armatures[i].bones.length * numLineVertsPerBone;
			let subBB = GetDrawSubBatchBuffer( drawBatch, i, numLineVerts );
		}
		
		//gather the line vert positions
		for( let i = 0; i < hvnsc.armatureInsertIdx; ++i ){
			let numLineVerts = hvnsc.armatures[i].bones.length * numLineVertsPerBone;
			let subBB = GetDrawSubBatchBuffer( drawBatch, i, numLineVerts);

			if( drawBatch.buffers[0] == null )
				AllocateBatchAttrBuffers(drawBatch);
			SkelA_ArmatureDebugDraw( hvnsc.armatures[i], drawBatch, subBB );
		}
	}

}

var AnimTransformDrawingEnabled = false;


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

		//HVNSC_Update( hvnsc, 0.0 ); //init animated objs
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
			GRPH_GetCached( txtLineParts[1], hvnsc.sceneName, SkeletalAnimation, 
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

			GRPH_GetCached(scneObjName, hvnsc.sceneName, Camera, 
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


