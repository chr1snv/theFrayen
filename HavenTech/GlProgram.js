//glProgram.js: - to request use permission please contact chris@itemfactorystudio.com

//encapsulates web gl Shader setup and compilation from file

function GlProgram(nameIn, readyCallbackParams, programReadyCallback)
{
	this.programName = nameIn;
	
	this.glProgId = gl.createProgram();
	
	this.vertShaderFilename = 'shaders/' + nameIn + 'VertShader.vsh';
	this.fragShaderFilename = 'shaders/' + nameIn + 'FragShader.fsh';

	//once the fragment shader has been loaded, compile and configure it
	this.fragShaderLoaded = function(textFile, thisP)
	{
		CheckGLError( "glProgram::begin frag shader loaded " );
		let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, textFile);
		gl.compileShader(fragmentShader);
		if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS) && gl.getShaderInfoLog(fragmentShader))
			alert( 'fragment shader log: ' + gl.getShaderInfoLog(fragmentShader) );
		gl.attachShader(thisP.glProgId, fragmentShader);
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
		let vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, textFile);
		gl.compileShader(vertexShader);
		if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS) && gl.getShaderInfoLog(vertexShader))
			alert('vertex shader log: ' + gl.getShaderInfoLog(vertexShader));
		gl.attachShader(thisP.glProgId, vertexShader);

		loadTextFile( thisP.fragShaderFilename, thisP.fragShaderLoaded, thisP );
	}
	this.unifLocs = {};
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
	
	//used to pass vertex attribute array perameters
	this.attribLocs = {};
	this.vertexAttribSetFloats = function( attr_name, rsize, arr){
		if( this.attribLocs[attr_name] == undefined )
			this.attribLocs[attr_name] = gl.getAttribLocation(this.glProgId, attr_name);
		
		gl.enableVertexAttribArray(this.attribLocs[attr_name]);
		gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
		gl.bufferData(gl.ARRAY_BUFFER, arr, gl.DYNAMIC_DRAW);
		gl.vertexAttribPointer(this.attribLocs[attr_name], rsize, gl.FLOAT, false, 0, 0);
	}

	this.readyCallbackParams = readyCallbackParams;
	this.programReadyCallback = programReadyCallback;
	//start fetching and loading the vertex shader
	loadTextFile(this.vertShaderFilename, this.vertShaderLoaded, this);


}