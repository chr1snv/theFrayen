
function Triangle( p1, p2, p3 ){
    //world space points/verticies of the triangle
    this.v1 = p1;
    this.v2 = p2;
    this.v3 = p3;
    //calculate the edge vectors and surface normal in world space
    this.e1 = Vect3_CopyNew( this.v2 );
    Vect3_Subtract( this.e1, this.v1 ); //from vert1 to vert2
    this.e2 = Vect3_CopyNew( this.v3 ); //from vert3 to vert1
    Vect3_Subtract( this.e2, this.v1 );
    this.e3 = Vect3_CopyNew( this.v3 );
    Vect3_Subtract( this.e3, this.v2 ); //from vert3 to vert2
    
    this.norm = new Float32Array([ 0, 0, 0 ]);
    Vect3_Cross( this.norm, this.e1, this.e2 );
    //use edge1 and edge2 to get a vector perpendicular to the triangle surface
    
    //generate component vectors of the local triangle space
    this.triX = this.e2;
    this.triY = new Float32Array([0, 0, 0]);
    Vect3_Cross( this.triY, this.norm, this.triX );
    // triZ is this.norm
    
    //get vertex positions in local space for uv calculation
    //this could be done in ray triangle intersection after it is
    //determined that the uv coordinates should be calculated
    //though if geometry is static and triangles are cached/kept for
    //multiple uses it may be better to calculate them once at instantiation
    //and keep them in memory
    this.v1L  = new Float32Array([ 0, 0, 0 ]);
    this.v2L  = [ 
            Vect3_Dot( this.e1[0], this.triX      ),
            Vect3_Dot( this.e1[1], this.triY      ),
            Vect3_Dot( this.e1[2], this.norm )
                ];
    this.v3L  = [ 
            Vect3_Dot( this.e2[0], this.triX      ),
            Vect3_Dot( this.e2[1], this.triY      ),
            Vect3_Dot( this.e2[2], this.norm )
                ];

    //returns the intersection point of a ray and plane ( triangle )
    //used for finding if / where a ray intersects a triangle
    this.RayTriangleIntersection = function( ray )
    {
       //Definition of a plane - ( 2d flat surface in 3 dimensional space ) 
       //all points on a plane have (point - planeCenter) dot planeNormal = 0 
       //(the vector from the point to the plane center is orthogonal 
       //( at a 90 deg right angle ) to the planeNormal )
       
       //the equation of a line is start + direction * time
       //need to find the time (multiple of ray direction) that causes the 
       //plane normal dot product with the (point - plane center) to be zero
       
       //the basis/intuition of how this solver works is by 
       //coordinate space transformation
       //the problem is complicated/un clearly solved in world space 
       //because it depends on where the ray is and it's direction, and the triangle 
       //I solved it once algebraically using the system of equations for 
       //the ray and plane (in Drawable's RayIntersectsHull)
       //and simplifying the equations, but it took a few pages of algebra 
       //and it's easy to make mistakes
       //so this time using change of coordinate spaces is the intuition 
       //to simplifying / solving for the intersection point
       //changing the problem point of view / persepective to 
       //the coordinate space of the plane/triangle 
       //by normalizing the x,y,z axies of the triangle and 
       //finding the dot product of the ray origin - triangle origin and 
       //normal with each of the triangle component axies
       //(setting the triangle origin to 0,0,0 and triangle normal to 0,0,1)
       //makes the problem solvable with a single linear equation
       //then the intersection point of the ray is where the 
       //plane space z coordinate of the ray is zero
       //(solve y = m x + b for 0) ->  0 = 
       //ray direction z component * time + ray origin z
       //time = -(ray origin z) / (ray direction z component)
       
       //once the intersection point is found
       //checking if the intersection point is within the bounding edges 
       //of the triangle is done by
       //in 2d on the plane surface checking if the xy coordinates of the point 
       //fall on the inside side of the lines 
       //between v1-v2, v1-v3, v2-v3 (triangle edges)
       //transform the point into edge space, (edge is x, and edge orthogonal is y) 
       //check the y coordinate sign of the point in edge space is the same 
       //as the point opposite of the edge in the triangle
       //i.e. for edge v1-v2 check edge space sign is same as v3, 
       //then v2-v3 sign is same as v1, 
       //finally v3-v1 edge space sign of the intersection point is the same as v2
       

       //find the position of the ray origin in plane space, and ray direction 
       //in the triangle coordinate system
       //( triangle normal -> triangle space z, v2-v1 triangle space x, 
       //triangle space z (cross product) triangle space x -> triangle space y )
       
       
       
       //get the vector to the ray start from the triangle origin
       var triCenterToRayOrigin = Vect3_CopyNew( ray.origin );
       Vect3_Subtract( triCenterToRayOrigin, this.v1 );
       //use dot products to transform the ray into triangle space
       var rayOriginInTriSpace = [
            Vect3_Dot( triCenterToRayOrigin, this.triX  ),
            Vect3_Dot( triCenterToRayOrigin, this.triY  ),
            Vect3_Dot( triCenterToRayOrigin, this.norm  )
       ];
       var rayNormInTriSpace   = [
            Vect3_Dot(             ray.norm, this.triX  ),
            Vect3_Dot(             ray.norm, this.triY  ),
            Vect3_Dot(             ray.norm, this.norm  )
       ];
       
       var rayTriSpaceSlope = rayNormInTriSpace[2];
       
       if( Math.abs( rayTriSpaceSlope ) < 0.0001 && 
           Math.abs( rayOriginInTriSpace[2] ) > 0.01 )
        return null; //the line is parallel to the plane and 
        //the line starts away from the surface of the plane, 
        //it's very unlikely there is an intersection point 
        //with the plane within it's bounds
        
       //else the line intersects with the plane, what is the intersection point?
       //Is it within the width and height of the plane extents?
        
       //the slope of the line in the coordinate space of the plane 
       //is the planeCenterToLineOriginDotPlaneNormal
       //with y = m x + b
       //knowing the plane space line slope and distance from the plane 
       //to the lineOrigin (lineOriginInPlaneSpace[z] )
       //0 = linePlaneSpaceSlope (x) + lineOriginInPlaneSpace[z]
       //-lineOriginInPlaneSpace[z] / linePlaneSpaceSlope = x
       var rayDistanceToTriIntercept = -rayOriginInTriSpace[2] / rayTriSpaceSlope;
       
       if( rayDistanceToTriIntercept < 0 )
        return null; //the intersection is behind the start of the ray
        //not a valid intersection point
       
       //the plane intersection point is
       var triSpaceIntersectionPoint = Vect3_CopyNew( rayNormInTriSpace ); 
       Vect3_MultiplyScalar( triSpaceIntersectionPoint, rayDistanceToTriIntercept );
       Vect3_Add( triSpaceIntersectionPoint, rayOriginInTriSpace );
       
       //check if the position on the plane is within the triangle edges
       //for each edge get it's 90 deg version (cross product with normal)
       //and check if the dot product is positive (inside triangle) or negative
       var e1Orthog = Vect3_NewZero();
       Vect3_Cross( e1Orthog, this.norm, this.e1 );
       var e2Orthog = Vect3_NewZero();
       Vect3_Cross( e2Orthog, this.norm, this.e2 );
       var e3Orthog = Vect3_NewZero();
       Vect3_Cross( e3Orthog, this.norm, this.e3 );
       //check if point is on inside or outside of each edge
       var e1ODot = Vect3_Dot( e1Orthog, triSpaceIntersectionPoint );
       var e2ODot = Vect3_Dot( e2Orthog, triSpaceIntersectionPoint );
       var e3ODot = Vect3_Dot( e3Orthog, triSpaceIntersectionPoint );
       
       //if the intersection point is outside of any of the edges
       //of the triangle the ray does not intersect the triangle
       if( e1ODot > 0 || 
           e2ODot > 0 ||
           e3ODot > 0 )
           return null;
           
       //otherwise the point is on the surface of the triangle
       
       
       return [ triSpaceIntersectionPoint, rayDistanceToTriIntercept ];
       
    }
    
    this.UVCoordOfPoint = function( lpoint, v1Uv, v2Uv, v3Uv ){
       //calculate the uv coordinates of the intersection point
       //by interpolating between given uv coordinates of verticies
       //based on how far the point is to each vertex in local triangle space
       var v1Dist = Vect3_Distance(this.v1L, lpoint);
       var v2Dist = Vect3_Distance(this.v2L, lpoint);
       var v3Dist = Vect3_Distance(this.v3L, lpoint);
       var totalDist = v1Dist + v2Dist + v3Dist; //get the total distance
       //to normalize the contribution from each vertex
       var v1UvAmt = v1Dist / totalDist; //how much each vertex contributes
       var v2UvAmt = v2Dist / totalDist;
       var v3UvAmt = v3Dist / totalDist;
       //the interpolated uv value is the normalized sum of contributions
       var uv = [ v1Uv[0] * v1UvAmt + v2Uv[0] * v2UvAmt + v3Uv[0] * v3UvAmt,
                  v1Uv[1] * v1UvAmt + v2Uv[1] * v2UvAmt + v3Uv[1] * v3UvAmt ];
       return uv;
    }

}
