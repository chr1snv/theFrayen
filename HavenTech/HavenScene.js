//HavenScene.js

//haven scenes are collections of models, lights, cameras, etc
//that make up an enviroment (area) in a haven tech game
//they may be layered as with a menu or ui placed on top of a scene

//haven scene handles loading (saving to be added) from a text file
//and updating per frame the objects in it

//drawing is handled by scene graphs 

function HavenScene( sceneNameIn, sceneLoadedCallback )
{
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
    this.octTree = new TreeNode( 0, [-10000, -10000, -10000], 
                                    [ 10000,  10000,  10000], null );
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
            DPrintf('havenScene: ' + this.sceneName + 
                    ' was asked to draw but is not valid');
            return;
        }
        if(this.activeCameraIdx == -1)
        {
            DPrintf('havenScene: ' + this.sceneName + 
                    ' was asked to draw but has no active camera');
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
        var numRaysToTrace = 5000;
        this.cameras[ this.activeCameraIdx ].RayTraceDraw( 
            this.octTree, graphics.screenWidth, graphics.screenHeight, 
            graphics.GetScreenAspect(), numRaysToTrace );
        
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
    this.parseSceneTextFile = function( thisSceneP )
    {
    	
        for( var i = 0; i<thisSceneP.textFileLines.length; ++i )
        {
            var temp = thisSceneP.textFileLines[i];
            
            if(temp[0] == 'm') //this is a model to be read in 
            //(load the model and then append it to the scenegraph)
            {
                var words = temp.split(' ');
                var modelName = words[1];
                var modelMeshName = modelName;
                /*
                var AABBVecs = [ [ parseFloat(words[3]), 
                                   parseFloat(words[4]), 
                                   parseFloat(words[5]) ],  //min
                                 [ parseFloat(words[7]), 
                                   parseFloat(words[8]), 
                                   parseFloat(words[9]) ] ] //max;
                //try to read in an AABB from the model description line
                //if there aren't values set the not a number flag
                var nanValue = false;
                for( var vecIdx = 0; vecIdx < 2; ++vecIdx ){
                    var aabbVec = AABBVecs[vecIdx];
                    for( var a = 0; a < aabbVec.length; ++a ){
                        if( aabbVec[a] != aabbVec[a] ){
                            nanValue = true;
                            break;
                        }
                    }
                }
                var mAABB = null;
                if( nanValue == false )
                    mAABB = new AABB( AABBMin, AABBMax );
                */
                thisSceneP.pendingModelsAdded++; //compared in check if is loaded
                //to check if all models have finished loading
                newMdl    = new Model( modelName, modelMeshName, 
                                thisSceneP.sceneName, /*mAABB,*/ thisSceneP,
                function( model, havenScenePointer ){ //modelLoadedCallback
                    model.Update( 0 ); //update to generate AABB
                    model.AddToOctTree( havenScenePointer.octTree,
                        function(){
                            thisSceneP.pendingModelsAdded-=1;
                            thisSceneP.checkIfIsLoaded();
                        } );
                }
                 );
                
            }
            //lights and cameras are simple to load can be loaded synchronously 
            //as they don't require loading additional files
            //(info is one line in the text file)
            //this is a light to be read in
            if(temp[0] == "l")
            {
                var words = temp.split(' ');
                
                var lampName  = words[1];
                var lightType = parseInt(words[2]);
                var pos       = [ parseFloat(words[3]),  
                                  parseFloat(words[4]),  
                                  parseFloat(words[5]) ];
                var rot       = [ parseFloat(words[6]),  
                                  parseFloat(words[7]),  
                                  parseFloat(words[8]) ];
                var col       = [ parseFloat(words[9]),  
                                  parseFloat(words[10]), 
                                  parseFloat(words[11]) ];
                var intensity = parseFloat(words[12]);
                var coneAngle = parseFloat(words[13]);
                thisSceneP.lights.push( new Light(lampName, thisSceneP.sceneName, 
                        col, intensity, lightType, pos, rot, coneAngle) );
            }
            //this is a camera to be read in
            if(temp[0] == 'c')
            {
                var words      = temp.split(' ');
                var cameraName = words[1];
                var pos        = [ parseFloat(words[2]), 
                                   parseFloat(words[3]),  
                                   parseFloat(words[4]) ];
                var rot        = [ parseFloat(words[5]), 
                                   parseFloat(words[6]),  
                                   parseFloat(words[7]) ];
                var angle      =   parseFloat(words[8]);
                var clipStart  =   parseFloat(words[9]);
                var clipEnd    =   parseFloat(words[10]);
                thisSceneP.cameras.push( new Camera(cameraName, 
                thisSceneP.sceneName, angle, clipStart, clipEnd, pos, rot));
            }
            //this is the name of the active camera to be read in
            if(temp[0] == 'a' && temp[1] == 'c')
            {
                var words = temp.split(' ');
                thisSceneP.activeCamera = words[1];
                //look up and set its index
                for(var j=0; j<thisSceneP.cameras.length; ++j)
                {
                    if(thisSceneP.cameras[j].cameraName == thisSceneP.activeCamera)
                        thisSceneP.activeCameraIdx = j;
                }
            }
        }
        thisSceneP.Update(0.0); //init animated objs
        thisSceneP.isValid = true;
        thisSceneP.checkIfIsLoaded();
    }

	this.textFileLoadedCallback = function(txtFile, thisP) 
	//called after scene description text file has been fetched
    {
    	thisP.textFileLines = txtFile.split("\n");
    	
    	//begin loading the scene from text file
    	thisP.parseSceneTextFile( thisP );
    }

    //constructor functionality begin asynchronous fetch of scene description
    this.pendingModelsAdded = 0;
    loadTextFile("scenes/"+this.sceneName+".hvtScene", 
                 this.textFileLoadedCallback, this);
    
}


