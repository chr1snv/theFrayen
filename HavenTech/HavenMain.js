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

function havenMain(){
    //cameraStream = new CameraStream();

    registerInputHandlers();

    graphics = new Graphics(document.getElementById('frayenCanvas'));
    console.log("graphics loaded");
    mainScene = new HavenScene("penisModel", sceneLoaded);
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
        var relMx = mCoords.x - mDownCoords.x;
        var relMy = mCoords.y - mDownCoords.y;
        var mX = relMx/graphics.screenWidth;// - 0.5;
        var mY = relMy/graphics.screenHeight;// - 0.5;
    }
    var camRotUpdate     = new Float32Array( [ (-mY*Math.PI/180), (-mX*Math.PI/180), 0 ] );

    //send the updates to the camera
    mainScene.cameras[mainScene.activeCameraIdx].UpdateOrientation(camPositionUpdate, camRotUpdate);
}
