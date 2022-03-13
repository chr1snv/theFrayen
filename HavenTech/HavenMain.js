//HavenMain.js

/*
function loadTextFile(filename, callback, thisP){
	console.log("loading text file " + filename);
    var txtFile = new XMLHttpRequest();
    txtFile.onreadystatechange = function(){
        if(txtFile.readyState == 4){
            if(txtFile.status == 200 || txtFile.status == 0){
                callback(txtFile.responseText, thisP); //callback
            }
        }
    }
    txtFile.open("GET", filename, true);
    txtFile.overrideMimeType("text/plain;");
    txtFile.send();
}

function loadTextFileSynchronous(filename){
	console.log("loadTextFileSynchronous" + filename);
	console.trace();
    var txtFile = new XMLHttpRequest();
    txtFile.open("GET", filename, false);
    txtFile.overrideMimeType("text/plain;");
    txtFile.send();
    if(txtFile.status == 200 || txtFile.status == 0)
        return txtFile.responseText;
}
*/

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

function sceneChanged()
{
    var sel = document.getElementById("sceneSelection");
    var idx = sel.selectedIndex;
    var newSceneName = sel.children[idx].text;
    
    window.cancelAnimFrame(MainLoop);
    
    mainScene = new HavenScene(newSceneName, sceneLoaded);
}

function sceneLoaded(havenScene)
{
    mainScene = havenScene;
    havenScene.Draw();
    window.setTimeout(MainLoop, 300);
}

function MainLoop()
{

    graphics.Clear();
    UpdateCamera();
    //drawSquare(graphics);
    mainScene.Draw();

    window.requestAnimFrame(MainLoop);
}

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
