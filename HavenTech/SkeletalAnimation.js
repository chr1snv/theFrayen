//SkeletalAnimation.js: Implementation of SkeletalAnimation
//a heirarchical matrix transformation for animating quadMeshes
//Author: Christopher Hoffman
//for use or code/art requests please contact chris@itemfactorystudio.com

//small structure used in breadth first traversal of the bone tree 
function SkelA_HierarchyNode(){
	this.parent_mat = new Float32Array(4*4);
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
	this.duration = 0.0;
	this.loop = true;
	
	this.lineDrawBuffer = null;
	this.linePts = null;

	this.scale        = Vect3_NewAllOnes();
	this.rotation     = Vect3_NewZero();
	this.origin       = Vect3_NewZero();
	this.orientation  = Matrix_New();
	this.inverseMatrix = Matrix_New();
	Matrix_SetIdentity( this.orientation );

	this.loadCompCallback = readyCallback;
	this.loadCompCbParams = readyCallbackParams;

	//open the file for reading
	let fileName = "scenes/"+this.sceneName+"/skelAnimations/"+this.skelAnimName+".hvtAnim";
	loadTextFile(fileName, SkelA_AnimFileLoaded, this );
}


//let tempZero = Vect3_NewZero();
let tempVec = Vect3_New();

let head = Vect3_New();
let tail = Vect3_New();
function SkelA_Draw(skelA){
	if(!skelA.isValid)
		return;


	gl.EnableClientState(gl.GL_VERTEX_ARRAY);
	gl.DisableClientState(gl.GL_NORMAL_ARRAY);

	gl.DisableClientState(gl.GL_TEXTURE_COORD_ARRAY);

	//allocate the buffer and temp point array

	if( skelA.lineDrawBuffer == null ){
		skelA.lineDrawBuffer = gl.createBuffer();
		skelA.linePts = new Float32Array(skelA.bones.length*2*vertCard);
	}


	//calculate the line points

	for(let i=0; i<skelA.bones.length; ++i)
	{
		Vect3_Zero(tempZero);

		Vect3_Zero(tempVec);
		tempVec[1] = 1.0;


		Matrix_Multiply(head, skelA.transformationMatricies[i], tempZero);
		Matrix_Multiply(tail, skelA.transformationMatricies[i], tempVec);
		Vect3_Copy(linePts[i*vertCard], head);
		Vect3_Copy(linePts[(i+1)*vertCard], tail);
	}

	//bind the array buffer and upload the line points
	glBindBuffer(GL_ARRAY_BUFFER, lineBufferID);
	glBufferData(GL_ARRAY_BUFFER, bones.size()*2*vertCard*sizeof(GLfloat), linePts, GL_DYNAMIC_DRAW);
	glVertexPointer(3, GL_FLOAT, 0, 0);

	//draw
	glDisable(GL_DEPTH_TEST);
	glColor4f(1.0, 0.5, 0.0, 1.0);
	glDrawArrays(GL_LINES, 0, bones.size()*2);

	

	//restore rendering state
	glEnable(GL_DEPTH_TEST);

}

function SkelA_Cleanup(skelA){
	//free the memory
	gl.deleteBuffer( skelA.lineDrawBuffer );
}

function SkelA_InitTraversalQueue(skelA, queue){
	for( let i = 0; i < skelA.rootBoneIdxs.length; ++i ){
		let hierarchyNode = new SkelA_HierarchyNode();
		Matrix(hierarchyNode.parent_mat, MatrixType.identity);
		hierarchyNode.idx = skelA.rootBoneIdxs[i];
		queue.push(hierarchyNode);
	}
}

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

		//get the relevant data from the parent bone
		let parent_pose_mat  = currentBoneNode.parent_mat;

		//get the relevant data from the bone
		let bone_mat          = skelA.bones[currentIdx].bone_Mat;
		let bone_mat_head     = skelA.bones[currentIdx].head_Mat;
		let bone_mat_loc_tail = skelA.bones[currentIdx].loc_tail_Mat;
		
		Bone_GetPose_Mat(skelA.bones[currentIdx], bone_mat_actions, time);

		//temporaries used for matrix multiplication
		let tempMat1 = Matrix_New();
		let tempMat2 = Matrix_New();

		//calculate the pose matrix for this bone
		let pose_mat = Matrix_New();
		Matrix_Multiply(tempMat1, bone_mat, bone_mat_actions);
		Matrix_Multiply(tempMat2, bone_mat_head, tempMat1);
		Matrix_Multiply(pose_mat, parent_pose_mat, tempMat2);

		//store this bone's pose matrix in the frameTransformation object
		Matrix_Multiply(skelA.transformationMatricies[currentIdx], skelA.orientation, pose_mat);
		
		//write this bones combined matrix to combinedBoneMats
		Matrix_MultToArrTransp( skelA.hvnsc.combinedBoneMats,
			(currentIdx + skelA.combinedBoneMatOffset)*matrixCard,
			skelA.transformationMatricies[currentIdx],
			skelA.bones[currentIdx].inverseBindPose );

		//calculate the matrix to pass to this bone's children
		Matrix_Multiply(tempMat2, pose_mat, bone_mat_loc_tail);

		//append this bones children to the traversal queue
		for(let i=0; i<skelA.bones[currentIdx].childrenIdxs.length; ++i){
			let newNode = new SkelA_HierarchyNode();
			Matrix_Copy(newNode.parent_mat, tempMat2);
			newNode.idx = skelA.bones[currentIdx].childrenIdxs[i];
			boneQueue.push(newNode);
		}
	}
	
	
}

function SkelA_writeCombinedBoneMatsToGL(hvnsc){
	//write the combined bone matricies to gl
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, hvnsc.boneMatTexture);
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,  gl.NEAREST);
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER,  gl.NEAREST);
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,		gl.CLAMP_TO_EDGE);
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T,		gl.CLAMP_TO_EDGE);
	
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

	let wrappedTime = time * 24;
	if( skelA.loop && wrappedTime > skelA.duration )
		wrappedTime = wrappedTime % skelA.duration;
		
	if( wrappedTime == skelA.lastUpdateTime )
		return false;

	//generate the transformation matrices
	SkelA_GenerateFrameTransformations(skelA, wrappedTime);

	skelA.lastUpdateTime = time;
	return true;
}

function SkelA_GenerateInverseBindPoseTransformations(skelA){
	//breadth first traverse the bone hierarchy and
	//generate the inverse bind pose transformation for each bone
	//this allows for vertices affected by a bone to be brought into bone
	//space so that the bone pose matrix brings the vertex to its animated
	//position

	//initialize the traversal queue
	let boneQueue = [];
	SkelA_InitTraversalQueue(skelA, boneQueue);


	while(boneQueue.length > 0){
		//get the next bone from the queue
		let currentBoneNode = boneQueue.shift();
		let currentIdx = currentBoneNode.idx;

		//get the relevant data from the parent
		let parent_arm_mat    = currentBoneNode.parent_mat;

		//get the relevant data from the current bone
		let bone_mat          = skelA.bones[currentIdx].bone_Mat;
		let bone_mat_head     = skelA.bones[currentIdx].head_Mat;
		let bone_mat_loc_tail = skelA.bones[currentIdx].loc_tail_Mat;

		//temporaries used for matrix multiplications
		let tempMat1 = new Float32Array(4*4);
		let arm_mat  = new Float32Array(4*4);
		let tempMat2 = new Float32Array(4*4);

		//calculate and store the inverse bind_pose/armature_matrix
		Matrix_Multiply(tempMat1, bone_mat_head, bone_mat);
		Matrix_Multiply(arm_mat, parent_arm_mat, tempMat1);
		//invert the bones arm_mat and apply it to the inverse orientation matrix of the armature and store it
		Matrix_Copy(tempMat2, arm_mat);
		Matrix_Inverse(tempMat1, tempMat2);
		Matrix_Multiply(skelA.bones[currentIdx].inverseBindPose,
						tempMat1, skelA.inverseMatrix);

		//calculate the matrix to pass to this bones children
		let mat_to_pass_on = new Float32Array(4*4);
		Matrix_Multiply(mat_to_pass_on, arm_mat, bone_mat_loc_tail);

		//append this bones children to the traversal queue
		for(let i=0; i<skelA.bones[currentIdx].childrenIdxs.length; ++i){
			let newNode = new SkelA_HierarchyNode();
			Matrix_Copy(newNode.parent_mat, mat_to_pass_on);
			newNode.idx = skelA.bones[currentIdx].childrenIdxs[i];
			boneQueue.push(newNode);
		}
	}
}

function SkelA_AnimFileLoaded(skelAnimFile, skelA){
	if( skelAnimFile === undefined ){ 
		skelA.loadCompCallback(skelA, skelA.loadCompCbParams);
		return;
	}
	let skelAnimFileLines = skelAnimFile.split('\n');

	//read in the file line by line
	sLIdx = 0
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
			//read in a bone, find the longest bone animation, and find the
			//parent bone index
			let newBone = new Bone(parseInt(words[1]));
			skelA.bones.push(newBone);
			sLIdx = Bone_Parse(newBone, skelAnimFileLines, sLIdx); //bone constructor handles reading bone
			let tempDuration = skelA.bones[skelA.bones.length-1].animationLength;
			if(tempDuration > skelA.duration) //set the duration
				skelA.duration = tempDuration;
			if(skelA.bones[skelA.bones.length-1].parentName == "None") //set the parent bone idx
				skelA.rootBoneIdxs.push( skelA.bones.length-1 );
		}
	}

	//calculate the orientation matrix of the Animation and its inverse
	//let blenderToHaven = new Float32Array(4*4);
	//Matrix(blenderToHaven, MatrixType.xRot, -Math.PI/2.0);
	//let tempMat = new Float32Array(4*4);
	Matrix( skelA.orientation, MatrixType.euler_transformation, skelA.scale, skelA.rotation, skelA.origin );
	//Matrix_Multiply(skelA.orientation, blenderToHaven, tempMat);
	let orientationCpy = new Float32Array(4*4);
	Matrix_Copy(orientationCpy, skelA.orientation);
	Matrix_Inverse(skelA.inverseMatrix, orientationCpy); //destructive operation on source matrix

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

	// create a texture to hold the combined toBoneSpaceMatrix and toAnimatedWorldSpace matrices
	let texFloatExt = gl.getExtension('OES_texture_float');
	if (!texFloatExt) {
		DPrintf("OES_texture_float not supported");
		return; // the extension doesn't exist on this device
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
