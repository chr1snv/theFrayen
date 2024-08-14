

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

let tillerDirection = 0;
let tillerInputAmt = 0.5;
const restoreAmt = 0.01;
function BOAT_Update(time){

	if( keys[keyCodes.KEY_A] == true || keys[keyCodes.LEFT_ARROW] == true ){
		if( tillerDirection > -1 )
			tillerDirection -= tillerInputAmt;
	}else if( keys[keyCodes.KEY_D] == true || keys[keyCodes.RIGHT_ARROW] == true ){
		if( tillerDirection < 1 )
			tillerDirection += tillerInputAmt;
	}else{
		tillerDirection += -Math.sign( tillerDirection ) * restoreAmt;
	}


	SkelA_UpdateTransforms( jibArm, tillerDirection, true );
	SkelA_UpdateTransforms( mainArm, tillerDirection, true );
	SkelA_UpdateTransforms( girlArm, tillerDirection, true );
}
