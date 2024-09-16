//Model.js
//for use or code/art requests please contact chris@itemfactorystudio.com

//a representation of a model in a haven scene
//i.e. static enviroment model (foliage, ground etc)
//     dynamic model (player mesh, npc, etc)
function Model( nameIn, meshNameIn, sceneNameIn, AABB, 
					modelLoadedParameters, modelLoadedCallback=null, isDynamic=false )
{
	
	/*
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
	*/


	//model is really for an additional transformation
	//and scripts on an object

	this.lclToWrldMat = Matrix_New();

	this.modelName = nameIn;
	this.meshName = meshNameIn;
	this.sceneName = sceneNameIn;

	this.uid = NewUID();

	this.physObj = null;
	if( isDynamic )
		this.physObj = new PhysObj(thisP.AABB, thisP, 0);

	this.treeNodes = {};

	this.modelDrawable = null;
	this.sceneGraph = null;

	//this.overlaps = [0,0,0];
	this.AABB = AABB;

	this.otType = OT_TYPE_Model;

	this.lastUpdateTime = -0.5;
	//this.timeUpdate;
	this.optTransformUpdated;

	this.optTransMat = Matrix_New();

	//modifiers for manipulating the mesh from its default position
	this.scaleOff    = new Float32Array([1,1,1]);
	this.rotationOff = new Float32Array([0,0,0]);
	this.positionOff = new Float32Array([0,0,0]);
	//refrence the shader through a name to allow
	//for runtime modification of shader
	this.shaderName  = this.shaderScene = "";


	//request the quadmesh from the graphics class to get it to load it
	GRPH_GetCached( meshNameIn, sceneNameIn, QuadMesh, null,
				MDL_getQuadMeshCb,
				{ 1:this, 2:modelLoadedParameters, 3:modelLoadedCallback }
				//pack parameters into object to pass to callback above
				 );


	//loadTextFile("scenes/" + this.sceneName + 
	//			"/IPOs/" + this.modelName+".hvtIPO", 
	//			MDL_ipoFileLoadedCallback, this);

};

//public methods

//Identification / registration functions so that 
//the model can be drawn, interact with other objects, 
//and be updated when in view
function MDL_AddToOctTree( mdl, octTreeIn, addCompletedCallback )
{
	if( octTreeIn == null )
		return;

	MDL_RemoveFromOctTree( mdl );
	let nLvsMDpth = [0,0];
	TND_AddObject( octTreeIn, nLvsMDpth, mdl, addCompletedCallback );

}

function MDL_RemoveFromOctTree( mdl, removeCompletedCallback )
{
	let treeNodesAddedTo = Object.keys(mdl.treeNodes);
	while( treeNodesAddedTo.length > 0 ){
		TND_RemoveFromThisNode( mdl.treeNodes[mdl.treeNodesAddedTo[0]], mdl );
		treeNodesAddedTo = Object.keys(mdl.treeNodes);
	}
	mdl.treeNodes = {};
	
	if( removeCompletedCallback != null )
		removeCompletedCallback(mdl);
}

//animation functions
function MDL_quadMeshLoaded( quadMesh, cbObj ){
	quadMesh.Update(time);
	cbObj.lastUpdateTime = time;
	cbObj.quadmesh = quadMesh;
	cbObj.AABB = quadMesh.AABB;
}

function MDL_Update( mdl, time, treeNd ){
	if( mdl.quadmesh == null ){
		graphics.GetQuadMesh( mdl.meshName, mdl.sceneName, mdl, quadMeshLoaded );
	}else{
		
		QM_Update( mdl.quadmesh, time );
		
		if( mdl.physObj ){
			
		
			mdl.AABB = mdl.quadmesh.AABB;
		
			mdl.physObj.Update(time, gravityAccel, treeNd);
			
			mdl.lastUpdateTime = time;
		}
		
		
	}
}

/*
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
*/

function MDL_PrintHierarchy(name, par){
	mdl.quadmesh.PrintHierarchy(name, par);
}

//shader binding functions
function MDL_GetOriginalShaderName( mdl, shaderNameOut, sceneNameOut ){
	shaderNameOut = mdl.quadMesh.materialNames[0];
	sceneNameOut  = mdl.sceneName;
}
function MDL_SetShader( mdl, shaderNameIn, sceneNameIn ){
	//this function may not be used, used to change the shader
	//on the model after it's been loaded
	let currentSceneGraph = mdl.sceneGraph;
	mdl.RemoveFromSceneGraph();
	mdl.shaderName = shaderNameIn;
	mdl.shaderScene = sceneNameIn;
	mdl.AddToSceneGraph( currentSceneGraph );
}

function MDL_getQuadMeshCb( quadMesh, cbObj ){ //get loaded parameters and call modelLoadedCallback
	let thisP = cbObj[1];
	thisP.shaderName = quadMesh.materialNames[0];
	thisP.shaderScene = quadMesh.sceneName;
	thisP.quadmesh = quadMesh;
	QM_Reset(thisP.quadmesh);
	QM_Update( thisP.quadmesh, 0 );
	thisP.AABB = thisP.quadmesh.AABB;
	
	//if there isn't a modelLoadedCallback callback don't try to call it
	if( cbObj[3] != null ) //quadmesh is loaded (async loading done)
		cbObj[3]( cbObj[1], cbObj[2] ); //can now add to oct tree
}

function MDL_RayIntersect(mdl, retDisNormCol, ray){

	//since the ray intersects the aabb, check faces 
	//of the mesh if the ray intersects, if it does, return the
	//ray distance, normal, and color of the the ray hit

	//model transformation is applied to quadmesh matrix at update time

	QM_GetRayIntersection( mdl.quadmesh, retDisNormCol, ray );

}

function incChanIdx(chanIdx){

	chanIdx += 1;
	if( chanIdx > 3 )
		chanIdx = 0;

}

