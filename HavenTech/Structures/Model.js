//# sourceURL=Structures/Model.js
//for use or code/art requests please contact chris@itemfactorystudio.com

//a representation of a model in a haven scene
//i.e. static enviroment model (foliage, ground etc)
//     dynamic model (player mesh, npc, etc)
function Model( nameIn, meshNameIn=null, armNameIn=null, ipoNameIn=null, materialNamesIn=[], 
				sceneNameIn="default", AABBIn=new AABB([-1,-1,-1], [1,1,1]),
				locationIn=Vect3_NewZero(), rotationIn=Quat_New_Identity(), scaleIn=Vect3_NewAllOnes(),
				modelLoadedParameters=null, modelLoadedCallback=null, isPhysical=false )
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


	//model is really for per instance
	//transformation
	//material
	//and scripts on an quadmesh

	this.origin = locationIn;
	this.rotation = rotationIn;
	this.scale = scaleIn;

	this.toWorldMatrix = Matrix_New();

	this.lastToWorldMatrixUpdateTime = -1;
	this.AABBUpdateTime = -1;

	this.modelName = nameIn;
	this.meshName = meshNameIn;
	this.armName = armNameIn; //the per vertex weighted transformation heiracy animation possibly applied to multiple quadmeshes
	this.ipoName = ipoNameIn;
	this.materialNames = materialNamesIn;
	if( this.materialNames.length < 1 ){
		//( str, tag, color, depth )
		DTPrintf('Model: ' + this.modelName + 
			', failed to read any materials, loading default material', "model ld");
		this.materialNames.push("default");
	}
	this.materials = new Array(this.materialNames.length);
	this.sceneName = sceneNameIn;
	
	this.ipoAnimation = null;
	this.quadmesh = null;

	this.isValid = false;
	this.componentsToLoad = 0; //the quadmesh, and each animation type ipo, skel, etc

	this.uid = NewUID();

	this.treeNodes = {};

	this.modelDrawable = null;
	this.sceneGraph = null;

	//this.overlaps = [0,0,0];
	this.worldMinCorner = Vect3_New();
	this.worldMaxCorner = Vect3_New();
	this.AABB = AABBIn;

	this.physObj = null;
	if( isPhysical ){
		this.physObj = new PhysObj(this.AABB, this, 0);
		this.isAnimated = true;
	}

	this.otType = OT_TYPE_Model;

	this.lastUpdateTime = -0.5;
	//this.timeUpdate;
	this.optTransformUpdated = false;
	this.optTransMat = Matrix_New();
	this.optMaterial = null;

	//modifiers for manipulating the mesh from its default position
	this.scaleOff    = new Float32Array([1,1,1]);
	this.rotationOff = new Float32Array([0,0,0]);
	this.positionOff = new Float32Array([0,0,0]);
	//refrence the shader through a name to allow
	//for runtime modification of shader
	this.shaderName  = this.shaderScene = "";


	this.modelLoadedCallback = modelLoadedCallback;
	this.modelLoadedParameters = modelLoadedParameters;

	//count the number of components to load
	this.componentsToLoad = this.materialNames.length; //QuadMesh + num materials

	if( this.meshName && this.meshName != "" )
		this.componentsToLoad += 1;
	if( this.ipoName && this.ipoName != '' )
		this.componentsToLoad += 1;
	if( this.armName && this.armName != "" )
		this.componentsToLoad += 1;


	//start loading the components (and checking if all components are loaded when they are ready)

	if( this.ipoName && this.ipoName != '' ){
		this.isAnimated = true;
		GRPH_GetCached(this.modelName, this.sceneName, IPOAnimation, null,
			MDL_ipoAnimReadyCallback, this );
		//loadTextFile("scenes/" + this.sceneName + 
		//		"/IPOs/" + this.modelName+".hvtIPO",
		//		MDL_ipoAnimReadyCallback, this);
	}


	this.hasntDrawn = true;
	this.materialHasntDrawn = new Array(this.materialNames.length);
	for( let i = 0; i < this.materialNames.length; ++i ){
		this.materialHasntDrawn[i] = true;
		//load the material file
		GRPH_GetCached( this.materialNames[i], this.sceneName, Material, null,
			MDL_materialReady, [this, i] );
		//when completed calls to mat file loaded function
	}


	if( !this.meshName || this.meshName == "" ){
		//console.log( "model constructor " + this.modelName + " no mesh name given" );
	}else{
		//request the quadmesh from the graphics class to get it to load it
		GRPH_GetCached( meshNameIn, sceneNameIn, QuadMesh, null,
					MDL_getQuadMeshCb,
					{ 1:this }
					//pack parameters into object to pass to callback above
					);
	}

};

//public methods

//Identification / registration functions so that 
//the model can be drawn, interact with other objects, 
//and be updated when in view
function MDL_AddToOctTree( mdl, octTreeIn )
{
	if( octTreeIn == null )
		return;

	MDL_RemoveFromOctTree( mdl );
	let nLvsMDpth = [0,0,0];
	TND_AddObject( octTreeIn, nLvsMDpth, mdl );
	if( nLvsMDpth[0] >= 0 )
		return true;
	return false;
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

function MDL_Update( mdl, time, treeNd ){


	if( mdl.quadmesh == null ){
		//request the quadmesh from the graphics class to get it to load it
		GRPH_GetCached( mdl.meshName, mdl.sceneName, QuadMesh, null,
					MDL_getQuadMeshCb,
					{ 1:mdl } //pack parameters into object to pass to callback above
					 );
	}else{

		if( mdl.skelAnimation != null )
			updated = SkelA_UpdateTransforms(mdl.skelAnimation, time );


		QM_Update( mdl.quadmesh, time ); //update the verts and AABB of the mesh

		//if ipo animation is present for model will be polled in MDL_UpdateToWorldMatrix
		MDL_UpdateToWorldMatrix(mdl, time);

		

		if( mdl.physObj ){
			if( treeNd ){ //can only update physics once added to oct tree
				PHYSOBJ_Update( mdl.physObj, time, treeNd );
			}else{
				mdl.physObj.lastUpdtTime = time; //to prevent a large delta time when first updated after added to oct tree
			}
		}

		MDL_UpdateAABB(mdl, time); //update the models AABB from mdl.toWorldMatrix and the local to modelspace AABB of the quadmesh

		mdl.lastUpdateTime = time;

	}
}

//update the quadmesh to world transformation
let tempMat = new Float32Array(4*4);
function MDL_UpdateToWorldMatrix(mdl, time){

	if( mdl.lastToWorldMatrixUpdateTime == time )
		return false;

	if( mdl.ipoAnimation != null && mdl.physObj == null ){
		IPOA_GetMatrix( mdl.ipoAnimation, mdl.toWorldMatrix, time );
		//if there is an ipo animation, ignore other animations
	}else{
		Matrix_SetQuatTransformation( mdl.toWorldMatrix, 
				mdl.scale, mdl.rotation, mdl.origin );
	}
	//Matrix_Copy(tempMat, mdl.toWorldMatrix );
	//Matrix_Inverse( mdl.wrldToLclMat, tempMat );

	mdl.lastToWorldMatrixUpdateTime = time;

	return true;
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


function MDL_materialReady( material, args ){
	let mdl = args[0];
	let matIdx = args[1];
	mdl.materials[matIdx] = material;
	mdl.componentsToLoad -= 1;
	MDL_checkLoadingComplete(mdl);
}


function MDL_UpdateAABB(mdl, time) {
	if( mdl.AABBUpdateTime < time ){
		mdl.AABBUpdateTime = mdl.quadmesh.AABBUpdateTime;

		Vect3_SetScalar( mdl.worldMinCorner,  999999 );
		Vect3_SetScalar( mdl.worldMaxCorner, -999999 );

		Matrix_Multiply_Vect3( tempVert, mdl.toWorldMatrix, mdl.quadmesh.lclMinCorner );
		Vect3_minMax( mdl.worldMinCorner, mdl.worldMaxCorner, tempVert);
		Matrix_Multiply_Vect3( tempVert, mdl.toWorldMatrix, mdl.quadmesh.lclMaxCorner);
		Vect3_minMax( mdl.worldMinCorner, mdl.worldMaxCorner, tempVert);

		AABB_UpdateMinMaxCenter(mdl.AABB, mdl.worldMinCorner, mdl.worldMaxCorner );
	}
}

function MDL_checkLoadingComplete(mdl){
	if( mdl.componentsToLoad < 1 ){
		mdl.isValid = true;
		//if there isn't a modelLoadedCallback callback don't try to call it
		if( mdl.modelLoadedCallback != null ) //quadmesh is loaded (async loading done)
			mdl.modelLoadedCallback( mdl, mdl.modelLoadedParameters ); //can now add to oct tree
	}
}


function MDL_getQuadMeshCb( quadMesh, cbObj ){ //get loaded parameters and call modelLoadedCallback
	let thisP = cbObj[1];
	//thisP.shaderName = quadMesh.materialNames[0];
	//thisP.shaderScene = quadMesh.sceneName;
	thisP.quadmesh = quadMesh;

	QM_Reset(thisP.quadmesh);
	MDL_Update( thisP, sceneTime, null );
	//quadMesh.models.push( thisP ); //for use by armature lookup of objects to be animated
	thisP.componentsToLoad -= 1;

	//if the model also has an armature, now attempt to load it
	if( thisP.armName && thisP.armName != "" ){
		this.isAnimated = true;
		GRPH_GetCached( thisP.armName, thisP.sceneName, SkeletalAnimation, null,
			MDL_skelAnimReady, thisP );
		thisP.bnIdxWghtBufferForMat = new Array(thisP.materialNames.length);
		for( let i = 0; i < thisP.materials.length; ++i )
			thisP.bnIdxWghtBufferForMat[i] = new Float32Array( quadMesh.faceVertsCtForMat[i]*bnIdxWghtCard );
	}else{
		MDL_checkLoadingComplete( thisP );
	}
}

function MDL_ipoAnimReadyCallback(ipoAnim, mdl){
	mdl.ipoAnimation = ipoAnim;
	mdl.componentsToLoad -= 1;
	MDL_checkLoadingComplete( mdl );
}

function MDL_skelAnimReady(skelAnim, mdl){
	mdl.skelAnimation = skelAnim;
	skelAnim.animatedModels.push( mdl );
	QM_ArmatureReadyCallback(skelAnim, mdl.quadmesh);
	mdl.componentsToLoad -= 1;
	MDL_checkLoadingComplete( mdl );
}


function MDL_RayIntersect(mdl, retDisNormCol, ray){

	//since the ray intersects the aabb, check faces 
	//of the mesh if the ray intersects, if it does, return the
	//ray distance, normal, and color of the the ray hit

	//model transformation is applied to quadmesh matrix at update time

	QM_GetRayIntersection( mdl.quadmesh, retDisNormCol, ray );

}

/*
function incChanIdx(chanIdx){

	chanIdx += 1;
	if( chanIdx > 3 )
		chanIdx = 0;

}
*/



