//Model.js

function Model(nameIn, meshNameIn, sceneNameIn, modelLoadedParameters, modelLoadedCallback){

    this.generateModelMatrix = function( completeCallback ){
        //get the quadMesh transformationMatrix
        var quadMeshMatrix = new Float32Array(4*4);
        var quadMesh = graphics.GetQuadMesh(meshNameIn, sceneNameIn);
        var pos      = new Float32Array(3); quadMesh.GetPosition(pos);
        var rot      = new Float32Array(3); quadMesh.GetPosition(rot);
        var scale    = new Float32Array(3); quadMesh.GetPosition(scale);
        Matrix(quadMeshMatrix, MatrixType.euler_transformation, scale, rot, pos);

        //calculate the set transformation matrix
        var offsetMatrix = new Float32Array(4*4);
        Matrix(offsetMatrix,
               MatrixType.euler_transformation,
               this.scaleOff, this.rotationOff, new Float32Array([0,0,0]));
        var transformation = new Float32Array(4*4);
        Matrix_Multiply( transformation, offsetMatrix, quadMeshMatrix );
        transformation[0*4+3] += this.positionOff[0];
        transformation[1*4+3] += this.positionOff[1];
        transformation[2*4+3] += this.positionOff[2];

        completeCallback( transformation );
    }

//public methods
    //Identification / registration functions
    this.AddToSceneGraph = function(sgIn, addCompletedCallback){
        if( sgIn == null)
            return;
        this.RemoveFromSceneGraph();
        this.sceneGraph = sgIn;
        this.sceneGraph.Add(this, addCompletedCallback);
    }
    this.RemoveFromSceneGraph = function(){
        if(this.sceneGraph != null){
            this.sceneGraph.Remove(this);
            this.sceneGraph = null;
        }
    }

    //animation functions
    this.Update = function(time)
    {
        graphics.GetQuadMesh(this.meshName, this.sceneName).Update(time);
        this.timeUpdate = true;
    }
    this.GetAnimationLength = function() { return graphics.GetQuadMesh(meshName, sceneName).GetAnimationLength(); }

    //draw transformation manipulation functions
    //getters
    this.GetPosition = function(pos) { graphics.GetQuadMesh(this.meshName, this.sceneName).GetPosition(pos); }
    this.GetScale = function(scaleOut) { graphics.GetQuadMesh(this.meshName, this.sceneName).GetScale(scaleOut); }
    this.GetRotation = function(rotOut) { graphics.GetQuadMesh(this.meshName, this.sceneName).GetRotation(rotOut); }
    //setters
    this.SetPosition = function(newPos) { Vect3_Copy(positionOff, newPos); positionSet = true; optTransformUpdated = true; }
    this.SetScale = function(scaleIn){ Vect3_Copy(scaleOff, scaleIn); scaleSet = true; optTransformUpdated = true; }
    this.SetRotation = function(rotNew) { Vect3_Copy(rotationOff, rotNew); rotationSet = true; optTransformUpdated = true; }

    //shader binding functions
    this.GetOriginalShaderName = function(shaderNameOut, sceneNameOut) {
        var sNameArr  = graphics.GetQuadMesh( meshName, sceneName).GetShaderName();
        shaderNameOut = sNameArr[0];
        sceneNameOut  = sNameArr[1];
    }
    this.SetShader = function(shaderNameIn, sceneNameIn) {
        //this function may not be used
        var currentSceneGraph = this.sceneGraph;
        this.RemoveFromSceneGraph();
        this.shaderName = shaderNameIn;
        this.shaderScene = sceneNameIn;
        this.AddToSceneGraph(currentSceneGraph);

    }

    //draw functions
    this.GetNumVerts = function(){ return graphics.GetQuadMesh(this.meshName, this.sceneName).faceVertsCt; }
    this.Draw = function( frustum, verts, normals, uvs, modelTransform, mustDraw, completeCallback )
    {
        if(this.timeUpdate || mustDraw)
        {
            this.generateModelMatrix(function(){
                graphics.GetQuadMesh(this.meshName, this.sceneName, function(quadMesh){
                    quadMesh.Draw(verts, normals, uvs);
                    this.timeUpdate = false; //clear the time update flag
                    completeCallback( true );
                });
            });
        }
        completeCallback( false );
    }
    this.GetOptTransform = function(retMat)  {
        if( optTransformUpdated )
            this.generateModelMatrix(retMat);
        return scaleSet || rotationSet || positionSet;
    }
    this.DrawSkeleton = function(){ graphics.GetQuadMesh(this.meshName, this.sceneName).DrawSkeleton(); }
    
    //type query functions
    this.IsTransparent = function(isTransparentCallback) {
        graphics.GetShader(this.shaderName, this.shaderScene, {},
                        function( shader, unused ){ isTransparentCallback(shader.IsTransparent()); });
    }
    this.IsHit = function() {return graphics.GetQuadMesh(this.meshName, this.sceneName).IsHit();}

    //geometry query functions
    this.RayIntersects = function(t, rayOrig, rayDir) {
        if(!IsHit())
            return false;

        var meshVertsCt = graphics.GetQuadMesh(meshName, sceneName).faceVertsCt;
        var meshVerts = new Float32Array[meshVertsCt*graphics.vertCard];
        graphicsGetQuadMesh(meshName, sceneName).GetWorldSpaceMesh(meshVerts, meshVertsCt);
        
        //apply the model orientation matrix
        var transformation = new Float32Array(4*4);
        var temp = new Float32Array(4*4);
        this.generateModelMatrix(transformation);

        var transformedPositions = new GLfloat[meshVertsCt*vertCard];
        Matrix_Multiply_Array3(transformedPositions, meshVertsCt*vertCard, transformation, meshVerts);
        
        var numTris = meshVertsCt/3;
        var didHit = Drawable.RayIntersectsHull(t, transformedPositions, numTris,  rayOrig, rayDir);
        meshVerts = null;
        transformedPositions = null;
        
        if(didHit)
            return true;
        return false;

    }
    this.GetBoundingPlanes = function( finishedCallback ) {
        graphics.GetQuadMesh( meshName, sceneName, finishedCallback, function( quadMesh, callback ){
            callback( quadMesh.GetBoundingPlanes() );
        }
    }

    this.modelName = nameIn;
    this.meshName = meshNameIn;
    this.sceneName = sceneNameIn;


    this.GetName = function(){ return this.modelName; }

    this.modelDrawable = null;
    this.sceneGraph = null;

    this.timeUpdate;
    this.optTransformUpdated;

    //modifiers for manipulating the mesh from its default position
    this.scaleOff    = new Float32Array([1,1,1]);
    this.rotationOff = new Float32Array([0,0,0]);
    this.positionOff = new Float32Array([0,0,0]);
    //refrence the shader through a name to allow for runtime modification of shader
    this.shaderName  = this.shaderScene = "";

    var thisP = this;
    graphics.GetQuadMesh(meshNameIn, sceneNameIn, function(quadMesh){
        var sNameArr = quadMesh.GetShaderName();
        thisP.shaderName  = sNameArr[0];
        thisP.shaderScene = sNameArr[1];
        modelLoadedCallback(thisP, modelLoadedParameters);
    } );

};
