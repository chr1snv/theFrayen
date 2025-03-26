
//for drawing cube map (skyboxes)
//likely a cube instead of a sphere to use existing triangle rasterization
//engine in gpu (a cube has fewer verts than a sphere)
//could do something similar to TriGraphics with a different shader
//though only need to pass:
//cube map texture,
//vertex positions, and 
//camera matrix
//to gl

//also don't need multi object/material buffer system as only 1 vert position buffer is needed

function CubeGraphics(loadCompleteCallback, unifLocOffset){

	this.loadCompleteCallback = loadCompleteCallback;
	this.glProgram = new GlProgram('frayenCube', this, TRIG_LoadComp);

	this.unifLocOffset = unifLocOffset;

	this.position_vA_F3_A_Loc         = null;
	
	this.proj_vU_M1_1_Loc  = null;

	this.cubeTex = null;
}

function CUBE_G_LoadComp(cubeG){
	triG.position_vA_F3_A_Loc         = gl.getAttribLocation( cubeG.glProgram.glProgId, 'position'                );
	
	triG.proj_vU_M1_1_Loc = gl.getUniformLocation( cubeG.glProgram.glProgId, 'projMatrix'              );
}

function CUBE_G_Setup(cubeG){
	//called when switching from another program (i.e. line or point drawing gl program)

	let progId = cubeG.glProgram.glProgId;

	gl.useProgram(progId);


	if( cubeG.cubeTex == null )
		cubeG.cubeTex = new Texture( 'cloudy/bluecloud', 'sailDefault', 2 ); //wrapType2 
	else if( cubeG.cubeTex.isValid ){
		TEX_BindCube( cubeG.cubeTex );
	}

}

function CUBE_G_allocateVertPosArray(){

	let a = new Float32Array(vertCard*6*6);

	//generate the 8 corners (counter clockwise winding)
	//let cubeCorners = new Float32Array(vertCard*4*2);
	let d = 10;
	let cubeCorners = [ -d,-d,-d,    d,-d,-d,    -d, d,-d,    d, d,-d,
	//bottom left near(0), right near(1), left far(2), right far(3)
						-d,-d, d,    d,-d, d,    -d, d, d,    d, d, d];
	//   top left near(4), right near(5), left far(6), right far(7)


	//front
	Vect_CopyToFromArr(a, vertCard*0,  cubeCorners, 0*vertCard, vertCard); //near left  bottom
	Vect_CopyToFromArr(a, vertCard*1,  cubeCorners, 4*vertCard, vertCard); //near right top
	Vect_CopyToFromArr(a, vertCard*2,  cubeCorners, 5*vertCard, vertCard); //near left  top

	Vect_CopyToFromArr(a, vertCard*3,  cubeCorners, 0*vertCard, vertCard); //near left  bottom
	Vect_CopyToFromArr(a, vertCard*4,  cubeCorners, 1*vertCard, vertCard); //near right bottom
	Vect_CopyToFromArr(a, vertCard*5,  cubeCorners, 5*vertCard, vertCard); //near right top

	//left
	Vect_CopyToFromArr(a, vertCard*6,  cubeCorners, 0*vertCard, vertCard); //near left bottom
	Vect_CopyToFromArr(a, vertCard*7,  cubeCorners, 2*vertCard, vertCard); //far  left bottom
	Vect_CopyToFromArr(a, vertCard*8,  cubeCorners, 4*vertCard, vertCard); //near left top

	Vect_CopyToFromArr(a, vertCard*9,  cubeCorners, 4*vertCard, vertCard); //near left top
	Vect_CopyToFromArr(a, vertCard*10, cubeCorners, 6*vertCard, vertCard); //far  left top
	Vect_CopyToFromArr(a, vertCard*11, cubeCorners, 2*vertCard, vertCard); //far  left bottom

	//back
	Vect_CopyToFromArr(a, vertCard*12, cubeCorners, 2*vertCard, vertCard); //far  left  bottom
	Vect_CopyToFromArr(a, vertCard*13, cubeCorners, 7*vertCard, vertCard); //far  right top
	Vect_CopyToFromArr(a, vertCard*14, cubeCorners, 6*vertCard, vertCard); //far  left  top

	Vect_CopyToFromArr(a, vertCard*15, cubeCorners, 2*vertCard, vertCard); //far  left  bottom
	Vect_CopyToFromArr(a, vertCard*16, cubeCorners, 3*vertCard, vertCard); //far  right bottom
	Vect_CopyToFromArr(a, vertCard*17, cubeCorners, 7*vertCard, vertCard); //far  right top
	
	//right
	Vect_CopyToFromArr(a, vertCard*18, cubeCorners, 1*vertCard, vertCard); //near right bottom
	Vect_CopyToFromArr(a, vertCard*19, cubeCorners, 3*vertCard, vertCard); //far  right bottom
	Vect_CopyToFromArr(a, vertCard*20, cubeCorners, 5*vertCard, vertCard); //near right top

	Vect_CopyToFromArr(a, vertCard*21, cubeCorners, 5*vertCard, vertCard); //near right top
	Vect_CopyToFromArr(a, vertCard*22, cubeCorners, 7*vertCard, vertCard); //far  right top
	Vect_CopyToFromArr(a, vertCard*23, cubeCorners, 3*vertCard, vertCard); //far  right bottom
	
	
	//top
	Vect_CopyToFromArr(a, vertCard*24, cubeCorners, 5*vertCard, vertCard); //near right top
	Vect_CopyToFromArr(a, vertCard*25, cubeCorners, 7*vertCard, vertCard); //far  right top
	Vect_CopyToFromArr(a, vertCard*26, cubeCorners, 4*vertCard, vertCard); //near left  top

	Vect_CopyToFromArr(a, vertCard*27, cubeCorners, 4*vertCard, vertCard); //near left  top
	Vect_CopyToFromArr(a, vertCard*28, cubeCorners, 7*vertCard, vertCard); //far  right top
	Vect_CopyToFromArr(a, vertCard*29, cubeCorners, 6*vertCard, vertCard); //far  left  top
	
	//bottom
	Vect_CopyToFromArr(a, vertCard*30, cubeCorners, 1*vertCard, vertCard); //near right bottom
	Vect_CopyToFromArr(a, vertCard*31, cubeCorners, 3*vertCard, vertCard); //far  right bottom
	Vect_CopyToFromArr(a, vertCard*32, cubeCorners, 0*vertCard, vertCard); //near left  bottom

	Vect_CopyToFromArr(a, vertCard*33, cubeCorners, 0*vertCard, vertCard); //near left  bottom
	Vect_CopyToFromArr(a, vertCard*34, cubeCorners, 3*vertCard, vertCard); //far  right bottom
	Vect_CopyToFromArr(a, vertCard*35, cubeCorners, 2*vertCard, vertCard); //far  left  bottom

	return a;
}


var cubeWorldToCamMat = Matrix_New();
let rotWorldToScreenSpaceMat = Matrix_New();
let blndrToCubeMapRotMat = Matrix_New();
Matrix_SetEulerRotate( blndrToCubeMapRotMat, [-Math.PI/2, 0, 0] );
let tqvrts = null;
let tqvrtsBufID = -1;
function CUBE_G_DrawSkyBox(cubeG, mainCam){

	if( cubeWorldToCamMat ){
		//Matrix_Multiply( rotWorldToScreenSpaceMat, gPM, cubeWorldToCamMat );
		//Matrix_Transpose( transMat, rotWorldToScreenSpaceMat );
		Matrix_Multiply(tempMat, cubeWorldToCamMat, blndrToCubeMapRotMat );
		Matrix_Transpose( transMat, tempMat );
		gl.uniformMatrix4fv( cubeG.proj_vU_M1_1_Loc, false, transMat );
	}

	let center = [0,0];
	let widthHeight = [1,1];
	let depth = 1;

	if( tqvrts == null ){
		tqvrts = CUBE_G_allocateVertPosArray();
		tqvrtsBufID = AllocDrawBufID();
	}


	//drawBatch.numSubBufferUpdatesToBeValid -= 1;


	GLP_vertexAttribBuffResizeAllocateOrEnableAndBind(
		cubeG.glProgram, 
		tqvrtsBufID, 
		cubeG.position_vA_F3_A_Loc, 
		vertCard, 
		tqvrts.length, 
		false);
	//buf.regenAndUploadEntireBuffer = true;

	gl.vertexAttribPointer(cubeG.glProgram.attribLocBufPtrs[tqvrtsBufID][0], vertCard, gl.FLOAT, false, 0, 0);
	
	//GLP_vertexAttribSetSubFloats( glp, attribInstID, offset, arr )
	GLP_vertexAttribSetSubFloats( 
		cubeG.glProgram, 
		tqvrtsBufID, 
		0,//vertCard, 
		tqvrts );
	//GLP_vertexAttribSetSubFloats( cubeG.glProgram, bufID+2, startIdx*uvCard,      subRange.obj.uvBufferForMat       [subRange.objMatIdx] );
	gl.drawArrays( gl.TRIANGLES, 0, tqvrts.length/vertCard );

}
