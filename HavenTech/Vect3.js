//Vect3.js

//compute in place functions to avoid allocting more memory to keep
//vector operations fast (that's the idea anyway)
//when transforming the scene geometry, these fuctions end up as the inner loop
//of the render function making any performance gains / losses heavily affect the
//performance, frame times and latency

//optimizing the data movement for these vector operations and the matrix operations is important
//to having interactive framerates

function Vect3_Cmp(v1, v2) { return (v1[0] == v2[0] && v1[1] == v2[1] && v2[2] == v2[2]); }

function Vect3_Zero(v1) { v1[0] = v1[1] = v1[2] = 0.0; }

function Vect3_Copy(v1, v2) { v1[0] = v2[0]; v1[1] = v2[1]; v1[2] = v2[2]; }

function Vect3_Add(v1, v2) { v1[0] += v2[0]; v1[1] += v2[1]; v1[2] += v2[2]; }

function Vect3_Subtract(v1, v2) { v1[0] -= v2[0]; v1[1] -= v2[1]; v1[2] -= v2[2]; }

function Vect3_Multiply(v1, v2) { v1[0] *= v2[0]; v1[1] *= v2[1]; v1[2] *= v2[2]; }

function Vect3_MultiplyScalar(v1, scalar) { v1[0] *= scalar; v1[1] *= scalar; v1[2] *= scalar; }

function Vect3_Divide(v1, v2) { v1[0] /= v2[0]; v1[1] /= v2[1]; v1[2] /= v2[2]; }

function Vect3_DivideScalar(v1, scalar) { v1[0] /= scalar; v1[1] /= scalar; v1[2] /= scalar; }

function Vect3_Cross(ret, v1, v2) {
    ret[0] = v1[1]*v2[2] - v2[1]*v1[2];
    ret[1] = v2[0]*v1[2] - v1[0]*v2[2];
    ret[2] = v1[0]*v2[1] - v2[0]*v1[1];
}

function Vect3_Dot( result, v1, v2) { result = v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2]; }

function Vect3_Distance(dist, v1, v2) {
    var diff = new Float32Array(3);
    Vect3_Copy(diff, v1);
    Vect3_Subtract(diff, v2); //diff is now the vector from v2 to v1

    Vect3_Length(dist, diff);
}

function Vect3_Negative(v1) { v1[0] = -v1[0]; v1[1] = -v1[1]; v1[2] = -v1[2]; }

function Vect3_Length(v1) {
    var len = Vect3_LengthSquared(v1);
    return Math.sqrt(len);
}

function Vect3_LengthSquared(v1){ 
    return v1[0]*v1[0]+v1[1]*v1[1]+v1[2]*v1[2]; 
}

function Vect3_Unit(v1){
    var len = Vect3_Length(v1);
    Vect3_DivideScalar(v1, len);
}

function Vect3_Orthogonal(v1){
    //returns the unit vector orthogonal in the zx plane
    //(no vertical component) [used in camera class]
    var temp = v1[0];
    v1[0] = -v1[2]; v1[1] = 0; v1[2] = -temp;
    Vect3_Unit(v1);
}

function Vect3_LERP(v, v1, v2, v2Weight){
    var v1Weight = 1.0-v2Weight;
    v[0] = v1[0]*v1Weight + v2[0]*v2Weight;
    v[1] = v1[1]*v1Weight + v2[1]*v2Weight;
    v[2] = v1[2]*v1Weight + v2[2]*v2Weight;
}

//for debug printing
function ToFixedPrecisionString( v, numDecimalPlaces ){
    var retString = 0;
    for( var i = 0; i < v.length; ++i ){
        retString += v[i].toFixed(numDecimalPlaces);
        if( i != v.length - 1 )
            retString += " ";
    }
    return retString;   
}
