//HavenInclude.js
//to request use or code/art please contact chris@itemfactorystudio.com

//loads all of the haven tech scripts into the dom

var incFiles = ['Iohelpers.js',
				'Matrix.js',
				'Curve.js',
				'IPOAnimation.js',
				'Vect3.js',
				'DPrintf.js',
				'Light.js',
				'Camera.js',
				'QuadMesh.js',
				'SkeletalAnimation.js',
				'Shader.js',
				'Texture.js',
				'Graphics.js',
				'Model.js',
				'Triangle.js',
				'HavenScene.js',
				'Bone.js',
				'OctTree.js',
				'HierarchyView.js',
				'HavenMain.js',
				'MeshKeyAnimation.js',
				'HavenInputHandlers.js',
				'TouchScreenControls.js',
				'InertialSensors.js',
				//'CameraStream.js',
				'Quaternion.js',
				'AABB.js',
				'Ray.js',
				'Sound.js',
				'webgl-utils.js',
				'webgl-debug.js'];
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
