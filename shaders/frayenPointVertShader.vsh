#version 300 es

//frayen point drawing vert shader


in vec2 position;
in vec3 ptCol;

//variables passed to the fragment shader
out vec3 normalVarying;
out vec3 colorVarying;

void main() {
    gl_Position = vec4( position.x, position.y, 0.0, 1.0 );
    gl_PointSize = 5.0;
    colorVarying = ptCol;
}
