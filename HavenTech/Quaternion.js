//Quaternion.js: Functions for representing and manipulating rotation Quaternions


//a quaternion is a hyper complex number defining its own 4th dimensional algebra
//where i^2=j^2=k^2=ijk=-1 & commutivity is not obeyed
//that is:
// ij=k ji=-k
// jk=i kj=-i
// ki=j ik=-j

//the quaternion also has a polar/axis angle decomposition where
//q = a + bi + cj + dk = a + v
//q =   ||q|| e^(n theta)
//a =   ||q|| cos(theta)
//v = n ||q|| sin(theta)

//then this axis angle decomposition can be used to increase the
//power of the quaternion by:
// q^a = ||q||^a e^(n a theta)
//(which can be evaluated using the taylor series expansion of e^x)
//or can be evaluated using eulers formula:
// e^(i x) = cos(x) + i sin(x)
// by substituting
// e^(n a theta) = cos(a theta) + n sin(a theta)

//constructors

//generate a rotation quaternion from an axis angle
//assumes axis is normalized
function Quat_FromAxisAng( axis, angle )
{
    var sinComponent = Math.sin(angle/2.0);
    var ret = [axis[0] * sinComponent,
               axis[1] * sinComponent,
               axis[2] * sinComponent,
               -Math.cos(angle/2.0) ];
    
    return ret;
}

function Quat_FromEuler( eulerAngles )
{
    //generate a rotation quaternion from a set of euler angles
    
    var temp  = Quat_FromZRot( eulerAngles[2] );
    
    var temp2 = Quat_FromYRot( eulerAngles[1] );
    
    var temp3 = Quat_MultQuat( temp, temp2 );
    
        temp  = Quat_FromXRot( eulerAngles[0], temp );
    
        temp2 = Quat_MultQuat(temp3, temp);
    
    return temp2;
}

//generate a rotation quaternion about the specified axis
//given the euler angle of rotation
function Quat_FromXRot( angle ){
    var ret = [ 0,0,0,1 ];
    
    //prevent nan issues with trig functions
    if( angle == 0 ) return Quat_Identity();
    
    ret[0] = Math.sin(angle/2.0);
    ret[3] = Math.cos(angle/2.0);
    
    return ret;
}

function Quat_FromYRot( angle ){
    var ret = [0,0,0,1];
    
    if( angle == 0 ) return Quat_Identity();
    
    ret[1] = Math.sin(angle/2.0);
    ret[3] = Math.cos(angle/2.0);
    
    return ret;
}
function Quat_FromZRot( angle ){
    var ret = [0,0,0,1];
    
    if( angle == 0 ) return Quat_Identity();
    
    ret[2] = Math.sin(angle/2.0);
    ret[3] = Math.cos(angle/2.0);
    
    return ret;
}

function Quat_Copy( quat2 ){
    
    return [ quat2[0],
             quat2[1],
             quat2[2],
             quat2[3] ];

}

function Quat_Identity(){
    return [0,0,0,1];
}

function Quat_Sub( quat1, quat2 )
{
    return [
            quat1[0] - quat2[0],
            quat1[1] - quat2[1],
            quat1[2] - quat2[2],
            quat1[3] - quat2[3]
            ];
    
}

//preform quaternion multiplication
function Quat_MultQuat( quat1, quat2 ){
    return [
    quat1[3]*quat2[0] + quat1[0]*quat2[3] + quat1[1]*quat2[2] - quat1[2]*quat2[1],
    quat1[3]*quat2[1] - quat1[0]*quat2[2] + quat1[1]*quat2[3] + quat1[2]*quat2[0],
    quat1[3]*quat2[2] + quat1[0]*quat2[1] - quat1[1]*quat2[0] + quat1[2]*quat2[3],
    quat1[3]*quat2[3] - quat1[0]*quat2[0] - quat1[1]*quat2[1] - quat1[2]*quat2[2]
           ];
}
//multiply a vector by a quaternion
function Quat_MultVect( quat1, vect ){
    
    vect.push( 0 );
        
    //calculate the conjugate of the quaternion
    var quatConjugate = Quat_Conj(quat1);
    
    //return qvq^-1
    var tempQuat = Quat_MultQuat( quat1, vect );
    return Quat_MultQuat( tempQuat, quatConjugate );
}

//preforms spherical linear interpolation between two quaternions
function Quat_Slerp( quat1, quat2, t)
{
}

//raises the quaternion to the specified real number power
function Quat_pow( quat, pow )
{
    //returns of the function used below
    var unitVect = Quat_Decompose(quat);
    var theta = unitVect[4];
    
    var ret = [            Math.cos(pow * theta),
               unitVect[1]*Math.sin(pow * theta),
               unitVect[2]*Math.sin(pow * theta)];
    return ret;
}

//decomposes the quaternion into angle, unit vector form
function Quat_Decompose(quat)
{
    //copy and normalize the quaternion
    var workQuat = Quat_Copy( quat );
    Quat_Normalize(workQuat);
    
    //compute the decomposed values
    var theta = acos(workQuat[3]);
    return [workQuat[0]/Math.sin(theta),
            workQuat[1]/Math.sin(theta),
            workQuat[2]/Math.sin(theta),
                                 theta];
}

//return the conjugate of the quaternion
function Quat_Conj( quat ) {
    return [ -quat[0], -quat[1], -quat[2], quat[3] ];
}

//return the reciprocal of the quaternion
function Quat_Recip( quat ){
    var len = Quat_LenSq( quat );
    var conj = Quat_Conj( quat );
    return [
            conj[0]/len,
            conj[1]/len,
            conj[2]/len,
            conj[3]/len
           ];
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
    var len = Quat_len( quat );
    
    //prevent division by zero
    if(len == 0.0) {
        return Quat_Identity();
    }
    
    return [
            quat[0]/len,
            quat[1]/len,
            quat[2]/len,
            quat[3]/len
           ];
}

