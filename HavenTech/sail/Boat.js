

//auto tack/jib animation frame selection based on the boat velocity / heading to the
//wind and tide 

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
	
	SkelA_UpdateTransforms( jibArm, 0, true );
	SkelA_UpdateTransforms( mainArm, 0, true );
	SkelA_UpdateTransforms( girlArm, 0, true );
}

//130 port wing on wing 			(270-180deg)

//170 stb wing on wing 				(180-90deg)

//200 stb reach 					(90-45deg)

//230 stb close hauled 				(45-0deg)

////520 port reach

//560 port close hauled 			(360-315deg)

//635 port reach 					(270-315deg)

//670 port downwind wing on wing 	(270-180deg)

let boatHeading = 0;

let tillerDirection = 0;
let tillerInputAmt = 0.5;
const restoreAmt = 0.01;

let lastAnimFrame = 0;
let maxAnimFrameDiffStep = 0.1;
function BOAT_Update(time, wndHdg ){

	let relWndHdg = (wndHdg-180*Math.PI) - boatHeading;

	//handle input
	if( keys[keyCodes.KEY_A] == true || keys[keyCodes.LEFT_ARROW] == true ){
		if( tillerDirection > -1 )
			tillerDirection -= tillerInputAmt;
	}else if( keys[keyCodes.KEY_D] == true || keys[keyCodes.RIGHT_ARROW] == true ){
		if( tillerDirection < 1 )
			tillerDirection += tillerInputAmt;
	}else{
		tillerDirection += -Math.sign( tillerDirection ) * restoreAmt;
	}
	
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
	if( windIndc_dbB != null )
	Matrix_SetEulerTransformation( windIndc_dbB.bufSubRanges[0].toWorldMatrix, [.2,.2,.2], [65/180*Math.PI, 0, relWndHdg], [0, 0.8, 0] );
}