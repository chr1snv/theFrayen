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
	
	let uIdx = 0;

	this.unifLocOffset = unifLocOffset;

	this.skelSkinningEnb_fU_I1_1_Loc         = null; //the gl getUniformLocation
	this.skelSkinningEnb_fU_I1_1             = uIdx++  + unifLocOffset; //theFrayen GLP_setUnif Int / index for caching to avoid unessecsary gl calls per frame

	this.position_vA_F3_A_Loc         = null;

	this.proj_vU_M1_1_Loc  = null;

	this.mdl_vU_M1_1_Loc = null;


	this.boneMatrixTextureSampler_vU_TI_1_Loc         = null;
	this.boneMatrixTextureSampler_vU_TI_1             = uIdx++  + unifLocOffset;

	//this.numBones_vU_F1_1_Loc         = null;
	//this.numBones_vU_F1_1             = uIdx++  + unifLocOffset;
	
	this.indexWeights_vA_F4_A_Loc         = null;
	
	
	temp1x1TexHandle = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, temp1x1TexHandle);
	const placeholderColor = new Uint8Array([0, 0, 255, 255]);  
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, placeholderColor );
}
var temp1x1TexHandle = null;

function DEPTH_G_LoadComp(depthG){

	//vertex shader flags
		depthG.skelSkinningEnb_fU_I1_1_Loc				= gl.getUniformLocation( depthG.glProgram.glProgId, 'skelSkinningEnb'         );

		depthG.position_vA_F3_A_Loc						= gl.getAttribLocation( depthG.glProgram.glProgId, 'position'           );

		depthG.proj_vU_M1_1_Loc							= gl.getUniformLocation( depthG.glProgram.glProgId, 'projMatrix'   );

		depthG.mdl_vU_M1_1_Loc							= gl.getUniformLocation( depthG.glProgram.glProgId, 'mMatrix'                        );

		depthG.boneMatrixTextureSampler_vU_TI_1_Loc		= gl.getUniformLocation( depthG.glProgram.glProgId, 'boneMatrixTexture'       );
		//depthG.numBones_vU_F1_1_Loc						= gl.getUniformLocation( depthG.glProgram.glProgId, 'numBones'                );

		depthG.indexWeights_vA_F4_A_Loc					= gl.getAttribLocation(  depthG.glProgram.glProgId, 'indexWeights'            );


	GLP_setUnif_I1(depthG.glProgram, depthG.boneMatrixTextureSampler_vU_TI_1_Loc, depthG.boneMatrixTextureSampler_vU_TI_1, 1); //binds to gl TEXTURE1 unit

	if( depthG.loadCompleteCallback != null )
		depthG.loadCompleteCallback(depthG);
}

function DEPTH_G_Setup(depthG){
	//called when switching from another program (i.e. line or point drawing gl program)


	GLP_switchToProgram(depthG);

	//attempt to fix no texture bound to unit 0 error
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, temp1x1TexHandle); 

	//enable program vertexAttrib arrays
	gl.enableVertexAttribArray(depthG.position_vA_F3_1_Loc );
	
}

function DEPTH_G_Cleanup(depthG){
	gl.disableVertexAttribArray(depthG.position_vA_F3_1_Loc );
	gl.disableVertexAttribArray(depthG.indexWeights_vA_F4_A_Loc );
}


function DEPTH_G_DrawDepth(depthG, mat, rastBatch, totalNumBones, time){

	//Matrix_Transpose( transMat, mat );
	gl.uniformMatrix4fv( depthG.proj_vU_M1_1_Loc, true/*false*/, mat ); //transMat );
	Matrix_Copy( rastBatch.worldToShdwMapMat, mat ); //transMat );


	let center = [0,0];
	let widthHeight = [1,1];
	let depth = 1;

	if( rastBatch.boneMatTexture != null )
		SkelA_writeBatchBoneMatsToGL(rastBatch); //SkelA_EnableBoneMatTexture(rastBatch.boneMatTexture);

	//drawBatch.numSubBufferUpdatesToBeValid -= 1;

	//GLP_vertexAttribBuffResizeAllocateOrEnableAndBind(depthG.glProgram,     bufID,       triG.position_vA_F3_A_Loc,     vertCard,      numVerts*vertCard,      isDynamic) )
	//dbB.regenAndUploadEntireBuffer = true;
	for( let key in rastBatch.drawBatchBuffers ){

		let dbB = rastBatch.drawBatchBuffers[key];
		let isDynamic = dbB.vertexAnimated;
		let numVerts = dbB.bufferIdx;
		let bufID = (dbB.bufID);


		if ( GLP_vertexAttribBuffResizeAllocateOrEnableAndBind( depthG.glProgram, dbB.bufID, depthG.position_vA_F3_A_Loc, vertCard, numVerts*vertCard, isDynamic) )
			dbB.depthRegenAndUploadEntireBuffer = true;


		if( dbB.hasSkelAnim ){
			if( GLP_vertexAttribBuffResizeAllocateOrEnableAndBind(depthG.glProgram, bufID+3, depthG.indexWeights_vA_F4_A_Loc, bnIdxWghtCard, numVerts*bnIdxWghtCard, false) )
				dbB.depthRegenAndUploadEntireBuffer = true;
			gl.enableVertexAttribArray(depthG.indexWeights_vA_F4_A_Loc);
			let totalNumBones = rastBatch.combinedBoneMats.length/matrixCard;
			GLP_setUnif_F1( depthG.glProgram, depthG.numBones_vU_F1_1_Loc, depthG.numBones_vU_F1_1, totalNumBones );
		}
		else
			gl.disableVertexAttribArray(depthG.indexWeights_vA_F4_A_Loc);



		//CheckGLError("DEPTH_G_DrawDepth before upload verts if necessary");
		//upload vert attributes if necessary

		let bufSubRangeKeys = dbB.sortedSubRngKeys;
		
		for( let i = 0; i < dbB.numBufSubRanges; ++i ){
			let subRange = dbB.bufSubRanges[ bufSubRangeKeys[i] ];
			let startIdx = subRange.startIdx;


			if( subRange.depthVertsNotYetUploaded || dbB.regenAndUploadEntireBuffer || dbB.depthRegenAndUploadEntireBuffer ){
				let qm = subRange.mdl.quadmesh;
				
				//vertexAttribSetSubFloats = function( attribInstID, offset, arr )
				GLP_vertexAttribSetSubFloats( depthG.glProgram,     bufID,   startIdx*vertCard,      qm.vertBufferForMat     [subRange.mdlMatIdx] );
				if( subRange.skelAnim != null )
					GLP_vertexAttribSetSubFloats( depthG.glProgram, bufID+3, startIdx*bnIdxWghtCard, subRange.mdl.bnIdxWghtBufferForMat[subRange.mdlMatIdx] );
				subRange.depthVertsNotYetUploaded = false;
			}
		}


		//specifiy the inputs the attrib buffers are used for in the triangle gl shader program

		//CheckGLError("DEPTH_G_DrawDepth before set vertexAttribPointers");
		gl.bindBuffer(gl.ARRAY_BUFFER, depthG.glProgram.attribLocBufPtrs[bufID][1]);
		//vertexAttribPointer(index, size, type, normalized, stride, offset)
		//binds buffer bound to gl.ARRAY_BUFFER to AttribLocation and specifies format
		gl.vertexAttribPointer(depthG.glProgram.attribLocBufPtrs[bufID][0], vertCard, gl.FLOAT, false, 0, 0);

		if( dbB.hasSkelAnim ){
			gl.bindBuffer(gl.ARRAY_BUFFER, depthG.glProgram.attribLocBufPtrs[bufID+3][1]);
			gl.vertexAttribPointer(depthG.glProgram.attribLocBufPtrs[bufID+3][0], bnIdxWghtCard, gl.FLOAT, false, 0, 0);
		}


		//CheckGLError("DEPTH_G_DrawDepth after set vertexAttribPointers");
		for( let i = 0; i < dbB.numBufSubRanges; ++i ){
			let subRange = dbB.bufSubRanges[ bufSubRangeKeys[i] ];
			let startIdx = subRange.startIdx;
			if( subRange.len <= 0 )
				continue;

			if( subRange.skelAnim != null ){
				GLP_setUnif_I1( depthG.glProgram, depthG.skelSkinningEnb_fU_I1_1_Loc, depthG.skelSkinningEnb_fU_I1_1, 1 );
			}else{
				GLP_setUnif_I1( depthG.glProgram, depthG.skelSkinningEnb_fU_I1_1_Loc, depthG.skelSkinningEnb_fU_I1_1,  0 );
			}


			//set the model matrix
			//transpose=true requires webgl2.0
			//Matrix_Transpose( transMat, subRange.toWorldMatrix );
			gl.uniformMatrix4fv( depthG.mdl_vU_M1_1_Loc, true/*false*/, subRange.toWorldMatrix ); //transMat );//, 0, 4*4 );

			let vertBufferEndIdx = dbB.bufferIdx;
			let subRangeEndIdx = startIdx + subRange.len;
			//if( subRangeEndIdx > vertBufferEndIdx )
			//	console.log("subRangeEndIdx > vertBufferEndIdx");
			//CheckGLError("DEPTH_G_drawTriangles before gl.drawArrays");
			
			gl.drawArrays( gl.TRIANGLES, startIdx, subRange.len );
			//subRange.lastTimeDrawn = time;
			//if( CheckGLError("DEPTH_G_drawTriangles after gl.drawArrays") )
			//	DTPrintf("DEPTH G drawArrays error", "depthG");

		}

		dbB.depthRegenAndUploadEntireBuffer = false;

	}



}
