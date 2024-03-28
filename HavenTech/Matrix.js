//Matrix.js - implementation of matrix
//for use or code/art requests please contact chris@itemfactorystudio.com

MatrixType =
{
	scale: 1,
	euler_rotate: 2,
	xRot: 3, yRot: 4, zRot: 5,
	quat_rotate: 6,
	translate: 7,
	orientation: 8,
	identity: 9,
	euler_transformation: 10,
	quat_transformation: 11,
	copy: 12,
zero: 13
}

//initialization helpers
function Matrix_SetZero( m )
{
	m[0*4+0] = 0; m[0*4+1] = 0; m[0*4+2] = 0; m[0*4+3] = 0;
	m[1*4+0] = 0; m[1*4+1] = 0; m[1*4+2] = 0; m[1*4+3] = 0;
	m[2*4+0] = 0; m[2*4+1] = 0; m[2*4+2] = 0; m[2*4+3] = 0;
	m[3*4+0] = 0; m[3*4+1] = 0; m[3*4+2] = 0; m[3*4+3] = 0;
}
function Matrix_SetIdentity( m )
{
	m[0*4+0] = 1; m[0*4+1] = 0; m[0*4+2] = 0; m[0*4+3] = 0;
	m[1*4+0] = 0; m[1*4+1] = 1; m[1*4+2] = 0; m[1*4+3] = 0;
	m[2*4+0] = 0; m[2*4+1] = 0; m[2*4+2] = 1; m[2*4+3] = 0;
	m[3*4+0] = 0; m[3*4+1] = 0; m[3*4+2] = 0; m[3*4+3] = 1;
}
function Matrix_Copy( m, m2 ){
	for( var i = 0; i < 4*4; ++i )
		m[i] = m2[i];
}

let tempMat1 = new Float32Array(4*4);
let tempMat2 = new Float32Array(4*4);
let tempMat3 = new Float32Array(4*4);
//high level euler rotation angle Transformation matrix constructor
function Matrix(){// m, type, scale, rot, translation )
	//var m = arguments[0];
	//var type = arguments[1];
	if(arguments[1] == MatrixType.identity){
		Matrix_SetIdentity(arguments[0]);
	}
	else if(arguments[1] == MatrixType.euler_transformation ){
		//var scale       = arguments[2];
		//var rot         = arguments[3];
		//var translation = arguments[4];
		//scale, rotate, then translate
		Matrix(arguments[0],        MatrixType.scale, arguments[2]);
		Matrix(tempMat1, MatrixType.euler_rotate, arguments[3]);
		Matrix(tempMat2, MatrixType.translate, arguments[4]);
		Matrix_Multiply(tempMat3, tempMat1, arguments[0]);
		Matrix_Multiply(arguments[0],        tempMat2, tempMat3);
	}
	else if( arguments[1] == MatrixType.quat_transformation){
		//var scale       = arguments[2];
		//var rot         = arguments[3];
		//var translation = arguments[4];
		//scale, rotate, then translate
		Matrix(arguments[0],        MatrixType.scale, arguments[2]);
		Matrix(tempMat1, MatrixType.quat_rotate, arguments[3]);
		Matrix(tempMat2, MatrixType.translate, arguments[4]);
		Matrix_Multiply(tempMat3, tempMat1, arguments[0]);
		Matrix_Multiply(arguments[0],        tempMat2, tempMat3);
	}
	else if( arguments[1] == MatrixType.orientation){
		//var tail = arguments[2];
		//var head = arguments[3];
		Matrix_SetIdentity(arguments[0]);

		//generate the bone orientation matrix
		//the orientation matrix is the transformation from bone space
		//to armature space (ignoring bone roll)
		
		//to do this, find a quaternion rotation that will take us from
		// the y axis to the axis of the bone (boneAxisVector)
		
		var boneAxis = new Float32Array(3);
		Vect3_Copy(boneAxis, arguments[2]);
		
		Vect3_Subtract(boneAxis, arguments[3]);
		Vect3_Unit(boneAxis);
		
		var yAxis = new Float32Array([0.0, 1.0, 0.0]);
		
		//find the angle to rotate by (boneAxis dot yAxis)
		let dotProduct = boneAxis[0]*yAxis[0]+boneAxis[1]*yAxis[1]+boneAxis[2]*yAxis[2];
		var rotationAngle = Math.acos(dotProduct);
		
		//if the bone is not parallel to the y axis
		if(Math.abs(rotationAngle) > 0.000001 && Math.abs(rotationAngle) < 3.141592){
			//find the axis to rotate around
			var rotationAxis = new Float32Array(3);
			Vect3_Cross(rotationAxis, boneAxis, yAxis);
			Vect3_Unit(rotationAxis);
			
			//generate the rotation quaternion
			//to be delt with
			var orientationQuat = Quat_FromAxisAng(rotationAxis, rotationAngle);
			
			Matrix(arguments[0], MatrixType.quat_rotate, orientationQuat);
		}
		else{ // the bone is parallel to the y axis
			//generate a identity matrix (dont need to rotate since we
			//are already at the y-axis)
			//or a matrix scaling -1 along the y axis
			if(boneAxis[1] > 0.0)
				return; //identity matrix already set
			
			Matrix(arguments[0], MatrixType.xRot, Math.PI);
		}
	}
	else if( arguments[1] == MatrixType.xRot ){
		//var rot = arguments[2];
		Matrix_SetZero(arguments[0]);
		arguments[0][3*4+3] = 1;
		arguments[0][0*4+0] = 1;
		arguments[0][1*4+1] = Math.cos(arguments[2]);
		arguments[0][1*4+2] = -Math.sin(arguments[2]);
		arguments[0][2*4+1] = Math.sin(arguments[2]);
		arguments[0][2*4+2] = Math.cos(arguments[2]);
	}
	else if( arguments[1] == MatrixType.yRot){
		//var rot = arguments[2];
		Matrix_SetZero(arguments[0]);
		arguments[0][3*4+3] = 1;
		arguments[0][0*4+0] = Math.cos(arguments[2]);
		arguments[0][0*4+2] = Math.sin(arguments[2]);
		arguments[0][1*4+1] = 1;
		arguments[0][2*4+0] = -Math.sin(arguments[2]);
		arguments[0][2*4+2] = Math.cos(arguments[2]);
	}
	else if( arguments[1] == MatrixType.zRot){
		//var rot = arguments[2];
		Matrix_SetZero(arguments[0]);
		arguments[0][3*4+3] = 1;
		arguments[0][0*4+0] = Math.cos(arguments[2]);
		arguments[0][0*4+1] = -Math.sin(arguments[2]);
		arguments[0][1*4+0] = Math.sin(arguments[2]);
		arguments[0][1*4+1] = Math.cos(arguments[2]);
		arguments[0][2*4+2] = 1;
	}
	else if( arguments[1] == MatrixType.quat_rotate ){
		var quat = arguments[2];
		Matrix_SetIdentity(arguments[0]);
		if(quat[3] == 0.0)
		    return;
		//make a rotation matrix from a quaternion
		arguments[0][0*4+0] = 1 - 2*quat[1]*quat[1] - 2*quat[2]*quat[2];
		arguments[0][0*4+1] =     2*quat[0]*quat[1] - 2*quat[2]*quat[3];
		arguments[0][0*4+2] =     2*quat[0]*quat[2] + 2*quat[1]*quat[3];
		
		arguments[0][1*4+0] =     2*quat[0]*quat[1] + 2*quat[2]*quat[3];
		arguments[0][1*4+1] = 1 - 2*quat[0]*quat[0] - 2*quat[2]*quat[2];
		arguments[0][1*4+2] =     2*quat[1]*quat[2] - 2*quat[0]*quat[3];
		
		arguments[0][2*4+0] =     2*quat[0]*quat[2] - 2*quat[1]*quat[3];
		arguments[0][2*4+1] =     2*quat[1]*quat[2] + 2*quat[0]*quat[3];
		arguments[0][2*4+2] = 1 - 2*quat[0]*quat[0] - 2*quat[1]*quat[1];
	}
	else if(arguments[1] == MatrixType.scale){
		//var scale = arguments[2];
		Matrix_SetIdentity(arguments[0]);
		arguments[0][0*4+0] = arguments[2][0];
		arguments[0][1*4+1] = arguments[2][1];
		arguments[0][2*4+2] = arguments[2][2];
	}
	else if(arguments[1] == MatrixType.euler_rotate){
		//var rotVect = arguments[2];
		Matrix_SetIdentity(arguments[0]);
		//generate a rotation matrix with (xyz) ordering
		Matrix(arguments[0], MatrixType.xRot, arguments[2][0]);
		Matrix(tempMat1, MatrixType.zRot, arguments[2][2]);
		Matrix(tempMat2, MatrixType.yRot, arguments[2][1]);
		Matrix_Multiply(tempMat3, tempMat1, arguments[0]);
		Matrix_Multiply(arguments[0], tempMat2, tempMat3);
	}
	else if(arguments[1] == MatrixType.translate){
		Matrix_SetIdentity(arguments[0]);
		arguments[0][0*4+3] = arguments[2][0];
		arguments[0][1*4+3] = arguments[2][1];
		arguments[0][2*4+3] = arguments[2][2];
	}
	else if( arguments[1] == MatrixType.copy ){
		//var m2 = arguments[2];
		Matrix_Copy(arguments[0], arguments[2]);
	}
	else{
		Matrix_SetZero(arguments[0]);
	}
}


////
////Linear algebra row operation helper functions for Inverse function
////

function swapRows( m, r1, r2){
	//swap rows of a 4x4 matrix of floats
	var temp = 0.0;
	for(let i=0; i<4; ++i){
		temp = m[r1*4+i];
		m[r1*4+i] = m[r2*4+i];
		m[r2*4+i] = temp;
	}
}

function multiplyRow(matrix, row, scalar){
	//multiply all elements of a given row in a 4x4 matrix by a scalar
	for(let i=0; i<4; ++i)
		matrix[row*4+i] *= scalar;
}

function subtractRow( m, destRow, sourceRow){
	//for a 4x4 matrix,
	//subtract all the elements of the destination row from the elements of
	//the source row, and place the results in the destination row
	for(let i=0; i<4; ++i)
		m[destRow*4+i] = m[sourceRow*4+i] - m[destRow*4+i];
}

function subtractRow2( m, destRow, sourceRow){
	//same as subtractRow, but subtract the source row from the destination
	for(let i=0; i<4; ++i){
		m[destRow*4+i] = m[destRow*4+i] - m[sourceRow*4+i];
	}
}

function closeToZero(value){
	//used as a replacement to ==0.0 for float numbers for numerical stability
	if(value < 0.000001 && value > -0.000001)
		return true;
	return false;
}

function Matrix_Inverse(ret, m){
	//returns the inverse of this matrix
	//using gauss jordian row operations

	//the three gauss jordian operations allowed are
	//1 - swapping any two rows
	//2 - multiplying all the elements of a row by a number
	//3 - replace a row by itself added to another row

	//set the matrix to return to its starting state
	// (other half of augmented matrix)
	Matrix_SetIdentity(ret);

	//reduce column by column starting with left most column
	for(let col=0; col<(4-1); ++col)
	{
		//step 1, for numerical stability swap the row with the largest leading
		//value into the pivot row
		let largestSoFar = 0.0;
		let largestRow = -1;
		for(let i=col+0; i<4; ++i){
			if(Math.abs(m[i*4+col]) > Math.abs(largestSoFar)){
				largestSoFar = m[i*4+col];
				largestRow = i;
			}
		}
		if(largestRow == -1){
			//failed to find the largest row, return the identity matrix
			Matrix_SetIdentity(ret);
			return;
		}
		swapRows(m, col+0, largestRow);
		swapRows(ret, col+0, largestRow);

		//step 2, for all rows except the pivot row, cancel out the leading term
		for(let i=0; i<4; ++i){
			let leadingRowValue = m[i*4+col];
			if( i != col && (leadingRowValue > 0.000001 || leadingRowValue < -0.000001) ){//not closeToZero
				//step 2.1, make the pivot column value in each row the same
				//as the leading term of the pivot row
				multiplyRow(m, i, largestSoFar/leadingRowValue);
				multiplyRow(ret, i, largestSoFar/leadingRowValue);
				//step 2.2, replace the row by its subtraction from the pivot
				//row to cancel out its leading term
				subtractRow(m, i, col);
				subtractRow(ret, i, col);
			}
		}
	}

	//step 3, normalize the magnitude of the rows (make the leading values 1)
	//to make back substitution easier
	for(let i=0; i<4; ++i){
		let scalar = float1/m[i*4+i];
		multiplyRow(m, i, scalar);
		multiplyRow(ret, i, scalar);
	}

	//step 4, the matrix is now in row echelon form.
	//use back-substituion to cancel out values in the last column
	for(let row=0; row<4-1; ++row){
		let lastColumnValue = m[row*4+3];
		if(lastColumnValue < 0.000001 && lastColumnValue > -0.000001)//closeToZero
			continue;
		multiplyRow(m, 3, lastColumnValue);
		multiplyRow(ret, 3, lastColumnValue);
		//replace the row with the bottom row minus itself
		subtractRow2(m, row, 3);
		subtractRow2(ret, row, 3);
		//normalize the last row for next loop iteration
		let scalar = float1/m[3*4+3];
		multiplyRow(m, 3, scalar);
		multiplyRow(ret, 3, scalar);
	}
}
var wInv;
const floatA = new Float32Array([0, 1, 0.5]);
const float0 = floatA[0];
const float1 = floatA[1];
const floatP5 = floatA[2];
function Matrix_Multiply_Vect3( ret, m, v){
	//turn the vect3 into a 4d vector (set w=1) and perform the matrix
	//multiplication on it
	ret[0] = m[0*4+0]*v[0] + m[0*4+1]*v[1] + m[0*4+2]*v[2] + m[0*4+3];//*1.0
	ret[1] = m[1*4+0]*v[0] + m[1*4+1]*v[1] + m[1*4+2]*v[2] + m[1*4+3];//*1.0
	ret[2] = m[2*4+0]*v[0] + m[2*4+1]*v[1] + m[2*4+2]*v[2] + m[2*4+3];//*1.0

	wInv  = float1/(m[3*4+0]*v[0] + m[3*4+1]*v[1] + m[3*4+2]*v[2] + m[3*4+3]);//*1.0

	ret[0] = ret[0] * wInv;
	ret[1] = ret[1] * wInv;
	ret[2] = ret[2] * wInv;

	//the w component of ret will always be 1
	//the reason for turning the vect3 into a vect4 is to allow for the
	//matrix to preform translation as well as rotation and scaling
}

function Matrix_Multiply_Array3( arrayOut, m, arrayIn ){
	//multiply an array of vec3's by the matrix m
	let temp = new Float32Array(3);
	let result = new Float32Array(3);
	for(let i = 0; i < arrayIn.length; i+=3){
		temp[0] = arrayIn[i+0];
		temp[1] = arrayIn[i+1];
		temp[2] = arrayIn[i+2];
		Matrix_Multiply_Vect3( result, m, temp );
		arrayOut[i+0] = result[0];
		arrayOut[i+1] = result[1];
		arrayOut[i+2] = result[2];
	}
}

function Matrix_Multiply( ret, a, b ){
	//multiply the two 4x4 matricies together

	//this loop pattern was found by writing out the multiplication term by term
	for(let i=0; i<4; ++i){          //   row of matrix a, and ret matrix
		for(let j=0; j<4; ++j){      //column of matrix b, and ret matrix
			let accum = 0;
			for(let k=0; k<4; ++k){  //   row of matrix b, and column of matrix a
				accum += a[i*4+k]*b[k*4+j];
			}
			ret[i*4+j] = accum;
		}
	}
}

function Matrix_Transpose( ret, m ){
	//read each input column and write it out as a row
	for(let i=0; i<4; ++i)
		for(let j=0; j<4; ++j){
			ret[i*4+j] = m[j*4+i]; //swap i and j indicies
		}
}

//find the determinant of a square row major matrix with width and height dimension
//by expansion of minors
function Matrix_Determinant( m, dimension, row){
	//the form of 2d -> 1d flattened indexing is:
	//m[(dimension*row)+col]

	if(dimension < 2){
		DPrintf("Matrix_Determinant: dimension < 2\n");
		return 0; //don't know what to do with a smaller than 2x2 matrix
	}

	//if we have recursed down to the 2x2 case
	else if(dimension == 2){
		return (m[(dimension*0)+0]*m[(dimension*1)+1])
			 - (m[(dimension*1)+0]*m[(dimension*0)+1]);
	}

	//if recursion is still necessary, decompose into minor determinants
	//(cross out columns and compute the sub determinants that result)

	var sum = 0;

	for(var i=0; i<dimension; ++i) //stepping through columns to cross out
	{
		var sign = -1; //add 1 to pow from 1 to dimension
		if( i % 2 == 0)
			sign = 1;
		var element = m[i]; //pick a column headder
		if(element == 0)
			continue; //this column wont contribute to the sum so skip it

		//generate the sub matrix
		var subDimension = dimension-1;
		var subM = new Float32Array(subDimension*subDimension);
		var newMatrixIDX = 0;
		//copy the full matrix into the sub matrix except for the crossed out row
		for(var j=1; j<dimension; ++j)
			for(var k=0; k<dimension; ++k){
				if(k != i) //if it equaled it would be the crossed out column
					subM[newMatrixIDX++] = m[(dimension*j)+k];
			}
		//calculate the determinant of the sub matrix
		var subMDeterminant = Matrix_Determinant(subM, subDimension);

		//add this part of the determinant to the sum
		sum += sign * element * subMDeterminant;
	}
	return sum;
}


function Matrix_Print( m, name ){
	DPrintf("Matrix : " + name );
	DPrintf(m[0*4+0].toFixed(2) + " " + m[0*4+1].toFixed(2) + " " 
		  + m[0*4+2].toFixed(2) + " " + m[0*4+3].toFixed(2) );
	DPrintf(m[1*4+0].toFixed(2) + " " + m[1*4+1].toFixed(2) + " " 
		  + m[1*4+2].toFixed(2) + " " + m[1*4+3].toFixed(2));
	DPrintf(m[2*4+0].toFixed(2) + " " + m[2*4+1].toFixed(2) + " " 
		  + m[2*4+2].toFixed(2) + " " + m[2*4+3].toFixed(2));
	DPrintf(m[3*4+0].toFixed(2) + " " + m[3*4+1].toFixed(2) + " " 
		  + m[3*4+2].toFixed(2) + " " + m[3*4+3].toFixed(2));
}

