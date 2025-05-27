
function TouchScreenControls(){

	this.menuDelta     = new Float32Array(2);
	this.movementDelta = new Float32Array(2);
	this.lookDelta     = new Float32Array(2);
	this.rollDelta     = 0;
	this.upDownDelta   = 0;
	this.movementTouch = null; //left-right , forward-back translation input
	this.lookTouch     = null; //look direction (yaw,pitch) input
	this.rollTouch     = null; //look rotation around forward axis input
	this.upDownTouch   = null; //up down translation input
	this.menuTouch     = null;
	//clientX (browser viewport relative)
	//screenX (left edge of screen relative y is top relative)
	//pageX (includes scroll offset)
	this.OnTouchStart = function(e){
		for(let i = 0; i < e.touches.length; ++i){
			//new touch
			canvas.relMouseCoords(e.touches[i]);
			if( i == 0 ){
				touch.menuTouch = e.touches[i];
				canvasMouseMoveHandler( touch.menuTouch );
			}
			if( e.touches[i].canvasX < e.touches[i].target.width * 0.1 ){
				touch.upDownTouch = e.touches[i];
			}else if( e.touches[i].canvasY < e.touches[i].target.height * 0.2 ){
				touch.rollTouch = e.touches[i];
			}else if( e.touches[i].canvasX < e.touches[i].target.width * floatP5){
				if( !touch.movementTouch )
					touch.movementTouch = e.touches[i];
			}else if( !touch.lookTouch ){
				touch.lookTouch = e.touches[i];
			}
		}
	}

	this.OnTouchMove = function(e){
		//for each type of touch, update its delta (total change in position since start)
		//then store this one as the previous to update the delta relative to next update
		e.preventDefault();
		for(let i = 0; i < e.touches.length; ++i){
			if( touch.menuTouch  && 
				touch.menuTouch.identifier == e.touches[i].identifier ){
				touch.menuDelta[0] += e.touches[i].screenX - touch.menuTouch.screenX;
				touch.menuDelta[1] += e.touches[i].screenY - touch.menuTouch.screenY;
				touch.menuTouch = e.touches[i];
			}
			if( touch.movementTouch  && 
				touch.movementTouch.identifier == e.touches[i].identifier ){
				touch.movementDelta[0] += e.touches[i].screenX - touch.movementTouch.screenX;
				touch.movementDelta[1] += e.touches[i].screenY - touch.movementTouch.screenY;
				touch.movementTouch = e.touches[i];
			}
			else if( touch.lookTouch &&
				touch.lookTouch.identifier == e.touches[i].identifier ){
				touch.lookDelta[0] += e.touches[i].screenX - touch.lookTouch.screenX;
				touch.lookDelta[1] += e.touches[i].screenY - touch.lookTouch.screenY;
				touch.lookTouch = e.touches[i];
			}
			else if( touch.upDownTouch &&
				touch.upDownTouch.identifier == e.touches[i].identifier ){
				touch.upDownDelta += e.touches[i].screenY - touch.upDownTouch.screenY;
				touch.upDownTouch = e.touches[i];
			}
			else if( touch.rollTouch &&
				touch.rollTouch.identifier == e.touches[i].identifier ){
				touch.rollDelta += e.touches[i].screenX - touch.rollTouch.screenX;
				touch.rollTouch = e.touches[i];
			}
		}
	}

	this.OnTouchCancel = function(e){
		for(let i = 0; i < e.touches.length; ++i){
			switch( e.touches[i].identifier ){
				case touch.movementTouch.identifier:
					touch.movementTouch = null;
					touch.movementDelta[0] = 0;
					touch.movementDelta[1] = 0;
					break;
				case touch.lookTouch.identifier:
					touch.lookTouch = null;
					touch.lookDelta[0] = 0;
					touch.lookDelta[1] = 0;
					break;
				case touch.upDownTouch.identifier:
					touch.upDownTouch = null;
					touch.upDownDelta = 0;
					break;
				case touch.rollTouch.identifier:
					touch.rollTouch = null;
					touch.rollDelta = 0;
					break;
				case touch.menuTouch.identifier:
					touch.menuTouch = null;
					touch.menuDelta[0] = 0;
					touch.menuDelta[1] = 0;
			}
		}
	}

	this.OnTouchEnd = function(e){
		//one or more touches ended, assume all have been ended
		//though if some still exist keep them active
		let movementTouchCancelled = true;
		let lookTouchCancelled     = true;
		let upDownTouchCancelled   = true;
		let rollTouchCancelled     = true;
		let menuTouchCancelled     = true;
		for(let i = 0; i < e.touches.length; ++i){ //check which ones remain active
			if( touch.movementTouch != null &&
				touch.movementTouch.identifier == e.touches[i].identifier ){
				movementTouchCancelled = false;
			}
			if( touch.lookTouch != null &&
				touch.lookTouch.identifier == e.touches[i].identifier ){
				lookTouchCancelled = false;
			}
			if( touch.upDownTouch != null &&
				touch.upDownTouch.identifier == e.touches[i].identifier ){
				upDownTouchCancelled = false;
			}
			if( touch.rollTouch != null &&
				touch.rollTouch.identifier == e.touches[i].identifier ){
				rollTouchCancelled = false;
			}
			if( touch.menuTouch != null &&
				touch.menuTouch.identifier == e.touches[i].identifier ){
				menuTouchCancelled = false;
				
			}
		}
		if(movementTouchCancelled){
			touch.movementTouch = null;
			touch.movementDelta[0] = 0;
			touch.movementDelta[1] = 0;
		}
		if(lookTouchCancelled){
			touch.lookTouch = null;
			touch.lookDelta[0] = 0;
			touch.lookDelta[1] = 0;
		}
		if( upDownTouchCancelled  ){
			touch.upDownTouch = null;
			touch.upDownDelta = 0;
		}
		if(rollTouchCancelled){
			touch.rollTouch = null;
			touch.rollDelta = 0;
		}
		if( menuTouchCancelled ){
			touch.menuTouch = null;
			touch.menuDelta[0] = 0;
			touch.menuDelta[1] = 0;
		}

	}

	this.InitTouchListener = function(){
		//attach the touch event callbacks
		let canv = graphics.canvas;
		canv.addEventListener( "touchstart",  this.OnTouchStart,  false);
		canv.addEventListener( "touchmove",   this.OnTouchMove,   false);
		canv.addEventListener( "touchcancel", this.OnTouchCancel, false);
		canv.addEventListener( "touchend",    this.OnTouchEnd,    false);
	}

	this.InitTouchListener();

}
