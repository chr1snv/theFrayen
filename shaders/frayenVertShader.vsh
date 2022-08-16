#version 300 es

//frayen vert shader

uniform mat4 mvpMatrix;

in vec3 position;
in vec3 norm;
in vec2 texCoord;

//variables passed to the fragment shader
out vec3 normalVarying;
out vec2 texCoordVarying;

void main() {
    gl_Position = mvpMatrix * vec4(position,1);
    normalVarying = norm;//(mvpMatrix * vec4(norm, 1)).xyz;
    texCoordVarying = texCoord;
}
