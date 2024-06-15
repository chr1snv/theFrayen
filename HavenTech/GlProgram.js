//glProgram.js: - to request use permission please contact chris@itemfactorystudio.com

//encapsulates web gl Shader setup and compilation from file

function GlProgram(nameIn, readyCallbackParams, programReadyCallback)
{
	this.programName = nameIn;
	
	this.glProgId = gl.createProgram();  //should also maybe gl.deleteProgram(Object program) when done using
	
	this.vertShaderFilename = 'shaders/' + nameIn + 'VertShader.vsh';
	this.fragShaderFilename = 'shaders/' + nameIn + 'FragShader.fsh';

	//once the fragment shader has been loaded, compile and configure it
	this.fragShaderLoaded = function(textFile, thisP)
	{
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
	this.vertShaderLoaded = function(textFile, thisP){
		let vertexShader = gl.createShader(gl.VERTEX_SHADER); //gl.deleteShader(Object program) when done using
		gl.shaderSource(vertexShader, textFile);
		gl.compileShader(vertexShader);
		if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS) && gl.getShaderInfoLog(vertexShader))
			alert('vertex shader log: ' + gl.getShaderInfoLog(vertexShader));
		gl.attachShader(thisP.glProgId, vertexShader);

		loadTextFile( thisP.fragShaderFilename, thisP.fragShaderLoaded, thisP );
	}
	this.unifLocs = {};
	this.unifInitCopyAndSetters = {
		'4fv': [Vect3_NewZero, Vect3_Copy, gl.uniform4fv],
		'1f' : [0, function(d, i){ d = i; }, gl.uniform1f],
		'1i' : [0, function(d, i){ d = i; }, gl.uniform1i]
	};
	this.setUniformType = function( unifName, type, value ){
		if( this.unifLocs[unifName] == undefined )
			this.unifLocs[unifName] = gl.getUniformLocation(this.glProgId, unifName);
		if( this.unifLocs[unifName + 'val'] == undefined )
			this.unifLocs[unifName + 'val'] = unifInitCopyAndSetters[type][0]();
		if( !Vect3_Cmp( this.unifLocs[unifName + 'val'], value ) ){
			unifInitCopyAndSetters[type][1]( this.unifLocs[unifName + 'val'], value);
			unifInitCopyAndSetters[type][2]( this.unifLocs[unifName], value );
		}
	}
	this.setVec4Uniform = function( unifName, value ){
		if( this.unifLocs[unifName] == undefined )
			this.unifLocs[unifName] = gl.getUniformLocation(this.glProgId, unifName);
		if( this.unifLocs[unifName + 'val'] == undefined )
			this.unifLocs[unifName + 'val'] = Vect3_NewZero();
		if( !Vect3_Cmp( this.unifLocs[unifName + 'val'], value ) ){
			Vect3_Copy( this.unifLocs[unifName + 'val'], value);
			gl.uniform4fv( this.unifLocs[unifName], value );
		}
	}
	this.setFloatUniform = function( unifName, value ){
		if( this.unifLocs[unifName] == undefined )
			this.unifLocs[unifName] = gl.getUniformLocation(this.glProgId, unifName);
		if( this.unifLocs[unifName + 'val'] == undefined )
			this.unifLocs[unifName + 'val'] = 0;
		if( this.unifLocs[unifName + 'val'] != value ){
			this.unifLocs[unifName + 'val'] = value;
			gl.uniform1f( this.unifLocs[unifName], value );
		}
	}
	this.setIntUniform = function( unifName, value ){
		if( this.unifLocs[unifName] == undefined )
			this.unifLocs[unifName] = gl.getUniformLocation(this.glProgId, unifName);
		if( this.unifLocs[unifName + 'val'] == undefined )
			this.unifLocs[unifName + 'val'] = 0;
		if( this.unifLocs[unifName + 'val'] != value ){
			this.unifLocs[unifName + 'val'] = value;
			gl.uniform1i( this.unifLocs[unifName], value );
		}
	}
	
	this.cleanupVertexAttribBuffs  = function(){
		let vertexAttribBuffKeys = Object.keys( this.attribLocs );
		for( let i = 0; i < vertexAttribBuffKeys.length; ++i ){
			gl.deleteBuffer( this.attribLocs[vertexAttribBuffKeys[i]][1] );
		}
		delete( this.attribLocs );
		this.attribLocs = {};
	}
	
	this.vertexAttribBuffEnable = function(attribInstID, rsize, len){
		gl.bindBuffer(gl.ARRAY_BUFFER, this.attribLocs[attribInstID][1]);
		//gl.bufferData(gl.ARRAY_BUFFER, len, gl.STATIC_DRAW);
		gl.vertexAttribPointer(this.attribLocs[attribInstID][0], rsize, gl.FLOAT, false, 0, 0);
	}
	
	//used to pass vertex attribute array perameters
	this.attribLocs = {};
	this.vertexAttribSetFloats = function( attribInstID, rsize, arr, attr_name, dynamic ){
		if( this.attribLocs[attribInstID] == undefined ){
			//gl.deleteBuffer(Object buffer) when done using
			this.attribLocs[attribInstID] = [gl.getAttribLocation(this.glProgId, attr_name), gl.createBuffer()]; 
			gl.enableVertexAttribArray(this.attribLocs[attribInstID][0]);
		}
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.attribLocs[attribInstID][1]);
		
		//if( !gl.isBuffer( this.attribLocs[attribInstID][1] ) )
		//	console.log("failed to allocate buffer");
		
		if( dynamic )
			gl.bufferData(gl.ARRAY_BUFFER, arr, gl.DYNAMIC_DRAW);
		else
			gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
		gl.vertexAttribPointer(this.attribLocs[attribInstID][0], rsize, gl.FLOAT, false, 0, 0);
	}

	this.readyCallbackParams = readyCallbackParams;
	this.programReadyCallback = programReadyCallback;
	//start fetching and loading the vertex shader
	loadTextFile(this.vertShaderFilename, this.vertShaderLoaded, this);


}
