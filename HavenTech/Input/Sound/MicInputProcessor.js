//# sourceURL=Input/Sound/MicInputProcessor.js
let mInCt = 0;

//https://stackoverflow.com/questions/65447236/scriptnode-onaudioprocess-is-deprecated-any-alternative
class MicInputProcessor extends AudioWorkletProcessor {
	process(inputs, outputs, parameters) {
		console.log(mInCt++);
		console.log(inputs.length);
		return true; //tell web audio api to keep running
	}
	onprocessorerror(event){
		console.log(event);
	}
}

registerProcessor('MicInputProcessor', MicInputProcessor);
