/*
 * DPrintf.js
 *
 *    Created on: Jun 3, 2012
 *  Ported to js: Jun 29, 2013
 *        Author: christopher
 */

function DPrintf(str){
    console.log( "debug: " + str );
}

function IPrintf(str){
    console.log("info: " + str);
}

//these have to be 0 at startup
//the document.cookie value is used to set them to 1 if set for a tag type
const Deb_Mouse 			 = 0;
const Deb_CheckGLError 		 = 1;
const Deb_AddObj 			 = 2;

const Deb_Ot_Add			 = 3;
const Deb_Ot_Add_Error		 = 4;
const Deb_Ot_Add_Success	 = 5;
const Deb_Ot_Add_Dbg		 = 6;
const Deb_Ot_Subdiv			 = 7;
const Deb_Ot_Subdiv_Success	 = 8;

const Deb_Ot_Updt			 = 9;
const Deb_QuadM_Updt		 = 10;

const Deb_Phys_Detc			 = 11;
const Deb_Constr_Msg		 = 12;
const Deb_Interpen			 = 13;
const Deb_Detc_Additional	 = 14;
const Deb_Trace_Error		 = 15;
const Deb_Trace_Info		 = 16;
const Deb_Unsubdiv			 = 17;
const Deb_Linvel			 = 18;
const Deb_loop				 = 18;
const Deb_consolidate		 = 18;
const Deb_test				 = 18;

const enabledDebugTags = { 
	"CheckGLError":0,
	
	"hvnsc debug":0,
	
	"mouse":0,
	"add obj":0,
	
	
	"ot add":0,	
	"ot add error":0,
	"ot add success":0,
	"ot add dbg":0,
	
	"ot subdiv":0,
	"ot subdiv success":0,
	
	"quadM updt":0,
	
	
	"ot updt":0,
	
	"phys detc":0,
	"constr msg":0,
	"interpen":0,
	"detc additional":0,
	
	"trace error":0,
	"trace info":0,
	
	"unsubdiv":0,
	
	"linvel":0,
	
	"loop":0,
	"consolidate":0,
	"test":0,
};

function debugTagClicked(e){
	let selectedElm = null;
	if( e.target.text == undefined ){
		selectedElm = e.target.childNodes[e.target.selectedIndex];
	}else{
		selectedElm = e.target;
	}
	let statusAndName = selectedElm.text.split(':');
	
	let v = enabledDebugTags[ statusAndName[1] ];
	
	if( v == 0 ){
		enabledDebugTags[ statusAndName[1] ] = 1;
		statusAndName[0] = 1;
		selectedElm.style="background:#003300";
	}
	else{
		enabledDebugTags[ statusAndName[1] ] = 0;
		statusAndName[0] = 0;
		selectedElm.style="background:#ffffff";
	}
	selectedElm.text = statusAndName[0] + ':' + statusAndName[1];
	
	//persist the setting between page openings
	document.cookie= statusAndName[1] + "=" + statusAndName[0] + "; SameSite=True;";
}

let noOptionOnClick = false;
if( window.navigator.userAgent.indexOf('Chrome') > 0 || window.navigator.userAgent.indexOf('Edge') )
	noOptionOnClick = true;

function CreateDebugTabsOnPage(){
	//read the previous tag settings
	let settingStr = document.cookie;
	let settingStrs = settingStr.split('; ');
	let settings = {};
	for( let sidx=0; sidx < settingStrs.length; ++sidx ){
		let keyValue = settingStrs[sidx].split('=');
		settings[ keyValue[0] ] = keyValue[1];
	}

	let tagDiv = document.getElementById( "debugTags" );
	//let c = tagRow.insertCell();
	let keys = Object.keys(enabledDebugTags);
	let s = document.createElement("select");
	s.id = "debugSelect";
	if( noOptionOnClick )
		s.onchange = debugTagClicked;
	for( kidx in keys ){
		let o = document.createElement('option');
		let keyName = keys[kidx];
		o.text = enabledDebugTags[ keyName ] + ':' + keyName;
		if( !noOptionOnClick ){
			o.onclick = debugTagClicked;
			o.ontouchstart = debugTagClicked;
			o.onselect = debugTagClicked;
			o.ontoggle = debugTagClicked;
		}
		if( settings[keyName] == '1' ) //set previous setting
			debugTagClicked( {'target':o } );
		s.appendChild( o );
	}
	tagDiv.appendChild( s );
}

//debug tag printf
let msgNum = 0;
function DTPrintf( str, tag, color, depth ){
	if( enabledDebugTags[tag] ){
		let e = new Error()
		let a = e.stack.split('\n')
		let fInfo = a[1];
		let fInfoArr = fInfo.split(/\/|:/);
		let lineNum = fInfoArr[fInfoArr.length-2];
		let fileName = fInfoArr[fInfoArr.length-3];
		let indent = "";
		if(depth != undefined ){
			for( let i = 0; i < depth; ++i ){
				indent += "\t";
			}
			let strLines = str.split( '\n' );
			str = "";
			for( let l = 0; l < strLines.length; ++l ){
				if( l == 0 )
					str += strLines[l];
				else
					str += indent + strLines[l];
				if( l < strLines.length-1 )
					str += '\n';
			}
		}
		console.log( indent + tag + ": %c" + str + " : " + fileName + "," + lineNum + " n " + msgNum++, color );
	}
}

