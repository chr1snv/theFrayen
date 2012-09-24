//frayen vert shader

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 texCoord;

varying vec3 normalVarying;
varying vec2 texCoordVarying;

void main() {
    gl_Position = projectionMatrix *
                  modelViewMatrix *
                  vec4(position,1.0);
    normalVarying = normal;
    texCoordVarying = texCoord;
}
