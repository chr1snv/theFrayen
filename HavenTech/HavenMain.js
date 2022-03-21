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
//and intrest in game engines, lead to making this


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

    graphics = new Graphics(document.getElementById('frayenCanvas'));
    console.log("graphics loaded");
    sceneChanged(); //get the selected scene from the dropdown and load it
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
function sceneLoaded(havenScene)
{
    mainScene = havenScene;
    havenScene.Draw();
    window.setTimeout(MainLoop, 300);
}

//the main rendering and update function called each frame
function MainLoop()
{

    graphics.Clear();
    UpdateCamera();
    //drawSquare(graphics);
    mainScene.Draw();

    window.requestAnimFrame(MainLoop);
}

//called from the mainloop, gets user input and updates the freelook camera
function UpdateCamera()
{

    //generate the position update
    var moveAmt = 0.2;
    var camPositionUpdate = new Float32Array( [ 0, 0, 0 ] );
    if( keys[keyCodes.KEY_W] == true )
        camPositionUpdate[2] -= moveAmt;
    if( keys[keyCodes.KEY_S] == true )
        camPositionUpdate[2] += moveAmt;
    if( keys[keyCodes.KEY_A] == true )
        camPositionUpdate[0] -= moveAmt;
    if( keys[keyCodes.KEY_D] == true )
        camPositionUpdate[0] += moveAmt;

    //generate the rotation update
    var mY = 0;
    var mX = 0;
    if( mDown )
    {
        if(ptrLck == null)
            requestPointerLock();
    }
    var relMx = mCoordDelta.x;//mCoords.x - mDownCoords.x;
    var relMy = mCoordDelta.y;//mCoords.y - mDownCoords.y;
    var mX = relMx*document.getElementById("mouseXSen").value; ///graphics.screenWidth*document.getElementById("mouseXSen").value;// - 0.5;
    var mY = relMy*document.getElementById("mouseYSen").value; ///graphics.screenHeight*document.getElementById("mouseYSen").value;// - 0.5;
    
    var camRotUpdate     = new Float32Array( [ (-mY*Math.PI/180), (-mX*Math.PI/180), 0 ] );
    mCoordDelta.x = mCoordDelta.y = 0;

    //send the updates to the camera
    mainScene.cameras[mainScene.activeCameraIdx].UpdateOrientation(camPositionUpdate, camRotUpdate);
}
