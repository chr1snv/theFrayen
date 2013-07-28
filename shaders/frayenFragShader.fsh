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
    vec4 texColor          = texture2D( texSampler, texCoordVarying );
    vec4 diffuseColor      = texColor * texturingEnabled + diffuseColor * ( 1.0-texturingEnabled );

    //calculate the light color
    float lightDotProd     = dot( normalVarying, normalVarying );
    float diffuseLightAmt  = max( lightDotProd,  1.0-lightingEnabled );
    float specularLightAmt = pow( lightDotProd,  specularExponent );
    
    //sum the diffuse specular and emissive components
    gl_FragColor           = diffuseColor * diffuseLightAmt +
                             specularLightAmt * specularColor +
                             emissionColor;

    gl_FragColor = vec4(1,1,1,1);
}
