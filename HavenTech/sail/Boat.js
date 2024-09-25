

//auto tack/jib animation frame selection based on the boat velocity / heading to the
//wind and tide

let windIndc = null;
let windIndcQm = null;

let jibArm = null;
let mainArm = null;
let girlArm = null;
function BOAT_Init(scn){
	//gets a handle to the sailboat and girl models for animation control

	//graphics.GetCached(skelAnimName, thisP.sceneName, SkeletalAnimation, null, QM_ArmatureReadyCallback, thisP)
	jibArm = graphics.cachedObjs[SkeletalAnimation.name][scn.sceneName]["JibArmature"][0];
	jibArm.scriptControlled = true;
	mainArm = graphics.cachedObjs[SkeletalAnimation.name][scn.sceneName]["MainArmature"][0];
	mainArm.scriptControlled = true;
	girlArm = graphics.cachedObjs[SkeletalAnimation.name][scn.sceneName]["Armature"][0];
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

var boatHeading = 0; // offset by 3/2*Math.PI
let boatSpeed = 7;
var currentBoatSpeed = 0;
let sailSpeedLerpPctInOneSec = 1.0/3;

let boatDirVec = Vect_New(2);


var boatMapPosition = Vect3_New();

var boatMapPositionVel = Vect3_New();

var boatPosition = Vect3_NewZero();

var boatMatrix = Matrix_New();
let boatMatrixTemp = Matrix_New();
let boatMatrixTranslate = Matrix_New();
let boatMatrixRotate = Matrix_New();

let boatPosOffset = Vect3_NewVals(6.58775,-5,0);
let boatMatrixPosOffset = Matrix_New();
Matrix_SetIdentity(boatMatrixPosOffset);
Matrix_SetTranslate( boatMatrixPosOffset, boatPosOffset );

let maxTillerDirection = 1.7;
let tillerDirection = 0;
let tillerInputAmt = 0.01;
const restoreAmt = 1.8;

let lastAnimFrame = 0;
let maxAnimFrameDiffStep = 0.1;
let animSpeed = 3;

var lastBoatUpdateTime = -1;

function BOAT_Update( rb2DTris, time, wndHdg ){

	let delTime = time-lastBoatUpdateTime;

	let relWndHdg = MTH_WrapAng0To2PI( (wndHdg/*-(1/180)*Math.PI*/) + boatHeading );

	//handle input
	let inputAmt = tillerInputAmt * currentBoatSpeed;
	let input = false;
	if( keys[keyCodes.KEY_A] == true || keys[keyCodes.LEFT_ARROW] == true ){
		tillerDirection -= inputAmt;
		input = true;
	}
	if( keys[keyCodes.KEY_D] == true || keys[keyCodes.RIGHT_ARROW] == true ){
		tillerDirection += inputAmt;
		input = true;
	}
	if( touch.menuTouch != null ){
		tillerDirection += inputAmt * touch.menuDelta[0] * touchMoveSenValue;
		input = true;
	}
	if( mDown ){
		let mDeltaX = mCoords.x- mDownCoords.x;
		tillerDirection += inputAmt * mDeltaX * mouseXSenValue/20;
		//console.log( mDeltaX );
		input = true;
	}

	if( !input ){
		let dampingAmt = -tillerDirection * restoreAmt * delTime;
		if( Math.sign(dampingAmt + tillerDirection) != Math.sign(tillerDirection) )
			tillerDirection = 0;
		else
			tillerDirection += dampingAmt;
	}
	tillerDirection = Math.max( -maxTillerDirection, Math.min( maxTillerDirection, tillerDirection ) );

	boatHeading += tillerDirection * delTime;
	boatHeading = MTH_WrapAng0To2PI( boatHeading );
	
	let boatPctOfWindSpeed = 1.0;

	let pointOfSail = "STB CLS HLD";
	//find which sail position animation the boat should use for forward motion
	let animTargFrame = 230/ANIM_FRAME_RATE;
	if( relWndHdg < 45/180*Math.PI ){        //170 stb wing on wing
		animTargFrame = 170/ANIM_FRAME_RATE;
		pointOfSail   = "STB WNG ON WNG";
		boatPctOfWindSpeed = 0.8;
	}else if( relWndHdg < 90/180*Math.PI ){  //200 stb reach
		animTargFrame = 200/ANIM_FRAME_RATE;
		pointOfSail   = "STB REACH";
		boatPctOfWindSpeed = 1;
	}else if( relWndHdg < 170/180*Math.PI ){ //230 stb close hauled
		if( lastAnimFrame < 185/ANIM_FRAME_RATE )
			lastAnimFrame = 185/ANIM_FRAME_RATE;
		animTargFrame = 230/ANIM_FRAME_RATE;
		pointOfSail   = "STB CLS HLD";
		boatPctOfWindSpeed = 0.6;
	}else if( relWndHdg < 190/180*Math.PI ){ //155-157 iorns
		if( lastAnimFrame < 155/ANIM_FRAME_RATE )
			lastAnimFrame = 155/ANIM_FRAME_RATE;
		else if( lastAnimFrame > 156/ANIM_FRAME_RATE )
			lastAnimFrame = 156/ANIM_FRAME_RATE;
	
		let lerpPct = (time % 0.5) * 4;
		if( lerpPct > 1 )
			lerpPct = 1 - (lerpPct-1);
		animTargFrame = (155 + lerpPct)/ANIM_FRAME_RATE;
		pointOfSail   = "IORNS";
		boatPctOfWindSpeed = -0.3;
	}else if( relWndHdg < 270/180*Math.PI ){ //560 port close hauled
	if( lastAnimFrame < 500/ANIM_FRAME_RATE )
			lastAnimFrame = 500/ANIM_FRAME_RATE;
		animTargFrame = 560/ANIM_FRAME_RATE;
		pointOfSail = "PRT CLS HLD";
		boatPctOfWindSpeed = 0.6;
	}else if( relWndHdg < 315/180*Math.PI ){ //635 port reach
		if( lastAnimFrame < 156/ANIM_FRAME_RATE )
			lastAnimFrame = 670/ANIM_FRAME_RATE;
		animTargFrame = 635/ANIM_FRAME_RATE;
		pointOfSail = "PRT REACH";
		boatPctOfWindSpeed = 1;
	}else if( relWndHdg < 360/180*Math.PI ){ //130 port wing on wing
		animTargFrame = 130/ANIM_FRAME_RATE;
		pointOfSail   = "PRT WNG ON WNG";
		boatPctOfWindSpeed = 0.8;
	}
	//update the animation of the boat sails to the correct frame
	let frameDiff = animTargFrame - lastAnimFrame;
	if( Math.abs( frameDiff ) > maxAnimFrameDiffStep )
		frameDiff = Math.sign( frameDiff ) * animSpeed * delTime;
	lastAnimFrame += frameDiff;
	SkelA_UpdateTransforms( jibArm, lastAnimFrame, true );
	SkelA_UpdateTransforms( mainArm, lastAnimFrame, true );
	SkelA_UpdateTransforms( girlArm, lastAnimFrame, true );


	let scrnAspc = graphics.GetScreenAspect();
	TR_QueueText  ( rb2DTris, 0.95*scrnAspc      , 0.8, 0.03, 0.03, "RelWndHdg", false, TxtJustify.Right );
	TR_QueueNumber( rb2DTris, 0.95*scrnAspc - 0.3, 0.8, 0.03, 0.03,   relWndHdg * 180 / Math.PI, 2 );
	TR_QueueText  ( rb2DTris, 0.95*scrnAspc      , 0.7, 0.03, 0.03, pointOfSail, false, TxtJustify.Right );


	//rotate the wind indicator to show the relative wind heading
	//scale, rot, trans
	if( windIndcQm.isValid ){
		let wIScl = 0.1;
		Matrix_SetEulerTransformation( windIndcQm.toWorldMatrix, [wIScl,wIScl,wIScl], [-110/180*Math.PI, relWndHdg, 0], [0.4*scrnAspc, 0.8, 0] );
	}

	//sail boat inertia gives the percent that the boat keeps its speed over 1 second
	//delTime is the frame time ( typically fractions of a second )
	//boat original speed percent is 
	let SailSpeedPct = delTime * sailSpeedLerpPctInOneSec;
	currentBoatSpeed = (currentBoatSpeed * (1-SailSpeedPct) ) + (boatSpeed * boatPctOfWindSpeed * SailSpeedPct);

	AngleToVec2Unit( boatDirVec, boatHeading );
	boatMapPositionVel[0] = boatDirVec[1]*currentBoatSpeed;
	boatMapPositionVel[1] = boatDirVec[0]*currentBoatSpeed;

	boatPosition[0] += boatMapPositionVel[0] * delTime;
	boatPosition[1] += boatMapPositionVel[1] * delTime;

	TR_QueueText  ( rb2DTris, 0.95*scrnAspc      , 0.75, 0.03, 0.03, "Boat Speed", false, TxtJustify.Right );
	TR_QueueNumber( rb2DTris, 0.95*scrnAspc - 0.3, 0.75, 0.03, 0.03,   currentBoatSpeed, 2 );

	let boatScale = Vect3_AllOnesConst;
	let boatRotation = [0,0,boatHeading];
	Matrix_SetIdentity( boatMatrixTranslate );
	Matrix_SetTranslate( boatMatrixTranslate, boatPosition );
	Matrix_SetEulerRotate( boatMatrixRotate, boatRotation );
	Matrix_Multiply( boatMatrixTemp, boatMatrixRotate, boatMatrixTranslate );

	Matrix_Multiply( boatMatrix, boatMatrixPosOffset, boatMatrixTemp );
	//Matrix_SetEulerTransformation( boatMatrix, boatScale, boatRotation, boatPosition );

	Vect3_Copy( boatMapPosition, boatPosition ); //position used by regatta in right handed coordinate system
	Vect3_MultiplyScalar( boatMapPosition, -1 );
	Vect3_MultiplyScalar( boatMapPositionVel, -1 );

	lastBoatUpdateTime = time;
}
