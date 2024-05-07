//Quaternion.js: Functions for representing and manipulating rotation Quaternions
//for use or code/art requests please contact chris@itemfactorystudio.com

//when applying transformations in multi-dimensonal space, permultations of
//the order of transformations have to be taken into account i.e.
//rotate x first, then y, then z or y x z etc

//also for some objects, the direction the rotation was from has to be taken account for

//in 3 dimensions, an additional axis has to be introduced to prevent "gimbal lock" 
//which can occur where if the three rotation axies are in plane with eachother 
//then the object looses it's roll degree of freedom
//also smooth interpolation of animation rotations, quaternions are needed
//(linear intpolation of euler angles doesn't travel along the sphere surface
//between the two angle/orientations equidistantly per timestep)

//a quaternion is a hyper complex number defining its own 4th dimensional algebra
//where i^2 = j^2 = k^2 = ijk = -1 & commutivity is not obeyed (q1*q2 != q2*q1)
//that is:
// ij = k = -ji
// jk = i = -kj
// ki = j = -ik

//the quaternion also has a polar/axis angle decomposition where
//q = a + bi + cj + dk = a + v
//q =   ||q|| e^(n theta)
//a =   ||q|| cos(theta)
//v = n ||q|| sin(theta)
//can be thought of as a 3axis gimbal with an additional roll axis 
//(rotation around the angle specified by the x,y,z axies)

//the axis angle decomposition can be used to increase the
//power of the quaternion by:
// q^a = ||q||^a e^(n a theta)
//(which can be evaluated using the taylor series expansion of e^x)
//or can be evaluated using eulers formula:
// e^(i x) = cos(x) + i sin(x)
// by substituting
// e^(n a theta) = cos(a theta) + n sin(a theta)

//constructors

//generate a rotation quaternion from an axis angle
//assumes axis is normalized (axis[i] is the direction cosine of that axis)
function Quat_FromAxisAng( quatRet, axis, angle ){
	let sinComponent = Math.sin(angle/2.0);
	quatRet[0] = axis[0] * sinComponent;
	quatRet[1] = axis[1] * sinComponent;
	quatRet[2] = axis[2] * sinComponent;
	quatRet[3] = Math.cos(angle/2.0);
}

//generate a rotation quaternion from a set of euler angles
let tempQ  = new Float32Array(4);
let temp2Q = new Float32Array(4);
let temp3Q = new Float32Array(4);
function Quat_FromEuler( retQuat, eulerAngles ){
	Quat_FromZRot( tempQ, eulerAngles[2] );
	Quat_FromYRot( temp2Q, eulerAngles[1] );
	Quat_MultQuat( temp3Q, tempQ, temp2Q ); //multiply 
	Quat_FromXRot( tempQ, eulerAngles[0] );
	Quat_MultQuat(retQuat, temp3Q, tempQ);
}

//converts a unit axis angle quaternion to euler angles (x-roll, y-pitch, z-yaw)
//component of a quaternion rotation around an axis
//(ignoring twist around axis)
//find orthogonal of axis to find rotation around
//rotate orthogonal vector using quaternion
//project rotated vector onto the plane the normal of which is axis
//acos of the dot product of the projected vector and original orthogonal is angle
function QuatAxisAng_ToEuler( eulerV3, q ){
	
	//roll (x-axis rotation)
	let sinr_cosp = 2 * (q[3] * q[0] + q[1] * q[2]);
	let cosr_cosp = 1 - 2 * (q[0] * q[0] + q[1] * q[1]);
	eulerV3[0] = Math.atan2( sinr_cosp, cosr_cosp );
	
	//pitch (y-axis rotation)
	let sinp = Math.sqrt( 1 + 2 * (q[3] * q[1] - q[0] * q[2]) );
	let cosp = Math.sqrt( 1 - 2 * (q[3] * q[1] - q[0] * q[3]) );
	eulerV3[1] = 2 * Math.atan2( sinp, cosp ) - Math.PI / 2;
	
	//yaw (z-axis rotation)
	let siny_cosp = 2 * (q[3] * q[2] + q[0] * q[1]);
	let cosy_cosp = 1 - 2 * (q[1] * q[1] + q[2] * q[2]);
	eulerV3[2] = Math.atan2( siny_cosp, cosy_cosp );
	
}

//generate a rotation quaternion about the specified axis
//given the euler angle of rotation
function Quat_FromXRot( retQuat, angle ){
	Quat_Identity(retQuat);

	//prevent nan issues with trig functions
	if( angle == 0 )
		return;

	retQuat[0] = Math.sin(angle/2.0);
	retQuat[3] = Math.cos(angle/2.0);
}
function Quat_FromYRot( retQuat, angle ){
	Quat_Identity(retQuat);

	if( angle == 0 )
		return;

	retQuat[1] = Math.sin(angle/2.0);
	retQuat[3] = Math.cos(angle/2.0);
}
function Quat_FromZRot( retQuat, angle ){
	Quat_Identity(retQuat);

	if( angle == 0 )
		return;

	retQuat[2] = Math.sin(angle/2.0);
	retQuat[3] = Math.cos(angle/2.0);
}

function Quat_Copy( quatRet, quat2 ){
	quatRet[0] = quat2[0];
	quatRet[1] = quat2[1];
	quatRet[2] = quat2[2];
	quatRet[3] = quat2[3];
}
function Quat_New(){
	return new Float32Array(4);
}
function Quat_NewCopy( quat2 ){
	let quatRet = Quat_New();
	Quat_Copy(quatRet,quat2);
	return quatRet;
}

function Quat_Identity( quatRet ){
	quatRet[0] = 0;
	quatRet[1] = 0;
	quatRet[2] = 0;
	quatRet[3] = 1;
}

function Quat_New_Identity( ){
	let quatRet = Quat_New();
	Quat_Identity( quatRet );
	return quatRet;
}

//multiply quaternions (used to "compose"/"combine")
// p = (p0 + p1i + p2j + p3k) * (q0 + q1i + q2j + q3k) 
//polynomial expansion and application of the rules i2 = j2 = k2 = ijk =-1
// ||||||pq = p3q3 - p.q + p3q + q3p + p x q||||||
//    = w mult - p dot q + pw*q + qw*p + p cross q
//where p x q is a vect 3 cross product
//      p.q  a vect 3 dot product
let AScl  = Vect3_New();
let BScl  = Vect3_New();
function Quat_MultQuat( r, a, b ){ 
	//requires inputs (a and b) to be distinct from output (r)
	//becuase cross product modifies r in place while calculating
	let d = Vect3_Dot( a, b );
	Vect3_Copy( AScl, a );
	Vect3_MultiplyScalar(AScl, b[3]);
	Vect3_Copy( BScl, b );
	Vect3_MultiplyScalar(BScl, a[3]);
	Vect3_Cross( r, a, b );
	Vect3_Add( r, AScl );
	Vect3_Add( r, BScl );
	r[3] = a[3]*b[3] - d;
}
//multiply a vector by a quaternion
let quatConjTemp = Quat_New();
let tempQMult = Quat_New();
let tempQvc = Quat_New();
function Quat_MultVect( ret, quat1, vec3 ){
	//convert the vec3 to a "pure quaternion" with w = 0
	Quat_VecToQuat(tempQvc, vec3 );

	//calculate the conjugate of the quaternion
	Quat_Copy( quatConjTemp, quat1 );
	Quat_Conj(quatConjTemp);

	//return qvq^-1
	Quat_MultQuat( tempQMult, quat1, tempQvc );
	Quat_MultQuat( ret, tempQMult, quatConjTemp );
}
//convert the vec3 to a "pure quaternion" with w = 0
function Quat_VecToQuat( quat, vec3 ){
	quat[0] = vec3[0];
	quat[1] = vec3[1];
	quat[2] = vec3[2];
	quat[3] = 0;
}

//preforms spherical linear interpolation between two quaternions
//https://allenchou.net/2014/04/game-math-quaternion-basics/#slerp
//assumes 0 <= t <= 1
let sQ2ClosestRecip = Quat_New();
function Quat_Slerp( qr, q1, q2, t){
	let angBtwn = Math.acos( Vect3_Dot( q1, q2 ) ); //inv(adjacent / hypot) => x value inverse
	Quat_Copy( sQ2ClosestRecip, q2 );
	if( angBtwn < 0 ){
		Quat_Recip( sQ2ClosestRecip ); //use closer of two opposite quaternions
	}
	let divisor = Math.sin( angBtwn ); //opposite / hypot => y value
	let q1Amt = Math.sin( (1-t) * angBtwn ) / divisor;
	let q2Amt = Math.sin( t * angBtwn ) / divisor;
	Quat_Copy( qr, q1 ); //use the return quat for scaling q1
	Vect_MultScal( qr, q1Amt );
	Vect_MultScal( sQ2ClosestRecip, q2Amt ); //scale/porportion q2
	Vect_Add( qr, sQ2ClosestRecip ); //combine the 1-t and t contributions
}

//raises the quaternion to the specified real number (number with decimal point) power
function Quat_pow( quat, pow )
{
	//returns of the function used below
	let unitVect = Quat_Decompose(quat);
	let theta = unitVect[4];

	let ret = [				Math.cos(pow * theta),
				unitVect[1]*Math.sin(pow * theta),
				unitVect[2]*Math.sin(pow * theta)];
	return ret;
}

//used for sterp swing, twist decomposition / interpolation
//decompose the quaternion into twist and swing
//https://allenchou.net/2018/05/game-math-swing-twist-interpolation-sterp/
//https://www.euclideanspace.com/maths/geometry/rotations/for/decomposition/index.htm
//https://en.wikipedia.org/wiki/Rodrigues'_rotation_formula
let twTemp = Quat_New();
let rotTwAxs = Quat_New();
let swngAxs = Vect3_New();
let r = Vect3_New();
function Quat_SwingTwistDecomp( swngq_out, twq_out, q_in, twa_in ){
	Quat_MultVect( rotTwAxs, q_in, twa_in ); //transform the twist axis in by the quaternion
	Vect3_Cross( swngAxs, twa_in, rotTwAxs ); //get the orthogonal to the great circle route
	//the twist axis in takes when transformed by the quaternion
	
	Vect3_Project( twq_out, q_in ); //projects the imaginary/rotation axis of q onto the given twist axis
	twq_out[3] = q_in[3];
	Quat_Norm( twq_out );
	
	Quat_Copy( twTemp, twq_out );
	Quat_Recip( twTemp );
	Quat_MultQuat( swngq_out, q_in, twTemp );
}

//decomposes the quaternion into angle, unit vector form
//"versor" "orientation quaternion" "attitude quaternion"
//https://en.wikipedia.org/wiki/Unit_vector#Right_versor
//https://en.wikipedia.org/wiki/Polar_decomposition
let polDecompWorkQuat = Quat_New();
function Quat_Decompose(quat){ //unique polar decomposition
	//copy and normalize the quaternion
	Quat_Copy( polDecompWorkQuat, quat );
	Quat_Norm(polDecompWorkQuat);

	//compute the decomposed values
	let theta = Math.acos(polDecompWorkQuat[3]);
	quat[0] = polDecompWorkQuat[0]/Math.sin(theta);
	quat[1] = polDecompWorkQuat[1]/Math.sin(theta);
	quat[2] = polDecompWorkQuat[2]/Math.sin(theta);
	quat[3] = theta;
}

//return the conjugate of the quaternion
//spatial inverse (is also the inverse if the length is one)
function Quat_Conj( quat ) {
	quat[0] = -quat[0];
	quat[1] = -quat[1];
	quat[2] = -quat[2];
	//quat[3] = quat[3];
}

//return the reciprocal or inverse of the quaternion
//the conjugate / it's length squared
function Quat_Recip( quat ){
	let lenSq = Quat_LenSq( quat );
	Quat_Conj( quat );
	quat[0] /= lenSq;
	quat[1] /= lenSq;
	quat[2] /= lenSq;
	quat[3] /= lenSq;
}

//return the length squared of the quaternion
function Quat_LenSq( quat ){
	return (quat[0]*quat[0]) + (quat[1]*quat[1]) +
			(quat[2]*quat[2]) + (quat[3]*quat[3]);
}

//return the length of the quaternion
function Quat_Len( quat ){
	return Math.sqrt( Quat_LenSq( quat ) );
}

//normalize the quaternion
function Quat_Norm( quat ) {
	let len = Quat_Len( quat );

	//prevent division by zero
	if(len == 0.0) {
		Quat_Identity(quat);
		return;
	}

	quat[0] /= len;
	quat[1] /= len;
	quat[2] /= len;
	quat[3] /= len;
}

