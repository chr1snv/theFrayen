
//AABB

//Axis
//Aligned
//Bounding
//Box

//it is used as the lowest cost volumetric space occupancy container
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

function AABB( minCorner, maxCorner ){

    this.minCoord = Vect3_CopyNew( minCorner );
    this.maxCoord = Vect3_CopyNew( maxCorner );
    
    //generate the center coordinate
    this.center = Vect3_CopyNew( this.minCoord );
    Vect3_Add( this.center, this.maxCoord );
    Vect3_DivideScalar( this.center, 2 );

    //return a point and time along the ray that is inside the AABB or null
    this.RayIntersects = function( rayStepPoint, rayStep, ray ){
    
        //first check if the ray intersects the model's aabb
        
        //if the ray intersects there will be a point where x,y,or z will be equal to the aabb bounds (walls)
        //and the other axies will be within the bounds ( min and max extents )
        // y = m x + b - using the versatile 2d equation of line, substituting values and solving for the time/multiple of the ray direction
        //let                  aabbBound = ray normal * x + ray origin
        //solving for x gives (aabbBound - ray origin) / normal = x
        //since the AABB and ray are 3 dimensional, find the three x's (one for each x,y and z)and points
        //if any of those points are > aabb min coord and < max coord then there is a point on the ray in the aabb, so the ray intersects the AABB
        //
        
        /*
        var vectToAABBCenter = Vect3_CopyNew( objectAABBCenter );
        Vect3_Subtract( vectToAABBCenter, ray.origin );
        var pctNormal = 0;
        Vect3_Dot( pctNormal, vectToAABBCenter, ray.normal );
        
        //var closest = ray.closestPoint( objectAABBCenter ); //this won't necessarily be a point inside the aabb if the aabb is non cube shaped
        //i.e. if it is very narrow/skinny, and the ray intersects one of the long/skinny faces, far from the center it may then be closer to the center
        //outside of the aabb, because closest point will give a point tangent to the smallest sphere surrounding the objectAABBCenter the ray touches
        */
        
        //for each of the three axies find the possible intersection time
        for( var axis = 0; axis < 3; ++axis ){
            
            //find the possible times (min and max aabb faces)
            rayStep = [ (this.minCoord[axis] - ray.origin[axis]) / ray.norm[axis], 
                        (this.maxCoord[axis] - ray.origin[axis]) / ray.norm[axis] ];
            
            //for each axis check the min and max side
            for( var side = 0; side < 2; ++side )
            {
                //advance the ray to the intersection point
                rayStepPoint = ray.PointAtTime( rayStep[side] );
                
                //check the orthogonal axies of the point are within the aabb bounds
                var numOtherAxiesWithinBounds = 0;
                for( var otherAxiesIndice = 1; otherAxiesIndice < 3; ++otherAxiesIndice )
                {
                    var otherAxis = (axis+otherAxiesIndice) % 3;
                    if( rayStepPoint[axis] >= this.minCoord[otherAxis] && 
                        rayStepPoint[axis] <= this.maxCoord[otherAxis] )
                        numOtherAxiesWithinBounds += 1;
                }
                
                //if the two other axies are within the bounds the point 
                //intersects a face of the aabb
                if( numOtherAxiesWithinBounds > 1 ){ 
                    //the point is inside the aabb
                    
                    //return the point and ray time
                    rayStep = rayStep[side];
                    return; //[ rayStepPoint, rayStep ];  
                }
                
           }
        }
        
        //return null; //no intersection point found don't change return variables
        
    }
    
    
}
