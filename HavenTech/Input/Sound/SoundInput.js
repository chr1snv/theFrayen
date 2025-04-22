
//filter chain is
//fft ->
//triangular filter banks with derivatives (log mel coefficents)
//convolutional neural network, deep neural network, transformers, hidden markov model phone traversal tree


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
				MicFFTSize = getNeededFFTSizeForSampleRate( micSampleRate );
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
let MicFFTSize = 512;
let fftToLogMelWorker = null;
function micSrcCreated(micStream){
	//micStream.connect(micInputProcessor);
	//scriptNode.connect(audioCtx.destination);

	//https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/AnalyserNode
	analyser = amCtx.createAnalyser();
	analyser.fftSize = MicFFTSize;
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
	//MicFFTSize
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
let logMelPlotFreqHeight = 200;
let numLogMelBanks      = 10;
let maxLogMelFreq       = 8000;
//let logMelBinOverlapPct = 1.0; //triangular end is at prev/next center bin
let logMelNewValPct     = 0.8;

let numLinLogMelBanks = 5;
let maxLinLogMelFreq  = 1000;
let minLinLogMelFreq  = 0;

let logMelInputGraph = new Graph();

function LogMelFiltBank(src, inParam0, inParam1 ){
	this.srcType		  = src;

	if( src == LMSRC_FFT ){ //first layer directly connected to fft freq bins
		this.centerBin 		  = Math.round(inParam0);
		this.numBinsHalfWidth = Math.round(inParam1);
	}else{ //depth 2 filter (based on outputs of first layer)
		this.minBank = inParam0;
		this.maxBank = inParam1;
		//draw on display at  ( minBank.centerBin + maxBank.centerBin ) / 2
	}

	this.sum 			  = 0;
	this.firstDeriv 	  = 0;
	this.secondDeriv 	  = 0;

	this.sumPrev 		  = 0;
	this.firstDerivPrev   = 0;
	this.secondDerivPrev  = 0;


}

//sources for log mel filterbank/nodes
const LMSRC_FFT = 0
const LMSRC_AGG = 1

let filtBankLowFreqAvg = new LogMelFiltBank( LMSRC_AGG,  );

function drawFiltBank(filtBank, canvHeight, maxLogMelBin, offsetX, plotHeight ){
	//draws one of the filter banks on the spectrogram plot

	let centerOffsetY = canvHeight - logMelFreqBinToDispVertCoord( filtBank.centerBin, maxLogMelBin, canvHeight );

	let prevYMag = 0;
	let YMag = 0;

	let prevOffsetX = offsetX - 1;
	if( prevOffsetX < 0 )
		prevOffsetX = 0;

	//draw the spectral magitude (red) for the triangular filter
	prevYMag = Math.min( Math.max( filtBank.sumPrev/25.5, -plotHeight), plotHeight );
	YMag 	 = Math.min( Math.max( filtBank.sum/25.5, 	  -plotHeight), plotHeight );
	svCtx.strokeStyle = 'rgb(255,0,0, 0.8)';
	svCtx.beginPath();
	svCtx.moveTo( prevOffsetX, centerOffsetY - prevYMag );
	svCtx.lineTo( offsetX, centerOffsetY - YMag );
	svCtx.stroke();


	//draw the derivative (green) of the triangular filter
	prevYMag = Math.min( Math.max( filtBank.firstDerivPrev / 1000, -plotHeight), plotHeight );
	YMag 	 = Math.min( Math.max( filtBank.firstDeriv / 1000, 	  -plotHeight), plotHeight );
	svCtx.strokeStyle = 'rgb(0,255,0, 0.35)';
	svCtx.beginPath();
	svCtx.moveTo( prevOffsetX, centerOffsetY - prevYMag );
	svCtx.lineTo( offsetX, centerOffsetY - YMag );
	svCtx.stroke();


	//draw the second derivative (blue) of the triangular filter
	prevYMag = Math.min( Math.max( filtBank.secondDerivPrev / 100000, -plotHeight), plotHeight );
	YMag 	 = Math.min( Math.max( filtBank.secondDeriv / 100000,		-plotHeight), plotHeight );
	svCtx.strokeStyle = 'rgb(0,0,255, 0.5)';
	svCtx.beginPath();
	svCtx.moveTo( prevOffsetX, centerOffsetY - prevYMag );
	svCtx.lineTo( offsetX, centerOffsetY - YMag );
	svCtx.stroke();

}

function fitLogSpacedBinsAndHalfWidthsToSpan( logBinSpan,  ){

	//binary search for the spacing between the log elements to best span the distance for log spaced filter banks
	let logAdjSpan = logBinSpan;
	let lastBinHalfWidth = ( (Math.pow(2,logLogMelBanks) - Math.pow(2,logLogMelBanks-1) ) / Math.pow(2, logLogMelBanks-1) * logAdjSpan ) / 2;
	let firstBinHalfWidth = ( ( Math.pow(2,0) ) / Math.pow(2, logLogMelBanks-1) * logAdjSpan ) / 2;

	let stepSize = lastBinHalfWidth;
	let iters = 10;
	while( --iters > 0 ){
		let adjustedLogBinSpan = lastBinHalfWidth + firstBinHalfWidth + logAdjSpan;
		if( adjustedLogBinSpan < logBinSpan )
			logAdjSpan += stepSize;
		else
			logAdjSpan -= stepSize;
		stepSize /= 2;

		lastBinHalfWidth = ( (Math.pow(2,logLogMelBanks) - Math.pow(2,logLogMelBanks-1) ) / Math.pow(2, logLogMelBanks-1) * logAdjSpan ) / 2;
		firstBinHalfWidth = ( (Math.pow(2,0) ) / Math.pow(2, logLogMelBanks-1) * logAdjSpan ) / 2;
		logBinCenterSpan = logAdjSpan + (lastBinHalfWidth + firstBinHalfWidth);
	}
	return [f];
}

let logMelFiltBanks = new Array( numLogMelBanks );
function genLogMelFreqBanks(){
	//create filter banks so that their half widths end at upper and lower frequencies/bins specified
	const maxLinLogMelBin = freqToFFTBin(maxLinLogMelFreq, MicFFTSize/2, micSampleRate);
	const minLinLogMelBin = freqToFFTBin(minLinLogMelFreq, MicFFTSize/2, micSampleRate);
	const numLinBins = maxLinLogMelBin-minLinLogMelBin;
	const linBinHalfWidth = numLinBins/numLinLogMelBanks/2;
	const linBinCenterSpan = numLinBins - (linBinHalfWidth*2);
	let prevCenterBin = 0;
	for( let i = 0; i < numLinLogMelBanks; ++i ){ //create the linearly spaced filter banks
		let pctOfLinBins = i/(numLinLogMelBanks-1);
		let cenBin = (minLinLogMelBin+linBinHalfWidth) + (pctOfLinBins * linBinCenterSpan);
		logMelFiltBanks[i] = new LogMelFiltBank(LMSRC_FFT, cenBin, linBinHalfWidth);
		prevCenterBin = cenBin;
	}

	//initial info for log spaced banks
	const logLogMelBanks = numLogMelBanks-numLinLogMelBanks; //remaining of numLogMelBanks are expontially spaced
	const maxLogMelBin = freqToFFTBin( maxLogMelFreq, MicFFTSize/2, micSampleRate );
	const logBinSpan = maxLogMelBin - prevCenterBin;
	//the ratio between the first log bank half span and last one is 2^logLogMelBanks
	//each 2^x log bank center distance is twice that of before



	//binary search for the spacing between the log elements to best span the distance for log spaced filter banks
	let logAdjSpan = logBinSpan;
	let lastBinHalfWidth = ( (Math.pow(2,logLogMelBanks) - Math.pow(2,logLogMelBanks-1) ) / Math.pow(2, logLogMelBanks-1) * logAdjSpan ) / 2;
	let firstBinHalfWidth = ( ( Math.pow(2,0) ) / Math.pow(2, logLogMelBanks-1) * logAdjSpan ) / 2;

	let stepSize = lastBinHalfWidth;
	let iters = 10;
	while( --iters > 0 ){
		let adjustedLogBinSpan = lastBinHalfWidth + firstBinHalfWidth + logAdjSpan;
		if( adjustedLogBinSpan < logBinSpan )
			logAdjSpan += stepSize;
		else
			logAdjSpan -= stepSize;
		stepSize /= 2;

		lastBinHalfWidth = ( (Math.pow(2,logLogMelBanks) - Math.pow(2,logLogMelBanks-1) ) / Math.pow(2, logLogMelBanks-1) * logAdjSpan ) / 2;
		firstBinHalfWidth = ( (Math.pow(2,0) ) / Math.pow(2, logLogMelBanks-1) * logAdjSpan ) / 2;
		logBinCenterSpan = logAdjSpan + (lastBinHalfWidth + firstBinHalfWidth);
	}
	let firstLogBinCenter =  prevCenterBin;


	//generate the log spaced filter banks with the found center span
	for( let i = 0; i < logLogMelBanks; ++i ){
		let filterCenterBin = (Math.pow( 2, i ) / Math.pow(2, logLogMelBanks-1 )) * logAdjSpan + firstLogBinCenter;
		console.log("log cenBin " + filterCenterBin );
		//let cenBin = freqToFFTBin(filterCenterFreq, MicFFTSize/2, micSampleRate);
		let halfBinWidth = filterCenterBin-prevCenterBin;
		logMelFiltBanks[i+numLinLogMelBanks] = new LogMelFiltBank(LMSRC_FFT, filterCenterBin, halfBinWidth);
		prevCenterBin = filterCenterBin;
	}


	//generate the second layer sum filter banks (from the previous ones)
	

}

function triangularIntegrate(cenBin, halfBinWdth, bins){

	let bankSum = bins[cenBin];

	//area under a triangle is 1/2 base * height
	//base = halfBinWdth*2 height = 1;

	for(let j = 1; j < halfBinWdth; ++j ){ //lower triangle
		let bin    = cenBin - j;
		let weight = (1-(j/halfBinWdth));
		let binVal = bins[bin];
		bankSum += binVal;
	}
	for(let j = 1; j < halfBinWdth; ++j ){ //upper triangle
		let bin    = cenBin + j;
		let weight = (1-(j/halfBinWdth));
		let binVal = bins[bin];
		bankSum += binVal;
	}
	bankSum /= halfBinWdth;
	return bankSum;
}

function updateLogMelFiltBanks(bins, dT){

	for( let i = 0; i < logMelFiltBanks.length; ++i ){

		let bF = logMelFiltBanks[i];

		bF.sumPrev 		   = bF.sum;
		bF.firstDerivPrev  = bF.firstDeriv;
		bF.secondDerivPrev = bF.secondDeriv;

		//average the values for range/gain adjustment

		if( bF.srcType == LMSRC_FFT ){//const LMSRC_AGG = 1

			let cenBin 		= bF.centerBin;
			let halfBinWdth = bF.numBinsHalfWidth;

			bF.sum = lerp( bF.sum, triangularIntegrate( cenBin, halfBinWdth, bins ), logMelNewValPct );

		}

		bF.firstDeriv 	  = (bF.sum - bF.sumPrev) / dT;
		bF.secondDeriv 	  = (bF.firstDeriv - bF.firstDerivPrev) / dT;
	}
}


function logMelDispVertCoordToFreqBin( y, maxY, maxLogMelBin ){
	//exponential mapping of bin idx coordinates to display
	return ( Math.pow( y, 2 ) / Math.pow( maxY, 2) ) * maxLogMelBin;
}
function logMelFreqBinToDispVertCoord( bin, maxLogMelBin, maxY ){
	return ( Math.sqrt(bin) * maxY ) / Math.sqrt(maxLogMelBin);
}

let spectCanvasElm = document.getElementById('spectInputVisCanvas');
let svCtx = spectCanvasElm.getContext('2d');
let horizIdx = 0;
let freqMagnitudeAvg = 0;
let prevX = 0;
let prevY = 0;
let lastMicInputDisplayUpdateTime = 0;
let drawMicInputGraph = false;
let micInputGraph = new Graph("micInput");
function updateMicInputSpectrogramDisplay(time){
	if( keys[keyCodes.KEY_G] ) 
		drawMicInputGraph = !drawMicInputGraph;

	let dT = time - lastMicInputDisplayUpdateTime;
	lastMicInputDisplayUpdateTime = time;
	//mic input visualization
	if( analyserOutputBuffer!=null ){
		analyser.getByteFrequencyData(analyserOutputBuffer);
		updateLogMelFiltBanks(analyserOutputBuffer, dT);
		
		if(!document.fullscreenElement){
			let maxLogMelBin = freqToFFTBin( maxLogMelFreq, MicFFTSize/2, micSampleRate );
			let visBinStep = svCtx.canvas.height / maxLogMelBin; //num vertical pixels to binIdx
			let freqMagnitudeSum = 0;
			for( let i = 0; i < svCtx.canvas.height; ++i ){
				let binIdx = Math.floor( logMelDispVertCoordToFreqBin(i, svCtx.canvas.height, maxLogMelBin) );//i * 1/visBinStep);
				let binFreq = FFTBinToFreq( binIdx, MicFFTSize/2, micSampleRate );
				let v = analyserOutputBuffer[binIdx];
				freqMagnitudeSum += v;
				//let binFreq = FFTBinToFreq( binIdx, MicFFTSize/2, micSampleRate );
				svCtx.fillStyle = 'rgb('+v+','+v+','+v+')';
				svCtx.fillRect( horizIdx, svCtx.canvas.height-i, 1, 1 );
			}

			freqMagnitudeSum /= svCtx.canvas.height * 255;
			freqMagnitudeAvg = freqMagnitudeAvg*(1-logMelNewValPct) +  (logMelNewValPct)*freqMagnitudeSum;

			//draw the sum magnitude
			let curX = horizIdx;
			let curY = svCtx.canvas.height*0.25-(freqMagnitudeAvg)*svCtx.canvas.height*0.25;
			if( curX < prevX ){ //wrap around previous for intensity sum line chart
				prevX = curX;
				//prevY = curY;
			}
			svCtx.fillStyle = 'rgb(0,255,255)';
			//svCtx.fillRect( curX, curY, 1,1);
			svCtx.strokeStyle = 'rgb(0,255,255)';
			svCtx.beginPath();
			svCtx.moveTo( prevX, prevY );
			svCtx.lineTo( curX, curY );
			svCtx.stroke();

			//draw the filter bank values
			let plotBinHeight = freqToFFTBin( logMelPlotFreqHeight, MicFFTSize/2, micSampleRate );
			for(let i = 0; i < numLogMelBanks; ++i ){
				drawFiltBank( logMelFiltBanks[i], svCtx.canvas.height, maxLogMelBin, horizIdx, plotBinHeight );
			}
			//update the previous idx for line value
			prevX = curX;
			prevY = curY;

			//horizIdx
			horizIdx = (++horizIdx % svCtx.canvas.width);
		}
	}
	
	if( drawMicInputGraph ){
		if( rastBatch3dLines_array.length < 3 ){ //allocate a raster batch 3d lines array if necessary
			rastBatch3dLines_array.push( new RasterBatch( RastB_DrawTris ) );
		}
		GRPH_Draw( micInputGraph, rastBatch3dLines_array[2], time );
	}
}

function intensityToRgbColor(inten){
	return 
}

//2d texture with texture wrapping, and uv coordinate offset
function ShiftRightAndDisplayFrequencyIntensity(freqIntens){

}
