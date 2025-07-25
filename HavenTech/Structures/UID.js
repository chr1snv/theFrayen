
//generates uniqely identifiable identifiers that can be linearly added/subtracted
//Integers in js (numbers without a period or exponent notation) are accurate up to 15 digits.


const uidLen = 100000; // 5 (pow of 10) num integer digits in a uid
let uidIdx = 100000;
function NewUID(){
	return { val: uidIdx++ }; //Math.floor(Math.random()*uidLen) };
}

function NewRandUID(){
	return { val: Math.floor(Math.random() * 100000000) };
}

function AddUIDs(u1, u2){
	u1.val += u2.val;
}
function SubtUIDs( u1, u2 ){
	u1.val -= u2.val;
}

function UIDToColorHexString( u ){
	let str = (u.val*100000).toString(16);
	while( str.length < 11 )
		str += 'f';
	let hexString = (str).substring(2,8);
	if( str.length < 6 )
		console.log( "color str len " + str.length );
	return "#"+hexString;
}

function ScalarMultiplyColorHexString( u, s ){
	let a = [];
	for(let i = 1; i < u.length; ++i ){
		let n = Number.parseInt( u[i] , 16 ) * s;
		n = Math.round( n );
		let h = n.toString(16);
		a.push( h[0] );
	}
	return "#" + a.join("");
}

function AddColorHexStrings( b, c ){
	let a = [];
	let length = Math.min( b.length, c.length );
	for(let i = 1; i < length; ++i )
		a.push( Math.round(Number.parseInt( b[i] , 16 ) + Number.parseInt( c[i] , 16 ) ).toString(16)[0] );
	return "#" + a.join("");
}


function generateRandomString(len, useLetters=true, useNumbers=false, useSymbols=false){
	const symbols = '!@#$%^&*()_-+{}[]<>*~';
	const numbers = '0123456789';
	const letters = 'ABCDEEFGHIJKLMNOPabcdefghijklmnop';
	let choices = '';
	if( useLetters )
		choices += letters;
	if( useNumbers )
		choices += numbers;
	if( useSymbols )
		choices += symbols;
	let retStr = '';
	let numChoices = choices.length;
	for( let i = 0; i < len; ++i ){
		let idx = Math.floor(Math.random() * numChoices);
		retStr += choices[idx];
	}
	return retStr;
}
