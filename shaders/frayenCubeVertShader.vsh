//#version 300 es

//precision qualifier for the shader code
precision highp float; //on android mobile lowp causes z depth flickering

//frayen vert shader

//MAX_VERTEX_UNIFORM_VECTORS: 128 / 4 -> 32 vec4's or  / 16 -> 8 mats
uniform mat4 projMatrix;
//uniform mat4 mMatrix;
//uniform float bnMatIdxOffset;

//MAX_VERTEX_ATTRIBS: 16
attribute vec3 position;//in vec3 position;


//webgl minimum system specifications
//MAX_VERTEX_TEXTURE_IMAGE_UNITS: 4 (this shader uses 8 vertTexImgUnits (2 4x4 matricies)
//MAX_TEXTURE_IMAGE_UNITS: 8
//MAX_COMBINED_TEXTURE_IMAGE_UNITS: 8



//variables passed to the fragment shader

//for cubemap fragment shader
varying vec3 worldSpaceFragPosition;


void main() {

	//vec4 worldSpacePosTemp = mMatrix * vec4(position,1);
	worldSpaceFragPosition = position;
	//gl_Position   =            projMatrix * worldSpacePosTemp;
	gl_Position = projMatrix * vec4(position,1);
}
