
function TriGraphics(loadCompleteCallback){

	this.currentTexId     = -1;
	this.currentColor     = [0.0, 0.0, 0.0, 0.0];
	this.ambAndDiffuse    = [0.0, 0.0, 0.0, 0.0];
	this.emission         = [0.0, 0.0, 0.0, 0.0];
	this.specular         = [0.0, 0.0, 0.0, 0.0];
	this.shinyness        = 0;


	this.loadCompleteCallback = loadCompleteCallback;
	this.glProgram = new GlProgram('frayen', this, TRIG_LoadComp);

	this.textures = {};
	
	
	this.texturingEnabled_UnifF1 = null;
	
	this.projMatrixUnif          = null;
	this.mMatrixUnif             = null;
	
	this.positionAttribLoc     = null;
	this.normAttribLoc         = null;
	this.texCoordAttribLoc     = null;
	this.indexWeightsAttribLoc = null;
	
}

function TRIG_LoadComp(triG){

	
	triG.texturingEnabled_UnifF1 = gl.getUniformLocation( triG.glProgram.glProgId, 'texturingEnabled' );
	triG.projMatrixUnif = gl.getUniformLocation( triG.glProgram.glProgId, 'projMatrix');
	triG.mMatrixUnif = gl.getUniformLocation( triG.glProgram.glProgId, 'mMatrix');

	triG.positionAttribLoc     = gl.getAttribLocation(triG.glProgram.glProgId, 'position');
	triG.normAttribLoc         = gl.getAttribLocation(triG.glProgram.glProgId, 'norm');
	triG.texCoordAttribLoc     = gl.getAttribLocation(triG.glProgram.glProgId, 'texCoord');
	triG.indexWeightsAttribLoc = gl.getAttribLocation(triG.glProgram.glProgId, 'indexWeights');

	if( triG.loadCompleteCallback != null )
		triG.loadCompleteCallback(triG);

}

let identMatrix = Matrix_New();
Matrix_SetIdentity(identMatrix);

let temp = [1.0,1.0,1.0,1.0];
let tempZero = [ 0,0,0,1];
function TRI_G_Setup(triG){

	let progId = triG.glProgram.glProgId;

	gl.useProgram(progId);
	//CheckGLError( "after enable tri glProgram " );


	//set the rendering state varaibles (init them to 0 then set to 1 to ensure we are tracking the gl state)
	
	GLP_setIntUniform(triG.glProgram, 'boneMatrixTexture', 1);
	GLP_setIntUniform(triG.glProgram, 'texSampler', 0);

	GLP_setVec4Uniform(triG.glProgram, 'diffuseColor', temp);
	//triG.glProgram.setVec4Uniform('ambient', temp);
	//CheckGLError( "glProgram::before lighting enabled " );

	//lighting setup
	GLP_setIntUniform( triG.glProgram, 'lightingEnabled', 0 );

	//enable program vertexAttrib arrays
	gl.enableVertexAttribArray(triG.positionAttribLoc);
	gl.enableVertexAttribArray(triG.normAttribLoc);
	gl.enableVertexAttribArray(triG.texCoordAttribLoc);
	
	//gl.enableVertexAttribArray(triG.indexWeightsAttribLoc);


	//CheckGLError( "glProgram::end frag shader loaded " );
}


let trigLightPosVec = new Array(8*vertCard);
function TRI_G_SetupLights(triG, lights, numLights, ambientColor){
	for( let l = 0; l < numLights; ++l ){
		Vect_CopyToFromArr( trigLightPosVec, l*3, lights[l].pos, 0, 3 );
	}
	GLP_setVec3Uniform( triG.glProgram, 'lightPos', trigLightPosVec );
	//triG.glProgram.setVec4Uniform( 'lightPos', trigLightPosVec );
	GLP_setIntUniform( triG.glProgram, 'numLights', numLights );
	
	triG.ambientColor = ambientColor;
	
}


function triGTexReady(triG, tex){
	triG.textures[tex.texName] = tex;
}

let tquvs = new Float32Array(6*2);
let tqvrts = new Float32Array(6*3);
// Draw a textured screenspace rectangle
function TRI_G_drawScreenSpaceTexturedQuad(triG, textureName, sceneName, center, widthHeight, minUv, maxUv, depth ){

	GLP_setIntUniform( triG.glProgram, 'lightingEnabled', 0 );

	if( textureName != null ){
		if( !triG.textures[textureName] ){ //wait until the texture is loaded to draw it
			graphics.GetTexture(textureName, sceneName, triG, triGTexReady);
			return;
		}

		triG.textures[textureName].Bind();
		
		GLP_setFloatUniform( triG.glProgram, 'texturingEnabled', 1 );
	}else{
		GLP_setFloatUniform( triG.glProgram, 'texturingEnabled', 0 );
	}

	GLP_setIntUniform( triG.glProgram, 'skelSkinningEnb', 0 );
	gl.disableVertexAttribArray(triG.indexWeightsAttribLoc);
	
	Matrix_Transpose( transMat, identMatrix );
	gl.uniformMatrix4fv( triG.mMatrixUnif, false, transMat );

	//set the screenspace orthographic matrix
	glOrtho(-graphics.GetScreenAspect(), graphics.GetScreenAspect(),
			-1,1,//-graphics.screenHeight, graphics.screenHeight,
			-1, 1);
	Matrix_Transpose( transMat, gOM );
	gl.uniformMatrix4fv(triG.projMatrixUnif, false, transMat);//, 0, 4*4 );


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


	GLP_vertexAttribSetFloats( triG.glProgram, 0,  3, tqvrts, triG.positionAttribLoc );
	//CheckGLError("draw square, after position attributeSetFloats");
	GLP_vertexAttribSetFloats( triG.glProgram, 1,    3, tqvrts, triG.normAttribLoc );
	//CheckGLError("draw square, after normal attributeSetFloats");
	GLP_vertexAttribSetFloats( triG.glProgram, 2,  2, tquvs, triG.texCoordAttribLoc );
	//CheckGLError("draw square, after texCoord attributeSetFloats");
	//GLP_vertexAttribBuffResizeAllocateOrEnableAndBind( 
	gl.drawArrays(gl.TRIANGLES, 0, 6);
	//CheckGLError("draw square, after drawArrays");
	//gl.flush();
}

function TRI_G_setCamMatrix( triG, camMat, camWorldPos ){
	Matrix_Transpose( transMat, camMat );
	gl.uniformMatrix4fv( triG.projMatrixUnif, false, transMat );
	GLP_setVec3Uniform( triG.glProgram, 'camWorldPos', camWorldPos );
}

const TRI_G_VERT_ATTRIB_UID_START = 3;

let transMat = Matrix_New();
//let camWorldToViewportMatrix = Matrix_New();
//let tempMat = Matrix_New();
function TRI_G_drawTriangles( triG, textureName, sceneName, buf, totalNumBones ){

	//set texture or color for material
	if( textureName != null ){
		if( !triG.textures[textureName] ){ //wait until the texture is loaded to draw it
			graphics.GetTexture(textureName, sceneName, triG, triGTexReady);
			return;
		}

		triG.textures[textureName].Bind();

		GLP_setFloatUniform( triG.glProgram, 'texturingEnabled', 1 );
	}else{
		GLP_setFloatUniform( triG.glProgram, 'texturingEnabled', 0 );
		GLP_setVec4Uniform( triG.glProgram, 'diffuseColor', buf.diffuseCol);
	}

	//set lighting model uniforms
	if( buf.material.isShadeless ){
		GLP_setIntUniform( triG.glProgram, 'lightingEnabled', 0 );
	}else{
		GLP_setIntUniform( triG.glProgram, 'lightingEnabled', 1 );
		
		GLP_setVec2Uniform( triG.glProgram, 'specularAmtExponent', buf.material.specularAmtExponent );
	
		GLP_setVec3Uniform( triG.glProgram, 'emissionAndAmbientColor', triG.ambientColor );
		
		GLP_setFloatUniform( triG.glProgram, 'subSurfaceExponent', buf.material.subSurfaceExponent );
	}


	//CheckGLError("TRI_G_drawTriangles after set uniforms");

	//allocate / resize buffers for material
	let isDynamic = buf.vertexAnimated;
	let numVerts = buf.bufferIdx;
	let bufID = (buf.bufID);
		
	GLP_vertexAttribBuffResizeAllocateOrEnableAndBind(triG.glProgram, bufID, triG.positionAttribLoc,  vertCard, numVerts*vertCard, isDynamic);
	GLP_vertexAttribBuffResizeAllocateOrEnableAndBind(triG.glProgram, bufID+1, triG.normAttribLoc,      vertCard, numVerts*normCard, isDynamic);
	GLP_vertexAttribBuffResizeAllocateOrEnableAndBind(triG.glProgram, bufID+2, triG.texCoordAttribLoc,  uvCard, numVerts*uvCard,   isDynamic);
	if( buf.hasSkelAnim ){
		GLP_vertexAttribBuffResizeAllocateOrEnableAndBind(triG.glProgram, bufID+3, triG.indexWeightsAttribLoc,  bnIdxWghtCard, numVerts*bnIdxWghtCard,   false);
		gl.enableVertexAttribArray(triG.indexWeightsAttribLoc);
	}
	else
		gl.disableVertexAttribArray(triG.indexWeightsAttribLoc);
	//CheckGLError("TRI_G_drawTriangles after GLP_vertexAttribBuffAllocateOrEnableAndBind");
	

	//CheckGLError("TRI_G_drawTriangles before upload verts attributes if necessary");
	//upload verts attributes if necessary
	let bufSubRangeKeys = Object.keys(buf.bufSubRanges);
	for( let i = 0; i < bufSubRangeKeys.length; ++i ){
		let subRange = buf.bufSubRanges[ bufSubRangeKeys[i] ];
		let startIdx = subRange.startIdx;
		
		if( subRange.vertsNotYetUploaded ){
			
			//vertexAttribSetSubFloats = function( attribInstID, offset, arr )
			GLP_vertexAttribSetSubFloats( triG.glProgram, bufID,   startIdx*vertCard, subRange.obj.vertBufferForMat[subRange.objMatIdx] );
			GLP_vertexAttribSetSubFloats( triG.glProgram, bufID+1, startIdx*normCard, subRange.obj.normBufferForMat[subRange.objMatIdx] );
			GLP_vertexAttribSetSubFloats( triG.glProgram, bufID+2, startIdx*uvCard, subRange.obj.uvBufferForMat[subRange.objMatIdx] );
			if( subRange.skelAnim != null )
				GLP_vertexAttribSetSubFloats( triG.glProgram,
					bufID+3, startIdx*bnIdxWghtCard, subRange.obj.bnIdxWghtBufferForMat[subRange.objMatIdx] );
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

	for( let i = 0; i < bufSubRangeKeys.length; ++i ){
		let subRange = buf.bufSubRanges[ bufSubRangeKeys[i] ];
		let startIdx = subRange.startIdx;
		
		if( subRange.skelAnim != null ){
			GLP_setIntUniform( triG.glProgram, 'skelSkinningEnb', 1 );
			GLP_setFloatUniform( triG.glProgram, 'numBones', totalNumBones );
		}else{
			GLP_setIntUniform( triG.glProgram, 'skelSkinningEnb', 0 );
		}
		

		//set the screenspace orthographic matrix
		//transpose=true requires webgl2.0
		Matrix_Transpose( transMat, subRange.toWorldMatrix );
		gl.uniformMatrix4fv( triG.mMatrixUnif, false, transMat );//, 0, 4*4 );

		let vertBufferEndIdx = buf.bufferIdx;
		let subRangeEndIdx = startIdx + subRange.len;
		if( subRangeEndIdx > vertBufferEndIdx )
			console.log("subRangeEndIdx > vertBufferEndIdx");
		//CheckGLError("TRI_G_drawTriangles before gl.drawArrays");
		gl.drawArrays( gl.TRIANGLES, startIdx, subRange.len );
		//CheckGLError("TRI_G_drawTriangles after gl.drawArrays");
		
		buf.regenAndUploadEntireBuffer = false;
	}
	
}
