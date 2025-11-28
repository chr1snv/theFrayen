//# sourceURL=NetworkCommunications/Iohelpers.js - Christopher Hoffman Feb 26th, 2013
//for use or code/art requests please contact chris@itemfactorystudio.com

//requests loading of file and when ready
//calls the callback to read in the flat file (text file) data

pendingFiles = [];
function loadFile(filename, callback, thisP){
	if( IOTRequest ){
		getFile( finishGetLoadFile, filename, [callback, thisP] );
	}else{
		finishLoadFile(filename, callback, thisP);
	}
}

function finishGetLoadFile(key, params ){
	finishLoadFile( params[0] + "?" + key, params[1][0], params[1][1] );
}

function finishLoadFile(filename, callback, thisP){
	if(callback === undefined)
		DPrintf("callback undefined");
	try{
		let xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function(){
			if(xhr.readyState == 4){
				if(xhr.status == 200 || xhr.status == 0){
					callback(xhr.response, thisP); //callback
				}
				else{
					let fileParts = filename.split('.');
					let fileSuffix = fileParts[fileParts.length-1];

					//before using zip file would request these types though they may not exist, ignores messages for those
					if(!( fileSuffix == "hvtIPO" ||
						  fileSuffix == "hvtKeys" ||
						  fileSuffix == "hvtAnim") ){
						console.log( "Unable to open file of unknown type: " +  filename);
					}
				}
			}
		}
		xhr.responseType = 'blob';
		xhr.open("GET", filename, true);
		//txtFile.overrideMimeType("text/plain;");
		xhr.send();
	}catch(err){
		return undefined;
	}
}
//synchronous is simpler but causes hangs/lockups/freezing so this is used


/*
function havenZipRequestKeyReady( havenZipKey, fileNameAndNextFuncArgs ){
	console.log("havenZipLoaded");
	loadTextFile(fileNameAndNextFuncArgs[0], fileNameAndNextFuncArgs[1], null);
}
*/

function havenZipReady(havenZipData){
	havenSourceZip = new JSZip();
	// more files !
	havenSourceZip.loadAsync(havenZipData)
	.then(function(zip) {
		// you now have every files contained in the loaded zip
		let scriptName = "HavenInclude.js";
		zip.file(scriptName).async("string").then( function(mainScriptText){
			appendScriptFromText( scriptName, mainScriptText, [document.getElementsByTagName("body")[0], startHavenTechLoading] );
		} )
	});
}

function appendScriptFromText( scriptName, scriptText, params ){

	//let blob = new Blob([scriptText], { type: "application/javascript" });
	//let scriptURL = URL.createObjectURL(blob);

	let newScript = document.createElement( "script" );
	newScript.textContent = scriptText;
	//newScript.src = scriptURL;

	params[0].appendChild ( newScript );

	//newScript.src = scriptName;

	if( params.length > 1 && params[1] != null )
		//newScript.onload = params[1];
		params[1]();
}


