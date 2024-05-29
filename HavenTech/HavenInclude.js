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
				
				'Model.js',
				'Triangle.js',
				
				'Bone.js',
				'MeshKeyAnimation.js',
				'SkeletalAnimation.js',
				
				'HavenScene.js',
				
				'HierarchyView.js',
				'HavenMain.js',
				
				'HavenInputHandlers.js',
				'TouchScreenControls.js',
				'InertialSensors.js',
				//'CameraStream.js',
				
				'Sound.js'
				];
var incFileIdx = 0;

function havenIncMain(){

	if( incFileIdx < incFiles.length ){
		//include files while there are still files to be included
		AttachScript('HavenTech/'+incFiles[incFileIdx++], havenIncMain );
	}
	else{
		//done including files
		window.removeEventListener( 'load', havenIncMain );
		//call the main function
		havenMain();
	}
}
window.addEventListener('load', havenIncMain, false);

function AttachScript(scriptName, callback){
	var head= document.getElementsByTagName('head')[0];
	var script= document.createElement('script');
	script.type= 'text/javascript';
	script.src= scriptName;
	script.onload = callback;
	head.appendChild(script);
	script.onreadystatechange = function(){
		if(this.readyState == 'complete'){
			callback();
			alert('calling callback');
		}
	}
}
