//Bone.js: Animation Bone Implementation
//to request use or code/art please contact chris@itemfactorystudio.com

function Bone( skelAnimFileLines, SLIdx ){

    //gets the pose matrix at time for the bone
    this.GetChan_Mat = function( m, time)
    {
        let scale       = Vect3_NewZero();
        let quaternion  = Quat_New();
        let translation = Vect3_NewZero();
        this.GetScale(            scale, time);
        this.GetQuaternion(  quaternion, time); Quat_Norm(quaternion);
        
        this.GetTranslation(translation, time);
        Matrix(m, MatrixType.quat_transformation, scale, quaternion, translation);
    }

    this.GetScale = function( scale, time)
    {
        //returns the animated scale component of the bone
        scale[0] = this.curves[7].GetValue(time);
        scale[1] = this.curves[8].GetValue(time);
        scale[2] = this.curves[9].GetValue(time);

        //curves return 0 when there empty, make 1 for scaling
        if (scale[0] == 0.0 && scale[1] == 0.0 && scale[2] == 0.0) {
            scale[0] = scale[1] = scale[2] = 1.0;
            return;
        }
    }

    this.GetQuaternion = function( quaternion, time)
    {
        //returns the animated rotation component of the bone
        quaternion[0] = this.curves[3].GetValue(time);
        quaternion[1] = this.curves[4].GetValue(time);
        quaternion[2] = this.curves[5].GetValue(time);
        quaternion[3] = this.curves[6].GetValue(time);

        //if all the curves return 0, return the identity quaternion
        if(quaternion[0] == 0.0 && quaternion[1] == 0.0 && quaternion[2] == 0.0 && quaternion[3] == 0.0){
            Quat_Identity(quaternion);
            return;
        }
    }

    this.GetTranslation = function( translation, time)
    {
        //return the animated translation component of the bone
        translation[0] = this.curves[0].GetValue(time);
        translation[1] = this.curves[1].GetValue(time);
        translation[2] = this.curves[2].GetValue(time);
    }

    this.calculateAnimationLength = function()
    {
        //return the length of the animation (return the greatest length of the
        //animation curves for the bone)

        this.animationLength = GetLongestCurveDuration( this.curves );
    }

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
		        this.boneName = words[1];
		    }else if(temp[0] == 'p'){
		        this.parentName = words[1];
		    }else if(temp[0] == 'c'){
		       let newChild = words[1];
		       this.children.push(newChild);
		    }

		    //read in the bind pose data (bone space)
		     else if(temp[0] == 'H'){
		        this.head = new Float32Array([words[1], words[2], words[3] ] );
		    }else if(temp[0] == 'T'){
		        this.tail = new Float32Array([words[1], words[2], words[3] ]);
		    }else if(temp[0] == 'R'){
		        this.roll[0] = parseFloat(words[1]);
		        this.roll[1] = parseFloat(words[2]);
		        this.roll[2] = parseFloat(words[3]);
		    }else if( temp[0] == 'C' ){
		        readingCurves = true;
		        sLIdx-=1;
		    }else if(temp[0] == 'e') //check for end of bone data
		        break;
		
        }else{ //read in the animation data (
        	if( temp[0] == 'C' ){
		    	curveIdx = ipoCurveNameToIndex( words[1] );
		    	if( curveIdx > -1 ){
		    		if( this.curves[curveIdx] == undefined ){ //initalize the curve
		    			this.curves[curveIdx] = new Curve( 
		    					curveInterpTypeStrToInt(words[2]), 
		    					parseInt(words[3]) 
		    				);
		    		}
		    	}
    		}else if(temp[0] == 'p'){ //read a point into the curve
    			this.curves[curveIdx].InsertPoint( 
    				[ parseFloat(words[1]), parseFloat(words[2]), 
    				  parseFloat(words[3]), parseFloat(words[4]), 
    				  parseFloat(words[5]), parseFloat(words[6]) ] );
    		}else{
    			
    		}
        }
        
        
        //location data

       
    }

    this.calculateAnimationLength();
    
    //generate cached matrices for fast lookup

    //roll_Mat
    this.roll_Mat = Matrix_New();
    Matrix(this.roll_Mat, MatrixType.yRot, this.roll[1]);
    //orientation_Mat
    this.orientation_Mat = Matrix_New();
    Matrix(this.orientation_Mat, MatrixType.orientation, this.tail, this.head);
    //bone_Mat
    this.bone_Mat = Matrix_New();
    Matrix_Multiply(this.bone_Mat, this.orientation_Mat, this.roll_Mat);
    //head_Mat
    this.head_Mat = Matrix_New();
    Matrix(this.head_Mat, MatrixType.translate, this.head);
    //loc_tail_Mat
    let distVec = new Float32Array([0, Vect3_Distance( this.tail, this.head ), 0]);
    this.loc_tail_Mat = Matrix_New();
    Matrix(this.loc_tail_Mat, MatrixType.translate, distVec);
}

