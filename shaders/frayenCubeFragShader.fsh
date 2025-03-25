//#version 300 es

//precision qualifier for the shader code
precision highp float;

//constant variables
uniform samplerCube texSampler;

uniform vec3      diffuseColor;


//variables passed from the vertex shader
varying vec3      worldSpaceFragPosition;
//varying vec3      normalVarying;//in vec3      normalVarying;
//varying vec2      texCoordVarying;//in vec2      texCoordVarying;


//out vec4 gl_FragColor; //for gles 3
void main() {
	vec3 normPos = normalize(worldSpaceFragPosition);
	gl_FragColor = textureCube( texSampler, normPos ); //normalize(wsfp)
	//gl_FragColor.xyz *= diffuseColor;
	//gl_FragColor.xyz = vec3(1.0, 0.0, 0.0);
	gl_FragColor.xyz += normPos;
	gl_FragColor.a = 1.0;
	

}
