//HavenScene.js
//to request use or code/art please contact chris@itemfactorystudio.com

//haven scenes are collections of models, lights, cameras, etc
//that make up an enviroment (area) in a haven tech game
//they may be layered as with a menu or ui placed on top of a scene

//haven scene handles loading (saving to be added) from a text file
//and updating per frame the objects in it

//drawing is handled by scene graphs 

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
	this.Update = function( time )
	{

		//    for( var i=0; i<nodesToDraw; ++i ){
		//            nodesToDraw[i].Update(time, undefined, updateLoop);
		//        }

		this.octTree.Update(time);

		/*
		//from before with flat array for scene
		//now updated by oct tree for parallelisim / distributive computing
		var c = 0;
		var thisP = this;
		//update the models, lights and cameras
		for( var m = 0; m < thisP.models.length; ++m ){
			thisP.models[m].Update( time );
		}
		for( var l = 0; l < this.lights.length; ++l ){
			this.lights[l].Update(time);
		}
		while(c < this.cameras.length){
			this.cameras[c++].Update(time);
			return;
		}
		*/
	}
	this.Draw = function()
	{
		if(!this.isValid)
		{
			DTPrintf(this.sceneName + ' was asked to draw but is not valid', "havenScene: ", 'orange');
			return;
		}
		if(this.activeCameraIdx == -1)
		{
			DTPrintf( this.sceneName + ' was asked to draw but has no active camera', 'havenScene: ', 'orange');
			return;
		}

		//draw the scene
		
		//clear the render buffer and reset rendering state
		//graphics.Clear();
		//graphics.ClearDepth();
		//graphics.ClearLights();
		
		//after watching how unreal5 nanite works https://youtu.be/TMorJX3Nj6U 
		//(the state of the art polygon rasterizer in 2022)
		//I think that because rasterization cost increases with overdraw 
		//and as the number of polygons increases
		//longterm a render engine based on ray tracing rays from the camera 
		//is going to have better performance and realisim
		//than rasterization
		//the goal of this game / simulation engine is to mimic reality as much
		//as possible with the best performance
		//so I think it makes sense (and the code is going to be simpler) 
		//with an architecture of tracing rays from the camera
		//(conceptually initiating requests from camera)
		//and simulating dynamics / moving objects with cpu/general purpose 
		//compute and memory per world area
		//the compute may / may not be syncronized between world regions, 
		//and as objects move from one region to another they are passed
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
		
		
		//raytracing draw call
		this.cameras[ this.activeCameraIdx ].RayTraceDraw( 
		 this.octTree, graphics.screenWidth/graphics.screenHeight );
		
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

	//called to read from text file models, lights, and cameras in the scene
	this.parseSceneTextFile = function( textFileLines )
	{
	
		let sceneAABBDimTxt = textFileLines[textFileLines.length-2].split(' ');
		let sceneMin = Vect3_New( 
			parseFloat( sceneAABBDimTxt[1] ), 
			parseFloat( sceneAABBDimTxt[2] ), 
			parseFloat( sceneAABBDimTxt[3] ) );
		let sceneMax = Vect3_New( 
			parseFloat( sceneAABBDimTxt[5] ), 
			parseFloat( sceneAABBDimTxt[6] ), 
			parseFloat( sceneAABBDimTxt[7] ) );
		this.octTree = new TreeNode( sceneMin, sceneMax, null );
		this.octTree.name = this.sceneName + " scene";
		
		let sceneObjLghtCamCtTxt = textFileLines[textFileLines.length-3].split(' ');
		let numObjs = parseInt( sceneObjLghtCamCtTxt[2] );
		let numLghts = parseInt( sceneObjLghtCamCtTxt[4] );
		let numCams = parseInt( sceneObjLghtCamCtTxt[6] );
		
		
		let mdlName = '';
		let mdlMeshName = '';
		let mAABB = null;
		let mdlAABBmin = Vect3_NewZero();
		let mdlAABBmax = Vect3_NewZero();
		let mdlLoc = Vect3_NewZero();
		let mdlRot = Vect3_NewZero();
		let lcol = Vect3_NewZero();
		let lenrg = 0;
		let lspotsz = 0;
		
		let camAng = 0;
		let camStart = 0;
		let camEnd = 0;
		
		for( let i = 0; i<textFileLines.length; ++i )
		{
			statusElm.innerHTML = "Parsing " + (i+1) + "/" + textFileLines.length;
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
				
				this.pendingModelsAdded++; //compared in check if is loaded
				//to check if all models have finished loading
				newMdl    = new Model( mdlName, mdlMeshName, 
						        this.sceneName, mAABB, this,
				function( model, havenScenePointer ){ //modelLoadedCallback
					model.Update( 0 ); //update to generate AABB
					model.AddToOctTree( havenScenePointer.octTree,
						function(){
						    statusElm.innerHTML = "Loading " + havenScenePointer.pendingModelsAdded + " Models";
						    havenScenePointer.pendingModelsAdded-=1;
						    havenScenePointer.checkIfIsLoaded();
						} );
				}
				 );
				
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
				this.lights.push( new Light(mdlName, this.sceneName, 
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
				this.cameras.push( new Camera( mdlName, 
				this.sceneName, camAng, camStart, camEnd, mdlLoc, mdlRot));
			}
			//this is the name of the active camera to be read in
			else if( txtLineParts[0] == 'ac' )
			{
				this.activeCamera = txtLineParts[1];
				//look up and set its index
				for(let j=0; j<this.cameras.length; ++j){
					if(this.cameras[j].cameraName == this.activeCamera)
						this.activeCameraIdx = j;
				}
			}
		}
		this.Update(0.0); //init animated objs
		this.isValid = true;
		this.checkIfIsLoaded();
	}

	this.textFileLoadedCallback = function(txtFile, thisP) 
	//called after scene description text file has been fetched
	{
		let textFileLines = txtFile.split("\n");
		
		//begin loading the scene from text file
		thisP.parseSceneTextFile( textFileLines );
	}

	//constructor functionality begin asynchronous fetch of scene description
	this.pendingModelsAdded = 0;
	loadTextFile("scenes/"+this.sceneName+".hvtScene", 
				this.textFileLoadedCallback, this);

}


