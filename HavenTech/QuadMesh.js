//QuadMesh.js - implementation of QuadMesh
//for use or code/art requests please contact chris@itemfactorystudio.com

//a polygonal mesh with faces of 3 or 4 (quad) verticies
let uvCoord = new Float32Array(2);
class Face { //part of mesh stored in mesh octTree
	constructor(){
		this.uid        = NewUID( );
		this.materialID = 0;
		this.numFaceVerts = 0;
		this.uvs        = new Array(4*2);
		this.vertIdxs   = new Array(4).fill(-1);
		//this.triIdxs    = new Array(2).fill(-1);
		this.AABB       = new AABB();
		this.overlaps   = [0,0,0]; //octTree.generateMinAndMaxNodes
		//this.treeNodes  = {};
		//this.fNum = -1;
		//this.otType = OT_TYPE_Face;
	}

}
/*
function QMF_RayIntersect( thisP, retDisNormCol, ray ){ //retDisNormCol[2] is the quadmesh for getmaterialcolor
	//if( this.fNum < 9  ){
	//	retDisNormCol[0] = -1;//retDisNormCol[4];
	//	retDisNormCol[2] = [1,0,1,1];
	//	return;
	//}
	for( let i = 0; i < thisP.triIdxs.length; ++i ){
		if( thisP.triIdxs[i] == -1 )
			break
		let qMesh = retDisNormCol[3];
		let tri = qMesh.tris[thisP.triIdxs[i]];
		retDisNormCol[0] = TRI_RayIntersection(tri, ray, qMesh.transformedVerts, thisP.vertIdxs[i*2] );
		//Vect3_Copy( retDisNormCol[1], tri.triZW );
		if( retDisNormCol[0] > 0 ){ //the ray intersects the triangle, find the uv coordinate
			TRI_UVCoordOfPoint(tri, uvCoord, thisP );
			/*
			let tIdx = sceneTime % 3;
			if( tIdx < 1 ){
				retDisNormCol[2][0] = tri.pointL[0];
				retDisNormCol[2][1] = tri.pointL[1];
			}else if( tIdx < 2 ) {
				retDisNormCol[2][0] = uvCoord[0];
				retDisNormCol[2][1] = uvCoord[1];
			}else{
			///*
				QM_GetMaterialColorAtUVCoord( qMesh, retDisNormCol[2], uvCoord, thisP.materialID );
			//}
			//retDisNormCol[2][2] = 0;
			//retDisNormCol[2][3] = 1;
			return;
		}else{
			//DTPrintf("didn't intersect", "trace error");
			//retDisNormCol[0] = retDisNormCol[4];
			//retDisNormCol[2] = [0,1,1,1];
		}
	}
}
*/

function QuadMesh(nameIn, sceneNameIn, args, quadMeshReadyCallback, readyCallbackParameters)
{
	this.quadMeshReadyCallback = quadMeshReadyCallback;
	this.readyCallbackParameters = readyCallbackParameters;

	this.meshName        = nameIn;
	this.sceneName       = sceneNameIn;

	this.isValid         = false; //true once loading is complete
	this.isAnimated      = false;
	this.hasntDrawn      = true;
	this.componentsToLoad = 0; //the quadmesh, and each animation type key, ipo, skel, etc
	//count as a component to asynchronously load, each time one finishes the count is decremented
	//and if == 0 the callback for the quadmesh (as a complete object) being loaded is called

	//the orientation matrix
	this.scale           = new Float32Array([1,1,1]);
	this.rotation        = new Float32Array([0,0,0]);
	this.origin          = new Float32Array([0,0,0]);
	this.toWorldMatrix   = new Float32Array(4*4);
	this.wrldToLclMat    = new Float32Array(4*4);
	Matrix_SetIdentity( this.toWorldMatrix );
	this.lastToWorldMatrixUpdateTime = -1;

	this.materialNames     = [];
	this.materials         = [];

	this.faceVertsCtForMat       = null;
	this.faceIdxsForMatInsertIdx = null;
	this.faceIdxsForMat          = null; //the indicies of faces for materials

	//the mesh data
	this.tris            = [];
	this.faces           = [];
	this.faceVertsCt     = 0;
	this.vertPositions   = null;
	this.vertNormals     = null;
	this.vertBoneWeights = [];

	//animation base mesh
	this.keyedPositions  = [];

	//the oct tree of the mesh faces (updated with mesh animations)
	const tDim = 100;
	if( rayCastDrawing )
		this.octTree = new TreeNode( [-tDim, -tDim, -tDim], [tDim, tDim, tDim], null );
	this.worldMinCorner = Vect3_NewScalar(  999999 );
	this.worldMaxCorner = Vect3_NewScalar( -999999 );
	this.lclMinCorner   = Vect3_NewScalar(  999999 );
	this.lclMaxCorner   = Vect3_NewScalar( -999999 );
	this.AABB = new AABB( this.lclMinCorner, this.lclMaxCorner );

	this.otType = OT_TYPE_QuadMesh;

	//animation classes
	//keyframe animation has basis meshes and an ipo curve for each giving weight at time
	this.keyAnimation    = null; //new MeshKeyAnimation(  this.meshName, this.sceneName );


	//request the local to world matrix animation
	//ipo animation affects the root transformation of the quadmesh
	this.ipoAnimation    = null;

	//the per vertex weighted transformation heiracy animation possibly applied to multiple quadmeshes
	this.skelAnimation = null;


	this.lastMeshUpdateTime = -0.5;


	//geometry query function
	//this.GetBoundingPlanes = function() { return {1:{}, 2:{} }; }

	this.AABBUpdateTime = -1;

	//read in the materials file
	let matFileName = "scenes/" + this.sceneName + "/meshMaterials/" + 
									this.meshName + ".hvtMeshMat";	

	loadTextFile( matFileName, QM_matFileLoaded, this );
	//when completed calls to mat file loaded above

}

//scanline functionality
////////////////////////

//calculate per vertex normals from face averaged normals
//calculated from vertex position coordinates
function QM_SL_GenerateNormalCoords( vertNormals, faces, positionCoords ){

    //zero the output accumulator
    for( let i in vertNormals )
        vertNormals[i] = 0;

    //for each face generate an accumulated normal vector
    for(let i=0; i<faces.length; ++i)
    {
        let numVertIdxs = faces[i].numFaceVerts;
        if(numVertIdxs < 3)
            DPrintf("GenerateNormalCoords: expected 3 or more vertIdx's, got: %i", numVertIdxs);
        //newell's method
        let normal = [0,0,0];
        //go through all of the verticies in the face
        for(let j=0; j<numVertIdxs; ++j)
        {
            //fetch 3 verticies from the face (to get two edges to compute a normal from)
            let vIdx0 = faces[i].vertIdxs[(0+j)%numVertIdxs];
            let vIdx1 = faces[i].vertIdxs[(1+j)%numVertIdxs];
            let vIdx2 = faces[i].vertIdxs[(2+j)%numVertIdxs];
            //vertCard is the cardinality of a vertex (3 x y z)
            let v0 = [positionCoords[vIdx0*vertCard+0],
                      positionCoords[vIdx0*vertCard+1],
                      positionCoords[vIdx0*vertCard+2]];
            let v1 = [positionCoords[vIdx1*vertCard+0],
                      positionCoords[vIdx1*vertCard+1],
                      positionCoords[vIdx1*vertCard+2]];
            let v2 = [positionCoords[vIdx2*vertCard+0],
                      positionCoords[vIdx2*vertCard+1],
                      positionCoords[vIdx2*vertCard+2]];

            //calculate the relative vectors (relative to the current middle vert)
            //(vectors in the direction of the edges of the face from v1->v0 and v1->v2)
            Vect3_Subtract(v0, v1);
            Vect3_Subtract(v2, v1);
            //calculate the normal (orthogonal vector to the edge vectors)
            let crossProd = [];
            Vect3_Cross(crossProd, v2, v0); //normal is the cross product of the relative vectors
            Vect3_Add(normal, crossProd); //average the contribution of the sub edges of the face
        }
        //normalize the accumulation of normals from the edge pairs of the face 
        Vect3_Unit(normal); //possibly optional or to be changed so that faces with more / less vertices
        //contribute more to the per vertex normal

        //accumulate the face normal back to each vertex
        for(let j=0; j<numVertIdxs; ++j)
        {
            //add the new normal to it
            let vertIdx = (faces[i].vertIdxs[j])*normCard;
            let tempAccum = [];
            Vect3_Copy(tempAccum, [ vertNormals[vertIdx+0],
                                    vertNormals[vertIdx+1],
                                    vertNormals[vertIdx+2] ]);
            Vect3_Add(tempAccum, normal);
            vertNormals[vertIdx+0] = tempAccum[0];
            vertNormals[vertIdx+1] = tempAccum[1];
            vertNormals[vertIdx+2] = tempAccum[2];
            
        } //end write normal data
    } //end for each face

    //normalize the accumulated face normals vectors for each  make the normals unit length (average output)
    for(let i=0; i<positionCoords.length; ++i){
        let idx = i*normCard;
        let len = Vect3_Length( [ vertNormals[idx+0],
                                  vertNormals[idx+1],
                                  vertNormals[idx+2] ] );
        vertNormals[idx+0] /= len;
        vertNormals[idx+1] /= len;
        vertNormals[idx+2] /= len;
    }
}

//used to tesselate position coordinates
//(convert from quad and triangle faces to only triangles
//3 verticies per face) for rendering with webgl 
function QM_SL_tesselateCoords( coords,
                                faces, faceIdxs, numFaceIdxs,
                                inputCoords, startIdx ){
	let cI = startIdx*vertCard;

	//create the vertex array
	for(let i=0; i<numFaceIdxs; ++i){
		let face = faces[faceIdxs[i]];
		let numFaceVerts = face.numFaceVerts;
		if(numFaceVerts == 3){ //triangle
			for(let j=0; j<numFaceVerts; ++j){
				let coordIdx = (face.vertIdxs[j])*vertCard;
				coords[cI++] = inputCoords[coordIdx];
				coords[cI++] = inputCoords[coordIdx+1];
				coords[cI++] = inputCoords[coordIdx+2];
			}
		}
		else if(numFaceVerts == 4) //quad. tesselate into two triangles
		{
			let coordIdx = (face.vertIdxs[0])*vertCard;
			Vect_CopyToFromArr( coords, cI, inputCoords, coordIdx, 3 );
			cI +=3;

			coordIdx = (face.vertIdxs[1])*vertCard;
			Vect_CopyToFromArr( coords, cI, inputCoords, coordIdx, 3 );
			cI +=3;

			coordIdx = (face.vertIdxs[2])*vertCard;
			Vect_CopyToFromArr( coords, cI, inputCoords, coordIdx, 3 );
			cI +=3;

			coordIdx = (face.vertIdxs[2])*vertCard;
			Vect_CopyToFromArr( coords, cI, inputCoords, coordIdx, 3 );
			cI +=3;

			coordIdx = (face.vertIdxs[3])*vertCard;
			Vect_CopyToFromArr( coords, cI, inputCoords, coordIdx, 3 );
			cI +=3;

			coordIdx = (face.vertIdxs[0])*vertCard;
			Vect_CopyToFromArr( coords, cI, inputCoords, coordIdx, 3 );
			cI +=3;
		}
	}
	//if(cI != coords.length)
	//	DPrintf("GenerateCoords: unexpected number of vertCoords generated.\n");
	return cI/vertCard; //return the number of coordinates
}

function QM_SL_tesselateUVCoords( 
	uvCoords, 
	faces, faceIdxs, numFaceIdxs,
	startIdx ){
	
	let cI = startIdx*uvCard;

	//create the vertex index array
	for(let i=0; i<numFaceIdxs; ++i)
	{
		let face = faces[faceIdxs[i]];
		let vertsSize = face.numFaceVerts;
		
		if( vertsSize == 3) //triangle
		{
			for(let j=0; j<3*uvCard; j+=uvCard)
			{
				uvCoords[cI++] = face.uvs[j+0];
				uvCoords[cI++] = face.uvs[j+1];
			}
		}
		else if(vertsSize == 4) //quad. tesselate into two triangles
		{
			uvCoords[cI++] = face.uvs[0*uvCard+0];
			uvCoords[cI++] = face.uvs[0*uvCard+1];

			uvCoords[cI++] = face.uvs[1*uvCard+0];
			uvCoords[cI++] = face.uvs[1*uvCard+1];

			uvCoords[cI++] = face.uvs[2*uvCard+0];
			uvCoords[cI++] = face.uvs[2*uvCard+1];

			uvCoords[cI++] = face.uvs[2*uvCard+0];
			uvCoords[cI++] = face.uvs[2*uvCard+1];

			uvCoords[cI++] = face.uvs[3*uvCard+0];
			uvCoords[cI++] = face.uvs[3*uvCard+1];

			uvCoords[cI++] = face.uvs[0*uvCard+0];
			uvCoords[cI++] = face.uvs[0*uvCard+1];
		}
	}
	return cI/uvCard;
}

let idx1      = 0;
let wght1     = 0;
let idx2      = 0;
let wght2     = 0;
let tempIdx   = 0;
let tempWght  = 0;
let wghtTot   = 0;
let accumWght = 0;
let numWghts  = 0;
function getMostSignificantBoneIdxWghtsForVert(weights){

	//init to zero idx (default identity matrix) if there are'nt weights for the vertex
	idx1  = -1;
	wght1 =  0;
	idx2  = -1;
	wght2 =  0;

	wghtTot = 0;
	numWghts  = 0;

	if( weights != undefined ){
		for( let boneIdx in weights ){
			tempIdx = parseInt(boneIdx);
			tempWght = weights[boneIdx];
			wghtTot += tempWght;
			if( tempWght > wght1 ){
				//replace 1 with temp and put 1 in 2
				wght2 = wght1;
				idx2 = idx1;
				wght1 = tempWght;
				idx1 = tempIdx;
				numWghts += 1;
			}else if( tempWght > wght2 ){
				//replace 2 with temp
				wght2 = tempWght;
				idx2 = tempIdx;
				numWghts += 1;
			}
		}
		
		
		//normalize weights
		if(numWghts == 0){
			wght1 = 0.5;
			wght2 = 0.5;
		}else{
		
			accumWght = wght1 + wght2;
			/*
			if(accumWght < wghtTot){ //more than 2 weights
				wght1 *= wghtTot/accumWght;
				wght2 *= wghtTot/accumWght;
			}else{ //2 or less weights
				if( numWghts == 1 ){ //give remaining weight to unassigned index
					if( idx1 < 0 )
						wght1 = 1-accumWght;
					else
						wght2 = 1-accumWght;
				}
				wght1 /= accumWght;
				wght2 /= accumWght;
			}
			*/
			wght1 /= accumWght;
			wght2 /= accumWght;
		}
		
	}

}
function writeIdxWeights(bnIdxWghts, cI, matOffset){

	if( idx1 < 0 ){
		bnIdxWghts[cI++] = 0;
		bnIdxWghts[cI++] = wght1;
	}else{
		bnIdxWghts[cI++] = idx1 + matOffset;
		bnIdxWghts[cI++] = wght1;
	}
	
	if( idx2 < 0 ){
		bnIdxWghts[cI++] = 0;
		bnIdxWghts[cI++] = wght2;
	}else{
		bnIdxWghts[cI++] = idx2 + matOffset;
		bnIdxWghts[cI++] = wght2;
	}
	
}
function getAndCopyMostSignificantWeightsForIdx( 
	bnIdxWghts, coordIdx, cI, 
	vertBoneWeights, matOffset ){
	let weights = vertBoneWeights[coordIdx];
	getMostSignificantBoneIdxWghtsForVert(weights);
	writeIdxWeights(bnIdxWghts, cI, matOffset );
}

function QM_SL_tesselateBoneIdxWghtCoords( 
	bnIdxWghts, vertBoneWeights, 
	faces, faceIdxs, numFaceIdxs,
	startIdx, matOffset ){
	let cI = startIdx*bnIdxWghtCard;

	//tesselate the vertBoneWeights according to the face vert idxs
	//create the vertex array
	for(let i=0; i<numFaceIdxs; ++i){
		let face = faces[faceIdxs[i]];
		let numFaceVerts = face.numFaceVerts;
		if(numFaceVerts == 3){ //triangle
			for(let j=0; j<numFaceVerts; ++j){
				let coordIdx = (face.vertIdxs[j]);
				getAndCopyMostSignificantWeightsForIdx( 
					bnIdxWghts, coordIdx, cI, vertBoneWeights, matOffset );
				cI += bnIdxWghtCard;
			}
		}
		else if(numFaceVerts == 4) //quad. tesselate into two triangles
		{
			let coordIdx = (face.vertIdxs[0]);
			getAndCopyMostSignificantWeightsForIdx(
				bnIdxWghts, coordIdx, cI, vertBoneWeights, matOffset );
			cI += bnIdxWghtCard;

			coordIdx = (face.vertIdxs[1]);
			getAndCopyMostSignificantWeightsForIdx( 
				bnIdxWghts, coordIdx, cI, vertBoneWeights, matOffset );
			cI += bnIdxWghtCard;

			coordIdx = (face.vertIdxs[2]);
			getAndCopyMostSignificantWeightsForIdx(
				bnIdxWghts, coordIdx, cI, vertBoneWeights, matOffset );
			cI += bnIdxWghtCard;

			coordIdx = (face.vertIdxs[2]);
			getAndCopyMostSignificantWeightsForIdx( 
				bnIdxWghts, coordIdx, cI, vertBoneWeights, matOffset );
			cI += bnIdxWghtCard;

			coordIdx = (face.vertIdxs[3]);
			getAndCopyMostSignificantWeightsForIdx( 
				bnIdxWghts, coordIdx, cI, vertBoneWeights, matOffset );
			cI += bnIdxWghtCard;

			coordIdx = (face.vertIdxs[0]);
			getAndCopyMostSignificantWeightsForIdx( 
				bnIdxWghts, coordIdx, cI, vertBoneWeights, matOffset );
			cI += bnIdxWghtCard;
		}
	}
	return cI/bnIdxWghtCard;
}

//draw interface
function QM_SL_GenerateDrawVertsNormsUVsForMat( qm, drawBatch, startIdx, matIdx, subBatchBuffer ){
	//since quad meshes are a mixture of quads and tris,
	//use the face vertex indices to tesselate the entire mesh into
	//tris, calculate face normals, upload to gl and draw

	if(!qm.isValid){
		DPrintf("QuadMesh::Draw: failed to draw.\n");
		//drawBatch.isValid = false;
		return;
	}


	if( qm.isAnimated || drawBatch.isAnimated ){
		drawBatch.isAnimated = true;
	}



	let numGenVerts = 0;

	//update the arrays the first time and if there is a vertex modifying (meshKey) animation
	if( /*drawBatch.isAnimated ||*/ drawBatch.bufferUpdated /*|| qm.skelAnimation*/ ){//|| qm.keyAnimation){

		if( qm.skelAnimation ){
			subBatchBuffer.skelAnim = qm.skelAnimation;

			////
			//Generate the bone idx weight coordinates (per vertex)
			/////////////////////////////////////////////////////////////

			QM_SL_tesselateBoneIdxWghtCoords( 
				drawBatch.bnIdxWghtBuffer, qm.vertBoneWeights, 
				qm.faces, qm.faceIdxsForMat[matIdx], qm.faceIdxsForMatInsertIdx[matIdx],
				startIdx, qm.skelAnimation.combinedBoneMatOffset );
		}

		drawBatch.bufferUpdated = true;
		
		

		//
		///Assume model has been updated (source of mesh vertex data)
		////////////////////////////////////////////////////////////

		//let transformedPositions = qm.transformedVerts;

		//
		///Generate the vertex position coordinates
		////////////////////////////////////////////////////////////

		//tesselate the vertex positions
		numGenVerts = QM_SL_tesselateCoords( 
			drawBatch.vertBuffer,
			qm.faces, qm.faceIdxsForMat[matIdx], qm.faceIdxsForMatInsertIdx[matIdx],
			qm.transformedVerts, startIdx );

		////
		//Generate the vertex normal coordinates
		////////////////////////////////////////////////////////////

		//generate & tesselate the normal coords from the batch of verts currently being used

		//let normalCoords = new Float32Array(transformedPositions.length);
		//this.GenerateNormalCoords(normals, this.faces, transformedPositions);
		//this.tesselateCoords(normals, this.faces, normalCoords);
		//QM_SL_GenerateNormalCoords(normals, this.faces, normalCoords);


		////
		//Generate the texture coordinates (per vertex)
		/////////////////////////////////////////////////////////////

		QM_SL_tesselateUVCoords(
			drawBatch.uvBuffer,
			qm.faces, qm.faceIdxsForMat[matIdx], qm.faceIdxsForMatInsertIdx[matIdx],
			startIdx );


		qm.hasntDrawn = false;
		
		
		drawBatch.numSubBufferUpdatesToBeValid -= 1;
	}

	return numGenVerts;
}


//ray trace functionality
///////////////////////////
/*
//called during ray trace rendering
	//returns the ray distance, surface normal, and color at the intersection pt
let tempRay = new Ray( Vect3_New(), Vect3_New() );
function QM_GetRayIntersection(qm, retDisNormCol, ray ){

	retDisNormCol[3] = qm;
	Matrix_Multiply_Vect3( tempRay.origin, qm.wrldToLclMat, ray.origin );
	Matrix_Multiply_Vect3( tempRay.norm, qm.wrldToLclMat, ray.norm, 0 );
	tempRay.lastNode = ray.lastNode;
	//oct tree of faces of the mesh used to speed up ray triangle intersection tests
	TND_StartTrace( qm.octTree, retDisNormCol, tempRay, 0 );
	ray.lastNode = tempRay.lastNode;

}

let noMaterialColor = [0.5,0.2,0.7,1.0];
function QM_GetMaterialColorAtUVCoord( qm, color, uv, matID ){
	//method from rasterization was to asynchronously load the material
	//and bind it, impractical for query based rays where each ray
	//may reach a different material
	//need to make sure the materials in each mesh are loaded before rendering
	//though may be good to keep them stored in scene global dictionary to
	//avoid duplicate per mesh loading/instancing of materials and materials
	//graphics.GetMaterial( filename, sceneName, 
	//     readyCallbackParams, materialReadyCallback ) )
	if( qm.materials[matID] )
		return qm.materials[matID].GetColorAtUVCoord( color, uv );
	else
		return noMaterialColor; //use a solid color until materials and textures
		//for raytracing implemented
}

//thisP is from the caller of this function, 
//so the callback can return to the same context
function QM_IsTransparent(qm, callback)
{
	graphics.GetMaterial( qm.materialNames[0], qm.sceneName, callback,
		function( material, cb ){
			cb( material.IsTransparent(), qm );
		});
}
*/

//update / initialize functionality
///////////////////////////

//updates the non tessilated "transformedVerts" with the mesh animation/simulation
//transformed verts are in mesh space
//(need to have the orientation matrix
//applied for world space coordinates)
function QM_UpdateTransformedVerts(qm, time){
	let updated = false;
	let transformedVertCoords = null;
	
	//use the unmodified vertex coordinates from the appropriate
	//animation type
	if(qm.keyedPositions.length != 0)
		transformedVertCoords = qm.keyedPositions; //keyframe animated positions
	else
		transformedVertCoords = qm.vertPositions;  //static vert positions
	
	//update the coordinates with the animation / simulation type
	if( qm.skelAnimation != null )
		updated = SkelA_GenerateMesh(qm.skelAnimation, qm, time );
	
	//if there are skel anim transforms, they occur in the vertex shader
	qm.transformedVerts = transformedVertCoords;
	
	
	return updated;
}

/*
function QM_PrintHierarchy(qm, name, par){
	qm.octTree.PrintHierarchy(name, par);
}
*/

//update the quadmesh to world transformation
let tempMat = new Float32Array(4*4);
function QM_UpdateToWorldMatrix(qm, time){
	if( qm.lastToWorldMatrixUpdateTime == time )
		return false;
	if( qm.ipoAnimation != null ){
		IPOA_GetMatrix( qm.ipoAnimation, qm.toWorldMatrix, time );
		//if there is an ipo animation, ignore the quadmesh animations
		//and over write it's world to local matrix for getRayIntersection
	}else{
		Matrix( qm.toWorldMatrix, 
				MatrixType.quat_transformation, 
				qm.scale, qm.rotation, qm.origin );
	}
	Matrix_Copy(tempMat, qm.toWorldMatrix );
	Matrix_Inverse( qm.wrldToLclMat, tempMat );
	qm.lastToWorldMatrixUpdateTime = time;
	
	return true;
}

let tempVert = Vect3_New();
//get the axis aligned bounding box of the mesh
function QM_UpdateAABB(qm, time) {
	if( qm.AABBUpdateTime < time ){
		qm.AABBUpdateTime = qm.lastMeshUpdateTime;

		Vect3_SetScalar( qm.worldMinCorner,  999999 );
		Vect3_SetScalar( qm.worldMaxCorner, -999999 );

		Matrix_Multiply_Vect3( tempVert, qm.toWorldMatrix,  qm.lclMinCorner);
		Vect3_minMax( qm.worldMinCorner, qm.worldMaxCorner, tempVert);
		Matrix_Multiply_Vect3( tempVert, qm.toWorldMatrix,  qm.lclMaxCorner);
		Vect3_minMax( qm.worldMinCorner, qm.worldMaxCorner, tempVert);


		AABB_UpdateMinMaxCenter(qm.AABB, qm.worldMinCorner, qm.worldMaxCorner );
	}
}
/*
//generate local space triangles from a face index
let tempVert = new Array(3);
let tempVert1 = new Array(3);
let minf = Vect3_NewScalar(  999999 );
let maxf = Vect3_NewScalar( -999999 );
function QM_UpdateFaceAABBAndTriangles( qm, f ){
	const face = qm.faces[f];

	//initialized to opposite extrema to accept any value at first
	Vect3_SetScalar( minf,  999999 );
	Vect3_SetScalar( maxf, -999999 );
	//DTPrintf("updt f AABB " + f, "quadM updt");
	for( let v = 0; v < face.numFaceVerts; ++v ){

		Vect3_CopyFromArr( tempVert, qm.transformedVerts, face.vertIdxs[v]*vertCard );
		//DTPrintf("v " + v + " " + Vect_FixedLenStr(tempVert, 4, 7), "quadM updt");
		Vect3_minMax( minf, maxf, tempVert );
		Vect3_minMax( qm.lclMinCorner, qm.lclMaxCorner, tempVert );
		//Matrix_Multiply_Vect3( tempVert1, qm.toWorldMatrix, tempVert );
		//Vect3_minMax( qm.worldMinCorner, qm.worldMaxCorner, tempVert1 );
	}
	//DTPrintf("f " + f + " min " + Vect_FixedLenStr(minf, 4, 7) + " max " + Vect_FixedLenStr(maxf, 4, 7), "quadM updt");
	AABB_UpdateMinMaxCenter(face.AABB, minf, maxf );
	//qm.faces[f].cubeSide = minMaxToCSide(qm.faces[f].AABB); //for debugging (outputs name of face on 6 sided cube mesh)
	
	//re-setup the triangles local space verts
	for( let t = 0; t < face.numFaceVerts/vertCard; ++t){
		if( face.triIdxs[t] < 0)
			break;
		let tri = qm.tris[face.triIdxs[t]];
		TRI_Setup( tri, t, face, qm.transformedVerts );
	}

}

function QM_UpdateOctTree(qm, octUpdateCmpCallback){
	//update the local space oct tree of faces for the current time
	//to minimize triangle ray intersection tests
	
	Vect3_SetScalar( qm.lclMinCorner  ,  999999 );
	Vect3_SetScalar( qm.lclMaxCorner  , -999999 );
	Vect3_SetScalar( qm.worldMinCorner,  999999 );
	Vect3_SetScalar( qm.worldMaxCorner, -999999 );
	
	for( let f = 0; f < qm.faces.length; ++f ){
		//get an aabb around the face and insert it into an oct tree
		QM_UpdateFaceAABBAndTriangles( qm, f );
	}
	
	qm.octTree = new TreeNode( qm.lclMinCorner, qm.lclMaxCorner, null );
	qm.octTree.name = qm.meshName + " quadMesh";
	
	for( let f = 0; f < qm.faces.length; ++f ){
		let nLvsMDpth = [0, 0];
		subDivAddDepth = 0;
		//DTPrintf("f " + f + " min " + 
		//	Vect_FixedLenStr(qm.faces[f].AABB.minCoord, 4, 7) + " max " + 
		//	Vect_FixedLenStr(qm.faces[f].AABB.maxCoord, 4, 7), "quadM updt");
		TND_AddObject(qm.octTree, nLvsMDpth, qm.faces[f]);
	}
	//octUpdateCmpCallback();
}
*/

//using the MeshKeyAnimation
//update the current mesh (used by skeletal animation if present) 
//to the current animationFrame
function QM_Update( qm, animationTime ) {

	let vertsUpdated = false;
	//if the new update time is newer (don't update twice for the same frame)
	if( animationTime > qm.lastMeshUpdateTime ){
		
		let worldTransformUpdated = QM_UpdateToWorldMatrix(qm, animationTime );
		
		vertsUpdated = QM_UpdateTransformedVerts(qm, animationTime );
		if( vertsUpdated || qm.lastMeshUpdateTime < 0){ //than rebuild the face octTree
			if( rayCastDrawing ){
				octTreeDivLogElm.innerHTML += "<br/>update " + qm.meshName + "<br/>";
				QM_UpdateOctTree(qm); //updates world space min and max corners
			}
		}
		
		
		if( worldTransformUpdated || vertsUpdated || qm.lastMeshUpdateTime < 0){ //then update the AABB
			QM_UpdateAABB( qm, animationTime );
		}
		
		qm.lastMeshUpdateTime = animationTime > 0 ? animationTime : 0;
	}
}

function QM_Reset(qm){
	qm.lastToWorldMatrixUpdateTime = -1;
	qm.AABBUpdateTime = -1;
	qm.lastMeshUpdateTime = -0.5;
	qm.hasntDrawn = true;
	if(qm.skelAnimation) //should be once per armature in a graphics reset function
		qm.skelAnimation.lastUpdateTime = 0;
}


//constructor functionality
///////////////////////////

function QM_CallReadyCallbackIfLoaded(qm){
	if( --qm.componentsToLoad == 0 )
		qm.quadMeshReadyCallback(qm, qm.readyCallbackParameters);
}

function QM_materialReady( material, thisPAndMaterialIdx ){
	thisPAndMaterialIdx[0].materials.splice( thisPAndMaterialIdx[1], 0, material);
	
	if( --thisPAndMaterialIdx[0].materialsToLoad == 0 ){
		//read in the mesh file
		let meshFileName = "scenes/"  + thisPAndMaterialIdx[0].sceneName + 
							"/meshes/" + thisPAndMaterialIdx[0].meshName + ".hvtMesh";
		loadTextFile( meshFileName, QM_meshFileLoaded, thisPAndMaterialIdx[0] );
	}
}

function QM_matFileLoaded(matFile, thisP){
	let matFileLines = matFile.split('\n');


	for( let matIdx in matFileLines ){
		let temp = matFileLines[matIdx].split(' ');
		if( temp[0] == 'n' ){
			thisP.materialsToLoad = parseInt(temp[1]);
		}
		if( temp[0] == 'mat' ){ //name of a material
			let matNameString = temp[1];
			for( let i = 2; i < temp.length; ++i )
				matNameString += ' ' + temp[i];
			thisP.materialNames.push(matNameString);
			//preload the material
			graphics.GetCached( matNameString, thisP.sceneName, Material, null,
			QM_materialReady, [thisP, thisP.materialNames.length-1] );
		}
	}
	let numMaterials = thisP.materialNames.length;
	if( numMaterials < 1 ){
		DPrintf('QuadMesh: ' + thisP.meshName + 
			', failed to read any materials, loading default material');
		thisP.materialNames.push("default");
		thisP.materialsToLoad = 1;
		numMaterials = 1;
		//preload the material
		graphics.GetCached( 'default', 'default', Material, null,
		QM_materialReady, [thisP, numMaterials-1] );
	}

	thisP.faceIdxsForMatInsertIdx = new Array(numMaterials);
	thisP.faceVertsCtForMat = new Array( numMaterials );
	for(let i = 0; i < numMaterials; ++i ){
		thisP.faceIdxsForMatInsertIdx[i] = 0;
		thisP.faceVertsCtForMat[i] = 0;
	}
	thisP.faceIdxsForMat = new Array( numMaterials );



	//when completed calls mesh file loaded above
}

function QM_ArmatureReadyCallback(armature, qm){
	qm.skelAnimation = armature;
	
	/* //now done in blender exporter
	//finalize the binding between the quadMesh and the skelAnimation
	//by setting the boneID's in the bone weights
	//based on the bone positions
	//in the animation bone list
	for( let i in qm.vertBoneWeights )
		for( let boneName in qm.vertBoneWeights[i] )
			for( let k in qm.skelAnimation.bones )
				if(qm.skelAnimation.bones[k].boneName == boneName)
					qm.vertBoneWeights[i][boneName].boneID = k;
	*/

	QM_CallReadyCallbackIfLoaded(qm);
}

function QM_QM_MeshKeyAnimReadyCallback(meshKeyAnim, qm){
	qm.meshKeyAnim = meshKeyAnim;
	QM_CallReadyCallbackIfLoaded(qm);
}

function QM_IPOAnimReadyCallback(ipoAnim, qm){
	qm.ipoAnimation = ipoAnim;
	QM_CallReadyCallbackIfLoaded(qm);
}

function QM_meshFileLoaded(meshFile, thisP)
{	
	let meshFileLines = meshFile.split('\n');
	
	let numVerts = 0; //value to check for errors
	let faceCt = 0;
	let triCt = 0;
	
	let vertIdx = 0;
	let fIdx = 0;
	let tIdx = 0;
	
	let ipoAnimName = '';
	let meshKeyAnimName = '';
	let skelAnimName = '';
	
	thisP.componentsToLoad = 1;
	
	let temp = meshFileLines[meshFileLines.length-2];
	let words = temp.split(' ');
	if( temp[0] == 'c' && temp[1] == 't' ){
		triCt = words[1];
		//thisP.tris = new Array(triCt);
		//for( let i = 0; i < triCt; ++i )
		//	thisP.tris[i] = new Triangle();
	}else{
		DTPrintf("error parsing tri count " + thisP.meshName, "quadM parse error");
		return;
	}
	
	for( let mLIdx = 0; mLIdx < meshFileLines.length; ++mLIdx )
	{
		temp = meshFileLines[mLIdx];
		words = temp.split(' ');

		//read in the mesh transformation matrix (translate, scale, rotate)
		if( temp[0] == 'm' )
		{
			while( ++mLIdx < meshFileLines.length )
			{
				temp = meshFileLines[mLIdx];
				let words = temp.split(' ');
				//read in the origin rotation and size of the mesh
				if( temp[0] == 'x' ){
					thisP.origin =   new Float32Array([ 
						parseFloat(words[1]), 
						parseFloat(words[2]), 
						parseFloat(words[3]) ] );
				}else if( temp[0] == 'r' ){ //quaternion vec4
					thisP.rotation = new Float32Array([ 
						parseFloat(words[1]), 
						parseFloat(words[2]), 
						parseFloat(words[3]),
						parseFloat(words[4]) ] );
				}else if( temp[0] == 's' ){
					thisP.scale =    new Float32Array([ 
						parseFloat(words[1]), 
						parseFloat(words[2]), 
						parseFloat(words[3]) ] );
				}else if( temp[0] == 'i' ){
					ipoAnimName = words[1];
					thisP.isAnimated = true;
					thisP.componentsToLoad += 1; //need full count of async components to load before loading them
				}else if( temp[0] == 'm' ){
					meshKeyAnimName = words[1];
					thisP.isAnimated = true;
					thisP.componentsToLoad += 1;
				}else if( temp[0] == 'a' ){
					skelAnimName = words[1];
					thisP.isAnimated = true;
					thisP.componentsToLoad += 1;
				}else if( temp[0] == 'e' ){
					if( ipoAnimName != '' )
						graphics.GetCached(ipoAnimName, thisP.sceneName, IPOAnimation, null, QM_IPOAnimReadyCallback, thisP);
					if( meshKeyAnimName != '' )
						graphics.GetCached(meshKeyAnimName, thisP.sceneName, MeshKeyAnimation, null, QM_MeshKeyAnimReadyCallback, thisP);
					if( skelAnimName != '' )
						graphics.GetCached(skelAnimName, thisP.sceneName, SkeletalAnimation, null, QM_ArmatureReadyCallback, thisP);
					break;
				}
			}
		}
		
		

		//read in the number of vertices
		else if( temp[0] == 'c' && temp[1] == 'v' ){
			numVerts = words[1];
			//float32 arrays for compatibility with gl
			thisP.vertPositions = new Float32Array( numVerts * vertCard );
			thisP.vertNormals = new Float32Array( numVerts * vertCard );
			thisP.transformedVerts = new Float32Array( numVerts * vertCard );
			thisP.vertBoneWeights = new Array( numVerts );
			for( let i = 0; i < numVerts; ++i )
				thisP.vertBoneWeights[i] = {};
		}

		//read in a vertex
		else if( temp[0] == 'v' ){
			//read in the position
			let vert = Vect3_NewVals( parseFloat(words[1]), parseFloat(words[2]), parseFloat(words[3]) );
			thisP.vertPositions[vertIdx++] = vert[0];
			thisP.vertPositions[vertIdx++] = vert[1];
			thisP.vertPositions[vertIdx++] = vert[2];
			Vect3_minMax( thisP.lclMinCorner, thisP.lclMaxCorner, vert );

			//read in the normal
			temp = meshFileLines[++mLIdx];
			words = temp.split(' ');
			if( temp[0] != 'n' ){
				DPrintf('QuadMesh: ' + thisP.meshName +
						', error expected vertex normal when reading mesh file');
				return;
			}
			thisP.vertNormals[vertIdx-3] = parseFloat(words[1]);
			thisP.vertNormals[vertIdx-2] = parseFloat(words[2]);
			thisP.vertNormals[vertIdx-1] = parseFloat(words[3]);

			//read in the bone weights until the end of the vertex
			while( ++mLIdx < meshFileLines.length ){
				temp = meshFileLines[mLIdx];
				words = temp.split(' ');
				if( temp[0] == 'w' ){
					let boneIdx = parseInt(words[1]);
					let boneWeight = parseFloat(words[2]);
					let idx = Math.floor((vertIdx-1)/vertCard);
					thisP.vertBoneWeights[idx][boneIdx] = boneWeight;
				}else if( temp[0] == 'e')
					break; //done reading the vertex
			}
		}

		//read in the number of faces
		else if( temp[0] == 'c' && temp[1] == 'f' ){
			faceCt = parseInt(words[1]);
			thisP.faces = new Array(faceCt);
			for( let i = 0; i < faceCt; ++i )
				thisP.faces[i] = new Face();
			for( let i = 0; i < thisP.materials.length; ++i )
				thisP.faceIdxsForMat[i] = new Array( faceCt );
		}
		
		//read in a face
		else if( temp[0] == 'f' ){
			let newFace = thisP.faces[fIdx++];
			//newFace.fNum = fIdx - 1;
			while( ++mLIdx < meshFileLines.length ){
				temp = meshFileLines[mLIdx];
				words = temp.split(' ');

				//read in the material id of the face
				if( temp[0] == 'm' ){
					newFace.materialID = parseInt(words[1]);
					let insertIdx = thisP.faceIdxsForMatInsertIdx[newFace.materialID];
					thisP.faceIdxsForMat[newFace.materialID][insertIdx++] = fIdx-1;
					thisP.faceIdxsForMatInsertIdx[newFace.materialID] = insertIdx;
				}

				//read in the vertex idx's of the face
				if( temp[0] == 'v' ){
					let numFaceVerts = words.length - 1;
					newFace.numFaceVerts = numFaceVerts;
					let vertNumIdx = 1;
					for( ; vertNumIdx < words.length; ++vertNumIdx ){
						let fvertIdx = parseFloat(words[vertNumIdx]);
						if( fvertIdx < 0 || fvertIdx > numVerts ){
							DPrintf( 'QuadMesh: ' + thisP.meshName +
									', face: ' +
									(thisP.faces.length-1).toString()  + 
									', fvertIdx: ' + fvertIdx +
									' is out of range.' );
							return;
						}
						newFace.vertIdxs[vertNumIdx-1] = fvertIdx;
					}
					
					if(numFaceVerts == 3){
						thisP.faceVertsCtForMat[newFace.materialID] += 3;
						thisP.faceVertsCt += 3;
						//TRI_Setup(thisP.tris[tIdx], 0, newFace, thisP.vertPositions );
						//newFace.triIdxs[0] = tIdx++;
					}
					else if(numFaceVerts == 4){
						thisP.faceVertsCtForMat[newFace.materialID] += 6;
						thisP.faceVertsCt += 6; //since will have to tesselate
						//TRI_Setup(thisP.tris[tIdx], 0, newFace, thisP.vertPositions );
						//newFace.triIdxs[0] = tIdx++;
						//TRI_Setup(thisP.tris[tIdx], 1, newFace, thisP.vertPositions );
						//newFace.triIdxs[1] = tIdx++;
					}else{
						DPrintf( 'QuadMesh: ' + thisP.meshName + 
								'reading face: ' +
								(thisP.faces.length-1).toString()  +
								', expected 3 or 4 vertices, instead got: ' + 
								numFaceVerts);
						return;
					}
				}

				//read in the face texture coords
				if( temp[0] == 'u' ){
					for( let wuvIdx = 1; wuvIdx < words.length; wuvIdx += 2 ){
						let u = parseFloat(words[wuvIdx]);
						let v = parseFloat(words[wuvIdx+1]);
						//v = 1.0 - v; 
						// flip the texture vertically if necessay
						newFace.uvs[wuvIdx-1]   = u; //parse idx is +1
						newFace.uvs[wuvIdx] = v;
					}
				}

				//end of face data
				if( temp[0] == 'e' ){
					if( !(newFace.uvs.length/2 >= newFace.numFaceVerts) ){
						DPrintf( 'QuadMesh: ' + thisP.meshName + 
								'reading face: ' + thisP.faces.length  + 
								', expected: ' +  newFace.numFaceVerts + 
								' uv\'s, but got: ' + newFace.uvs.length/2 );
						return;
					}
					break;
				}
			}
		}
	}
	

	if( !(Math.abs(thisP.vertPositions.length - numVerts*3) < 0.01) )
		DPrintf("Quadmesh: verts read mismatch\n");
	else if ( !(Math.abs(thisP.vertNormals.length - numVerts*3) < 0.01) )
		DPrintf("Quadmesh: normals read mismatch\n");
	else
		thisP.isValid = true;


	DPrintf('Quadmesh: ' + thisP.meshName +
			', successfully read in faces: ' + thisP.faces.length + 
			', verts: ' + thisP.vertPositions.length/3 );

	//initialize the aabb if not animated
	QM_UpdateAABB( thisP, 0.0);
	QM_CallReadyCallbackIfLoaded(thisP);

}
