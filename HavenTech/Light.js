//Light.js
//for use or code/art requests please contact chris@itemfactorystudio.com

let LightType = {
		Directional : 1,
		Point : 0,
		Spot : 2
	};

function Light(nameIn, sceneNameIn, colorIn, intensityIn, lightTypeIn, posIn, rotIn, coneAngleIn, animIpoName){

	this.lname = nameIn;
	this.sceneName = sceneNameIn;
	
	this.ipoAnimation = null;
	this.pos			= Vect3_NewZero();
	this.rot			= Quat_New();
	this.color		= new Float32Array([0,0,0, 1]);
	this.intensity	= intensityIn;
	this.ambientIntensity = 0.0;
	this.coneAngle	= coneAngleIn !== undefined ? coneAngleIn : 180.0;
	this.lightType	= lightTypeIn !== undefined ? lightTypeIn : this.Type.Directional;

	var updatedTime = 0.0;

	//depending on the type of light, ignore constructor inputs
	Vect3_Copy(this.color, colorIn);
	if(this.lightType == LightType.Directional){
		Quat_Copy(this.rot, rotIn);
	}
	else if(this.lightType == LightType.Point){
		Vect3_Copy(this.pos, posIn);
	}
	else{ //Spot
		Vect3_Copy(this.pos, posIn);
		Quat_Copy(this.rot, rotIn);
	}
	
	if( animIpoName != '' )
		graphics.GetCached(animIpoName, sceneNameIn, IPOAnimation, null, Light_IpoReady, this);

}



function Light_IpoReady(ipoA, l){
	l.ipoAnimation = ipoA;
}

function Light_Update(l, time) { 
	l.updatedTime = time; 
}


function Light_BindToGL(l, lightNumber) {
		
	//pass color and intensity data
	var colIntens = new Array(4);
	Vect3_Copy(colIntens, color);

	colIntens[3] = intensity;
	gl.uniform4fv(
		gl.getUniformLocation(graphics.currentProgram, 'lightColor[' + lightNumber + ']'),
		colIntens );
	

	//get the position and rotation
	var position = new Array(3);
	var rotation = new Array(3);
	if(ipoAnimation.isValid){
		ipoAnimation.GetLocation(position, updatedTime);
		ipoAnimation.GetRotation(rotation, updatedTime);
	}
	else{ //if the ipo isn't valid just use the static values
		Vect3_Copy(position, pos);
		Vect3_Copy(rotation, rot);
	}

	//calculate the light direction normal
	var basisVect = [0.0,-1.0, 0.0];
	var lightNormal = new Array(4);
	var rotMatrix   = new Array(4*4);
	Matrix( rotMatrix, MatrixType.euler_rotate, rotation );
	Matrix_Multiply( lightNormal, rotMatrix, basisVect );
	
	//pass data dependent on the type of light
	if(lightType == this.Type.Directional){ //directional light
		lightNormal[3] = 0.0;
		Vect3_Negative(lightNormal);
		gl.uniform3f(
			gl.getUniformLocation(graphics.currentProgram, 'lightVector[' + lightNumber + ']'),
			lightNormal[0], lightNormal[1], lightNormal[2], lightNormal[3] );
		gl.uniform1f(
			gl.getUniformLocation(graphics.currentProgram, 'lightSpotConeAngle[' + lightNumber + ']'),
			180		);
	}
	else{ //either a point light or a spot light
		var lightPos = new Array(4);
		Vect3_Copy(lightPos, position);
		//lightPos[3] = 1.0;
		gl.uniform3f(
			gl.getUniformLocation(graphics.currentProgram, 'lightVector[' + lightNumber + ']'),
			lightPos[0], lightPos[1], lightPos[2] );

		//pass the direction and angle data (if spot)
		if(lightType == this.Type.Spot){
			lightNormal[3] = 1.0; //positional light
			gl.uniform4f(
				gl.getUniformLocation(graphics.currentProgram, 'lightDirection[' + lightNumber + ']'), 
				lightNormal[0], lightNormal[1], lightNormal[2], lightNormal[3] );
			gl.uniform1f(
				gl.getUniformLocation(graphics.currentProgram, 'lightSpotConeAngle[' + lightNumber + ']'), 
				coneAngle );
		}
		else{ //point light, set the spot cutoff to 180
			gl.uniform1f(

				gl.getUniformLocation(graphics.currentProgram, 'lightSpotConeAngle[' + lightNumber + ']'), 
				180 );
		}
	}
}

