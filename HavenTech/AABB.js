//AABB.js
//to request use or code/art please contact chris@itemfactorystudio.com

//Axis
//Aligned
//Bounding
//Box

//it is used because checking if something is inside or outside of it
//has a low compute time cost (check the x y and z axies independantly)
//and aabb's (cubes/rectangular regions) can pack/fill a volume

//spheres are simpler objects, though they don't fill cartesian space

//it has 6 sides

//top
//bottom
//left
//right
//front
//back

//and is defined by it's min xyz and max xyz corners

//it has functions for determining if a point is inside the AABB
//and if a ray intersects the AABB
/*
function RangesOverlap( am, aM, bm, bM ){
	//if the ranges overlap the maximum distance between
	//any two points will be less than the sum of the range spans
	let max = Math.max(aM, bM);
	let min = Math.min(am, bm);
	let totalRange = max - min;
	let aRange = aM - am;
	let bRange = bM - bm;
	if( totalRange <= aRange + bRange )
		return true;
return false;
}
*/

function AABB_OthrObjOverlap(a1min, a1Max, a2min, a2Max){
	return AABB_othrObRangeOverlapPct( a1min[0], a1Max[0], a2min[0], a2Max[0] ) *
		   AABB_othrObRangeOverlapPct( a1min[1], a1Max[1], a2min[1], a2Max[1] ) *
		   AABB_othrObRangeOverlapPct( a1min[2], a1Max[2], a2min[2], a2Max[2] );
}

function AABB_othrObRangeOverlapPct( Am, AM, bm, bM ){
	//if the range overlaps the maximum spanned distance
	//will be less than the sum of the range spans
	
	//get the max of maxes and min of mins
	let max = bM;
	if( AM > bM )
		max = AM;
	let min = bm;
	if( Am < bm )
		min = Am;
	const totalRange = max - min; //the furthest points of the two ranges
	
	const otherRange = bM - bm; //the extent of the other
	if( otherRange < epsilon ){ //range of the other is infitensimily small (flat for a single axis aligned quad or tri)
		if( AM >= bM && bm >= Am ) 
			return 1; //so if this range contains it return 1 (the other is entirely inside)
		return 0; //otherwise it is outside, return 0 the AABB's don't overlap
	}
	//a fractional part (percentage) of the ranges may overlap
	const thisRange = AM - Am;
	const rangeSum = otherRange + thisRange; //the smallest overall range with zero overlap
	const minRange = Math.min(otherRange, thisRange);
	const ovlpAmt = rangeSum - totalRange;
	const ovlpPct = ovlpAmt / otherRange;
	if( ovlpPct > 0 )
		return ovlpPct;//pctOverlap;
	else
		return 0;
}

function AABB( minCorner, maxCorner ){
	
	this.minCoord = Vect3_NewZero();
	this.maxCoord = Vect3_NewZero();
	this.center   = Vect3_NewZero();
	this.diag     = Vect3_NewZero();
	
	if( minCorner != undefined )
		AABB_UpdateMinMaxCenter(this, minCorner, maxCorner );

}

function AABB_OffsetPos(aabb, delP){
	Vect3_Add(aabb.center, delP);
	Vect3_Add(aabb.minCoord, delP);
	Vect3_Add(aabb.maxCoord, delP);
}

function AABB_MoveCenter(aabb, newCent){
	Vect3_Copy(   aabb.center, newCent   );
	Vect3_Copy( aabb.minCoord, newCent   );
	Vect3_Copy( aabb.maxCoord, newCent   );
	Vect3_Add(  aabb.maxCoord, aabb.diag );
	Vect3_Subtract( aabb.minCoord, aabb.diag );
}

function AABB_UpdateMinMaxCenter(aabb, minCorner, maxCorner){
	Vect3_Copy( aabb.minCoord, minCorner );
	Vect3_Copy( aabb.maxCoord, maxCorner );
	//generate the center coordinate
	Vect3_Copy( aabb.center, aabb.minCoord );
	Vect3_Add( aabb.center, aabb.maxCoord );
	Vect3_DivideScalar( aabb.center, 2 );
	
	Vect3_Copy( aabb.diag, aabb.maxCoord );
	Vect3_Subtract( aabb.diag, aabb.minCoord );
	Vect3_MultiplyScalar( aabb.diag, 0.5 );
}
/*
this.UpdateCenterDiag(){
	//generate the center coordinate
	Vect3_Copy( this.center, this.minCoord );
	Vect3_Add( this.center, this.maxCoord );
	Vect3_DivideScalar( this.center, 2 );
	
	Vect3_Copy( this.diag, this.maxCoord );
	Vect3_Subtract( this.diag, this.minCoord );
	Vect3_MultiplyScalar( this.diag, 0.5 );
}
*/

function AABB_ContainsPoint(aabb, point){
	if( point[0] >= aabb.minCoord[0] && 
		point[1] >= aabb.minCoord[1] && 
		point[2] >= aabb.minCoord[2] && //each axis of the point is greater than those of the min coord
		point[0] <= aabb.maxCoord[0] && 
		point[1] <= aabb.maxCoord[1] && 
		point[2] <= aabb.maxCoord[2] ) //each axis of the point is also less than those of the max coord
		return true;
	return false;
}

//return a point and time along the ray that intersects an AABB bound or null
let rayAABBIntTime = 9999999;
let planeRayStep = float1;
let numOtherAxiesWithinBounds = 0;
let otherAxis;
let rayStepPoint = Vect3_NewZero();
function AABB_RayIntersects(aabb, ray, minRayTime ){

	//this code is written in long form without for loops to increase
	//chance of the runtime compiler parallel optimizing it

	//if the ray intersects or enters the aabb there will be a point 
	//on the ray where x,y,or z will be equal to 
	//that of the aabb bound/cartesian plane (wall)
	//and the other axies of the point will be within the bounds 
	//( min and max extents ) of the aabb
	// y = m x + b - using the versatile 2d equation of line, 
	    //substituting values and solving for the time/multiple of the ray direction
	//let                  aabbBound = ray normal * x + ray origin
	//solving for x gives (aabbBound - ray origin) / normal = x
	//since the AABB and ray are 3 dimensional, find the three x's 
	//(one for each x,y and z)and points
	//if any of those points are > aabb min coord and < max coord
	//then there is a point on the ray in the aabb, so the ray intersects the AABB

	//var closest = ray.closestPoint( objectAABBCenter ); 
		//this won't necessarily be a point inside the aabb 
		//if the aabb is non cube shaped
	//i.e. if it is very narrow/skinny, 
	//and the ray intersects one of the long/skinny faces, far from the center 
	//the closest point to the aabb center may be outside of the aabb, 
	//because closest point will give a point tangent to the smallest sphere 
	//surrounding the objectAABBCenter the ray touches

	//find the closest intersection time for each of the three axies

	//for each of the three axies find the possible intersection time
	rayAABBIntTime = 99999999;
	//find the possible times (min and max aabb faces)
	for( let a = 0; a < 3; ++a ){ //each axis
		for( let p = 0; p < 2; ++p ){ //min and max plane/face/surface for axis
			if( p == 0 )
				planeRayStep = (aabb.minCoord[a] - ray.origin[a]) / ray.norm[a];
			else
				planeRayStep = (aabb.maxCoord[a] - ray.origin[a]) / ray.norm[a];
				
			//get the closest AABB wall intersection time that is not behind the ray origin (minRayTime)
			if( planeRayStep <= minRayTime )
				continue;
			
		
			//advance the ray to the possible intersection plane point
			RayPointAtTime( rayStepPoint, ray.origin, ray.norm, planeRayStep );
			
			//ray step gives a point on the plane surface of axis a
			//check that the other two axies of the rayStepPoint are within bounds
			numOtherAxiesWithinBounds = 0
			for( let b = 0; b < 2; ++b ){ //each other axis of the plane/surface
				otherAxis = (a + 1 + b) % 3;
				if( rayStepPoint[otherAxis] >= aabb.minCoord[otherAxis]  && 
					rayStepPoint[otherAxis] <= aabb.maxCoord[otherAxis]  )
					numOtherAxiesWithinBounds += 1;
			}
			if( numOtherAxiesWithinBounds > 1 ){//the point is on the aabb plane
				if( planeRayStep < rayAABBIntTime )
					rayAABBIntTime = planeRayStep;
			}
		}
	}
	if( rayAABBIntTime < 99999999 )
		return rayAABBIntTime;
	return -1; //no intersection point found don't return anything
}
