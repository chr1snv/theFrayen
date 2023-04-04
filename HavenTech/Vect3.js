//Vect3.js

//compute in place functions to avoid allocting more memory to keep
//vector operations fast (that's the idea anyway)
//when transforming the scene geometry, these fuctions end up as the inner loop
//of the render function making any performance gains / losses heavily affect the
//performance, frame times and latency

//optimizing the data movement for these vector operations and the matrix operations is important
//to having interactive framerates

function Vect3_SetScalar( v, val ){ v[0] = val; v[1] = val; v[2] = val; }

function Vect3_Cmp(v1, v2) { return (v1[0] == v2[0] && v1[1] == v2[1] && v2[2] == v2[2]); }

function Vect3_Zero(v1) { v1[0] = v1[1] = v1[2] = 0.0; }

function Vect3_NewZero() { return new Float32Array([0,0,0]); };

//slow function, should use pre allocated memory and _Copy function instead
function Vect3_CopyNew( v ) { return new Float32Array([ v[0], v[1], v[2] ]);  }

function Vect3_Copy(v1, v2) { v1[0] = v2[0]; v1[1] = v2[1]; v1[2] = v2[2]; }

function Vect3_Add(v1, v2) { v1[0] += v2[0]; v1[1] += v2[1]; v1[2] += v2[2]; }

function Vect3_Subtract(v1, v2) { v1[0] -= v2[0]; v1[1] -= v2[1]; v1[2] -= v2[2]; }

function Vect3_Multiply(v1, v2) { v1[0] *= v2[0]; v1[1] *= v2[1]; v1[2] *= v2[2]; }

function Vect3_MultiplyScalar(v1, scalar) { 
                v1[0] *= scalar; v1[1] *= scalar; v1[2] *= scalar; }

function Vect3_Divide(v1, v2) { v1[0] /= v2[0]; v1[1] /= v2[1]; v1[2] /= v2[2]; }

function Vect3_DivideScalar(v1, scalar) { v1[0] /= scalar; v1[1] /= scalar; v1[2] /= scalar; }

//gives a vector orthogonal to the two passed in
//to know the direction of the result use the right hand index middle and thumb rule
//right hand rule where if making an x y z axis (fingers orthogonal to eachother) with
//index  finger as the x axis (v1)
//middle finger as the y axis (v2)
//thumb         as the z axis (ret - result)
//if v1 is the x axis and v2 is the y axis
//the cross product result will be in the z direction
function Vect3_Cross(ret, v1, v2) {
    ret[0] = v1[1]*v2[2] - v2[1]*v1[2];
    ret[1] = v2[0]*v1[2] - v1[0]*v2[2];
    ret[2] = v1[0]*v2[1] - v2[0]*v1[1];
}

//gets the scalar projection of one vector onto another |a||b|cos(theta)
//where | | means magnitude, so if the two vectors are unit length (normal)
//acos( dotProduct ) will give the angle between the two vectors
//if they are 180 deg (orthogonal) the dot product will be zero, and if
//oppsite direction, the result will be negative
//useful for determining if points are on a plane / on one side of the plane or another
//javascript is pass by refrence so it is possible to modify the contents of a
//passed in array, but not a scalar (because modifying the refrence is not allowed)
//https://stackoverflow.com/questions/13104494/does-javascript-pass-by-reference
function Vect3_Dot( v1, v2 ){ return v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2]; }

//returns the distance between the two vectors or points (assuming the vectors are distances from the same origin to two points)
function Vect3_Distance(v1, v2) {
    let diff = new Float32Array(3);
    Vect3_Copy(diff, v1);
    Vect3_Subtract(diff, v2); //diff is now the vector from v2 to v1

    return Vect3_Length(diff);
}

//return the inverse vector
function Vect3_Negative(v1){ v1[0] = -v1[0]; v1[1] = -v1[1]; v1[2] = -v1[2]; }

function Vect3_Length(v1) {
    let len = Vect3_LengthSquared(v1);
    return Math.sqrt(len);
}

//a less computationally expensive version of length (avoid preforming square root)
function Vect3_LengthSquared(v1){ 
    return v1[0]*v1[0]+v1[1]*v1[1]+v1[2]*v1[2];
}

//normalizes a vector
function Vect3_Normal(v1){
    //let len = Vect3_Length(v1);
    //Vect3_DivideScalar(v1, len);
    let len = Math.sqrt( v1[0]*v1[0]+v1[1]*v1[1]+v1[2]*v1[2] );
    v1[0] /= len; v1[1] /= len; v1[2] /= len;
}
//another name/alias for Vect3_Normal
function Vect3_Unit(v1){
    let len = Vect3_Length(v1);
    Vect3_DivideScalar(v1, len);
}

function Vect3_Orthogonal(v1){
    //returns the unit vector orthogonal in the zx plane
    //(no vertical component) [used in camera class]
    let temp = v1[0];
    v1[0] = -v1[2]; v1[1] = 0; v1[2] = -temp;
    Vect3_Unit(v1);
}

//linearly interpolates between the two vectors
function Vect3_LERP(v, v1, v2, v2Weight){
    let v1Weight = 1.0-v2Weight;
    v[0] = v1[0]*v1Weight + v2[0]*v2Weight;
    v[1] = v1[1]*v1Weight + v2[1]*v2Weight;
    v[2] = v1[2]*v1Weight + v2[2]*v2Weight;
}

//for debug printing
function ToFixedPrecisionString( v, numDecimalPlaces ){
    var retString = 0;
    for( let i = 0; i < v.length; ++i ){
        retString += v[i].toFixed(numDecimalPlaces);
        if( i != v.length - 1 )
            retString += " ";
    }
    return retString;   
}
