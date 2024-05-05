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
//where i^2=j^2=k^2=ijk=-1 & commutivity is not obeyed (q1*q2 != q2*q1)
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

let tempQ  = new Float32Array(4);
let temp2Q = new Float32Array(4);
let temp3Q = new Float32Array(4);
function Quat_FromEuler( retQuat, eulerAngles )
{
	//generate a rotation quaternion from a set of euler angles
	Quat_FromZRot( tempQ, eulerAngles[2] );
	Quat_FromYRot( temp2Q, eulerAngles[1] );
	Quat_MultQuat( temp3Q, tempQ, temp2Q ); //multiply 
	Quat_FromXRot( tempQ, eulerAngles[0] );
	Quat_MultQuat(retQuat, temp3Q, tempQ);
}

//converts a unit axis angle quaternion to euler angles (x-roll, y-pitch, z-yaw)
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

function Quat_Sub( quatRet, quat1, quat2 ){
	quatRet[0] = quat1[0] - quat2[0];
	quatRet[1] = quat1[1] - quat2[1];
	quatRet[2] = quat1[2] - quat2[2];
	quatRet[3] = quat1[3] - quat2[3];
}

//multiplying quaternions
// p = p0 + p1i + p2j + p3k
// pq = p3q3 - p*q + p3q + q3p + p x q
//    = w mult - dot prod + pw*q + qw*p + p cross q
//where p x q is a vect 3 cross product
//      p*q  a vect 3 dot product
//    =    p[3]*q[3] 

//	    - (p[0]*q[0]+p[1]*q[1]+p[2]*q[2])

//	    + (p[3]*(q[0]i+q[1]j+q[2]k)
//      + (q[3]*(p[0]i+p[1]j+p[2]k)

//      + (p[1]q[2] - q[1]p[2])i + (p[2]q[0] - q[2]p[0])j + (p[0]q[1] - q[0]p[1])k
//preform quaternion multiplication
let AScl  = Vect3_New();
let BScl  = Vect3_New();
function Quat_MultQuat( r, a, b ){

	let d = Vect3_Dot( a, b );
	Vect3_Copy( AScl, a );
	Vect3_MultiplyScalar(AScl, b[3]);
	Vect3_Copy( BScl, b );
	Vect3_MultiplyScalar(BScl, a[3]);
	Vect3_Cross( r, a, b );
	Vect3_Add( r, AScl );
	Vect3_Add( r, BScl );
	r[3] = a[3]*b[3] - d;
	//r[0] = a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1];
	//r[1] = a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0];
	//r[2] = a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3];
	//r[3] = a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2];
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

function Quat_VecToQuat( quat, vec3 ){
	quat[0] = vec3[0];
	quat[1] = vec3[1];
	quat[2] = vec3[2];
}

//preforms spherical linear interpolation between two quaternions
function Quat_Slerp( quat1, quat2, t)
{
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

//decomposes the quaternion into angle, unit vector form
//"versor" "orientation quaternion" "attitude quaternion"
function Quat_Decompose(quat)
{
	//copy and normalize the quaternion
	let workQuat = Quat_NewCopy( quat );
	Quat_Norm(workQuat);

	//compute the decomposed values
	let theta = Math.acos(workQuat[3]);
	quat[0] = workQuat[0]/Math.sin(theta);
	quat[1] = workQuat[1]/Math.sin(theta);
	quat[2] = workQuat[2]/Math.sin(theta);
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

