//# sourceURL=HavenMain.js - to request use permission please contact chris@itemfactorystudio.com

//HavenMain has the loop entry / initalization function
//the mainloop and transitions between fullscreen and windowed

//load text file functions has been moved to Iohelpers

//the overall goal / vision for HavenTech is to provide a framework
//for loading / running / editing / saving interactive games, content, apps
//that can run and be published in as many enviroments and on as many devices as possible
//(the content comes first)
//idealy it will have an 3d scene editor, mesh editor, texture atlas creator, and animation / sound sequencer
//with save / load functionality and graphics / sound rendering that scales to the resources of
//the instance at runtime (from high end multi processor / gpu realtime raytraced, 
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
//the ethos/goal/mantra/aim of haven tech / the frayen is to deliver a virtual enviroment
//where ever it can, in the real world hardware and power may be limited
//hence "haven" it is designed to give a place for creative thoughts and
//experiences (imagination) to be explored

//transitions the rendering to fullscreen
var fullScrCanvWidthElm  = document.getElementById('fullScrCanvWidth');
var fullScrCanvHeightElm = document.getElementById('fullScrCanvHeight');
var canvWidthElm = document.getElementById('canvWidth');
var canvHeightElm = document.getElementById('canvHeight');
async function EnterFullscreen(){
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
		
		/*promise =*/await graphics.canvas.requestFullscreen({unadjustedMovement: true,});
		//alert("promise " + promise );
	}

}

function SetCanvasSize(){
	graphics.SetCanvasSize(canvWidthElm.value,
							canvHeightElm.value);
}


var canvas = document.getElementById('frayenCanvas');


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
function setSettingsDispCamLimitInputs(cam){
	camNearElm.value = cam.nearClip;
	camFarElm.value = cam.farClip;
}

let settingsButtonElm = document.getElementById('showSettings');
let settingsTableElm = document.getElementById('settingsTable');
let orientationTextDivE = document.getElementById('orientationTextDiv');
function showHideSettings(){
	if( settingsTableElm.style.display == "none" ){
		settingsTableElm.style.display="contents";
		settingsButtonElm.innerHTML = "V Settings";
		orientationTextDivE.style.display="inline-block";
		posDbgText = true;
	}else{
		orientationTextDivE.style.display="none";
		settingsTableElm.style.display="none";
		settingsButtonElm.innerHTML = "> Settings";
		posDbgText = false;
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

let AnimPlaybackEnabled = true;
let animPlayElm = document.getElementById('animPlayDiv');
function animPlayToggle(){
	AnimPlaybackEnabled = animPlayElm.checked;
}

function graphicsLoaded(){
	TXTR_Init(function(){ loadScene(); }); //load text meshes

}

//entrance point, starts graphics, starts loading the scene
//(which then starts the main update and rendering loop)
let autoRunCountdown = 0;
let stopAutoStart = false;
function havenMain(){

	animDebugToggle(); //init variable to the checkbox state

	//uncomment and run module unit tests here
	//ray2Tests();

	//cameraStream = new CameraStream();
	CreateDebugTabsOnPage();

	registerInputHandlers();

	statusElm.innerHTML = "Graphics init";

	graphics = new Graphics( document.getElementById('frayenCanvas'), 
		function(){ 
			statusElm.innerHTML = "Loading scene"; 
			graphicsLoaded();/*"Auto run starting";/*sceneChanged();*/ 
		} 
	); //get the selected scene from the dropdown and load it
		
	canvWidthElm.value = window.innerWidth * 0.9;
	canvHeightElm.value = window.innerHeight;
	fullScrCanvWidthElm.value = screen.width;
	fullScrCanvHeightElm.value = screen.height;
	
	console.log("graphics inited");
	touch = new TouchScreenControls();
	//sceneChanged(); //get the selected scene from the dropdown and load it
	//window.setTimeout( autoRunCount, 1000 );

}
function stopAutostart(){
	stopAutoStart = true;
	statusElm.innerHTML = "Run";
	runSceneButtonElm.innerHTML = "Run";
	runSceneButtonElm.onclick = loadScene;
}

/*
function autoRunCount(){
	if( !stopAutoStart ){
		statusElm.innerHTML = "Auto run in " + autoRunCountdown;
		if( --autoRunCountdown < 1 )
			loadScene();
		else
			window.setTimeout( autoRunCount, 1000 );
	}
}
*/


function sceneSelectionFocus(){
	this.selectedIndex=-1;
}

let octTreeDivLogElm = document.getElementById("octTreeDivLog");

//called when the scene selection dropdown changes
var sceneSelectorElm = document.getElementById("sceneSelection");
var mainLoopAnimRequestHandle = null;
function loadScene()
{
	var idx = sceneSelectorElm.selectedIndex;
	var newSceneName = sceneSelectorElm.children[idx].text;

	stop();


	mainScene = new HavenScene(newSceneName, sceneLoaded);


	statusElm.innerHTML = "Reading Scene";
	runSceneButtonElm.innerHTML = "Stop";
	runSceneButtonElm.onclick = stop;

	//loadSceneSounds(newSceneName);
}
runSceneButtonElm = document.getElementById("runSceneButton");
var running = false;
function stop(){
	running = false;
	//if( mainLoopAnimRequestHandle ){
		window.cancelAnimFrame(mainLoopAnimRequestHandle);
		mainLoopAnimRequestHandle = null;
	//}
	statusElm.innerHTML = "Stopped";
	runSceneButtonElm.innerHTML = "Run";
	runSceneButtonElm.onclick = loadScene;

	TR_CleanupFrameGlyphs();
	CleanUpRasterBatches();
	GRPH_Cleanup(graphics);
	delete( mainScene );

	SND_StopAllPlayingSoundFiles();

}

function ResetSettings(){
	mouseXSenE.value = 0.1; mouseYSenE.value = 0.1;
	touchMoveSenE.value = 0.005; touchLookSenE.value = 0.1;

	fullScrCanvWidthElm.value = 1920; fullScrCanvHeightElm.value = 1080;
	canvWidthElm.value = 640; canvHeightElm.value = 480;
}

//callback once a scene has finished loading
var sceneTime = 0;
var lastSceneTimeUpdate = 0;
var mainScene = null;
var mainCam = null;
function sceneLoaded(havenScene)
{
	statusElm.innerHTML = "Init Scene";
	lastSceneFPSOutputTime = 0;
	framesSinceLastFPSOutputTime = 0;
	mainScene = havenScene;
	//mainScene.Update(sceneTime);
	//mainScene.Draw();
	//graphics.Clear();
	//graphics.pointGraphics.Setup();
	mouseSenChange();
	touchSenChange();

	SetCanvasSize( );

	statusElm.innerHTML = "Running";


	mainCam = mainScene.cameras[mainScene.activeCameraIdx];
	if( posDbgText ){
		UpadateMousePosText();
		UpdateCamTransText(mainCam);
	}


	rastBatch2dTris.camWorldPos = Vect3_ZeroConst;
	rastBatch2dTris.ambientColor = [0.1,0.0,0.1];
	rastBatch2dTris.numLights = 1;
	let lcol = [0.1,0,0.2]
	let leng = 1;
	let lampType = LightType.Point;
	let lghtLoc = [0,2,1];
	let lghtRot = [0,0,0];
	let lspotsz = undefined;
	let lanim = ''; 
	rastBatch2dTris.lights = [
		new Light("menuLight", "menu", 
				lcol, leng, lampType, lghtLoc, lghtRot, lspotsz, lanim)];
				
	//sceneSpecificLoaded( Scene );
	sceneSpecificLoad(havenScene.scnId, loadSceneSounds);

}


let befrCanvElm = document.getElementById('befrCanv');
let aftrCanvElm = document.getElementById('aftrCanv');
function hidePage(hide){
	if(hide){
		befrCanvElm.style.display = 'none';
		aftrCanvElm.style.display = 'none';
		//cntrlsTxtElm.style.display = 'none';
	}else{
		befrCanvElm.style.display = '';
		aftrCanvElm.style.display = '';
	//	cntrlsTxtElm.style.display = '';
	}
}

let simPhys = true;

var posDbgText = false;
//the main rendering and update function called each frame
//var fpsElm = document.getElementById("fps");
var lastSceneFPSOutputTime = 0;
var framesSinceLastFPSOutputTime = 0;
var lastFps = 0;
let lrOrUdAnim = false;
let lrOrUdChangeResetFrames = 3;
function MainLoop()
{
	if( !running )
		return;


	if( keysDown[keyCodes.KEY_P] == true )
		simPhys = !simPhys;

	if( mainScene.scnId < 0 ) //default user input
		FlyingCameraControlInput( sceneTime );


	//ready the raster batches for a new frame
	RastB_ClearMdlsAndInitListsForNewFrame( rastBatch2dTris );

	for( let i = 0; i < rastBatch3dTris_array.length; ++i ){
		let rastB = rastBatch3dTris_array[i];
		if( rastB.activeForFrame ){
			RastB_ClearMdlsAndInitListsForNewFrame( rastB );
		}
	}
	for( let i = 0; i < rastBatch3dLines_array.length; ++i ){
		let rastB = rastBatch3dLines_array[i];
		if( AnimTransformDrawingEnabled || rastB.activeForFrame ) //&& mainScene.armatureInsertIdx > 0 )
			RastB_ClearMdlsAndInitListsForNewFrame( rastBatch3dLines_array[i] );
	}


	sceneSpecificUpdateAndGatherObjsToDraw( 
		mainScene.scnId, sceneTime, mainCam, rastBatch2dTris, 
		rastBatch3dTris_array, rastBatch3dLines_array ); //run the game code, generate objects to draw


	if( !document.fullscreenElement ){
		DrawSoundCanvas(sceneTime);
		hidePage(false);
	}else{
		hidePage(true);
	}



	if( mainScene.scnId < 0 )
		Overlay_DrawInputHint(rastBatch2dTris);

	framesSinceLastFPSOutputTime += 1;
	if( Math.abs(sceneTime - lastSceneFPSOutputTime) >= 1 ){
		lastFps = framesSinceLastFPSOutputTime;
		lastSceneFPSOutputTime = sceneTime;
		framesSinceLastFPSOutputTime = 0;
	}
	TR_QueueNumber( rastBatch2dTris, -0.8*graphics.GetScreenAspect(), 0.97, 0.02, 0.03, lastFps, numDecPlaces=0, justify=TxtJustify.Center );



	//generate verticies from objects and upload to gl if necessary
	RastB_PrepareBatchToDraw( rastBatch2dTris );

	for( let i = 0; i < rastBatch3dTris_array.length; ++i ){
		let rastB = rastBatch3dTris_array[i];
		if( rastB.activeForFrame ){
			RastB_PrepareBatchToDraw( rastBatch3dTris_array[i] );
		}
	}
	if( AnimTransformDrawingEnabled ){
		for( let i = 0; i < rastBatch3dLines_array.length; ++i ){
			let rastB = rastBatch3dLines_array[i];
			if( rastB.activeForFrame ){
				RastB_PrepareBatchToDraw( rastBatch3dLines_array[i] );
			}
		}
	}



	//enable vertex attribute objects and call glDrawArrays to rasterize
	//have to draw menu after 3d scene because of transparent textures
	//(the transparent menu bg z depth write prevents the scene behind it from being drawn if done first)


	//now that the batches are ready to draw generate the directional light shadow maps if directional lights (sun) are present
	DEPTH_G_Setup(graphics.depthGraphics);

	//get a list of the directional light

	let shadowmapDrawn = false;
	let shdwIdx = 0;
	for( let j = 0; (!shadowmapDrawn) && (j < rastBatch3dTris_array.length); ++j ){
		let trisBatch = rastBatch3dTris_array[j];
		if( trisBatch.lights ){
			for( let i = 0; !shadowmapDrawn && i < trisBatch.numLights; ++i ){
				let light = trisBatch.lights[i];
				if( light.lightType == LightType.SUN ){
					if( light.lname == "Lamp.001" ){
						Light_RenderShadowTexture(light, trisBatch);
						//DPrintf(shdwIdx +light.lname);
						shadowmapDrawn = true;
					}
					
				}
			}
		}
	}
	DEPTH_G_Cleanup(graphics.depthGraphics);


	//return to default framebuffer
	gl.bindFramebuffer( gl.FRAMEBUFFER, null );
	
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	
	//clear the render buffer and reset rendering state
	//graphics.Clear();
	graphics.ClearDepth();
	//graphics.Flush();
	//graphics.ClearLights();

	CUBE_G_Setup(graphics.cubeGraphics);
	//disable depth buffer write/read test (infinite distance to skybox)
	graphics.enableDepthTest(false);
	graphics.enableDepthMask(false);
	gl.disable(gl.CULL_FACE);
	CUBE_G_DrawSkyBox(graphics.cubeGraphics, mainCam);
	gl.enable(gl.CULL_FACE);
	graphics.enableDepthMask(true);
	graphics.enableDepthTest(true);
	CUBE_G_Cleanup(graphics.cubeGraphics);


	//enable/switch to the triangle glProgram
	if( TRI_G_Setup(graphics.triGraphics) ){

		//draw opaque then transparent materials for each batch
		for( let i = 0; i < rastBatch3dTris_array.length; ++i ){
			let rastB = rastBatch3dTris_array[i];
			if( rastB.activeForFrame ){
				rastBatch3dTris_array[i].DrawFunc(rastBatch3dTris_array[i], sceneTime);
				rastBatch3dTris_array[i].DrawFunc(rastBatch3dTris_array[i], sceneTime, true);
			}
		}


		//draw the 2d ui (would save energy to draw it first though then 3d objects with less depth can clip through)
		graphics.ClearDepth();
		rastBatch2dTris.DrawFunc(rastBatch2dTris, sceneTime);
		rastBatch2dTris.DrawFunc(rastBatch2dTris, sceneTime, true);
	}
	TRI_G_Cleanup(graphics.triGraphics);

	//draw armature debug lines
	let linesToDraw = false;
	for( let i = 0; i < rastBatch3dLines_array.length; ++i ){
		let rastB = rastBatch3dLines_array[i];
		if( rastB.activeForFrame ){
			if( linesToDraw == false ){ //havent yet switched to line graphics gl program
				linesToDraw = true;
				LINE_G_Setup(graphics.lineGraphics);
				graphics.enableDepthTest(false);
				graphics.enableDepthMask(false);
			}
			rastB.DrawFunc(rastBatch3dLines_array[i], sceneTime);
		}
	}
	if( linesToDraw ){
		graphics.enableDepthMask(true);
		graphics.enableDepthTest(true);
	}


	//deallocate things that haven't been used in gl memory for a while 
	RASTB_DefragBufferAllocs(rastBatch2dTris);
	for( let i = 0; i < rastBatch3dTris_array.length; ++i ){
		if( rastBatch3dTris_array[i].activeForFrame ){
			RASTB_DefragBufferAllocs(rastBatch3dTris_array[i], sceneTime);
		}
	}
	for( let i = 0; i < rastBatch3dLines_array.length; ++i ){
		if( rastBatch3dLines_array[i].activeForFrame ){
			RASTB_DefragBufferAllocs(rastBatch3dLines_array[i], sceneTime);
		}
	}


	SND_UserInputsToNotes();

	HVNINPT_ClearKeysDown();


	SND_updateACtx();

	//graphics.ClearColor();
	//graphics.Clear();
	//graphics.Flush();

	//loop this function again when time for next frame
	mainLoopAnimRequestHandle = window.requestAnimFrame(MainLoop);

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

//let camLocV = Vect3_NewZero();
//let camRotQ = Quat_New();
function UpdateCamTransText(cam){
	//cam.getLocation(camLocV);
	//cam.getRotation(camRotQ);
	camLocDiv.textContent = Vect_FixedLenStr( mainCam.camTranslation, 2, 6 );
	camRotDiv.textContent = Vect_FixedLenStr( mainCam.camRotation, 2, 6 );
}

function UpadateMousePosText(){
	mouseLocDiv.textContent = Vect_FixedLenStr( [mCoords.x, mCoords.y], 2, 6 );
	screenPosDiv.textContent = Vect_FixedLenStr( mScreenRayCoords, 2, 6 );
}

let mScreenRayCoords = new Float32Array(2);

let cntrlsTxtElm = document.getElementById("cntrlsTxt");

let lastUpdateCameraTime = 0;
let updateCameraTimeDelta = 0;
function FlyingCameraControlInput( updateTime, camToUpdate=mainCam ){
	//default camera input

	if( camToUpdate == undefined )
		return;

	updateCameraTimeDelta = updateTime - lastUpdateCameraTime;

	Vect3_SetScalar( camPositionUpdate, 0 );
	Vect3_SetScalar( camRotDelEuler, 0 );

	//position (left right, forward back)
	let moveOffset = moveAmt;
	if( keys[keyCodes.SHIFT] == true ) //times 5 movement speed if shift is held
		moveOffset *= 5;
	
	if( keys[keyCodes.KEY_W] == true || keys[keyCodes.UP_ARROW] == true )
		camPositionUpdate[2] -= moveOffset;									//keyboard
	if( keys[keyCodes.KEY_S] == true || keys[keyCodes.DOWN_ARROW] == true )
		camPositionUpdate[2] += moveOffset;									//keyboard
	if( keys[keyCodes.KEY_A] == true || keys[keyCodes.LEFT_ARROW] == true )
		camPositionUpdate[0] -= moveOffset;									//keyboard
	if( keys[keyCodes.KEY_D] == true || keys[keyCodes.RIGHT_ARROW] == true )
		camPositionUpdate[0] += moveOffset;									//keyboard

	camPositionUpdate[0] += touch.movementDelta[0]*touchMoveSenValue;		//touch
	camPositionUpdate[2] += touch.movementDelta[1]*touchMoveSenValue;		//touch

	//position (up down)
	if( keys[keyCodes.KEY_R] == true )
		camPositionUpdate[1] += moveOffset; 								//keyboard
	if( keys[keyCodes.KEY_F] == true )
		camPositionUpdate[1] -= moveOffset;									//keyboard
	camPositionUpdate[1] -= touch.upDownDelta*touchMoveSenValue;			//touch


	//rotation (left right , up down )

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

	camRotDelEuler[0] += -mY*Math.PI/180;
	camRotDelEuler[1] += -mX*Math.PI/180;
	camRotDelEuler[2] += -mW*Math.PI/180;
	mCoordDelta.x = mCoordDelta.y = mCoordDelta.w = 0;

	//roll the camera around it's forward axis
	if( keys[keyCodes.KEY_Q] == true )
		camRotDelEuler[2] += moveAmt*9*updateCameraTimeDelta;
	if( keys[keyCodes.KEY_E] == true )
		camRotDelEuler[2] -= moveAmt*9*updateCameraTimeDelta;


	if( keys[keyCodes.KEY_N] ) //toggle limited view of camera rays near screen position of cursor
		camToUpdate.onlyRaysNearCursor = !camToUpdate.onlyRaysNearCursor;

	//update mouse position text
	mScreenRayCoords[0] = Math.round(mCoords.x/canvas.width*camToUpdate.numHorizRays);
	mScreenRayCoords[1] = Math.round((canvas.height-mCoords.y)/canvas.height*camToUpdate.numVertRays);
	if( posDbgText )
		UpadateMousePosText();


	//update text
	if( Vect3_LengthSquared( camRotDelEuler ) > 0.000001 || 
		Vect3_LengthSquared( camPositionUpdate ) > 0.000001 ){
		lastInputTime = sceneTime;
		//update the camera position / orientation debug text html field display
		if( posDbgText )
			UpdateCamTransText(camToUpdate);
	}

	//send the updates to the camera
	Quat_FromEuler( camRotDel, camRotDelEuler );
	Quat_Norm( camRotDel );
	camToUpdate.UpdateOrientation( camPositionUpdate, camRotDel, updateTime );
	lastUpdateCameraTime = updateTime;

	//Matrix_Copy( tempMat, camToUpdate.camToWorldRotMat );
	//Matrix_Inverse( cubeWorldToCamMat, tempMat );
	//cubeWorldToCamMat = camToUpdate.camToWorldRotMat;
}
