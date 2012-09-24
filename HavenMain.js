//HavenMain.js

function loadTextFile(filename, callback, thisP){
    var txtFile = new XMLHttpRequest();
    txtFile.onreadystatechange = function(){
        if(txtFile.readyState == 4){
            if(txtFile.status == 200 || txtFile.status == 0){
                alert("HavenScene Successfully opened: " + filename);
                callback(txtFile.responseText, thisP); //callback
            }
            else
                alert( "Unable to open Scene file: " +  filename);
        }
    }
    txtFile.open("GET", filename, true);
    txtFile.overrideMimeType("text/plain;");
    txtFile.send();
}


function havenMain(){
    alert('glCanvas: ' + document.getElementById('frayenCanvas'));
    graphics = new Graphics(document.getElementById('frayenCanvas'));
    var mainScene = new HavenScene("wonText");
    alert('wonText loaded');
    mainScene.Draw();
}
