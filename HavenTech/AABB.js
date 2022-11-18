
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

    this.minCoord = minCorner;
    this.maxCoord = maxCorner;
    
    //generate the center coordinate
    this.center = Vect3_CopyNew( this.minCoord );
    Vect3_Add( this.center, this.maxCoord );
    Vect3_DivideScalar( this.center, 2 );

    //return a point and time along the ray that is inside the AABB or null
    this.RayIntersects = function( ray ){
    
        //first check if the ray intersects the model's aabb
        
        //if the ray intersects there will be a point where x,y,or z will be equal to the aabb center
        // y = m x + b - using the versatile 2d equation of line, substituting values and solving for the time/multiple of the ray direction
        //let                  aabbcenter = ray normal * x + ray origin
        //solving for x gives (aabbcenter - ray origin) / normal = x
        //since the AABB and ray are 3 dimensional, find the three x's (one for each x,y andz)and points
        //if any of those points are > aabb min coord and < max coord then there is a point on the ray in the aabb, so the ray intersects the AABB
        
        /*
        var vectToAABBCenter = Vect3_CopyNew( objectAABBCenter );
        Vect3_Subtract( vectToAABBCenter, ray.origin );
        var pctNormal = 0;
        Vect3_Dot( pctNormal, vectToAABBCenter, ray.normal );
        
        //var closest = ray.closestPoint( objectAABBCenter ); //this won't necessarily be a point inside the aabb if the aabb is non cube shaped
        //i.e. if it is very narrow/skinny, and the ray intersects one of the long/skinny faces, far from the center it may then be closer to the center
        //outside of the aabb, because closest point will give a point tangent to the smallest sphere surrounding the objectAABBCenter the ray touches
        */
        
        for( var axis = 0; axis < 3; ++axis ){
            
            var rayStep = [ (this.minCoord[axis] - ray.origin[axis]) / ray.normal[axis], (this.maxCoord[axis] - ray.origin[axis]) / ray.normal[axis] ];
            
            for( var side = 0; side < 2; ++side )
            {
                var rayStepPoint = ray.pointAtTime( rayStep[side] );
                
                var numOtherAxiesWithinBounds = 0;
                for( var otherAxiesIndice = 1; otherAxiesIndice < 3; ++otherAxiesIndice )
                {
                    var otherAxis = (axis+otherAxiesIndice) % 3;
                    if( rayStepPoint[axis] >= this.minCoord[otherAxis] && rayStepPoint[axis] <= this.maxCoord[otherAxis] )
                        numOtherAxiesWithinBounds += 1;
                }
                
                if( numOtherAxiesWithinBounds > 1 ){
                    //the point is inside the aabb
                      
                    return [rayStepPoint, rayStep ];  
                }
                
           }
        }
        
        return null;
        
    }
    
    
}
