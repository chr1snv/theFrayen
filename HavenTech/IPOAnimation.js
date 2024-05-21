//IPOAnimation.js
//for use or code/art requests please contact chris@itemfactorystudio.com

let ipoChanAxisIdx = 0;
let lastBaseIdx = -1;
function ipoCurveNameToIndex(channelName){
	let baseRetIdx = -1;
	
	
	if( 	 channelName == 'location' )
		baseRetIdx = 0;
	else if( channelName == 'rotation_euler' || channelName == 'rotation_quaternion' )
		baseRetIdx = 3;
	else if( channelName == 'scale' )
		baseRetIdx = 7;
		
	++ipoChanAxisIdx;
	if( lastBaseIdx != baseRetIdx )
		ipoChanAxisIdx = 0;
	
	lastBaseIdx = baseRetIdx;
	
	return baseRetIdx + ipoChanAxisIdx;
}

//implementation of an object animation
//made of translation, rotation, scale curves from blender
function IPOAnimation(nameIn, sceneNameIn){
	this.ipoName = nameIn;
	this.sceneName = sceneNameIn;

	// animation data
	this.curves = new Array(3+4+3);

	this.duration;

	this.isValid = false;

	this.GetLocation = function(ret, time)
	{
		let success = false;
		//get location
		Vect3_Zero(ret);
		if(this.curves.LocX){
			ret[0] = this.curves.LocX.GetValue(time);
			success = true;
		}
		if(this.curves.LocY){
			ret[1] = this.curves.LocY.GetValue(time);
			success = true;
		}
		if(this.curves.LocZ){
			ret[2] = this.curves.LocZ.GetValue(time);
			success = true;
		}
		return success;
	}
	let eulerRotTemp = Vect3_New();
	this.GetRotation = function(rot, time){
		let success = false;

		//get rotation (blender stores it as degrees/10)
		Vect3_Zero(eulerRotTemp);
		if(this.curves.RotX){
			eulerRotTemp[0] = this.curves.RotX.GetValue(time)*Math.PI/18.0;
			success = true;}
		if(this.curves.RotY){
			eulerRotTemp[1] = -this.curves.RotY.GetValue(time)*M_PI/18.0;
			success = true;}
		if(this.curves.RotZ){
			eulerRotTemp[2] = this.curves.RotZ.GetValue(time)*M_PI/18.0;
			success = true;}
		Quat_FromEuler( rot, eulerRotTemp );
		return success;
	}
	this.GetScale = function(scale, time){
		let success = false;
		//get scale
		scale = [1,1,1];
		if(this.curves.ScaleX){
			scale[0] = this.curves.ScaleX.GetValue(time);
			success = true;}
		if(iter != this.curves.ScaleY){
			scale[1] = this.curves.ScaleY.GetValue(time);
			success = true;}
		if(this.curves.ScaleZ){
			scale[2] = this.curves.ScaleZ.GetValue(time);
			success = true;}
		return success;
	}

	this.GetMatrix = function(outMat, time){
		if(!isValid)
			return;

		let translation = Vect3_New();
		GetLocation(translation, time);

		let rot = Quat_New();
		GetRotation(rot, time);

		//get scale
		let scale = Vect3_New();
		GetScale(scale, time);

		//return the corresponding matrix
		Matrix(outMat, MatrixType.quat_transformation, scale, rot, translation);
	}

	this.GetDuration = function(){ return duration; }


	this.textFileLoaded = function(txtFile, thisP)
	{
		if(txtFile === undefined)
			return;
		let textFileLines = txtFile.split('\n');
		for(let lineNum = 0; lineNum < textFileLines.length; ++lineNum ){
			let temp = textFileLines[ lineNum ];
			if(temp[0] == 'c') //this is the start of a curve
			{
				let words = temp.split(' ');
				let curveIdx = ipoCurveNameToIndex(words[1]);
				let curveInterpType = curveInterpTypeStrToInt(words[2]);
				let curveNumPoints = parseInt(words[3]);
				thisP.curves[curveIdx] = new Curve(curveInterpType, curveNumPoints);
				
				//read in the bezier points
				while( ++lineNum < textFileLines.length )
				{
					temp = textFileLines[lineNum];
					words = temp.split(' ');
					//read in a point
					if(temp[0] == 'p')
						thisP.curves[curveIdx].InsertPoint(
							[parseFloat(words[1]), parseFloat(words[2])]);
					if(temp[0] == 'e'){
						let tempDuration = thisP.curves[curveIdx].GetLength();
						if(tempDuration > thisP.duration) //set the duration
							thisP.duration = tempDuration;
						break; // finish reading in bezier points
					}
				}
			}
		}
		this.isValid = true;
	}

	//constructor functionality
	loadTextFile( 'scenes/' + this.sceneName + '/IPOs/' + this.ipoName + '.hvtIPO', this.textFileLoaded, this );

};
