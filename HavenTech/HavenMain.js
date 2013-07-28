//HavenMain.js

function loadTextFile(filename, callback, thisP){
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
    var txtFile = new XMLHttpRequest();
    txtFile.open("GET", filename, false);
    txtFile.overrideMimeType("text/plain;");
    txtFile.send();
    if(txtFile.status == 200 || txtFile.status == 0)
        return txtFile.responseText;
}


function havenMain(){
    //cameraStream = new CameraStream();
    graphics = new Graphics(document.getElementById('frayenCanvas'));
    mainScene = new HavenScene("cubeTest", sceneLoaded);
}

function sceneLoaded(havenScene){
    graphics.Clear();
    havenScene.Draw();
}

function MainLoop(){
    graphics.Clear();
    mainScene.Draw();
}
