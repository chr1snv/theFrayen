precision mediump float;

uniform sampler2D texSampler;

varying vec3 normalVarying;
varying vec2 texCoordVarying;

void main()
{
    gl_FragColor = texture2D(texSampler, vec2(texCoordVarying));
}
