//HavenInclude.js
//to request use or code/art please contact chris@itemfactorystudio.com

//loads all of the haven tech scripts into the dom

var incFiles = ['DPrintf.js',
				'Iohelpers.js',
				'UID.js',
				
				'Vect3.js',
				'Quaternion.js',
				'Matrix.js',
				'Curve.js',
				'IPOAnimation.js',
				
				'MergeSort.js',
				
				'AABB.js',
				'Ray.js',
				
				'Math.js',
				'Physics.js',
				'PhysObj.js',
				'PhysConstraintGraph.js',
				'Capsule.js',
				
				'webgl-utils.js',
				'webgl-debug.js',
				
				'Light.js',
				'Camera.js',
				'Frustum.js',
				'QuadMesh.js',
				
				'OctTree.js',
				
				'GlProgram.js',
				'Material.js',
				'Texture.js',
				'Graphics.js',
				'PointGraphics.js',
				'TriGraphics.js',
				'LineGraphics.js',
				
				'Model.js',
				'Triangle.js',
				
				'Bone.js',
				'MeshKeyAnimation.js',
				'SkeletalAnimation.js',
				
				'HavenScene.js',
				'RasterBatch.js',
				
				'HierarchyView.js',
				'HavenMain.js',
				
				'TriText.js',
				
				'Overlay.js',
				
				'HavenInputHandlers.js',
				'TouchScreenControls.js',
				'InertialSensors.js',
				//'CameraStream.js',
				
				'Sound.js',
				
				'SceneSpecific.js'
				];

var statusElm = document.getElementById("status");

let htmlHead = document.getElementsByTagName('head')[0];

includedScripts = {};

let numScriptsLoaded = 0;
var incFileIdx = 0;
let incFileList = incFiles;
let loadScriptCmpCb = function(){ havenMain(); }
function loadScriptLoop(){
	statusElm.innerHTML = "Script " + incFileIdx + " / " + incFileList.length;

	while( incFileIdx < incFileList.length ){
		//include files while there are still files to be included
		let scriptName = 'HavenTech/'+incFileList[incFileIdx++];
		if( !includedScripts[scriptName] ){ //prevent including files twice
			includedScripts[scriptName] = 1;
			let script = CreateScript( scriptName );
			//scriptsToAttach.push( script );
			htmlHead.appendChild( script );
		}
	}

}
window.addEventListener('load', loadScriptLoop, false);

function checkScriptsLoaded(){
	if( numScriptsLoaded >= incFileList.length ){
		//done loading include files
		window.removeEventListener( 'load', loadScriptLoop );
		//attach files to html document
		
		//for( let i = 0; i < scriptsToAttach.length; ++i )
		//	head.appendChild( scriptsToAttach[i] );
		numScriptsLoaded = 0;
		//call the script loading complete function
		loadScriptCmpCb();
	}
}

function CreateScript(scriptName, callback){
	
	let script= document.createElement('script');
	script.type= 'text/javascript';
	script.src= scriptName;
	script.async = false;
	script.onload = function(){
		numScriptsLoaded += 1;
		statusElm.innerHTML = "Script " + incFileIdx + " / " + incFileList.length;
		checkScriptsLoaded();
	}
	return script;
}
