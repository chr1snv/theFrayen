
function TriGraphics(loadCompleteCallback){

	this.currentTexId     = -1;
	this.currentColor     = [0.0, 0.0, 0.0, 0.0];
	this.ambAndDiffuse    = [0.0, 0.0, 0.0, 0.0];
	this.emission         = [0.0, 0.0, 0.0, 0.0];
	this.specular         = [0.0, 0.0, 0.0, 0.0];
	this.shinyness        = 0;


	this.glProgram = new GlProgram('frayen', null, loadCompleteCallback);

	this.textures = {};
}

let identMatrix = Matrix_New();
Matrix_SetIdentity(identMatrix);

let temp = [1.0,1.0,1.0,1.0];
let tempZero = [ 0,0,0,1];
function TRI_G_Setup(triG){

	let progId = triG.glProgram.glProgId;

	gl.useProgram(progId);
	//CheckGLError( "after enable tri glProgram " );


	if( !triG.texturingEnabled_UnifF1 )
		triG.texturingEnabled_UnifF1 = gl.getUniformLocation( triG.glProgram.glProgId, 'texturingEnabled' );

	if( !triG.projMatrixUnif )
		triG.projMatrixUnif = gl.getUniformLocation( triG.glProgram.glProgId, 'projMatrix');

	if( !triG.mMatrixUnif ){
		triG.mMatrixUnif = gl.getUniformLocation( triG.glProgram.glProgId, 'mMatrix');
	}


	//set the rendering state varaibles (init them to 0 then set to 1 to ensure we are tracking the gl state)
	
	triG.glProgram.setIntUniform('boneMatrixTexture', 1);
	triG.glProgram.setIntUniform('texSampler', 0);

	triG.glProgram.setVec4Uniform('diffuseColor', temp);
	//triG.glProgram.setVec4Uniform('ambient', temp);
	//CheckGLError( "glProgram::before lighting enabled " );

	//lighting setup
	triG.glProgram.setIntUniform( 'lightingEnabled', 0 );


	//CheckGLError( "glProgram::end frag shader loaded " );
}


let trigLightPosVec = new Array(8*vertCard);
function TRI_G_SetupLights(triG, lights, numLights, ambientColor){
	for( let l = 0; l < numLights; ++l ){
		Vect_CopyToFromArr( trigLightPosVec, l*3, lights[l].pos, 0, 3 );
	}
	triG.glProgram.setVec3Uniform( 'lightPos', trigLightPosVec );
	//triG.glProgram.setVec4Uniform( 'lightPos', trigLightPosVec );
	triG.glProgram.setIntUniform( 'numLights', numLights );
	
	triG.ambientColor = ambientColor;
	
}


function triGTexReady(triG, tex){
	triG.textures[tex.texName] = tex;
}

// Draw a textured screenspace rectangle
function TRI_G_drawScreenSpaceTexturedQuad(triG, textureName, sceneName, center, widthHeight, minUv, maxUv ){

	if( textureName != null ){
		if( !triG.textures[textureName] ){ //wait until the texture is loaded to draw it
			graphics.GetTexture(textureName, sceneName, triG, triGTexReady);
			return;
		}

		triG.textures[textureName].Bind();
		
		triG.glProgram.setFloatUniform( 'texturingEnabled', 1 );
	}else{
		triG.glProgram.setFloatUniform( 'texturingEnabled', 0 );
	}

	triG.glProgram.setIntUniform( 'skelSkinningEnb', 0 );
	
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
	let vertices = [ mm[0], mm[1], 0.0,   //left bottom
					 mM[0], mM[1], 0.0,   //left top
					 MM[0], MM[1], 0.0,   //right top
					 MM[0], MM[1], 0.0,   //right top
					 Mm[0], Mm[1], 0.0,   //right bottom
					 mm[0], mm[1], 0.0 ]; //left bottom
	let verts = new Float32Array(vertices);

	let uvs = new Float32Array(6*2);
	uvs[0*2+0] = minUv[0]; uvs[0*2+1] = minUv[1]; //left  bottom
	uvs[1*2+0] = minUv[0]; uvs[1*2+1] = maxUv[1]; //left  top
	uvs[2*2+0] = maxUv[0]; uvs[2*2+1] = maxUv[1]; //right top
	uvs[3*2+0] = maxUv[0]; uvs[3*2+1] = maxUv[1]; //right top
	uvs[4*2+0] = maxUv[0]; uvs[4*2+1] = minUv[1]; //right bottom
	uvs[5*2+0] = minUv[0]; uvs[5*2+1] = minUv[1]; //left  bottom


	triG.glProgram.vertexAttribSetFloats( 0,  3, verts, 'position' );
	//CheckGLError("draw square, after position attributeSetFloats");
	triG.glProgram.vertexAttribSetFloats( 1,    3, verts, 'norm' );
	//CheckGLError("draw square, after normal attributeSetFloats");
	triG.glProgram.vertexAttribSetFloats( 2,  2, uvs, 'texCoord' );
	//CheckGLError("draw square, after texCoord attributeSetFloats");
	gl.drawArrays(gl.TRIANGLES, 0, 6);
	//CheckGLError("draw square, after drawArrays");
	//gl.flush();
}

function TRI_G_setCamMatrix( triG, camMat, camWorldPos ){
	Matrix_Transpose( transMat, camMat );
	gl.uniformMatrix4fv( triG.projMatrixUnif, false, transMat );
	triG.glProgram.setVec3Uniform( 'camWorldPos', camWorldPos );
}

const TRI_G_VERT_ATTRIB_UID_START = 3;

let transMat = Matrix_New();
//let camWorldToViewportMatrix = Matrix_New();
//let tempMat = Matrix_New();
function TRI_G_drawTriangles( triG, textureName, sceneName, buf, totalNumBones ){

	if( textureName != null ){
		if( !triG.textures[textureName] ){ //wait until the texture is loaded to draw it
			graphics.GetTexture(textureName, sceneName, triG, triGTexReady);
			return;
		}

		triG.textures[textureName].Bind();

		triG.glProgram.setFloatUniform( 'texturingEnabled', 1 );
	}else{
		triG.glProgram.setFloatUniform( 'texturingEnabled', 0 );
		triG.glProgram.setVec4Uniform('diffuseColor', buf.diffuseCol);
	}

	if( buf.material.isShadeless ){
		triG.glProgram.setIntUniform( 'lightingEnabled', 0 );
	}else{
		triG.glProgram.setIntUniform( 'lightingEnabled', 1 );
	}
	
	triG.glProgram.setVec2Uniform( 'specularAmtExponent', buf.material.specularAmtExponent );
	
	triG.glProgram.setVec3Uniform( 'emissionAndAmbientColor', triG.ambientColor );
	


	let bufID = (buf.bufID);
	if( buf.bufferUpdated ){ //upload the initial / changed coordinates to gl
		triG.glProgram.vertexAttribSetFloats( bufID,        vertCard,      buf.vertBuffer,       'position',     0);//buf.isAnimated );
		triG.glProgram.vertexAttribSetFloats( bufID+1,      vertCard,      buf.normBuffer,       'norm',         0);//buf.isAnimated );
		triG.glProgram.vertexAttribSetFloats( bufID+2,      uvCard,        buf.uvBuffer,         'texCoord',     0);//buf.isAnimated );
		if( buf.bnIdxWghtBuffer != null )
			triG.glProgram.vertexAttribSetFloats( bufID+3,  bnIdxWghtCard, buf.bnIdxWghtBuffer,  'indexWeights', 0);//buf.isAnimated );
		buf.bufferUpdated = false;
	}else{
		triG.glProgram.vertexAttribBuffEnable( bufID ,  vertCard, (buf.bufferIdx)*vertCard);
		triG.glProgram.vertexAttribBuffEnable( bufID+1, vertCard, (buf.bufferIdx)*vertCard);
		triG.glProgram.vertexAttribBuffEnable( bufID+2, uvCard,   (buf.bufferIdx)*uvCard  );
		if( buf.bnIdxWghtBuffer != null )
			triG.glProgram.vertexAttribBuffEnable( bufID+3, bnIdxWghtCard, (buf.bufferIdx)*bnIdxWghtCard );
	}

	let bufSubRangeKeys = Object.keys(buf.bufSubRanges);
	for( let i = 0; i < bufSubRangeKeys.length; ++i ){
		let subRange = buf.bufSubRanges[ bufSubRangeKeys[i] ];
		let startIdx = subRange.startIdx;
		
		if( subRange.skelAnim != null ){
			triG.glProgram.setIntUniform( 'skelSkinningEnb', 1 );
			let rowIdx = Math.floor(sceneTime % 4)
			triG.glProgram.setFloatUniform( 'numBones', totalNumBones );
		}else{
			triG.glProgram.setIntUniform( 'skelSkinningEnb', 0 );
		}

		//set the screenspace orthographic matrix
		//transpose=true requires webgl2.0
		Matrix_Transpose( transMat, subRange.toWorldMatrix );
		gl.uniformMatrix4fv( triG.mMatrixUnif, false, transMat );//, 0, 4*4 );

		gl.drawArrays( gl.TRIANGLES, startIdx, subRange.len );
		//CheckGLError("drawTriangles, after drawArrays");
	}
	
}
