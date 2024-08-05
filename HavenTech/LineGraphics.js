
function LineGraphics(loadCompleteCallback){

	this.glProgram = new GlProgram('frayenLine', null, loadCompleteCallback);
	
	this.projMatrixUnif = null;
	
	this.diffColUnif_F4 = null;
}


function LINE_G_Setup(lineG){

	let progId = lineG.glProgram.glProgId;

	gl.useProgram(progId);
	//CheckGLError( "after enable line glProgram " );

	if( !lineG.projMatrixUnif )
		lineG.projMatrixUnif = gl.getUniformLocation( lineG.glProgram.glProgId, 'projection');


	//set the rendering state varaibles (init them to 0 then set to 1 to ensure we are tracking the gl state)
	
	lineG.diffColUnif_F4 = gl.getUniformLocation( lineG.glProgram.glProgId, 'diffuseColor' );
	
	GLP_setVec4Uniform(lineG.glProgram, lineG.diffColUnif_F4, temp);
	
	//CheckGLError( "glProgram::end frag shader loaded " );
}


function LINE_G_setCamMatrix( lineG, camMat ){
	Matrix_Transpose( transMat, camMat );
	gl.uniformMatrix4fv( lineG.projMatrixUnif, false, transMat );
}



function LINE_G_drawLines( lineG, buf ){


	let bufID = (buf.bufID);
	if( buf.bufferUpdated ){ //upload the initial / changed coordinates to gl
		GLP_vertexAttribSetFloats( lineG.glProgram, bufID,        vertCard,      buf.buffers[0],       'position',     1);//buf.isAnimated );
		GLP_vertexAttribSetFloats( lineG.glProgram, bufID+1,      colCard,      buf.buffers[1],       'ptCol',         1);//buf.isAnimated );
		buf.bufferUpdated = false;
	}else{
		GLP_vertexAttribBuffEnable( lineG.glProgram, bufID ,  vertCard, (buf.bufferIdx)*vertCard);
		GLP_vertexAttribBuffEnable( lineG.glProgram, bufID+1, colCard, (buf.bufferIdx)*colCard);
	}

	let bufSubRangeKeys = Object.keys(buf.bufSubRanges);
	for( let i = 0; i < bufSubRangeKeys.length; ++i ){
		let subRange = buf.bufSubRanges[ bufSubRangeKeys[i] ];
		let startIdx = subRange.startIdx;
		
		

		//set the screenspace orthographic matrix
		//transpose=true requires webgl2.0
		//Matrix_Transpose( transMat, subRange.toWorldMatrix );
		//gl.uniformMatrix4fv( lineG.mMatrixUnif, false, transMat );//, 0, 4*4 );

		gl.drawArrays( gl.LINES, startIdx, subRange.len );
		//CheckGLError("drawLines, after drawArrays");
	}
	
}
