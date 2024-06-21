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

let rcOrSLRastButton = document.getElementById("rcOrSLRast");
var rayCastDrawing = false;
function RayCastOrScanLDrawing(){
	rayCastDrawing = !rayCastDrawing;
	if( rayCastDrawing )
		rcOrSLRastButton.innerHTML = "RayCast Mode";
	else
		rcOrSLRastButton.innerHTML = "ScanLine Mode";
}


var debOctOpac = 1;
function debOctOpacChng(elm){
	debOctOpac = elm.value;
}

let camNearElm = document.getElementById('camNear');
let camFarElm = document.getElementById('camFar');
function camLimitChange(){
	if( mainScene ){
		let cam = mainScene.cameras[mainScene.activeCameraIdx];
		if( cam ){
			cam.nearClip = Number.parseInt(camNearElm.value);
			cam.farClip = Number.parseInt(camFarElm.value);
		}
	}
}
function setCamLimitInputs(cam){
	camNearElm.value = cam.nearClip;
	camFarElm.value = cam.farClip;
}

var treeDebug;
let debugElm = document.getElementById('treeDebug');
function debugToggle(){
	treeDebug = debugElm.checked;
}
var targFps = 60;
let targFpsElm = document.getElementById('targFps');
function targFpsChange(){
	targFps = targFpsElm.value;
}

let tarFpsTglElm = document.getElementById('targFpsToggle');
function toggleTargFps(){
	mainScene.cameras[mainScene.activeCameraIdx].autoRaysPerFrame =
		tarFpsTglElm.checked;
}

let settingsButtonElm = document.getElementById('showSettings');
let settingsTableElm = document.getElementById('settingsTable');
let orientationTextDivE = document.getElementById('orientationTextDiv');
function showHideSettings(){
	if( settingsTableElm.style.display == "none" ){
		settingsTableElm.style.display="contents";
		settingsButtonElm.innerHTML = "V Settings";
		orientationTextDivE.style.display="inline-block";
	}else{
		orientationTextDivE.style.display="none";
		settingsTableElm.style.display="none";
		settingsButtonElm.innerHTML = "> Settings";
	}
}

let stepTreeDivElm = document.getElementById("stepTreeDiv");
function stepTreeToggle(e){
	if( e.target.value ){
	
	}
}

let animDrawElm = document.getElementById('animDbgDiv');
function animDebugToggle(){
	AnimTransformDrawingEnabled = animDrawElm.checked;
}


//entrance point, starts graphics, starts loading the scene
//(which then starts the main update and rendering loop)
let autoRunCountdown = 1;
let stopAutoStart = false;
function havenMain(){

	//ray2Tests();

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
	
	stop();
	

	mainScene = new HavenScene(newSceneName, sceneLoaded);
	

	statusElm.innerHTML = "Loading Scene";
	runSceneButtonElm.innerHTML = "Stop";
	runSceneButtonElm.onclick = stop;
}
runSceneButtonElm = document.getElementById("runSceneButton");
let running = false;
function stop(){
	running = false;
	//if( mainLoopAnimRequestHandle ){
		window.cancelAnimFrame(mainLoopAnimRequestHandle);
		mainLoopAnimRequestHandle = null;
	//}
	statusElm.innerHTML = "Stopped";
	runSceneButtonElm.innerHTML = "Run";
	runSceneButtonElm.onclick = loadScene;
	
	
	CleanUpDrawBatchBuffers();
	GRPH_Cleanup(graphics);
	delete( mainScene );
	
}

function ResetSettings(){
	mouseXSenE.value = 0.1; mouseYSenE.value = 0.1;
	touchMoveSenE.value = 0.005; touchLookSenE.value = 0.1;

	targFpsElm.value = 60;
	tarFpsTglElm.checked = true;
	minRaysPerFrameElm.value = 50; maxRaysPerFrameElm.value = 5000;
	raysPerFrameElm.value = 2000; accumulatedRaysElm.value = 20000;
	pointSizeElm.value = 10; pointFalloffElm.value = 0.1;

	fullScrCanvWidthElm.value = 1920; fullScrCanvHeightElm.value = 1080;
	canvWidthElm.value = 640; canvHeightElm.value = 480;
}

//callback once a scene has finished loading
var sceneTime = 0;
var sceneLoadedTime = 0;
function sceneLoaded(havenScene)
{
	statusElm.innerHTML = "Init Scene";
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
	targFpsChange();
	toggleTargFps();
	//raysPerFrameElm.value = 2000; accumulatedRaysElm.value = 20000;
	raysPerFrameChange();
	//pointSizeElm.value = 10; pointFalloffElm.value = 0.5;
	pointSizeChange();
	statusElm.innerHTML = "Running";
	debugToggle();
	treeHierarchyButtonElm.style.visibility = "inherit";
	
	let cam = mainScene.cameras[mainScene.activeCameraIdx];
	UpadateMousePosText();
	UpdateCamTransText(cam);
	sceneLoadedTime = Date.now();
	running = true;
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
	if( !running )
		return;

	sceneTime = ( Date.now() - sceneLoadedTime ) /1000;
	//graphics.Clear();
	//graphics.ClearDepth();
	mainScene.Update( sceneTime );
	UpdateCamera( sceneTime );
	//drawSquare(graphics);
	//CheckGLError("before point graphics setup");
	//graphics.pointGraphics.Setup();
	//CheckGLError("after point graphics setup");
	HVNSC_Draw( mainScene );
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
		
			TRI_G_Setup(graphics.triGraphics);
			
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
				TRI_G_drawScreenSpaceTexturedQuad(graphics.triGraphics, 'controls.png', 'default',  cenPos, wdthHight, minUv, maxUv );
				
				
				cenPos        = [ 0.5      , 0    ];
				wdthHight     = [ 0.5      , 0.5  ];
				minUv         = [ 0.5      , 1    ];
				maxUv         = [ 1        , 0    ];
				TRI_G_drawScreenSpaceTexturedQuad(graphics.triGraphics, 'controls.png', 'default',  cenPos, wdthHight, minUv, maxUv );
			
			} else {
				//console.log("Desktop device detected");
				cenPos        = [ 0        , 0    ];
				wdthHight     = [ 2        , 1.5  ];
				minUv         = [ 0        , 1    ];
				maxUv         = [ 1        , 0    ];
				TRI_G_drawScreenSpaceTexturedQuad(graphics.triGraphics, 'kbMouControls.png', 'default',  cenPos, wdthHight, minUv, maxUv );
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
let minRaysPerFrameElm = document.getElementById("minRaysPerFrame");
let maxRaysPerFrameElm = document.getElementById("maxRaysPerFrame");
let raysPerFrameElm = document.getElementById("raysPerFrame");
let accumulatedRaysElm = document.getElementById("accumulatedRays");
function raysPerFrameChange(){
	
	mainScene.cameras[mainScene.activeCameraIdx].
		changeNumRaysPerFrame(
			parseInt(raysPerFrameElm.value), 
			parseInt(accumulatedRaysElm.value),
			parseInt(minRaysPerFrameElm.value),
			parseInt(maxRaysPerFrameElm.value),
			tarFpsTglElm.checked
		);
}

let mouseXSenE = document.getElementById("mouseXSen");
let mouseYSenE = document.getElementById("mouseYSen");
let mouseXSenValue;
let mouseYSenValue;
function mouseSenChange(){
	mouseXSenValue = mouseXSenE.value;
	mouseYSenValue = mouseYSenE.value;
}
let touchMoveSenE = document.getElementById("touchMoveSen");
let touchLookSenE = document.getElementById("touchLookSen");
let touchMoveSenValue;
let touchLookSenValue;
function touchSenChange(){
	touchMoveSenValue = touchMoveSenE.value;
	touchLookSenValue = touchLookSenE.value;
}

//called from the mainloop, gets user input and updates the freelook camera
let moveAmt = 0.2;
let camPositionUpdate = Vect3_New();
let mY = 0;
let mX = 0;
let mW = 0;
let relMx;
let relMy;
let camRotDelEuler = Vect3_New();
let camRotDel = Quat_New();

let camLocDiv = document.getElementById("camLoc");
let camRotDiv = document.getElementById("camRot");

let mouseLocDiv  = document.getElementById("mouseCanvPos");
let screenPosDiv = document.getElementById("mouseScreenPos");

let camLocV = Vect3_NewZero();
let camRotQ = Quat_New();
function UpdateCamTransText(cam){
	cam.getLocation(camLocV);
	cam.getRotation(camRotQ);
	camLocDiv.textContent = Vect_FixedLenStr( camLocV, 2, 6 );
	camRotDiv.textContent = Vect_FixedLenStr( camRotQ, 2, 6 );
}

function UpadateMousePosText(){
	mouseLocDiv.textContent = Vect_FixedLenStr( [mCoords.x, mCoords.y], 2, 6 );
	screenPosDiv.textContent = Vect_FixedLenStr( mScreenRayCoords, 2, 6 );
}

let mScreenRayCoords = new Float32Array(2);


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
	//relMw = mCoordDelta.w;
	mX = relMx*mouseXSenValue;
	mY = relMy*mouseYSenValue;
	mX += touch.lookDelta[0]*touchLookSenValue;
	mY += touch.lookDelta[1]*touchLookSenValue;
	mW = touch.rollDelta*touchLookSenValue;

	camRotDelEuler[0] = -mY*Math.PI/180;
	camRotDelEuler[1] = -mX*Math.PI/180;
	camRotDelEuler[2] = -mW*Math.PI/180;
	mCoordDelta.x = mCoordDelta.y = mCoordDelta.w = 0;

	//roll the camera around it's forward axis
	if( keys[keyCodes.KEY_Q] == true )
		camRotDelEuler[2] += moveAmt*9*updateCameraTimeDelta;
	if( keys[keyCodes.KEY_E] == true )
		camRotDelEuler[2] -= moveAmt*9*updateCameraTimeDelta;


	let cam = mainScene.cameras[mainScene.activeCameraIdx];

	if( keys[keyCodes.KEY_N] ) //toggle limited view of camera rays near screen position of cursor
		cam.onlyRaysNearCursor = !cam.onlyRaysNearCursor;

	//update mouse position text
	mScreenRayCoords[0] = Math.round(mCoords.x/canvas.width*cam.numHorizRays);
	mScreenRayCoords[1] = Math.round((canvas.height-mCoords.y)/canvas.height*cam.numVertRays);
	UpadateMousePosText();


	//update text
	if( Vect3_LengthSquared( camRotDelEuler ) > 0.000001 || 
		Vect3_LengthSquared( camPositionUpdate ) > 0.000001 ){
		lastInputTime = sceneTime;
		//update the camera position / orientation text
		UpdateCamTransText(cam);
	}

	//send the updates to the camera
	Quat_FromEuler( camRotDel, camRotDelEuler );
	Quat_Norm( camRotDel );
	cam.UpdateOrientation( camPositionUpdate, camRotDel, updateTime );
	lastUpdateCameraTime = updateTime;
}
