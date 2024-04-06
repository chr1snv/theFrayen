//HavenMain.js - to request use permission please contact chris@itemfactorystudio.com

//HavenMain has the loop entry / initalization function
//the mainloop and transitions between fullscreen and windowed

//load text file functions has been moved to Iohelpers

//the overall goal / vision for HavenTech is to provide a framework
//for loading / running / editing / saving interactive games, content, apps
//that can run and be published in as many enviroments and on as many devices as possible
//(the content comes first)
//idealy it will have an 3d scene editor, mesh editor, texture atlas creator, and animation / sound sequencer
//with save / load functionality and graphics / sound rendering that scales to the resources of
//the instance at runtime (from multi processor / gpu realtime raytraced, 
//to offline mobile fixed function gpu with baked lighting)
//to do this it is being written in javascript using webgl, because browsers are avaliable on
//desktops (pc, mac, linux), mobile devices (ios, android), consoles (), and vr ()
//and also javascript is pretty performant and without pointers and manual memory managment
//easier to write code with less bugs in than low level compiled languages like c - c++
//HavenTech was first written in c++ for ios, but the difficulty of getting apps published
//and the desire for better tools, tool integration and process of reviewing and approving apps,
//and intrest in the underlying technology in game engines, 
//and experience with unstable closed source engines and programs with
//changing licencing and usage terms lead to making this
//with javascript the source code is distributed with every running version
//so it also allows for learning of how it works and modification / extension
//doing something without being able to explain why (closed source code),
//usually leads to problems later
//the ethos of haven tech / the frayen is to deliver a virtual enviroment
//where ever it can, in the real world hardware and power may be limited
//hence "haven" it is designed to give a place for creativive thoughts and
//experiences to be explored

//transitions the rendering to fullscreen
var fullScrCanvWidthElm  = document.getElementById('fullScrCanvWidth');
var fullScrCanvHeightElm = document.getElementById('fullScrCanvHeight');
var canvWidthElm = document.getElementById('canvWidth');
var canvHeightElm = document.getElementById('canvHeight');
function EnterFullscreen(){
	//change the canvas resolution if in fullscreen or browser window mode
	document.addEventListener('fullscreenchange', (event) => {
		// document.fullscreenElement will point to the element that
		// is in fullscreen mode if there is one. If there isn't one,
		// the value of the property is null.
		if (document.fullscreenElement) {
			//console.log(`Element: ${document.fullscreenElement.id} entered full-screen mode.`);
			//set the canvas to the fullscreen resolution
			graphics.SetCanvasSize( fullScrCanvWidthElm.value, fullScrCanvHeightElm.value );
		} else {
			console.log('Leaving full-screen mode.');
			//set the canvas to the non fullscreen resolution
			graphics.SetCanvasSize( canvWidthElm.value, canvHeight.value );
		}
	});

	//enter fullscreen
	if(graphics.canvas.webkitRequestFullscreen)
	{
		graphics.canvas.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
	}else{
		graphics.canvas.requestFullscrn = 
			graphics.canvas.msRequestFullscreen ||
			graphics.canvas.requestFullscreen;
		
		promise = graphics.canvas.requestFullscreen({unadjustedMovement: true,});
		//alert("promise " + promise );
	}

}

//attempts to lock the mousepointer to the canvas to allow endlessly moving the mouse to rotate the camera
//(first person like mouse input)
var ptrLck = null;
var canvas = document.getElementById('frayenCanvas');
function requestPointerLock(){

	//request mouse pointer lock
	canvas.rqstPtrLck = 
	canvas.requestPointerLock ||
	canvas.mozRequestPointerLock;

	ptrLck = canvas.rqstPtrLck();

//document.addEventListener("mousemove", updatePosition, false);
}
//release the mouse
function releasePointerLock(){
	canvas.relPtrLck =
	canvas.releasePointerCapture;

	canvas.relPtrLck(ptrLck);
	ptrLck = null;
}

function ExitFullscreen(){

	var extFullScrn = 
	document.webkitExitFullscreen ||
	document.mozCancelFullScreen ||
	document.msExitFullscreen ||
	document.exitFullscreen;

	var extPtrLck =
	document.exitPointerLock    ||
	document.mozExitPointerLock;

	// Attempt to unlock
	extFullScrn();
	extPtrLck(ptrLck);

}


var debOctOpac = 1;
function debOctOpacChng(elm){
	debOctOpac = elm.value;
}

let overlapPenaltyElm = document.getElementById('overlapPenalty');
let halfPenaltyElm = document.getElementById('halfPenalty');
let divHalfPenalty = 1;
let divOverlapPenalty = 1;
function treeDivSettingChange(){
	divHalfPenalty = Number.parseInt(halfPenaltyElm.value);
	divOverlapPenalty = Number.parseInt(overlapPenaltyElm.value);
}

var treeDebug;
let debugElm = document.getElementById('treeDebug');
function debugToggle(){
	treeDebug = debugElm.checked;
}

let settingsButtonElm = document.getElementById('showSettings');
let settingsTableElm = document.getElementById('settingsTable');
let orientationTextDiv = document.getElementById('orientationText');
function showHideSettings(){
	if( settingsTableElm.style.display == "none" ){
		settingsTableElm.style.display="contents";
		settingsButtonElm.innerHTML = "V Settings";
		orientationTextDiv.style.display="contents";
	}else{
		orientationTextDiv.style.display="none";
		settingsTableElm.style.display="none";
		settingsButtonElm.innerHTML = "> Settings";
	}
}

let stepTreeDivElm = document.getElementById("stepTreeDiv");
function stepTreeToggle(e){
	if( e.target.value ){
	
	}
}

//entrance point, starts graphics, starts loading the scene
//(which then starts the main update and rendering loop)
let autoRunCountdown = 4;
let stopAutoStart = false;
function havenMain(){
	//cameraStream = new CameraStream();
	CreateDebugTabsOnPage();

	registerInputHandlers();

	graphics = new Graphics(document.getElementById('frayenCanvas'), 
		function(){ statusElm.innerHTML = "Auto run in 5";/*sceneChanged();*/ } ); //get the selected scene from the dropdown and load it
	console.log("graphics loaded");
	touch = new TouchScreenControls();
	//sceneChanged(); //get the selected scene from the dropdown and load it
	window.setTimeout( autoRunCount, 1000 );
}
function stopAutostart(){
	stopAutoStart = true;
	statusElm.innerHTML = "Run";
	runSceneButtonElm.innerHTML = "Run";
	runSceneButtonElm.onclick = loadScene;
}

function autoRunCount(){
	if( !stopAutoStart ){
		statusElm.innerHTML = "Auto run in " + autoRunCountdown;
		if( --autoRunCountdown < 1 )
			loadScene();
		else
			window.setTimeout( autoRunCount, 1000 );
	}
}

function SetCanvasSize(){
	graphics.SetCanvasSize(document.getElementById('canvWidth').value,
							document.getElementById('canvHeight').value);
}

function sceneSelectionFocus(){
	this.selectedIndex=-1;
}

let octTreeDivLogElm = document.getElementById("octTreeDivLog");

//called when the scene selection dropdown changes
var sceneSelectorElm = document.getElementById("sceneSelection");
var statusElm = document.getElementById("status");
var mainLoopAnimRequestHandle = null;
function loadScene()
{
	var idx = sceneSelectorElm.selectedIndex;
	var newSceneName = sceneSelectorElm.children[idx].text;
	
	treeDivSettingChange();

	stop();

	mainScene = new HavenScene(newSceneName, sceneLoaded);

	statusElm.innerHTML = "Loading Scene";
	runSceneButtonElm.innerHTML = "Stop";
	runSceneButtonElm.onclick = stop;
}
runSceneButtonElm = document.getElementById("runSceneButton");
function stop(){
	if( mainLoopAnimRequestHandle ){
		window.cancelAnimFrame(mainLoopAnimRequestHandle);
		mainLoopAnimRequestHandle = null;
	}
	statusElm.innerHTML = "Stopped";
	runSceneButtonElm.innerHTML = "Run";
	runSceneButtonElm.onclick = loadScene;
}

function ResetSettings(){
	mouseXSen.value = 0.1; mouseYSen.value = 0.1;
	touchMoveSen.value = 0.005; touchLookSen.value = 0.1;

	raysPerFrameElm.value = 2000; accumulatedRaysElm.value = 20000;
	pointSizeElm.value = 10; pointFalloffElm.value = 0.5;

	fullScrCanvWidthElm.value = 1920; fullScrCanvHeightElm.value = 1080;
	canvWidthElm.value = 640; canvHeightElm.value = 480;
}

//callback once a scene has finished loading
var sceneTime = 0;
var sceneLoadedTime = 0;
function sceneLoaded(havenScene)
{
	statusElm.innerHTML = "Init Scene";
	sceneLoadedTime = Date.now();
	lastSceneFPSOutputTime = 0;
	framesSinceLastFPSOutputTime = 0;
	mainScene = havenScene;
	//mainScene.Update(sceneTime);
	//mainScene.Draw();
	window.setTimeout(MainLoop, 300);
	//graphics.Clear();
	//graphics.pointGraphics.Setup();
	mouseSenChange();
	touchSenChange();
	//raysPerFrameElm.value = 2000; accumulatedRaysElm.value = 20000;
	raysPerFrameChange();
	//pointSizeElm.value = 10; pointFalloffElm.value = 0.5;
	pointSizeChange();
	statusElm.innerHTML = "Running";
	debugToggle();
	treeHierarchyButtonElm.style.visibility = "inherit";
}

let lastInputTime = -10;
const noInputDisplayHelpOverlayTime = 3; //display help if no user input for 3 seconds
const numTimesBtwnInputHelpOverlayReset = 2;
const resetTimeBtwnInputHelpOverlay = 60;
let numInputHelpOverlayTimesLeft = 2;
let wasntShowingHelpInputOverlay = true;

//the main rendering and update function called each frame
var fpsElm = document.getElementById("fps");
var lastSceneFPSOutputTime = 0;
var framesSinceLastFPSOutputTime = 0;
let lrOrUdAnim = false;
let lrOrUdChangeResetFrames = 3;
function MainLoop()
{
	sceneTime = ( Date.now() - sceneLoadedTime ) /1000;
	//graphics.Clear();
	//graphics.ClearDepth();
	mainScene.Update( sceneTime );
	UpdateCamera( sceneTime );
	//drawSquare(graphics);
	//CheckGLError("before point graphics setup");
	graphics.pointGraphics.Setup();
	//CheckGLError("after point graphics setup");
	mainScene.Draw();
	//console.log("frameRayHits " + totalFrameRayHits );
	//CheckGLError("after draw mainScene");

	mainLoopAnimRequestHandle = window.requestAnimFrame(MainLoop);
	framesSinceLastFPSOutputTime += 1;
	if( sceneTime - lastSceneFPSOutputTime >= 1 ){
		fpsElm.innerHTML = framesSinceLastFPSOutputTime;
		lastSceneFPSOutputTime = sceneTime;
		framesSinceLastFPSOutputTime = 0;
	}
	
	let timeSinceShowingInputHelperOverlay = sceneTime-lastInputTime;
	if( timeSinceShowingInputHelperOverlay > noInputDisplayHelpOverlayTime ){
		
		if( timeSinceShowingInputHelperOverlay > resetTimeBtwnInputHelpOverlay )
			numInputHelpOverlayTimesLeft = numTimesBtwnInputHelpOverlayReset;
		
		if(numInputHelpOverlayTimesLeft > 0 ){
		
			if(wasntShowingHelpInputOverlay){
				wasntShowingHelpInputOverlay = false;
				numInputHelpOverlayTimesLeft -= 1;
			}
		
			graphics.triGraphics.Setup();
			
			if (hasTouchSupport()) {
				//console.log("Mobile device detected");
			
				//draw quads with left of screen movement and right rotate graphics
				
				let transAnimTime = sceneTime%4;
				let lrOff = 0;
				let udOff = 0;
				if( lrOrUdAnim ){
					lrOff = Math.sin(sceneTime*2)*0.25;
					if( Math.abs(lrOff) < 0.05 && lrOrUdChangeResetFrames-- <= 0 ){
						lrOrUdAnim = false;
						lrOrUdChangeResetFrames = 10;
					}
				}else{
					udOff = Math.sin(sceneTime*2)*0.25;
					if( Math.abs(udOff) < 0.05 && lrOrUdChangeResetFrames-- <= 0 ){
						lrOrUdAnim = true;
						lrOrUdChangeResetFrames = 10;
					}
				}
				let cenPos    = [-0.5+lrOff, udOff];
				let wdthHight = [ 0.5      , 0.5  ];
				let minUv     = [   0      , 1    ];
				let maxUv     = [ 0.5      , 0    ];
				graphics.triGraphics.drawScreenSpaceTexturedQuad( 'controls.png', 'default',  cenPos, wdthHight, minUv, maxUv );
				
				
				cenPos        = [ 0.5      , 0    ];
				wdthHight     = [ 0.5      , 0.5  ];
				minUv         = [ 0.5      , 1    ];
				maxUv         = [ 1        , 0    ];
				graphics.triGraphics.drawScreenSpaceTexturedQuad( 'controls.png', 'default',  cenPos, wdthHight, minUv, maxUv );
			
			} else {
				//console.log("Desktop device detected");
				cenPos        = [ 0        , 0    ];
				wdthHight     = [ 2     , 1.5 ];
				minUv         = [ 0        , 1    ];
				maxUv         = [ 1        , 0    ];
				graphics.triGraphics.drawScreenSpaceTexturedQuad( 'kbMouControls.png', 'default',  cenPos, wdthHight, minUv, maxUv );
			}
			
		}
	}else{
		wasntShowingHelpInputOverlay = true;
	}
	
	//graphics.Flush();
}

let pointSizeElm = document.getElementById( "pointSize" );
let pointFalloffElm = document.getElementById( "pointFalloff" );
function pointSizeChange(){
	graphics.pointGraphics.pointSize = pointSizeElm.value;
	graphics.pointGraphics.pointFalloff = pointFalloffElm.value;
}

let raysPerFrameElm = document.getElementById("raysPerFrame");
let accumulatedRaysElm = document.getElementById("accumulatedRays");
function raysPerFrameChange(){
	mainScene.cameras[mainScene.activeCameraIdx].
		changeNumRaysPerFrame( parseInt(raysPerFrameElm.value), parseInt(accumulatedRaysElm.value) );
}

let mouseXSen = document.getElementById("mouseXSen");
let mouseYSen = document.getElementById("mouseYSen");
let mouseXSenValue;
let mouseYSenValue;
function mouseSenChange(){
	mouseXSenValue = mouseXSen.value;
	mouseYSenValue = mouseYSen.value;
}
let touchMoveSen = document.getElementById("touchMoveSen");
let touchLookSen = document.getElementById("touchLookSen");
let touchMoveSenValue;
let touchLookSenValue;
function touchSenChange(){
	touchMoveSenValue = touchMoveSen.value;
	touchLookSenValue = touchLookSen.value;
}

//called from the mainloop, gets user input and updates the freelook camera
let moveAmt = 0.2;
let camPositionUpdate = new Float32Array( 3 );
let mY = 0;
let mX = 0;
let relMx;
let relMy;
let camRotUpdate = new Float32Array(3);

let camLoc = Vect3_NewZero();
let camRot = Vect3_NewZero();
let lastUpdateCameraTime = 0;
let updateCameraTimeDelta = 0;
function UpdateCamera( updateTime )
{
	if( mainScene.cameras.length < 1 )
		return;
		
	updateCameraTimeDelta = updateTime - lastUpdateCameraTime;

	//generate the position update
	camPositionUpdate[0] = 0; camPositionUpdate[1] = 0; camPositionUpdate[2] = 0;
	if( keys[keyCodes.KEY_W] == true || keys[keyCodes.UP_ARROW] == true )
		camPositionUpdate[2] -= moveAmt;
	if( keys[keyCodes.KEY_S] == true || keys[keyCodes.DOWN_ARROW] == true )
		camPositionUpdate[2] += moveAmt;
	if( keys[keyCodes.KEY_A] == true || keys[keyCodes.LEFT_ARROW] == true )
		camPositionUpdate[0] -= moveAmt;
	if( keys[keyCodes.KEY_D] == true || keys[keyCodes.RIGHT_ARROW] == true )
		camPositionUpdate[0] += moveAmt;

		camPositionUpdate[0] += touch.movementDelta[0]*touchMoveSenValue;
		camPositionUpdate[2] += touch.movementDelta[1]*touchMoveSenValue;
		
	
	//generate the rotation update
	
	if( mDown ){
		if(document.pointerLockElement == null)
			requestPointerLock();
	}
	relMx = mCoordDelta.x;//mCoords.x - mDownCoords.x;
	relMy = mCoordDelta.y;//mCoords.y - mDownCoords.y;
	mX = relMx*mouseXSenValue; 
	mY = relMy*mouseYSenValue; 
	mX += touch.lookDelta[0]*touchLookSenValue;
	mY += touch.lookDelta[1]*touchLookSenValue;

	camRotUpdate[0] = mX*Math.PI/180;
	camRotUpdate[1] = mY*Math.PI/180;
	camRotUpdate[2] = 0;
	mCoordDelta.x = mCoordDelta.y = 0;
	
	if( keys[keyCodes.KEY_Q] == true )
		camRotUpdate[2] -= moveAmt*3*updateCameraTimeDelta;
	if( keys[keyCodes.KEY_E] == true )
		camRotUpdate[2] += moveAmt*3*updateCameraTimeDelta;
	
	
	let cam = mainScene.cameras[mainScene.activeCameraIdx];
	
	if( Vect3_LengthSquared( camRotUpdate ) > 0.000001 || 
		Vect3_LengthSquared( camPositionUpdate ) > 0.000001 ){
		lastInputTime = sceneTime;
		//update the camera position / orientation text
		cam.getLocation(camLoc);
		cam.getRotation(camRot);
		document.getElementById("orientationText").childNodes[1].textContent =
			"with camera " + Vect_FixedLenStr( camLoc, 2, 6 ) + " location " + 
							 Vect_FixedLenStr( camRot, 2, 6 ) + " rotation";
	}

	//send the updates to the camera
	cam.UpdateOrientation( camPositionUpdate, camRotUpdate, updateTime );
	lastUpdateCameraTime = updateTime;
}
