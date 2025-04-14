//iohelpers.js - Christopher Hoffman Feb 26th, 2013
//for use or code/art requests please contact chris@itemfactorystudio.com

//requests loading of file and when ready
//calls the callback to read in the flat file (text file) data
function loadTextFile(filename, callback, thisP){
	if(callback === undefined)
		DPrintf("callback undefined");
	try{
		let txtFile = new XMLHttpRequest();
		txtFile.onreadystatechange = function(){
			if(txtFile.readyState == 4){
				if(txtFile.status == 200 || txtFile.status == 0){
					callback(txtFile.responseText, thisP); //callback
				}
				else{
					let fileParts = filename.split('.');
					let fileSuffix = fileParts[fileParts.length-1];

					if(!( fileSuffix == "hvtIPO" ||
						  fileSuffix == "hvtKeys" ||
						  fileSuffix == "hvtAnim") ){
						console.log( "Unable to open file of unknown type: " +  filename);
					}
				}
			}
		}
		txtFile.open("GET", filename, true);
		txtFile.overrideMimeType("text/plain;");
		txtFile.send();
	}catch(err){
		return undefined;
	}
}
//synchronous is simpler but causes hangs/lockups/freezing so this is used

