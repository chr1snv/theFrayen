//HavenMain.js

function loadTextFile(filename, callback, thisP){
    var txtFile = new XMLHttpRequest();
    txtFile.onreadystatechange = function(){
        if(txtFile.readyState == 4){
            if(txtFile.status == 200 || txtFile.status == 0){
                callback(txtFile.responseText, thisP); //callback
            }
            else
                alert( "Unable to open text file: " +  filename);
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
        alert( "Unable to open text file: " +  filename);
        return undefined;
}


function havenMain(){
    try{
        graphics = new Graphics(document.getElementById('frayenCanvas'));
        var mainScene = new HavenScene("wonText");
        alert('in main');
        mainScene.Draw();
        graphics.Clear();
    }catch(err)
    {
        alert(err.message);
    }
}
