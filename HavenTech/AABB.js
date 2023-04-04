
//AABB

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

function AABB( minCorner, maxCorner ){

    this.minCoord = new Float32Array(3);
    Vect3_Copy( this.minCoord, minCorner );
    this.maxCoord = new Float32Array(3);
    Vect3_Copy( this.maxCoord, maxCorner );
    
    //generate the center coordinate
    this.center = new Float32Array(3);
    Vect3_Copy( this.center, this.minCoord );
    Vect3_Add( this.center, this.maxCoord );
    Vect3_DivideScalar( this.center, 2 );
    
    this.RangeOverlaps = function( am, aM, axis ){
        //if the range overlaps the maximum distance between
        //any two points will be less than the sum of the range spans
        let bm = this.minCoord[axis];
        let bM = this.maxCoord[axis];
        let max = Math.max(aM, bM);
        let min = Math.min(am, bm);
        let totalRange = max - min;
        let aRange = aM - am;
        let bRange = bM - bm;
        if( totalRange <= aRange + bRange )
            return true;
        return false;
    }

    //return a point and time along the ray that intersects an AABB bound or null
    this.RayIntersects = function( ray, minRayTime ){
        
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
        
        
        //for each of the three axies find the possible intersection time
        for( let axis = 0; axis < 3; ++axis ){
            
            //find the possible times (min and max aabb faces)
            const rayStep = [ (this.minCoord[axis] - ray.origin[axis]) / ray.norm[axis], 
                        (this.maxCoord[axis] - ray.origin[axis]) / ray.norm[axis] ];
            
            //for each axis check the min and max side
            for( let side = 0; side < 2; ++side )
            {
                if( rayStep[side] < minRayTime ) //ignore AABB sides behind the ray origin
                    continue;
                //advance the ray to the intersection point
                let rayStepPoint = new Float32Array(3);
                ray.PointAtTime( rayStepPoint, rayStep[side] );
                
                //check the orthogonal axies of the point are within the aabb bounds
                let numOtherAxiesWithinBounds = 0;
                for( let otherAxiesIndice = 1; otherAxiesIndice < 3; ++otherAxiesIndice )
                {
                    const otherAxis = (axis+otherAxiesIndice) % 3;
                    if( rayStepPoint[otherAxis] >= this.minCoord[otherAxis]  && 
                        rayStepPoint[otherAxis] <= this.maxCoord[otherAxis]  )
                        numOtherAxiesWithinBounds += 1;
                }
                
                //if the two other axies are within the bounds the point 
                //intersects a face of the aabb
                if( numOtherAxiesWithinBounds > 1 ){
                    //the point is inside the aabb
                    
                    //return the point and ray time
                    return [ rayStepPoint, rayStep[side] ];
                }
                
           }
        }
        
        return null; //no intersection point found don't return anything
        
    }
    
    
}
