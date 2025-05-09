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

function Matrix_New(){
	return new Float32Array(4*4);
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
let IdentityMatrix = Matrix_New();
Matrix_SetIdentity( IdentityMatrix );
function Matrix_Copy( m, m2 ){
	for( let i = 0; i < 4*4; ++i )
		m[i] = m2[i];
}
function Matrix_CopyOnlyRotateScale(mo, mi){
	for( let i = 0; i < 4*4-1; ++i ){
		if( i % 4 == 3 )
			mo[i] = 0;
		else
			mo[i] = mi[i];
	}
	mo[4*4-1] = 1;//mi[4*4-1];
}

let tempMat1 = Matrix_New();
let tempMat2 = Matrix_New();
let tempMat3 = Matrix_New();
let tempQuat = Quat_New();
let boneAxis = Vect3_New();
let rotationAxis = Vect3_New();

//matrix setters (constructor without the data allocation)

	
function Matrix_SetEulerTransformation( retMat,  scale, rot, trans ){
	//scale, rotate, then translate
	Matrix_SetScale(       tempMat1, scale);
	Matrix_SetEulerRotate( tempMat2,   rot);
			Matrix_Multiply( retMat, tempMat2, tempMat1 );
	Matrix_SetTranslate( retMat, trans);
	//Matrix_SetIdentity(tempMat1);
	//Matrix_SetTranslate(   tempMat1, trans);
	//		Matrix_Multiply(  retMat,  tempMat1, tempMat3 );
}

function Matrix_SetQuatTransformation( retMat,  scale, qRot, trans ){
	//scale, rotate, then translate
	Matrix_SetScale(      tempMat1,  scale );
	Matrix_SetQuatRotate( tempMat2,   qRot );
		Matrix_Multiply( retMat, tempMat2, tempMat1 );
	Matrix_SetTranslate( retMat,  trans );
	//Matrix_SetTranslate(  tempMat1,  trans );
	//	Matrix_Multiply( retMat, tempMat1, tempMat3 );
}
function Matrix_SetBoneRotat( retMat, tail ){

	Matrix_SetIdentity(retMat);

	//generate the bone orientation matrix
	//the orientation matrix is the transformation from bone space
	//to armature space (ignoring bone roll)
	
	//to do this, find a quaternion rotation that will take us from
	// the y axis to the axis of the bone (boneAxisVector)
	
	Vect3_Copy(boneAxis, tail);
	Vect3_Normal(boneAxis);
	
	let defAxis = Vect3_NewVals(0.0, 1.0, 0.0);
	
	//find the angle to rotate by (boneAxis dot yAxis)
	let dotProduct = Vect3_Dot(boneAxis, defAxis);
	let rotationAngle = Math.acos(dotProduct);
	
	//if the bone is not parallel to the default axis
	if( Math.abs(rotationAngle) > epsilon && Math.abs(rotationAngle) < Math.PI ){
		//find the axis to rotate around (orthogonal to the tail-head and default axis)
		
		Vect3_Cross(rotationAxis,  defAxis, boneAxis );
		Vect3_Normal(rotationAxis);
		
		//generate the rotation quaternion
		//to be delt with
		Quat_FromAxisAng(tempQuat, rotationAxis, rotationAngle);
		//Quat_Norm(tempQuat);
		Matrix_SetQuatRotate(retMat, tempQuat);
	}
	else{ // the bone is parallel to the y axis
		//generate a identity matrix (dont need to rotate since we
		//are already at the y-axis)
		//or a matrix scaling -1 along the y axis
		if(boneAxis[1] > 0.0)
			return; //identity matrix already set
		//otherwise pointing along negative y (180 deg rotation)
		Matrix_SetXRot(retMat, Math.PI);
	}
}

//though cos and sin have periocity
//the Set*Rot( ) functions return the same matricies as
//when doing incremental matrix rotations
function Matrix_SetXRot( retMat, xRot ){
	//var rot = arguments[2];
	Matrix_SetZero(retMat);
	retMat[3*4+3] = 1;
	retMat[0*4+0] = 1;
	retMat[1*4+1] =  Math.cos(xRot);
	retMat[1*4+2] = -Math.sin(xRot);
	retMat[2*4+1] =  Math.sin(xRot);
	retMat[2*4+2] =  Math.cos(xRot);
}
function Matrix_SetYRot( retMat, yRot){
	Matrix_SetZero(retMat);
	retMat[3*4+3] = 1;
	retMat[0*4+0] =  Math.cos(yRot);
	retMat[0*4+2] =  Math.sin(yRot);
	retMat[1*4+1] = 1;
	retMat[2*4+0] = -Math.sin(yRot);
	retMat[2*4+2] =  Math.cos(yRot);
}
function Matrix_SetZRot( retMat, zRot ){
	Matrix_SetZero(retMat);
	retMat[3*4+3] = 1;
	retMat[0*4+0] =  Math.cos(zRot);
	retMat[0*4+1] = -Math.sin(zRot);
	retMat[1*4+0] =  Math.sin(zRot);
	retMat[1*4+1] =  Math.cos(zRot);
	retMat[2*4+2] = 1;
}
function Matrix_SetQuatRotate( retMat, quat ){
	Matrix_SetIdentity(retMat);
	//if(quat[3] == 0.0)
	//    return;
	//basis matrix computation
	//https://en.wikipedia.org/wiki/Rotation_formalisms_in_three_dimensions
	//https://automaticaddison.com/how-to-convert-a-quaternion-to-a-rotation-matrix/
	//make a rotation matrix from a quaternion
	retMat[0*4+0] = 1 - 2*quat[1]*quat[1] - 2*quat[2]*quat[2];
	retMat[0*4+1] =     2*quat[0]*quat[1] - 2*quat[2]*quat[3];
	retMat[0*4+2] =     2*quat[0]*quat[2] + 2*quat[1]*quat[3];
	
	retMat[1*4+0] =     2*quat[0]*quat[1] + 2*quat[2]*quat[3];
	retMat[1*4+1] = 1 - 2*quat[0]*quat[0] - 2*quat[2]*quat[2];
	retMat[1*4+2] =     2*quat[1]*quat[2] - 2*quat[0]*quat[3];
	
	retMat[2*4+0] =     2*quat[0]*quat[2] - 2*quat[1]*quat[3];
	retMat[2*4+1] =     2*quat[1]*quat[2] + 2*quat[0]*quat[3];
	retMat[2*4+2] = 1 - 2*quat[0]*quat[0] - 2*quat[1]*quat[1];
}
function Matrix_SetScale( retMat, scale ){
	Matrix_SetIdentity(retMat);
	retMat[0*4+0] = scale[0];
	retMat[1*4+1] = scale[1];
	retMat[2*4+2] = scale[2];
}
let tempRMat1 = Matrix_New();
let tempRMat2 = Matrix_New();
let tempRMat3 = Matrix_New();
function Matrix_SetEulerRotate(retMat, rotVect){
	//Matrix_SetIdentity(arguments[0]);
	//generate a rotation matrix with (xyz) ordering
	Matrix_SetXRot(tempRMat1, rotVect[0]);
	Matrix_SetYRot(tempRMat2, rotVect[1]);
			Matrix_Multiply(tempRMat3, tempRMat2, tempRMat1);
	Matrix_SetZRot(tempRMat1, rotVect[2]);
			Matrix_Multiply(  retMat, tempRMat1, tempRMat3);
}
function Matrix_SetTranslate(retMat, trans){
	//Matrix_SetIdentity(retMat);
	retMat[0*4+3] = trans[0];
	retMat[1*4+3] = trans[1];
	retMat[2*4+3] = trans[2];
}

let mLA_diff = Vect3_New();
var mLA_rot = Vect3_New();
function Matrix_LookAt( retMat, dst, src ){
	//generates a rotation for z up text towards location dst
	//tilting down first along the x axis, and then rotating around z
	Vect3_Copy( mLA_diff, dst );
	Vect3_Subtract( mLA_diff, src );

	Vect3_Normal( mLA_diff );

	//get inclination from diff vec
	mLA_rot[0] = Math.PI/2 - Math.asin( mLA_diff[2] );
	//get rotation around z
	//- rotation is clockwise facing into axis
	mLA_rot[2] = (Math.PI/2)+Math.atan2( mLA_diff[1], mLA_diff[0] ); //sceneTime; //

	//Matrix_SetEulerRotate(retMat, mLA_rot);
	Matrix_SetXRot(tempRMat1, Math.PI/2);//rotVect[0]);
	Matrix_SetZRot(tempRMat2, mLA_rot[2]);
			Matrix_Multiply(  retMat, tempRMat2, tempRMat1 );
}


////
////Linear algebra row operation helper functions for Inverse function
////

function swapRows( m, r1, r2){
	//swap rows of a 4x4 matrix of floats
	let temp = 0.0;
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
let wInv = 0;
let retW = 0;
const floatA = new Float32Array([0, 1, 0.5]);
const float0 = floatA[0];
const float1 = floatA[1];
const floatP5 = floatA[2];
const epsilon = 0.0000001;
function NearEpsilon( a ){ return a < epsilon && a > -epsilon; }
function Matrix_Multiply_Vect3( ret, m, v, w=1){
	//turn the vect3 into a 4d vector "homogoneous cordinates" using w value
	//when multiplying
	//vectors (i.e. normal)         set w=0 (multiply without translation)
	//points (i.e. vertex position) set w=1 (apply translation column)
	//and perform the matrix multiplication on it 
	//(can also be used for perspective transformation with a non zero w value)
	ret[0] = m[0*4+0]*v[0] + m[0*4+1]*v[1] + m[0*4+2]*v[2] + m[0*4+3]*w;
	ret[1] = m[1*4+0]*v[0] + m[1*4+1]*v[1] + m[1*4+2]*v[2] + m[1*4+3]*w;
	ret[2] = m[2*4+0]*v[0] + m[2*4+1]*v[1] + m[2*4+2]*v[2] + m[2*4+3]*w;
	
	retW   = m[3*4+0]*v[0] + m[3*4+1]*v[1] + m[3*4+2]*v[2] + m[3*4+3]*w;
	if( retW != 0 )
		wInv = float1/retW;
	else
		wInv = 1;

	ret[0] = ret[0] * wInv;
	ret[1] = ret[1] * wInv;
	ret[2] = ret[2] * wInv;

	//the w component of ret will always be 1
	//the reason for turning the vect3 into a vect4 is to allow for the
	//matrix to preform translation as well as rotation and scaling
}

//for 4x4 matrix * vec4 used in frustum aabb intersection to get coordinate in
//clip space (before w divide)
function Matrix_Multiply_Vect( ret, m, v ){
	let dim = v.length;
	for( let i = 0; i < dim; ++i ){
		ret[i] = 0;
		for( let j = 0; j < dim; ++j ){
			ret[i] += m[i*dim+j] * v[j];
		}
	}
}

function WDivide( ret, v ){
	ret[0] = v[0] / v[3];
	ret[1] = v[1] / v[3];
	ret[2] = v[2] / v[3];
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
			for(let k=0; k<4; ++k)  //   row of matrix b, and column of matrix a
				accum += a[i*4+k]*b[k*4+j];
			ret[i*4+j] = accum; //the row/column result element is row i of a dot col j of b
		}
	}
}

function Matrix_MultToArrTransp( ret, outOff, a, b ){
	//multiply the two 4x4 matricies together

	//this loop pattern was found by writing out the multiplication term by term
	for(let i=0; i<4; ++i){          //   row of matrix a, and ret matrix
		for(let j=0; j<4; ++j){      //column of matrix b, and ret matrix
			let accum = 0;
			for(let k=0; k<4; ++k)  //   row of matrix b, and column of matrix a
				accum += a[i*4+k]*b[k*4+j];
			ret[ outOff + (j*4) + i ] = accum; //the row/column result element is row i of a dot col j of b
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

	let sum = 0;

	for(let i=0; i<dimension; ++i) //stepping through columns to cross out
	{
		let sign = -1; //add 1 to pow from 1 to dimension
		if( i % 2 == 0)
			sign = 1;
		let element = m[i]; //pick a column headder
		if(element == 0)
			continue; //this column wont contribute to the sum so skip it

		//generate the sub matrix
		let subDimension = dimension-1;
		let subM = new Float32Array(subDimension*subDimension);
		let newMatrixIDX = 0;
		//copy the full matrix into the sub matrix except for the crossed out row
		for(let j=1; j<dimension; ++j)
			for(let k=0; k<dimension; ++k){
				if(k != i) //if it equaled it would be the crossed out column
					subM[newMatrixIDX++] = m[(dimension*j)+k];
			}
		//calculate the determinant of the sub matrix
		let subMDeterminant = Matrix_Determinant(subM, subDimension);

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

