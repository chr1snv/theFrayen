

function SoundFile( nameIn, sceneNameIn, args, soundReadyCallback, readyCallbackParams ){
	this.sndName = nameIn;
	this.sceneName = sceneNameIn;

	this.onlyPlayOneInstance = args[1];

	this.aCtx = args[0];

	this.soundReadyCallback = soundReadyCallback;
	this.readyCallbackParams = readyCallbackParams;

	this.filename = "scenes/"+this.sceneName+"/sound/"+this.sndName;

	let req = new XMLHttpRequest();
	req.open( 'GET', this.filename, true);
	req.responseType = 'arraybuffer';
	req.onload = SNDF_FileLoaded;
	req.sndFile = this;

	this.isPlaying = false;
	this.isValid = false;

	req.send();
}

function SNDF_FileLoaded(){
	console.log(this);
	let sndFile = this.sndFile;

	sndFile.aCtx.decodeAudioData( this.response, function(buffer){
		sndFile.buffer = buffer;
		sndFile.isValid = true;
		console.log( sndFile );
		
		if( sndFile.soundReadyCallback != null )
			sndFile.soundReadyCallback( sndFile, sndFile.readyCallbackParams );
	} );


}

//https://stackoverflow.com/questions/30482887/playing-a-simple-sound-with-web-audio-api
function SNDF_Play(sndf, aCtx){
	if( !sndf.isValid || sndf.onlyPlayOneInstance && sndf.isPlaying )
		return;

	sndf.sourceNode = aCtx.createBufferSource();
	sndf.sourceNode.buffer = sndf.buffer;
	
	sndf.gainNode = aCtx.createGain();
	sndf.gainNode.value = 0.5;

	sndf.sourceNode.connect(sndf.gainNode);

	sndf.gainNode.connect(aCtx.destination);
	
	sndf.sourceNode.sndFile = sndf;
	sndf.sourceNode.onended = function(){ this.sndFile.isPlaying = false; }

	sndf.isPlaying = true;
	sndf.sourceNode.start(0);
}
