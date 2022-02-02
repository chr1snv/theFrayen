//precision qualifier for the shader code
precision mediump float;

//constant variables
uniform sampler2D texSampler;
uniform float     texturingEnabled;
uniform vec4      diffuseColor;
uniform vec4      specularColor;
uniform float     specularExponent;
uniform vec4      emissionColor;
uniform float     lightingEnabled;
uniform vec4      lightColor[8];
uniform vec3      lightVector[8];
uniform vec3      lightSpotConeAngle[8];
uniform vec4      lightPos[8];

//variables passed from the vertex shader
varying vec3      normalVarying;
varying vec2      texCoordVarying;

void main() {

    //calculate the diffuse color
    vec4 texColor            = texture2D( texSampler, texCoordVarying );
    vec4 diffuseCol          = texColor * texturingEnabled +
                               ( diffuseColor * ( 1.0-texturingEnabled ) );

    //calculate the light color
    float lightDotProd     = dot( normalVarying, lightVector[0] );
    float diffuseLightAmt  = max( lightDotProd,  1.0-lightingEnabled );
    float specularLightAmt = pow( lightDotProd,  0.001);//specularExponent );
    
    //sum the diffuse specular and emissive components
    gl_FragColor           = diffuseCol * diffuseLightAmt +
                             specularLightAmt * specularColor +
                             emissionColor;
    gl_FragColor.a = 1.0;

    float z = gl_FragCoord.z;
    //gl_FragColor = vec4(z,0,0,1.0);//vec4(1,0.5,1,0.5);
}
