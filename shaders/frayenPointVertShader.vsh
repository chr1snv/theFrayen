#version 300 es

//frayen point drawing vert shader

uniform mat4 projection;
uniform float pointSize;
uniform float pointFalloff;

in vec3 position;
in vec4 ptCol;

//variables passed to the fragment shader
out vec3 normalVarying;
out vec4 colorVarying;

void main() {
    gl_Position = projection*vec4( position, 1.0 );
    gl_PointSize = pointSize-(gl_Position.z*pointFalloff);
    colorVarying = ptCol;
}
