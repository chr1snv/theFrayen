//HavenInclude.js
//to request use or code/art please contact chris@itemfactorystudio.com

//loads all of the haven tech scripts into the dom

var incFiles = ['DPrintf.js',
				'NetworkCommunications/Iohelpers.js',
				'Structures/UID.js',
				'Structures/Graph.js',

				'Transforms/Vect3.js',
				'Transforms/Quaternion.js',
				'Transforms/Matrix.js',
				'Structures/Curve.js',
				'Structures/IPOAnimation.js',

				'Transforms/MergeSort.js',

				'Structures/AABB.js',
				'Transforms/Ray.js',

				'Transforms/Math.js',
				'Transforms/Statistics.js',
				'Transforms/SimulationAndPhysics/Physics.js',
				'Structures/BoundsObjects.js',
				'Structures/PhysObj.js',
				'Structures/PhysConstraintGraph.js',
				'Transforms/SimulationAndPhysics/Capsule.js',

				'webgl-utils.js',
				'webgl-debug.js',

				'Structures/Light.js',
				'Output/Rendering/Camera.js',
				'Structures/Frustum.js',
				'Structures/QuadMesh.js',

				'Structures/OctTree.js',

				'Transforms/GlProgram.js',
				'Structures/Material.js',
				'Structures/Texture.js',
				'Output/Rendering/Graphics.js',
				'Output/Rendering/PointGraphics.js',
				'Output/Rendering/TriGraphics.js',
				'Output/Rendering/LineGraphics.js',
				'Output/Rendering/CubeGraphics.js',
				'Output/Rendering/DepthGraphics.js',

				'Structures/Model.js',
				'Structures/Triangle.js',

				'Structures/Bone.js',
				'Structures/MeshKeyAnimation.js',
				'Structures/SkeletalAnimation.js',

				'Structures/HavenScene.js',
				'Output/Rendering/RasterBatch.js',

				'Output/HierarchyView.js',

				'Structures/TriText.js',

				'Output/Rendering/Overlay.js',

				'Input/SwitchAndOptical/HavenInputHandlers.js',
				'Input/CapacitiveAndGFieldSensing/TouchScreenControls.js',
				'Input/CapacitiveAndGFieldSensing/InertialSensors.js',
				//'CameraStream.js',


				'HavenMain.js',

				'Output/Sound/Sound.js',
				'Output/Sound/SoundFile.js',
				//'fft.js',
				'Input/Sound/SoundInput.js',

				'NetworkCommunications/NetworkCommunications.js',

				'Structures/ProgressionMissionObjectives.js',

				'SceneLogic/SceneSpecific.js'
				];

var statusElm = document.getElementById("status");

let htmlHead = document.getElementsByTagName('head')[0];

includedScripts = {};

var IOTRequest = false;

let numScriptsLoaded = 0;
var incFileIdx = 0;
let incFileList = incFiles;
let loadScriptCmpCb = function(){ havenMain(); }
function loadScriptLoop(useIOTAppend=false, loadCompCb=loadScriptCmpCb){
	IOTRequest = useIOTAppend;
	loadScriptCmpCb = loadCompCb;
	statusElm.innerHTML = "Script " + incFileIdx + " / " + incFileList.length;


	while( incFileIdx < incFileList.length ){
		//include files while there are still files to be included
		let scriptName = 'HavenTech/'+incFileList[incFileIdx++];
		if( !includedScripts[scriptName] ){ //prevent including files twice
			includedScripts[scriptName] = 1;
			if( !useIOTAppend ){
				let script = CreateScript( scriptName );
				//scriptsToAttach.push( script );
				htmlHead.appendChild( script );
			}else{
				getFile( finishAppendScript, scriptName, [htmlHead, checkScriptsLoaded] );
			}
		}else{
			numScriptsLoaded += 1;
		}
	}

	checkScriptsLoadedNoInc();
}
//window.addEventListener('load', loadScriptLoop, false);


function checkScriptsLoaded(){
	numScriptsLoaded += 1;
	checkScriptsLoadedNoInc();
}

function checkScriptsLoadedNoInc(){
	statusElm.innerHTML = "Script " + incFileIdx + " / " + incFileList.length;
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
		checkScriptsLoaded();
	}
	return script;
}

