
function TriGraphics(loadCompleteCallback){

	this.currentTexId     = -1;
	this.currentColor     = [0.0, 0.0, 0.0, 0.0];
	this.ambAndDiffuse    = [0.0, 0.0, 0.0, 0.0];
	this.emission         = [0.0, 0.0, 0.0, 0.0];
	this.specular         = [0.0, 0.0, 0.0, 0.0];
	this.shinyness        = 0;


	this.triProgram = new GlProgram('frayen', null, loadCompleteCallback);

	this.textures = {};
}


let temp = [1.0,1.0,1.0,1.0];
function TRI_G_Setup(triG){

	let progId = triG.triProgram.glProgId;

	gl.useProgram(progId);
	//CheckGLError( "after enable tri glProgram " );

	if( !triG.texturingEnabled_UnifF1 )
		triG.texturingEnabled_UnifF1 = gl.getUniformLocation( triG.triProgram.glProgId, 'texturingEnabled' );

	if( !triG.mvpMatrixUnif )
		triG.mvpMatrixUnif = gl.getUniformLocation( triG.triProgram.glProgId, 'mvpMatrix');
	
	//set the rendering state varaibles (init them to 0 then set to 1 to ensure we are tracking the gl state)

	triG.triProgram.setVec4Uniform('color', temp);
	triG.triProgram.setVec4Uniform('ambient', temp);
	triG.triProgram.setVec4Uniform('emission', temp);
	triG.triProgram.setVec4Uniform('specular', temp);
	triG.triProgram.setFloatUniform('shinyness', 1);
	//CheckGLError( "glProgram::before lighting enabled " );

	//lighting setup
	triG.triProgram.setFloatUniform( 'lightingEnabled', 0 );


	//CheckGLError( "glProgram::end frag shader loaded " );
}


function triGTexReady(triG, tex){
	triG.textures[tex.texName] = tex;
}

// Draw a textured screenspace rectangle
function TRI_G_drawScreenSpaceTexturedQuad(triG, textureName, sceneName, center, widthHeight, minUv, maxUv ){

	if( !triG.textures[textureName] ){ //wait until the texture is loaded to draw it
		graphics.GetTexture(textureName, sceneName, triG, triGTexReady);
		return;
	}

	triG.textures[textureName].Bind();
	
	triG.triProgram.setFloatUniform( 'texturingEnabled', 1 );

	//set the screenspace orthographic matrix
	glOrtho(-graphics.GetScreenAspect(), graphics.GetScreenAspect(),
			-1,1,//-graphics.screenHeight, graphics.screenHeight,
			-1, 1);
	Matrix_Transpose( transMat, gOM );
	gl.uniformMatrix4fv(triG.mvpMatrixUnif, false, transMat);//, 0, 4*4 );


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


	triG.triProgram.vertexAttribSetFloats( 'position',  3, verts );
	//CheckGLError("draw square, after position attributeSetFloats");
	triG.triProgram.vertexAttribSetFloats( 'norm',    3, verts );
	//CheckGLError("draw square, after normal attributeSetFloats");
	triG.triProgram.vertexAttribSetFloats( 'texCoord',  2, uvs );
	//CheckGLError("draw square, after texCoord attributeSetFloats");
	gl.drawArrays(gl.TRIANGLES, 0, 6);
	//CheckGLError("draw square, after drawArrays");
	//gl.flush();
}


let transMat = Matrix_New();
function TRI_G_drawTriangles(triG, textureName, sceneName, wrldToCamMat, verts, uvs, bufLen ){
	if( !triG.textures[textureName] ){ //wait until the texture is loaded to draw it
		graphics.GetTexture(textureName, sceneName, triG, triGTexReady);
		return;
	}

	triG.textures[textureName].Bind();

	triG.triProgram.setFloatUniform( 'texturingEnabled', 1 );

	//set the screenspace orthographic matrix
	Matrix_Transpose( transMat, wrldToCamMat );
	gl.uniformMatrix4fv(triG.mvpMatrixUnif, false, transMat);//, 0, 4*4 );//transpose=true requires webgl2.0

	triG.triProgram.vertexAttribSetFloats( 'position',  3, verts );
	//CheckGLError("draw square, after position attributeSetFloats");
	triG.triProgram.vertexAttribSetFloats( 'norm',    3, verts );
	//CheckGLError("draw square, after normal attributeSetFloats");
	triG.triProgram.vertexAttribSetFloats( 'texCoord',  2, uvs );
	//CheckGLError("draw square, after texCoord attributeSetFloats");
	gl.drawArrays(gl.TRIANGLES, 0, bufLen);
}
