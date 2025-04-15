//Sound.js

//the table of frequencies came from a tutorial site
//and the functions are based on other tutorials

const noteFrequencies = {
	'C0' :   16.35,
	'C#0':   17.32,
	'Db0':   17.32,
	'D0' :   18.35,
	'D#0':   19.45,
	'Eb0':   19.45,
	'E0' :   20.60,
	'F0' :   21.83,
	'F#0':   23.12,
	'Gb0':   23.12,
	'G0' :   24.50,
	'G#0':   25.96,
	'Ab0':   25.96,
	'A0' :   27.50,
	'A#0':   29.14,
	'Bb0':   29.14,
	'B0' :   30.87,
	'C1' :   32.70,
	'C#1':   34.65,
	'Db1':   34.65,
	'D1' :   36.71,
	'D#1':   38.89,
	'Eb1':   38.89,
	'E1' :   41.20,
	'F1' :   43.65,
	'F#1':   46.25,
	'Gb1':   46.25,
	'G1' :   49.00,
	'G#1':   51.91,
	'Ab1':   51.91,
	'A1' :   55.00,
	'A#1':   58.27,
	'Bb1':   58.27,
	'B1' :   61.74,
	'C2' :   65.41,
	'C#2':   69.30,
	'Db2':   69.30,
	'D2' :   73.42,
	'D#2':   77.78,
	'Eb2':   77.78,
	'E2' :   82.41,
	'F2' :   87.31,
	'F#2':   92.50,
	'Gb2':   92.50,
	'G2' :   98.00,
	'G#2':  103.83,
	'Ab2':  103.83,
	'A2' :  110.00,
	'A#2':  116.54,
	'Bb2':  116.54,
	'B2' :  123.47,
	'C3' :  130.81,
	'C#3':  138.59,
	'Db3':  138.59,
	'D3' :  146.83,
	'D#3':  155.56,
	'Eb3':  155.56,
	'E3' :  164.81,
	'F3' :  174.61,
	'F#3':  185.00,
	'Gb3':  185.00,
	'G3' :  196.00,
	'G#3':  207.65,
	'Ab3':  207.65,
	'A3' :  220.00,
	'A#3':  233.08,
	'Bb3':  233.08,
	'B3' :  246.94,
	'C4' :  261.63,
	'C#4':  277.18,
	'Db4':  277.18,
	'D4' :  293.66,
	'D#4':  311.13,
	'Eb4':  311.13,
	'E4' :  329.63,
	'F4' :  349.23,
	'F#4':  369.99,
	'Gb4':  369.99,
	'G4' :  392.00,
	'G#4':  415.30,
	'Ab4':  415.30,
	'A4' :  440.00,
	'A#4':  466.16,
	'Bb4':  466.16,
	'B4' :  493.88,
	'C5' :  523.25,
	'C#5':  554.37,
	'Db5':  554.37,
	'D5' :  587.33,
	'D#5':  622.25,
	'Eb5':  622.25,
	'E5' :  659.26,
	'F5' :  698.46,
	'F#5':  739.99,
	'Gb5':  739.99,
	'G5' :  783.99,
	'G#5':  830.61,
	'Ab5':  830.61,
	'A5' :  880.00,
	'A#5':  932.33,
	'Bb5':  932.33,
	'B5' :  987.77,
	'C6' : 1046.50,
	'C#6': 1108.73,
	'Db6': 1108.73,
	'D6' : 1174.66,
	'D#6': 1244.51,
	'Eb6': 1244.51,
	'E6' : 1318.51,
	'F6' : 1396.91,
	'F#6': 1479.98,
	'Gb6': 1479.98,
	'G6' : 1567.98,
	'G#6': 1661.22,
	'Ab6': 1661.22,
	'A6' : 1760.00,
	'A#6': 1864.66,
	'Bb6': 1864.66,
	'B6' : 1975.53,
	'C7' : 2093.00,
	'C#7': 2217.46,
	'Db7': 2217.46,
	'D7' : 2349.32,
	'D#7': 2489.02,
	'Eb7': 2489.02,
	'E7' : 2637.02,
	'F7' : 2793.83,
	'F#7': 2959.96,
	'Gb7': 2959.96,
	'G7' : 3135.96,
	'G#7': 3322.44,
	'Ab7': 3322.44,
	'A7' : 3520.00,
	'A#7': 3729.31,
	'Bb7': 3729.31,
	'B7' : 3951.07,
	'C8' : 4186.01
}


/*
var context = new AudioContext()
var o = context.createOscillator()
var  g = context.createGain()
o.connect(g)
g.connect(context.destination)
o.start(0)

o.type = "square"

var frequency = 440.0
o.frequency.value = frequency

g.gain.exponentialRampToValueAtTime(
  1, context.currentTime + 0.1
)
g.gain.exponentialRampToValueAtTime(
  0.0000000001, context.currentTime + 0.2
)
g.gain.exponentialRampToValueAtTime(
  0.00001, context.currentTime + 0.3
)
g.gain.exponentialRampToValueAtTime(
  0.0000000001, context.currentTime + 0.4
)
*/

let soundIconElm = document.getElementById("soundIcon");
function setSoundMuteIcon( muted, aCtxActive ){

	if(!muted)
		document.getElementById("soundIcon").src = "scenes/default/textures/soundIcon.png";
	else
		document.getElementById("soundIcon").src = "scenes/default/textures/soundIconMuted.png";


	if( aCtxActive ){
		soundIconElm.style.opacity = 1.0;
	}else{
		soundIconElm.style.opacity = 0.5;
	}
	
}

function SND_RestartSoundContext(){

	if( muted ){
		setSoundMuteIcon( muted, aCtx );
		return;
	}


	if( aCtx != null ){
		aCtx.suspend();
		aCtx.close();
	}
	
	aCtx = new (window.AudioContext || window.webkitAudioContext)();
	
	StartSoundInput();
	
	setSoundMuteIcon(muted, aCtx);

}

function SND_StartSoundContext(){

	if( muted ){
		setSoundMuteIcon(muted, aCtx);
		return;
	}


	if( aCtx != null ){
		aCtx.resume();
		setSoundMuteIcon(muted, aCtx);
		return;
	}
	
	aCtx = new (window.AudioContext || window.webkitAudioContext)();
	
	StartSoundInput();
	
	setSoundMuteIcon(muted, aCtx);
}

let muted = true;
let aCtx = null;
function soundIconClicked(){

	muted = !muted;

	SND_RestartSoundContext();
	
	aCtx.resume();
	for( let i = 0; i < instruments.length; ++i ){
		let inst = instruments[i];
		for( let j = 0; j < inst.notes.length; ++j ){
			let note = inst.notes[j];
			playSineToneNode( note.freq, note.startTime, note.duration);
		}
	}
	lastUserInputNoteTime = 0; //reset now that song is playing
	
	//playBuffer();
	
}

let inputKeyNoteMappings = {};
let inputKeyNoteMappings_dictKeys = null;

function playNote( freq, duration ){
	if( muted )
		return;
	SND_StartSoundContext();
	playSineToneNode(freq, 0, duration);
	let noteEndTime = aCtx.currentTime + 0 + duration;
	if( lastUserInputNoteTime < noteEndTime)
		lastUserInputNoteTime = noteEndTime;
}

lastUserInputNoteTime = 0;
function SND_UserInputsToNotes(){
	for( let i = 0; i < inputKeyNoteMappings_dictKeys.length; ++i ){
		let kC = inputKeyNoteMappings_dictKeys[i];
		if( keysDown[ kC ] == true ){
			playNote( inputKeyNoteMappings[kC], 0.25 );
		}
	}
}

const SampleRate = 44100;
const NumSamples = 44100;
function playBuffer(){
	
	//noise tone
	let buffer  = aCtx.createBuffer(1, NumSamples, SampleRate);
	let buf = buffer.getChannelData(0);
	for( let i = 0; i < NumSamples; ++i )
		buf[i] = Math.random( ) * Math.sin( 440 * Math.PI * 2 * i / SampleRate );
	let node = aCtx.createBufferSource(0);
	node.buffer = buffer;
	
	
	let bandpass = new BiquadFilterNode( aCtx, {type:"bandpass", frequency:100} );
	
	node.connect(bandpass)
	bandpass.connect(aCtx.destination);
	node.start(aCtx.currentTime);
}

/*
function playBassSineTone(note, time, duration){
	let osc = aCtx.createOscillator();
	osc.frequency( noteFrequencies[note] );
	//lfo.connect(amp.gain);
	osc.connect(amp);
	amp.connect(aCtx.destination);
	//lfo.start();
	osc.start(time);
	osc.stop(time+duration);
	return osc;
}
*/

function playSineToneNode(freq, time, duration) {
    let osc = aCtx.createOscillator();
    osc.frequency.value = freq;
    
    let gain = aCtx.createGain();
    gain.gain.value = 0.4;
    osc.connect(gain);
    gain.connect(aCtx.destination);
    
    osc.start(aCtx.currentTime + time);
    osc.stop(aCtx.currentTime + time + duration);
    
    return gain;
}

let lastNoteTime = Number.NEGATIVE_INFINITY;
let instruments = [];

const InstrumentType =
{
	SynthLead: 0,
	DrumKit  : 1
}
const InstTypeStrings = Object.keys(InstrumentType);

function Note(pitch, startTime, duration){
	this.pitch = pitch;
	this.freq = noteFrequencies[this.pitch];
	this.startTime = startTime;
	this.duration = duration;
}

function Instrument(type){
	this.type = type;
	this.notes = [];
	this.minMaxNoteFreqs = [Number.POSITIVE_INFINITY,Number.NEGATIVE_INFINITY];
}

function AddNoteToInstr( instr, note ){
	instr.notes.push( note );
	mnMax( instr.minMaxNoteFreqs, note.freq );
	let noteEndTime = note.startTime+note.duration;
	if( noteEndTime > lastNoteTime )
		lastNoteTime = noteEndTime;
}

function loadSceneSounds(){

	if( inputKeyNoteMappings_dictKeys == null ){
		//init key mappings to frquencies
		inputKeyNoteMappings[keyCodes.KEY_Z]         = noteFrequencies['C3' ];
		inputKeyNoteMappings[keyCodes.KEY_X]         = noteFrequencies['C#3'];
		inputKeyNoteMappings[keyCodes.KEY_C]         = noteFrequencies['D3' ];
		inputKeyNoteMappings[keyCodes.KEY_V]         = noteFrequencies['D#3'];
		inputKeyNoteMappings[keyCodes.KEY_B]         = noteFrequencies['E3' ];
		inputKeyNoteMappings[keyCodes.KEY_N]         = noteFrequencies['F3' ];
		inputKeyNoteMappings[keyCodes.KEY_M]         = noteFrequencies['G3' ];
		inputKeyNoteMappings[keyCodes.COMMA]         = noteFrequencies['G#3'];
		inputKeyNoteMappings[keyCodes.PERIOD]        = noteFrequencies['A3' ];
		inputKeyNoteMappings[keyCodes.FORWARD_SLASH] = noteFrequencies['A#3'];
		inputKeyNoteMappings_dictKeys = Object.keys(inputKeyNoteMappings);
	}

	switch( loadScnId ){
		case 0:

		instruments = [];
		//load song, instruments, notes
		let synthLead = new Instrument( InstrumentType.SynthLead );
		AddNoteToInstr( synthLead, new Note('G3', 0.0, 0.15) );
		AddNoteToInstr( synthLead, new Note('G3', 0.2, 0.15) );
		AddNoteToInstr( synthLead, new Note('G3', 0.5, 0.15) );
		AddNoteToInstr( synthLead, new Note('E4', 0.5, 0.25) );
		AddNoteToInstr( synthLead, new Note('C4', 1.0, 0.25) );
		AddNoteToInstr( synthLead, new Note('C5', 1.0, 0.25) );
		instruments.push( synthLead );
	}


	sceneLoadedTime = Date.now();
	running = true;
	window.setTimeout(MainLoop, 300);
}

function SND_updateACtx(){
	if( aCtx == null )
		return;
	
	/*
	if( aCtx.currentTime > lastNoteTime && aCtx.currentTime > lastUserInputNoteTime  )
		aCtx.suspend();
	*/
}

let soundCanvasElm = document.getElementById('soundCanvas');
let sCtx = soundCanvasElm.getContext('2d');

const sTextColor = '#999999';

let screenMinTime = 0;

const onScreenTimeSecs = 5;

const insChansWidthPct = 1/5;
const instHeightPct = 1/10;

let timeLineHeightPct = 1/10;

function DrawSoundCanvas(){
	//background
	sCtx.fillStyle = '#515151';
	sCtx.clearRect(0, 0, sCtx.canvas.width, sCtx.canvas.height);
	sCtx.fillRect(0, 0, sCtx.canvas.width, sCtx.canvas.height);

	//instrument / channels
	sCtx.fillStyle = '#242424';
	sCtx.fillRect(0, 0, sCtx.canvas.width*insChansWidthPct, sCtx.canvas.height);


	sCtx.fillStyle = '#1b1b1b';
	sCtx.fillRect(sCtx.canvas.width*insChansWidthPct, 0, 
				sCtx.canvas.width, sCtx.canvas.height*timeLineHeightPct);

	//draw instruments and notes
	let vertOffsetPct = timeLineHeightPct;
	for( let i = 0; i < instruments.length; ++i ){
		drawInstrument( instruments[i], vertOffsetPct, instHeightPct );
		vertOffsetPct += instHeightPct;
	}

	let currentTime = aCtx == null ? 0 : aCtx.currentTime;

	//top of canvas time
	drawTimeBar( insChansWidthPct, timeLineHeightPct, 0, onScreenTimeSecs, currentTime );

	//time indication
	sCtx.fillStyle = '#ffffff';
	sCtx.fillText( currentTime.toFixed(2)+"s", 0, sCtx.canvas.height*timeLineHeightPct );

	updateMicInputSpectrogramDisplay(sceneTime);
}

const timeTextIntervalSecs = 1;
function drawTimeBar( leftWidthPct, heightPct, minTime, totalBarTime, currentTime ){
	let numTimeTextsToDraw = totalBarTime / timeTextIntervalSecs;
	
	//draw time texts
	sCtx.fillStyle = sTextColor;
	for( let i = 0; i < numTimeTextsToDraw; ++i ){
		let textWPct = leftWidthPct + (1-leftWidthPct)*(i / numTimeTextsToDraw);
		let timeT = minTime + ((i/numTimeTextsToDraw) * totalBarTime);
		sCtx.fillText( timeT+"s", sCtx.canvas.width*textWPct, sCtx.canvas.height*heightPct*0.5 );
	}
	
	//draw time bar vertical line
	sCtx.fillStyle = '#ffffff';
	let timeBarWPct = (currentTime-minTime)/totalBarTime;
	sCtx.fillRect( sCtx.canvas.width * ( leftWidthPct + (1-leftWidthPct)*timeBarWPct ), 0, 1, sCtx.canvas.height );
}

const noteWdthPct = 1/50;
const noteHeightPct = 1/(8*2);
function drawInstrument(inst, vertOffsetPct, heightPct){

	let noteHeight = sCtx.canvas.height*noteHeightPct * heightPct;
	
	let noteAreaHeightPct = heightPct * (1-noteHeightPct);

	//draw instrument label
	sCtx.fillStyle = '#171717';
	sCtx.fillRect( 0,								   sCtx.canvas.height*vertOffsetPct, 
				   sCtx.canvas.width*insChansWidthPct, sCtx.canvas.height*heightPct );
	
	
	sCtx.fillStyle = sTextColor;
	let textVertOffsetPct = (vertOffsetPct+(heightPct*0.5));
	sCtx.fillText(InstTypeStrings[inst.type], 0, sCtx.canvas.height *textVertOffsetPct );
	
	
	for( let i = 0; i < inst.notes.length; ++i ){
		let note = inst.notes[i];
		let noteFreqPct = (note.freq - inst.minMaxNoteFreqs[0]) / (inst.minMaxNoteFreqs[1] - inst.minMaxNoteFreqs[0]);
		let noteScreenPct = (note.startTime - screenMinTime) / onScreenTimeSecs;
		let noteHorizOffset = sCtx.canvas.width*(insChansWidthPct + noteScreenPct *(1-insChansWidthPct));
		
		let noteHorizWidthPct = (note.duration / onScreenTimeSecs) * (1-insChansWidthPct);
		let noteHorizWidth = sCtx.canvas.width * noteHorizWidthPct;
		
		let vertOffset = sCtx.canvas.height * ( vertOffsetPct + ( noteFreqPct ) * noteAreaHeightPct );
		
		sCtx.fillRect( noteHorizOffset, vertOffset, 
						noteHorizWidth, noteHeight );
	}
	
}



