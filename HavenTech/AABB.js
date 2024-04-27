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

function AABBsOverlap(a1, a2){
	return a1.RangeOverlaps( a2.minCoord[0], a2.maxCoord[0], 0 ) *
		   a1.RangeOverlaps( a2.minCoord[1], a2.maxCoord[1], 1 ) *
		   a1.RangeOverlaps( a2.minCoord[2], a2.maxCoord[2], 2 );
}

function AABBOthrObjOverlap(a1, a2){
	return a1.othrObRangeOverlapPct( a2.minCoord[0], a2.maxCoord[0], 0 ) *
		   a1.othrObRangeOverlapPct( a2.minCoord[1], a2.maxCoord[1], 1 ) *
		   a1.othrObRangeOverlapPct( a2.minCoord[2], a2.maxCoord[2], 2 );
}

function AABB( minCorner, maxCorner ){
	
	this.minCoord = Vect3_NewZero();
	this.maxCoord = Vect3_NewZero();
	this.center   = Vect3_NewZero();
	this.diag     = Vect3_NewZero();
	
	this.OffsetPos = function(delP){
		Vect3_Add(this.center, delP);
		Vect3_Add(this.minCoord, delP);
		Vect3_Add(this.maxCoord, delP);
	}
	
	this.MoveCenter = function(newCent){
		Vect3_Copy(   this.center, newCent   );
		Vect3_Copy( this.minCoord, newCent   );
		Vect3_Copy( this.maxCoord, newCent   );
		Vect3_Add(  this.maxCoord, this.diag );
		Vect3_Subtract( this.minCoord, this.diag );
	}
	
	this.UpdateMinMaxCenter = function(minCorner, maxCorner){
		Vect3_Copy( this.minCoord, minCorner );
		Vect3_Copy( this.maxCoord, maxCorner );
		//generate the center coordinate
		Vect3_Copy( this.center, this.minCoord );
		Vect3_Add( this.center, this.maxCoord );
		Vect3_DivideScalar( this.center, 2 );
		
		Vect3_Copy( this.diag, this.maxCoord );
		Vect3_Subtract( this.diag, this.minCoord );
		Vect3_MultiplyScalar( this.diag, 0.5 );
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
	
	if( minCorner != undefined )
		this.UpdateMinMaxCenter( minCorner, maxCorner );
	
	this.ContainsPoint = function(point){
		if( point[0] >= this.minCoord[0] && 
			point[1] >= this.minCoord[1] && 
			point[2] >= this.minCoord[2] && //each axis of the point is greater than those of the min coord
			point[0] <= this.maxCoord[0] && 
			point[1] <= this.maxCoord[1] && 
			point[2] <= this.maxCoord[2] ) //each axis of the point is also less than those of the max coord
			return true;
		return false;
	}
	
	//am and aM are the min and max of the other aabb or object checked
	//along the axis for overlap
	this.RangeOverlaps = function( am, aM, axis, touches=false ){
		//if the range overlaps the maximum spanned distance
		//will be less than the sum of the range spans
		let max = aM; //the max of the two maxes
		if( this.maxCoord[axis] > aM )
			max = this.maxCoord[axis];
		let min = am; //the min of the two mins
		if( this.minCoord[axis] < am )
			min = this.minCoord[axis];
		const totalRange = max - min; //the furthest points of the two ranges
		const otherRange = aM - am; //the extent of the other aabb
		const thisRange = this.maxCoord[axis] - this.minCoord[axis];
		const rangeSum = otherRange + thisRange;
		const minRange = Math.min(otherRange, thisRange);
		const ovlpAmt = rangeSum - totalRange;
		const ovlpPct = ovlpAmt / minRange;
		if( ovlpPct > 0 )
			return ovlpPct;//pctOverlap;
		else
			return 0;
	}
	
	this.othrObRangeOverlapPct = function( am, aM, axis, touches=false ){
		//if the range overlaps the maximum spanned distance
		//will be less than the sum of the range spans
		let max = aM; //the max of the two maxes
		if( this.maxCoord[axis] > aM )
			max = this.maxCoord[axis];
		let min = am; //the min of the two mins
		if( this.minCoord[axis] < am )
			min = this.minCoord[axis];
		const totalRange = max - min; //the furthest points of the two ranges
		
		const otherRange = aM - am; //the extent of the other aabb
		if( otherRange < epsilon ){ //this axis of the other AABB is infitensimily small (flat)
			if( max > aM && am > min ) 
				return 1; //so if this AABB contains it return 1 (the other is entirely inside)
			return 0; //otherwise it is outside, return 0 the AABB's don't overlap
		}
		//a fractional part (percentage) of the aabb's may overlap
		const thisRange = this.maxCoord[axis] - this.minCoord[axis];
		const rangeSum = otherRange + thisRange; //the smallest overall range with zero overlap
		const minRange = Math.min(otherRange, thisRange);
		const ovlpAmt = rangeSum - totalRange;
		const ovlpPct = ovlpAmt / otherRange;
		if( ovlpPct > 0 )
			return ovlpPct;//pctOverlap;
		else
			return 0;
	}

	//return a point and time along the ray that intersects an AABB bound or null
	let rayAABBIntTime = 9999999;
	let planeRayStep = float1;
	let numOtherAxiesWithinBounds = 0;
	let otherAxis;
	let rayStepPoint = Vect3_NewZero();
	this.RayIntersects = function( ray, minRayTime ){

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
					planeRayStep = (this.minCoord[a] - ray.origin[a]) / ray.norm[a];
				else
					planeRayStep = (this.maxCoord[a] - ray.origin[a]) / ray.norm[a];
					
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
					if( rayStepPoint[otherAxis] >= this.minCoord[otherAxis]  && 
						rayStepPoint[otherAxis] <= this.maxCoord[otherAxis]  )
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

}
