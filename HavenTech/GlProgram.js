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
	
	this.setVec4Uniform = function( unifName, value ){
		let unifLoc = gl.getUniformLocation(this.glProgId, unifName);
		gl.uniform4fv( unifLoc, value );
	}
	this.setFloatUniform = function( unifName, value ){
		let unifLoc = gl.getUniformLocation(this.glProgId, unifName);
		gl.uniform1f( unifLoc, value );
	}

	this.readyCallbackParams = readyCallbackParams;
	this.programReadyCallback = programReadyCallback;
	//start fetching and loading the vertex shader
	loadTextFile(this.vertShaderFilename, this.vertShaderLoaded, this);


}
