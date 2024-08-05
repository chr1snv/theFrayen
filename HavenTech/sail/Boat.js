

//auto tack/jib animation frame selection based on the boat velocity / heading to the
//wind and tide 

let tillerDirection = 0;
let tillerInputAmt = 0.5;
function BOAT_Update(time){

	if( keys[keyCodes.KEY_A] == true || keys[keyCodes.LEFT_ARROW] == true )
		tillerDirection[0] -= tillerInputAmt;
	if( keys[keyCodes.KEY_D] == true || keys[keyCodes.RIGHT_ARROW] == true )
		camPositionUpdate[0] += tillerInputAmt;
}
