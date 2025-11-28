//# sourceURL=Structures/IPOAnimation.js
//for use or code/art requests please contact chris@itemfactorystudio.com

var ipoChanAxisIdx = 0;
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
	
	let reOrderedIpoChanAxisIdx = ipoChanAxisIdx;
	//blender exports quaternions with w as idx 0, change to xyz w ordering
	if( channelName == 'rotation_quaternion' ){
		if( reOrderedIpoChanAxisIdx == 0 )
			reOrderedIpoChanAxisIdx = 3;
		else
			reOrderedIpoChanAxisIdx -= 1;
	}

	return baseRetIdx + reOrderedIpoChanAxisIdx;
}

//implementation of an object animation
//made of translation, rotation, scale curves from blender
function IPOAnimation(nameIn, sceneNameIn, args, readyCallback, readyCallbackParams){

	this.ipoName = nameIn;
	this.sceneName = sceneNameIn;

	// animation data
	this.curves = new Array(3+4+3);
	
	this.quaternionRotType = false;

	this.duration;
	
	this.loop = true;

	this.isValid = false;

	//constructor functionality
	this.loadCompCallback = readyCallback;
	this.loadCompCbParams = readyCallbackParams;

	getFileFromSceneZip(this.sceneName, this.sceneName + '/IPOs/' + this.ipoName + '.hvtIPO', "string", IPOA_textFileLoaded, this );
};

function IPOA_GetLocation(ipoa, ret, time){
	let success = false;
	//get location from curves
	Vect3_Zero(ret);
	if(ipoa.curves[0]){ //x
		ret[0] = Curv_GetValue(ipoa.curves[0],time);
		success = true;}
	if(ipoa.curves[1]){ //y
		ret[1] = Curv_GetValue(ipoa.curves[1],time);
		success = true;}
	if(ipoa.curves[2]){ //z
		ret[2] = Curv_GetValue(ipoa.curves[2],time);
		success = true;}
	return success;
}
let eulerRotTemp = Vect3_New();
function IPOA_GetRotation(ipoa, rot, time){
	let success = false;

	if( ipoa.quaternionRotType ){
	}else{
		//get rotation (blender stores it as degrees/10)
		Vect3_Zero(eulerRotTemp);
		if(ipoa.curves[3]){ //eulr x
			eulerRotTemp[0] = Curv_GetValue(ipoa.curves[3],time);//*Math.PI/18.0;
			success = true;}
		if(ipoa.curves[4]){ //eulr y
			eulerRotTemp[1] = -Curv_GetValue(ipoa.curves[4],time);//*Math.PI/18.0;
			success = true;}
		if(ipoa.curves[5]){ //eulr z
			eulerRotTemp[2] = Curv_GetValue(ipoa.curves[5],time);//*Math.PI/18.0;
			success = true;}
		Quat_FromEuler( rot, eulerRotTemp );
	}
	return success;
}
function IPOA_GetScale(ipoa, scale, time){
	let success = false;
	//get scale
	Vect3_SetScalar(scale, 1);
	if(ipoa.curves[7]){ //x
		scale[0] = Curv_GetValue(ipoa.curves[7],time);
		success = true;}
	if(ipoa.curves[8]){ //y
		scale[1] = Curv_GetValue(ipoa.curves[8],time);
		success = true;}
	if(ipoa.curves[9]){ //z
		scale[2] = Curv_GetValue(ipoa.curves[9],time);
		success = true;}
	return success;
}
let translation = Vect3_New();
let rot = Quat_New();
let scale = Vect3_New();
function IPOA_GetMatrix(ipoa, outMat, time){
	if(!ipoa.isValid){
		Matrix_SetIdentity(outMat);
		return;
	}
	let wrappedTime = time;
	if( ipoa.loop && time > ipoa.duration )
		wrappedTime = time % ipoa.duration;


	IPOA_GetLocation(ipoa, translation, wrappedTime);
	IPOA_GetRotation(ipoa, rot, wrappedTime);
	IPOA_GetScale(ipoa, scale, wrappedTime);


	//return the corresponding matrix
	Matrix_SetQuatTransformation(outMat, scale, rot, translation);
}

function IPOA_textFileLoaded(txtFile, ipoa)
{
	if(txtFile === undefined){
		ipoa.loadCompCallback(ipoa, ipoa.loadCompCbParams);
		return;
	}
	let textFileLines = txtFile.split('\n');
	for(let lineNum = 0; lineNum < textFileLines.length; ++lineNum ){
		let temp = textFileLines[ lineNum ];
		if(temp[0] == 'C') //this is the start of a curve
		{
			let words = temp.split(' ');
			let curveIdx = ipoCurveNameToIndex(words[1]);
			let curveInterpType = curveInterpTypeStrToInt(words[2]);
			if( words[2] == 'rotation_quaternion')
				ipoa.quaternionRotType = true;
			let curveNumPoints = parseInt(words[3]);
			ipoa.curves[curveIdx] = new Curve(curveInterpType, curveNumPoints);
			
			//read in the bezier points
			while( ++lineNum < textFileLines.length )
			{
				temp = textFileLines[lineNum];
				words = temp.split(' ');
				//read in a point
				if(temp[0] == 'p')
					Curv_InsertPoint( ipoa.curves[curveIdx],
						[parseFloat(words[1]), parseFloat(words[2])]);
				if(temp[0] == 'e'){
					let tempDuration = Curv_GetLength(ipoa.curves[curveIdx]);
					if(tempDuration > ipoa.duration) //set the duration
						ipoa.duration = tempDuration;
					break; // finish reading in bezier points
				}
			}
		}
	}
	//set the animation duration to the longest of the curves
	ipoa.duration = GetLongestCurveDuration( ipoa.curves );

	ipoa.isValid = true;
	
	ipoa.loadCompCallback(ipoa, ipoa.loadCompCbParams);
}

function GetLongestCurveDuration( curves ){
	let lngstDur = 0;
	for( let i = 0; i < curves.length; ++i ){
		if( curves[i] ){
			let len = Curv_GetLength(curves[i]);
			if( len > lngstDur )
				lngstDur = len;
		}
	}
	return lngstDur;
}
