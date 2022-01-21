//frayen vert shader

uniform mat4 mvpMatrix;

attribute vec3 position;
attribute vec3 norm;
attribute vec2 texCoord;

//variables passed to the fragment shader
varying vec3 normalVarying;
varying vec2 texCoordVarying;

void main() {
    gl_Position = mvpMatrix * vec4(position,1);
    normalVarying = norm;//(mvpMatrix * vec4(norm, 1)).xyz;
    texCoordVarying = texCoord;
}
