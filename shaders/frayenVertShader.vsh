//#version 300 es

//frayen vert shader

//MAX_VERTEX_UNIFORM_VECTORS: 128 / 4 -> 32 vec4's or  / 16 -> 8 mats
uniform mat4 projMatrix;
uniform mat4 mMatrix;
//uniform mat4 BoneMats[6];

//MAX_VERTEX_ATTRIBS: 16
attribute vec3 position;//in vec3 position;
attribute vec3 norm;//in vec3 norm;
attribute vec2 texCoord;//in vec2 texCoord;
attribute vec4 indexWeights;



//MAX_VERTEX_TEXTURE_IMAGE_UNITS: 4
//MAX_TEXTURE_IMAGE_UNITS: 8
//MAX_COMBINED_TEXTURE_IMAGE_UNITS: 8


uniform sampler2D boneMatrixTexture;
uniform bool skelSkinningEnb;
uniform float numBones;


// these offsets assume the texture is 4 pixels across
#define ROW0_U ((0.5 + 0.0) / 4.)
#define ROW1_U ((0.5 + 1.0) / 4.)
#define ROW2_U ((0.5 + 2.0) / 4.)
#define ROW3_U ((0.5 + 3.0) / 4.)
mat4 getBoneMatrix(float boneNdx) {
	float v = (boneNdx + 0.5) / numBones;
	return mat4(
	texture2D(boneMatrixTexture, vec2(ROW0_U, v)),
	texture2D(boneMatrixTexture, vec2(ROW1_U, v)),
	texture2D(boneMatrixTexture, vec2(ROW2_U, v)),
	texture2D(boneMatrixTexture, vec2(ROW3_U, v)));
}


//variables passed to the fragment shader
varying vec3 normalVarying;//out vec3 normalVarying;
varying vec2 texCoordVarying;//out vec2 texCoordVarying;

void main() {
	if (skelSkinningEnb){
		mat4 skinMatrix = getBoneMatrix(indexWeights.x) * indexWeights.y +
						  getBoneMatrix(indexWeights.z) * indexWeights.w;
		gl_Position = projMatrix * skinMatrix * mMatrix * vec4(position,1);
	}else{
		gl_Position = projMatrix * mMatrix * vec4(position,1);
	}

	normalVarying = norm;//(mvpMatrix * vec4(norm, 1)).xyz;
	texCoordVarying = texCoord;
}
