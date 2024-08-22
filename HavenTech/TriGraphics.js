
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
	this.skelSkinningEnbUnif_I1                 = null;
	this.skelSkinningEnbUnif_I1Loc              = 0 + unifLocOffset;
	//flags - fragment
	this.texturingEnabled_UnifF1                = null;
	this.texturingEnabled_UnifF1Loc             = 1 + unifLocOffset;
	this.lightingEnabled_Unif_I1                = null;
	this.lightingEnabled_Unif_I1Loc             = 2 + unifLocOffset;
	
	//uniforms - fragment
	this.alphaUnif_F                            = null;
	this.alphaUnif_FLoc                         = 3 + unifLocOffset;
	this.diffColUnif_F3                         = null;
	this.diffColUnif_F3Loc                      = 4 + unifLocOffset;
	this.emisAndAmbColorUnif_F3                 = null;
	this.emisAndAmbColorUnif_F3Loc              = 5 + unifLocOffset;
	this.specularAmtHrdnessExp_F2               = null;
	this.specularAmtHrdnessExp_F2Loc            = 6 + unifLocOffset;
	//uniforms - fragment lighting
	this.subSurfaceExponent_F                   = null;
	this.subSurfaceExponent_FLoc                = 7 + unifLocOffset;
	this.camWorldPos_F3                         = null;
	this.camWorldPos_F3Loc                      = 8 + unifLocOffset;
	this.numLightsUnif_I                        = null;
	this.numLightsUnif_ILoc                     = 9 + unifLocOffset;
	this.LightPos_F3v3                          = null;
	this.LightPos_F3v3Loc                       = 10+ unifLocOffset;
	//uniforms - vertex
	this.boneMatrixTextureSamplerTexUnitUnif    = null;
	this.boneMatrixTextureSamplerTexUnitUnifLoc = 11+ unifLocOffset;
	this.numBones_F                             = null;
	this.numBones_FLoc                          = 12+ unifLocOffset;
	this.projMatrixUnif                         = null;
	this.projMatrixUnifLoc                      = 13+ unifLocOffset;
	this.mMatrixUnif                            = null;
	this.mMatrixUnifLoc                         = 14+ unifLocOffset;

	//attributes per vertex
	this.positionAttrib                         = null;
	this.positionAttribLoc                      = 15 + unifLocOffset;
	this.normAttrib                             = null;
	this.normAttribLoc                          = 16 + unifLocOffset;
	this.texCoordAttrib                         = null;
	this.texCoordAttribLoc                      = 17 + unifLocOffset;
	this.indexWeightsAttrib                     = null;
	this.indexWeightsAttribLoc                  = 18 + unifLocOffset;

}

function TRIG_LoadComp(triG){

	//gl.useProgram from shader compilation

	//fragment shader flags
	triG.lightingEnabled_Unif_I1             = gl.getUniformLocation( triG.glProgram.glProgId, 'lightingEnabled' );
	triG.texturingEnabled_UnifF1             = gl.getUniformLocation( triG.glProgram.glProgId, 'texturingEnabled' );
	//vertex shader flags
	triG.skelSkinningEnbUnif_I1              = gl.getUniformLocation( triG.glProgram.glProgId, 'skelSkinningEnb' );
	
	//fragment shader color uniforms
	triG.alphaUnif_F                         = gl.getUniformLocation( triG.glProgram.glProgId, 'alpha' );
	triG.diffColUnif_F3                      = gl.getUniformLocation( triG.glProgram.glProgId, 'diffuseColor' );
	triG.emisAndAmbColorUnif_F3              = gl.getUniformLocation( triG.glProgram.glProgId, 'emissionAndAmbientColor' );
	triG.specularAmtHrdnessExp_F2            = gl.getUniformLocation( triG.glProgram.glProgId, 'specularAmtHrdnessExp' );
	//fragment shader lighting uniforms
	triG.subSurfaceExponent_F                = gl.getUniformLocation( triG.glProgram.glProgId, 'subSurfaceExponent' );
	triG.camWorldPos_F3                      = gl.getUniformLocation( triG.glProgram.glProgId, 'camWorldPos' );
	triG.numLightsUnif_I                     = gl.getUniformLocation( triG.glProgram.glProgId, 'numLights' );
	triG.LightPos_F3v3                       = gl.getUniformLocation( triG.glProgram.glProgId, 'lightPos' );


	triG.boneMatrixTextureSamplerTexUnitUnif = gl.getUniformLocation( triG.glProgram.glProgId, 'boneMatrixTexture' );
	//vertex shader matrix uniforms
	triG.projMatrixUnif                      = gl.getUniformLocation( triG.glProgram.glProgId, 'projMatrix');
	triG.mMatrixUnif                         = gl.getUniformLocation( triG.glProgram.glProgId, 'mMatrix');
	triG.numBones_F                          = gl.getUniformLocation( triG.glProgram.glProgId, 'numBones' );

	//vertex shader per vertex attributes
	triG.positionAttrib                      = gl.getAttribLocation(triG.glProgram.glProgId, 'position');
	triG.normAttrib                          = gl.getAttribLocation(triG.glProgram.glProgId, 'norm');
	triG.texCoordAttrib                      = gl.getAttribLocation(triG.glProgram.glProgId, 'texCoord');
	triG.indexWeightsAttrib                  = gl.getAttribLocation(triG.glProgram.glProgId, 'indexWeights');


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

	GLP_setUnif_I1(triG.glProgram, triG.boneMatrixTextureSamplerTexUnitUnif, triG.boneMatrixTextureSamplerTexUnitUnifLoc, 1); //possibly binds to gl TEXTURE1 unit
	//GLP_setIntUniform(triG.glProgram, 'texSampler', 0);

	GLP_setUnif_F3(triG.glProgram, triG.diffColUnif_F3, triG.diffColUnif_F3Loc, temp);
	//triG.glProgram.setVec4Uniform('ambient', temp);
	//CheckGLError( "glProgram::before lighting enabled " );

	//lighting setup
	//GLP_setUnif_I1( triG.glProgram, triG.lightingEnabled_Unif_I1, triG.lightingEnabled_Unif_I1Loc, 0 );

	//enable program vertexAttrib arrays
	gl.enableVertexAttribArray(triG.positionAttrib);
	gl.enableVertexAttribArray(triG.normAttrib);
	gl.enableVertexAttribArray(triG.texCoordAttrib);

	//gl.enableVertexAttribArray(triG.indexWeightsAttrib);


	//CheckGLError( "glProgram::end frag shader loaded " );
}


let trigLightPosVec = new Array(8*vertCard);
function TRI_G_SetupLights(triG, lights, numLights, ambientColor){

	triG.ambientColor = ambientColor;

	GLP_setUnif_I1( triG.glProgram, triG.numLightsUnif_I, triG.numLightsUnif_ILoc, numLights );

	for( let l = 0; l < numLights; ++l ){
		Vect_CopyToFromArr( trigLightPosVec, l*3, lights[l].pos, 0, 3 );
	}
	GLP_setUnif_F3( triG.glProgram, triG.LightPos_F3v3, triG.LightPos_F3v3Loc, trigLightPosVec );
	//triG.glProgram.setVec4Uniform( 'lightPos', trigLightPosVec );

}


function triGTexReady( tex, triG ){
	triG.textures[tex.texName] = tex;
}

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

let tquvs = new Float32Array(6*2);
let tqvrts = new Float32Array(6*3);
// Draw a textured screenspace rectangle
function TRI_G_drawScreenSpaceTexturedQuad(triG, textureName, sceneName, center, widthHeight, minUv, maxUv, depth ){

	GLP_setUnif_I1( triG.glProgram, triG.lightingEnabled_Unif_I1, triG.lightingEnabled_Unif_I1Loc, 0 );
	
	GLP_setUnif_F1( triG.glProgram, triG.alphaUnif_F, triG.alphaUnif_FLoc, 1 );

	if( textureName != null ){
		if( !triG.textures[textureName] ){ //wait until the texture is loaded to draw it
			graphics.GetCached(textureName, sceneName, Texture, 0, triGTexReady, triG);
			return;
		}

		TEX_Bind( triG.textures[textureName] );

		GLP_setUnif_F1( triG.glProgram, triG.texturingEnabled_UnifF1, triG.texturingEnabled_UnifF1Loc, 1 );
	}else{
		GLP_setUnif_F1( triG.glProgram, triG.texturingEnabled_UnifF1, triG.texturingEnabled_UnifF1Loc, 0 );
	}

	GLP_setUnif_I1( triG.glProgram, triG.skelSkinningEnbUnif_I1, triG.skelSkinningEnbUnif_I1Loc, 0 );
	gl.disableVertexAttribArray(triG.indexWeightsAttrib);

	TRIG_SetDefaultOrthoCamMat(triG);

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
}

function TRI_G_setCamMatrix( triG, camMat, camWorldPos ){
	Matrix_Transpose( transMat, camMat );
	gl.uniformMatrix4fv( triG.projMatrixUnif, false, transMat );
	GLP_setUnif_F3( triG.glProgram, triG.camWorldPos_F3, triG.camWorldPos_F3Loc, camWorldPos );
}

const TRI_G_VERT_ATTRIB_UID_START = 3;

let transMat = Matrix_New();
//let camWorldToViewportMatrix = Matrix_New();
//let tempMat = Matrix_New();
function TRI_G_drawTriangles( triG, buf, totalNumBones ){

	GLP_setUnif_F1( triG.glProgram, triG.alphaUnif_F, triG.alphaUnif_FLoc, buf.material.alpha );

	//set texture or color for material
	if( buf.material.texture != null ){

		TEX_Bind(  buf.material.texture );

		GLP_setUnif_F1( triG.glProgram, triG.texturingEnabled_UnifF1,  triG.texturingEnabled_UnifF1Loc, 1 );
	}else{
		GLP_setUnif_F1( triG.glProgram, triG.texturingEnabled_UnifF1,  triG.texturingEnabled_UnifF1Loc, 0 );
		GLP_setUnif_F3( triG.glProgram, triG.diffColUnif_F3,           triG.diffColUnif_F3Loc,               buf.material.diffuseCol);
	}

	//set lighting model uniforms
	if( buf.material.isShadeless ){
		GLP_setUnif_I1( triG.glProgram, triG.lightingEnabled_Unif_I1,  triG.lightingEnabled_Unif_I1Loc,  0 );
		GLP_setUnif_F3( triG.glProgram, triG.emisAndAmbColorUnif_F3,   triG.emisAndAmbColorUnif_F3Loc,   buf.material.lumCol );
	}else{
		GLP_setUnif_I1( triG.glProgram, triG.lightingEnabled_Unif_I1,  triG.lightingEnabled_Unif_I1Loc,  1 );
		GLP_setUnif_F2( triG.glProgram, triG.specularAmtHrdnessExp_F2, triG.specularAmtHrdnessExp_F2Loc, buf.material.specularAmtExponent );
		GLP_setUnif_F3( triG.glProgram, triG.emisAndAmbColorUnif_F3,   triG.emisAndAmbColorUnif_F3Loc,   triG.ambientColor );
		GLP_setUnif_F1( triG.glProgram, triG.subSurfaceExponent_F,     triG.subSurfaceExponent_FLoc,     buf.material.subSurfaceExponent );
	}


	//CheckGLError("TRI_G_drawTriangles after set uniforms");

	//allocate / resize buffers for material
	let isDynamic = buf.vertexAnimated;
	let numVerts = buf.bufferIdx;
	let bufID = (buf.bufID);
		
	GLP_vertexAttribBuffResizeAllocateOrEnableAndBind(triG.glProgram,     bufID,   triG.positionAttrib,     vertCard,      numVerts*vertCard,      isDynamic);
	GLP_vertexAttribBuffResizeAllocateOrEnableAndBind(triG.glProgram,     bufID+1, triG.normAttrib,         normCard,      numVerts*normCard,      isDynamic);
	GLP_vertexAttribBuffResizeAllocateOrEnableAndBind(triG.glProgram,     bufID+2, triG.texCoordAttrib,     uvCard,        numVerts*uvCard,        isDynamic);
	if( buf.hasSkelAnim ){
		GLP_vertexAttribBuffResizeAllocateOrEnableAndBind(triG.glProgram, bufID+3, triG.indexWeightsAttrib, bnIdxWghtCard, numVerts*bnIdxWghtCard, false);
		gl.enableVertexAttribArray(triG.indexWeightsAttrib);
		GLP_setUnif_F1( triG.glProgram, triG.numBones_F, triG.numBones_FLoc, totalNumBones );
	}
	else
		gl.disableVertexAttribArray(triG.indexWeightsAttrib);
	//CheckGLError("TRI_G_drawTriangles after GLP_vertexAttribBuffAllocateOrEnableAndBind");


	//CheckGLError("TRI_G_drawTriangles before upload verts attributes if necessary");
	//upload verts attributes if necessary
	let bufSubRangeKeys = buf.sortedSubRngKeys;
	for( let i = 0; i < buf.numBufSubRanges; ++i ){
		let subRange = buf.bufSubRanges[ bufSubRangeKeys[i] ];
		let startIdx = subRange.startIdx;
		
		if( subRange.vertsNotYetUploaded ){
			
			//vertexAttribSetSubFloats = function( attribInstID, offset, arr )
			GLP_vertexAttribSetSubFloats( triG.glProgram,     bufID,   startIdx*vertCard,      subRange.obj.vertBufferForMat[subRange.objMatIdx] );
			GLP_vertexAttribSetSubFloats( triG.glProgram,     bufID+1, startIdx*normCard,      subRange.obj.normBufferForMat[subRange.objMatIdx] );
			GLP_vertexAttribSetSubFloats( triG.glProgram,     bufID+2, startIdx*uvCard,        subRange.obj.uvBufferForMat[subRange.objMatIdx]   );
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
		
		if( subRange.skelAnim != null ){
			GLP_setUnif_I1( triG.glProgram, triG.skelSkinningEnbUnif_I1, triG.skelSkinningEnbUnif_I1Loc, 1 );
		}else{
			GLP_setUnif_I1( triG.glProgram, triG.skelSkinningEnbUnif_I1, triG.skelSkinningEnbUnif_I1Loc,  0 );
		}
		
		if( subRange.overrideColor ){
			GLP_setUnif_F3( triG.glProgram, triG.emisAndAmbColorUnif_F3, triG.emisAndAmbColorUnif_F3Loc, subRange.overrideColor );
			overrideColorSet = true;
		}else if( overrideColorSet ){
			GLP_setUnif_F3( triG.glProgram, triG.emisAndAmbColorUnif_F3, triG.emisAndAmbColorUnif_F3Loc, buf.material.lumCol );
			//GLP_setUnif_F3( triG.glProgram, triG.emisAndAmbColorUnif_F3, buf.material.diffuseCol);
			overrideColorSet = false;
		}
		
		

		//set the model matrix
		//transpose=true requires webgl2.0
		Matrix_Transpose( transMat, subRange.toWorldMatrix );
		gl.uniformMatrix4fv( triG.mMatrixUnif, false, transMat );//, 0, 4*4 );

		let vertBufferEndIdx = buf.bufferIdx;
		let subRangeEndIdx = startIdx + subRange.len;
		if( subRangeEndIdx > vertBufferEndIdx )
			console.log("subRangeEndIdx > vertBufferEndIdx");
		//CheckGLError("TRI_G_drawTriangles before gl.drawArrays");
		gl.drawArrays( gl.TRIANGLES, startIdx, subRange.len );
		//if( CheckGLError("TRI_G_drawTriangles after gl.drawArrays") )
		//	DTPrintf("TriG drawArrays error", "trig");
		
		buf.regenAndUploadEntireBuffer = false;
	}
	
}
