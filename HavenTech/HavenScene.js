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

const MAX_VERTS = 65536;
let nextBufID = TRI_G_VERT_ATTRIB_UID_START;
function DrawBatchBuffer(vertCt){
	this.bufID = nextBufID;
	nextBufID += 3;
	this.vertBuffer = new Float32Array(vertCt*vertCard);
	this.normBuffer = new Float32Array(vertCt*normCard);
	this.uvBuffer   = new Float32Array(vertCt*uvCard);
	this.bufferIdx = 0;
	this.bufferUpdated = true;
	this.isAnimated = false;
	this.texName = null;
	
	this.diffuseCol = new Float32Array(4);
	this.toViewportMatrix = Matrix_New();
}

let drawBatchBuffers = {};

function GetDrawBatchBufferForMaterial(shdrName, vertCt){
	let dbB = drawBatchBuffers[shdrName];
	if( dbB == undefined ){
		dbB = new DrawBatchBuffer(vertCt);
		drawBatchBuffers[shdrName] = dbB;
	}
	return dbB;
}

function CleanUpDrawBatchBuffers(){
	delete( drawBatchBuffers );
	drawBatchBuffers = {};
}


function HavenScene( sceneNameIn, sceneLoadedCallback ){
	this.sceneName = sceneNameIn;
	this.isValid = false;

	//will likely be removed since stored in oct tree and a per scene
	//array of objects may become very big
	this.models  = {};
	this.lights  = [];
	this.cameras = [];

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

	//function members
	this.GetName = function(){ return this.sceneName; }

	//updates the entire scene
	//only parts of the oct tree that are active should be updated
	//(animated objects within the field of view, or area's with 
	//dynamic events occuring) to minimize compute / power required
	//because parts of the scene may be on seperate nodes/comp should be parallelized
	this.Update = function( time ){

		TND_Update(this.octTree, time);

	}

	const maxObjsToDraw = 64;
	let objList = new Array(maxObjsToDraw);
	let objListIdx = 0;

	this.Draw = function(){
		if(!this.isValid){
			DTPrintf(this.sceneName + ' was asked to draw but is not valid', "havenScene: ", 'orange');
			return;
		}
		if(this.activeCameraIdx == -1){
			DTPrintf( this.sceneName + ' was asked to draw but has no active camera', 
				'havenScene: ', 'orange');
			return;
		}

		//draw the scene
		
		
		//after watching how unreal5 nanite works https://youtu.be/TMorJX3Nj6U 
		//(the state of the art polygon rasterizer in 2022)
		//I think that because rasterization cost increases with overdraw 
		//and as the number of polygons increases
		//longterm a render engine based on ray casting rays from the camera 
		//is going to have better performance and realisim
		//than rasterization
		//the problem though is memory usage of loading all objects in the scene
		//at full level of detail, time cost of updating octTrees for animated objects
		//and the non local/upredicatble memory access pattern of ray casting
		//vs scanline rasterization
		
		//having compute in memory per world area will make ray casting/tracing more practical, though
		//until the hardware is commonplace, it's not practical
		
		//then objects can move from one region to another passed
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
		
		//clear the render buffer and reset rendering state
		graphics.Clear();
		graphics.ClearDepth();
		//graphics.ClearLights();
		
		if( rayCastDrawing ){
			//raycasting draw call
			CAM_RayCastDraw( this.cameras[ this.activeCameraIdx ],
				this.octTree, graphics.screenWidth/graphics.screenHeight );
		}else{

			//generate the camera matrix
			let cam = this.cameras[ this.activeCameraIdx ];			
			cam.GenWorldToFromScreenSpaceMats();
			//get the objects in view
			objListIdx = TND_GetObjectsInFrustum( this.octTree, cam.worldToScreenSpaceMat, objList, 0 );
			
			//update the draw batch buffers from the objects
			for( let i = 0; i < objListIdx; ++i ){
				let qm = objList[i].quadmesh;

				for(let matID = 0; matID < qm.materials.length; ++matID ){
					let material = qm.materials[matID];
					let drawBatch = GetDrawBatchBufferForMaterial( material.uid.val*100 + i, qm.faceVertsCt );
					
					Matrix_Multiply( drawBatch.toViewportMatrix, cam.worldToScreenSpaceMat, qm.toWorldMatrix );
					
					if( qm.hasntDrawn || qm.isAnimated ){
						

						drawBatch.bufferIdx = QM_SL_GenerateDrawVertsNormsUVsForMat( qm,
								drawBatch, qm.materials[matID] );

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

			//draw the batch buffers
			TRI_G_Setup(graphics.triGraphics);
			let dbBKeys = Object.keys( drawBatchBuffers );
			for( let i = 0; i < dbBKeys.length; ++i ){
				let dbB = drawBatchBuffers[dbBKeys[i]];
				if(dbB.bufferIdx > MAX_VERTS )
					dbB.bufferIdx = MAX_VERTS;
				
				TRI_G_drawTriangles( graphics.triGraphics, dbB.texName, 
					this.sceneName, dbB.toViewportMatrix, dbB );
				if( dbB.isAnimated )
					dbB.bufferIdx = 0; //repeat refilling values
			}
		
		
		
		/*  //old rasterization code here
		
		
		//with an oct tree, nodes in the camera frustrum should be drawn
		//update objects / lights / cameras to oct tree nodes (parallelizable)
		//update global illumination bounce lighting (trace rays and update textures)
		
		//find the oct tree nodes within in the camera frustrum (paralleizable)
		var frustum = this.cameras[this.activeCameraIdx].GetFrustum();
		var nodesToDraw = OctTree_GetNodesThatOverlapOrAreInsideFrustum(this.octTree, frustum);
		
		
		//for nodes that have changed / are new / have been removed since last frame
		//update them in the render buffer manager (scene graph)
		
		//lights are objects in scene nodes, let them update / affect lighting themselves during updates
		//for(var i=0; i<this.lights.length; ++i)
		//    graphics.BindLight(this.lights[i]);

		//    (using links between model instances and buffer indicies, update the models in parallel)
		//render a frame (gpu does in parallel if using the same shader program)
		this.renderBufferManager.Draw( this.cameras[this.activeCameraIdx], nodesToDraw );
		
		*/
		
		//graphics.Flush();
		}
	}

	//trace a ray from a screen point with the active camera into the scene to find
	//the closest model that was hit (if one was)
	this.HitModel = function(screenCoords)
	{
		var rayOrig;
		var rayDir;
		if(this.activeCameraIdx == -1)
			return "";
		this.cameras[activeCameraIdx].GenerateWorldCoordRay(
										rayOrig, rayDir, screenCoords);
		
		var temp;
		Vect3_Copy(temp, rayDir);
		Vect3_Add(temp, rayOrig);

		return this.octTree.ClosestRayIntersection(rayOrig, rayDir);
	}

	//check if finished asynchronously loading the scene
	this.checkIfIsLoaded = function(){
		if( this.pendingModelsAdded <= 5 )
			DPrintf("models left to load " + this.pendingModelsAdded );
		if( this.isValid && this.pendingModelsAdded <= 0 )
			sceneLoadedCallback(this);
	}


	//constructor functionality begin asynchronous fetch of scene description
	this.pendingModelsAdded = 0;
	loadTextFile("scenes/"+this.sceneName+".hvtScene", 
				HVNSC_textFileLoadedCallback, this);

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
	let numObjs = parseInt( sceneObjLghtCamCtTxt[2] );
	let numLghts = parseInt( sceneObjLghtCamCtTxt[4] );
	let numCams = parseInt( sceneObjLghtCamCtTxt[6] );
	
	//per obj vars while parsing
	let mdlName = '';
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
	
	let camAng = 0;
	let camStart = 0;
	let camEnd = 0;
	
	let txtNumLines = textFileLines.length;
	for( let i = 0; i<txtNumLines; ++i )
	{
		statusElm.innerHTML = "Parsing " + (i+1) + "/" + txtNumLines;
		let txtLineParts = textFileLines[i].split( ' ' );

		if(txtLineParts[0] == 'm' ){ //this is a model to be read in 
		//(load the model and then append it to the scenegraph)
			mdlName = txtLineParts[1];
			mdlMeshName = mdlName;
		}else if( txtLineParts[0] == 'maabb' ){
			Vect3_parse( mdlAABBmin, txtLineParts, 3 );
			Vect3_parse( mdlAABBmax, txtLineParts, 7 );
			
			//try to read in an AABB from the model description line
			//if there aren't values set the not a number flag
			
			if( !Vect3_containsNaN( mdlAABBmin ) && Vect3_containsNaN( mdlAABBmax ) )
				mAABB = new AABB( mdlAABBmin, mdlAABBmax );
				
		}else if( txtLineParts[0] == 'mloc' ){
			Vect3_parse( mdlLoc, txtLineParts, 1 );
		}else if( txtLineParts[0] == 'mrot' ){
			Vect3_parse( mdlRot, txtLineParts, 1 );
		}else if( txtLineParts[0] == 'mEnd' ){
			
			hvnsc.pendingModelsAdded++; //compared in check if is loaded
			//to check if all models have finished loading
			newMdl    = new Model( mdlName, mdlMeshName, 
					        hvnsc.sceneName, mAABB, hvnsc,
			function( model, havenScenePointer ){ //modelLoadedCallback
				MDL_Update( model, 0 ); //update to generate AABB
				MDL_AddToOctTree( model, havenScenePointer.octTree,
					function(){
					    statusElm.innerHTML = "Loading " + havenScenePointer.pendingModelsAdded + " Models";
					    havenScenePointer.pendingModelsAdded-=1;
					    havenScenePointer.checkIfIsLoaded();
					} );
			}
			 );
			
		}
		
		else if( txtLineParts[0] == 'a' ){ //this is an armature to be read in
			
		}
		
		
		
		//lights and cameras are simple to load can be loaded synchronously 
		//as they don't require loading additional files
		//(info is one line in the text file)
		//this is a light to be read in
		else if(txtLineParts[0] == "l"){
			mdlName = txtLineParts[1];
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
		}else if( txtLineParts[0] == 'lEnd' ){
			hvnsc.lights.push( new Light(mdlName, hvnsc.sceneName, 
					lcol, lenrg, lampType, mdlLoc, mdlRot, lspotsz) );
		}
		
		//this is a camera to be read in
		else if(txtLineParts[0] == 'c')
		{
			mdlName	= txtLineParts[1];
		}else if( txtLineParts[0] == 'cloc' ){
			Vect3_parse( mdlLoc, txtLineParts, 1 );
		}else if( txtLineParts[0] == 'crot' ){
			Vect3_parse( mdlRot, txtLineParts, 1 );
		}else if( txtLineParts[0] == 'cang' ){
			camAng = parseFloat( txtLineParts[1] );
		}else if( txtLineParts[0] == 'cstartend' ){
			camStart = parseFloat( txtLineParts[1] );
			camEnd = parseFloat( txtLineParts[2] );
		}else if( txtLineParts[0] == 'cEnd' ){
			hvnsc.cameras.push( new Camera( mdlName, 
			hvnsc.sceneName, camAng, camStart, camEnd, mdlLoc, mdlRot));
		}
		//this is the name of the active camera to be read in
		else if( txtLineParts[0] == 'ac' )
		{
			hvnsc.activeCamera = txtLineParts[1];
			//look up and set its index
			for(let j=0; j<hvnsc.cameras.length; ++j){
				if(hvnsc.cameras[j].cameraName == hvnsc.activeCamera){
					hvnsc.activeCameraIdx = j;
					setCamLimitInputs(hvnsc.cameras[j]);
					break;
				}
			}
		}
	}
	hvnsc.Update(0.0); //init animated objs
	hvnsc.isValid = true;
	hvnsc.checkIfIsLoaded();
}

function HVNSC_textFileLoadedCallback(txtFile, thisP) 
//called after scene description text file has been fetched
{
	let textFileLines = txtFile.split("\n");
	
	//begin loading the scene from text file
	HVNSC_parseSceneTextFile( thisP, textFileLines );
}


