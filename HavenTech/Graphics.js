//Graphics.js

//helper function for printing gl errors
function CheckGLError(where)
{
	var error = gl.getError();
	var iter = 0;
	while(error != gl.NO_ERROR && iter < 100)
	{
		DPrintf(where + ': glError errorNum:' + iter + ' 0x' + error.toString(16));
		error = gl.getError();
		++iter;
	}
	if(iter > 0)
		return true;
	return false;
}

function drawSquare(graphics) // Draw the picture
{
	var vertices = [  0.0,  0.5, 0.0,
					 -0.5, -0.5, 0.0,
					  0.5, -0.5, 0.0 ]; 
	var verts = new Float32Array(vertices);

	attributeSetFloats( graphics.currentProgram, "position",  3, verts );
	CheckGLError("draw square, after position attributeSetFloats");
	attributeSetFloats( graphics.currentProgram, "norm",    3, verts );
	CheckGLError("draw square, after normal attributeSetFloats");
	attributeSetFloats( graphics.currentProgram, "texCoord",  2, verts );
	CheckGLError("draw square, after texCoord attributeSetFloats");
	gl.drawArrays(gl.TRIANGLES, 0, 3);
	CheckGLError("draw square, after drawArrays");
	gl.flush();
}

//used to pass perameters to a shader
function attributeSetFloats( prog, attr_name, rsize, arr)
{
    var attr = gl.getAttribLocation( prog, attr_name);
    gl.enableVertexAttribArray(attr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, arr, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(attr, rsize, gl.FLOAT, false, 0, 0);
}

function Graphics(canvasIn, bpp, depthIn)
{
	this.canvas = canvasIn;

	//maps used to keep track of primative graphics objects
	this.textures = {};
	this.shaders = {};
	this.quadMeshes = {};
	this.textureRefCts = {};
	this.shaderRefCts = {};
	this.quadMeshRefCts = {};

	this.maxLights = 8;
	this.numLightsBounded = 0;

	this.screenWidth = canvasIn.width;
	this.screenHeight = canvasIn.height;
	this.bpp = 0;

	//information about the rendering state (used to minimize the number of calls to gl)
	this.tex2Denb         = false;
	this.lightingEnb      = false;
	this.colorMaterialEnb = false;
	this.depthMaskEnb     = false;
	this.depthTestEnb     = false;
	this.currentTexId     = -1;
	this.currentColor     = [0.0, 0.0, 0.0, 0.0];
	this.ambAndDiffuse    = [0.0, 0.0, 0.0, 0.0];
	this.emission         = [0.0, 0.0, 0.0, 0.0];
	this.specular         = [0.0, 0.0, 0.0, 0.0];
	this.shinyness        = 0;

	//globally used constants
	this.vertCard = 3;
	this.normCard = 3;
	this.uvCard   = 2;
	this.matrixCard = 4*4;

	//for clearing the color buffer
	this.Clear = function()
	{
		gl.clear( gl.COLOR_BUFFER_BIT ); //| gl.DEPTH_BUFFER_BIT);
	}
	//for clearing depth between scene renderings
	this.ClearDepth = function()
	{
		gl.clear(gl.DEPTH_BUFFER_BIT);
	}   
	this.Flush = function()
	{
		gl.flush();
	}

	//functions for fog
	this.EnableFog = function(clipNear, clipFar)
	{
		gl.Enable(gl.FOG);
		gl.Fogx(gl.FOG_MODE, gl.LINEAR);
		var params = [];
		params[0]= 1.0; params[1]= 1.0; params[2]= 1.0; params[3]= 1.0;
		gl.Fogfv(gl.FOG_COLOR, params);
		gl.Fogf(gl.FOG_START, clipNear);
		gl.Fogf(gl.FOG_END, clipFar);
	}
	this.DisableFog = function() { glDisable(gl.FOG); }

	this.SetCanvasSize = function( width, height ){
		this.canvas.style.width = width + "px";
		this.canvas.style.height = height + "px";
		this.canvas.width = width;
		this.canvas.height = height;
		this.screenWidth = this.canvas.width;
		this.screenHeight = this.canvas.height;
		gl.width = width;
		gl.height = height;
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	}

    //returns width / height ( multiply fovy by this to get fovh )
	this.GetScreenAspect = function()
	{
	    return this.screenWidth/this.screenHeight;
	}
	
	//functions for altering the rendering state
	this.enableLighting = function(val)
	{
		if(this.lightingEnb != val)
		{
		    this.lightingEnb = val;
		    gl.uniform1f(gl.getUniformLocation(this.currentProgram, 'lightingEnb'), this.lightingEnb);
		}
	}
	this.enableDepthMask = function(val)
	{
		if(this.depthMaskEnb != val)
		{
		    this.depthMaskEnb = val;
		    val ? gl.depthMask(true) : gl.depthMask(false);
		}
	}
	this.enableDepthTest = function(val)
	{
		if(this.depthTestEnb != val)
		{
		    this.depthTestEnb = val;
		    val ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST);
		}
	}
	this.setTexture = function(texId)
	{
		if(this.currentTexId != texId)
		{
		    this.currentTexId = texId;
		    gl.bindTexture(gl.TEXTURE_2D, this.currentTexId);
		}
	}
	this.setColor = function(col)
	{
		if( !Vect3_Cmp(this.currentColor, col) )
		{
		    Vect3_Copy(this.currentColor, col);
		    gl.uniform4fv(gl.getUniformLocation(this.currentProgram, 'color'), this.currentColor);
		}
	}
	this.setAmbientAndDiffuse = function(col)
	{
		if(!Vect3_Cmp(this.ambAndDiffuse, col))
		{
		    Vect3_Copy(this.ambAndDiffuse, col);
		    gl.uniform4fv(gl.getUniformLocation(this.currentProgram, 'ambient'), this.ambAndDiffuse);
		}
	}
	this.setEmission = function(col)
	{
		if(!Vect3_Cmp(this.emission, col))
		{
		    Vect3_Copy(this.emission, col);
		    gl.uniform4fv(gl.getUniformLocation(this.currentProgram, 'emission'), this.emission);
		}
	}
	this.setSpecular = function(col)
	{
		if(!Vect3_Cmp(this.specular, col))
		{
		    Vect3_Copy(this.specular, col);
		    gl.uniform4fv(gl.getUniformLocation(this.currentProgram, 'specular'), this.specular);
		}
	}
	this.setShinyness = function(expV)
	{
		if(this.shinyness != expV)
		{
		    this.shinyness = expV;
		    gl.uniform1f(gl.getUniformLocation(this.currentProgram, 'shinyness'), this.shinyness);
		}
	}

	this.ClearLights = function()
	{
		for(var i=0; i<this.maxLights; ++i)
		    gl.uniform4f(gl.getUniformLocation(this.currentProgram, 'lightColor['+i+']'), 0,0,0,0);
		this.numLightsBounded = 0;
	}
	this.BindLight = function(light)
	{
		if(this.numLightsBounded >= this.maxLights)
		{
		    DPrintf("Graphics: error Max number of lights already bound.\n");
		    return;
		}
		this.enableLighting(true);
		light.BindToGL(this.numLightsBounded);
		++this.numLightsBounded;
	}

	//content access functions
	this.CopyShader = function( newName, newSceneName, oldShader ) {}
	this.GetShader = function( filename, sceneName, readyCallbackParams, shaderReadyCallback )
	{
		var concatName = filename + sceneName;
		if(filename === undefined)
		{
			filename = "Material";
			concatName = filename + sceneName;
		}
		var shader = this.shaders[ concatName ];
		if( shader === undefined )
		{	
		    //shader is not loaded, load the new shader and return it
		    new Shader( filename, sceneName, readyCallbackParams, 
		    	function( newShader, readyCallbackParams1 )
			    {
			        //if( newShader.isValid )
			        graphics.shaders[concatName] = newShader;
			        shaderReadyCallback(newShader, readyCallbackParams1);
			    });
		}else
		{
		   shaderReadyCallback(shader, readyCallbackParams);
		}
	}
	this.UnrefShader = function(filename, sceneName) {}
	this.AppendTexture = function(textureName, sceneName, newValidTexture)
	{
		var concatName = textureName + sceneName;        
		this.textures[concatName] = newValidTexture;
	}
	this.GetTexture = function(filename, sceneName, textureReadyCallback)
	{
		var concatName = filename + sceneName;
		var texture = this.textures[concatName];
		if(texture === undefined)
		{
		    //texture is not loaded, load the new texture and have it return when it's ready (async load)
		    Texture(filename, sceneName, textureReadyCallback, function(newTexture, textureReadyCallback){
				graphics.textures[concatName] = newTexture;
				textureReadyCallback(newTexture);
			});
		}else
		{
		    //the texture is ready, have it return through the callback
		    textureReadyCallback(texture);
		}
	}
	this.UnrefTexture = function(filename, sceneName) {}
	this.GetQuadMesh = function(filename, sceneName, readyCallbackParameters, quadMeshReadyCallback)
	{
		var concatName = filename + sceneName;
		var quadMesh = this.quadMeshes[concatName];
		if(quadMesh === undefined)
		{
			//mesh is not loaded, load the new mesh and return it (asynchronous load)
			var newMesh = new QuadMesh(filename, sceneName, quadMeshReadyCallback, readyCallbackParameters);
			this.quadMeshes[concatName] = newMesh;
		}else
		{
			quadMeshReadyCallback( quadMesh, readyCallbackParameters );
		}
	}
	this.UnrefQuadMesh = function(filename, sceneName) {}

	//initialization code
	gl = WebGLUtils.setupWebGL(canvasIn, { antialias: true, depth: true});

	//gl.width = 2000;
	//gl.height = 1000;

	//setup the gl state
	gl.clearColor( 0.6, 0.7, 1.0, 1.0 );
	gl.clearDepth(1.0);

	//gl.viewport(0, 0, screenWidth, screenHeight);

	//gl.enable(gl.CULL_FACE);
	//gl.cullFace(gl.BACK);

	this.enableDepthTest(true); //calls gl.enable(gl.DEPTH_TEST)

	//enable depth testing
	this.enableDepthMask(true); //calls gl.depthMask(gl.TRUE)
	gl.depthFunc(gl.LESS);
	

	//enable blending (for transparent materials)
	//gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	//gl.enable(gl.BLEND);

	//load and compile the program
	this.currentProgram = gl.createProgram();

    //once the fragment shader has been loaded, compile and configure it
	this.fragShaderLoaded = function(textFile, thisP)
	{
		CheckGLError( "Graphics::begin frag shader loaded " );
		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, textFile);
		gl.compileShader(fragmentShader);
		if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS) && gl.getShaderInfoLog(fragmentShader))
			alert( 'fragment shader log: ' + gl.getShaderInfoLog(fragmentShader) );
		gl.attachShader(thisP.currentProgram, fragmentShader);
		CheckGLError( "Graphics::end frag shader attached " );

		gl.validateProgram(thisP.currentProgram);
		gl.linkProgram(thisP.currentProgram);
		if(!gl.getProgramParameter(thisP.currentProgram, gl.LINK_STATUS) && gl.getProgramInfoLog(thisP.currentProgram))
			alert('gl currentProgram status: ' + gl.getProgramInfoLog(thisP.currentProgram));
		gl.useProgram(thisP.currentProgram);
		CheckGLError( "Graphics::end frag shader validated " );

		//clear the render buffer
		thisP.Clear();

		CheckGLError( "Graphics::after clear " );

		//drawSquare(thisP);

		CheckGLError( "Graphics::after draw square " );
			
		//set the rendering state varaibles (init them to 0 then set to 1 to ensure we are tracking the gl state)
		var temp = [1.0,1.0,1.0,1.0];
		thisP.setColor(temp);
		thisP.setAmbientAndDiffuse(temp);
		thisP.setEmission(temp);
		thisP.setSpecular(temp);
		thisP.setShinyness(1.0);
		CheckGLError( "Graphics::before lighting enabled " );

		//lighting setup
		thisP.enableLighting(true);
		CheckGLError( "Graphics::end frag shader loaded " );
	}

    //once the vertex shader is loaded start loading the fragment shader
	this.vertShaderLoaded = function(textFile, thisP)
	{
		var vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, textFile);
		gl.compileShader(vertexShader);
		if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS) && gl.getShaderInfoLog(vertexShader))
			alert('vertex shader log: ' + gl.getShaderInfoLog(vertexShader));
		gl.attachShader(thisP.currentProgram, vertexShader);

		loadTextFile('shaders/frayenFragShader.fsh', thisP.fragShaderLoaded, thisP);
	}

    //start fetching and loading the vertex shader
	loadTextFile('shaders/frayenVertShader.vsh', this.vertShaderLoaded, this);

}
    
    
