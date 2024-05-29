//#version 300 es

//precision qualifier for the shader code
precision mediump float;

//constant variables

//variables passed from the vertex shader
varying vec3      normalVarying;//in vec3      normalVarying;
varying vec4      colorVarying;//in vec4      colorVarying;

//out vec4 gl_FragColor;
void main() {

    gl_FragColor = colorVarying;//vec4( colorVarying, 1.0 );

}
