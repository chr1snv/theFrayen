//#version 300 es

//precision qualifier for the shader code
precision lowp float;

//constant variables
uniform bool      texturingEnabled;
uniform sampler2D texSampler;

uniform vec4      diffuseColor;
uniform vec2      specularAmtExponent;

//uniform float     specularExponent;
uniform vec3      emissionAndAmbientColor;

uniform bool      lightingEnabled;
uniform vec4      lightColorIntensity[3];
//uniform vec3      lightVector[4];
//uniform vec3      lightSpotConeAngle[4];
uniform vec3      lightPos[3];
uniform int       numLights;

uniform vec3      camWorldPos;


//variables passed from the vertex shader
varying vec3      worldSpaceFragPosition;
varying vec3      normalVarying;//in vec3      normalVarying;
varying vec2      texCoordVarying;//in vec2      texCoordVarying;

//out vec4 gl_FragColor; //for gles 3
void main() {

	//calculate the diffuse color
	vec4 diffuseCol = diffuseColor;
	vec3 specularCol = vec3(1,1,1);
	if( texturingEnabled ){
		diffuseCol = texture2D( texSampler, texCoordVarying );
	}

	if( !lightingEnabled ){
		gl_FragColor = diffuseCol;
	}else{
		vec3 fragToCamVecUnit = normalize( camWorldPos - worldSpaceFragPosition.xyz );
	
		gl_FragColor = vec4(emissionAndAmbientColor,0);//diffuseColvec4(diffuseCol.xyz*emissionAndAmbientColor,0);
		//calculate the light color
		if( 0 < numLights ){
			//diffuse calculation
			vec3 fragPosToLightVecUnit = normalize(lightPos[0]-worldSpaceFragPosition);
			float toLightPosDotFragNorm   = dot( normalVarying, fragPosToLightVecUnit );
			float diffuseLightAmt  = clamp(toLightPosDotFragNorm, 0.0,1.0);
			
			//specular calculation
			vec3 fragPosToCamVecUnit = normalize(worldSpaceFragPosition.xyz -camWorldPos );
			vec3 reflectedToLightVec = normalize(reflect( fragPosToLightVecUnit, normalVarying ));
			float toCamLightAmt = dot( reflectedToLightVec, fragPosToCamVecUnit );
			float specularLightAmt = pow( toCamLightAmt*specularAmtExponent[0],  5.0*specularAmtExponent[1]);//specularExponent );
			specularLightAmt = clamp( specularLightAmt, 0.0, 1.0);
			
			//sum the diffuse specular and emissive components
			gl_FragColor           += vec4( diffuseCol.xyz * diffuseLightAmt, diffuseCol.w);
			gl_FragColor           += vec4(specularCol.xyz * specularLightAmt, 1);
		}
		if( 1 < numLights ){
		}
	}
	
	//FragColor.a = 1.0;

	/*
	float z = gl_FragCoord.z;
	if( gl_FragCoord.z < 0.0 ){
		z = -z;
		vec4(0,z,0,1.0);
	}else{
		FragColor = vec4(z,0,0,1.0);
	}
	*/
	//FragDepth = z;
}
