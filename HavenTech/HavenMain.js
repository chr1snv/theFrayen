//HavenMain.js

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
function EnterFullscreen(){
    var canvas = document.getElementById('frayenCanvas');
    
    //change the canvas resolution if in fullscreen or browser window mode
    document.addEventListener('fullscreenchange', (event) => {
  // document.fullscreenElement will point to the element that
  // is in fullscreen mode if there is one. If there isn't one,
  // the value of the property is null.
  if (document.fullscreenElement) {
    //console.log(`Element: ${document.fullscreenElement.id} entered full-screen mode.`);
    
    //set the canvas to the fullscreen resolution
    graphics.SetCanvasSize(document.getElementById('fullScrCanvWidth').value,
                       document.getElementById('fullScrCanvHeight').value);
                       
  } else {
    console.log('Leaving full-screen mode.');
    
    //set the canvas to the non fullscreen resolution
    graphics.SetCanvasSize(document.getElementById('canvWidth').value,
                       document.getElementById('canvHeight').value);
  }
});
    
    //enter fullscreen
    if(canvas.webkitRequestFullscreen)
    {
        canvas.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }else{
        canvas.requestFullscrn = 
        canvas.msRequestFullscreen ||
        canvas.requestFullscreen;
        
        promise = canvas.requestFullscreen();
        //alert("promise " + promise );
    }
    
    
    
    
}

//attempts to lock the mousepointer to the canvas to allow endlessly moving the mouse to rotate the camera
//(first person like mouse input)
var ptrLck = null;
function requestPointerLock(){
    
    var canvas = document.getElementById('frayenCanvas');
    
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

    canvas.relPtrLck();
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
    extPtrLck();
    
}

//entrance point, starts graphics, starts loading the scene
//(which then starts the main update and rendering loop)
function havenMain(){
    //cameraStream = new CameraStream();

    registerInputHandlers();

    graphics = new Graphics(document.getElementById('frayenCanvas'), 
        function(){ sceneChanged(); } ); //get the selected scene from the dropdown and load it
    console.log("graphics loaded");
    //sceneChanged(); //get the selected scene from the dropdown and load it
}

function SetCanvasSize(){
    graphics.SetCanvasSize(document.getElementById('canvWidth').value,
                       document.getElementById('canvHeight').value);
}

//called when the scene selection dropdown changes
function sceneChanged()
{
    var sel = document.getElementById("sceneSelection");
    var idx = sel.selectedIndex;
    var newSceneName = sel.children[idx].text;
    
    window.cancelAnimFrame(MainLoop);
    
    mainScene = new HavenScene(newSceneName, sceneLoaded);
}

//callback once a scene has finished loading
var sceneTime = 0;
var sceneLoadedTime = 0;
function sceneLoaded(havenScene)
{
    sceneLoadedTime = Date.now();
    mainScene = havenScene;
    //mainScene.Update(sceneTime);
    //mainScene.Draw();
    window.setTimeout(MainLoop, 300);
    //graphics.Clear();
    graphics.SetupForPixelDrawing();
    mouseSenChange();
    raysPerFrameElm.value = 2000; accumulatedRaysElm.value = 20000;
    raysPerFrameChange();
    pointSizeElm.value = 10; pointFalloffElm.value = 0.5;
    pointSizeChange();
}

//the main rendering and update function called each frame
function MainLoop()
{
    sceneTime = ( Date.now() - sceneLoadedTime ) /1000;
    //graphics.Clear();
    mainScene.Update( sceneTime );
    UpdateCamera( sceneTime );
    //drawSquare(graphics);
    mainScene.Draw();

    window.requestAnimFrame(MainLoop);
    
}

let pointSizeElm = document.getElementById( "pointSize" );
let pointFalloffElm = document.getElementById( "pointFalloff" );
function pointSizeChange(){
    gl.uniform1f(graphics.pointSizeAttr, pointSizeElm.value );
    gl.uniform1f(graphics.pointFalloffAttr, pointFalloffElm.value );
}

let raysPerFrameElm = document.getElementById("raysPerFrame");
let accumulatedRaysElm = document.getElementById("accumulatedRays");
function raysPerFrameChange(){
    mainScene.cameras[mainScene.activeCameraIdx].changeNumRaysPerFrame( raysPerFrameElm.value, accumulatedRaysElm.value );
}

let mouseXSen = document.getElementById("mouseXSen");
let mouseYSen = document.getElementById("mouseYSen");
let mouseXSenValue;
let mouseYSenValue;
function mouseSenChange(){
    mouseXSenValue = mouseXSen.value;
    mouseYSenValue = mouseYSen.value;
}

//called from the mainloop, gets user input and updates the freelook camera
let moveAmt = 0.2;
let camPositionUpdate = new Float32Array( 3 );
let mY = 0;
let mX = 0;
let relMx;
let relMy;
let camRotUpdate = new Float32Array(3);

function UpdateCamera( updateTime )
{
    if( mainScene.cameras.length < 1 )
       return;
       
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

    //generate the rotation update
    
    if( mDown )
    {
        if(ptrLck == null)
            requestPointerLock();
    }
    relMx = mCoordDelta.x;//mCoords.x - mDownCoords.x;
    relMy = mCoordDelta.y;//mCoords.y - mDownCoords.y;
    mX = relMx*mouseXSenValue; 
    ///graphics.screenWidth*document.getElementById("mouseXSen").value;// - 0.5;
    mY = relMy*mouseYSenValue; 
    ///graphics.screenHeight*document.getElementById("mouseYSen").value;// - 0.5;
    
    camRotUpdate[0] = -mY*Math.PI/180;
    camRotUpdate[1] = -mX*Math.PI/180;
    camRotUpdate[2] = 0;
    mCoordDelta.x = mCoordDelta.y = 0;

    //send the updates to the camera
    mainScene.cameras[mainScene.activeCameraIdx].
        UpdateOrientation( camPositionUpdate, camRotUpdate, updateTime );
}
