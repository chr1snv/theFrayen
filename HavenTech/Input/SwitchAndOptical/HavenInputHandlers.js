//HavenInputHandlers.js
//to request use or code/art please contact chris@itemfactorystudio.com

//setup input handlers and read / make avaliable user inputs to the
//mainloop

mCoordDelta = {x:0, y:0};
mCoords		= {x:0, y:0};
mDown		= false;
mDownCoords = {x:0, y:0};
keys		= {};
keysDown    = {};

//https://medium.com/geekculture/detecting-mobile-vs-desktop-browsers-in-javascript-ad46e8d23ce5
function hasTouchSupport() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function registerInputHandlers(){
	//register the canvas mouse move callback
	canvas.onmousemove = canvasMouseMoveHandler;
	canvas.ontouchmove = canvasMouseMoveHandler;
	canvas.onmousedown = canvasMouseDownHandler;
	canvas.onmouseup   = canvasMouseUpHandler;
	canvas.onmouseout  = canvasMouseUpHandler;
	//register the canvas keypress callback
	document.onkeydown = pageKeyDownHandler;
	document.onkeyup   = pageKeyUpHandler;
}

function HVNINPT_ClearKeysDown(){
	for( key in keysDown ){
		keysDown[key] = false;
	}
}

function pageKeyDownHandler(e){
	if( e.repeat ) return; // block auto repeat events
	//e.preventDefault();
	let keyCode = e.keyCode;
	//DPrintf( 'keyPressed: ' + keyCode );
	keysDown[keyCode] = true;
	keys[keyCode] = true;
	if( keyCode == 27 )
		releasePointerLock();
}
function pageKeyUpHandler(e){
	//e.preventDefault();
	let keyCode = e.keyCode;
	//DPrintf( 'keyUp: ' + keyCode );
	keys[keyCode] = false;
}

function canvasMouseDownHandler(e){
	//createAudioContext();
	
	mDownCoords.x = mCoords.x;
	mDownCoords.y = mCoords.y;
	mDown = true;
}
function canvasMouseUpHandler(e){
	mDown = false;
}




function canvasMouseMoveHandler(e){

	canvas.relMouseCoords(e);
	mCoords['x'] = e.canvasX;
	mCoords['y'] = e.canvasY;

	if(document.pointerLockElement === canvas ||
		document.mozPointerLockElement === canvas) {
		//console.log('The pointer lock status is now locked');
	} else {
		//console.log('The pointer lock status is now unlocked');
		if(!mDown) //prevent mCoord delta from being updated without
			return; //the mouse clicked or canvas locked
	}

	mCoordDelta.x = e.movementX;
	mCoordDelta.y = e.movementY;
}
//mouse cordinates for canvas
//http://stackoverflow.com/questions/55677/how-do-i-get-the-coordinates-of-a-mouse-click-on-a-canvas-element
function relMouseCoords(e){
	
	
	//https://www.delftstack.com/howto/javascript/javascript-get-screen-size/
	// Get the browser window size (gets smaller as zoom percentage increases)
	let windowWidth = window.innerWidth;
	let windowHeight = window.innerHeight;
	
	let xScale = e.target.width / e.target.offsetWidth;
	let yScale = e.target.height / e.target.offsetHeight;
	
	
	let totalOffsetX = 0;
	let totalOffsetY = 0;
	let canvasX = 0;
	let canvasY = 0;
	let currentElement = this;
	
	do{
	    totalOffsetX += currentElement.offsetLeft;// - currentElement.scrollLeft;
	    totalOffsetY += currentElement.offsetTop;// - currentElement.scrollTop;
	}
	while(currentElement = currentElement.offsetParent)
	    
	e.canvasX = e.pageX - totalOffsetX;
	e.canvasY = e.pageY - totalOffsetY;
	
	//console.log( "eCanv \t" + e.canvasX.toFixed(2) + " : " + e.canvasY.toFixed(2) );
	
	let dontYScale = false;
	if(document.fullscreenElement){
		
		
		e.canvasX = (e.clientX - e.target.offsetLeft);
		e.canvasY = (e.clientY - e.target.offsetTop);
		
		
		let wdth = e.target.offsetWidth;
		let hgth = e.target.offsetHeight;
		
		//if the scale isn't equal, the offset height or width is larger than the canvas (padded)
		//assume x and y scale should be equal
		if( xScale < yScale ){ //width padding
			wdth = e.target.width / yScale;
			xScale = yScale; 
		}else{
			hgth = e.target.height / xScale;
			yScale = xScale;
		}
		
		let minX = ( (window.innerWidth - wdth) / 2);
		let minY = ( (window.innerHeight - hgth) / 2);
		
		
		e.canvasX = (e.canvasX - minX); // / e.target.offsetWidth * e.target.width;
		e.canvasY = (e.canvasY - minY); // / e.target.height;
		
		
	}
	
	
	e.canvasX *= xScale;
	e.canvasY *= yScale;
	
}
HTMLCanvasElement.prototype.relMouseCoords = relMouseCoords;

//https://gist.github.com/cjcliffe/1185173
keyCodes = {
	BACKSPACE: 8,
	TAB: 9,
	ENTER: 13,
	SHIFT: 16,
	CTRL: 17,
	ALT: 18,
	PAUSE: 19,
	CAPS_LOCK: 20,
	ESCAPE: 27,
	SPACE: 32,
	PAGE_UP: 33,
	PAGE_DOWN: 34,
	END: 35,
	HOME: 36,
	LEFT_ARROW: 37,
	UP_ARROW: 38,
	RIGHT_ARROW: 39,
	DOWN_ARROW: 40,
	INSERT: 45,
	DELETE: 46,
	KEY_0: 48,
	KEY_1: 49,
	KEY_2: 50,
	KEY_3: 51,
	KEY_4: 52,
	KEY_5: 53,
	KEY_6: 54,
	KEY_7: 55,
	KEY_8: 56,
	KEY_9: 57,
	KEY_A: 65,
	KEY_B: 66,
	KEY_C: 67,
	KEY_D: 68,
	KEY_E: 69,
	KEY_F: 70,
	KEY_G: 71,
	KEY_H: 72,
	KEY_I: 73,
	KEY_J: 74,
	KEY_K: 75,
	KEY_L: 76,
	KEY_M: 77,
	KEY_N: 78,
	KEY_O: 79,
	KEY_P: 80,
	KEY_Q: 81,
	KEY_R: 82,
	KEY_S: 83,
	KEY_T: 84,
	KEY_U: 85,
	KEY_V: 86,
	KEY_W: 87,
	KEY_X: 88,
	KEY_Y: 89,
	KEY_Z: 90,
	LEFT_META: 91,
	RIGHT_META: 92,
	SELECT: 93,
	NUMPAD_0: 96,
	NUMPAD_1: 97,
	NUMPAD_2: 98,
	NUMPAD_3: 99,
	NUMPAD_4: 100,
	NUMPAD_5: 101,
	NUMPAD_6: 102,
	NUMPAD_7: 103,
	NUMPAD_8: 104,
	NUMPAD_9: 105,
	MULTIPLY: 106,
	ADD: 107,
	SUBTRACT: 109,
	DECIMAL: 110,
	DIVIDE: 111,
	F1: 112,
	F2: 113,
	F3: 114,
	F4: 115,
	F5: 116,
	F6: 117,
	F7: 118,
	F8: 119,
	F9: 120,
	F10: 121,
	F11: 122,
	F12: 123,
	NUM_LOCK: 144,
	SCROLL_LOCK: 145,
	SEMICOLON: 186,
	EQUALS: 187,
	COMMA: 188,
	DASH: 189,
	PERIOD: 190,
	FORWARD_SLASH: 191,
	GRAVE_ACCENT: 192,
	OPEN_BRACKET: 219,
	BACK_SLASH: 220,
	CLOSE_BRACKET: 221,
	SINGLE_QUOTE: 222
};
