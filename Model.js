//Model.js

function Model(nameIn, meshNameIn, sceneNameIn){
    var mname = nameIn;
    var meshName = meshNameIn;
    var sceneName = sceneNameIn;

    var modelDrawable = 0;
    var sceneGraph = 0;

    //modifiers for manipulating the mesh from its default position
    var scaleOff = new Float32Array(3);
    var scaleSet = false;
    var rotationOff = new Float32Array(3);
    var rotationSet = false;
    var positionOff = new Float32Array(3);
    var positionSet = false;
    //modified shader
    var shaderName = "";
    var shaderScene = "";

    var timeUpdate;
    var optTransformUpdated;

    var generateModelMatrix = function(ret){}

//public methods
    //Identification / registration functions
    this.GetName = function(){ return name; }
    this.AddToSceneGraph = function(sgIn){}
    this.RemoveFromSceneGraph = function(){}

    //animation functions
    this.Update = function(time){}
    this.GetAnimationLength = function() { return Graphics.GetQuadMesh(meshName, sceneName).GetAnimationLength(); }

    //draw transformation manipulation functions
    //getters
    this.GetPosition = function(pos) { Graphics.GetQuadMesh(meshName, sceneName).GetPosition(pos); }
    this.GetScale = function(scaleOut) { Graphics.GetQuadMesh(meshName, sceneName).GetScale(scaleOut); }
    this.GetRotation = function(rotOut) { Graphics.GetQuadMesh(meshName, sceneName).GetRotation(rotOut); }
    //setters
    this.SetPosition = function(newPos) { Vect3_Copy(positionOff, newPos); positionSet = true; optTransformUpdated = true; }
    this.SetScale = function(scaleIn){ Vect3_Copy(scaleOff, scaleIn); scaleSet = true; optTransformUpdated = true; }
    this.SetRotation = function(rotNew) { Vect3_Copy(rotationOff, rotNew); rotationSet = true; optTransformUpdated = true; }

    //shader binding functions
    this.GetOriginalShaderName = function(shaderNameOut, sceneNameOut) {}
    this.SetShader = function(shaderNameIn, sceneNameIn) {}
    this.GetShaderName = function(shaderNameOut, sceneNameOut) {}

    //draw functions
    this.GetNumVerts = function(){ return Graphics.GetQuadMesh(meshName, sceneName).GetFaceVertsCt(); }
    this.Draw = function(frustum, verts, normals, uvs, mustDraw) {}
    this.GetOptTransform = function(retMat)  {}
    this.DrawSkeleton = function(){ Graphics.GetQuadMesh(meshName, sceneName).DrawSkeleton(); }
    
    //type query functions
    this.IsTransparent = function() { return Graphics.GetShader(shaderName, shaderScene).IsTransparent(); }
    this.IsHit = function() {return graphics.GetQuadMesh(meshName, sceneName).IsHit();}

    //geometry query functions
    this.RayIntersects = function(t, rayOrig, rayDir) {}
    this.GetBoundingPlanes = function(bPs, bpSize) {}
    this.GetMeshName = function(){ return meshName; }
};
