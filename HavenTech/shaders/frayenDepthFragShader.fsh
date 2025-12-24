#version 300 es

//precision qualifier for the shader code
precision highp float;

//constant variables


//variables passed from the vertex shader
in highp vec3      shadowMapSpacePosition; //varying


out vec4 FragColor; //for gles 3
void main() {

	FragColor = vec4(shadowMapSpacePosition, 1.0);
	//FragColor.a = 1.0;
	//gl_FragDepth = shadowMapSpacePosition.z;
	
}
