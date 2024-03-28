//Matrix.js - implementation of matrix


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
    m[0*4+0] = 0; m[1*4+0] = 0; m[2*4+0] = 0; m[3*4+0] = 0;
    m[0*4+1] = 0; m[1*4+1] = 0; m[2*4+1] = 0; m[3*4+1] = 0;
    m[0*4+2] = 0; m[1*4+2] = 0; m[2*4+2] = 0; m[3*4+2] = 0;
    m[0*4+3] = 0; m[1*4+3] = 0; m[2*4+3] = 0; m[3*4+3] = 0;
}
function Matrix_SetIdentity( m )
{
    m[0*4+0] = 1; m[1*4+0] = 0; m[2*4+0] = 0; m[3*4+0] = 0;
    m[0*4+1] = 0; m[1*4+1] = 1; m[2*4+1] = 0; m[3*4+1] = 0;
    m[0*4+2] = 0; m[1*4+2] = 0; m[2*4+2] = 1; m[3*4+2] = 0;
    m[0*4+3] = 0; m[1*4+3] = 0; m[2*4+3] = 0; m[3*4+3] = 1;
}
function Matrix_Copy( m, m2 ){
    for( var i = 0; i < 4*4; ++i )
        m[i] = m2[i];
}

//high level euler rotation angle Transformation matrix constructor
function Matrix( m, type, scale, rot, translation )
{
    var type = arguments[1];
    if(type == MatrixType.identity)
    {
        Matrix_SetIdentity(m);
    }
    else if(type == MatrixType.euler_transformation )
    {
        var scale       = arguments[2];
        var rot         = arguments[3];
        var translation = arguments[4];
        var tempMat1 = new Float32Array(4*4);
        var tempMat2 = new Float32Array(4*4);
        var tempMat3 = new Float32Array(4*4);
        //scale, rotate, then translate
        Matrix(m,        MatrixType.scale, scale);
        Matrix(tempMat1, MatrixType.euler_rotate, rot);
        Matrix(tempMat2, MatrixType.translate, translation);
        Matrix_Multiply(tempMat3, tempMat1, m);
        Matrix_Multiply(m,        tempMat2, tempMat3);
    }
    else if( type == MatrixType.quat_transformation)
    {
        var scale       = arguments[2];
        var rot         = arguments[3];
        var translation = arguments[4];
        var tempMat1 = new Float32Array(4*4);
        var tempMat2 = new Float32Array(4*4);
        var tempMat3 = new Float32Array(4*4);
        //scale, rotate, then translate
        Matrix(m,        MatrixType.scale, scale);
        Matrix(tempMat1, MatrixType.quat_rotate, rot);
        Matrix(tempMat2, MatrixType.translate, translation);
        Matrix_Multiply(tempMat3, tempMat1, m);
        Matrix_Multiply(m,        tempMat2, tempMat3);
    }
    else if( type == MatrixType.orientation)
    {
        var tail = arguments[2];
        var head = arguments[3];
        Matrix_SetIdentity(m);

        //generate the bone orientation matrix
        //the orientation matrix is the transformation from bone space
        //to armature space (ignoring bone roll)
        
        //to do this, find a quaternion rotation that will take us from
        // the y axis to the axis of the bone (boneAxisVector)
        
        var boneAxis = new Float32Array(3);
        Vect3_Copy(boneAxis, tail);
        
        Vect3_Subtract(boneAxis, head);
        Vect3_Unit(boneAxis);
        
        var yAxis = new Float32Array([0.0, 1.0, 0.0]);
        
        //find the angle to rotate by
        var dotProduct;
        Vect3_Dot(dotProduct, boneAxis, yAxis);
        var rotationAngle = Math.acos(dotProduct);
        
        //if the bone is not parallel to the y axis
        if(Math.abs(rotationAngle) > 0.000001 && Math.abs(rotationAngle) < 3.141592)
        {
            //find the axis to rotate around
            var rotationAxis = new Float32Array(3);
            Vect3_Cross(rotationAxis, boneAxis, yAxis);
            Vect3_Unit(rotationAxis);
            
            //generate the rotation quaternion
            //to be delt with
            var orientationQuat = new Float32Array(3);
            Quat(rotationAxis, rotationAngle, orientationQuat);
            
            Matrix(m, MatrixType.quat_rotate, orientationQuat);
        }
        else // the bone is parallel to the y axis
        {
            //generate a identity matrix (dont need to rotate since we
            //are already at the y-axis)
            //or a matrix scaling -1 along the y axis
            if(boneAxis[1] > 0.0)
                return; //identity matrix already set
            
            Matrix(m, MatrixType.xRot, Math.PI);
        }
    }
    else if( type == MatrixType.xRot )
    {
        var rot = arguments[2];
        Matrix_SetZero(m);
        m[3*4+3] = 1;
        m[0*4+0] = 1;
        m[1*4+1] = Math.cos(rot);
        m[2*4+1] = -Math.sin(rot);
        m[1*4+2] = Math.sin(rot);
        m[2*4+2] = Math.cos(rot);
    }
    else if( type == MatrixType.yRot)
    {
        var rot = arguments[2];
        Matrix_SetZero(m);
        m[3*4+3] = 1;
        m[0*4+0] = Math.cos(rot);
        m[2*4+0] = Math.sin(rot);
        m[1*4+1] = 1;
        m[0*4+2] = -Math.sin(rot);
        m[2*4+2] = Math.cos(rot);
    }
    else if( type == MatrixType.zRot)
    {
        var rot = arguments[2];
        Matrix_SetZero(m);
        m[3*4+3] = 1;
        m[0*4+0] = Math.cos(rot);
        m[1*4+0] = -Math.sin(rot);
        m[0*4+1] = Math.sin(rot);
        m[1*4+1] = Math.cos(rot);
        m[2*4+2] = 1;
    }
    else if( type == MatrixType.quat_rotate )
    {
        var quat = arguments[2];
        Matrix_SetIdentity(m);
        if(quat[3] == 0.0)
            return;
        //make a rotation matrix from a quaternion
        m[0*4+0] = 1 - 2*quat[1]*quat[1] - 2*quat[2]*quat[2];
        m[1*4+0] =     2*quat[0]*quat[1] - 2*quat[2]*quat[3];
        m[2*4+0] =     2*quat[0]*quat[2] + 2*quat[1]*quat[3];
        
        m[0*4+1] =     2*quat[0]*quat[1] + 2*quat[2]*quat[3];
        m[1*4+1] = 1 - 2*quat[0]*quat[0] - 2*quat[2]*quat[2];
        m[2*4+1] =     2*quat[1]*quat[2] - 2*quat[0]*quat[3];
        
        m[0*4+2] =     2*quat[0]*quat[2] - 2*quat[1]*quat[3];
        m[1*4+2] =     2*quat[1]*quat[2] + 2*quat[0]*quat[3];
        m[2*4+2] = 1 - 2*quat[0]*quat[0] - 2*quat[1]*quat[1];
    }
    else if(type == MatrixType.scale)
    {
        var scale = arguments[2];
        Matrix_SetIdentity(m);
        m[0*4+0] = scale[0];
        m[1*4+1] = scale[1];
        m[2*4+2] = scale[2];
    }
    else if(type == MatrixType.euler_rotate)
    {
        var rotVect = arguments[2];
        //generate a rotation matrix with (xyz) ordering
        var tempMat1 = new Float32Array(4*4);
        var tempMat2 = new Float32Array(4*4);
        var tempMat3 = new Float32Array(4*4);
        Matrix(m, MatrixType.xRot, rotVect[0]);
        Matrix(tempMat1, MatrixType.zRot, rotVect[2]);
        Matrix(tempMat2, MatrixType.yRot, rotVect[1]);
        Matrix_Multiply(tempMat3, tempMat1, m);
        Matrix_Multiply(m, tempMat2, tempMat3);
    }
    else if(type == MatrixType.translate)
    {
        var translation = arguments[2];
        Matrix_SetIdentity(m);
        m[3*4+0] = translation[0];
        m[3*4+1] = translation[1];
        m[3*4+2] = translation[2];
    }
    else if( type == MatrixType.copy ){
        var m2 = arguments[2];
        Matrix_Copy(m, m2);
    }
    else
    {
        Matrix_SetZero(m);
    }
}


////
////Linear algebra row operation helper functions for Inverse function
////

function swapRows( m, r1, r2)
{
    //swap rows of a 4x4 matrix of floats
    var temp = 0.0;
    for(var i=0; i<4; ++i)
    {
        temp = m[i*4+r1];
        m[i*4+r1] = m[i*4+r2];
        m[i*4+r2] = temp;
    }
}

function multiplyRow(matrix, row, scalar)
{
    //multiply all elements of a given row in a 4x4 matrix by a scalar
    for(var i=0; i<4; ++i)
        matrix[i*4+row] *= scalar;
}

function subtractRow( m, destRow, sourceRow)
{
    //for a 4x4 matrix,
    //subtract all the elements of the destination row from the elements of
    //the source row, and place the results in the destination row
    for(var i=0; i<4; ++i)
        m[i*4+destRow] = m[i*4+sourceRow] - m[i*4+destRow];
}

function subtractRow2( m, destRow, sourceRow)
{
    //same as subtractRow, but subtract the source row from the destination
    for(var i=0; i<4; ++i)
    {
        m[i*4+destRow] = m[i*4+destRow] - m[i*4+sourceRow];
    }
}

function closeToZero(value)
{
    //used as a replacement to ==0.0 for float numbers for numerical stability
    if(Math.abs(value) < 0.000001)
        return true;
    return false;
}

function Matrix_Inverse(ret, m)
{
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
    for(var col=0; col<(4-1); ++col)
    {
        //step 1, for numerical stability swap the row with the largest leading
        //value into the pivot row
        var largestSoFar = 0.0;
        var largestRow = -1;
        for(var i=col+0; i<4; ++i)
        {
            if(Math.abs(m[col*4+i]) > Math.abs(largestSoFar))
            {
                largestSoFar = m[col*4+i];
                largestRow = i;
            }
        }
        if(largestRow == -1)
        {
            //failed to find the largest row, return the identity matrix
            Matrix_SetIdentity(ret);
            return;
        }
        swapRows(m, col+0, largestRow);
        swapRows(ret, col+0, largestRow);

        //step 2, for all rows except the pivot row, cancel out the leading term
        for(var i=0; i<4; ++i)
        {
            var leadingRowValue = m[col*4+i];
            if( i != col && !closeToZero(leadingRowValue) )
            {
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
    for(var i=0; i<4; ++i)
    {
        var scalar = 1.0/m[i*4+i];
        multiplyRow(m, i, scalar);
        multiplyRow(ret, i, scalar);
    }

    //step 4, the matrix is now in row echelon form.
    //use back-substituion to cancel out values in the last column
    for(var row=0; row<4-1; ++row)
    {
        var lastColumnValue = m[3*4+row];
        if(closeToZero(lastColumnValue))
            continue;
        multiplyRow(m, 3, lastColumnValue);
        multiplyRow(ret, 3, lastColumnValue);
    
        //replace the row with the bottom row minus itself
        subtractRow2(m, row, 3);
        subtractRow2(ret, row, 3);
        
        //normalize the last row for next loop iteration
        var scalar = 1.0/m[3*4+3];
        multiplyRow(m, 3, scalar);
        multiplyRow(ret, 3, scalar);
    }

    return;
}

function Matrix_Multiply_Vect3( ret, m, vect)
{
    //turn the vect3 into a 4d vector (set w=1) and preform the matrix
    //multiplication on it
    var vX = vect[0];
    var vY = vect[1];
    var vZ = vect[2];
    
    ret[0] = m[0*4+0]*vX + m[1*4+0]*vY +
             m[2*4+0]*vZ + m[3*4+0];//*1.0
    
    ret[1] = m[0*4+1]*vX + m[1*4+1]*vY +
             m[2*4+1]*vZ + m[3*4+1];//*1.0
    
    ret[2] = m[0*4+2]*vX + m[1*4+2]*vY +
             m[2*4+2]*vZ + m[3*4+2];//*1.0
    
    var w  = m[0*4+3]*vX + m[1*4+3]*vY +
             m[2*4+3]*vZ + m[3*4+3];//*1.0

    //check if w is not 1, (this implies rotation, which requires normalizing
    //the vector so that w is one again to map from the imaginary coordinates
    //back to the reals)
    if(Math.abs(w - 1.0) > 0.000001)
    {
        var wInv = 1.0/w;
        ret[0] = ret[0] * wInv;
        ret[1] = ret[1] * wInv;
        ret[2] = ret[2] * wInv;
    }

    //the w component of ret will always be 1
    //the reason for turning the vect3 into a vect4 is to allow for the
    //matrix to preform translation as well as rotation and scaling
}

function Matrix_Multiply_Array3( arrayOut, m, arrayIn )
{
    for(var i = 0; i < arrayIn.length; i+=3){
        var result = new Float32Array(3);
        Matrix_Multiply_Vect3( result,
                              m,
                                [arrayIn[i+0],
                                 arrayIn[i+1],
                                 arrayIn[i+2]] );
        arrayOut[i+0] = result[0];
        arrayOut[i+1] = result[1];
        arrayOut[i+2] = result[2];
    }
}

function Matrix_Multiply( ret, a, b )
{
    //multiply the two 4x4 matricies together

    //this loop pattern was found by writing out the multiplication term by term
    for(var i=0; i<4; ++i)
    {
        for(var j=0; j<4; ++j)
        {
            var accum = 0;
            for(var k=0; k<4; ++k)
                accum += a[k*4+i]*b[j*4+k];

            ret[j*4+i] = accum;
        }
    }
}

function Matrix_Transpose( ret, m )
{
    //read each input row and write it out as a column
    for(var i=0; i<4; ++i)
        for(var j=0; j<4; ++j)
        {
            ret[j*4+i] = m[i*4+j];
        }
}

//find the determinant of a square row major matrix with width and height dimension
//by expansion of minors
function Matrix_Determinant( m, dimension, row)
{
    //the form of 2d -> 1d flattened indexing is:
    //m[(dimension*row)+col]

    if(dimension < 2)
    {
        DPrintf("Matrix_Determinant: dimension < 2\n");
        return 0; //don't know what to do with a smaller than 2x2 matrix
    }

    //if we have recursed down to the 2x2 case
    else if(dimension == 2)
    {
        return (m[dimension*0+0]*m[dimension*1+1])
             - (m[dimension*0+1]*m[dimension*1+0]);
    }

    //if recursion is still necessary, decompose into minor determinants
    //(cross out columns and compute the sub determinants that result)

    var sum = 0;
    
    for(var i=0; i<dimension; ++i) //stepping through columns to cross out
    {
        var sign = -1; //add 1 to pow from 1 to dimension
        if( i % 2 == 0)
            sign = 1;
        var element = m[i*dimension]; //pick a column headder
        if(element == 0)
            continue; //this column wont contribute to the sum so skip it

        //generate the sub matrix
        var subDimension = dimension-1;
        var subM = new Float32Array(subDimension*subDimension);
        var newMatrixIDX = 0;
        //copy the full matrix into the sub matrix except for the crossed out row
        for(var j=1; j<dimension; ++j)
            for(var k=0; k<dimension; ++k)
            {
                if(k != i) //if it equaled it would be the crossed out column
                    subM[newMatrixIDX++] = m[(dimension*k)+j];
            }
        //calculate the determinant of the sub matrix
        var subMDeterminant = Matrix_Determinant(subM, subDimension);

        //add this part of the determinant to the sum
        sum += sign * element * subMDeterminant;
    }
    return sum;
}


function Matrix_Print( m )
{
    DPrintf("Matrix Print:\n");
    DPrintf(m[0*4+0].toFixed(2) + " " + m[0*4+1].toFixed(2) + " " + m[0*4+2].toFixed(2) + " " + m[0*4+3].toFixed(2));
    DPrintf(m[1*4+0].toFixed(2) + " " + m[1*4+1].toFixed(2) + " " + m[1*4+2].toFixed(2) + " " + m[1*4+3].toFixed(2));
    DPrintf(m[2*4+0].toFixed(2) + " " + m[2*4+1].toFixed(2) + " " + m[2*4+2].toFixed(2) + " " + m[2*4+3].toFixed(2));
    DPrintf(m[3*4+0].toFixed(2) + " " + m[3*4+1].toFixed(2) + " " + m[3*4+2].toFixed(2) + " " + m[3*4+3].toFixed(2));
}

