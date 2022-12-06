#version 300 es

//precision qualifier for the shader code
precision mediump float;

//constant variables

//variables passed from the vertex shader
in vec3      normalVarying;
in vec3      colorVarying;

out vec4 FragColor;
void main() {

    FragColor = vec4( colorVarying, 1.0 );

}
