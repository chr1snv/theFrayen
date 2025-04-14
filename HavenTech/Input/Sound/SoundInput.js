

//https://pulakk.github.io/Live-Audio-MFCC/tutorial.html


//https://stackoverflow.com/questions/62392352/mediadevices-getusermedia-how-can-i-set-audio-constraints-sampling-rate-bit-d
async function getAvaliableMicInputSettings(){
	let stream = await navigator.mediaDevices.getUserMedia( {audio: true} );
	let track = stream.getAudioTracks()[0];
	console.log(track.getCapabilities());
}


function createMicSrcFrom ( audioCtx, fufilledFunc ) {
	return new Promise ( ( resolve, reject ) => {
		// only audio 
		let constraints = { audio : { sampleRate:micSampleRate, channelCount:1, autoGainControl: true, echoCancellation: true, noiseSuppression: true }, video : false };

		// get microphone access
		navigator.mediaDevices.getUserMedia ( constraints ).
		then ( ( stream ) => {
			// create source from microphone input stream
			try{
				let src = audioCtx.createMediaStreamSource ( stream );
				
				let track = stream.getAudioTracks()[0];
				let trackSettings = track.getSettings();
				let sampleRate = trackSettings.sampleRate;
				console.log("mic sampleRate " + sampleRate);
				
				resolve ( src );
			
			}catch(e){
				console.log(e);
				micSampleRate = aCtx.sampleRate; //couldn't downsample, try again with common sample rate
				NumMicFFTBins = getNeededFFTSizeForSampleRate( micSampleRate );
				amCtx.close();
				amCtx = null;
				StartSoundInput();
			}
			
		}).catch ( (err ) => { reject ( err ) } )
	}).then( (stream) => { fufilledFunc(stream) } )
}


/*
let mInCt = 0;
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
let micInputProcessor = null;
*/


function StartSoundInput(){

	if( amCtx == null ){
		if( micSampleRate != aCtx.sampleRate )
			amCtx = new AudioContext({sampleRate: micSampleRate});
		else
			amCtx = aCtx; //don't need to make a new context because it's the same sample rate
	}

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
		createMicSrcFrom(amCtx, micSrcCreated );
	//} );

}

function getNeededFFTSizeForSampleRate(sampleRate){
	const hrtzPerBin = 30;
	let numBins = sampleRate/hrtzPerBin;
	return closestLargerPowerOfTwo(numBins);
}

let amCtx = null;
let analyser = null;
let micSampleRate = 16000;
let analyserOutputBuffer = null;
let NumMicFFTBins = 512;
let fftToLogMelWorker = null;
function micSrcCreated(micStream){
	//micStream.connect(micInputProcessor);
	//scriptNode.connect(audioCtx.destination);

	//https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/AnalyserNode
	analyser = amCtx.createAnalyser();
	analyser.fftSize = NumMicFFTBins;
	analyser.smoothingTimeConstant = 0.02;

	let bufferLength = analyser.frequencyBinCount; //half fftSize => 512
	console.log("FFT bufferLength " + bufferLength);
	analyserOutputBuffer = new Uint8Array(bufferLength);
	micStream.connect( analyser );

	//const canvas = document.get
	genLogMelFreqBanks();

	fftToLogMelWorker = new Worker("FFTInputToLogMelSpeechAndVoiceWorker.js");

	

}

function freqToFFTBin(freq, numBins, sampleRate){
	//NumMicFFTBins
	let binFreqWidth = sampleRate/2/numBins;
	return Math.floor(freq / binFreqWidth);
}
function FFTBinToFreq( n, numBins, sampleRate ){
	let binFreqWidth = sampleRate/2/numBins;
	return n * binFreqWidth;
}


//FFT -> Log Mel Cepstrum
//Bin  = FFT output
//Bank = Log Mel Triangular filter
//to get FFT Bin inputs for filter frequencies
//linear spacing below 1000hz
//"logarithmicly" spaced above 1000hz (inverse of log is exponential)
let numLogMelBanks    = 10;
let maxLogMelFreq     = 16000;
let logMelBinOverlapPct = 1.0; //triangular end is at prev/next center bin
let logMelNewValPct = 0.8;

let numLinLogMelBanks = 5;
let maxLinLogMelFreq  = 1000;
let minLinLogMelFreq  = 0;
function LogMelFiltBank(cenBin, halfBinsWidth){
	this.centerBin 		  = cenBin;
	this.numBinsHalfWidth = halfBinsWidth;
	this.sum 			  = 0;
	this.prevSum 		  = 0;
	this.firstDeriv 	  = 0;
	this.firstDerivPrev   = 0;
	this.secondDeriv 	  = 0;
}
function drawFiltBank(filtBank){
	
}
let logMelFiltBanks = new Array( numLogMelBanks );
function genLogMelFreqBanks(){
	const maxLinLogMelBin = freqToFFTBin(maxLinLogMelFreq, NumMicFFTBins, micSampleRate);
	const minLinLogMelBin = freqToFFTBin(minLinLogMelFreq, NumMicFFTBins, micSampleRate);
	const numLinBins = maxLinLogMelBin-minLinLogMelBin;
	let prevCenterBin = 0;
	for( let i = 0; i < numLinLogMelBanks; ++i ){
		let pctOfLinBins = i/numLinLogMelBanks;
		let cenBin = minLinLogMelBin + (pctOfLinBins * numLinBins);
		let halfBinsWidth = cenBin-prevCenterBin;
		logMelFiltBanks[i] = new LogMelFiltBank(cenBin, halfBinsWidth);
		prevCenterBin = cenBin;
	}
	let logLogMelBanks = numLogMelBanks-numLinLogMelBanks; //remaining of numLogMelBanks are expontially spaced
	let maxLogMelBin = freqToFFTBin( maxLogMelFreq, NumMicFFTBins, micSampleRate );
	for( let i = 0; i < logLogMelBanks; ++i ){
		let filterCenterFreq = (Math.pow( 2, i ) / Math.pow(2, logLogMelBanks )) * maxLogMelBin;
		console.log("log cenFreq " + filterCenterFreq );
	}
}
function updateLogMelFiltBanks(){
	let prevCenterBin = 0;
	for( let i = 0; i < logMelFiltBanks.length; ++i ){
		let cenBin 		= logMelFiltBanks[i].centerBin;
		let halfBinWdth = logMelFiltBanks[i].numBinsHalfWidth
		prevCenterBin = cenBin;
	}
}


let spectCanvasElm = document.getElementById('spectInputVisCanvas');
let svCtx = spectCanvasElm.getContext('2d');
let vizIdx = 0;
let freqMagnitudeAvg = 0;
let prevX = 0;
let prevY = 0;
function updateMicInputSpectrogramDisplay(){
	//mic input visualization
	if( analyserOutputBuffer!=null ){
		analyser.getByteFrequencyData(analyserOutputBuffer);
		let maxLogMelBin = freqToFFTBin( maxLogMelFreq, NumMicFFTBins, micSampleRate );
		let visBinStep = svCtx.canvas.height / maxLogMelBin;
		let freqMagnitudeSum = 0;
		for( let i = 0; i < svCtx.canvas.height; ++i ){
			let binIdx = Math.floor(i * visBinStep);
			let v = analyserOutputBuffer[binIdx];
			freqMagnitudeSum += v;
			let binFreq = FFTBinToFreq( binIdx, NumMicFFTBins, micSampleRate );
			svCtx.fillStyle = 'rgb('+v+','+v+','+v+')';
			svCtx.fillRect( vizIdx, svCtx.canvas.height-i, 1, 1 );
		}

		freqMagnitudeSum /= svCtx.canvas.height * 255;
		freqMagnitudeAvg = freqMagnitudeAvg*0.2 +  0.8*freqMagnitudeSum;
		svCtx.fillStyle = 'rgb(0,255,255)';
		let curX = vizIdx;
		let curY = svCtx.canvas.height*(1-freqMagnitudeAvg);
		if( curX < prevX ){
			prevX = curX;
			prevY = curY;
		}
		svCtx.fillRect( curX, curY, 1,1);
		svCtx.strokeStyle = 'rgb(0,255,255)';
		svCtx.beginPath();
		svCtx.moveTo( prevX, prevY );
		svCtx.lineTo( curX, curY );
		svCtx.stroke();
		prevX = curX;
		prevY = curY;

		vizIdx = (++vizIdx % svCtx.canvas.width);
	}
}

function intensityToRgbColor(inten){
	return 
}

//2d texture with texture wrapping, and uv coordinate offset
function ShiftRightAndDisplayFrequencyIntensity(freqIntens){

}
