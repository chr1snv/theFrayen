//#version 300 es

//precision qualifier for the shader code
precision lowp float;

//constant variables
uniform bool      texturingEnabled;
uniform sampler2D texSampler;

uniform float     alpha;

uniform vec3      diffuseColor;
uniform vec2      specularAmtHrdnessExp;

uniform float     subSurfaceExponent;

uniform vec3      emissionAndAmbientColor;

uniform bool      lightingEnabled;
uniform vec4      lightColorIntensity[3];
//uniform vec3      lightVector[4];
//uniform vec3      lightSpotConeAngle[4];
uniform vec3      lightPos[3];
uniform int       numLights;

uniform vec3      camWorldPos;

//uniform vec2      screenDims;


//variables passed from the vertex shader
varying vec3      worldSpaceFragPosition;
varying vec3      normalVarying;//in vec3      normalVarying;
varying vec2      texCoordVarying;//in vec2      texCoordVarying;

float modI(float a,float b) {
	float m=a-floor((a+0.5)/b)*b;
	return floor(m+0.5);
}

//out vec4 gl_FragColor; //for gles 3
void main() {

	//calculate the diffuse color
	vec4 diffuseAndAlphaCol = vec4(diffuseColor,alpha);
	vec3 specularCol = vec3(1,1,1);
	
	//types of material
	//diffuse and specular lighting
	//or no lighting
	//emission + diffuse + specular
	//emission always added at end


	if( !lightingEnabled ){
		//color is either from texture or assigned from uniform variable
		if( texturingEnabled ){ //emission only
			gl_FragColor = texture2D( texSampler, texCoordVarying );
			gl_FragColor.xyz *= emissionAndAmbientColor;
		}else{
			gl_FragColor = vec4(emissionAndAmbientColor, diffuseAndAlphaCol.a);
		}

	}else{
	
		if( texturingEnabled ){
			diffuseAndAlphaCol *= texture2D( texSampler, texCoordVarying );
		}

		gl_FragColor = vec4(emissionAndAmbientColor, diffuseAndAlphaCol.w);

		vec3 fragPosToCamVecUnit = normalize( worldSpaceFragPosition.xyz - camWorldPos );

		if( subSurfaceExponent > 0.0 )
			gl_FragColor += vec4( 
					pow((1.0-dot( fragPosToCamVecUnit, -normalVarying )) * 1.0, 
						subSurfaceExponent) * vec3(1.0,0.5,0.0), 
						0
					);

		//calculate light contributions
		if( 0 < numLights ){
			//diffuse calculation
			vec3 fragPosToLightVecUnit = normalize(lightPos[0]-worldSpaceFragPosition);
			float toLightPosDotFragNorm   = dot( normalVarying, fragPosToLightVecUnit );
			float diffuseLightAmt  = clamp(toLightPosDotFragNorm, 0.0,1.0);
			gl_FragColor += vec4( diffuseAndAlphaCol.xyz * diffuseLightAmt, 0);


			//specular calculation
			vec3 reflectedToLightVec = normalize(reflect( fragPosToLightVecUnit, normalVarying ));
			float toCamLightAmt = dot( reflectedToLightVec, fragPosToCamVecUnit );
			float specularLightAmt = pow( toCamLightAmt*specularAmtHrdnessExp[0],  5.0*specularAmtHrdnessExp[1]);
			specularLightAmt = clamp( specularLightAmt, 0.0, 1.0);
			gl_FragColor += vec4(specularCol.xyz * specularLightAmt, specularLightAmt);

		}
		if( 1 < numLights ){
		}


	}

	//use discard instead of alpha blending to avoid z sorting requirement for alpha blend mode
	//gl_FragColor.a = 1.0;
	if (gl_FragColor.a <= 0.0){
		discard;
		return;
	}


}
