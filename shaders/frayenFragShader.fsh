//#version 300 es

//precision qualifier for the shader code
precision mediump float;

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
	vec4 diffuseAndAlphaCol;
	vec3 specularCol = vec3(1,1,1);
	

	
	if( texturingEnabled ){
		diffuseAndAlphaCol = texture2D( texSampler, texCoordVarying );
	}else{
		diffuseAndAlphaCol = vec4(diffuseColor,alpha);
	}

	if( !lightingEnabled ){
		//color is either from texture or assigned from uniform variable
		if( texturingEnabled )
			gl_FragColor = diffuseAndAlphaCol;
		else
			gl_FragColor = vec4(emissionAndAmbientColor, diffuseAndAlphaCol.w);
	
	}else{
	
		gl_FragColor = vec4(emissionAndAmbientColor, diffuseAndAlphaCol.w);
		
		
		vec3 fragPosToCamVecUnit = normalize( worldSpaceFragPosition.xyz - camWorldPos );
		
		if( subSurfaceExponent > 0.0 )
			gl_FragColor += vec4( pow((1.0-dot( fragPosToCamVecUnit, -normalVarying )) * 1.0, subSurfaceExponent)* vec3(1.0,0.5,0.0), 0);
		

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
			float specularLightAmt = pow( toCamLightAmt*specularAmtHrdnessExp[0],  5.0*specularAmtHrdnessExp[1]);//specularExponent );
			specularLightAmt = clamp( specularLightAmt, 0.0, 1.0);
			gl_FragColor += vec4(specularCol.xyz * specularLightAmt, specularLightAmt);
			
		}
		if( 1 < numLights ){
		}
		
		
	}
	
	//gl_FragColor.a = 1.0;
	if (gl_FragColor.a <= 0.0){
		discard;
		return;
	}
	
	if( gl_FragColor.a <= 1.0 ){
		if ( modI((gl_FragCoord.x*1000.0), (10.0*gl_FragColor.a)) <= 1.1 ||
			modI((gl_FragCoord.y*1000.0), (10.0*gl_FragColor.a)) <= 1.1 )
			discard;
	}


	/*
	float z = gl_FragCoord.z;
	if( z < 0.0 ){
		z = -z;
		vec4(0,z,0,1.0);
	}else{
		if( z > 1.0 )
			gl_FragColor = vec4(0,0,z-1.0,1.0);
		else
			gl_FragColor = vec4(z,0,0,1.0);
	}
	*/
	
	//FragDepth = z;
}
