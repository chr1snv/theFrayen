//SceneGraph.js

function ShaderDrawablePair(){
    this.startIndex=0;       //scenegraph buffer index
    this.drawable;
    this.mustDraw;
    this.usesOptTransform;
    this.optTransform = new Float32Array(4*4);
} ShaderDrawablePair;

function SceneGraph()
{
    this.vecVec = []; //the object vectors (transparent & opaque)
    this.vecVec.push(new Array()); this.vecVec.push(new Array());

    var vertexBufferID = 0;
    var normalBufferID = 0;
    var uvBufferID = 0;

    var vertCard = 3;
    var normCard = 3;
    var uvCard   = 2;

    var desiredVerts = 0;
    var allocatedVerts = 256;
    var verts = new Float32Array(256*vertCard);
    var normals = new Float32Array(256*normCard);
    var uvs = new Float32Array(256*uvCard);

    var alterAllocationSize = function(sizeDelta){
    }
    var setDrawFlags = function(whichVec, whichElm){
    }
    var uploadGeometry = function(startIdx, numVerts){
    }

//public methods
    //adds a drawable to the scene and returns its name
    this.Add = function(newDrawable){
    }
    
    //removes the drawable with the given name from the scene
    this.Remove = function(newDrawable){
    }
    
    //draws the drawables that are within the frustrum
    this.Draw = function(frustum){
    }

    //returns the closest model that the given ray intersects
    this.ClosestRayIntersection = function(rayOrig, rayDir){
    }
};
