
//maintains the ocean surface model

//the ocean surface is a 3x3 sub divided surface with the center twice the resolution
//of the outer 3

//|    |    |    |
//|    | || |    |
//|    | || |    |
//|    |    |    |

//0,0   1,0         2,0   3,0
//0,1   1,1 2,1 3,1 4,1   5,1
//0,2   1,2 2,2 3,2 4,2   5,2
//0,3   1,3         2,3   3,3

function Ocean(){
	this.uid = NewUID();

	this.windDirection = Vect3_NewVals(0,-1,0);
	this.swellDirectionAndAmplitude = Vect3_NewVals(0,-1,0);

	this.highResCenter = Vect3_NewZero();

	//this.resolutionToDist = 16;
	//this.halfResolutionDist = 32;

	this.ready = false;

	this.quadmesh = new QuadMesh( "oceanSurface", "sailDefault", null, OCN_QMReady, this );
}

function OCN_QMReady( qm, ocn ){

	//allocate / initialize the verts, norms, and face idxs and uvs for the ocean surface

	let nQuads = OCN_NLvlsToNQuads(OCN_NUM_LVLS);
	let nVerts = OCN_NLvlsToNVerts(OCN_NUM_LVLS);


	qm.faces           = new Array(nQuads);
	qm.vertPositions   = new Array(nVerts*vertCard); //size determined by count of verts in file
	qm.vertNormals     = new Array(nVerts*normCard);
	//this.vertBoneWeights = null;
	//this.weightGroupIdsToBoneNames = null; //used in binding btwn quadMesh and skelAnim to generate vertBoneWeights

	//qm.materialNames     = []; //ocean material at idx [0] filled in by file
	//qm.materials         = [];
	
	//fill in verts,norms faces
	OCN_InitSubDivPositions( qm.vertPositions, qm.vertNormals, qm.faces, 0, OCN_NUM_LVLS );

	qm.faceIdxsForMatInsertIdx = [0]; //1+idx of last face in faceIdxsForMat
	qm.faceIdxsForMat          = [new Array(nQuads)]; //the indicies of faces for materials
	for( let f in qm.faces ){
		qm.faceIdxsForMat[0][qm.faceIdxsForMatInsertIdx[0]++] = parseInt(f);
	}

	//allocate tesselation output buffers
	let nFaceVerts = (nQuads-1)*vertsPerQuad; //verts are duplicated per triangle
	qm.faceVertsCtForMat       = [nFaceVerts]; //total num verts for all triangles for a material (3 for tri, 6 for quad)
	qm.vertBufferForMat[0] = new Float32Array( qm.faceVertsCtForMat[0]*vertCard );
	qm.normBufferForMat[0] = new Float32Array( qm.faceVertsCtForMat[0]*normCard );
	qm.uvBufferForMat[0]   = new Float32Array( qm.faceVertsCtForMat[0]*uvCard );

	ocn.ready = true;
}

function OCN_DistBtwnVertsAtLvl( lvl ){
	let disBtwnVerts = ocnWidth_Length/3;
	while( lvl-- > 0 ){
		disBtwnVerts /= 3;
	}
	return disBtwnVerts;
}

function OCN_LvlStartWorldOffset( lvl ){
	let disBtwnVerts = ocnWidth_Length;
	let wrldOffset = 0;
	while( lvl-- > 0 ){
		disBtwnVerts /= 3;
		wrldOffset += disBtwnVerts;
	}
	return wrldOffset-(ocnWidth_Length/2);
}
const lvlVertsWidth = 4;
const lvlQuadsWidth = 3;
function OCN_InitSubDivPositions( verts, norms, faces, lvl, maxLvls ){
	//generate and set vert positions and normals for one 3x3 quad (4x4verts) area
	//if lvl is not maxLvls replace the center quad with the verts norms, faces from

	let lvlStartWorldDist = OCN_LvlStartWorldOffset( lvl );
	let lvlVertWorldDist  = OCN_DistBtwnVertsAtLvl(  lvl );

	let lvlVertOffset = 16*lvl;
	let lvlQuadOffset = 9*lvl;

	let nonVertCardIndex = 0;

	//generate the vert positions
	for( let j = 0; j < subDivVertsPerSide; ++j ){
		for( let i = 0; i < subDivVertsPerSide; ++i ){
			nonVertCardIndex = lvlVertOffset + (j * lvlVertsWidth + i);
			indx = (nonVertCardIndex) * vertCard;
			verts[indx + 0] = lvlStartWorldDist + lvlVertWorldDist*i;
			verts[indx + 1] = lvlStartWorldDist + lvlVertWorldDist*j;
			verts[indx + 2] = 0;//waveAmplitude*Math.sin( j*waveYPeriod );

			norms[indx + 0] = 0;
			norms[indx + 1] = 0;
			norms[indx + 2] = 1;//waveAmplitude*Math.sin( j*waveYPeriod );

		}
	}
	
	for( let j = 0; j < subDivVertsPerSide; ++j ){
		for( let i = 0; i < subDivVertsPerSide; ++i ){
			nonVertCardIndex = lvlVertOffset + (j * lvlVertsWidth + i);
			if( i==1 && j==1 ){
				if( lvl < maxLvls ){ //subdivided area
					OCN_InitSubDivPositions( verts, norms, faces, lvl+1, maxLvls );
				}else{
					//omit the innermost quad
					console.log("not generating center most quad");
				}
				
			}else if( i < 3 && j < 3 ){ //use upper left most vert as start point for face
				//generate the face, uv positions and tri's
				let face = new Face();
				let fIdx = lvlQuadOffset + j*lvlQuadsWidth + i;
				faces[fIdx] = face;

				face.numFaceVerts = 4;
				let uvIdx = (nonVertCardIndex) * vertCard;
				face.uvs[0*2+0] = ((verts[uvIdx + 0]+(ocnWidth_Length/2))/ocnWidth_Length)*ocnUVScale;
				face.uvs[0*2+1] = ((verts[uvIdx + 1]+(ocnWidth_Length/2))/ocnWidth_Length)*ocnUVScale;
				    uvIdx = (nonVertCardIndex+1) * vertCard;
				face.uvs[1*2+0] = ((verts[uvIdx + 0]+(ocnWidth_Length/2))/ocnWidth_Length)*ocnUVScale;
				face.uvs[1*2+1] = ((verts[uvIdx + 1]+(ocnWidth_Length/2))/ocnWidth_Length)*ocnUVScale;
				    uvIdx = (nonVertCardIndex+lvlVertsWidth) * vertCard;
				face.uvs[3*2+0] = ((verts[uvIdx + 0]+(ocnWidth_Length/2))/ocnWidth_Length)*ocnUVScale;
				face.uvs[3*2+1] = ((verts[uvIdx + 1]+(ocnWidth_Length/2))/ocnWidth_Length)*ocnUVScale;
				    uvIdx = (nonVertCardIndex+lvlVertsWidth+1) * vertCard;
				face.uvs[2*2+0] = ((verts[uvIdx + 0]+(ocnWidth_Length/2))/ocnWidth_Length)*ocnUVScale;
				face.uvs[2*2+1] = ((verts[uvIdx + 1]+(ocnWidth_Length/2))/ocnWidth_Length)*ocnUVScale;
				face.vertIdxs[0] = nonVertCardIndex;
				face.vertIdxs[1] = nonVertCardIndex+1;
				face.vertIdxs[3] = nonVertCardIndex+lvlVertsWidth;
				face.vertIdxs[2] = nonVertCardIndex+lvlVertsWidth+1;
			}
		}
	}


}


function OCN_NLvlsToNVerts(nLvls){
	let firstLevelNumVerts = 16;
	let subSequentLevelsNumVerts = (nLvls-1) * (16-4);
	return firstLevelNumVerts + subSequentLevelsNumVerts;
}

function OCN_NLvlsToNQuads(nLvls){
	if( nLvls == 0 )
		return 3*3; //0th lvl is un subdivided
	
	return nLvls*8 + 9; //each level has 9 - the center + 9 for the inner most level
}

function OCN_FirstVertIdxAtLvl( lvl ){
	return 16*lvl;
}

let rotationMatrix = Matrix_New();

const OCN_NUM_LVLS = 2;

const waveAmplitude = 3.2;
const waveTimePeriodSecs = 1/0.5;
const waveXDistScale = 100;

const subDivVertsPerSide = 4;

const ocnWidth_Length = 256;
const ocnUVScale = 10;

//returns the interpolated z based on 2 corresponding edge verts of
//the previous lower level
function OCN_idxVertsLwrLvlToInterpZ( j, x1, y1, x2, y2, fstIdxAtLvl, verts ){
	let fstIdx  = fstIdxAtLvl + y1*lvlVertsWidth + x1;
	let scndIdx = fstIdxAtLvl + y2*lvlVertsWidth + x2;
	let firstIdxZ = verts[ fstIdx * vertCard + 2 ];
	let scndIdxZ = verts[ scndIdx * vertCard + 2 ];
	let pctOfScnd = j / (lvlVertsWidth-1);

	return firstIdxZ * (1-pctOfScnd) + scndIdxZ * pctOfScnd;
}

let indx = 0;
//update center subdivided 3x3 quad patch one level at a time recursively
function OCN_UpdateSubDiv( time, verts, norms, lvl, maxLvls ){

	let lvlStartWorldDist = OCN_LvlStartWorldOffset( lvl );
	let lvlVertWorldDist  = OCN_DistBtwnVertsAtLvl(  lvl );

	let lvlVertOffset = OCN_FirstVertIdxAtLvl( lvl );

	let midYAxisVert = false;
	let midXAxisVert = false;

	for( let j = 0; j < subDivVertsPerSide; ++j ){
	
		if( lvl > 0 && ( j == 1 || j == 2 ) )
			midYAxisVert = true; 
		else
			midYAxisVert = false; 

		for( let i = 0; i < subDivVertsPerSide; ++i ){

			if( lvl > 0 && ( i == 1 || i == 2 ) )
				midXAxisVert = true;
			else
				midXAxisVert = false;

			nonVertCardIndex = lvlVertOffset + (j * lvlVertsWidth + i);
			let vertWrldXPct = (lvlStartWorldDist + lvlVertWorldDist * i) / ocnWidth_Length;
			let vertWrldYPct = (lvlStartWorldDist + lvlVertWorldDist * j) / ocnWidth_Length;
			indx = (nonVertCardIndex) * vertCard;
			//verts[indx + 0] = lvlStartWorldDist + lvlVertWorldDist*i;
			//verts[indx + 1] = lvlStartWorldDist + lvlVertWorldDist*j;
			
			if( midYAxisVert != midXAxisVert ){ 
				//vert is on middle of subDiv level edge
				//need to get positions of previous level verts on edge and lerp btwn them
				let prevLvl = lvl - 1; 
				let fstIdxAtPrevLvl = OCN_FirstVertIdxAtLvl( prevLvl );
				if( midYAxisVert ){ //left or right edge
					if( i == 0 ){ //left edge
						verts[indx + 2] = OCN_idxVertsLwrLvlToInterpZ( j, 1, 1, 1, 2, fstIdxAtPrevLvl, verts );
					}else{ //right edge
						verts[indx + 2] = OCN_idxVertsLwrLvlToInterpZ( j, 2, 1, 2, 2, fstIdxAtPrevLvl, verts );
					}
				}else{ //top or bottom edge
					if( j == 0 ){ //top edge
						verts[indx + 2] = OCN_idxVertsLwrLvlToInterpZ( i, 1, 1, 2, 1, fstIdxAtPrevLvl, verts );
					}else{ //bottom edge
						verts[indx + 2] = OCN_idxVertsLwrLvlToInterpZ( i, 1, 2, 2, 2, fstIdxAtPrevLvl, verts );
					}
				}
			}else{ // use value calculated at this level
				verts[indx + 2] = waveAmplitude*Math.sin( (vertWrldXPct*waveXDistScale)+(waveTimePeriodSecs*time) );
			}



			//norms[indx + 0] = 0;
			//norms[indx + 1] = 0;
			//norms[indx + 2] = 1;//waveAmplitude*Math.sin( j*waveYPeriod );


			//if( i==1 && j==1 && lvl < maxLvls ){ //subdivided area
			//	OCN_UpdateSubDiv( time, verts, norms, lvl+1, maxLvls );
			//}

		}
	}
	
	if( lvl < maxLvls ) //update center subdivided area
		OCN_UpdateSubDiv( time, verts, norms, lvl+1, maxLvls );


}

function OCN_Update( ocn, rb3D, time, boatHeading ){
	QM_Update( ocn.quadmesh, time );

	rb3D.objs[ ocn.uid.val ] = ocn;

	let vertPositns = ocn.quadmesh.vertPositions;
	//let uvs         = ocn.quadmesh.uvs;
	let norms       = ocn.vertNormals;
	let indx = 0;

	OCN_UpdateSubDiv( time, vertPositns, norms, 0, OCN_NUM_LVLS );

	ocn.quadmesh.materialHasntDrawn[0] = true; //re run the tesselate function
	ocn.quadmesh.isAnimated = true;

	Matrix_SetEulerRotate( ocn.quadmesh.toWorldMatrix, [0,0,boatHeading] );
	ocn.quadmesh.toWorldMatrix[4*2+3] = -4; //move water surface down 4 units
	
	ocn.quadmesh.toWorldMatrix[4*0+3] = boatPosOffset[0]; //move water surface sideways under center of boat
	ocn.quadmesh.toWorldMatrix[4*1+3] = boatPosOffset[1];
}


