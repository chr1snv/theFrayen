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

    this.models  = {};
    this.lights  = [];
    this.cameras = [];

    this.activeCamera = "";
    this.activeCameraIdx = -1;

    //the main structure for holding scene elements
    this.octTree = new TreeNode( 0, [-10000, -10000, -10000], [10000, 10000, 10000], null );
    //using the camera frustum only objects within view can be drawn / simulated in high fidelity

    this.framesSec = 25.0;
    
    //gl graphics card memory managment for rasterizing scene objects
    this.renderBufferManager = new RenderBufferManager( this.sceneName );

    //function members
    this.GetName = function(){ return this.sceneName; }
    
    this.Update = function( time, updateCompleteCb )
    {
        var m = 0;
        var l = 0;
        var c = 0;
        var thisP = this;
        var updateLoop = function(){
            //update the models, lights and cameras
            while( m < thisP.models.length ){
                thisP.models[m++].Update(time, undefined, updateLoop);
                return;
            }
            while(l < this.lights.length){
                this.lights[l++].Update(time);
                return;
            }
            while(c < this.cameras.length){
                this.cameras[c++].Update(time);
                return;
            }
            updateCompleteCb();
        }
    }
    this.Draw = function()
    {
        if(!this.isValid)
        {
            DPrintf('havenScene: ' + this.sceneName + ' was asked to draw but is not valid');
            return;
        }
        if(this.activeCameraIdx == -1)
        {
            DPrintf('havenScene: ' + this.sceneName + ' was asked to draw but has no active camera');
            return;
        }

        //draw the scene
        
        //clear the render buffer and reset rendering state
        graphics.ClearDepth();
        graphics.ClearLights();
        
        //with an oct tree, should it draw each node in the camera frustrum
        //update objects / lights / cameras to oct tree nodes (parallelizable)
        //update global illumination bounce lighting (trace rays and update textures)
        
        
        //find the oct tree nodes in the camera frustrum (paralleizable)
        var frustum = this.cameras[this.activeCameraIdx].GetFrustum();
        var nodesToDraw = OctTree_GetNodesInFrustum(this.octTree, frustum);
        
        //for nodes that have changed / are new / have been removed since last frame
        //update them in the render buffer manager (scene graph)
        for(var i=0; i<this.lights.length; ++i)
            graphics.BindLight(this.lights[i]);
            
        //    (using links between model instances and buffer indicies, update the models in parallel)
        //render a frame (gpu does in parallel if using the same shader program)
        this.renderBufferManager.Draw(this.cameras[this.activeCameraIdx]);
        graphics.Flush();
    }

    //trace a ray from a screen point with the active camera into the scene to find
    //the closest model that was hit (if one was)
    this.HitModel = function(screenCoords)
    {
        var rayOrig;
        var rayDir;
        if(this.activeCameraIdx == -1)
            return "";
        this.cameras[activeCameraIdx].GenerateWorldCoordRay(rayOrig, rayDir, screenCoords);
        
        var temp;
        Vect3_Copy(temp, rayDir);
        Vect3_Add(temp, rayOrig);

        return this.octTree.ClosestRayIntersection(rayOrig, rayDir);
    }

    //check if finished asynchronously loading the scene
    this.checkIfIsLoaded = function(){
        if( this.isValid && this.pendingModelsAdded <= 0 )
            sceneLoadedCallback(this);
    }
    
    //called to read from text file models, lights, and cameras in the scene
    this.parseSceneTextFile = function( thisSceneP )
    {
    	
        for( var i = 0; i<thisSceneP.textFileLines.length; ++i )
        {
            var temp = thisSceneP.textFileLines[i];
            
            if(temp[0] == 'm') //this is a model to be read in (load the model and then append it to the scenegraph)
            {
                var words = temp.split(' ');
                var modelName = words[1];
                var modelMeshName = modelName;
                var AABB = [ parseFloat(words[2]), parseFloat(words[3]), parseFloat(words[4]),   //min coord
                             parseFloat(words[5]), parseFloat(words[6]), parseFloat(words[7]) ]; //max coord
                thisSceneP.pendingModelsAdded++;
                //          new Model(    nameIn,    meshNameIn,          sceneNameIn, AABB, modelLoadedParameters,   modelLoadedCallback )
                newMdl    = new Model( modelName, modelMeshName, thisSceneP.sceneName, AABB,            thisSceneP,
                function( model, havenScenePointer ){ //modelLoadedCallback
                   model.AddToOctTree( havenScenePointer.octTree,
                    function(){
                      thisSceneP.pendingModelsAdded-=1;
                      thisSceneP.checkIfIsLoaded();
                    }
                   );
                }
                 );
                
            }
            //lights and cameras are simple to load can be loaded synchronously as they don't require loading additional files
            //(info is one line in the text file)
            //this is a light to be read in
            if(temp[0] == "l")
            {
                var words = temp.split(' ');
                
                var lampName  = words[1];
                var lightType = parseInt(words[2]);
                var pos       = [ parseFloat(words[3]),  parseFloat(words[4]),  parseFloat(words[5]) ];
                var rot       = [ parseFloat(words[6]),  parseFloat(words[7]),  parseFloat(words[8]) ];
                var col       = [ parseFloat(words[9]),  parseFloat(words[10]), parseFloat(words[11]) ];
                var intensity = parseFloat(words[12]);
                var coneAngle = parseFloat(words[13]);
                thisSceneP.lights.push( new Light(lampName, thisSceneP.sceneName, col, intensity, lightType, pos, rot, coneAngle) );
            }
            //this is a camera to be read in
            if(temp[0] == 'c')
            {
                var words      = temp.split(' ');
                var cameraName = words[1];
                var pos        = [ parseFloat(words[2]), parseFloat(words[3]),  parseFloat(words[4]) ];
                var rot        = [ parseFloat(words[5]), parseFloat(words[6]),  parseFloat(words[7]) ];
                var angle      =   parseFloat(words[8]);
                var clipStart  =   parseFloat(words[9]);
                var clipEnd    =   parseFloat(words[10]);
                thisSceneP.cameras.push(new Camera(cameraName, thisSceneP.sceneName, angle, clipStart, clipEnd, pos, rot));
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

	this.textFileLoadedCallback = function(txtFile, thisP) //called after scene description text file has been fetched
    {
    	thisP.textFileLines = txtFile.split("\n");
    	
    	//begin loading the scene from text file
    	thisP.parseSceneTextFile( thisP );
    }

    //constructor functionality begin asynchronous fetch of scene description
    this.pendingModelsAdded = 0;
    loadTextFile("scenes/"+this.sceneName+".hvtScene", this.textFileLoadedCallback, this);
    
}


