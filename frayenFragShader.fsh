//precision qualifier for the shader code
precision mediump float;

//constant variables
uniform sampler2D texSampler;
uniform vec4 lightColor[8];

//variables passed from the vertex shader
varying vec3 normalVarying;
varying vec2 texCoordVarying;

void main() {
    gl_FragColor = texture2D(texSampler, vec2(texCoordVarying));
}
