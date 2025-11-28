//# sourceURL=CorrectnessTests/QuadMeshVertFaceIdxTests.js
console.log( "verts" );
for( let i = 0; i < this.transformedVerts.length/3; ++i ){
	let v = [ this.transformedVerts[i*3+0], this.transformedVerts[i*3+1], this.transformedVerts[i*3+2] ];
	let lNum = i < 10 ? "0"+i : i;
	console.log( "v" + lNum + " " + Vect_FixedLenStr( v, 3, 7 ) );
}
console.log( "face AABB min / maxes and vert idxs");
for( let i = 0; i < this.faces.length; ++i ){
	let vMin = this.faces[i].AABB.minCoord;
	let vMax = this.faces[i].AABB.maxCoord;
	let fVertIdxs = this.faces[i].vertIdxs;
	let lNum = i < 10 ? "0"+i : i;
	console.log( lNum + " " + Vect_FixedLenStr( vMin, 3, 7 ) + "   "  + Vect_FixedLenStr( vMax, 3, 7 ) + "  idxs " + fVertIdxs );
}

console.log( "subnodes min max faceIdxs" );
for( let i = 0; i < this.octTree.subNodes.length; ++i ){
	let minC = this.octTree.subNodes[i].AABB.minCoord;
	let maxC = this.octTree.subNodes[i].AABB.maxCoord;
	let lNum = i < 10 ? "0"+i : i;
	let oFNums = "";
	for( let j = 0; j < this.octTree.subNodes[i].objects[0].length; ++j )
		oFNums += this.octTree.subNodes[i].objects[0][j].fNum + ",";
	console.log( "sn " + lNum + " " + Vect_FixedLenStr( minC, 3, 7 ) + "   " + Vect_FixedLenStr( maxC, 3, 7 ) + " " + oFNums );
}


