//iohelpers.js - Christopher Hoffman Feb 26th, 2013

//requests loading text file of name filename and when ready
//calls the callback to read in the flat file data

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
					//
					if(!( fileSuffix == "hvtIPO" ||
						  fileSuffix == "hvtKeys" ||
						  fileSuffix == "hvtAnim") )
					{
						console.log( "Unable to open file of unknown type: " +  filename);
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
//synchronous loading gives a simpler loop,
//but when there are many assets to load the browser ui hangs
//(becomes non responsive to input)
//so it's best to use asynchronous loading 
//(callbacks allowing the main loop to resume while waiting for something to load
//and the callback to be called continuing / finishing loading when the content is ready)
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
