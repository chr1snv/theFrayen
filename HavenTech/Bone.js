//Bone.js: Animation Bone Implementation
//to request use or code/art please contact chris@itemfactorystudio.com

function Bone( skelAnimFileLines, SLIdx ){


    this.parentName = "Not Set";
    this.boneName = "Not Set";

    this.roll = Vect3_New();

    this.animationLength = 0.0;
    
    this.curves = new Array(3+4+3);

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
    Matrix(m, MatrixType.quat_transformation, bone_scale, bone_quaternion, bone_translation);
}

function Bone_GetScale(bone, scale, time)
{
    //returns the animated scale component of the bone
    scale[0] = bone.curves[7].GetValue(time);
    scale[1] = bone.curves[8].GetValue(time);
    scale[2] = bone.curves[9].GetValue(time);

    //curves return 0 when there empty, make 1 for scaling
    if (scale[0] == 0.0 && scale[1] == 0.0 && scale[2] == 0.0) {
        scale[0] = scale[1] = scale[2] = 1.0;
        return;
    }
}

function Bone_GetQuaternion(bone, quaternion, time)
{
    //returns the animated rotation component of the bone
    quaternion[0] = bone.curves[3].GetValue(time);
    quaternion[1] = bone.curves[4].GetValue(time);
    quaternion[2] = bone.curves[5].GetValue(time);
    quaternion[3] = bone.curves[6].GetValue(time);

    //if all the curves return 0, return the identity quaternion
    if(quaternion[0] == 0.0 && quaternion[1] == 0.0 && quaternion[2] == 0.0 && quaternion[3] == 0.0){
        Quat_Identity(quaternion);
        return;
    }
}

function Bone_GetTranslation(bone, translation, time){
    //return the animated translation component of the bone
    translation[0] = bone.curves[0].GetValue(time);
    translation[1] = bone.curves[1].GetValue(time);
    translation[2] = bone.curves[2].GetValue(time);
}


function Bone_Parse(bone, skelAnimFileLines, SLIdx){
    //fStream is a opened file stream with the read marker set to the beginning
    //of this bones data

	let curveIdx = -1;
	let readingCurves = false;
	ipoChanAxisIdx = 0;
    while(sLIdx < skelAnimFileLines.length-1)
    {
        let temp = skelAnimFileLines[++sLIdx];
        let words = temp.split(' ');

		if( !readingCurves ){
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
		        bone.head = new Float32Array([words[1], words[2], words[3] ] );
		    }else if(temp[0] == 'T'){
		        bone.tail = new Float32Array([words[1], words[2], words[3] ]);
		    }else if(temp[0] == 'R'){
		        bone.roll[0] = parseFloat(words[1]);
		        bone.roll[1] = parseFloat(words[2]);
		        bone.roll[2] = parseFloat(words[3]);
		    }else if( temp[0] == 'C' ){
		        readingCurves = true;
		        sLIdx-=1;
		    }else if(temp[0] == 'e') //check for end of bone data
		        break;
		
        }else{ //read in the animation data (
        	if( temp[0] == 'C' ){
		    	curveIdx = ipoCurveNameToIndex( words[1] );
		    	if( curveIdx > -1 ){
		    		if( bone.curves[curveIdx] == undefined ){ //initalize the curve
		    			bone.curves[curveIdx] = new Curve( 
		    					curveInterpTypeStrToInt(words[2]), 
		    					parseInt(words[3]) 
		    				);
		    		}
		    	}
    		}else if(temp[0] == 'p'){ //read a point into the curve
    			bone.curves[curveIdx].InsertPoint( 
    				[ parseFloat(words[1]), parseFloat(words[2]), 
    				  parseFloat(words[3]), parseFloat(words[4]), 
    				  parseFloat(words[5]), parseFloat(words[6]) ] );
    		}else{
    			
    		}
        }
        
        
        //location data

       
    }


	//get the greatest length of the animation curves for the bone
	bone.animationLength = GetLongestCurveDuration( bone.curves );
    
    //generate cached matrices for fast lookup

    //roll_Mat
    bone.roll_Mat = Matrix_New();
    Matrix(bone.roll_Mat, MatrixType.yRot, bone.roll[1]);
    //orientation_Mat
    bone.orientation_Mat = Matrix_New();
    Matrix(bone.orientation_Mat, MatrixType.orientation, bone.tail, bone.head);
    //bone_Mat
    bone.bone_Mat = Matrix_New();
    Matrix_Multiply(bone.bone_Mat, bone.orientation_Mat, bone.roll_Mat);
    //head_Mat
    bone.head_Mat = Matrix_New();
    Matrix(bone.head_Mat, MatrixType.translate, bone.head);
    //loc_tail_Mat
    let distVec = new Float32Array([0, Vect3_Distance( bone.tail, bone.head ), 0]);
    bone.loc_tail_Mat = Matrix_New();
    Matrix(bone.loc_tail_Mat, MatrixType.translate, distVec);
}

