//# sourceURL=Transforms/Ray.js - provides functions dealing with ray intersections
//for use or code/art requests please contact chris@itemfactorystudio.com

// derivation using computer algebra (wolframalpha) and algebreic steps

//if the ray direction x or y have a zero component different solutions have to be used

//equation of a ray
// p = orig + dir * t

//set ray 1 point = ray 2 point
// o1 + d1*t1 = p1 = p2 = o2 + d2 * t2
// t1 = o2 - o1 + d2 *t2 / d1 //subtract origins and divide by other direction

//t2 = ( o1-o2 + d1*t1 ) / d2 //same in reverse for t2

//o, and d are x,y vectors, set x and y sides of equations equal to eachother
//t1 = ( o2[0] - o1[0] + d2[0] * t2 ) / d1[0] = 
//	   ( o2[1] - o1[1] + d2[1] * t2 ) / d1[1];

//single letter variable substitutions for computer aided algebra solving
//o1x = q
//o1y = w
//d1x = d
//d1y = r

//o2x = l
//o2y = y
//d2x = u
//d2y = o

//t2
//solve for t in equation ( l - q + u * t ) / d = ( y - w + o * t ) / r
//t = ( d(w - y) + r(l-q) ) / ( do - ru )  with conditions  do != ru  and  dr != 0
//t2 = ( d1x(o1y - o2y) + d1y(o2x-o1x) ) / ( d1x*d2y - d1y*d2x )
//with d1x*d2y != d1y*d2x and
//     d1x*d1y != 0

//steps for solving for t2 assuming directions of rays are non zero in x and y
//t1 = ( o2[0] - o1[0] + d2[0] * t2 ) / d1[0] = //t1 of intersection for x
//t1 = ( o2[1] - o1[1] + d2[1] * t2 ) / d1[1];  //t1 of intersection for y

	// ( o2[0] - o1[0] + d2[0] * t2 ) * d1[1] =                //set x and y intersection equal and multiply by d1 x,y divisors
	// ( o2[1] - o1[1] + d2[1] * t2 ) * d1[0];

	// ( o2[0] - o1[0] ) * d1[1] + ( d2[0] * t2 ) * d1[1] =    //expand multiplication
	// ( o2[1] - o1[1] ) * d1[0] + ( d2[1] * t2 ) * d1[0];
	//
	// ( o2[0] - o1[0] ) * d1[1] + ( d2[0] * d1[1] * t2 ) =    //re order t2 terms
	// ( o2[1] - o1[1] ) * d1[0] + ( d2[1] * d1[0] * t2 );

	// ( o2[0] - o1[0] ) * d1[1] - ( o2[1] - o1[1] ) * d1[0] = //move t2 terms to same side
	// ( d2[1] * d1[0] * t2 )-( d2[0] * d1[1] * t2 );

	// ( o2[0] - o1[0] ) * d1[1] + ( o1[1] - o2[1] ) * d1[0] = //distribute - sign and factor out t2
	// ( d2[1] * d1[0] )-( d2[0] * d1[1] ) * t2;
	//same solution as from "solve for t" above


//returns the timestep of the second ray for the point of intersection
//of two rays in R2

//assume d1 and d2 have unit length (for parallel test)

//if lines are parallel, then they have either infinte or zero intersections
//else they have 1 possible intersection point

function RayRayIntersection( o1, d1, o2, d2 ){
	
	//let dirDot = d1[0]*d2[0]+d1[0]*d2[0]; //dot product of line directions
	
	//if( dirDot -1 < epsilon && 
	
	
	let d1xd2y = d1[0]*d2[1];
	let d1yd2x = d1[1]*d2[0];
	
	let t2Denom = ( d1xd2y - d1yd2x );
	
	//check preconditions for t2 solutions
	if( d1[0] < epsilon && d1[0] > -epsilon ){ //ray 1 x doesn't change
		
		if( d1[1] < epsilon && d1[1] > -epsilon ){ //ray 2 y doesn't change
			//could check if ray2 intersects ray1's origin
			//though ray 1 is not technically a ray (has no direction)
			return undefined;
		}
		//d1x is 0 for any y , check where ray2's x = ray 1 origin x
		//o1[0] = o2[0] + d2[0] * t2
		//o1[0] - o2[0] = d2[0] * t2
		//(o1[0] - o2[0] ) / d2[0] = t2
		let xOriDiff = o1[0] - o2[0];
		if( xOriDiff < epsilon && xOriDiff > -epsilon )
			return 0; //ray 1 and 2 start positions are on top of eachother (co local)
		if( d2[0] < epsilon && d2[0] > -epsilon )
			return undefined; //origins aren't co local and need a ray 2 dx value for solution
			
		return xOriDiff / d2[0]; //preconditions met for r1x = r2x solve
	}
	if( d1[1] < epsilon && d1[1] > -epsilon ){ //ray1 x changes though not y
		//d1y is 0, only need to check where ray2's point = ray 1 origin y
		//o1[1] = o2[1] + d2[1] * t2 //same as above except with y ([1])
		//(o1[1] - o2[1] ) / d2[1] = t2
		let yOriDiff = o1[1] - o2[1];
		if( yOriDiff < epsilon && yOriDiff > -epsilon ){
			return 0;
		}
		if( d2[1] < epsilon && d2[1] > -epsilon )
			return undefined; //the origins aren't on top of eachother
			
		return yOriDiff / d2[1]; //preconditions met for r1x = r2x solve
	}
	if(t2Denom < epsilon && t2Denom > -epsilon ){
		let t2Num = ( d1[0]*(o1[1] - o2[1]) + d1[1]*(o2[0]-o1[0]) );
		return t2Num / t2Denom; //return t2
	}
}
let o2tmp = new Float32Array(2);
let o2p = new Float32Array(2);
let d2p = new Float32Array(2);
let d1o = new Float32Array(2);
let r1Axies = [undefined, new Float32Array(2)];
function R2RayIntersection( o1, d1, o2, d2 ){
	//transform r2 into r1 space
	//construct r1 space
	r1Axies[0] = d1; //r1 space x axis is r1 direciton
	//0) get orthogonal to ray 1 direction (90 deg counter clockwise) (r1 space y axis)
	r1Axies[1][0] = -d1[1];
	r1Axies[1][1] =  d1[0];
	//1) subtract ray 2 orig and transform into r1 space
	o2tmp[0] = o2[0] - o1[0];
	o2tmp[1] = o2[1] - o1[1];
	Vect_DotProdCoordRemap( o2p, o2tmp, r1Axies );
	//2) dot product r2 origin and dir with r1(x axis) and r1 orthog(y axis) (to get r1 space values  (r2') )
	Vect_DotProdCoordRemap( d2p, d2, r1Axies );
	
	
	//3) find where r2 intersects y=0 (the x axis)
	let o2pOnY0 = NearEpsilon( o2p[1] );
	if( !o2pOnY0 ){
		if( NearEpsilon(d2p[1]) )//if r2'Ori y != 0 && |r2' Dir y| < epsilon
			return NaN; // 		no intersection is possible //starts not on y=0 and doesn't
		// otherwise
		//     0 = y = r2'Dir y  t + r2' ori y
		//-r2' ori y = r2'Dir y  t
		//-r2' ori y  / r2'Dir y  = t
		let intT2 = -o2p[1] / d2p[1];
		return intT2;
	}else{ //o2' is on the line r1
		//check if before r1 origin and going away from it
		if( o2p[0] < 0 && d2p[0] > 0 )
			return NaN;
		return 0; //assume r1 time isn't important and it immediately intersects
	}
}

//uses binary subdivision to iterativly estimate 
//the closest point along the ray to a given point
function Ray_ClosestPointToPoint(point){
}

function RayPointAtTime(point, ori, norm, t){
	point[0] = norm[0] * t + ori[0];
	point[1] = norm[1] * t + ori[1];
	point[2] = norm[2] * t + ori[2];
}

function Ray(origin, direction){
	this.origin    = origin;
	this.norm      = direction;

	//keep track of the objects checked in the last node, because if
	//they span world oct tree nodes they don't need to be checked again
	this.lastNode = null;

	/*
	//returns the point along the ray at the given 
	//multiple of the ray direction (normal)
	this.PointAtTime = function( point, t ){
		point[0] = this.norm[0] * t + this.origin[0];
		point[1] = this.norm[1] * t + this.origin[1];
		point[2] = this.norm[2] * t + this.origin[2];
		//Vect3_Copy( point, this.norm );
		//Vect3_MultiplyScalar( point, t );
		//Vect3_Add( point, this.origin );
	}
	*/

}
