#version 300 es

//precision qualifier for the shader code
precision highp float; //on android mobile lowp causes z depth flickering
precision highp int;
precision highp sampler2D;

//frayen vert shader

//MAX_VERTEX_UNIFORM_VECTORS: 128 / 4 -> 32 vec4's or  / 16 -> 8 mats
uniform highp mat4 projMatrix; //orthographic projection matrix
uniform highp mat4 mMatrix;


//MAX_VERTEX_ATTRIBS: 16
in highp vec3 position; //attribute vec3 position;
in highp vec4 indexWeights;


//webgl minimum system specifications
//MAX_VERTEX_TEXTURE_IMAGE_UNITS: 4 (this shader uses 8 vertTexImgUnits (2 4x4 matricies)
//MAX_TEXTURE_IMAGE_UNITS: 8
//MAX_COMBINED_TEXTURE_IMAGE_UNITS: 8

uniform highp sampler2D boneMatrixTexture;
uniform bool skelSkinningEnb;



mat4 getBoneMatrix(float boneNdx) {
    int rowV = int(boneNdx);
    // texelFetch uses integer coordinates (0 to width-1)
    return mat4(
        texelFetch(boneMatrixTexture, ivec2(0, rowV), 0),
        texelFetch(boneMatrixTexture, ivec2(1, rowV), 0),
        texelFetch(boneMatrixTexture, ivec2(2, rowV), 0),
        texelFetch(boneMatrixTexture, ivec2(3, rowV), 0)
    );
}



//variables passed to the fragment shader

//for depth fragment shader
out highp vec3 shadowMapSpacePosition; //varying 


void main() {

	highp vec4 worldSpacePosTemp;
	//if (skelSkinningEnb){
		highp mat4 skinMatrix = getBoneMatrix(indexWeights.x) * indexWeights.y +
						  getBoneMatrix(indexWeights.z) * indexWeights.w;

		worldSpacePosTemp      = skinMatrix * mMatrix * vec4(position,1);
		gl_Position   = projMatrix * worldSpacePosTemp;

	//}else{
	//	worldSpacePosTemp = mMatrix * vec4(position,1);
	//	gl_Position   = projMatrix * worldSpacePosTemp;
	//}
	
	//gl_Position.z = (gl_Position.z / gl_Position.w)* 0.1 - 0.5;

	//no longer used with depth attachment only framebuffer shadow texture
	shadowMapSpacePosition = (vec3(gl_Position) / gl_Position.w)*0.5+0.5;//((gl_Position.z / gl_Position.w)*0.5)+0.5;
	//shadowMapSpacePosition = (shadowMapSpacePosition*0.5)+0.5;
}
