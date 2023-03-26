//Model.js


//a representation of a model in a haven scene
//i.e. static enviroment model (foliage, ground etc)
//     dynamic model (player mesh, npc, etc)
function Model( nameIn, meshNameIn, sceneNameIn, //AABB, 
                        modelLoadedParameters, modelLoadedCallback=null )
{
    //get the quadMesh transformationMatrix
    this.generateModelMatrix = function( cbObjs, completeCallback )
    {
        var thisP = cbObjs[1];
        var quadMeshMatrix = new Float32Array(4*4);
        graphics.GetQuadMesh( this.meshName, this.sceneName, { 1:cbObjs, 2:completeCallback }, 
        	function( quadMesh, cbObj2 )
        	{
		        var pos      = new Float32Array(3); quadMesh.GetPosition(pos);
		        var rot      = new Float32Array(3); quadMesh.GetRotation(rot);
		        var scale    = new Float32Array(3); quadMesh.GetScale(scale);
		        Matrix( quadMeshMatrix, MatrixType.euler_transformation, 
		        scale, rot, pos );

		        //calculate the set transformation matrix
		        var offsetMatrix = new Float32Array(4*4);
		        Matrix(offsetMatrix,
		               MatrixType.euler_transformation,
		               thisP.scaleOff, thisP.rotationOff, 
		               new Float32Array([0,0,0]));
		        var transformation = new Float32Array(4*4);
		        Matrix_Multiply( transformation, offsetMatrix, quadMeshMatrix );
		        transformation[0*4+3] += thisP.positionOff[0];
		        transformation[1*4+3] += thisP.positionOff[1];
		        transformation[2*4+3] += thisP.positionOff[2];

		        cbObj2[2]( transformation, cbObj2[1] ); 
		        //completeCallback( transform, cbObjs ); 
		        //return the model to world transformation
        	}
        );
    }

	//public methods
	
    //Identification / registration functions so that 
    //the model can be drawn, interact with other objects, 
    //and be updated when in view
    this.AddToOctTree = function( octTreeIn, addCompletedCallback )
    {
        if( octTreeIn == null )
            return;
        this.RemoveFromOctTree();
        this.octTree = octTreeIn;
        this.octTree.AddObject(this);
        addCompletedCallback();
    }
    
    this.RemoveFromOctTree = function( removeCompletedCallback )
    {
        if( this.octTree != null ){
        
        	var OctTreeRemoveCompleted = function( thisP ){
	        	thisP.octTree = null;
        	}
        	
            this.octTree.Remove( removeCompleted, this );
        }
    }

    //animation functions
    this.Update = function( time, updateCompleteParams, updateCompleteCallback )
    {
        if( this.quadmesh == null ){
            graphics.GetQuadMesh( this.meshName, this.sceneName, this, 
                //{1:this, 2:updateCompleteParams, 3:updateCompleteCallback},
                function( quadMesh, cbObj )
                {
                    quadMesh.Update(time);
                    cbObj.lastUpdateTime = time; 
                    //cbObj[1].timeUpdate = true; 
                    //set this model's flag that the animation of the mesh 
                    //has been updated so it should regenerate it's gl buffer
                    //cbObj[3]( cbObj[2] ); 
                    //updateCompleteCallback(updateCompleteParams);
                }
            );
        }else{
            this.quadmesh.Update( time );
            this.lastUpdateTime = time;
        }

    }
    this.GetAnimationLength = function() { 
      return graphics.GetQuadMesh(meshName, sceneName).GetAnimationLength(); }

    //draw transformation manipulation functions
    //getters
    this.GetPosition = function( pos )      { 
       graphics.GetQuadMesh( this.meshName, this.sceneName ).GetPosition(pos); }
    this.GetScale    = function( scaleOut ) { 
       graphics.GetQuadMesh( this.meshName, this.sceneName ).GetScale   (scaleOut); }
    this.GetRotation = function( rotOut )   { 
       graphics.GetQuadMesh( this.meshName, this.sceneName ).GetRotation(rotOut);   }
    //setters
    this.SetPosition = function( newPos ) { 
        Vect3_Copy( positionOff, newPos  ); 
        positionSet = true; optTransformUpdated = true; }
    this.SetScale    = function( scaleIn ){ 
        Vect3_Copy( scaleOff   , scaleIn ); 
        scaleSet    = true; optTransformUpdated = true; }
    this.SetRotation = function( rotNew ) { 
        Vect3_Copy( rotationOff, rotNew  ); 
        rotationSet = true; optTransformUpdated = true; }

    //shader binding functions
    this.GetOriginalShaderName = function( shaderNameOut, sceneNameOut )
    {
        var sNameArr  = 
            graphics.GetQuadMesh( meshName, sceneName ).GetShaderName();
        shaderNameOut = sNameArr[0];
        sceneNameOut  = sNameArr[1];
    }
    this.SetShader = function( shaderNameIn, sceneNameIn )
    {
        //this function may not be used, used to change the shader
        //on the model after it's been loaded
        var currentSceneGraph = this.sceneGraph;
        this.RemoveFromSceneGraph();
        this.shaderName = shaderNameIn;
        this.shaderScene = sceneNameIn;
        this.AddToSceneGraph( currentSceneGraph );
    }

    this.GetOptTransform = function( retMat )
    {
        if( optTransformUpdated )
            this.generateModelMatrix( this, retMat );
        return scaleSet || rotationSet || positionSet;
    }
    this.DrawSkeleton = function(){ 
        graphics.GetQuadMesh( this.meshName, this.sceneName ).DrawSkeleton(); }
    
   
    
    /* //the AABB is in the quadmesh
    //model is really for an additional transformation
    //and scripts on an object
    this.GetAABB = function( time ){
        if( this.lastUpdateTime != time )
            this.Update( time );
        if( this.AABB == null ){
            this.AABB = this.quadmesh.AABB;
        }
        return this.AABB; 
        //return the cached AABB in the model 
        //( when the quadmesh is updated it should be updated )
    }
    */
    
    this.GetAABB = function(  ){
        //may be more complex as transformations are layered
        //and subcomponents are added to the model
        return this.quadmesh.AABB;
    }

    this.modelName = nameIn;
    this.meshName = meshNameIn;
    this.sceneName = sceneNameIn;
    
    this.uuid = Math.random()

    this.modelDrawable = null;
    this.sceneGraph = null;
    
    //this.AABB = AABB;

    this.lastUpdateTime = -0.5;
    //this.timeUpdate;
    this.optTransformUpdated;

    //modifiers for manipulating the mesh from its default position
    this.scaleOff    = new Float32Array([1,1,1]);
    this.rotationOff = new Float32Array([0,0,0]);
    this.positionOff = new Float32Array([0,0,0]);
    //refrence the shader through a name to allow 
    //for runtime modification of shader
    this.shaderName  = this.shaderScene = "";

    var thisP = this;
    //request the quadmesh from the graphics class to get it to load it
    graphics.GetQuadMesh( meshNameIn, sceneNameIn,
        { 1:this, 2:modelLoadedParameters, 3:modelLoadedCallback }, 
        //pack parameters into object to pass to callback below
        function( quadMesh, cbObj ) 
        //inline callback to get loaded parameters and call 
        {
            var sNameArr = quadMesh.GetShaderName();
            thisP.shaderName  = sNameArr[0];
            thisP.shaderScene = sNameArr[1];
            thisP.quadmesh = quadMesh;
            //if there isn't a modelLoadedCallback callback don't try to call it
            if( cbObj[3] != null ) //quadmesh is loaded (async loading done)
                cbObj[3]( cbObj[1], cbObj[2] ); //can now add to oct tree
        } 
    );

};
