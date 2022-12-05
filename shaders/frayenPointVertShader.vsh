#version 300 es

//frayen point drawing vert shader


in vec3 position;
in vec3 color;

//variables passed to the fragment shader
out vec3 normalVarying;
out vec3 colorVarying;

void main() {
    gl_Position = vec4(position,1.0);
    gl_PointSize = 10.0;
    colorVarying = color;
}
