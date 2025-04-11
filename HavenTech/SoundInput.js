

//https://pulakk.github.io/Live-Audio-MFCC/tutorial.html



function createMicSrcFrom ( audioCtx, fufilledFunc ) {
	return new Promise ( ( resolve, reject ) => {
		// only audio 
		let constraints = { audio : true, video : false }

		// get microphone access
		navigator.mediaDevices.getUserMedia ( constraints ).
		then ( ( stream ) => {
			// create source from microphone input stream
			let src = audioCtx.createMediaStreamSource ( stream )
			resolve ( src )
		}).catch ( (err ) => { reject ( err ) } )
	}).then( (stream) => { fufilledFunc(stream) } )
}



let mInCt = 0;
/*
function InterpretInputAudio(audioProcessingEvent) {
	// The input buffer is the microphone input
	let inputBuffer = audioProcessingEvent.inputBuffer;
	let inSample = inputBuffer.getChannelData(0);
	for(let i = 0; i < inSample.length; ++i){
		//if ( inSample[i] != 0)
		//	console.log(inSample[i]);
	}
	console.log(mInCt++);
}
*/

let micInputProcessor = null;


function StartSoundInput(){

	//need to recreate nodes (script processor) for each audio context
	//if( micInputProcessor == null ){
		//https://www.dynamsoft.com/codepool/capture-record-audio-html5.html
		//micInputProcessor = aCtx.createScriptProcessor(1024, 1, 0); //1 input 0 output channels

		//micInputProcessor.onaudioprocess = InterpretInputAudio;
	//}

	//audio worklet may need to pass though / forward samples to be used
	/*
	aCtx.audioWorklet.addModule("HavenTech/MicInputProcessor.js").then(
		() => {
		micInputProcessor = new AudioWorkletNode( aCtx, "MicInputProcessor",
			{
				numberOfInputs: 1,
				numberOfOutputs: 0,
				channelCount: 1,
				channelInterpretation: "discrete" 
			} );
		micInputProcessor.addEventListener("onprocessorerror", (event) => { console.log(event);})
		*/
		createMicSrcFrom(aCtx, micSrcCreated );
	//} );


}

let analyser = null;
let analyserOutputBuffer = null;
function micSrcCreated(micStream){
	//micStream.connect(micInputProcessor);
	//scriptNode.connect(audioCtx.destination);

	//https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/AnalyserNode
	analyser = aCtx.createAnalyser();
	analyser.fftSize = 512;

	let bufferLength = analyser.frequencyBinCount; //half fftSize => 512
	console.log(bufferLength);
	analyserOutputBuffer = new Uint8Array(bufferLength);
	micStream.connect( analyser );

	//const canvas = document.get


}





function intensityToRgbColor(inten){
	return 
}

//2d texture with texture wrapping, and uv coordinate offset
function ShiftRightAndDisplayFrequencyIntensity(freqIntens){

}
