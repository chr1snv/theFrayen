//# sourceURL=Output/Sound/SoundFile.js

function SoundFile( nameIn, sceneNameIn, args, soundReadyCallback, readyCallbackParams ){
	this.sndName = nameIn;
	this.sceneName = sceneNameIn;

	this.onlyPlayOneInstance = args[1];

	this.aCtx = args[0];

	this.soundReadyCallback = soundReadyCallback;
	this.readyCallbackParams = readyCallbackParams;

	this.filename = this.sceneName+"/sound/"+this.sndName;

	//let req = new XMLHttpRequest();
	//req.open( 'GET', this.filename, true);
	//req.responseType = 'arraybuffer';
	//req.onload = SNDF_FileLoaded;
	//req.sndFile = this;

	this.hasPlayed = false;
	this.isPlaying = false;
	this.isValid = false;

	getFileFromSceneZip(this.sceneName, this.filename, "arraybuffer", SNDF_FileLoaded, this )
	//req.send();
}

function SNDF_FileLoaded(sndFileArrayB, thisP){

	//let sndFileUrl = URL.createObjectURL( sndFileBlob, { type: 'audio/mpeg' } );
	thisP.aCtx.decodeAudioData( sndFileArrayB, function(buffer){
		thisP.buffer = buffer;
		thisP.isValid = true;
		
		if( thisP.soundReadyCallback != null )
			thisP.soundReadyCallback( thisP, thisP.readyCallbackParams );
	} );


}

function SNDF_Stop(sndf, aCtx, clearCanPlayOnce){
	if(sndf.sourceNode != undefined){
		sndf.sourceNode.stop();
		sndf.isPlaying = false;
	}
	if( clearCanPlayOnce )
		this.hasPlayed = false;
}

//https://stackoverflow.com/questions/30482887/playing-a-simple-sound-with-web-audio-api
function SNDF_Play(sndf, aCtx, vol, clearCanPlayOnce){
	if( !sndf.isValid || sndf.onlyPlayOneInstance && sndf.isPlaying || sndf.hasPlayed && !clearCanPlayOnce )
		return;

	sndf.sourceNode = aCtx.createBufferSource();
	sndf.sourceNode.buffer = sndf.buffer;
	
	sndf.gainNode = aCtx.createGain();
	sndf.gainNode.gain.value = vol;

	sndf.sourceNode.connect(sndf.gainNode);

	sndf.gainNode.connect(aCtx.destination);
	
	sndf.sourceNode.sndFile = sndf;
	sndf.sourceNode.onended = function(){ this.sndFile.isPlaying = false; }

	sndf.isPlaying = true;
	sndf.sourceNode.start(0);
	sndf.hasPlayed = true;
}
