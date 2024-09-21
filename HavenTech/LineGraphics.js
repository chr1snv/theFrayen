
function LineGraphics(loadCompleteCallback, unifLocOffset){

	this.loadCompleteCallback = loadCompleteCallback;

	this.glProgram = new GlProgram('frayenLine', this, LINE_G_LoadComp);
	
	this.projMatrixUnif = null;
	
	//this.diffColUnif_F4 = null;
	
	this.positionAttrib_F3 = null;
	this.ptColAttrib_F4 = null;
	
}

function LINE_G_LoadComp(lineG){

	//gl.useProgram from shader compilation

	lineG.projMatrixUnif = gl.getUniformLocation( lineG.glProgram.glProgId, 'projection');
	
	//lineG.pointSizeAttrib_F      = gl.getUniformLocation( this.glProgram.glProgId, 'pointSize' );
	//lineG.pointSizeUnif_FLoc     = 0 + unifLocOffset;
	//lineG.pointFalloffUnif_F   = gl.getUniformLocation( this.glProgram.glProgId, 'pointFalloff' );
	//lineG.pointFalloffUnif_FLoc  = 0 + unifLocOffset;

	lineG.positionAttrib_F3    =  gl.getAttribLocation(lineG.glProgram.glProgId, 'position' );
	lineG.ptColAttrib_F4       =  gl.getAttribLocation(lineG.glProgram.glProgId, 'ptCol' );
	
	if( lineG.loadCompleteCallback != null )
		lineG.loadCompleteCallback( lineG );
}


function LINE_G_Setup(lineG){

	let progId = lineG.glProgram.glProgId;

	gl.useProgram(progId);
	//CheckGLError( "after enable line glProgram " );


	//set the rendering state varaibles (init them to 0 then set to 1 to ensure we are tracking the gl state)
	
	//GLP_setUnif_F3(lineG.glProgram, lineG.diffColUnif_F4, lineG.diffColUnif_F4Loc, temp);
	
	//CheckGLError( "glProgram::end frag shader loaded " );
}


function LINE_G_setCamMatrix( lineG, camMat ){
	Matrix_Transpose( transMat, camMat );
	gl.uniformMatrix4fv( lineG.projMatrixUnif, false, transMat );
}



function LINE_G_drawLines( lineG, buf ){


	let bufID = (buf.bufID);
	if( buf.vertsNotYetUploaded ){ //upload the initial / changed coordinates to gl
		//GLP_vertexAttribSetFloats( triG.glProgram, 0,  3, tqvrts, triG.positionAttrib );
		GLP_vertexAttribSetFloats( lineG.glProgram, bufID,        vertCard,      buf.buffers[0], lineG.positionAttrib_F3 );//buf.isAnimated );
		GLP_vertexAttribSetFloats( lineG.glProgram, bufID+1,      colCard,      buf.buffers[1], lineG.ptColAttrib_F4 );//buf.isAnimated );
		buf.vertsNotYetUploaded = false;
	}else{
		GLP_vertexAttribBuffEnable( lineG.glProgram, bufID ,  vertCard, (buf.bufferIdx)*vertCard );
		GLP_vertexAttribBuffEnable( lineG.glProgram, bufID+1, colCard, (buf.bufferIdx)*colCard );
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
		//if( CheckGLError("drawLines, after drawArrays") )
		//	DTPrintf("LineG drawArrays error", "trig");
	}
	
}
