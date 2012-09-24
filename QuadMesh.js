//QuadMesh.

function QuadMesh(nameIn, sceneNameIn){
    var name = nameIn;
    var sceneName = sceneNameIn;

    var isValid = false;
    var isAnimated = false;

    //the orientation matrix
    var scale = [1,1,1];
    var rotation = [0,0,0];
    var origin = [0,0,0];

    var shaderNames = [];

    var facesCt = 0;
    var faces = [];
    var faceVertsCt = 0;

    //the raw mesh data
    var vertsCt = 0;
    var vertPositions = [];
    var vertNormals = [];
    var vertBoneWeights = [];

    //animated mesh
    var keyedPositions = [];
    var skelPositions = [];
    var ipoOriginMatrix = new Array(16);

    //animation classes
    var ipoAnimation  = 0;
    var keyAnimation  = 0;
    var skelAnimation = 0;

    //returns the non tessilated verts. returns new memory
    getWorldSpaceVerts = function() {}


    //using the MeshKeyAnimation, update the current mesh (used by skeletal animation if present) to the current animationFrame
    this.Update = function(animationTime) {}
    this.GetAnimationLength = function() {}

    //used by skeletal animation classes
    this.GetVertsCt = function() { return vertsCt; }
    this.GetVertPosition = function(posRet, idx) {}
    this.GetOrientationMatrix = function(matrixRet) {}

    //used by Model to cache data for later fast lookup
    this.GetVertBoneWeightsSize = function(){ return vertBoneWeights.size(); }
    this.GetVertBoneWeights = function(i) { return vertBoneWeights[i]; }
    this.SetVertBoneWeights = function(i) { return vertBoneWeights[i]; }

    //transformation query functions
    this.GetPosition = function(pos) { Vect3_Copy(pos, origin); }
    this.GetScale = function(scaleOut) { Vect3_Copy(scaleOut, scale); }
    this.GetRotation = function(rotOut) { Vect3_Copy(rotOut, rotation); }
    this.GetWorldSpaceMesh = function(meshOut, meshOutCt) {}
    this.GetFaceVertsCt = function() { return faceVertsCt; }

    //color manipulation functions
    this.GetShaderName = function(shaderNameOut, shaderSceneOut){ shaderNameOut = shaderNames[0]; shaderSceneOut = sceneName; }

    //draw interface
    this.Draw = function(verts, normals, uvs) {}
    this.DrawSkeleton = function() { skelAnimation.Draw(); }

    //type query functions
    this.IsHit = function() {}
    this.IsTransparent = function() { return graphics.GetShader(shaderNames[0], sceneName).IsTransparent(); }

    //geometry query function
    this.GetBoundingPlanes = function(boxPlanes, boxPlanesSize) {}
}