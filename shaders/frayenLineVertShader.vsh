//#version 300 es

//frayen line drawing vert shader

uniform mat4 projection;
//uniform float pointSize;
//uniform float pointFalloff;

attribute vec3 position;//in vec3 position;
attribute vec4 ptCol;//in vec4 ptCol;

//variables passed to the fragment shader
//out vec3 normalVarying;
varying vec4 colorVarying;//out vec4 colorVarying;

void main() {
    gl_Position = projection*vec4( position, 1.0 );
    colorVarying = ptCol;
}
