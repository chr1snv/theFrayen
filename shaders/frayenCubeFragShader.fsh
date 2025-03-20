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

	gl_FragColor = texture( texSampler, worldSpaceFragPosition ); //normalize(wsfp)
	gl_FragColor.xyz *= diffuseColor;

}
