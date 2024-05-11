//Vect3.js
//I didn't invent math, though I coded this implementation
//for use or code/art requests please contact chris@itemfactorystudio.com

//it is not a design mistake that these are compute in place and pass by refrence functions 
//it is to avoid allocting memory to keep vector operations fast
//when transforming the scene geometry, these fuctions are the inner loop
//of the render function / engine meaning that tuning these functions for
//performance gains / losses heavily affects performance, frame times and latency

//optimizing data movement (code is light / small , data is heavy / numerous)
//by allocating input and return values at program start
//for vector / matrix operations and any frequently performed operation is important
//for interactive framerates and energy efficency because 
//being the inner most functions in loops they are called / used many thousands of times for each generated frame

//in any system where completing the task as succinctly/efficently (with minimal space/size/mass/time) as possible
//is desired - having fixed non intermixing pathways for inputs and outputs is the most efficent,
//because anytime something relies on something else it causes a non laminar / linear flow restriction
//memory allocation vs having fixed size buffers and piplines is an example of this
//because where and if memory can be allocated depends on what other memory is allocated, theirby causing
//a dependancy / intermixing between all users of the memory allocation to their pointers / program counters / data flow
//having fixed independant functional units to perform the operation removes the interdependancy

//this means putting allocations outside function calls into objects
//and into global/static program space
//and also using fixed size arrays/structures where possible

//slow functions, should only use these outside of program loops and pre allocate memory where possible
function Vect3_NewVals( s1, s2, s3 ){ let v = new Float32Array(3); v[0] = s1; v[1] = s2; v[2] = s3; return v; }
function Vect3_New() { return new Float32Array(3);}
//NewZero the same as New though if ported to another language / implementation need to make sure the values are initalized to zero
function Vect3_NewZero() { return new Float32Array(3);}//[0,0,0]); };
function Vect3_NewScalar(s){ let v = new Float32Array(3); v[0] = s; v[1] = s; v[2] = s; return v;}
function Vect3_NewAllOnes(){ return new Float32Array([1,1,1]); }
function Vect3_CopyNew( v ) { return new Float32Array([ v[0], v[1], v[2] ]);  } //use _Copy function below when possible

function Vect3_SetScalar( v, val ){ v[0] = val; v[1] = val; v[2] = val; }

function Vect3_Cmp(v1, v2) { return (v1[0] == v2[0] && v1[1] == v2[1] && v2[2] == v2[2]); }

function Vect3_Zero(v1) { v1[0] = v1[1] = v1[2] = 0.0; }

function Vect3_Copy(v1, v2) { v1[0] = v2[0]; v1[1] = v2[1]; v1[2] = v2[2]; }
function Vect3_CopyFromArr(v, arr, i){ v[0] = arr[i]; v[1] = arr[i+1]; v[2] = arr[i+2]; }

function Vect3_Add(v1, v2) { v1[0] += v2[0]; v1[1] += v2[1]; v1[2] += v2[2]; }

function Vect3_Subtract(v1, v2) { v1[0] -= v2[0]; v1[1] -= v2[1]; v1[2] -= v2[2]; }
function Vect3_SubFromArr(v, arr, i){ v[0] -= arr[i]; v[1] -= arr[i+1]; v[2] -= arr[i+2]; }
function Vect3_DiffFromArr(v, v1, arr, i){ 
	v[0] = v1[0] - arr[i];
	v[1] = v1[1] - arr[i+1];
	v[2] = v1[2] - arr[i+2]; 
}

function Vect3_Multiply(v1, v2) { v1[0] *= v2[0]; v1[1] *= v2[1]; v1[2] *= v2[2]; }

function Vect3_MultiplyScalar(v1, scalar) { v1[0] *= scalar; v1[1] *= scalar; v1[2] *= scalar; }
function Vect_MultScal( v1, s ){ let l = v1.length; for( let i = 0; i < l; ++i ){ v1[i] *= s; } }

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
//     |  i     j     k |
//a*b =| a[0] a[1] a[2] |
//     | b[0] b[1] b[2] |
//on the diagonals 
//a x b = (a1b2i + a2b0j + a0b1k) - (b1a2i + b2a0j + b0a1k)
//      = (a1b2 - b1a2)i + (a2b0 - b2a0)j + (a0b1 - b0a1)k
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
//can return by refrence with array objects (this is likely a slow function)

function Vect_Dot( v1, v2 ){
	let nElms = v1.length;
	let accum = 0;
	for( let i = 0; i < nElms; ++i ){
		accum += v1[i]*v2[i];
	}
	return accum;
}

function Vect_DotProdCoordRemap( r, v, basisAxies ){
	let numAxies = basisAxies.length;
	let d = 0;
	for( let i = 0; i < numAxies; ++i ){
		d = 0;
		for( let j = 0; j < numAxies; ++j ){
			d += basisAxies[i][j]*v[j]; 
		}
		r[i] = d;
	}
}


//"projects" v onto targ (scales targ by the dot product of targ and v )
function Vect3_Project( targ, v ){
	let mag = Vect3_Dot( targ, v );
	Vect3_MultiplyScalar( targ, mag );
}

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
	const len = Vect3_LengthSquared(v1);
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
	const len = Math.sqrt( v1[0]*v1[0]+v1[1]*v1[1]+v1[2]*v1[2] );
	if( len == 0 ){
		Vect3_Zero(v1);
	}else{
		v1[0] /= len; v1[1] /= len; v1[2] /= len;
	}
}
//another name/alias for Vect3_Normal
function Vect3_Unit(v1){
	const len = Vect3_Length(v1);
	Vect3_DivideScalar(v1, len);
}

function Vect3_Orthogonal(v1){
	//returns the unit vector orthogonal in the zx plane
	//(no vertical component) [used in camera class]
	const temp = v1[0];
	v1[0] = -v1[2]; v1[1] = 0; v1[2] = -temp;
	Vect3_Unit(v1);
}

//linearly interpolates between the two vectors
function Vect3_LERP(v, v1, v2, v2Weight){
	const v1Weight = 1.0-v2Weight;
	v[0] = v1[0]*v1Weight + v2[0]*v2Weight;
	v[1] = v1[1]*v1Weight + v2[1]*v2Weight;
	v[2] = v1[2]*v1Weight + v2[2]*v2Weight;
}
//vector in place and vector passed by refrence
function Vect_LERP( v1, v2, v2W){
	const v1W = 1.0-v2W;
	for( let i = 0; i < v1.length; ++i){
		v1[i] = v1[i] * v1W + v2[i]*v2W;
	}
}
//interpolates between two vertx array idxs
function VectArr_LERP( v, vArr, v1, v2, v2W ){
	const v1W = 1.0-v2W;
	for( let i = 0; i < v.length; ++i){
		v[i] = vArr[v1+i] * v1W + vArr[v2+i]*v2W;
	}
}
//between a vector in place and an array index
function VectArr_PctAdd( v, vArr, v1, v2W ){
	for( let i = 0; i < v.length; ++i){
		v[i] += vArr[v1+i]*v2W;
	}
}

function Vect3_minMax( m, M, v ){
	m[0] = m[0] < v[0] ? m[0] : v[0];
	m[1] = m[1] < v[1] ? m[1] : v[1];
	m[2] = m[2] < v[2] ? m[2] : v[2];
	
	M[0] = M[0] > v[0] ? M[0] : v[0];
	M[1] = M[1] > v[1] ? M[1] : v[1];
	M[2] = M[2] > v[2] ? M[2] : v[2];
}
function Vect3_minMaxFromArr( m, M, arr, i ){
	m[0] = m[0] < arr[i+0] ? m[0] : arr[i+0];
	m[1] = m[1] < arr[i+1] ? m[1] : arr[i+1];
	m[2] = m[2] < arr[i+2] ? m[2] : arr[i+2];
	
	M[0] = M[0] > arr[i+0] ? M[0] : arr[i+0];
	M[1] = M[1] > arr[i+1] ? M[1] : arr[i+1];
	M[2] = M[2] > arr[i+2] ? M[2] : arr[i+2];
}

function Vect3_parse( v, lnPrts, sIdx ){
	v[0] = lnPrts[sIdx];
	v[1] = lnPrts[sIdx+1];
	v[2] = lnPrts[sIdx+2];
}
function Vect3_containsNaN( v ) {
	for( let i = 0; i < v.length; ++i ){
		if( v[i] != v[i] )
		    return true;
	}
	return false;
}

//return a string from a vector of numbers
//make each entry of the vector have num decimal places, and len total characters
//len has to be numDecimalPlaces + 2 or greater 
//(because of - sign, 1's place digit and . character )
function Vect_FixedLenStr( v, numDecimalPlaces, len ){
	let retString = '';
	let a = '';
	for( let i = 0; i < v.length; ++i ){ //for each number in the vector
		if( v[i] < 0 )
			a = v[i].toFixed(numDecimalPlaces-1);
		else
			a = v[i].toFixed(numDecimalPlaces);
		if(a.length > len){ //if adding the decimal places makes it longer than the string length for each number
			//convert to truncated scientific notation
			//a = a.slice(0, len-2);
			//a += "..";
			let fd = a[0] == '-' ? a.slice(0,2) : a[0]; //get the (first digit) most significant integer of the number (before decimal)
			let intStr = v[i].toFixed(0);
			let ep = intStr == '-' ? intStr.length-2 : intStr.length-1; //get the number of ten's decimal places
			a = fd + "e" + ep; //first digit e (signifying x10 exponent) power of ten truncated scientific notation string
		}
		
		if( a.length < len ){
			while( a.length < len )
				a = '_' + a;
		}
		retString += a;
		if( i != v.length - 1 ) //add spaces between the vector components
			retString += " ";
	}

	return retString;
}

function Vect3_ArrToStr( va, numDecPlaces, maxNumLen ){
	let str = "";
	for( let i = 0; i < va.length; ++i ){
		str += Vect_FixedLenStr( va[i], numDecPlaces, maxNumLen );
		if( i < va.length-1 )
			str += " : ";
	}
	return str;
}

//for debug printing
function Vect_ToFixedPrecisionString( v, numDecimalPlaces ){
	let retString = "v";
	for( let i = 0; i < v.length; ++i ){
		retString += v[i].toPrecision(numDecimalPlaces);
		if( i != v.length - 1 )
			retString += " ";
	}
	return retString;
}

function numToHex(n){ //generate a hex value string from a number
	n = Math.floor(n);
	if( n > 255 )
		return "FF";
	let ret = "";
	let nn;
	let a = 'A'.charCodeAt(0);
	while (n > 0){
		nn = Math.floor(n/16);
		let d = n-(nn*16);
		if( d > 9 )
			d = String.fromCharCode(a+(d-10));
		ret += d;
		n = nn;
	}
	if(ret == "")
		ret = "00";
	return ret;
}

