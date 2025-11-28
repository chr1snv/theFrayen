//# sourceURL=Structures/testTriangle.js

let idx = tri.i1;
DTPrintf( [ qMesh.vertPositions[ idx ], qMesh.vertPositions[ idx+1 ], qMesh.vertPositions[ idx+2 ] ], "test" );
idx = tri.i2;
DTPrintf( [ qMesh.vertPositions[ idx ], qMesh.vertPositions[ idx+1 ], qMesh.vertPositions[ idx+2 ] ], "test" );
idx = tri.i3;
DTPrintf( [ qMesh.vertPositions[ idx ], qMesh.vertPositions[ idx+1 ], qMesh.vertPositions[ idx+2 ] ], "test" );


tri.pointL[0] =1
tri.pointL[1] =0
tri.UVCoordOfPoint( uvCoord, this )
//uvCoord -> [ 0.4444444477558136, 0 ] //suspicious value is not 0.5 or 1

tri.baryVertPcts
Float32Array(3) [ 0.6666666865348816, 0.3333333432674408, 0 ]

tri.pointL
Float32Array(3) [ 1, 0, 0 ]

tri.pointL = [0,0]
Array [ 0, 0 ]

tri.UVCoordOfPoint( uvCoord, this )
undefined
uvCoord
Float32Array [ 1, 0 ]

tri.baryVertPcts
Float32Array(3) [ 1, 0, 0 ]

tri.pointL = [0,1]
Array [ 0, 1 ]

tri.UVCoordOfPoint( uvCoord, this )
undefined
tri.baryVertPcts
Float32Array(3) [ 0.800000011920929, -0.20000000298023224, 0.4000000059604645 ]

tri.e2LOrtOut
Float32Array [ -2, 2 ]

tri.v3L_e2L
Float32Array(3) [ 2, 2, 0 ]

tri.pointL
Array [ 0, 1 ]

tri.v3L_e2L
Float32Array(3) [ 2, 2, 0 ]

p = [0,0,0]
RayPointAtTime( p, [0,0,0], [2,2,0], 0.5)
//p -> [ 1, 1, 0 ] (theirfore



console.log("tri verts/edges v1L " + tri.v1L + " v2L_e1L " + tri.v2L_e1L + " tri.v3L_e2L " + tri.v3L_e2L );
console.log(" uvs " + 
	[ this.uvs[tri.i1*2], this.uvs[tri.i1*2+1] ] + " : " + 
	[ this.uvs[tri.i2*2], this.uvs[tri.i2*2+1] ] + " : " + 
	[ this.uvs[tri.i3*2], this.uvs[tri.i3*2+1] ] 
	);

pointLs = [[2,0],[2,0.5],[2,1],[2,1.5],[2,2]];//[0,0],[2,0],[2,2],[1,1],[1,0],
for( let i = 0; i < pointLs.length; ++i ){
	tri.pointL[0] = pointLs[i][0];
	tri.pointL[1] = pointLs[i][1];
	tri.UVCoordOfPoint(uvCoord, this);
	console.log( "pointL " + tri.pointL + "uv " + uvCoord + " baryVPcts " + tri.baryVertPcts + " baryArea " + tri.baryAreaSum );	
	R2RayIntersection( tri.v1L, tri.v3L_e2L, tri.pointL, tri.e2LOrtOut );
}
