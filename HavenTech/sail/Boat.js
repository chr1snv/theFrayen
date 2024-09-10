

//auto tack/jib animation frame selection based on the boat velocity / heading to the
//wind and tide

let windIndc = null;
let windIndcQm = null;

let jibArm = null;
let mainArm = null;
let girlArm = null;
function BOAT_Init(){
	//gets a handle to the sailboat and girl models for animation control

	//graphics.GetCached(skelAnimName, thisP.sceneName, SkeletalAnimation, null, QM_ArmatureReadyCallback, thisP)
	jibArm = graphics.cachedObjs[SkeletalAnimation.name]["girl_35_boatAnimsIntegrated"]["JibArmature"][0];
	jibArm.scriptControlled = true;
	mainArm = graphics.cachedObjs[SkeletalAnimation.name]["girl_35_boatAnimsIntegrated"]["MainArmature"][0];
	mainArm.scriptControlled = true;
	girlArm = graphics.cachedObjs[SkeletalAnimation.name]["girl_35_boatAnimsIntegrated"]["Armature"][0];
	girlArm.scriptControlled = true;

	//no longer needed because "scriptControlled" requires this to be done per frame
	SkelA_UpdateTransforms( jibArm, 0, true );
	SkelA_UpdateTransforms( mainArm, 0, true );
	SkelA_UpdateTransforms( girlArm, 0, true );


	windIndcQm = graphics.cachedObjs[QuadMesh.name]["textMeshes"]["windIndc"][0];
	windIndcQm.isAnimated = true;
	for( let mdl in textScene.models ){
		let model = textScene.models[mdl];
		if( model.quadmesh.meshName == "windIndc" )
			windIndc = model;
	}
}

//130 port wing on wing 			(270-180deg)

//170 stb wing on wing 				(180-90deg)

//200 stb reach 					(90-45deg)

//230 stb close hauled 				(45-0deg)

////520 port reach

//560 port close hauled 			(360-315deg)

//635 port reach 					(270-315deg)

//670 port downwind wing on wing 	(270-180deg)

var boatHeading = 0;
let boatSpeed = 3;

let boatDirVec = Vect_New(2);


let boatToWorldTranslation = Vect3_New();

var boatPosition = Vect3_NewZero();

var boatMatrix = Matrix_New();
let boatMatrixTemp = Matrix_New();
let boatMatrixTranslate = Matrix_New();
let boatMatrixRotate = Matrix_New();

let boatPosOffset = Vect3_NewVals(6.58775,-5,0);
let boatMatrixPosOffset = Matrix_New();
Matrix_SetIdentity(boatMatrixPosOffset);
Matrix_SetTranslate( boatMatrixPosOffset, boatPosOffset );

let maxTillerDirection = 0.2;
let tillerDirection = 0;
let tillerInputAmt = 0.005;
const restoreAmt = 0.01;

let lastAnimFrame = 0;
let maxAnimFrameDiffStep = 0.1;

let lastBoatUpdateTime = -1;

function BOAT_Update( time, wndHdg ){

	let relWndHdg = MTH_WrapAng0To2PI( (wndHdg-(1/180)*Math.PI) - boatHeading );

	//handle input
	let input = false;
	if( keys[keyCodes.KEY_A] == true || keys[keyCodes.LEFT_ARROW] == true ){
		tillerDirection -= tillerInputAmt;
		input = true;
	}
	if( keys[keyCodes.KEY_D] == true || keys[keyCodes.RIGHT_ARROW] == true ){
		tillerDirection += tillerInputAmt;
		input = true;
	}
	if( touch.menuTouch != null ){
		tillerDirection += tillerInputAmt * touch.menuDelta[0] * touchMoveSenValue;
		input = true;
	}
	if( mDown ){
		let mDeltaX = mCoords.x- mDownCoords.x;
		tillerDirection += tillerInputAmt * mDeltaX * mouseXSenValue/20;
		//console.log( mDeltaX );
		input = true;
	}

	if( !input ){
		if( Math.abs(tillerDirection) < restoreAmt * 2 )
			tillerDirection = 0;
		else
			tillerDirection += -Math.sign( tillerDirection ) * restoreAmt;
	}
	tillerDirection = Math.max( -maxTillerDirection, Math.min( maxTillerDirection, tillerDirection ) );

	boatHeading += tillerDirection;
	boatHeading = MTH_WrapAng0To2PI( boatHeading );

	//find which sail position animation the boat should use for forward motion
	let animTargFrame = 230/ANIM_FRAME_RATE;
	if( relWndHdg < 45/180*Math.PI ){ //230 stb close hauled 				(45-0deg)
		animTargFrame = 230/ANIM_FRAME_RATE;
	}else if( relWndHdg < 90/180*Math.PI ){ //200 stb reach 					(90-45deg)
		animTargFrame = 200/ANIM_FRAME_RATE;
	}else if( relWndHdg < 180/180*Math.PI ){ //170 stb wing on wing 				(180-90deg)
		animTargFrame = 170/ANIM_FRAME_RATE;
	}else if( relWndHdg < 270/180*Math.PI ){ //130 port wing on wing 			(270-180deg)
		animTargFrame = 130/ANIM_FRAME_RATE;
	}

	else if( relWndHdg < 315/180*Math.PI ){ //635 port reach 					(270-315deg)
		animTargFrame = 635/ANIM_FRAME_RATE;
	}else if( relWndHdg < 360/180*Math.PI ){ //560 port close hauled 			(360-315deg)
		animTargFrame = 560/ANIM_FRAME_RATE;
	}
	//update the animation of the boat sails to the correct frame
	let frameDiff = animTargFrame - lastAnimFrame;
	if( Math.abs( frameDiff ) > maxAnimFrameDiffStep )
		frameDiff = Math.sign( frameDiff ) * maxAnimFrameDiffStep;
	lastAnimFrame += frameDiff;
	SkelA_UpdateTransforms( jibArm, lastAnimFrame, true );
	SkelA_UpdateTransforms( mainArm, lastAnimFrame, true );
	SkelA_UpdateTransforms( girlArm, lastAnimFrame, true );

	//rotate the wind indicator to show the relative wind heading
	//scale, rot, trans
	if( windIndc != null )
		Matrix_SetEulerTransformation( windIndcQm.toWorldMatrix, [.2,.2,.2], [120/180*Math.PI, relWndHdg, 0], [0, 0.8, 0] );

	let delTime = time-lastBoatUpdateTime;

	AngleToVec2Unit( boatDirVec, boatHeading );
	boatPosition[1] += boatDirVec[0]*boatSpeed * delTime;
	boatPosition[0] += boatDirVec[1]*boatSpeed * delTime;


	let boatScale = Vect3_AllOnesConst;
	let boatRotation = [0,0,boatHeading];
	Matrix_SetIdentity( boatMatrixTranslate );
	Matrix_SetTranslate( boatMatrixTranslate, boatPosition );
	Matrix_SetEulerRotate( boatMatrixRotate, boatRotation );
	Matrix_Multiply( boatMatrixTemp, boatMatrixRotate, boatMatrixTranslate );
	
	Matrix_Multiply( boatMatrix, boatMatrixPosOffset, boatMatrixTemp );
	//Matrix_SetEulerTransformation( boatMatrix, boatScale, boatRotation, boatPosition );

	lastBoatUpdateTime = time;
}
