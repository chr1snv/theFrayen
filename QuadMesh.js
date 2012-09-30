//QuadMesh.

function QuadMesh(nameIn, sceneNameIn){
    this.name = nameIn;
    this.sceneName = sceneNameIn;

    this.isValid = false;
    this.isAnimated = false;

    //the orientation matrix
    this.scale = [1,1,1];
    this.rotation = [0,0,0];
    this.origin = [0,0,0];

    this.shaderNames = [];

    this.facesCt = 0;
    this.faces = [];
    this.faceVertsCt = 0;

    //the raw mesh data
    this.vertsCt = 0;
    this.vertPositions = [];
    this.vertNormals = [];
    this.vertBoneWeights = [];

    //animated mesh
    this.keyedPositions = [];
    this.skelPositions = [];
    this.ipoOriginMatrix = new Array(16);

    //animation classes
    this.ipoAnimation  = 0;
    this.keyAnimation  = 0;
    this.skelAnimation = 0;

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
