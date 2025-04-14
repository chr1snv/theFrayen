
function TriGraphics(loadCompleteCallback, unifLocOffset){

	this.currentTexId     = -1;
	this.currentColor     = [0.0, 0.0, 0.0, 0.0];
	this.ambAndDiffuse    = [0.0, 0.0, 0.0, 0.0];
	this.emission         = [0.0, 0.0, 0.0, 0.0];
	this.specular         = [0.0, 0.0, 0.0, 0.0];
	this.shinyness        = 0;


	this.loadCompleteCallback = loadCompleteCallback;
	this.glProgram = new GlProgram('frayen', this, TRIG_LoadComp);

	this.textures = {};

    //flags - vertex 
          this.skelSkinningEnb_fU_I1_1_Loc         = null;
          this.skelSkinningEnb_fU_I1_1             = 0  + unifLocOffset;
    //flags - fragment
         this.texturingEnabled_fU_I1_1_Loc         = null;
         this.texturingEnabled_fU_I1_1             = 1  + unifLocOffset;
         
          this.lightingEnabled_fU_I1_1_Loc         = null;
          this.lightingEnabled_fU_I1_1             = 2  + unifLocOffset;


    //uniforms - fragment
                    this.alpha_fU_F1_1_Loc         = null;
                    this.alpha_fU_F1_1             = 3  + unifLocOffset;

                  this.diffCol_fU_F3_1_Loc         = null;
                  this.diffCol_fU_F3_1             = 4  + unifLocOffset;

          this.emisAndAmbColor_fU_F3_1_Loc         = null;
          this.emisAndAmbColor_fU_F3_1             = 5  + unifLocOffset;

    this.specularAmtHrdnessExp_fU_F2_1_Loc         = null;
    this.specularAmtHrdnessExp_fU_F2_1             = 6  + unifLocOffset;

               //this.screenDims_fU_F2_1_Loc         = null;
               //this.screenDims_fU_F2_1             = 7  + unifLocOffset;

    //uniforms - fragment lighting
       this.subSurfaceExponent_fU_F1_1_Loc         = null;
       this.subSurfaceExponent_fU_F1_1             = 8  + unifLocOffset;

              this.camWorldPos_fU_F3_1_Loc         = null;
              this.camWorldPos_fU_F3_1             = 9  + unifLocOffset;

                this.numLights_fU_I1_1_Loc         = null;
                this.numLights_fU_I1_1             = 10 + unifLocOffset;

                 this.LightPos_fU_F3_3_Loc         = null;
                 this.LightPos_fU_F3_3             = 11 + unifLocOffset;

    //uniforms - vertex
 this.boneMatrixTextureSampler_vU_TI_1_Loc         = null;
 this.boneMatrixTextureSampler_vU_TI_1             = 12 + unifLocOffset;

                 this.numBones_vU_F1_1_Loc         = null;
                 this.numBones_vU_F1_1             = 13 + unifLocOffset;

                     this.proj_vU_M1_1_Loc         = null;
                     this.proj_vU_M1_1             = 14 + unifLocOffset;

                      this.mdl_vU_M1_1_Loc         = null;
                      this.mdl_vU_M1_1             = 15 + unifLocOffset;


    //attributes per vertex
                 this.position_vA_F3_A_Loc         = null;

                     this.norm_vA_F3_A_Loc         = null;

                 this.texCoord_vA_F2_A_Loc         = null;

             this.indexWeights_vA_F4_A_Loc         = null;

}

function TRIG_LoadComp(triG){

	//gl.useProgram from shader compilation

	//vertex shader flags
          triG.skelSkinningEnb_fU_I1_1_Loc         = gl.getUniformLocation( triG.glProgram.glProgId, 'skelSkinningEnb'         );
	//fragment shader flags
          triG.lightingEnabled_fU_I1_1_Loc         = gl.getUniformLocation( triG.glProgram.glProgId, 'lightingEnabled'         );
         triG.texturingEnabled_fU_I1_1_Loc         = gl.getUniformLocation( triG.glProgram.glProgId, 'texturingEnabled'        );


	//fragment shader color uniforms
                    triG.alpha_fU_F1_1_Loc         = gl.getUniformLocation( triG.glProgram.glProgId, 'alpha'                   );
                  triG.diffCol_fU_F3_1_Loc         = gl.getUniformLocation( triG.glProgram.glProgId, 'diffuseColor'            );
          triG.emisAndAmbColor_fU_F3_1_Loc         = gl.getUniformLocation( triG.glProgram.glProgId, 'emissionAndAmbientColor' );
    triG.specularAmtHrdnessExp_fU_F2_1_Loc         = gl.getUniformLocation( triG.glProgram.glProgId, 'specularAmtHrdnessExp'   );
               //triG.screenDims_fU_F2_1_Loc         = gl.getUniformLocation( triG.glProgram.glProgId, 'screenDims'              );
	//fragment shader lighting uniforms
       triG.subSurfaceExponent_fU_F1_1_Loc         = gl.getUniformLocation( triG.glProgram.glProgId, 'subSurfaceExponent'      );
              triG.camWorldPos_fU_F3_1_Loc         = gl.getUniformLocation( triG.glProgram.glProgId, 'camWorldPos'             );
                triG.numLights_fU_I1_1_Loc         = gl.getUniformLocation( triG.glProgram.glProgId, 'numLights'               );
                 triG.LightPos_fU_F3_3_Loc         = gl.getUniformLocation( triG.glProgram.glProgId, 'lightPos'                );


 triG.boneMatrixTextureSampler_vU_TI_1_Loc         = gl.getUniformLocation( triG.glProgram.glProgId, 'boneMatrixTexture'       );
	//vertex shader matrix uniforms
                     triG.proj_vU_M1_1_Loc         = gl.getUniformLocation( triG.glProgram.glProgId, 'projMatrix'              );
                      triG.mdl_vU_M1_1_Loc         = gl.getUniformLocation( triG.glProgram.glProgId, 'mMatrix'                 );
                 triG.numBones_vU_F1_1_Loc         = gl.getUniformLocation( triG.glProgram.glProgId, 'numBones'                );

	//vertex shader per vertex attributes
                 triG.position_vA_F3_A_Loc         = gl.getAttribLocation(  triG.glProgram.glProgId, 'position'                );
                     triG.norm_vA_F3_A_Loc         = gl.getAttribLocation(  triG.glProgram.glProgId, 'norm'                    );
                 triG.texCoord_vA_F2_A_Loc         = gl.getAttribLocation(  triG.glProgram.glProgId, 'texCoord'                );
             triG.indexWeights_vA_F4_A_Loc         = gl.getAttribLocation(  triG.glProgram.glProgId, 'indexWeights'            );


	if( triG.loadCompleteCallback != null )
		triG.loadCompleteCallback(triG);
}

let identMatrix = Matrix_New();
Matrix_SetIdentity(identMatrix);

let temp = Vect3_NewAllOnes();
let tempZero = [ 0,0,0,1];
function TRI_G_Setup(triG){
	//called when switching from another program (i.e. line or point drawing gl program)

	let progId = triG.glProgram.glProgId;

	gl.useProgram(progId);
	//CheckGLError( "after enable tri glProgram " );


	//set the rendering state varaibles (init them to 0 then set to 1 to ensure we are tracking the gl state)

	GLP_setUnif_I1(triG.glProgram, triG.boneMatrixTextureSampler_vU_TI_1_Loc, triG.boneMatrixTextureSampler_vU_TI_1, 1); //possibly binds to gl TEXTURE1 unit
	//GLP_setIntUniform(triG.glProgram, 'texSampler', 0);

	GLP_setUnif_F3(triG.glProgram, triG.diffCol_fU_F3_1_Loc, triG.diffCol_fU_F3_1, temp);
	//triG.glProgram.setVec4Uniform('ambient', temp);
	//CheckGLError( "glProgram::before lighting enabled " );

	//lighting setup
	//GLP_setUnif_I1( triG.glProgram, triG.lightingEnabled_fU_I1, triG.lightingEnabled_Unif_I1Loc, 0 );

	//enable program vertexAttrib arrays
	gl.enableVertexAttribArray(triG.position_vA_F3_1_Loc );
	gl.enableVertexAttribArray(triG.norm_vA_F3_1_Loc     );
	gl.enableVertexAttribArray(triG.texCoord_vA_F2_1_Loc );

	//gl.enableVertexAttribArray(triG.indexWeightsAttrib);
	
	//GLP_setUnif_F2( triG.glProgram, triG.screenDims_fU_F2_1_Loc, triG.screenDims_fU_F2_1, [1,1]);//[graphics.canvas.width*0.03, graphics.canvas.height*0.03]);


	//CheckGLError( "glProgram::end frag shader loaded " );
}

let trigLightPosVec = Vect_NewZero(8*vertCard);
function TRI_G_SetupLights(triG, rastB ){

	let lights = rastB.lights;
	let numLights = rastB.numLights;
	let ambientColor = rastB.ambientColor

	triG.ambientColor = ambientColor;

	GLP_setUnif_I1( triG.glProgram, triG.numLights_fU_I1_1_Loc, triG.numLights_fU_I1_1, numLights );

	for( let l = 0; l < numLights; ++l ){
		Vect_CopyToFromArr( trigLightPosVec, l*3, lights[l].pos, 0, 3 );
	}
	GLP_setUnif_F3( triG.glProgram, triG.LightPos_fU_F3_3_Loc, triG.LightPos_fU_F3_3, trigLightPosVec );
	//triG.glProgram.setVec4Uniform( 'lightPos', trigLightPosVec );

}

/*
function TRIG_SetDefaultOrthoCamMat(triG){

	Matrix_Transpose( transMat, identMatrix );
	gl.uniformMatrix4fv( triG.mMatrixUnif, false, transMat );

	//set the screenspace orthographic matrix
	glOrtho(-graphics.GetScreenAspect(), graphics.GetScreenAspect(),
			-1,1,//-graphics.screenHeight, graphics.screenHeight,
			-1, 1);
	Matrix_Transpose( transMat, gOM );
	gl.uniformMatrix4fv(triG.projMatrixUnif, false, transMat);//, 0, 4*4 );

}
*/

function TRI_G_VertBufObj(numVerts, strIn="", interactiveIn=false){
	this.vertBufferForMat = [new Float32Array(numVerts*vertCard)];
	this.normBufferForMat = [new Float32Array(numVerts*normCard)];
	this.uvBufferForMat   = [new Float32Array(numVerts*uvCard)  ];
	this.AABB = null;
	this.str = strIn;
	this.interactive = interactiveIn;
}


// Draw a textured screenspace rectangle
function TRI_G_prepareScreenSpaceTexturedQuad(triG, rB2DTris, textureName, sceneName, center, widthHeight, minUv, maxUv, depth, sspTInstNum=0 ){

	//create a material for the texture
	if( graphics.cachedObjs[Material.name] == undefined ||
		graphics.cachedObjs[Material.name][sceneName] == undefined ||
		graphics.cachedObjs[Material.name][sceneName][textureName] == undefined ){
		
		GRPH_GetCached( textureName, sceneName, Material, true, null, null );
		
		return;
	}
	//wait for the texture to load
	let material = graphics.cachedObjs[Material.name][sceneName][textureName][0];
	if( !material.isValid )
		return;
	
	
	let drawBatch = GetDrawBatchBufferForMaterial( rB2DTris, material );
	let vertBufObj = null;
	if( drawBatch.numBufSubRanges < sspTInstNum+1 ){
		vertBufObj = new TRI_G_VertBufObj( 6 );
	}
	let subBB = GetDrawSubBatchBuffer( drawBatch, sspTInstNum, 6, vertBufObj, 0 );
	vertBufObj = subBB.obj;
	subBB.toWorldMatrix = IdentityMatrix;
	
	let tquvs = vertBufObj.uvBufferForMat[0];
	let tqvrts = vertBufObj.vertBufferForMat[0];

	//generate the 4 corners from the centerpoint and width/height
	let mm = [(center[0] - widthHeight[0]/2), (center[1] - widthHeight[1]/2)]; //left bottom
	let MM = [(center[0] + widthHeight[0]/2), (center[1] + widthHeight[1]/2)]; //right top 
	let mM = [ mm[0], MM[1] ]; //left top
	let Mm = [ MM[0], mm[1] ]; //right bottom

	//the two triangles 
	tqvrts[0*3+0] = mm[0]; tqvrts[0*3+1] = mm[1]; tqvrts[0*3+2] = depth; //left bottom
	tqvrts[1*3+0] = MM[0]; tqvrts[1*3+1] = MM[1]; tqvrts[1*3+2] = depth; //right top
	tqvrts[2*3+0] = mM[0]; tqvrts[2*3+1] = mM[1]; tqvrts[2*3+2] = depth; //left top
	
	tqvrts[3*3+0] = MM[0]; tqvrts[3*3+1] = MM[1]; tqvrts[3*3+2] = depth; //right top
	tqvrts[4*3+0] = mm[0]; tqvrts[4*3+1] = mm[1]; tqvrts[4*3+2] = depth; //left bottom
	tqvrts[5*3+0] = Mm[0]; tqvrts[5*3+1] = Mm[1]; tqvrts[5*3+2] = depth; //right bottom


	tquvs[0*2+0] = minUv[0]; tquvs[0*2+1] = minUv[1]; //left  bottom
	tquvs[1*2+0] = maxUv[0]; tquvs[1*2+1] = maxUv[1]; //right top
	tquvs[2*2+0] = minUv[0]; tquvs[2*2+1] = maxUv[1]; //left  top

	tquvs[3*2+0] = maxUv[0]; tquvs[3*2+1] = maxUv[1]; //right top
	tquvs[4*2+0] = minUv[0]; tquvs[4*2+1] = minUv[1]; //left  bottom
	tquvs[5*2+0] = maxUv[0]; tquvs[5*2+1] = minUv[1]; //right bottom
	drawBatch.numSubBufferUpdatesToBeValid -= 1;

	

	/*
	GLP_vertexAttribSetFloats( triG.glProgram, 0,  3, tqvrts, triG.positionAttrib );
	//CheckGLError("draw square, after position attributeSetFloats");
	GLP_vertexAttribSetFloats( triG.glProgram, 1,    3, tqvrts, triG.normAttrib );
	//CheckGLError("draw square, after normal attributeSetFloats");
	GLP_vertexAttribSetFloats( triG.glProgram, 2,  2, tquvs, triG.texCoordAttrib );
	//CheckGLError("draw square, after texCoord attributeSetFloats");
	//GLP_vertexAttribBuffResizeAllocateOrEnableAndBind( 
	gl.drawArrays(gl.TRIANGLES, 0, 6);
	//CheckGLError("draw square, after drawArrays");
	//gl.flush();
	*/
}

function TRI_G_setCamMatrix( triG, camMat, camWorldPos ){
	Matrix_Transpose( transMat, camMat );
	gl.uniformMatrix4fv( triG.proj_vU_M1_1_Loc, false, transMat );
	GLP_setUnif_F3( triG.glProgram, triG.camWorldPos_fU_F3_1_Loc, triG.camWorldPos_fU_F3_1, camWorldPos );
}

const TRI_G_VERT_ATTRIB_UID_START = 3;

let transMat = Matrix_New();
//let camWorldToViewportMatrix = Matrix_New();
//let tempMat = Matrix_New();
function TRI_G_drawTriangles( triG, buf, totalNumBones, time ){

	    GLP_setUnif_F1( triG.glProgram,                 triG.alpha_fU_F1_1_Loc,                 triG.alpha_fU_F1_1, buf.material.alpha );

	//set texture or color for material
	if( buf.material.texture != null ){
		TEX_Bind( buf.material.texture );

		GLP_setUnif_I1( triG.glProgram,      triG.texturingEnabled_fU_I1_1_Loc,      triG.texturingEnabled_fU_I1_1, 1 );
	}else{
		GLP_setUnif_I1( triG.glProgram,      triG.texturingEnabled_fU_I1_1_Loc,      triG.texturingEnabled_fU_I1_1, 0 );
	}
	GLP_setUnif_F3( triG.glProgram,               triG.diffCol_fU_F3_1_Loc,               triG.diffCol_fU_F3_1, buf.material.diffuseCol);

	//set lighting model uniforms
	if( buf.material.isShadeless ){
		GLP_setUnif_I1( triG.glProgram,       triG.lightingEnabled_fU_I1_1_Loc,       triG.lightingEnabled_fU_I1_1,  0 );
		GLP_setUnif_F3( triG.glProgram,       triG.emisAndAmbColor_fU_F3_1_Loc,       triG.emisAndAmbColor_fU_F3_1,  buf.material.lumCol );
	}else{
		GLP_setUnif_I1( triG.glProgram,       triG.lightingEnabled_fU_I1_1_Loc,       triG.lightingEnabled_fU_I1_1,  1 );
		GLP_setUnif_F2( triG.glProgram, triG.specularAmtHrdnessExp_fU_F2_1_Loc, triG.specularAmtHrdnessExp_fU_F2_1,  buf.material.specularAmtExponent );
		GLP_setUnif_F3( triG.glProgram,       triG.emisAndAmbColor_fU_F3_1_Loc,       triG.emisAndAmbColor_fU_F3_1,  triG.ambientColor );
		GLP_setUnif_F1( triG.glProgram,    triG.subSurfaceExponent_fU_F1_1_Loc,    triG.subSurfaceExponent_fU_F2_1,   buf.material.subSurfaceExponent );
	}


	//CheckGLError("TRI_G_drawTriangles after set uniforms");

	//allocate / resize buffers for material
	let isDynamic = buf.vertexAnimated;
	let numVerts = buf.bufferIdx;
	let bufID = (buf.bufID);
	
	//if resized the gl attribute buffer, need to re upload all sub buffer attributes
	if( GLP_vertexAttribBuffResizeAllocateOrEnableAndBind(triG.glProgram,     bufID,       triG.position_vA_F3_A_Loc,     vertCard,      numVerts*vertCard,      isDynamic) )
		buf.regenAndUploadEntireBuffer = true;
	if( GLP_vertexAttribBuffResizeAllocateOrEnableAndBind(triG.glProgram,     bufID+1,         triG.norm_vA_F3_A_Loc,     normCard,      numVerts*normCard,      isDynamic) )
		buf.regenAndUploadEntireBuffer = true;
	if( GLP_vertexAttribBuffResizeAllocateOrEnableAndBind(triG.glProgram,     bufID+2,     triG.texCoord_vA_F2_A_Loc,       uvCard,      numVerts*uvCard,        isDynamic) )
		buf.regenAndUploadEntireBuffer = true;
		
	if( buf.hasSkelAnim ){
		if( GLP_vertexAttribBuffResizeAllocateOrEnableAndBind(triG.glProgram, bufID+3, triG.indexWeights_vA_F4_A_Loc, bnIdxWghtCard, numVerts*bnIdxWghtCard, false) )
			buf.regenAndUploadEntireBuffer = true;
		gl.enableVertexAttribArray(triG.indexWeights_vA_F4_A_Loc);
		GLP_setUnif_F1( triG.glProgram, triG.numBones_vU_F1_1_Loc, triG.numBones_vU_F1_1, totalNumBones );
	}
	else
		gl.disableVertexAttribArray(triG.indexWeights_vA_F4_A_Loc);
	//CheckGLError("TRI_G_drawTriangles after GLP_vertexAttribBuffAllocateOrEnableAndBind");


	//CheckGLError("TRI_G_drawTriangles before upload verts attributes if necessary");
	//upload verts attributes if necessary
	let bufSubRangeKeys = buf.sortedSubRngKeys;
	for( let i = 0; i < buf.numBufSubRanges; ++i ){
		let subRange = buf.bufSubRanges[ bufSubRangeKeys[i] ];
		let startIdx = subRange.startIdx;
		
		if( subRange.vertsNotYetUploaded || buf.regenAndUploadEntireBuffer ){
			
			//vertexAttribSetSubFloats = function( attribInstID, offset, arr )
			GLP_vertexAttribSetSubFloats( triG.glProgram,     bufID,   startIdx*vertCard,      subRange.obj.vertBufferForMat     [subRange.objMatIdx] );
			GLP_vertexAttribSetSubFloats( triG.glProgram,     bufID+1, startIdx*normCard,      subRange.obj.normBufferForMat     [subRange.objMatIdx] );
			GLP_vertexAttribSetSubFloats( triG.glProgram,     bufID+2, startIdx*uvCard,        subRange.obj.uvBufferForMat       [subRange.objMatIdx] );
			if( subRange.skelAnim != null )
				GLP_vertexAttribSetSubFloats( triG.glProgram, bufID+3, startIdx*bnIdxWghtCard, subRange.obj.bnIdxWghtBufferForMat[subRange.objMatIdx] );
			subRange.vertsNotYetUploaded = false;
		}
	}

	//specifiy the inputs the attrib buffers are used for in the triangle gl shader program

	//CheckGLError("TRI_G_drawTriangles before set vertexAttribPointers");
	gl.bindBuffer(gl.ARRAY_BUFFER, triG.glProgram.attribLocBufPtrs[bufID][1]);
	//vertexAttribPointer(index, size, type, normalized, stride, offset)
	//binds buffer bound to gl.ARRAY_BUFFER to AttribLocation and specifies format
	gl.vertexAttribPointer(triG.glProgram.attribLocBufPtrs[bufID][0], vertCard, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, triG.glProgram.attribLocBufPtrs[bufID+1][1]);
	gl.vertexAttribPointer(triG.glProgram.attribLocBufPtrs[bufID+1][0], normCard, gl.FLOAT, false, 0, 0);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, triG.glProgram.attribLocBufPtrs[bufID+2][1]);
	gl.vertexAttribPointer(triG.glProgram.attribLocBufPtrs[bufID+2][0], uvCard, gl.FLOAT, false, 0, 0);

	if( buf.hasSkelAnim ){
		gl.bindBuffer(gl.ARRAY_BUFFER, triG.glProgram.attribLocBufPtrs[bufID+3][1]);
		gl.vertexAttribPointer(triG.glProgram.attribLocBufPtrs[bufID+3][0], bnIdxWghtCard, gl.FLOAT, false, 0, 0);
	}

	//CheckGLError("TRI_G_drawTriangles after set vertexAttribPointers");
	let overrideColorSet = false;
	for( let i = 0; i < buf.numBufSubRanges; ++i ){
		let subRange = buf.bufSubRanges[ bufSubRangeKeys[i] ];
		let startIdx = subRange.startIdx;
		if( subRange.len <= 0 )
			continue;
		
		if( subRange.skelAnim != null ){
			GLP_setUnif_I1( triG.glProgram, triG.skelSkinningEnb_fU_I1_1_Loc, triG.skelSkinningEnb_fU_I1_1, 1 );
		}else{
			GLP_setUnif_I1( triG.glProgram, triG.skelSkinningEnb_fU_I1_1_Loc, triG.skelSkinningEnb_fU_I1_1,  0 );
		}

		if( subRange.overrideColor ){
			GLP_setUnif_F3( triG.glProgram, triG.emisAndAmbColor_fU_F3_1_Loc, triG.emisAndAmbColor_fU_F3_1, subRange.overrideColor );
			overrideColorSet = true;
		}else if( overrideColorSet ){
			GLP_setUnif_F3( triG.glProgram, triG.emisAndAmbColor_fU_F3_1_Loc, triG.emisAndAmbColor_fU_F3_1, buf.material.lumCol );
			//GLP_setUnif_F3( triG.glProgram, triG.emisAndAmbColorUnif_F3, buf.material.diffuseCol);
			overrideColorSet = false;
		}



		//set the model matrix
		//transpose=true requires webgl2.0
		Matrix_Transpose( transMat, subRange.toWorldMatrix );
		gl.uniformMatrix4fv( triG.mdl_vU_M1_1_Loc, false, transMat );//, 0, 4*4 );

		let vertBufferEndIdx = buf.bufferIdx;
		let subRangeEndIdx = startIdx + subRange.len;
		//if( subRangeEndIdx > vertBufferEndIdx )
		//	console.log("subRangeEndIdx > vertBufferEndIdx");
		//CheckGLError("TRI_G_drawTriangles before gl.drawArrays");
		gl.drawArrays( gl.TRIANGLES, startIdx, subRange.len );
		subRange.lastTimeDrawn = time;
		//if( CheckGLError("TRI_G_drawTriangles after gl.drawArrays") )
		//	DTPrintf("TriG drawArrays error", "trig");

		buf.regenAndUploadEntireBuffer = false;
	}

}
