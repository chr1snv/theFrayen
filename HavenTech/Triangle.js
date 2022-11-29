
function Triangle( p1, p2, p3 ){

    this.v1 = p1;
    this.v2 = p2;
    this.v3 = p3;
    this.e1 = Vect3_CopyNew( this.v2 );
    Vect3_Subtract( this.e1, this.v1 );
    this.e2 = Vect3_CopyNew( this.v3 );
    Vect3_Subtract( this.e2, this.v1 );
    this.norm = [ 0, 0, 0 ];
    Vect3_Cross( this.norm, this.e1, this.e2 );
    this.e3 = Vect3_CopyNew( this.v3 );
    Vect3_Subtract( this.e3, this.v2 );

    //returns the intersection point of a ray and plane ( triangle )
    //used for finding if / where a ray intersects a triangle
    this.RayTriangleIntersection = function( ray )
    {
       //Definition of a plane - ( 2d flat surface in 3 dimensional space ) 
       //all points on a plane have (point - planeCenter) dot planeNormal = 0 
       //(the vector from the point to the plane center is orthogonal ( at a 90 deg right angle ) to the planeNormal )
       
       //the equation of a line is start + direction * time
       //need to find the time (multiple of ray direction) that causes the 
       //plane normal dot product with the (point - plane center) to be zero
       
       //the basis/intuition of how this solver works is by coordinate space transformation
       //the problem is complicated/un clearly solved in world space because it depends on where the ray is and it's direction, and the triangle 
       //I solved it once algebraically using the system of equations for the ray and plane (in Drawable's RayIntersectsHull)
       //and simplifying the equations, but it took a few pages of algebra and it's easy to make mistakes
       //so this time using change of coordinate spaces is the intuition to simplifying / solving for the intersection point
       //changing the problem point of view / persepective to 
       //the coordinate space of the plane/triangle 
       //by normalizing the x,y,z axies of the triangle and 
       //finding the dot product of the ray origin - triangle origin and normal with each of the triangle component axies
       //(setting the triangle origin to 0,0,0 and triangle normal to 0,0,1)
       //makes the problem solvable with a single linear equation
       //then the intersection point of the ray is where the plane space z coordinate of the ray is zero
       //(solve y = m x + b for 0) ->  0 = ray direction z component * time + ray origin z
       //time = -(ray origin z) / (ray direction z component)
       
       //once the intersection point is found
       //checking if the intersection point is within the bounding edges of the triangle is done by
       //in 2d on the plane surface checking if the xy coordinates of the point fall on the inside side of the lines between v1-v2, v1-v3, v2-v3 (triangle edges)
       //transform the point into edge space, (edge is x, and edge orthogonal is y) 
       //check the y coordinate sign of the point in edge space is the same as the point opposite of the edge in the triangle
       //i.e. for edge v1-v2 check edge space sign is same as v3, then v2-v3 sign is same as v1, finally v3-v1 edge space sign of the intersection point is the same as v2
       

       //find the position of the ray origin in plane space, and ray direction in the triangle coordinate system
       //( triangle normal -> triangle space z, v2-v1 triangle space x, triangle space z (cross product) triangle space x -> triangle space y )
       
       
       //generate the triangle space component vectors
       var triX = Vect3_CopyNew( this.v3 );
       Vect3_Subtract( triX, this.v1 );
       var triY = [0, 0, 0];
       Vect3_Cross( triY, this.norm, triX );
       // triZ is this.norm
       
       
       //get the vector to the ray start from the triangle origin
       var triCenterToRayOrigin = Vect3_CopyNew( ray.origin );
       Vect3_Subtract( triCenterToRayOrigin, this.v1 );
       //use dot products to transform the ray into triangle space
       var rayOriginInTriSpace = [
            Vect3_Dot( triCenterToRayOrigin, triX      ),
            Vect3_Dot( triCenterToRayOrigin, triY      ),
            Vect3_Dot( triCenterToRayOrigin, this.norm )
       ];
       var rayNormInTriSpace   = [
            Vect3_Dot( ray.norm, triX      ),
            Vect3_Dot( ray.norm, triY      ),
            Vect3_Dot( ray.norm, this.norm )
       ];
       
       var rayTriSpaceSlope = rayNormInTriSpace[2];
       
       if( Math.abs( rayTriSpaceSlope ) < 0.0001 && Math.abs( rayOriginInTriSpace[2] ) > 0.01 )
        return false; //the line is parallel to the plane and the line starts away from the surface of the plane, it's very unlikely there is an intersection point with the plane within it's bounds
        
       //else the line intersects with the plane, what is the intersection point? and is it within the width and height of the plane extents?
        
       //the slope of the line in the coordinate space of the plane is the planeCenterToLineOriginDotPlaneNormal
       //with y = m x + b
       //knowing the plane space line slope and distance from the plane to the lineOrigin (lineOriginInPlaneSpace[z] )
       //0 = linePlaneSpaceSlope (x) + lineOriginInPlaneSpace[z]
       //-lineOriginInPlaneSpace[z] / linePlaneSpaceSlope = x
       var rayDistanceToTriIntercept = -rayOriginInTriSpace[2] / rayTriSpaceSlope;
       
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
       
       var e1ODot = Vect3_Dot( e1Orthog, triSpaceIntersectionPoint );
       var e2ODot = Vect3_Dot( e2Orthog, triSpaceIntersectionPoint );
       var e3ODot = Vect3_Dot( e3Orthog, triSpaceIntersectionPoint );
       
       if( e1ODot < 0 || 
           e2ODot < 0 ||
           e3ODot < 0 )
           return null;
       return rayDistanceToTriIntercept;
       
    }

}
