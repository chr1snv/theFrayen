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
	let pOvlp = [0,0,0];
	return a1.RangeOverlaps( a2.minCoord[0], a2.maxCoord[0], 0 )  *
		a1.RangeOverlaps( a2.minCoord[1], a2.maxCoord[1], 1) *
		a1.RangeOverlaps( a2.minCoord[2], a2.maxCoord[2], 2);
	//	return true;
	//return false;
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
	
	
	this.UpdateMinMaxCenter( minCorner, maxCorner );
	
	
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
		const maxRange = Math.max(otherRange, thisRange);
		const pctOverlap = 1 - Math.min( 1, (totalRange - maxRange) / otherRange );
		//if( totalRange < (rangeSum - 0.00001) || touches && totalRange <= rangeSum ) //total range vs sum of two ranges
		//	return true;
		//console.log("%c"+am+":"+aM+" "+this.minCoord[axis]+":"+this.maxCoord[axis], "color:orange");
		//return false;
		return pctOverlap;
	}

	//return a point and time along the ray that intersects an AABB bound or null
	let rayTime = [9999999, 9999999, 9999999];
	let minRayStep = float1;
	let maxRayStep = float1;
	this.intersectAxis = [0, 0, 0];
	let numOtherAxiesWithinBounds = 0;
	let otherAxis;
	let rayStepPoints = [ new Float32Array(3), new Float32Array(3), new Float32Array(3) ];
	this.RayIntersects = function( rayStepPoint, ray, minRayTime ){

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
		rayTime[0] = 99999999; rayTime[1] = 99999999; rayTime[2] = 99999999;
		//find the possible times (min and max aabb faces)
		minRayStep = (this.minCoord[0] - ray.origin[0]) / ray.norm[0];
		maxRayStep = (this.maxCoord[0] - ray.origin[0]) / ray.norm[0];
		//get the closest AABB wall intersection times that are not behind the ray origin (minRayTime)
		if( minRayStep > minRayTime && minRayStep < rayTime[0] ){ rayTime[0] = minRayStep;}
		if( maxRayStep > minRayTime && maxRayStep < rayTime[0] ){ rayTime[0] = maxRayStep; }
		minRayStep = (this.minCoord[1] - ray.origin[1]) / ray.norm[1];
		maxRayStep = (this.maxCoord[1] - ray.origin[1]) / ray.norm[1];
		if( minRayStep > minRayTime && minRayStep < rayTime[1] ){ rayTime[1] = minRayStep; }
		if( maxRayStep > minRayTime && maxRayStep < rayTime[1] ){ rayTime[1] = maxRayStep; }
		minRayStep = (this.minCoord[2] - ray.origin[2]) / ray.norm[2];
		maxRayStep = (this.maxCoord[2] - ray.origin[2]) / ray.norm[2];
		if( minRayStep > minRayTime && minRayStep < rayTime[2] ){ rayTime[2] = minRayStep; }
		if( maxRayStep > minRayTime && maxRayStep < rayTime[2] ){ rayTime[2] = maxRayStep; }

		//advance the ray to the possible intersection plane points
		rayStepPoints[0][0] = ray.norm[0] * rayTime[0] + ray.origin[0];
		rayStepPoints[0][1] = ray.norm[1] * rayTime[0] + ray.origin[1];
		rayStepPoints[0][2] = ray.norm[2] * rayTime[0] + ray.origin[2];

		rayStepPoints[1][0] = ray.norm[0] * rayTime[1] + ray.origin[0];
		rayStepPoints[1][1] = ray.norm[1] * rayTime[1] + ray.origin[1];
		rayStepPoints[1][2] = ray.norm[2] * rayTime[1] + ray.origin[2];
		
		rayStepPoints[2][0] = ray.norm[0] * rayTime[2] + ray.origin[0];
		rayStepPoints[2][1] = ray.norm[1] * rayTime[2] + ray.origin[1];
		rayStepPoints[2][2] = ray.norm[2] * rayTime[2] + ray.origin[2];

		//check the orthogonal axies of the point are within the aabb bounds
		
		//x plane check y and z point
		numOtherAxiesWithinBounds = 0;
		otherAxis = 1;
		if( rayStepPoints[0][otherAxis] >= this.minCoord[otherAxis]  && 
			rayStepPoints[0][otherAxis] <= this.maxCoord[otherAxis]  )
			numOtherAxiesWithinBounds += 1;
		otherAxis = 2;
		if( rayStepPoints[0][otherAxis] >= this.minCoord[otherAxis]  && 
			rayStepPoints[0][otherAxis] <= this.maxCoord[otherAxis]  )
			numOtherAxiesWithinBounds += 1;
		if( numOtherAxiesWithinBounds > 1 ){//the point is inside the aabb
			rayStepPoint[0] = rayStepPoints[0][0];
			rayStepPoint[1] = rayStepPoints[0][1];
			rayStepPoint[2] = rayStepPoints[0][2];
			return rayTime[0];} //return the point and ray time
		
		//y plane check z and x of point
		numOtherAxiesWithinBounds = 0;
		otherAxis = 2;
		if( rayStepPoints[1][otherAxis] >= this.minCoord[otherAxis]  && 
			rayStepPoints[1][otherAxis] <= this.maxCoord[otherAxis]  )
			numOtherAxiesWithinBounds += 1;
		otherAxis = 0;
		if( rayStepPoints[1][otherAxis] >= this.minCoord[otherAxis]  && 
			rayStepPoints[1][otherAxis] <= this.maxCoord[otherAxis]  )
			numOtherAxiesWithinBounds += 1;
		if( numOtherAxiesWithinBounds > 1 ){//the point is inside the aabb
			rayStepPoint[0] = rayStepPoints[1][0];
			rayStepPoint[1] = rayStepPoints[1][1];
			rayStepPoint[2] = rayStepPoints[1][2];
			return rayTime[1];} //return the point and ray time
		
		//z plane check x and y of point
		numOtherAxiesWithinBounds = 0;
		otherAxis = 0;
		if( rayStepPoints[2][otherAxis] >= this.minCoord[otherAxis]  && 
			rayStepPoints[2][otherAxis] <= this.maxCoord[otherAxis]  )
			numOtherAxiesWithinBounds += 1;
		otherAxis = 1;
		if( rayStepPoints[2][otherAxis] >= this.minCoord[otherAxis]  && 
			rayStepPoints[2][otherAxis] <= this.maxCoord[otherAxis]  )
			numOtherAxiesWithinBounds += 1;
		if( numOtherAxiesWithinBounds > 1 ){//the point is inside the aabb
			rayStepPoint[0] = rayStepPoints[2][0];
			rayStepPoint[1] = rayStepPoints[2][1];
			rayStepPoint[2] = rayStepPoints[2][2];
			return rayTime[2];} //return the point and ray time

		return -1; //no intersection point found don't return anything
	}

}
