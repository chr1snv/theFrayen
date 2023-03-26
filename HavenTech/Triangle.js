
function Triangle( p1, p2, p3 ){
    //verticies start with v
    //edges start with e
    //ending in W is in world space
    //ending in L is local ( triangle ) space

    //world space points/verticies of the triangle
    this.v1W = p1;
    this.v2W = p2;
    this.v3W = p3;
    
    var minCorner = new Float32Array( [
                     Math.min( p1[0], p2[0], p3[0] ),
                     Math.min( p1[1], p2[1], p3[1] ),
                     Math.min( p1[2], p2[2], p3[2] ) ] );
    var maxCorner = new Float32Array( [
                     Math.max( p1[0], p2[0], p3[0] ),
                     Math.max( p1[1], p2[1], p3[1] ),
                     Math.max( p1[2], p2[2], p3[2] ) ]);
    this.aabb = new AABB( minCorner, maxCorner );
    
    //calculate the world space edge vectors to generate the 
    //world space surface normal
    this.e1W = Vect3_CopyNew( this.v2W );
    Vect3_Subtract( this.e1W, this.v1W ); //from vert1 to vert2
    this.e2W = Vect3_CopyNew( this.v3W ); //from vert1 to vert3
    Vect3_Subtract( this.e2W, this.v1W );
    //use edge1 and edge2 to get a vector perpendicular 
    //to the triangle surface ( the normal )
    this.triZW = new Float32Array([ 0, 0, 0 ]);
    Vect3_Cross( this.triZW, this.e1W, this.e2W );
    Vect3_Normal( this.triZW );
    
    //generate x and y world space component vectors of the local triangle space
    this.triXW = Vect3_CopyNew(this.e1W); //avoid e1W norm, it's used in v2L_e1L
    Vect3_Normal( this.triXW );
    this.triYW = new Float32Array([0, 0, 0]);
    Vect3_Cross( this.triYW, this.triZW, this.triXW );
    Vect3_Normal( this.triYW );
    
    //get vertex positions in local space for uv calculation
    //this could be done in ray triangle intersection after it is
    //determined that the uv coordinates should be calculated
    //though if geometry is static and triangles are cached/kept for
    //multiple uses it may be better to calculate them once at instantiation
    //and keep them in memory
    this.v1L  = new Float32Array([ 0, 0, 0 ]); 
    //because v1 is defined as the triangle origin
    //v1 in local space is 0,0,0
    this.v2L_e1L  = [ //this is v2 in local space and also the vector e1L 
            Vect3_Dot( this.e1W, this.triXW      ),
            Vect3_Dot( this.e1W, this.triYW      ),
            Vect3_Dot( this.e1W, this.triZW      )
                ];
    this.v3L_e2L  = [ //this is v3 in local space and also the vector e2L
            Vect3_Dot( this.e2W, this.triXW      ),
            Vect3_Dot( this.e2W, this.triYW      ),
            Vect3_Dot( this.e2W, this.triZW      )
                ];
    this.e3L = Vect3_CopyNew( this.v3L_e2L ); //from v3Local to v2Local
    Vect3_Subtract( this.e3L, this.v2L_e1L );

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
       var triToRayOriW = Vect3_CopyNew( ray.origin );
       Vect3_Subtract( triToRayOriW, this.v1W );
       //use dot products to transform the ray into triangle space
       var rayOriL = [
            Vect3_Dot( triToRayOriW, this.triXW  ),
            Vect3_Dot( triToRayOriW, this.triYW  ),
            Vect3_Dot( triToRayOriW, this.triZW  )
       ];
       var rayNormL   = [
            Vect3_Dot(     ray.norm, this.triXW  ),
            Vect3_Dot(     ray.norm, this.triYW  ),
            Vect3_Dot(     ray.norm, this.triZW  )
       ];
       
       //since the distance of a point above the triangle is
       //the triangle space (local) z coordinate, on a graph of
       //ray point z coordinate vs ray time the slope ( rise / run ) of the line
       //is the z amount of the ray direction or normal in local space
       var rayZChangeL = rayNormL[2];
       
       if( Math.abs( rayZChangeL ) < 0.0001 && 
           Math.abs( rayOriL[2] ) > 0.01 )
        return null; //the line is parallel to the plane and 
        //the line starts away from the surface of the plane, 
        //it's very unlikely there is an intersection point 
        //with the plane within it's bounds
        
        //else the line intersects with the plane, what is the intersection point?
        //Is it within the width and height of the plane extents?
        
        //the slope of the line in the coordinate space of the plane 
        //is the planeCenterToLineOrigin Dot PlaneNormal
        //with y = m x + b
        //knowing the plane space line slope and distance from the plane 
        //to the lineOrigin (lineOriginInPlaneSpace[z] )
        //0 = linePlaneSpaceSlope (x) + lineOriginInPlaneSpace[z]
        //-lineOriginInPlaneSpace[z] / linePlaneSpaceSlope = x
        var rayDistToPtWL = -rayOriL[2] / rayZChangeL;
        //is the rayDistToSurface the same in world and local space?
        //it should be if the local space basis vectors are unit length
        //and the ray normal is unit (or equal) length in local and world space
       
        if( rayDistToPtWL < 0  || rayDistToPtWL != rayDistToPtWL )
            return null; //the intersection is behind the start of the ray
        //not a valid intersection point
       
        //the plane space intersection point is
        var pointL = Vect3_CopyNew( rayNormL ); 
        Vect3_MultiplyScalar( pointL, rayDistToPtWL );
        Vect3_Add( pointL, rayOriL );
        //the triangle space intersection point z coordinate should be 0
       
        //check if the position on the plane is within the triangle edges
        //for each edge get it's 90 deg version (cross product with normal)
        //in 2d the simplied calculation to getting the 90 deg rotated
        //orthogonal vector is to swap the x and y coordinates [index 0  and 1]
        //and invert/negate one of them (making x negative rotates clockwise
        //making y negative rotates counterclockwise)
        //and check if the 2d dot product of a vector to the point from
        //a point on the edge is
        //negative (signifying it is inside the triangle if 
        //all edge orthogonals are facing outward)
        //or positive signifying that from the edge the direction
        //taken to reach the point exits the bounds of the triangle
        var e1OrthogDotL =  this.v2L_e1L[1]*pointL[0] + 
                           -this.v2L_e1L[0]*pointL[1]; 
        //e1Orthog, the vector from v1L to v2L is rotated clockwise
        //to face outwards from the triangle
                                         
        var e2OrthogDotL = -this.v3L_e2L[1]*pointL[0] + 
                            this.v3L_e2L[0]*pointL[1];
        //the vector from v1L to v3L 
        //is rotated counterclockwise to face outwards
                                                  
        var vToPtFromV2L = new Float32Array([ pointL[0] - this.v2L_e1L[0],
                                              pointL[1] - this.v2L_e1L[1] ]);
        //vector to the point from a point on edge3L (from v3L to v2L)
        var e3OrthogDotL =  this.e3L[1]*vToPtFromV2L[0] + 
                           -this.e3L[0]*vToPtFromV2L[1];
        //edge 3 (from v2l to v3l)
        //is rotated clockwise to face away from the triangle
       
        //if the dot products of the vectors to the intersection point
        //are positive the point, and therefore any points along the ray 
        //do not intersect the triangle
        if( e1OrthogDotL > 0 ||
            e2OrthogDotL > 0 ||
            e3OrthogDotL > 0 )
           return null;
           
       //otherwise the point is on the surface of the triangle
       //return the triangle local point so it may/(can optionally be used)
       // for uv space texture coordinate lookup or shading
       //and the ray distance to the intersection point because it
       //might be used for inverse square or atmospheric/volumetric attenuation
       //calculation i.e.participating media (smoke / volumetric effect)
       //though ideally those should involve additional ray intersections
       //that scatter the light conserving energy
            
       
       return [ rayDistToPtWL, this.triZW, pointL ];
       
    }
    
    this.UVCoordOfPoint = function( lpoint, v1Uv, v2Uv, v3Uv ){
       //calculate the uv coordinates of the intersection point
       //by interpolating between given uv coordinates of verticies
       //based on how far the point is to each vertex in local triangle space
       var v1Dist = Vect3_Distance(this.v1L    , lpoint);
       var v2Dist = Vect3_Distance(this.v2L_e1L, lpoint);
       var v3Dist = Vect3_Distance(this.v3L_e2L, lpoint);
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
