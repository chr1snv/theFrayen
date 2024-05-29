


    
//in 3 space (xyz) a plane divides space into infront of and behind the plane
//determine if a point is inside the frustum by checking if the point is on the normal facing side
//of the 6 planes defining the walls of the frustum (near/far clip, top/bottom, and left/right planes)
function PointOnNormalSideOfPlane(point, center, normal){
    Vect3_Subtract( point, center );
    let dotResult = Vect3_Dot( dotResult, point, normal );
    if( dotResult > 0 ) //on the positive normal side of the plane
      return true;
    return false; //on the negative normal side of the plane
}

//returns the intersection point of a line and plane
//used for finding if the edges of a frustum intersect with the planes of an aabb, indicating intersection/overlap
function linePlaneIntersection( lineOrigin, lineEndpoint, planeCenter, planeNormal, planeUp, planeHeight, planeRight, planeWidth )
{
   //all points on a plane have (point - planeCenter) dot planeNormal = 0 (the vector from the point to the plane center is orthogonal to the planeNormal)
   
   //the equation of a line is start + direction * time, need to find the time that causes the plane normal dot product with the (point - plane center) to be zero
   
   //then check if the point is within the 4 bounding corners of the plane ( in 2d on the plane surface check if the xy coordinates of the point are within the plane width and height )
   

   
   //find the height of the lineOrigin above the plane, and slope in the plane coordinate system ( plane right x, plane up y, plane normal z )
   var lineOriginInPlaneSpace = [   Vect3_Dot( planeCenterToLineOrigin, planeRight  ), 
                                    Vect3_Dot( planeCenterToLineOrigin, planeUp     ), 
                                    Vect3_Dot( planeCenterToLineOrigin, planeNormal ) 
                                ];
   var lineEndpointInPlaneSpace = [ Vect3_Dot( planeCenterToLineOrigin, planeRight  ), 
                                    Vect3_Dot( planeCenterToLineOrigin, planeUp     ), 
                                    Vect3_Dot( planeCenterToLineOrigin, planeNormal ) 
                                  ];
   var linePlaneSpaceDirection = Vect3_CopyNew( lineEndpointInPlaneSpace );
   Vect3_Subtract( lineEndpointInPlaneSpace, lineOriginInPlaneSpace );
   
   var linePlaneSpaceSlope = linePlaneSpaceDirection[2];
   
   if( Math.abs( linePlaneSpaceSlope ) < 0.0001 && Math.abs(lineOriginInPlaneSpace[2]) > 0.01 )
    return false; //the line is parallel to the plane and the line starts away from the surface of the plane, it's very unlikely there is an intersection point with the plane within it's bounds
    
   //else the line intersects with the plane, what is the intersection point? and is it within the width and height of the plane extents?
    
   //the slope of the line in the coordinate space of the plane is the planeCenterToLineOriginDotPlaneNormal
   //with y = m x + b
   //knowing the plane space line slope and distance from the plane to the lineOrigin (lineOriginInPlaneSpace[z] )
   //0 = linePlaneSpaceSlope (x) + lineOriginInPlaneSpace[z]
   //-lineOriginInPlaneSpace[z] / linePlaneSpaceSlope = x
   var lineDistanceToPlaneIntercept = -lineOriginInPlaneSpace[2] / linePlaneSpaceSlope;
   
   //the plane intersection point is
   var planeSpaceIntersectionPoint = Vect3_CopyNew( linePlaneSpaceDirection ); 
   Vect3_MultiplyScalar( planeSpaceIntersectionPoint, lineDistanceToPlaneIntercept );
   Vect3_Add( planeSpaceIntersectionPoint, lineOriginInPlaneSpace );
   
   //check if the position on the plane is within the plane width and height
   if( Math.abs( planeSpaceIntersectionPoint[0] ) < planeWidth && 
       Math.abs( planeSpaceIntersectionPoint[0] ) < planeHeight )
       return true;
   return false;
   
}

let aabbMin = Vect3_New();
let aabbMax = Vect3_New();
const frusMin = Vect3_NewScalar(-1);
const frusMax = Vect3_NewScalar(1);
function FRUS_AABBOverlaps( wrldToFrusMat, aabb ){
	//transform the corners of the aabb into frustum space
	//check if the range overlaps in xyz
	Matrix_Multiply_Vect3( aabbMin, wrldToFrusMat, aabb.minCoord );
	Matrix_Multiply_Vect3( aabbMax, wrldToFrusMat, aabb.maxCoord );
	
	return AABB_OthrObjOverlap( frusMin, frusMax, aabbMin, aabbMax );
}

//a 3d 4 sided pyramid with the top removed and replaced by a plane ( camera near clip plane)
//used for finding objects within the camera field of view
function Frustum()
{
    //values to be filled in by camera GetFrustum
    //not passed in to Frustum constructor to minimize vect3 array copying
    this.origin;
    this.rotMat;
    
    this.normal;
    this.up;

    this.nearClip;
    this.farClip;
    
    this.vectToNearPlane;
    this.vectToFarPlane;
    
    this.nearPlaneCenter;
    this.farPlaneCenter;
    
    this.horizFov;
    this.vertFov;
}


//check if point falls on the inside of the 6 planes of the frustum ( near/far, top/bottom, left/right )
function FRUS_PointInFrustum(point){
    //near clip plane
    if( PointOnNormalSideOfPlane(point, this.nearPlaneCenter, this.normal) &&
    
        //far clip plane
        PointOnNormalSideOfPlane(point, this.farPlaneCenter, this.normal) &&
    
        //top clip plane
        PointOnNormalSideOfPlane(point, this.topPlaneCenter, this.topPlaneNormal) &&
    
        //bottom clip plane
        PointOnNormalSideOfPlane(point, this.bottomPlaneCenter, this.bottomPlaneNormal) &&
    
        //left clip plane
        PointOnNormalSideOfPlane(point, this.leftPlaneCenter, this.leftPlaneNormal) &&
    
        //right clip plane
        PointOnNormalSideOfPlane(point, this.rightPlaneCenter, this.rightPlaneNormal) )
            return true;

    return false;
}
