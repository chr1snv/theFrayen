//#version 300 es

//frayen vert shader

uniform mat4 mvpMatrix;

attribute vec3 position;//in vec3 position;
attribute vec3 norm;//in vec3 norm;
attribute vec2 texCoord;//in vec2 texCoord;

//variables passed to the fragment shader
varying vec3 normalVarying;//out vec3 normalVarying;
varying vec2 texCoordVarying;//out vec2 texCoordVarying;

void main() {
    gl_Position = mvpMatrix * vec4(position,1);
    normalVarying = norm;//(mvpMatrix * vec4(norm, 1)).xyz;
    texCoordVarying = texCoord;
}
