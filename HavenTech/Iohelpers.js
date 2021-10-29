//iohelpers.js - Christopher Hoffman Feb 26th, 2013

function loadTextFile(filename, callback, thisP)
{
	if(callback === undefined)
		DPrintf("callback undefined");
    try{
        var txtFile = new XMLHttpRequest();
        txtFile.onreadystatechange = function()
        {
            if(txtFile.readyState == 4)
            {
                if(txtFile.status == 200 || txtFile.status == 0)
                {
                    callback(txtFile.responseText, thisP); //callback
                }
                else
                {
                    var fileParts = filename.split('.');
	                var fileSuffix = fileParts[fileParts.length-1];
                	if(!( fileSuffix == "hvtIPO" ||
                		  fileSuffix == "hvtKeys" ||
                		  fileSuffix == "hvtAnim") )
                	{
                    	alert( "Unable to open file of unknown type: " +  filename);
                    }
                }
            }
        }
        txtFile.open("GET", filename, true);
        txtFile.overrideMimeType("text/plain;");
        txtFile.send();
    }catch(err)
    {
        return undefined;
    }
}
/*
function loadTextFileSynchronous(filename){
    try{
        var txtFile = new XMLHttpRequest();
        txtFile.open("GET", filename, false);
        txtFile.overrideMimeType("text/plain;");
        txtFile.send();
        if(txtFile.status == 200 || txtFile.status == 0)
            return txtFile.responseText;
        alert( "Unable to open text file: " +  filename);
    }catch(err){
    }
}
*/
