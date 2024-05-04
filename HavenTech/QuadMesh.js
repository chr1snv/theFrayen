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
		this.triIdxs    = new Array(2).fill(-1);
		this.AABB       = new AABB();
		this.overlaps   = [0,0,0]; //octTree.generateMinAndMaxNodes
		this.treeNodes  = {};
		this.fNum = -1;
	}
	GetAABB(){ return this.AABB; }
	RayIntersect( retDisNormCol, ray ){ //retDisNormCol[2] is the quadmesh for getmaterialcolor
		//if( this.fNum != 13 ){
		//	retDisNormCol[0] = -1;//retDisNormCol[4];
		//	retDisNormCol[2] = [1,0,1,1];
		//	return;
		//}
		for( let i = 0; i < this.triIdxs.length; ++i ){
			if( this.triIdxs[i] == -1 )
				break;
			let qMesh = retDisNormCol[3];
			let tri = qMesh.tris[this.triIdxs[i]];
			retDisNormCol[0] = tri.RayTriangleIntersection( retDisNormCol[1], ray, qMesh.transformedVerts, this.vertIdxs[i*2] );
			if( retDisNormCol[0] > 0 ){ //the ray intersects the triangle, find the uv coordinate
				tri.UVCoordOfPoint( uvCoord, tri.pointL, this );
				qMesh.GetMaterialColorAtUVCoord( retDisNormCol[2], uvCoord, this.materialID );
				return;
			}else{
				DTPrintf("didn't intersect", "trace error");
				//retDisNormCol[0] = retDisNormCol[4];
				retDisNormCol[2] = [0,1,1,1];
			}
		}
	}

}

function QuadMesh(nameIn, sceneNameIn, quadMeshReadyCallback, readyCallbackParameters)
{
	this.quadMeshReadyCallback = quadMeshReadyCallback;
	this.readyCallbackParameters = readyCallbackParameters;

	this.meshName        = nameIn;
	this.sceneName       = sceneNameIn;

	this.isValid         = false; //true once loading is complete
	this.isAnimated      = false;

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

	//the mesh data
	this.tris            = [];
	this.faces           = [];
	this.faceVertsCt     = 0;
	this.vertPositions   = null;
	this.vertNormals     = null;
	this.vertBoneWeights = [];
	//this.vertPositionsMin = Vect3_NewZero();
	//this.vertPositionsMax = Vect3_NewZero();

	//animation base mesh
	this.keyedPositions  = [];
	this.skelPositions   = [];

	//the oct tree of the mesh faces (updated with mesh animations)
	const tDim = 100;
	this.octTree = new TreeNode( [-tDim, -tDim, -tDim], [tDim, tDim, tDim], null );
	this.worldMinCorner = Vect3_NewScalar( 999999 );
	this.worldMaxCorner = Vect3_NewScalar( -999999 );
	this.lclMinCorner = Vect3_NewScalar( 999999 );
	this.lclMaxCorner = Vect3_NewScalar( -999999 );
	this.AABB = new AABB( this.lclMinCorner, this.lclMaxCorner );

	//animation classes
	//ipo animation affects the root transformation of the quadmesh
	this.ipoAnimation    = new IPOAnimation(      this.meshName, this.sceneName );
	//keyframe animation has basis meshes and an ipo curve for each giving weight at time
	this.keyAnimation    = new MeshKeyAnimation(  this.meshName, this.sceneName );
	//skeletal animation has bones (heirarchical transformations), ipo curves for
	//properties of each transformation at time and weights for how each vertex
	//is affected by a transformation
	this.skelAnimation   = new SkeletalAnimation( this.meshName, this.sceneName );

	this.lastMeshUpdateTime = -0.5;


	//updates the non tessilated "transformedVerts" with the mesh animation/simulation
	//transformed verts are in mesh space
	//(need to have the orientation matrix
	//applied for world space coordinates)
	this.UpdateTransformedVerts = function(time)
	{
		let updated = false;
		let transformedVertCoords = null;
		
		//use the unmodified vertex coordinates from the appropriate
		//animation type
		if(this.keyedPositions.length != 0)
			transformedVertCoords = this.keyedPositions; //keyframe animated positions
		else if(this.skelPositions.length != 0)
			transformedVertCoords = this.skelPositions;
		else
			transformedVertCoords = this.vertPositions;  //static vert positions
		
		//update the coordinates with the animation / simulation type
		if( this.skelAnimation.isValid )
			updated = this.skelAnimation.GenerateMesh( 
				this.transformedVerts, numVerts, mesh, time, this.lclMinCorner, this.lclMaxCorner);
		else{ //there isn't a simulation use the unmodified base coordinates
			this.transformedVerts = transformedVertCoords;
		}
		
		return updated;
	}

	//update the quadmesh to world transformation
	let tempMat = new Float32Array(4*4);
	this.UpdateToWorldMatrix = function(time){
		if( this.lastToWorldMatrixUpdateTime == time )
			return false;
		Matrix( this.toWorldMatrix, 
				MatrixType.euler_transformation, 
				this.scale, this.rotation, this.origin );
		Matrix_Copy(tempMat, this.toWorldMatrix );
		Matrix_Inverse( this.wrldToLclMat, tempMat );
		this.lastToWorldMatrixUpdateTime = time;
		
		return true;

	}

	//using the MeshKeyAnimation
	//update the current mesh (used by skeletal animation if present) 
	//to the current animationFrame
	this.Update = function(animationTime) {
		//if the new update time is newer (don't update twice for the same frame)
		if( animationTime > this.lastMeshUpdateTime ){

			let vertsUpdated = this.UpdateTransformedVerts(this.lastMeshUpdateTime);
			if( vertsUpdated || this.lastMeshUpdateTime < 0){ //than rebuild the face octTree
				octTreeDivLogElm.innerHTML += "<br/>update " + this.meshName + "<br/>";
				this.UpdateOctTree(); //updates world space min and max corners
			}

			let worldTransformUpdated = this.UpdateToWorldMatrix(this.lastMeshUpdateTime);
			if( worldTransformUpdated || vertsUpdated || this.lastMeshUpdateTime < 0){ //then update the AABB
				this.UpdateAABB(animationTime);
			}

			this.lastMeshUpdateTime = animationTime > 0 ? animationTime : 0;
		}
	}
	this.GetAnimationLength = function() {}

	//used by skeletal animation classes
	this.GetVertsCt = function() { return vertsCt; }
	this.GetVertPosition = function( posRet, idx ) {}

	//used by Model to cache data for later fast lookup
	this.GetVertBoneWeightsSize = function()  { return vertBoneWeights.size(); }
	this.GetVertBoneWeights     = function(i) { return vertBoneWeights[i];     }
	this.SetVertBoneWeights     = function(i) { return vertBoneWeights[i];     }

	//transformation query functions
	this.GetPosition = function(pos)      { Vect3_Copy(pos, this.origin);      }
	this.GetScale    = function(scaleOut) { Vect3_Copy(scaleOut, this.scale);  }
	this.GetRotation = function(rotOut)   { Vect3_Copy(rotOut, this.rotation); }

	//color manipulation functions
	this.GetMaterialName = function() { return [this.materialNames[0], this.sceneName]; }

	this.DrawSkeleton = function() { this.skelAnimation.Draw(); }

	//type query functions
	this.IsHit = function() {}
	//thisP is from the caller of this function, 
	//so the callback can return to the same context
	this.IsTransparent = function(callback, thisP) 
	{
		graphics.GetMaterial( this.materialNames[0], this.sceneName, callback,
			function( material, cb ){
				cb( material.IsTransparent(), thisP );
			});
	}


	this.PrintHierarchy = function(name, par){
		this.octTree.PrintHierarchy(name, par);
		
	}
	//geometry query function
	//this.GetBoundingPlanes = function() { return {1:{}, 2:{} }; }

	this.AABBUpdateTime = -1;
	//get the axis aligned bounding box of the mesh
	this.UpdateAABB = function(time) {
		if( this.AABBUpdateTime < time ){
			this.AABBUpdateTime = this.lastMeshUpdateTime;
			this.AABB.UpdateMinMaxCenter( this.worldMinCorner, this.worldMaxCorner );
		}
	}

	//generate local space triangles from a face index
	let tempVert = new Array(3);
	let tempVert1 = new Array(3);
	//let uv0 = new Float32Array(2);
	//let uv1 = new Float32Array(2);
	//let uv2 = new Float32Array(2);
	let minf = Vect3_NewScalar(  999999 );
	let maxf = Vect3_NewScalar( -999999 );
	this.UpdateFaceAABBAndTriangles = function( f ){
		const face = this.faces[f];
		
		//initialized to opposite extrema to accept any value at first
		Vect3_SetScalar( minf,  999999 );
		Vect3_SetScalar( maxf, -999999 );
		//DTPrintf("updt f AABB " + f, "quadM updt");
		for( let v = 0; v < face.numFaceVerts; ++v ){
		
			Vect3_CopyFromArr( tempVert, this.transformedVerts, face.vertIdxs[v]*vertCard );
			//DTPrintf("v " + v + " " + Vect_FixedLenStr(tempVert, 4, 7), "quadM updt");
			Vect3_minMax( minf, maxf, tempVert );
			Vect3_minMax( this.lclMinCorner, this.lclMaxCorner, tempVert );
			Matrix_Multiply_Vect3( tempVert1, this.toWorldMatrix, tempVert );
			Vect3_minMax( this.worldMinCorner, this.worldMaxCorner, tempVert1 );
		}
		//DTPrintf("f " + f + " min " + Vect_FixedLenStr(minf, 4, 7) + " max " + Vect_FixedLenStr(maxf, 4, 7), "quadM updt");
		face.AABB.UpdateMinMaxCenter( minf, maxf );
		//this.faces[f].cubeSide = minMaxToCSide(this.faces[f].AABB); //for debugging (outputs name of face on 6 sided cube mesh)
		
		//re-setup the triangles local space verts
		for( let t = 0; t < face.numFaceVerts/vertCard; ++t){
			if( face.triIdxs[t] < 0)
				break;
			let tri = this.tris[face.triIdxs[t]];
			tri.Setup( t, face, this.transformedVerts );
		}

	}
	//let faceMin = new Float32Array(3);
	//let faceMax = new Float32Array(3);
	this.UpdateOctTree = function(octUpdateCmpCallback){
		//update the local space oct tree of faces for the current time
		//to minimize triangle ray intersection tests
		
		Vect3_SetScalar( this.lclMinCorner  ,  999999 );
		Vect3_SetScalar( this.lclMaxCorner  , -999999 );
		Vect3_SetScalar( this.worldMinCorner,  999999 );
		Vect3_SetScalar( this.worldMaxCorner, -999999 );
		
		for( let f = 0; f < this.faces.length; ++f ){
			//get an aabb around the face and insert it into an oct tree
			this.UpdateFaceAABBAndTriangles( f );
		}
		
		this.octTree = new TreeNode( this.worldMinCorner, this.worldMaxCorner, null );
		this.octTree.name = this.meshName + " quadMesh";
		
		for( let f = 0; f < this.faces.length; ++f ){
			let nLvsMDpth = [0, 0];
			subDivAddDepth = 0;
			//DTPrintf("f " + f + " min " + 
			//	Vect_FixedLenStr(this.faces[f].AABB.minCoord, 4, 7) + " max " + 
			//	Vect_FixedLenStr(this.faces[f].AABB.maxCoord, 4, 7), "quadM updt");
			this.octTree.AddObject(nLvsMDpth, this.faces[f]);
		}
		//octUpdateCmpCallback();
	}

	//called during ray trace rendering
	//returns the ray distance, surface normal, and color at the intersection pt
	//let face;
	//let tri;
	//let startNode;
	let tempVec = Vect3_New();
	this.GetRayIntersection = function( retDisNormCol, ray ){
		
		//to speed up this loop, use the oct tree of faces of the mesh
		retDisNormCol[3] = this;
		Vect3_Copy( tempVec, ray.origin );
		Matrix_Multiply_Vect3( ray.origin, this.wrldToLclMat, tempVec );
		Vect3_Copy( tempVec, ray.norm );
		Matrix_Multiply_Vect3( ray.norm, this.wrldToLclMat, tempVec, 0 );
		this.octTree.StartTrace( retDisNormCol, ray, 0 );
	}

	this.GetMaterialColorAtUVCoord = function( color, uv, matID ){
		//method from rasterization was to asynchronously load the material
		//and bind it, impractical for query based rays where each ray
		//may reach a different material
		//need to make sure the materials in each mesh are loaded before rendering
		//though may be good to keep them stored in scene global dictionary to
		//avoid duplicate per mesh loading/instancing of materials and materials
		//graphics.GetMaterial( filename, sceneName, 
		//     readyCallbackParams, materialReadyCallback ) )
		if( this.materials[matID] )
			return this.materials[matID].GetColorAtUVCoord( color, uv );
		else
			return [0.5,0.2,0.7,1.0]; //use a solid color until materials and textures
			//for raytracing implemented

	}

	//constructor functionality
	///////////////////////////

	this.meshFileLoaded = function(meshFile, thisP)
	{	
		let meshFileLines = meshFile.split('\n');
		
		
		let numVerts = 0; //value to check for errors
		let faceCt = 0;
		let triCt = 0;
		
		let vertIdx = 0;
		let fIdx = 0;
		let tIdx = 0;
		
		let temp = meshFileLines[meshFileLines.length-2];
		let words = temp.split(' ');
		if( temp[0] == 'c' && temp[1] == 't' ){
			triCt = words[1];
			thisP.tris = new Array(triCt);
			for( let i = 0; i < triCt; ++i )
				thisP.tris[i] = new Triangle();
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
							parseFloat(words[3]) ] );}
					else if( temp[0] == 'r' ){
						thisP.rotation = new Float32Array([ 
							parseFloat(words[1]), 
							parseFloat(words[2]), 
							parseFloat(words[3]) ] );}
					else if( temp[0] == 's' ){
						thisP.scale =    new Float32Array([ 
							parseFloat(words[1]), 
							parseFloat(words[2]), 
							parseFloat(words[3]) ] );}
					else if( temp[0] == 'e' ){
						break;}
				}
			}

			//read in the number of vertices
			else if( temp[0] == 'c' && temp[1] == 'v' ){
				numVerts = words[1];
				thisP.vertPositions = new Float32Array( numVerts * vertCard );
				thisP.vertNormals = new Float32Array( numVerts * vertCard );
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
				let boneWeights = {};
				while( ++mLIdx < meshFileLines.length ){
					temp = meshFileLines[mLIdx];
					words = temp.split(' ');
					if( temp[0] == 'w' ){
						let boneName = words[1];
						let boneWeight = parseFloat(words[2]);
						boneWeights[boneName] = boneWeight;}
					else if( temp[0] == 'e')
						break; //done reading the vertex
				}
				thisP.vertBoneWeights.push(boneWeights);
			}

			//read in the number of faces
			else if( temp[0] == 'c' && temp[1] == 'f' ){
				faceCt = words[1];
				thisP.faces = new Array(faceCt);
				for( let i = 0; i < faceCt; ++i )
					thisP.faces[i] = new Face();
			}
			
			//read in a face
			else if( temp[0] == 'f' ){
				let newFace = thisP.faces[fIdx++];
				newFace.fNum = fIdx - 1;
				while( ++mLIdx < meshFileLines.length ){
					temp = meshFileLines[mLIdx];
					words = temp.split(' ');

					//read in the material id of the face
					if( temp[0] == 'm' )
						newFace.materialID = parseInt(words[1]);

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
							thisP.faceVertsCt += 3;
							thisP.tris[tIdx].Setup( 0, newFace, thisP.vertPositions );
							newFace.triIdxs[0] = tIdx++;
						}
						else if(numFaceVerts == 4){
							thisP.faceVertsCt += 6; //since will have to tesselate
							thisP.tris[tIdx].Setup( 0, newFace, thisP.vertPositions );
							newFace.triIdxs[0] = tIdx++;
							thisP.tris[tIdx].Setup( 1, newFace, thisP.vertPositions );
							newFace.triIdxs[1] = tIdx++;
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
						if( !(newFace.uvs.length/2 >= newFace.vertIdxs.length) ){
							DPrintf( 'QuadMesh: ' + thisP.meshName + 
									'reading face: ' + thisP.faces.length  + 
									', expected: ' + newFace.vertIdxs.length + 
									' uv\'s, but got: ' + newFace.uvs.length/2 );
							//return;
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

		//copy the normals and verticies into a float32 array 
		//for compatibility with gl
		//thisP.vertPostions = new Float32Array(thisP.vertPositions);
		//thisP.vertNormals  = new Float32Array(thisP.vertNormals);

		//initialize the animation
		//if( thisP.ipoAnimation.isValid || 
		//	thisP.keyAnimation.isValid || 
		//	thisP.skelAnimation.isValid ){
		//	thisP.isAnimated = true;
			thisP.Update(0.0);
		//}

		DPrintf('Quadmesh: ' + thisP.meshName +
				', successfully read in faces: ' + thisP.faces.length + 
				', verts: ' + thisP.vertPositions.length/3 );

		//finalize the binding between the quadMesh and the skelAnimation
		//by setting the boneID's in the bone weights 
		//based on the bone positions
		//in the animation bone list
		for( var i in thisP.vertBoneWeights )
			for( var boneName in thisP.vertBoneWeights[i] )
				for( var k in thisP.skelAnimation.bones )
					if(thisP.skelAnimation.bones[k].boneName == boneName)
						thisP.vertBoneWeights[i][boneName].boneID = k;
		thisP.quadMeshReadyCallback(thisP, thisP.readyCallbackParameters);
	}

	//read in the materials file
	var matFileName = "scenes/" + this.sceneName + "/meshMaterials/" + 
 									this.meshName + ".hvtMeshMat";

	this.materialReady = function( material, thisPAndMaterialIdx ){
		thisPAndMaterialIdx[0].materials.splice( thisPAndMaterialIdx[1], 0, material);
	}

	this.matFileLoaded = function(matFile, thisP){
		var matFileLines = matFile.split('\n');

		for( var matIdx in matFileLines ){
			var temp = matFileLines[matIdx].split(' ');
			if( temp[0] == 'mat' ){ //name of a material
				thisP.materialNames.push(temp[1]);
				//preload the material
				graphics.GetMaterial( temp[1], thisP.sceneName, 
				[thisP, thisP.materialNames.length-1], thisP.materialReady );
			}
		}
		if( thisP.materialNames.length < 1 ){
			DPrintf('QuadMesh: ' + thisP.meshName + 
				', failed to read any materials, loading default material');
			thisP.materialNames.push("default");
			//preload the material
			graphics.GetMaterial( "default", thisP.sceneName,
			[thisP, thisP.materialNames.length-1], thisP.materialReady );
		}

		//read in the mesh file
		var meshFileName = "scenes/"  + thisP.sceneName + 
							"/meshes/" + thisP.meshName + ".hvtMesh";
		loadTextFile( meshFileName, thisP.meshFileLoaded, thisP );
		//when completed calls mesh file loaded above
	}
	loadTextFile( matFileName, this.matFileLoaded, this );
	//when completed calls to mat file loaded above

}
