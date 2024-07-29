//glProgram.js: - to request use permission please contact chris@itemfactorystudio.com

//encapsulates web gl Shader setup and compilation from file

function GlProgram(nameIn, readyCallbackParams, programReadyCallback)
{
	this.programName = nameIn;
	
	this.glProgId = gl.createProgram();  //should also maybe gl.deleteProgram(Object program) when done using
	
	this.vertShaderFilename = 'shaders/' + nameIn + 'VertShader.vsh';
	this.fragShaderFilename = 'shaders/' + nameIn + 'FragShader.fsh';
	
	this.unifLocs = {}; //dictionary of uniform names to glUniformLocations
	
	//used to pass vertex attribute array perameters
	//frayen attributeID to (gl program attribute location  and  allocated gl vertex Attribute buffers)
	this.attribLocBufPtrs = {};
	
	this.readyCallbackParams = readyCallbackParams;
	this.programReadyCallback = programReadyCallback;
	//start fetching and loading the vertex shader
	loadTextFile(this.vertShaderFilename, GLP_vertShaderLoaded, this);
	
}


	//once the fragment shader has been loaded, compile and configure it
function GLP_fragShaderLoaded(textFile, thisP){
	CheckGLError( "glProgram::begin frag shader loaded " );
	let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER); //gl.deleteShader(Object program) when done using
	gl.shaderSource(fragmentShader, textFile);
	gl.compileShader(fragmentShader);
	if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS) && gl.getShaderInfoLog(fragmentShader))
		alert( 'fragment shader log: ' + gl.getShaderInfoLog(fragmentShader) );
	gl.attachShader(thisP.glProgId, fragmentShader); //gl.detachShader(Object program, Object shader) when done using
	CheckGLError( "glProgram::end frag shader attached " );

	gl.validateProgram(thisP.glProgId);
	gl.linkProgram(thisP.glProgId);
	if(!gl.getProgramParameter(thisP.glProgId, gl.LINK_STATUS) && gl.getProgramInfoLog(thisP.glProgId))
		alert('gl glProgId status: ' + gl.getProgramInfoLog(thisP.glProgId));
	gl.useProgram(thisP.glProgId);
	CheckGLError( "glProgram::end frag shader validated " );

	//clear the render buffer
	//thisP.Clear();

	CheckGLError( "glProgram::after clear " );
	
	
	thisP.programReadyCallback(thisP.readyCallbackParams);
}

	//once the vertex shader is loaded start loading the fragment shader
function GLP_vertShaderLoaded(textFile, thisP){
	let vertexShader = gl.createShader(gl.VERTEX_SHADER); //gl.deleteShader(Object program) when done using
	gl.shaderSource(vertexShader, textFile);
	gl.compileShader(vertexShader);
	if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS) && gl.getShaderInfoLog(vertexShader))
		alert('vertex shader log: ' + gl.getShaderInfoLog(vertexShader));
	gl.attachShader(thisP.glProgId, vertexShader);

	loadTextFile( thisP.fragShaderFilename, GLP_fragShaderLoaded, thisP );
}

/*
const GLP_unifInitCopyAndSetters = {
	'4fv': [Vect3_NewZero, Vect3_Copy, gl.uniform4fv],
	'3fv': [Vect3_NewZero, Vect3_Copy, gl.uniform3fv],
	'1f' : [0, function(d, i){ d = i; }, gl.uniform1f],
	'1i' : [0, function(d, i){ d = i; }, gl.uniform1i]
};
function GLP_setUniformType( glp, unifName, type, value ){
	if( glp.unifLocs[unifName] == undefined )
		glp.unifLocs[unifName] = gl.getUniformLocation(this.glProgId, unifName);
	if( glp.unifLocs[unifName + 'val'] == undefined )
		glp.unifLocs[unifName + 'val'] = GLP_unifInitCopyAndSetters[type][0]();
	if( !Vect3_Cmp( glp.unifLocs[unifName + 'val'], value ) ){
		GLP_unifInitCopyAndSetters[type][1]( glp.unifLocs[unifName + 'val'], value);
		GLP_unifInitCopyAndSetters[type][2]( gl, glp.unifLocs[unifName], value );
	}
}
*/
	
function GLP_setVec4Uniform( glp, unifName, value ){
	if( glp.unifLocs[unifName] == undefined )
		glp.unifLocs[unifName] = gl.getUniformLocation(glp.glProgId, unifName);
	if( glp.unifLocs[unifName + 'val'] == undefined )
		glp.unifLocs[unifName + 'val'] = Vect_NewZero(4);
	if( !Vect3_Cmp( glp.unifLocs[unifName + 'val'], value ) ){
		Vect3_Copy( glp.unifLocs[unifName + 'val'], value);
		gl.uniform4fv( glp.unifLocs[unifName], value );
	}
}
function GLP_setVec3Uniform( glp, unifName, value ){
	if( glp.unifLocs[unifName] == undefined )
		glp.unifLocs[unifName] = gl.getUniformLocation(glp.glProgId, unifName);
	if( glp.unifLocs[unifName + 'val'] == undefined )
		glp.unifLocs[unifName + 'val'] = Vect3_NewZero();
	if( !Vect3_Cmp( glp.unifLocs[unifName + 'val'], value ) ){
		Vect3_Copy( glp.unifLocs[unifName + 'val'], value);
		gl.uniform3fv( glp.unifLocs[unifName], value );
	}
}
function GLP_setVec2Uniform( glp, unifName, value ){
	if( glp.unifLocs[unifName] == undefined )
		glp.unifLocs[unifName] = gl.getUniformLocation(glp.glProgId, unifName);
	if( glp.unifLocs[unifName + 'val'] == undefined )
		glp.unifLocs[unifName + 'val'] = Vect_NewZero(2);
	if( !Vect3_Cmp( glp.unifLocs[unifName + 'val'], value ) ){
		Vect3_Copy( glp.unifLocs[unifName + 'val'], value);
		gl.uniform2fv( glp.unifLocs[unifName], value );
	}
}
	
function GLP_setFloatUniform( glp, unifName, value ){
	if( glp.unifLocs[unifName] == undefined )
		glp.unifLocs[unifName] = gl.getUniformLocation(glp.glProgId, unifName);
	if( glp.unifLocs[unifName + 'val'] == undefined )
		glp.unifLocs[unifName + 'val'] = 0;
	if( glp.unifLocs[unifName + 'val'] != value ){
		glp.unifLocs[unifName + 'val'] = value;
		gl.uniform1f( glp.unifLocs[unifName], value );
	}
}
	
function GLP_setIntUniform( glp, unifName, value ){
	if( glp.unifLocs[unifName] == undefined )
		glp.unifLocs[unifName] = gl.getUniformLocation(glp.glProgId, unifName);
	if( glp.unifLocs[unifName + 'val'] == undefined )
		glp.unifLocs[unifName + 'val'] = 0;
	if( glp.unifLocs[unifName + 'val'] != value ){
		glp.unifLocs[unifName + 'val'] = value;
		gl.uniform1i( glp.unifLocs[unifName], value );
	}
}
function GLP_cleanup(glp){
	GLP_cleanupVertexAttribBuffs(glp);
}
function GLP_cleanupVertexAttribBuffs(glp){
	//frees bound vertex attributes
	let vertexAttribBuffKeys = Object.keys( glp.attribLocBufPtrs );
	for( let i = 0; i < vertexAttribBuffKeys.length; ++i ){
		gl.deleteBuffer( glp.attribLocBufPtrs[vertexAttribBuffKeys[i]][1] );
	}
	delete( glp.attribLocBufPtrs );
	glp.attribLocBufPtrs = {};
}
	
function GLP_cleanupVertexAttribBuff(glp, attribInstID){
	if( glp.attribLocBufPtrs[attribInstID] != undefined ){
		gl.deleteBuffer( glp.attribLocBufPtrs[attribInstID][1] );
		delete glp.attribLocBufPtrs[attribInstID];
	}
}
	
function GLP_vertexAttribBuffEnable( glp, attribInstID, rsize ){
	//attaches buffer to gl.ARRAY_BUFFER target
	gl.bindBuffer(gl.ARRAY_BUFFER, glp.attribLocBufPtrs[attribInstID][1]);
	//gl.bufferData(gl.ARRAY_BUFFER, len, gl.STATIC_DRAW);
	//links the buffer bound to gl.ARRAY_BUFFER to the program attribute location
	gl.vertexAttribPointer(glp.attribLocBufPtrs[attribInstID][0], rsize, gl.FLOAT, false, 0, 0);
}
	
function GLP_vertexAttribBuffResizeAllocateOrEnableAndBind( glp, attribInstID, attribLoc, rsize, overallLen, dynamic ){

	if( glp.attribLocBufPtrs[attribInstID] == undefined ){
		//gl.deleteBuffer(Object buffer) when done using
		glp.attribLocBufPtrs[attribInstID] = [attribLoc, gl.createBuffer(), -1];
		gl.enableVertexAttribArray(glp.attribLocBufPtrs[attribInstID][0]);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, glp.attribLocBufPtrs[attribInstID][1]);
		
	}else{
		gl.bindBuffer(gl.ARRAY_BUFFER, glp.attribLocBufPtrs[attribInstID][1]);
	}
	
	if( overallLen !=  glp.attribLocBufPtrs[attribInstID][2] ){
		let usage = gl.STATIC_DRAW;
		if( dynamic )
			usage = gl.DYNAMIC_DRAW;
		gl.bufferData(gl.ARRAY_BUFFER, overallLen*4, usage); //(size is in bytes, float 32/8 -> 4 )
		glp.attribLocBufPtrs[attribInstID][2] = overallLen;
	}
	
	//vertexAttribPointer(index, size, type, normalized, stride, offset)
	//binds buffer bound to gl.ARRAY_BUFFER to AttribLocation and specifies format
	//gl.vertexAttribPointer(this.attribLocBufPtrs[attribInstID][0], rsize, gl.FLOAT, false, 0, 0);
}
	

	
function GLP_vertexAttribSetFloats( glp, attribInstID, rsize, arr, attr_name, dynamic ){
	if( glp.attribLocBufPtrs[attribInstID] == undefined ){
		//gl.deleteBuffer(Object buffer) when done using
		glp.attribLocBufPtrs[attribInstID] = [gl.getAttribLocation(glp.glProgId, attr_name), gl.createBuffer()]; 
		gl.enableVertexAttribArray(glp.attribLocBufPtrs[attribInstID][0]);
	}
	
	gl.bindBuffer(gl.ARRAY_BUFFER, glp.attribLocBufPtrs[attribInstID][1]);
	
	//if( !gl.isBuffer( this.attribLocBufPtrs[attribInstID][1] ) )
	//	console.log("failed to allocate buffer");
	
	if( dynamic )
		gl.bufferData(gl.ARRAY_BUFFER, arr, gl.DYNAMIC_DRAW);
	else
		gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
	gl.vertexAttribPointer(glp.attribLocBufPtrs[attribInstID][0], rsize, gl.FLOAT, false, 0, 0);
	
	//CheckGLError( "glProgram::vertexAttribSetFloats " );
}

function GLP_vertexAttribSetSubFloats( glp, attribInstID, offset, arr ){
	
	gl.bindBuffer(gl.ARRAY_BUFFER, glp.attribLocBufPtrs[attribInstID][1]);
	
	//let buffSize = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE);
	//if( offset*4+arr.length*4 > buffSize )
	//	console.log("offset + size beyond buff len");
	
	//bufferSubData(target, offset, data) //uploads part of the AttribArray data to gl
	gl.bufferSubData( gl.ARRAY_BUFFER, offset*4, arr ); //offset is in bytes (float32/8 -> 4)
	
	
	//CheckGLError( "glProgram::vertexAttribSetFloats " );
}

function GLP_vertexAttribResizeFloats( glp, attribInstID, overallLen, dynamic ){
	gl.enableVertexAttribArray(glp.attribLocBufPtrs[attribInstID][0]);
	gl.bindBuffer(gl.ARRAY_BUFFER, glp.attribLocBufPtrs[attribInstID][1]);

	let usage = gl.STATIC_DRAW;
	if( dynamic )
		usage = gl.DYNAMIC_DRAW;
	gl.bufferData(gl.ARRAY_BUFFER, overallLen*4, usage);
}


