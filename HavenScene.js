//HavenScene.js

function HavenScene(sceneName){
this.sceneName = sceneName;
this.isValid = false;

this.models = {};
this.lights = [];
this.cameras = [];

this.activeCamera = "";
this.activeCameraIdx = -1;

this.sceneGraph = new SceneGraph();
this.hitSceneGraph = new SceneGraph();

this.framesSec = 25.0;

//function members
this.GetName = function(){ return this.sceneName; }
this.Update = function(time){
    //update the models, lights and cameras
    for(var mdl in this.models)
        this.models[mdl].Update(time);
    for(var light in this.lights)
        this.lights[light].Update(time);
    for(var cam in this.cameras)
        this.cameras[cam].Update(time);
}
this.Draw = function(){
    if(!this.isValid)
        return;
    if(this.activeCameraIdx == -1)
        return;
        
    alert('in Havenscene Draw');
    
    this.cameras[this.activeCameraIdx].applyTransform();
    
    //draw the scene
    graphics.ClearDepth();
    graphics.ClearLights();
    for(var i=0; i<this.lights.length; ++i)
        graphics.BindLight(this.lights[i]);
    this.sceneGraph.Draw(this.cameras[this.activeCameraIdx].GetFrustum());
}

this.HitModel = function(screenCoords){
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

var parseSceneFile = function(txtFile, thisP){
    var textFileLines = txtFile.responseText.split("\n");
    var discard = '0';
    var pos = new Float32Array(3);
    var rot = new Float32Array(3);
    var col = new Float32Array(3);
    var intensity = 0.0;
    var lightType = 0;
    var coneAngle = 0.0;
    for(var i=0; i<textFileLines.length; ++i)
    {
        var temp = textFileLines[i];
        //this is a model to be read in
        if(temp[0] == 'm'){
            var words = temp.split(' ');
            var modelName = words[1];
            var newMdl = new Model(modelName, modelName, sceneName);
            thisP.models[modelName] = newMdl;
            //register the model with the proper SceneGraph
            if(newMdl.IsHit())
                newMdl.AddToSceneGraph(thisP.hitSceneGraph);
            else
                newMdl.AddToSceneGraph(thisP.sceneGraph);
        }
        //this is a light to be read in
        if(temp[0] == "l"){
            var words = temp.split(' ');
            
            var lampName = words[1];
            var lightType = parseInt(words[2]);
            pos[0] = words[3]; pos[1] = words[4]; pos[2] = words[5];
            rot[0] = words[6]; rot[1] = words[7]; rot[2] = words[8];
            col[0] = words[9]; col[1] = words[10];col[2] = words[11];
            intensity = words[12];
            coneAngle = words[13];
            thisP.lights.push(new Light(lampName, sceneName, col, intensity, lightType, pos, rot, coneAngle));
        }
        //this is a camera to be read in
        if(temp[0] == 'c'){
            var words = temp.split(' ');
            var angle, clipStart, clipEnd;
            cameraName = words[1];
            pos[0] = words[2]; pos[1] = words[3]; pos[2] = words[4];
            rot[0] = words[5]; rot[1] = words[6]; rot[2] = words[7];
            angle = words[8]; clipStart = words[9]; clipEnd = words[10];
            thisP.cameras.push(new Camera(cameraName, sceneName, angle, clipStart, clipEnd, pos, rot));
        }
        //this is the name of the active camera to be read in
        if(temp[0] == 'a' && temp[1] == 'c'){
            var words = temp.split(' ');
            thisP.activeCamera = words[1];
            //look up and set its index
            for(var j=0; j<thisP.cameras.length; ++j)
                if(thisP.cameras[j].GetName() == thisP.activeCamera)
                    thisP.activeCameraIdx = j;
        }
    }
    thisP.isValid = true;
    thisP.Update(0.0); //init animated objs
}

var fileName = "scenes/"+sceneName+".hvtScene";
loadTextFile(fileName, parseSceneFile, this);
}


