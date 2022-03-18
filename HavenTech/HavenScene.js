//HavenScene.js

//haven scenes are collections of models, lights, cameras, etc
//that make up an enviroment (area) in a haven tech game
//they may be layered as with a menu or ui placed on top of a scene

//haven scene handles loading (saving to be added) from a text file
//and updating per frame the objects in it

//drawing is handled by scene graphs 

function HavenScene(sceneNameIn, sceneLoadedCallback)
{
    this.sceneName = sceneNameIn;
    this.isValid = false;

    this.models = {};
    this.lights = [];
    this.cameras = [];

    this.activeCamera = "";
    this.activeCameraIdx = -1;

    this.sceneGraph = new SceneGraph(this.sceneName);
    this.hitSceneGraph = new SceneGraph();

    this.framesSec = 25.0;

    //function members
    this.GetName = function(){ return this.sceneName; }
    this.Update = function(time, updateCompleteCb)
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
        graphics.ClearDepth();
        graphics.ClearLights();
        for(var i=0; i<this.lights.length; ++i)
            graphics.BindLight(this.lights[i]);
        this.sceneGraph.Draw(this.cameras[this.activeCameraIdx]);
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

        return this.hitSceneGraph.ClosestRayIntersection(rayOrig, rayDir);
    }

    //check if finished asynchronously loading the scene
    this.checkIfIsLoaded = function(){
        if( this.isValid && this.pendingModelsAdded <= 0 )
            sceneLoadedCallback(this);
    }
    
    //called to read from text file models, lights, and cameras in the scene
    this.parseSceneTextFile = function( thisSceneP )
    {
    	var lastModelName = undefined;
    	var i = 0;
        while( i<thisSceneP.textFileLines.length )
        {
            var temp = thisSceneP.textFileLines[i++];
            //this is a model to be read in
            if(temp[0] == 'm')
            {
                var words = temp.split(' ');
                var modelName = words[1];
                var modelMeshName = modelName;
                if( thisSceneP.models[modelName] != undefined ) //if the model is already loaded don't re instantiate / load it
                {
                	lastModelName = modelName;
                }else{
                	var newMdl    = new Model(modelName, modelMeshName, thisSceneP.sceneName, thisSceneP,
                                          thisSceneP.loadScene );
                	//wait for the model to load before continuing
                	return;
                }
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
    
    //called when the text file is finished loading and after a model has finished loading
    //this is a mess because the stack gets deeper each time a model is loaded, and the text file starts loading from
    //the beginning again
    //need to switch it to a non recursive
    //polling main loop load where the model loads are put in seperate threads and rendering and gameplay 
    this.loadScene = function(newMdl, thisSceneP)
    {
        if( newMdl != undefined )
        {
            thisSceneP.models[newMdl.modelName] = newMdl;
            //register the model with the proper SceneGraph
            thisSceneP.pendingModelsAdded++;

            newMdl.IsHit({1:newMdl, 2:thisSceneP}, function(isHit, cbObj){
                if( isHit )
                    newMdl.AddToSceneGraph(thisSceneP.hitSceneGraph,
                        function(){thisSceneP.pendingModelsAdded-=1; thisSceneP.checkIfIsLoaded();});
                else //regular model
                     newMdl.AddToSceneGraph(thisSceneP.sceneGraph,
                        function(){thisSceneP.pendingModelsAdded-=1; thisSceneP.checkIfIsLoaded();});
    
                thisSceneP.loadScene2( cbObj[1], cbObj[2]);
            });
        }else{
            thisSceneP.loadScene2( newMdl, thisSceneP); //newMdl = undefined in this case
        }
    }

	this.textFileLoadedCallback = function(txtFile, thisP) //called after scene description text file has been fetched
    {
    	thisP.textFileLines = txtFile.split("\n");
    	var i = 0;
    	//begin loading the scene from text file
    	thisP.loadScene(undefined, thisP);
    }

    //constructor functionality begin asynchronous fetch of scene description
    this.pendingModelsAdded = 0;
    loadTextFile("scenes/"+this.sceneName+".hvtScene", this.textFileLoadedCallback, this);
    
}


