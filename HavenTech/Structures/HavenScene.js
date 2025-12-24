//# sourceURL=Structures/HavenScene.js
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




function HavenScene( sceneNameIn, sceneLoadedCallback, createEmptyScene=false, sceneMin, sceneMax, physNode=null ){

	this.sceneLoadedCallback = sceneLoadedCallback;

	this.sceneName = sceneNameIn;
	this.isValid = false;

	this.ambientColor = Vect3_NewVals(0.05, 0.05, 0.1); 

	//dictionary/arrays of objects may become very big also stored in oct tree
	this.modelNames = {}; //would be nice to avoid this, though needed by regatta and other per scene logic to access loaded models
	this.models    = {}; //models stored by uid, maybe not used
	this.lights    = new Array(8);
	this.numLights = 0;
	this.cameras   = [];
	this.armatures = [];

	this.pendingModelNamesToLoad = {};
	
	this.pendingModelsToAdd		= 0;
	this.pendingLghtsToAdd 		= 0;
	this.pendingCamsToAdd 		= 0;
	this.pendingArmaturesToAdd 	= 0;

	this.pendingObjsToAdd = 0;

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



	if( !createEmptyScene ){
		//load from file constructor functionality begin asynchronous fetch of scene description
		let thisP = this;
		getFileFromSceneZip(thisP.sceneName, thisP.sceneName + ".hvtScene", "string", HVNSC_textFileLoadedCallback, thisP);
	}else{
		//initially empty programatically / runtime added to / generated scene
		//"HVNSC_createEmptyScene(this);" (if this were a function)

		this.octTree = new TreeNode( sceneMin, sceneMax, null, physNode );
		this.octTree.name = this.sceneName + " scene";

		let camArgs = [ '', 90, 0.1, 100, [0,0,0], [0,0,0] ];
		this.cameras.push( new Camera( "mainCam", this.sceneName, camArgs, null, null ) );
		this.cameras[0].GenWorldToFromScreenSpaceMats();
		this.activeCamera = "mainCam";
		this.activeCameraIdx = 0;

		//set is valid and call scene loaded callback if set
		//this.isValid = true;
		HVNSC_checkIfIsLoaded(this);
	}

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


let treeNodesInFrame = new Map();
function HVNSC_UpdateInCamViewAreaAndGatherObjsToDraw( hvnsc, time, rastB3DTris, rastB3DLines, simPhys=false ){

	if(!CheckIsValidFor( hvnsc, 'Update' ) )
		return;


	//get the nodes within view
	//only call update on in view nodes and nodes/objects that need to be actively simulated/updated
	treeNodesInFrame.clear();
	TND_GetNodesInFrustum( hvnsc.octTree, rastB3DTris.worldToScreenSpaceMat, rastB3DTris.camFov, rastB3DTris.camWorldPos, treeNodesInFrame );

	//let nodeKeys = Object.keys(treeNodesInFrame);
	for( let node of treeNodesInFrame.values() ){//for( let i = 0; i < nodeKeys.length; ++i ){
		//let node = treeNodesInFrame[key];//nodeKeys[i]];
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
			TND_ApplyExternAffectsAndDetectCollisions(node, time);
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
		}
		//DTPrintf( "===update " + time.toPrecision(3), "loop" );
		TND_Update(node, time);

		TND_addMdlsAndArmaturesInNodeToRasterBatch( rastB3DTris.mdls, rastB3DTris.armatureDict, node );
	}
	//DTPrintf( "treeNodesInFrame size " + treeNodesInFrame.size, "hvnsc debug", "color:white", 0 );

	rastB3DTris.ambientColor = hvnsc.ambientColor;
	rastB3DTris.lights = hvnsc.lights;
	rastB3DTris.numLights = hvnsc.numLights;


	if(AnimTransformDrawingEnabled && rastB3DLines != null){
		let drawBatch = GetLineBatchBuffer( rastB3DLines, 'line', 2, skelAttrCards );
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
				AllocateLineBatchAttrBuffers(drawBatch);
			SkelA_ArmatureDebugDraw( hvnsc.armatures[i], drawBatch, subBB );
		}
		rastB3DLines.activeForFrame = true;
	}

	let i = 0;
	for( let armature in rastB3DTris.armatureDict )
		rastB3DTris.armatures[i++] = rastB3DTris.armatureDict[armature];
	if( rastB3DTris.armatures.length > 0 && rastB3DTris.boneMatTexture == null ){
		SkelA_AllocateBatchBoneMatTexture(rastB3DTris.armatures, rastB3DTris);
	}

	if( rastB3DTris.armatures.length > 0 ){
		SkelA_writeBatchBoneMatsToGL(rastB3DTris);
	}

	rastB3DTris.activeForFrame = true;

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
/*
	if( hvnsc.pendingObjsToAdd <= 5 ){
		DTPrintf( hvnsc.sceneName + " left to load objs " + hvnsc.pendingObjsToAdd + 
		" models " + hvnsc.pendingModelsToAdd +
		" lghts " + hvnsc.pendingLghtsToAdd +
		" cams " + hvnsc.pendingCamsToAdd +
		" armatures " + hvnsc.pendingArmaturesToAdd
		, "hvnsc ld" );

		let notYetLoadedObjsStr = '';
		let objsToLoad = Object.keys(hvnsc.pendingModelsToLoad);
		for( let i = 0; i < objsToLoad.length; ++i ){
			notYetLoadedObjsStr += objsToLoad[i] + ' : ';
			let qm = hvnsc.pendingModelsToLoad[objsToLoad[i]].quadmesh;
			if( qm )
				notYetLoadedObjsStr += qm.meshName;
			else
				notYetLoadedObjsStr += 'null';
			notYetLoadedObjsStr += ' \n';
		}
		DPrintf("not yet loaded models : meshes " + notYetLoadedObjsStr );
	}
*/

	if( hvnsc.pendingObjsToAdd <= 0 ){ //finish setup of scene

		//look up (find) the camera and set its index
		for(let j=0; j<hvnsc.cameras.length; ++j){
			if(hvnsc.cameras[j].cameraName == hvnsc.activeCamera){
				hvnsc.activeCameraIdx = j;
				//setSettingsDispCamLimitInputs(hvnsc.cameras[j]);
				break;
			}
		}


		//sort the lights (so sun/directional lights that cast a shadow are first)
		hvnsc.lights.sort((l1, l2) => {
			// comparison logic (order SUN, SPOT, POINT)
			if( l1.lightType == l2.lightType )
				return 0;
			if( l1.lightType == LightType.SUN )
				return -1;
			if( l2.lightType == LightType.SUN )
				return 1;
			if( l1.lightType == LightType.SPOT )
				return -1;
			return 1; //arent equal and l1 is type POINT (so l2 is either SPOT or SUN)
		});


		if( hvnsc.octTree.physNode ){
			//init the physical world bounds
			//let worldBoundsAABB = new AABB( worldMin, worldMax );
			//worldBoundsObj = { linVel:[0,0,0], AABB:worldBoundsAABB }
			let boundThickness = 0.1 * hvnsc.octTree.AABB.diagLen;
			hvnsc.octTree.boundsObjs = CreateBoundsObjs( hvnsc.octTree.AABB.minCoord, hvnsc.octTree.AABB.maxCoord, boundThickness );
		}

		//HVNSC_Update( hvnsc, 0.0 ); //init animated objs
		hvnsc.isValid = true;
		if( hvnsc.sceneLoadedCallback )
			hvnsc.sceneLoadedCallback(hvnsc);
	}
}


function HVNSC_FinishAddingLoadedModelToScene(hvnsc, mdl){
	MDL_Update ( mdl, sceneTime ); //update to generate AABB (closest to now time to avoid large delta t in phys obj update
	hvnsc.modelNames[mdl.modelName] = mdl;
	if( MDL_AddToOctTree( mdl, hvnsc.octTree ) ){
		hvnsc.models[mdl.uid.val] = mdl;
		if( hvnsc.pendingModelNamesToLoad[mdl.modelName] )
			delete hvnsc.pendingModelNamesToLoad[mdl.modelName];
		hvnsc.pendingModelsToAdd -= 1;
	}
}


function HVNSC_ObjLoadedCallback(obj, hvnsc){
	if(hvnsc.pendingObjsToAdd == 2){
		console.log("possibly stuck");
		let objNamesRemainingToLoad = Object.keys( hvnsc.pendingModelNamesToLoad );
		let remObjsStr = '';
		for( let i = 0; i < objNamesRemainingToLoad.length; ++i )
			remObjsStr += objNamesRemainingToLoad[i] + ' ';
		console.log(hvnsc.sceneName + " stuck remaining " + hvnsc.pendingObjsToAdd + " objs " + remObjsStr + " remMdls " + hvnsc.pendingModelsToAdd + " remCams " + hvnsc.pendingCamsToAdd + " remLghts " + hvnsc.pendingLghtsToAdd + " remArmatures " + hvnsc.pendingArmaturesToAdd );
	}
	statusElm.innerHTML = "Loading " + hvnsc.pendingObjsToAdd + " Objs";
	hvnsc.pendingObjsToAdd-=1;
	if( obj.constructor.name == Camera.name ){
		hvnsc.cameras[hvnsc.camInsertIdx++] = obj;
		hvnsc.pendingCamsToAdd -= 1;
	}else if( obj.constructor.name == Model.name ){
		HVNSC_FinishAddingLoadedModelToScene(hvnsc, obj);
	}else if( obj.constructor.name == SkeletalAnimation.name ){
		hvnsc.armatures[hvnsc.armatureInsertIdx++] = obj;
		hvnsc.pendingArmaturesToAdd -= 1;
	}else if( obj.constructor.name == Light.name ){
		hvnsc.pendingLghtsToAdd -= 1;
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
	let numMdls		 = parseInt( sceneObjLghtCamCtTxt[2] );
	let numLghts	 = parseInt( sceneObjLghtCamCtTxt[4] );
	let numCams		 = parseInt( sceneObjLghtCamCtTxt[6] );
	let numArmatures = parseInt( sceneObjLghtCamCtTxt[8] );

	hvnsc.pendingLghtsToAdd = numLghts;
	
	hvnsc.pendingSceneFileRead = true;

	hvnsc.pendingObjsToAdd = numMdls + numLghts + numCams + numArmatures + 1;

	hvnsc.cameras = new Array(numCams);
	hvnsc.camInsertIdx = 0;
	hvnsc.armatures = new Array(numArmatures);
	hvnsc.armatureInsertIdx = 0;

	//per obj vars while parsing
	let scneObjName			= '';
	let mdlMeshName			= '';
	let mdlArmName			= '';
	let mdlIpoName			= '';
	let mdlMaterialNames	= [];
	let mAABB				= null;
	let mdlAABBmin			= Vect3_NewZero();
	let mdlAABBmax			= Vect3_NewZero();
	let mdlLoc				= Vect3_NewZero();
	let mdlRot				= Quat_New();
	let mdlScl				= Vect3_NewZero();

	let lcol		= Vect3_NewZero();
	let lenrg		= 0;
	let lspotsz		= 0;
	let lanim		= '';

	let camAng		= 0;
	let camStart	= 0;
	let camEnd		= 0;
	let camIpoName	= '';

	let txtNumLines = textFileLines.length;
	for( let i = 0; i<txtNumLines; ++i )
	{
		//statusElm.innerHTML = "Scn Lines " + (i+1) + "/" + txtNumLines;
		let txtLineParts = textFileLines[i].split( ' ' );

		if(txtLineParts[0] == 'm' ){ //this is a model to be read in 
		//(load the model and then append it to the scenegraph)
			scneObjName = txtLineParts[1];
		}
		else if(txtLineParts[0] == 'mMeshName'){
			mdlMeshName = txtLineParts[1];
		}else if(txtLineParts[0] == 'mArmName'){
			mdlArmName = txtLineParts[1];
		}else if(txtLineParts[0] == 'mIpoName'){
			mdlIpoName = txtLineParts[1];
		}else if( txtLineParts[0] == 'maabb' ){
			Vect3_parse( mdlAABBmin, txtLineParts, 1 );
			Vect3_parse( mdlAABBmax, txtLineParts, 5 );

			//try to read in an AABB from the model description line
			//if there aren't values set the not a number flag
			if( !Vect3_containsNaN( mdlAABBmin ) && !Vect3_containsNaN( mdlAABBmax ) )
				mAABB = new AABB( mdlAABBmin, mdlAABBmax );

		}else if( txtLineParts[0] == 'mloc' ){
			Vect3_parse( mdlLoc, txtLineParts, 1 );
		}else if( txtLineParts[0] == 'mrot' ){
			Vect_parse( mdlRot, 4, txtLineParts, 1 );
		}else if( txtLineParts[0] == 'mscl' ){
			Vect3_parse( mdlScl, txtLineParts, 1 );
		}else if( txtLineParts[0] == 'mMat' ){
			mdlMaterialNames.push( txtLineParts[1] );
		}else if( txtLineParts[0] == 'mEnd' ){

			//in case model has already been loaded have to append to list before starting model loading
			hvnsc.pendingModelsToAdd += 1; //compared in check if is loaded
			hvnsc.pendingModelNamesToLoad[scneObjName] = scneObjName; //to check if all models have finished loading in case of errors

			newMdl    = new Model( scneObjName, mdlMeshName, mdlArmName, mdlIpoName, mdlMaterialNames,
					        hvnsc.sceneName, mAABB, mdlLoc, mdlRot, mdlScl, hvnsc, HVNSC_ObjLoadedCallback );

			//reset inputs for next model (incase some are not specified)
			mdlMeshName			= '';
			mdlArmName			= '';
			mdlIpoName			= '';
			mdlMaterialNames	= [];
			mAABB				= null;
			mdlAABBmin			= Vect3_NewZero();
			mdlAABBmax			= Vect3_NewZero();
			mdlLoc				= Vect3_NewZero();
			mdlRot				= Quat_New();
			mdlScl				= Vect3_NewZero();

		}

		else if( txtLineParts[0] == 'a' ){ //this is an armature to be read in
			GRPH_GetCached( txtLineParts[1], hvnsc.sceneName, SkeletalAnimation, 
				null,
				HVNSC_ObjLoadedCallback, hvnsc );
			hvnsc.pendingArmaturesToAdd += 1;
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
			hvnsc.pendingLghtsToAdd -= 1;
			hvnsc.pendingObjsToAdd -= 1;
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
		}else if( txtLineParts[0] == 'cIpoName' ){
			camIpoName = txtLineParts[1];
		}else if( txtLineParts[0] == 'cEnd' ){
			hvnsc.pendingCamsToAdd += 1;
			GRPH_GetCached(scneObjName, hvnsc.sceneName, Camera, 
				[camIpoName, camAng, camStart, camEnd, mdlLoc, mdlRot], HVNSC_ObjLoadedCallback, hvnsc);
		}
		//this is the name of the active camera to be read in
		else if( txtLineParts[0] == 'ac' ){
			hvnsc.activeCamera = txtLineParts[1];
		}
	}

	hvnsc.pendingSceneFileRead = false;
	--hvnsc.pendingObjsToAdd; //-1 for the scene file being read in
	HVNSC_checkIfIsLoaded(hvnsc);
}



function HVNSC_textFileLoadedCallback(txtFile, thisP) 
//called after scene description text file has been fetched
{
	let textFileLines = txtFile.split("\n");

	//begin loading the scene from text file
	HVNSC_parseSceneTextFile( thisP, textFileLines );
}


