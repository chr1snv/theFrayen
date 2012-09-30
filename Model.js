//Model.js

function Model(nameIn, meshNameIn, sceneNameIn){
    this.modelName = nameIn;
    this.meshName = meshNameIn;
    this.sceneName = sceneNameIn;

    this.modelDrawable = 0;
    this.sceneGraph = 0;

    //modifiers for manipulating the mesh from its default position
    this.scaleOff = new Float32Array(3);
    this.scaleSet = false;
    this.rotationOff = new Float32Array(3);
    this.rotationSet = false;
    this.positionOff = new Float32Array(3);
    this.positionSet = false;
    //modified shader
    this.shaderName = "";
    this.shaderScene = "";

    this.timeUpdate;
    this.optTransformUpdated;

    this.generateModelMatrix = function(ret){}

//public methods
    //Identification / registration functions
    this.AddToSceneGraph = function(sgIn){}
    this.RemoveFromSceneGraph = function(){}

    //animation functions
    this.Update = function(time){}
    this.GetAnimationLength = function() { return Graphics.GetQuadMesh(meshName, sceneName).GetAnimationLength(); }

    //draw transformation manipulation functions
    //getters
    this.GetPosition = function(pos) { graphics.GetQuadMesh(this.meshName, this.sceneName).GetPosition(pos); }
    this.GetScale = function(scaleOut) { Graphics.GetQuadMesh(this.meshName, this.sceneName).GetScale(scaleOut); }
    this.GetRotation = function(rotOut) { Graphics.GetQuadMesh(this.meshName, this.sceneName).GetRotation(rotOut); }
    //setters
    this.SetPosition = function(newPos) { Vect3_Copy(positionOff, newPos); positionSet = true; optTransformUpdated = true; }
    this.SetScale = function(scaleIn){ Vect3_Copy(scaleOff, scaleIn); scaleSet = true; optTransformUpdated = true; }
    this.SetRotation = function(rotNew) { Vect3_Copy(rotationOff, rotNew); rotationSet = true; optTransformUpdated = true; }

    //shader binding functions
    this.GetOriginalShaderName = function(shaderNameOut, sceneNameOut) {}
    this.SetShader = function(shaderNameIn, sceneNameIn) {}
    this.GetShaderName = function(shaderNameOut, sceneNameOut) {}

    //draw functions
    this.GetNumVerts = function(){ return Graphics.GetQuadMesh(this.meshName, this.sceneName).GetFaceVertsCt(); }
    this.Draw = function(frustum, verts, normals, uvs, mustDraw) {}
    this.GetOptTransform = function(retMat)  {}
    this.DrawSkeleton = function(){ Graphics.GetQuadMesh(this.meshName, this.sceneName).DrawSkeleton(); }
    
    //type query functions
    this.IsTransparent = function() { return Graphics.GetShader(this.shaderName, this.shaderScene).IsTransparent(); }
    this.IsHit = function() {return graphics.GetQuadMesh(this.meshName, this.sceneName).IsHit();}

    //geometry query functions
    this.RayIntersects = function(t, rayOrig, rayDir) {}
    this.GetBoundingPlanes = function(bPs, bpSize) {}
};
