
function TriGraphics(loadCompleteCallback, unifLocOffset){

	this.currentTexId     = -1;
	this.currentColor     = [0.0, 0.0, 0.0, 0.0];
	this.ambAndDiffuse    = [0.0, 0.0, 0.0, 0.0];
	this.emission         = [0.0, 0.0, 0.0, 0.0];
	this.specular         = [0.0, 0.0, 0.0, 0.0];
	this.shinyness        = 0;


	this.loadCompleteCallback = loadCompleteCallback;
	this.glProgram = new GlProgram('frayen', this, TRIG_LoadComp);

	this.cubeTex = null;
	this.cubeTexLoadingStarted = false;

	//this.textures = {};


	//uniform references/pointers
	//f (fragment) U (uniform) _ I (integer) 1 (vector size 1) _ 1 (1 element in vector array)

	let uIdx = 0;

    //flags - vertex 
          this.skelSkinningEnb_fU_I1_1_Loc         = null; //the gl getUniformLocation
          this.skelSkinningEnb_fU_I1_1             = uIdx++  + unifLocOffset; //theFrayen GLP_setUnif Int / index for caching to avoid unessecsary gl calls per frame
    //flags - fragment
         this.texturingEnabled_fU_I1_1_Loc         = null;
         this.texturingEnabled_fU_I1_1             = uIdx++  + unifLocOffset;

          this.lightingEnabled_fU_I1_1_Loc         = null;
          this.lightingEnabled_fU_I1_1             = uIdx++  + unifLocOffset;


    //uniforms - fragment
            this.difTexSampler_fU_TI_1_Loc         = null;
            this.difTexSampler_fU_TI_1             = uIdx++  + unifLocOffset;

                    this.alpha_fU_F1_1_Loc         = null;
                    this.alpha_fU_F1_1             = uIdx++  + unifLocOffset;

                  this.diffCol_fU_F3_1_Loc         = null;
                  this.diffCol_fU_F3_1             = uIdx++  + unifLocOffset;

          this.emisAndAmbColor_fU_F3_1_Loc         = null;
          this.emisAndAmbColor_fU_F3_1             = uIdx++  + unifLocOffset;

    this.specularAmtRoughness_fU_F2_1_Loc          = null;
    this.specularAmtRoughness_fU_F2_1              = uIdx++  + unifLocOffset;

               //this.screenDims_fU_F2_1_Loc         = null;
               //this.screenDims_fU_F2_1             = 7  + unifLocOffset;

    //uniforms - fragment lighting
           this.cubeTexSampler_fU_TI_1_Loc         = null;
           this.cubeTexSampler_fU_TI_1             = uIdx++  + unifLocOffset;
    
       this.subSurfaceExponent_fU_F1_1_Loc         = null;
       this.subSurfaceExponent_fU_F1_1             = uIdx++  + unifLocOffset;

              this.camWorldPos_fU_F3_1_Loc         = null;
              this.camWorldPos_fU_F3_1             = uIdx++  + unifLocOffset;

                this.numLights_fU_I1_1_Loc         = null;
                this.numLights_fU_I1_1             = uIdx++  + unifLocOffset;

                 this.LightPos_fU_F3_3_Loc         = null;
                 this.LightPos_fU_F3_3             = uIdx++  + unifLocOffset;

    //uniforms - vertex
 this.boneMatrixTextureSampler_vU_TI_1_Loc         = null;
 this.boneMatrixTextureSampler_vU_TI_1             = uIdx++  + unifLocOffset;

                 this.numBones_vU_F1_1_Loc         = null;
                 this.numBones_vU_F1_1             = uIdx++  + unifLocOffset;

                     this.proj_vU_M1_1_Loc         = null;
                     this.proj_vU_M1_1             = uIdx++  + unifLocOffset;

                      this.mdl_vU_M1_1_Loc         = null;
                      this.mdl_vU_M1_1             = uIdx++  + unifLocOffset;


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
	        triG.difTexSampler_fU_TI_1_Loc         = gl.getUniformLocation( triG.glProgram.glProgId, 'texSampler' );
                    triG.alpha_fU_F1_1_Loc         = gl.getUniformLocation( triG.glProgram.glProgId, 'alpha'                   );
                  triG.diffCol_fU_F3_1_Loc         = gl.getUniformLocation( triG.glProgram.glProgId, 'diffuseColor'            );
          triG.emisAndAmbColor_fU_F3_1_Loc         = gl.getUniformLocation( triG.glProgram.glProgId, 'emissionAndAmbientColor' );
    triG.specularAmtRoughness_fU_F2_1_Loc         = gl.getUniformLocation( triG.glProgram.glProgId, 'specularAmtRoughness'   );
               //triG.screenDims_fU_F2_1_Loc         = gl.getUniformLocation( triG.glProgram.glProgId, 'screenDims'              );
	//fragment shader lighting uniforms
           triG.cubeTexSampler_fU_TI_1_Loc         = gl.getUniformLocation( triG.glProgram.glProgId, 'cubeTexSampler' );
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

function TRI_G_cubeTexLoaded(cubeTex, triG){
	triG.cubeTex = cubeTex;
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
	
	//select which texture units sampler uniforms are bound to
	//https://stackoverflow.com/questions/54931941/correspondance-between-texture-units-and-sampler-uniforms-in-opengl
	GLP_setUnif_I1(triG.glProgram, triG.difTexSampler_fU_TI_1_Loc, triG.difTexSampler_fU_TI_1, 0);
	GLP_setUnif_I1(triG.glProgram, triG.cubeTexSampler_fU_TI_1_Loc, triG.cubeTexSampler_fU_TI_1, 2);
	GLP_setUnif_I1(triG.glProgram, triG.boneMatrixTextureSampler_vU_TI_1_Loc, triG.boneMatrixTextureSampler_vU_TI_1, 1); //binds to gl TEXTURE1 unit

	GLP_setUnif_I1( triG.glProgram, triG.difTexSampler_fU_TI_1_Loc, triG.difTexSampler_fU_TI_1, 0 );
	//GLP_setIntUniform(triG.glProgram, 'texSampler', 0);


	//set the rendering state varaibles (init them to 0 then set to 1 to ensure we are tracking the gl state)

	

	GLP_setUnif_F3(triG.glProgram, triG.diffCol_fU_F3_1_Loc, triG.diffCol_fU_F3_1, temp);
	//triG.glProgram.setVec4Uniform('ambient', temp);
	//CheckGLError( "glProgram::before lighting enabled " );

	//lighting setup
	//GLP_setUnif_I1( triG.glProgram, triG.lightingEnabled_fU_I1, triG.lightingEnabled_Unif_I1Loc, 0 );

	//enable program vertexAttrib arrays
	gl.enableVertexAttribArray(triG.position_vA_F3_1_Loc );
	gl.enableVertexAttribArray(triG.norm_vA_F3_1_Loc     );
	gl.enableVertexAttribArray(triG.texCoord_vA_F2_1_Loc );

	//gl.enableVertexAttribArray(triG.indexWeights_vA_F4_A_Loc);
	
	//GLP_setUnif_F2( triG.glProgram, triG.screenDims_fU_F2_1_Loc, triG.screenDims_fU_F2_1, [1,1]);//[graphics.canvas.width*0.03, graphics.canvas.height*0.03]);


	if( triG.cubeTex == null ){
		if( !triG.cubeTexLoadingStarted ){
			triG.cubeTexLoadingStarted = true;
			GRPH_GetCached( 'cloudy/bluecloud', 'sailDefault', Texture, 2, CUBE_G_cubeTexLoaded, triG ); //wrapType2 
		}
	}else if( triG.cubeTex.isValid ){
		TEX_BindCube( triG.cubeTex, gl.TEXTURE2 );
	}


	//CheckGLError( "glProgram::end frag shader loaded " );
}


function TriG_Cleanup(triG){
	gl.disableVertexAttribArray(triG.position_vA_F3_1_Loc );
	gl.disableVertexAttribArray(triG.norm_vA_F3_1_Loc     );
	gl.disableVertexAttribArray(triG.texCoord_vA_F2_1_Loc );
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

function TRI_G_VertBufQuadmesh( numVerts ){
	this.vertBufferForMat = [new Float32Array(numVerts*vertCard)];
	this.normBufferForMat = [new Float32Array(numVerts*normCard)];
	this.uvBufferForMat   = [new Float32Array(numVerts*uvCard)  ];
	this.lclMinCorner = Vect3_NewZero();
	this.lclMaxCorner = Vect3_NewZero();
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
	let vertBufQuadmesh = null;
	let vertBufMdl = null;
	if( drawBatch.numBufSubRanges < sspTInstNum+1 ){ //mdl hasn't been created yet
		vertBufQuadmesh = new TRI_G_VertBufQuadmesh( 6 );
		let mdlName = sspTInstNum + " " + textureName;
		vertBufMdl = new Model( mdlName, meshNameIn=null, armNameIn=null, ipoNameIn=null, materialNamesIn, sceneNameIn=sceneName, AABBIn,
				locationIn=[center[0],center[1],depth], rotationIn, scaleIn=[widthHeight[0],widthHeight[1],1],
					modelLoadedParameters=null, modelLoadedCallback=null, isPhysical=false );
		vertBufMdl.quadmesh = vertBufQuadmesh;
	}
	let subBB = GetDrawSubBatchBuffer( drawBatch, sspTInstNum, 6, vertBufMdl, 0 );
	vertBufMdl = subBB.mdl;
	subBB.toWorldMatrix = IdentityMatrix;

	let tquvs  = vertBufMdl.quadmesh.uvBufferForMat[0];
	let tqvrts = vertBufMdl.quadmesh.vertBufferForMat[0];

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
		GLP_setUnif_F2( triG.glProgram, triG.specularAmtRoughness_fU_F2_1_Loc, triG.specularAmtRoughness_fU_F2_1,  buf.material.specularAmtRoughness );
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
			let qm = subRange.mdl.quadmesh;
			
			//vertexAttribSetSubFloats = function( attribInstID, offset, arr )
			GLP_vertexAttribSetSubFloats( triG.glProgram,     bufID,   startIdx*vertCard,      qm.vertBufferForMat     [subRange.mdlMatIdx] );
			GLP_vertexAttribSetSubFloats( triG.glProgram,     bufID+1, startIdx*normCard,      qm.normBufferForMat     [subRange.mdlMatIdx] );
			GLP_vertexAttribSetSubFloats( triG.glProgram,     bufID+2, startIdx*uvCard,        qm.uvBufferForMat       [subRange.mdlMatIdx] );
			if( subRange.skelAnim != null )
				GLP_vertexAttribSetSubFloats( triG.glProgram, bufID+3, startIdx*bnIdxWghtCard, subRange.mdl.bnIdxWghtBufferForMat[subRange.mdlMatIdx] );
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
