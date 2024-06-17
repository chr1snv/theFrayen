//Bone.js: Animation Bone Implementation
//to request use or code/art please contact chris@itemfactorystudio.com

function Bone( expectedCurvesToRead ){


	this.parentName = "Not Set";
	this.boneName = "Not Set";

	this.roll = Vect3_New();

	this.animationLength = 0.0;

	this.curves = new Array(3+4+3);
	this.expectedCurvesToRead = expectedCurvesToRead;

	this.parentIdx   = -1;
	this.childrenIdxs= [];
	this.children    = [];

	this.head = Vect3_NewZero();
	this.tail = Vect3_NewZero();

	this.inverseBindPose = Matrix_New();

}

//gets the pose matrix at time for the bone
let bone_scale       = Vect3_NewZero();
let bone_quaternion  = Quat_New();
let bone_translation = Vect3_NewZero();
function Bone_GetPose_Mat(bone, m, time)
{

	Bone_GetScale(bone,            bone_scale, time);
	Bone_GetQuaternion(bone,  bone_quaternion, time); Quat_Norm(bone_quaternion);

	Bone_GetTranslation(bone, bone_translation, time);
	Matrix_SetQuatTransformation(m,  bone_scale, bone_quaternion, bone_translation);
}

function Bone_GetScale(bone, scale, time)
{
	//returns the animated scale component of the bone
	scale[0] = Curv_GetValue(bone.curves[7],time);
	scale[1] = Curv_GetValue(bone.curves[8],time);
	scale[2] = Curv_GetValue(bone.curves[9],time);

	//curves return 0 when there empty, make 1 for scaling
	if (scale[0] == 0.0 && scale[1] == 0.0 && scale[2] == 0.0) {
		scale[0] = scale[1] = scale[2] = 1.0;
		return;
	}
}

function Bone_GetQuaternion(bone, quaternion, time)
{
	//returns the animated rotation component of the bone
	quaternion[0] = Curv_GetValue(bone.curves[3],time);
	quaternion[1] = Curv_GetValue(bone.curves[4],time);
	quaternion[2] = Curv_GetValue(bone.curves[5],time);
	quaternion[3] = Curv_GetValue(bone.curves[6],time);

	//if all the curves return 0, return the identity quaternion
	if(quaternion[0] == 0.0 && quaternion[1] == 0.0 && quaternion[2] == 0.0 && quaternion[3] == 0.0){
		Quat_Identity(quaternion);
		return;
	}
}

function Bone_GetTranslation(bone, translation, time){
	//return the animated translation component of the bone
	translation[0] = Curv_GetValue(bone.curves[0],time);
	translation[1] = Curv_GetValue(bone.curves[1],time);
	translation[2] = Curv_GetValue(bone.curves[2],time);
}


function Bone_Parse(bone, skelAnimFileLines, SLIdx){
	//fStream is a opened file stream with the read marker set to the beginning
	//of this bones data

	let curveIdx = -1;
	
	let readingCurve = false;

	let expectedCurvePoints = 0;
	let curvePointsRead = 0;

	//bone.expectedCurvesToRead; //read in constructor
	let curvesRead = 0;
	
	ipoChanAxisIdx = 0;
	while(SLIdx < skelAnimFileLines.length-1)
	{
		let temp = skelAnimFileLines[++SLIdx];
		let words = temp.split(' ');

		if( !readingCurve ){
			//read in the bone, parent, and child name
			if(temp[0] == 'N'){
				bone.boneName = words[1];
			}else if(temp[0] == 'p'){
				bone.parentName = words[1];
			}else if(temp[0] == 'c'){
				let newChild = words[1];
				bone.children.push(newChild);
			}

		    //read in the bind pose data (bone space)
			 else if(temp[0] == 'H'){
				bone.head = Vect3_NewVals( words[1], words[2], words[3] );
			}else if(temp[0] == 'T'){
				bone.tail = Vect3_NewVals( words[1], words[2], words[3] );
			}else if(temp[0] == 'R'){
				bone.roll[0] = parseFloat(words[1]);
				bone.roll[1] = parseFloat(words[2]);
				bone.roll[2] = parseFloat(words[3]);
			}else if( temp[0] == 'C' ){
				readingCurve = true;
			}else if(temp[0] == 'e'){ //check for end of bone data
				if( curvesRead != bone.expectedCurvesToRead )
					DPrintf( "unexpected number of curves read " + curvesRead + " expectedCurvesToRead " + bone.expectedCurvesToRead );
				break;
			}
		
		}

		if( readingCurve ){ //read in the animation data (
			if( temp[0] == 'C' ){
				curveIdx = ipoCurveNameToIndex( words[1] );
				if( curveIdx > -1 ){
					curvePointsRead = 0;
					expectedCurvePoints = parseInt(words[3]);
					if( bone.curves[curveIdx] == undefined ){ //initalize the curve
						bone.curves[curveIdx] = new Curve( 
								curveInterpTypeStrToInt(words[2]), 
								expectedCurvePoints
							);
					}
				}
			}else if(temp[0] == 'p'){ //read a point into the curve
				Curv_InsertPoint( bone.curves[curveIdx],
					[ parseFloat(words[1]), parseFloat(words[2]), 
					  parseFloat(words[3]), parseFloat(words[4]), 
					  parseFloat(words[5]), parseFloat(words[6]) ] );
				++curvePointsRead;
			}else if(temp[0] == 'e'){
				if( curvePointsRead != expectedCurvePoints )
					DPrintf( "unexpected number of curve points read " + curvePointsRead + " expectedCurvePoints " + expectedCurvePoints );
				else
					++curvesRead;
				readingCurve = false;
			}
		}


		//location data


	}


	//get the greatest length of the animation curves for the bone
	bone.animationLength = GetLongestCurveDuration( bone.curves );

	//generate cached matrices for fast lookup

	//roll_Mat
	bone.roll_Mat = Matrix_New();
	Matrix_SetYRot(bone.roll_Mat, bone.roll[1]);
	//orientation_Mat
	bone.orientation_Mat = Matrix_New();
	Matrix_SetBoneOrientation(bone.orientation_Mat, bone.head, bone.tail);
	//bone_Mat
	bone.bone_Mat = Matrix_New();
	Matrix_Multiply(bone.bone_Mat, bone.orientation_Mat, bone.roll_Mat);
	//head_Mat
	bone.head_Mat = Matrix_New();
	Matrix_SetTranslate(bone.head_Mat, bone.head);
	//loc_tail_Mat
	let distVec = Vect3_NewVals(0, 0, Vect3_Distance( bone.tail, bone.head ));
	bone.loc_tail_Mat = Matrix_New();
	Matrix_SetTranslate(bone.loc_tail_Mat, distVec);

	return SLIdx;
}

