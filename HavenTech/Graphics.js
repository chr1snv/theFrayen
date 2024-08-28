//Graphics.js - to request use permission please contact chris@itemfactorystudio.com


//contains dictionaries of
//quadmeshs
//materials
//textures

//sets up canvas gl 3d context
//

//helper function for printing gl errors
function CheckGLError(where){
	var error = gl.getError();
	var iter = 0;
	while(error != gl.NO_ERROR && iter < 100){
		DTPrintf(where + ': glError errorNum:' + iter + ' 0x' + 
		error.toString(16) + ' ' + WebGLDebugUtils.glEnumToString(error), "CheckGLError" );
		error = gl.getError();
		++iter;
	}
	if(iter > 0)
		return true;
return false;
}

//globally used constants
const vertCard     = 3;
const normCard     = 3;
const uvCard       = 2;
const colCard      = 4;
const bnIdxWghtCard = 2*2; //(index of bone mat + weight) * 2 bone mats per vertex
const matrixCard   = 4*4;

function Graphics( canvasIn, loadCompleteCallback ){
	this.canvas = canvasIn;
	
	this.loadCompleteCallback = loadCompleteCallback;
	
	//WebGLDebugUtils.init(this.canvas);

	//maps used to keep track of primative graphics objects
	this.textures        = {};
	this.materials       = {};
	this.quadMeshes      = {};
	this.cachedObjs      = {};
	this.textureRefCts   = {};
	this.shaderRefCts    = {};
	this.quadMeshRefCts  = {};
	
	this.glPrograms = {};
	this.currentProgram = null;
	this.currentProgamName = '';

	this.maxLights        = 8;
	this.numLightsBounded = 0;

	this.screenWidth      = canvasIn.width;
	this.screenHeight     = canvasIn.height;
	this.bpp              = 0;

	//information about the rendering state (used to minimize the number of calls to gl)
	this.tex2Denb         = false;
	this.lightingEnb      = false;
	this.colorMaterialEnb = false;
	this.depthMaskEnb     = false;
	this.depthTestEnb     = false;

	//for clearing the color buffer
	this.Clear = function(){
		gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);}
	//for clearing depth between scene renderings
	this.ClearDepth = function(){
		gl.clear(gl.DEPTH_BUFFER_BIT);}
	this.Flush = function(){
		gl.flush();}

	//functions for fog
	this.EnableFog = function(clipNear, clipFar){
		gl.Enable(gl.FOG);
		gl.Fogx(gl.FOG_MODE, gl.LINEAR);
		var params  = [];
		params[0]= 1.0; params[1]= 1.0; params[2]= 1.0; params[3]= 1.0;
		gl.Fogfv(gl.FOG_COLOR, params);
		gl.Fogf(gl.FOG_START, clipNear);
		gl.Fogf(gl.FOG_END, clipFar);
	}
	this.DisableFog = function() { glDisable(gl.FOG); }

	this.SetCanvasSize = function( width, height ){
		this.canvas.style.width        = width + "px";
		this.canvas.style.height       = height + "px";
		this.canvas.width              = width;
		this.canvas.height             = height;
		this.screenWidth               = this.canvas.width;
		this.screenHeight              = this.canvas.height;
		gl.width                       = width;
		gl.height                      = height;
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		
		//generate the 2d camera orthographic matrix
		glOrtho(-graphics.GetScreenAspect(), graphics.GetScreenAspect(),
			-1,1,//-graphics.screenHeight, graphics.screenHeight,
			-1, 1);
		rastBatch2dTris.worldToScreenSpaceMat = gOM;
	}

	//returns width / height ( multiply fovy by this to get fovh )
	this.GetScreenAspect = function(){
		return this.screenWidth/this.screenHeight;}
	
	//functions for altering the rendering state
	this.enableDepthMask = function(val){
		if(this.depthMaskEnb != val){
			this.depthMaskEnb = val;
			val ? gl.depthMask(true) : gl.depthMask(false);}
	}
	this.enableDepthTest = function(val){
		if(this.depthTestEnb != val){
			this.depthTestEnb = val;
			val ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST);}
	}
	this.setTexture = function(texId){
		if(this.currentTexId != texId){
			this.currentTexId = texId;
			gl.bindTexture(gl.TEXTURE_2D, this.currentTexId);}
	}
	
	
	//content access functions
	this.CopyMaterial = function( newName, newSceneName, oldMaterial ) {}
	this.GetMaterial = function( filename, sceneName, readyCallbackParams, materialReadyCallback ){
		var concatName = filename + sceneName;
		if(filename === undefined){
			filename = "Material";
			concatName = filename + sceneName;}
		var material = this.materials[ concatName ];
		if( material === undefined ){
			//shader is not loaded, load the new shader and return it
			new Material( filename, sceneName, readyCallbackParams, 
				function( newMaterial, readyCallbackParams1 ){
					//if( newShader.isValid )
					graphics.materials[concatName] = newMaterial;
					if(materialReadyCallback)
						materialReadyCallback(newMaterial, readyCallbackParams1);});
		}else{
			materialReadyCallback(material, readyCallbackParams);}
	}
	this.UnrefMaterial = function(filename, sceneName) {}
	
	//cache the texture for later use (called from Texture when it's image file successfully loads)
	this.AppendTexture = function(textureName, sceneName, newValidTexture){
		var concatName = textureName + sceneName;
		this.textures[concatName] = newValidTexture;
	}
	//get a texture that has been previously requested or attempt to load it from the servertextureReadyCallback(newTexture);
	this.GetTexture = function(filename, sceneName, readyCallbackParams, textureReadyCallback){
		var concatName = filename + sceneName;
		var texture = this.textures[concatName];
		if(texture === undefined){
			//texture is not loaded, load the new texture and have it return when it's ready (async load)
			new Texture(filename, sceneName, readyCallbackParams, textureReadyCallback );
		}else{
			//the cached texture is ready, have it return through the callback
			if(textureReadyCallback)
				textureReadyCallback(readyCallbackParams, texture);}
	}
	this.UnrefTexture = function(filename, sceneName) {}
	let concatName;
	let quadMesh;
	this.GetQuadMesh = function(filename, sceneName, readyCallbackParameters, quadMeshReadyCallback){
		concatName = filename + sceneName;
		quadMesh = this.quadMeshes[concatName];
		if(quadMesh === undefined){
			//mesh is not loaded, load the new mesh and return it (asynchronous load)
			this.quadMeshes[concatName] =
				new QuadMesh(filename, sceneName, quadMeshReadyCallback, readyCallbackParameters);
		}else{
			quadMeshReadyCallback( quadMesh, readyCallbackParameters );}
	}
	this.UnrefQuadMesh = function(filename, sceneName) {}
	
	
	//used to cache asynchronously loaded components between scene changes, view changes, etc to avoid unnecessary http requests
	
	
	


	//initialization code
	gl = WebGLUtils.setupWebGL(canvasIn, { antialias: true, depth: true});
	//gl = WebGLDebugUtils.makeDebugContext(gl);

	//gl.width = 2000;
	//gl.height = 1000;

	//setup the gl state
	gl.clearColor( 0.6, 0.7, 1.0, 1.0 );
	gl.clearDepth(1.0);

	//gl.viewport(0, 0, this.screenWidth, this.screenHeight);

	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.BACK);

	this.enableDepthTest(true); //calls gl.enable(gl.DEPTH_TEST)

	//enable depth testing
	this.enableDepthMask(true); //calls gl.depthMask(gl.TRUE)
	gl.depthFunc(gl.LESS);

	//enable blending (for transparent materials)
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.enable(gl.BLEND);


	//load and compile the point, line, and triangle drawing gl programs
	this.pointGraphics = new PointGraphics(GRPH_loadLineGraphics, 0);
	this.glPrograms['point'] = this.pointGraphics.glProgram;
	this.currentProgram = this.pointGraphics.glProgram.glShaderProgramRefId;
	this.currentProgramName = 'point';


} //end graphics

function GRPH_loadLineGraphics(){
	graphics.lineGraphics = new LineGraphics(GRPH_loadTriGraphics, 100);
	graphics.glPrograms['line'] = graphics.lineGraphics.glProgram;
	CheckGLError( "after load line gl program" );
	graphics.currentProgram = graphics.lineGraphics.glProgram.glShaderProgramRefId;
	graphics.currentProgramName = 'line';
}

function GRPH_loadTriGraphics(){
	graphics.triGraphics = new TriGraphics(graphics.loadCompleteCallback, 200);
	graphics.glPrograms['tri'] = graphics.triGraphics.glProgram;
	CheckGLError( "after load tri gl program" );
	graphics.currentProgram = graphics.triGraphics.glProgram.glShaderProgramRefId;
	graphics.currentProgramName = 'tri';
}

function GRPH_GetCached(filename, sceneName, ObjConstructor, ObjConstructorArgs, objReadyCallback, readyCallbackParameters){
	//concatName = filename + sceneName;
	if( graphics.cachedObjs[ObjConstructor.name] == undefined )
		graphics.cachedObjs[ObjConstructor.name] = {};
	if( graphics.cachedObjs[ObjConstructor.name][sceneName] == undefined )
		graphics.cachedObjs[ObjConstructor.name][sceneName] = {};
	let cachedObjStatusAndCallbacks = graphics.cachedObjs[ObjConstructor.name][sceneName][filename];
	if(typeof cachedObjStatusAndCallbacks == 'undefined'){
		//component hasn't been requested to load, 
		//load the new component
		//and store a new callback for it to be returned (asynchronous load)
		
		cachedObjStatusAndCallbacks =
			[	null,
				false, 
				[objReadyCallback, readyCallbackParameters] 
			];
		graphics.cachedObjs[ObjConstructor.name][sceneName][filename] = cachedObjStatusAndCallbacks;
		//this has to be assigned below because if in the above array constructor
		//cachedObjStatusAndCallbacks passed in to the ObjConstructor is still undefined
		cachedObjStatusAndCallbacks[0] =
		new ObjConstructor(filename, sceneName, ObjConstructorArgs, 
				GRPH_ObjReadyCallback, cachedObjStatusAndCallbacks);
		graphics.cachedObjs[ObjConstructor.name][sceneName][filename] = cachedObjStatusAndCallbacks;
			
	}else{
		GRPH_AddCachedObjCallbackAndCallIfReady( cachedObjStatusAndCallbacks, objReadyCallback, readyCallbackParameters );
	}
}


function GRPH_ObjReadyCallback( obj, cachedObjStatusAndCallbacks ){
	cachedObjStatusAndCallbacks[0] = obj;
	cachedObjStatusAndCallbacks[1] = true; //is now ready
	let callbacksAndArgs = cachedObjStatusAndCallbacks[2];
	for( let i = 0; i < callbacksAndArgs.length; i+=2 ){
		callbacksAndArgs[i](obj, callbacksAndArgs[i+1]);
	}
	cachedObjStatusAndCallbacks[2] = []; // clear called callbacks
	//so that if GRPH_GetCached is called again it doesn't call them another time
	
}

function GRPH_AddCachedObjCallbackAndCallIfReady( objStatusAndCallbacks, objReadyCallback, readyCallbackParameters ){
	if( objStatusAndCallbacks[1] ) //already loaded ( pass the object and parameters to the callback )
		objReadyCallback( objStatusAndCallbacks[0], readyCallbackParameters );
	else{ //not yet loaded add callback and parameters to queue
		objStatusAndCallbacks[2].push(objReadyCallback);
		objStatusAndCallbacks[2].push(readyCallbackParameters);
	}
}

function GRPH_GetCallbacksForObj( grph, obType, sceneName, obName ){
	let clBacksAndArgs = grph.cachedObjs[obType][sceneName][obName][2];
	return clBacksAndArgs;
	//for( let i = 0; i < clBacksAndArgs.length; ++i )
}

function GRPH_GetCachedObjsOfType( grph, obType, sceneName, retArray ){
	let objDict = grph.cachedObjs[obType][sceneName];
	let objKeys = Object.keys(objDict);
	for( let i = 0; i < objKeys.length; ++i ){
		retArray[i] = objDict[objKeys[i]][0];
	}
}


function GRPH_Cleanup(grph){
	let progKeys = Object.keys( graphics.glPrograms );
	for( let i = 0; i < progKeys.length; ++i )
		GLP_cleanup( graphics.glPrograms[progKeys[i]] );
}

