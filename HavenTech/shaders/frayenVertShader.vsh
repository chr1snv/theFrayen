#version 300 es

//precision qualifier for the shader code
precision highp float; //on android mobile lowp causes z depth flickering

//frayen vert shader

//MAX_VERTEX_UNIFORM_VECTORS: 128 / 4 -> 32 vec4's or  / 16 -> 8 mats
uniform mat4 projMatrix;
uniform mat4 mMatrix;
//uniform float bnMatIdxOffset;
uniform mat4 worldToShadowMapSpaceMatrix;

//MAX_VERTEX_ATTRIBS: 16
in vec3 position;		//attribute vec3 position;
in vec3 norm;			//attribute vec3 norm;
in vec2 texCoord;		//attribute vec2 texCoord;
in vec4 indexWeights;	//attribute vec4 indexWeights;


//webgl minimum system specifications
//MAX_VERTEX_TEXTURE_IMAGE_UNITS: 4 (this shader uses 8 vertTexImgUnits (2 4x4 matricies)
//MAX_TEXTURE_IMAGE_UNITS: 8
//MAX_COMBINED_TEXTURE_IMAGE_UNITS: 8


uniform sampler2D boneMatrixTexture;
uniform bool skelSkinningEnb;
//uniform float numBones;



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


//for lighting
out vec3 worldSpaceFragPosition;
out vec3 normalVarying;
out vec3 shdwSpacePosition;

//for texturing
out vec2 texCoordVarying; //out vec2 texCoordVarying;


void main() {
	vec4 worldSpacePosTemp;
	if (skelSkinningEnb){
		mat4 skinMatrix = getBoneMatrix(indexWeights.x) * indexWeights.y +
						  getBoneMatrix(indexWeights.z) * indexWeights.w;
		worldSpacePosTemp      = skinMatrix * mMatrix * vec4(position,1);
		gl_Position   =            projMatrix * worldSpacePosTemp;
		normalVarying = normalize(vec3(skinMatrix * mMatrix * vec4(norm, 0)));

	}else{
		worldSpacePosTemp      = mMatrix * vec4(position,1);
		gl_Position   =            projMatrix * worldSpacePosTemp;
		normalVarying = normalize(vec3(mMatrix * vec4(norm, 0)));
	}


	worldSpaceFragPosition = vec3(worldSpacePosTemp) / worldSpacePosTemp.w;


	vec4 shdwSpacePositionTemp = worldToShadowMapSpaceMatrix * worldSpacePosTemp;
	shdwSpacePosition = vec3(shdwSpacePositionTemp) / shdwSpacePositionTemp.w;
	shdwSpacePosition = (shdwSpacePosition*0.5)+0.5;
	//shdwSpacePosition.z += 0.01;

	texCoordVarying = texCoord;
}
