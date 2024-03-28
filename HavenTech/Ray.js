//Ray.js - provides functions dealing with ray intersections
//for use or code/art requests please contact chris@itemfactorystudio.com

//equation of a ray - p = orig + dir * t

//returns the timestep of the second ray for the point of intersection
//of two rays in R2
function RayRayIntersection( o1, d1, o2, d2 ){
	// derivation
	//var t1 = ( o2[0] - o1[0] + d2[0] * t2 ) / d1[0];
	//var t1 = ( o2[1] - o1[1] + d2[1] * t2 ) / d1[1];

	//= ( o2[0] - o1[0] + d2[0] * t2 ) * d1[1];
	//= ( o2[1] - o1[1] + d2[1] * t2 ) * d1[0];

	//= ( o2[0] - o1[0] ) * d1[1] + ( d2[0] * t2 ) * d1[1];
	//= ( o2[1] - o1[1] ) * d1[0] + ( d2[1] * t2 ) * d1[0];
	//
	//= ( o2[0] - o1[0] ) * d1[1] + ( d2[0] * d1[1] * t2 );
	//= ( o2[1] - o1[1] ) * d1[0] + ( d2[1] * d1[0] * t2 );

	//= ( d2[0] * d1[1] * t2 ) - ( d2[1] * d1[0] * t2 );
	//= ( o2[1] - o1[1] ) * d1[0] - ( o2[0] - o1[0] ) * d1[1];

	//= ( d2[0] * d1[1] - d2[1] * d1[0] ) * t2;
	//= ( o2[1] - o1[1] ) * d1[0] - ( o2[0] - o1[0] ) * d1[1];

	var num = ( o2[1] - o1[1] ) * d1[0] - ( o2[0] - o1[0] ) * d1[1];
	var denom = ( d2[0] * d1[1] - d2[1] * d1[0] );

	if( denom < 0.001 && denom > 0.001 ) //Math.abs( 
		return undefined;
	//return t2
	return num / denom;
}


function Ray(origin, direction){
	this.origin    = origin;
	this.norm      = direction;
	
	this.visitedNodes = [];

	//keep track of the objects checked in the last node, because if
	//they span world oct tree nodes they don't need to be checked again
	this.lastNode = null;

	//uses binary subdivision to iterativly estimate 
	//the closest point along the ray to a given point
	this.ClosestPointToPoint = function(point){
	}

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
}
