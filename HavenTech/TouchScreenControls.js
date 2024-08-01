
function TouchScreenControls(){

	this.movementDelta = new Float32Array(2);
	this.lookDelta     = new Float32Array(2);
	this.rollDelta     = 0;
	this.movementTouch = null; //left-right forward-back translation input
	this.lookTouch     = null; //look direction (yaw,pitch) input
	this.rollTouch     = null; //look rotation around forward axis input
	this.menuTouch     = null;
	//clientX (browser viewport relative)
	//screenX (left edge of screen relative y is top relative)
	//pageX (includes scroll offset)
	this.OnTouchStart = function(e){
		for(let i = 0; i < e.touches.length; ++i){
			//new touch
			canvas.relMouseCoords(e.touches[i]);
			if( i == 0 )
				touch.menuTouch = e.touches[i];
			if( e.touches[i].canvasY < e.touches[i].target.height * 0.2 ){
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
		e.preventDefault();
		for(let i = 0; i < e.touches.length; ++i){
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
					
				case touch.lookTouch.identifier:
					touch.lookTouch = null;
					touch.lookDelta[0] = 0;
					touch.lookDelta[1] = 0;
					
				case touch.rollTouch.identifier:
					touch.rollTouch = null;
					touch.rollDelta = 0;
					
				case touch.menuTouch.identifier:
					touch.menuTouch = null;
			}
		}
	}

	this.OnTouchEnd = function(e){
		let movementTouchCancelled = true;
		let lookTouchCancelled     = true;
		let rollTouchCancelled     = true;
		let menuTouchCancelled     = true;
		for(let i = 0; i < e.touches.length; ++i){
			if( touch.movementTouch != null &&
				touch.movementTouch.identifier == e.touches[i].identifier ){
				movementTouchCancelled = false;
			}
			if( touch.lookTouch != null &&
				touch.lookTouch.identifier == e.touches[i].identifier ){
				lookTouchCancelled = false;
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
		if(rollTouchCancelled){
			touch.rollTouch = null;
			touch.rollDelta = 0;
		}
		if( menuTouchCancelled )
			touch.menuTouch = null;

	}

	this.InitTouchListener = function(){
		let canv = graphics.canvas;
		canv.addEventListener( "touchstart",  this.OnTouchStart,  false);
		canv.addEventListener( "touchmove",   this.OnTouchMove,   false);
		canv.addEventListener( "touchcancel", this.OnTouchCancel, false);
		canv.addEventListener( "touchend",    this.OnTouchEnd,    false);
	}

	this.InitTouchListener();

}
