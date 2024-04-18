
function Triangle( ){
	//verticies start with v
	//edges start with e
	//ending in W is in world space
	//ending in L is local ( triangle ) space
	
	let e1W = new Float32Array(3);
	let e2W = new Float32Array(3);
	
	this.triZW = new Float32Array(3);
	this.triXW = new Float32Array(3);
	this.triYW = new Float32Array(3);
	
	this.v1L  = Vect3_NewZero();
	//because v1 is defined as the triangle origin
	//v1 in local space is 0,0,0
	this.v2L_e1L = new Float32Array(3);
	this.v3L_e2L  = new Float32Array(3);
	this.e3L = new Float32Array(3);
	
	this.i1 = 0;
	this.i2 = 1;
	this.i3 = 2;
	this.Setup = function( fTriIdx, face, vertArr ){

		//world space points/verticies of the triangle (i1, i2, i3)
		if( fTriIdx == 1 ){
			this.i1 = 2;
			this.i2 = 3;
			this.i3 = 0;
		}
		
		//calculate the world space edge vectors to generate the 
		//world space surface normal
		
		Vect3_CopyFromArr( e1W, vertArr, face.vertIdxs[this.i2]*vertCard );
		Vect3_SubFromArr( e1W, vertArr, face.vertIdxs[this.i1]*vertCard ); //from vert1 to vert2
		
		Vect3_CopyFromArr( e2W, vertArr, face.vertIdxs[this.i3]*vertCard ); //from vert1 to vert3
		Vect3_SubFromArr( e2W, vertArr, face.vertIdxs[this.i1]*vertCard );
		//use edge1 and edge2 to get a vector perpendicular 
		//to the triangle surface ( the normal )
		
		Vect3_Cross( this.triZW, e1W, e2W );
		Vect3_Normal( this.triZW );

		//generate x and y world space component vectors of the local triangle space
		
		Vect3_Copy(this.triXW, e1W); //avoid e1W norm, it's used in v2L_e1L
		Vect3_Normal( this.triXW );
		
		Vect3_Cross( this.triYW, this.triZW, this.triXW );
		Vect3_Normal( this.triYW );

		//get vertex positions in local space for uv calculation
		//this could be done in ray triangle intersection after it is
		//determined that the uv coordinates should be calculated
		//though if geometry is static and triangles are cached/kept for
		//multiple uses it may be better to calculate them once at instantiation
		//and keep them in memory
		
		
		//this is v2 in local space and also the vector e1L (dot product coord remap)
		this.v2L_e1L[0] = Vect3_Dot( e1W, this.triXW );
		this.v2L_e1L[1] = Vect3_Dot( e1W, this.triYW );
		this.v2L_e1L[2] = Vect3_Dot( e1W, this.triZW );

		
		//this is v3 in local space and also the vector e2L (dot product coord remap)
		this.v3L_e2L[0] = Vect3_Dot( e2W, this.triXW );
		this.v3L_e2L[1] = Vect3_Dot( e2W, this.triYW );
		this.v3L_e2L[2] = Vect3_Dot( e2W, this.triZW );
		
		Vect3_Copy( this.e3L, this.v3L_e2L ); //from v3Local to v2Local
		Vect3_Subtract( this.e3L, this.v2L_e1L );
	
	}

	//returns the intersection point of a ray and plane ( triangle )
	//used for finding if / where a ray intersects a triangle
	let triToRayOriW = new Float32Array(3);
	this.pointL      = new Float32Array(3);
	let rayOriL      = new Float32Array(3);
	let rayNormL     = new Float32Array(3);
	let rayNormLZ    = float0; //float 32 value
	let vToPtFromV2L = new Float32Array(2);
	//this.rayDistToPtWL = this.rayNormL[0];
	let rayDistToPtWL;
	let e1OrthogDotL;
	let e2OrthogDotL;
	let e3OrthogDotL;
	this.RayTriangleIntersection = function( retZW, ray, vArr, v1WI )
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

		rayNormLZ =  Vect3_Dot( ray.norm, this.triZW );
		//if( rayNormLZ < 0 ) //backface culling (triangles not towards ray)
		//	return -1;

		//get the vector to the ray start from the triangle origin
		Vect3_DiffFromArr( triToRayOriW, ray.origin, vArr, v1WI*vertCard );

		//use dot products to transform the ray into triangle space
		rayOriL[0] = Vect3_Dot( triToRayOriW, this.triXW );
		rayOriL[1] = Vect3_Dot( triToRayOriW, this.triYW );
		rayOriL[2] = Vect3_Dot( triToRayOriW, this.triZW );

		rayNormL[0] = Vect3_Dot( ray.norm, this.triXW );
		rayNormL[1] = Vect3_Dot( ray.norm, this.triYW );
		rayNormL[2] = rayNormLZ;

		//since the distance of a point above the triangle is
		//the triangle space (local) z coordinate, on a graph of
		//ray point z coordinate vs ray time the slope ( rise / run ) of the line
		//is the z amount of the ray direction or normal in local space

		if( ( rayNormL[2] < 0.0001 && rayNormL[2] > -0.0001 ) && 
			( rayOriL[2] > 0.01 || rayOriL[2] < -0.0001 ) )
			return -1; //the line is parallel to the plane and 
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
		rayDistToPtWL = -rayOriL[2] / rayNormL[2];
		//is the rayDistToSurface the same in world and local space?
		//it should be if the local space basis vectors are unit length
		//and the ray normal is unit (or equal) length in local and world space

		if( rayDistToPtWL < 0  || rayDistToPtWL != rayDistToPtWL )
			return -1; //the intersection is behind the start of the ray
		//not a valid intersection point

		//the plane space intersection point is
		RayPointAtTime( this.pointL, rayOriL, rayNormL, rayDistToPtWL);
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
		e1OrthogDotL =  this.v2L_e1L[1]*this.pointL[0] + 
						-this.v2L_e1L[0]*this.pointL[1]; 
		//e1Orthog, the vector from v1L to v2L is rotated clockwise
		//to face outwards from the triangle

		e2OrthogDotL = -this.v3L_e2L[1]*this.pointL[0] + 
						this.v3L_e2L[0]*this.pointL[1];
		//the vector from v1L to v3L 
		//is rotated counterclockwise to face outwards

		vToPtFromV2L[0] = this.pointL[0] - this.v2L_e1L[0];
		vToPtFromV2L[1] = this.pointL[1] - this.v2L_e1L[1];

		//vector to the point from a point on edge3L (from v3L to v2L)
		e3OrthogDotL =  this.e3L[1]*vToPtFromV2L[0] + 
						-this.e3L[0]*vToPtFromV2L[1];
		//edge 3 (from v2l to v3l)
		//is rotated clockwise to face away from the triangle

		//if the dot products of the vectors to the intersection point
		//are positive the point, and therefore any points along the ray 
		//do not intersect the triangle
		if( e1OrthogDotL > 0 ||
			e2OrthogDotL > 0 ||
			e3OrthogDotL > 0 )
			return -1;

		//otherwise the point is on the surface of the triangle
		//return the triangle local point so it may/(can optionally be used)
		// for uv space texture coordinate lookup or shading
		//and the ray distance to the intersection point because it
		//might be used for inverse square or atmospheric/volumetric attenuation
		//calculation i.e.participating media (smoke / volumetric effect)
		//though ideally those should involve additional ray intersections
		//that scatter the light conserving energy

		//DPrintf( "rayD " + rayDistToPtWL + " triZ " + this.triZW );
		retZW[0] = this.triZW[0];  //copy the normal to return
		retZW[1] = this.triZW[1];
		retZW[2] = this.triZW[2];
		return rayDistToPtWL;//[ this.rayDistToPtWL, this.triZW, this.pointL ];
	}

	let vNormL = new Float32Array(3);
	this.UVCoordOfPoint = function( uv, lpoint, face ){
		//calculate the uv coordinates of the intersection point
		//by interpolating between given uv coordinates of verticies
		//based on how far the point is to each vertex in local triangle space
		
		vNormL[0] = lpoint[0] / this.v2L_e1L[0];
		vNormL[1] = lpoint[1] / this.v3L_e2L[1];
		//closer to y = 1 is v3's uv
		//y = 0 is x lerp between v1 and 2
		//max x at y is y val
		Vect_LERP( uv, face.uvs, this.i2*uvCard, this.i1*uvCard, (1-vNormL[0])/(vNormL[1]) );
		Vect_LERPAdd( uv, face.uvs, this.i3*uvCard, (1-vNormL[1]) );
		
	}

}
