//# sourceURL=Output/Rendering/DepthGraphics.js
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

function DepthGraphics(loadCompleteCallback, unifLocOffset){

	this.loadCompleteCallback = loadCompleteCallback;
	this.glProgram = new GlProgram('frayenDepth', this, DEPTH_G_LoadComp);

	this.unifLocOffset = unifLocOffset;

	this.position_vA_F3_A_Loc         = null;
	
	this.proj_vU_M1_1_Loc  = null;
}

function DEPTH_G_LoadComp(depthG){
	depthG.position_vA_F3_A_Loc         = gl.getAttribLocation( depthG.glProgram.glProgId, 'position'                );

	depthG.proj_vU_M1_1_Loc = gl.getUniformLocation( depthG.glProgram.glProgId, 'projMatrix'              );

	if( depthG.loadCompleteCallback != null )
		depthG.loadCompleteCallback(depthG);
}

function DEPTH_G_Setup(depthG){
	//called when switching from another program (i.e. line or point drawing gl program)

	let progId = depthG.glProgram.glProgId;

	gl.useProgram(progId);


}



function DEPTH_G_DrawDepth(depthG, mainCam){

	if( cubeWorldToCamMat ){
		Matrix_Multiply(tempMat, cubeWorldToCamMat, blenderToCubeMapEulerRotMat );
		Matrix_Transpose( transMat, tempMat );
		gl.uniformMatrix4fv( cubeG.proj_vU_M1_1_Loc, false, transMat );
	}

	let center = [0,0];
	let widthHeight = [1,1];
	let depth = 1;



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
