//#version 300 es

//precision qualifier for the shader code
precision highp float;

//constant variables
uniform bool      texturingEnabled;

uniform sampler2D	texSampler;		//the diffuseTexture
uniform samplerCube	cubeTexSampler;	//for reflection


uniform float     alpha;

uniform vec3      diffuseColor;
uniform vec2      specularAmtRoughness;

uniform float     subSurfaceExponent;

uniform vec3      emissionAndAmbientColor; //may be used to indicate temperature and ph level in therm mode

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

/*
float modI(float a,float b) {
	float m=a-floor((a+0.5)/b)*b;
	return floor(m+0.5);
}
*/

vec4 diffuseAndSpecularLightContribution( float specularExpPow, vec3 lightPos, vec3 fragPosToCamVecUnit, vec4 diffuseAndAlphaCol, vec3 specularCol ){
	//diffuse calculation
	vec3 fragPosToLightVecUnit = normalize(lightPos-worldSpaceFragPosition);
	float toLightPosDotFragNorm   = dot( normalVarying, fragPosToLightVecUnit );
	float diffuseLightAmt  = clamp(toLightPosDotFragNorm, 0.0,1.0);
	vec4 retColContribution = vec4( diffuseAndAlphaCol.xyz * diffuseLightAmt, 0);


	//specular calculation
	vec3 reflectedToLightVec = normalize(reflect( fragPosToLightVecUnit, normalVarying ));
	float toCamLightAmt = dot( reflectedToLightVec, fragPosToCamVecUnit );
	float expVal = clamp(toCamLightAmt*specularAmtRoughness[0], 0.0, 1.0);
	float specularLightAmt = pow( expVal, specularExpPow );
	specularLightAmt = clamp( specularLightAmt, 0.0, 1.0);
	retColContribution += vec4(specularCol.xyz * specularLightAmt, specularLightAmt);
	//gl_FragColor = vec4(expVal,expPow,specularLightAmt,1);
	
	return retColContribution;
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

	}else{ //lighting model  
	//( emission + 
	//  subsurface lighting + 
	//  diffuse (color * texture) * diffuseLight + 
	//  specular light )

		//lookups and calculations used later
		if( texturingEnabled )
			diffuseAndAlphaCol *= texture2D( texSampler, texCoordVarying );

		vec3 fragPosToCamVecUnit = normalize( worldSpaceFragPosition.xyz - camWorldPos );


		//emission lighting
		gl_FragColor = vec4(emissionAndAmbientColor, diffuseAndAlphaCol.w);


		//subsurface rim lighting for skin / soft materials
		if( subSurfaceExponent > 0.0 ) 
			gl_FragColor += vec4( 
					pow((1.0-dot( fragPosToCamVecUnit, -normalVarying )) * 1.0, 
						subSurfaceExponent) * vec3(1.0,0.5,0.0), 
						0
					);


		const float cubeMapRoughnessLimit = 0.1;

		float specularExpPow = 5.0*specularAmtRoughness[1];
		if( specularAmtRoughness[1] < cubeMapRoughnessLimit ) //if going to use cubemap (very smooth surface) reduce the glare of specular from lights
			specularExpPow = 10.0;


		//light diffuse and specular contributions
		if( numLights > 0 )
			gl_FragColor += diffuseAndSpecularLightContribution( specularExpPow, lightPos[0], fragPosToCamVecUnit, diffuseAndAlphaCol, specularCol );
		//if( numLights > 1 )
		//	gl_FragColor += diffuseAndSpecularLightContribution( specularExpPow, lightPos[0], fragPosToCamVecUnit, diffuseAndAlphaCol, specularCol );
		//if( numLights > 2 )
		//	gl_FragColor += diffuseAndSpecularLightContribution( specularExpPow, lightPos[0], fragPosToCamVecUnit, diffuseAndAlphaCol, specularCol );

		//skybox reflection contribution
		
		if( specularAmtRoughness[1] < cubeMapRoughnessLimit ){ 
			float cubeMapAmt = 1.0 - (specularAmtRoughness[1]/cubeMapRoughnessLimit);
			vec3 reflectedCamToSurfaceVec = reflect( fragPosToCamVecUnit, normalVarying ); //the view vector reflected into the skybox
			//because let blenderToCubeMapEulerRot = [-Math.PI/2, 0, 0]
			//need to rotate -90 deg on x axis
			//mapping z -> y and -y -> z
			vec3 cubeMapCoords = vec3( reflectedCamToSurfaceVec.x, reflectedCamToSurfaceVec.z, -reflectedCamToSurfaceVec.y );

			//calculate cube map specular contribution
			float cubeLightAmt = specularAmtRoughness[0] * cubeMapAmt;

			vec4 skyboxContribution = textureCube( cubeTexSampler, cubeMapCoords );
			gl_FragColor += skyboxContribution * cubeLightAmt;
		}


	}


	//use discard instead of alpha blending to avoid z sorting requirement for alpha blend mode
	//gl_FragColor.a = 1.0;
	if (gl_FragColor.a <= 0.0){
		discard;
		return;
	}


}
