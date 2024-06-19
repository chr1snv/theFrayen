
function LineGraphics(loadCompleteCallback){



	this.glProgram = new GlProgram('frayenLine', null, loadCompleteCallback);
}


function LINE_G_Setup(lineG){

	let progId = lineG.glProgram.glProgId;

	gl.useProgram(progId);
	//CheckGLError( "after enable line glProgram " );

	if( !lineG.projMatrixUnif )
		lineG.projMatrixUnif = gl.getUniformLocation( lineG.glProgram.glProgId, 'projection');

	if( !lineG.mMatrixUnif ){
		lineG.mMatrixUnif = gl.getUniformLocation( lineG.glProgram.glProgId, 'mMatrix');
	}


	//set the rendering state varaibles (init them to 0 then set to 1 to ensure we are tracking the gl state)
	
	lineG.glProgram.setVec4Uniform('diffuseColor', temp);
	
	//CheckGLError( "glProgram::end frag shader loaded " );
}


function LINE_G_setCamMatrix( lineG, camMat ){
	Matrix_Transpose( transMat, camMat );
	gl.uniformMatrix4fv( lineG.projMatrixUnif, false, transMat );
}



function LINE_G_drawLines( lineG, buf ){


	let bufID = (buf.bufID);
	if( buf.bufferUpdated ){ //upload the initial / changed coordinates to gl
		lineG.glProgram.vertexAttribSetFloats( bufID,        vertCard,      buf.buffers[0],       'position',     0);//buf.isAnimated );
		lineG.glProgram.vertexAttribSetFloats( bufID+1,      colCard,      buf.buffers[1],       'ptCol',         0);//buf.isAnimated );
		buf.bufferUpdated = false;
	}else{
		lineG.glProgram.vertexAttribBuffEnable( bufID ,  vertCard, (buf.bufferIdx)*vertCard);
		lineG.glProgram.vertexAttribBuffEnable( bufID+1, colCard, (buf.bufferIdx)*colCard);
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
