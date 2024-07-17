//SkeletalAnimation.js: Implementation of SkeletalAnimation
//a heirarchical matrix transformation for animating quadMeshes
//Author: Christopher Hoffman
//for use or code/art requests please contact chris@itemfactorystudio.com

//small structure used in breadth first traversal of the bone tree 
function SkelA_HierarchyNode(){
	this.parent_mat = Matrix_New();
	this.idx = -1; //the index of the represented bone
};

//constructor
function SkeletalAnimation( nameIn, sceneNameIn, args, readyCallback, readyCallbackParams ){

	this.skelAnimName = nameIn;
	this.sceneName = sceneNameIn;
	
	this.lastUpdateTime = -0.5;

	this.transformationMatricies = [];
	this.isValid = false;
	this.rootBoneIdxs = [];
	this.bones = [];
	this.boneNamesToIdxs = {};
	this.duration = 0.0;
	this.loop = true;
	
	this.lineDrawBuffer = null;
	this.linePts = null;

	this.scale          = Vect3_NewAllOnes();
	this.rotation       = Vect3_NewZero();
	this.origin         = Vect3_NewZero();
	this.toWorldMatrix  = Matrix_New();
	this.wrldToLclMat  = Matrix_New();
	Matrix_SetIdentity( this.toWorldMatrix );

	this.loadCompCallback = readyCallback;
	this.loadCompCbParams = readyCallbackParams;

	//open the file for reading
	let fileName = "scenes/"+this.sceneName+"/skelAnimations/"+this.skelAnimName+".hvtAnim";
	loadTextFile(fileName, SkelA_AnimFileLoaded, this );
}


//let tempZero = Vect3_NewZero();
let tempVec = Vect3_NewVals(0,1,0);
let tempVec2 = Vect3_NewVals(0,0.5,  0);
let tempVec3 = Vect3_NewVals(0,0.5,0.2);

let head = Vect3_New();
let tail = Vect3_New();
let zIndcS = Vect3_New(); 
let zIndc = Vect3_New();

let bindHead = Vect3_New();
let bindTail = Vect3_New();
let bindZIndcS = Vect3_New();
let bindZIndc = Vect3_New();

let poseCol     = [0,1,1,1];
let poseColEnd  = [0,1,1,0.2];
let poseZCol    = [0,1,0,1];
let poseZColEnd = [0,1,0,0.2];

let bindCol     = [1,1,0,1];
let bindColEnd  = [1,1,0,0.2];
let bindZCol    = [0,0,1,1];
let bindZColEnd = [0,0,1,0.2];

const numLineVertsPerBone = 8;
function SkelA_ArmatureDebugDraw(skelA, buf, subB){
	if(!skelA.isValid)
		return;

	let zIndcPct = (sceneTime % 0.5) / 0.5;

	//calculate the line points

	for(let i=0; i<skelA.bones.length; ++i){
		Matrix_Multiply_Vect3(head, skelA.transformationMatricies[i], tempZero);
		tempVec[1] = skelA.bones[i].len; //set length of display axis
		Matrix_Multiply_Vect3(tail, skelA.transformationMatricies[i], tempVec);
		tempVec2[1] = tempVec[1] * zIndcPct;//set midpoint of z axis indicator
		tempVec3[1] = tempVec[1] * zIndcPct;
		tempVec3[2] = tempVec[1] * 0.2;//set length of z axis indicator
		Matrix_Multiply_Vect3(zIndcS, skelA.transformationMatricies[i], tempVec2);
		Matrix_Multiply_Vect3(zIndc, skelA.transformationMatricies[i], tempVec3);
		Vect_CopyToFromArr(buf.buffers[0],( (i*numLineVertsPerBone)   +subB.startIdx)*vertCard,  head, 0, vertCard);
		Vect_CopyToFromArr(buf.buffers[0],(((i*numLineVertsPerBone)+1)+subB.startIdx)*vertCard,  tail, 0, vertCard);
		Vect_CopyToFromArr(buf.buffers[0],(((i*numLineVertsPerBone)+2)+subB.startIdx)*vertCard,zIndcS, 0, vertCard);
		Vect_CopyToFromArr(buf.buffers[0],(((i*numLineVertsPerBone)+3)+subB.startIdx)*vertCard, zIndc, 0, vertCard);

		Vect_CopyToFromArr(buf.buffers[1],( (i*numLineVertsPerBone)   +subB.startIdx)*colCard, poseCol,     0, colCard);
		Vect_CopyToFromArr(buf.buffers[1],(((i*numLineVertsPerBone)+1)+subB.startIdx)*colCard, poseColEnd,  0, colCard);
		Vect_CopyToFromArr(buf.buffers[1],(((i*numLineVertsPerBone)+2)+subB.startIdx)*colCard, poseZCol,    0, colCard);
		Vect_CopyToFromArr(buf.buffers[1],(((i*numLineVertsPerBone)+3)+subB.startIdx)*colCard, poseZColEnd, 0, colCard);


		Matrix_Multiply_Vect3(bindHead, skelA.bones[i].boneToWorldSpaceMat, tempZero);
		Matrix_Multiply_Vect3(bindTail, skelA.bones[i].boneToWorldSpaceMat, tempVec);
		Matrix_Multiply_Vect3(bindZIndcS, skelA.bones[i].boneToWorldSpaceMat, tempVec2);
		Matrix_Multiply_Vect3(bindZIndc, skelA.bones[i].boneToWorldSpaceMat, tempVec3);
		Vect_CopyToFromArr(buf.buffers[0],(((i*numLineVertsPerBone)+4)+subB.startIdx)*vertCard,  bindHead, 0, vertCard);
		Vect_CopyToFromArr(buf.buffers[0],(((i*numLineVertsPerBone)+5)+subB.startIdx)*vertCard,  bindTail, 0, vertCard);
		Vect_CopyToFromArr(buf.buffers[0],(((i*numLineVertsPerBone)+6)+subB.startIdx)*vertCard,bindZIndcS, 0, vertCard);
		Vect_CopyToFromArr(buf.buffers[0],(((i*numLineVertsPerBone)+7)+subB.startIdx)*vertCard, bindZIndc, 0, vertCard);

		Vect_CopyToFromArr(buf.buffers[1],(((i*numLineVertsPerBone)+4)+subB.startIdx)*colCard, bindCol,     0, colCard);
		Vect_CopyToFromArr(buf.buffers[1],(((i*numLineVertsPerBone)+5)+subB.startIdx)*colCard, bindColEnd,  0, colCard);
		Vect_CopyToFromArr(buf.buffers[1],(((i*numLineVertsPerBone)+6)+subB.startIdx)*colCard, bindZCol,    0, colCard);
		Vect_CopyToFromArr(buf.buffers[1],(((i*numLineVertsPerBone)+7)+subB.startIdx)*colCard, bindZColEnd, 0, colCard);

	}
	subB.len = skelA.bones.length * 8;
	buf.bufferUpdated   = true;
}

function SkelA_Cleanup(skelA){
	//free the memory
	gl.deleteBuffer( skelA.lineDrawBuffer );
}

const TRAVERSAL_NODE_POOL_SIZE = 128;
let traversalNodePool = new Array(TRAVERSAL_NODE_POOL_SIZE);
for( let i = 0; i < traversalNodePool.length; ++i){
	traversalNodePool[i] = new SkelA_HierarchyNode();
}
let traversalNodePoolIdx = TRAVERSAL_NODE_POOL_SIZE-1;

function SkelA_GetTraversalNode(  ){
	if( traversalNodePoolIdx < 2 )
		console.log( "almost out of traversal nodes\n" );
	return traversalNodePool[traversalNodePoolIdx--];
}
function SkelA_ReturnTraversalNode( node ){
	traversalNodePool[++traversalNodePoolIdx] = node;
}

function SkelA_InitTraversalQueue(skelA, queue){
	for( let i = 0; i < skelA.rootBoneIdxs.length; ++i ){
		let hierarchyNode = SkelA_GetTraversalNode();
		Matrix_Copy(hierarchyNode.parent_mat, skelA.toWorldMatrix);
		hierarchyNode.idx = skelA.rootBoneIdxs[i];
		queue.push(hierarchyNode);
	}
}

let pose_mat = Matrix_New();
let bone_mat_actions  = Matrix_New();
function SkelA_GenerateFrameTransformations(skelA, time){
	//breadth first traverse the bone hierarchy and generate bone transformations
	//for the given time

	//check if the SkeletalAnimation loaded properly
	if(!skelA.isValid)
		return;

	//setup the traversal queue
	let boneQueue = [];
	SkelA_InitTraversalQueue(skelA, boneQueue);
	
	while(boneQueue.length > 0){
		//get the next bone from the queue
		let currentBoneNode = boneQueue.shift();
		let currentIdx = currentBoneNode.idx;
		let bone = skelA.bones[currentIdx];

		//get the relevant data from the parent bone
		let parent_pose_mat  = currentBoneNode.parent_mat;

		//get the relevant data from the bone
		//let rotat_Mat         = skelA.bones[currentIdx].rotat_Mat;
		let bone_mat          = bone.bone_Mat;
		let bone_mat_head     = bone.head_Mat;
		let bone_mat_tail     = bone.tail_Mat;
		
		Bone_GetPose_Mat(bone, bone_mat_actions, time);


		//calculate the pose matrix for this bone
		Matrix_Multiply(tempMat1, bone_mat, bone_mat_actions);
		Matrix_Multiply(tempMat2, bone_mat_head, tempMat1);
		Matrix_Multiply(pose_mat, parent_pose_mat, tempMat2);

		//store this bone's pose matrix in the frameTransformation object
		Matrix_Copy(skelA.transformationMatricies[currentIdx], pose_mat);
		
		//write this bones combined matrix to combinedBoneMats
		Matrix_MultToArrTransp( skelA.hvnsc.combinedBoneMats,
			(currentIdx + skelA.combinedBoneMatOffset)*matrixCard,
			skelA.transformationMatricies[currentIdx],
			bone.worldToBoneSpaceMat );

		Matrix_Multiply(mat_to_pass_on, pose_mat, bone_mat_tail);

		SkelA_ReturnTraversalNode( currentBoneNode );
		//append this bones children to the traversal queue
		for(let i=0; i<bone.childrenIdxs.length; ++i){
			let newNode = SkelA_GetTraversalNode();
			//calculate the matrix to pass to this bone's children
			Matrix_Copy(newNode.parent_mat, mat_to_pass_on);
			newNode.idx = bone.childrenIdxs[i];
			boneQueue.push(newNode);
		}
	}
	
	
}

function SkelA_writeCombinedBoneMatsToGL(hvnsc){
	//write the combined bone matricies to gl
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, hvnsc.boneMatTexture);
	
	gl.texImage2D(
		gl.TEXTURE_2D, 
		0,					//level
		gl.RGBA,			//internal format
		4,					//width 4 pixels, each pixel RGBA so 4 pixels is 16 vals
		hvnsc.combinedBoneMats.length/matrixCard, //one row per bone
		0,					//border
		gl.RGBA,			//format
		gl.FLOAT,			//type
		hvnsc.combinedBoneMats
	);
}

function SkelA_GenerateBoneTree(skelA){
	//helper function to calculate bone parent and child
	//Indices for later fast traversal
	//(vs. using their string names)

	//create the bone tree
	for(let i=0; i<skelA.bones.length; ++i){
		for(let k=0; k<skelA.bones[i].children.length; ++k){
			for(let j=0; j<skelA.bones.length; ++j){
				if(skelA.bones[j].boneName == skelA.bones[i].children[k]){
					skelA.bones[j].parentIdx = i;
					skelA.bones[i].childrenIdxs.push(j);
					break;
				}
			}
		}
	}
}

function SkelA_GenerateMesh(skelA, mesh, time ){
	//apply skelA transformation to the mesh vertices, generating a new set of vertex positions

	if( time == skelA.lastUpdateTime )
		return false;

	let wrappedTime = time * 25;
	if( skelA.loop && wrappedTime > skelA.duration )
		wrappedTime = wrappedTime % skelA.duration;

	//generate the transformation matrices
	SkelA_GenerateFrameTransformations(skelA, wrappedTime);

	skelA.lastUpdateTime = time;
	return true;
}

//temporaries used for matrix multiplications
//let tempMat1 = new Float32Array(4*4);
let mat_to_pass_on = Matrix_New();
//let tempMat2 = new Float32Array(4*4);
function SkelA_GenerateInverseBindPoseTransformations(skelA){
	//breadth first traverse the bone hierarchy and
	//generate the inverse bind pose transformation for each bone
	//this allows for vertices affected by a bone to be brought into bone
	//space so that the bone pose matrix brings the vertex to its animated
	//position


	//setup the traversal queue
	let boneQueue = [];
	SkelA_InitTraversalQueue(skelA, boneQueue);
	
	while(boneQueue.length > 0){
		//get the next bone from the queue
		let currentBoneNode = boneQueue.shift();
		let currentIdx = currentBoneNode.idx;

		//get the relevant data from the parent bone
		let parent_to_world_space_mat  = currentBoneNode.parent_mat;

		//for(let i = 0; i < skelA.bones.length; ++i ){
		let bone = skelA.bones[currentIdx];

		//get the relevant data from the current bone
		//let rotat_Mat         = skelA.bones[currentIdx].rotat_Mat;
		let bone_mat          = bone.bone_Mat;
		let bone_mat_head     = bone.head_Mat;
		//let rotat_Mat         = bone.rotat_Mat;
		let tail_Mat          = bone.tail_Mat;

		//calculate and store the inverse bind_pose/armature_matrix
		Matrix_Multiply(tempMat1, bone_mat_head, bone_mat);
		Matrix_Multiply( bone.boneToWorldSpaceMat, parent_to_world_space_mat, tempMat1 );
		//invert the bones arm_mat and apply it to the inverse toWorldMatrix matrix of the armature and store it
		Matrix_Copy( tempMat2, bone.boneToWorldSpaceMat );
		Matrix_Inverse(bone.worldToBoneSpaceMat, tempMat2);
		
		Matrix_Multiply( mat_to_pass_on, bone.boneToWorldSpaceMat, tail_Mat);
		
		SkelA_ReturnTraversalNode( currentBoneNode );
		//append this bones children to the traversal queue
		for(let i=0; i<skelA.bones[currentIdx].childrenIdxs.length; ++i){
			let newNode = SkelA_GetTraversalNode();
			//calculate the matrix to pass to this bone's children
			Matrix_Copy(newNode.parent_mat, mat_to_pass_on);
			newNode.idx = skelA.bones[currentIdx].childrenIdxs[i];
			boneQueue.push(newNode);
		}

	}
}

let toWorldMatrixCpy = new Float32Array(4*4);
function SkelA_AnimFileLoaded(skelAnimFile, skelA){
	if( skelAnimFile === undefined ){ 
		skelA.loadCompCallback(skelA, skelA.loadCompCbParams);
		return;
	}
	let skelAnimFileLines = skelAnimFile.split('\n');

	//read in the file line by line
	let sLIdx = -1;
	while(++sLIdx < skelAnimFileLines.length ){
		let temp = skelAnimFileLines[sLIdx];
		let words = temp.split(' ');

		if(temp[0] == 's'){ //read in the armature's scale
			skelA.scale = new Float32Array([parseFloat(words[1]),
					                       parseFloat(words[2]),
					                       parseFloat(words[3])]);
		}
		if(temp[0] == 'r'){ //read in the armature's rotation
			skelA.rotation = new Float32Array([parseFloat(words[1]),
					                          parseFloat(words[2]),
					                          parseFloat(words[3])]);
		}
		if(temp[0] == 'x'){ //read in the armature's translation
			skelA.origin = new Float32Array([parseFloat(words[1]),
					                        parseFloat(words[2]),
					                        parseFloat(words[3])]);
		}

		if(temp[0] == 'b'){
			//read in a bone
			let newBone = new Bone(parseInt(words[1]));
			skelA.bones.push(newBone);
			sLIdx = Bone_Parse(newBone, skelAnimFileLines, sLIdx); //bone constructor handles reading bone
			skelA.boneNamesToIdxs[newBone.boneName] = skelA.bones.length-1;
			//find the longest bone animation
			let tempDuration = skelA.bones[skelA.bones.length-1].animationLength;
			if(tempDuration > skelA.duration) //set the duration
				skelA.duration = tempDuration;
			//find parent bone indicies
			if(skelA.bones[skelA.bones.length-1].parentName.length < 1) //set the parent bone idx
				skelA.rootBoneIdxs.push( skelA.bones.length-1 );
		}
	}

	//calculate the toWorldMatrix matrix of the Animation and its inverse
	//let blenderToHaven = new Float32Array(4*4);
	//Matrix(blenderToHaven, MatrixType.xRot, -Math.PI/2.0);
	//let tempMat = new Float32Array(4*4);
	Matrix_SetEulerTransformation( skelA.toWorldMatrix, skelA.scale, skelA.rotation, skelA.origin );
	//Matrix_Multiply(skelA.toWorldMatrix, blenderToHaven, tempMat);
	Matrix_Copy(toWorldMatrixCpy, skelA.toWorldMatrix);
	Matrix_Inverse(skelA.wrldToLclMat, toWorldMatrixCpy); //destructive operation on source matrix

	//calculate bone lookup indices for faster bone lookup
	SkelA_GenerateBoneTree(skelA);
	//pre calculate these (will be used each frame)
	SkelA_GenerateInverseBindPoseTransformations(skelA);

	IPrintf("SkeletalAnimation: " + skelA.skelAnimName +  " read in " + skelA.bones.length +
			" bones, duration is: " + skelA.duration );

	//allocate the transformation matricies
	skelA.transformationMatricies = new Array(skelA.bones.length);
	for(let i=0; i<skelA.bones.length; ++i)
		skelA.transformationMatricies[i] = Matrix_New();


	skelA.isValid = true;
	
	skelA.loadCompCallback(skelA, skelA.loadCompCbParams);
}

function SkelA_AllocateCombinedBoneMatTexture(skelAnims, havenScene){
	if( skelAnims.length < 1 )
		return;

	// create a texture to hold the combined toBoneSpaceMatrix and toAnimatedWorldSpace matrices
	let texFloatExt = gl.getExtension('OES_texture_float');
	if (!texFloatExt) {
		DPrintf("OES_texture_float not supported");
		texFloatExt = gl.getExtension('OES_texture_float_linear');
		if(!texFloatExt){
			DPrintf("OES_texture_float_linear not supported either");
			//return; // the extension doesn't exist on this device
		}else{
		}
	}



	let skelAnimCacheKeys = Object.keys(skelAnims);
	let totalNumBones = 1; //offset by 1 for the identity Matrix
	for( let i = 0; i < skelAnimCacheKeys.length; ++i ){
		let skelAnim = skelAnims[skelAnimCacheKeys[i]];
		skelAnim.combinedBoneMatOffset = totalNumBones; //increment the offset
		totalNumBones += skelAnim.bones.length;
		skelAnim.hvnsc = havenScene;
	}

	//allocate the combined toBoneSpaceMatrix and toAnimatedWorldSpace matrices
	havenScene.combinedBoneMats = new Float32Array( matrixCard * totalNumBones );

	Matrix_SetIdentity(havenScene.combinedBoneMats);

	havenScene.boneMatTexture = gl.createTexture();
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, havenScene.boneMatTexture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,  gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER,  gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,		gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T,		gl.CLAMP_TO_EDGE);

	gl.texImage2D(
		gl.TEXTURE_2D, 
		0,					//level
		gl.RGBA,			//internal format
		4,					//width 4 pixels, each pixel RGBA so 4 pixels is 16 vals
		totalNumBones,		//one row per bone
		0,					//border
		gl.RGBA,			//format
		gl.FLOAT,			//type
		havenScene.combinedBoneMats
	);

}
