//# sourceURL=Output/Rendering/Graphics.js - to request use permission please contact chris@itemfactorystudio.com


//contains dictionaries of
//quadmeshs
//materials
//textures

//sets up canvas gl 3d context
//

//helper function for printing gl errors
function CheckGLError(where){
	WebGLDebugUtils.init(gl);
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
const trisPerQuad  = 2;
const vertsPerTri  = 3;
const vertsPerQuad = 6;
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

	//maps used to keep track of primative graphics objects to avoid multiple fetches
	//cachedObjs contains textures, materials, quadMeshes
	this.cachedObjs      = {};
	//this.textureRefCts   = {};
	//this.shaderRefCts    = {};
	//this.quadMeshRefCts  = {};
	this.sceneZips		 = {};
	
	this.glPrograms = {}; //used to cleanup all programs between scenes
	this.currentProgram = null; //not currently used, was planned/previously used by material and light to set parameters when bound
	this.currentProgamName = '';

	this.maxLights        = 8;
	this.numLightsBounded = 0;

	this.screenWidth      = canvasIn.width;
	this.screenHeight     = canvasIn.height;
	this.bpp              = 0;

	//information about the rendering state (used to minimize the number of calls to gl)
	//this.tex2Denb         = false;
	//this.lightingEnb      = false; //tex2Denb, lightingEnb, colorMaterialEnb may have been used before multiple programs and GLP_setUniform state caching was added
	//this.colorMaterialEnb = false;
	this.depthMaskEnb     = false;
	this.depthTestEnb     = false;

	//for clearing the color buffer
	this.Clear = function(){
		gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);}
	//for clearing depth between scene renderings
	this.ClearColor = function(){
		gl.clearColor(0,0,0,1);
	}
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
			-1, 1, gOM);
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


	//initialization code
	gl = WebGLUtils.setupWebGL(canvasIn, { antialias: true, depth: true, /*preserveDrawingBuffer: true*/ });//, premultipliedAlpha:false});
	//gl = WebGLDebugUtils.makeDebugContext(gl);

	//gl.width = 2000;
	//gl.height = 1000;

	//setup the gl state
	//gl.clearColor( 0.6, 0.7, 1.0, 1.0 );
	gl.clearDepth(1.0);
	
	//get the default framebuffer
	this.renderBuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);

	//gl.viewport(0, 0, this.screenWidth, this.screenHeight);

	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.BACK);

	this.enableDepthTest(true); //calls gl.enable(gl.DEPTH_TEST)

	//enable depth testing
	this.enableDepthMask(true); //calls gl.depthMask(gl.TRUE)
	gl.depthFunc(gl.LESS);


	//load and compile the point, line, triangle, cubemap, and depth drawing gl programs
	this.pointGraphics = new PointGraphics(GRPH_loadLineGraphics, 0);
	this.glPrograms['point'] = this.pointGraphics.glProgram;
	this.currentProgram = this.pointGraphics.glProgram.glProgId;
	this.currentProgramName = 'point';


} //end graphics

function GRPH_EnableAlphaBlending(enb){
	//enable blending (for transparent materials)
	if( enb ){
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.enable(gl.BLEND);
	}else{
		gl.disable(gl.BLEND);
	}
}

function GRPH_loadLineGraphics(){
	graphics.lineGraphics = new LineGraphics(GRPH_loadTriGraphics, 100);
	graphics.glPrograms['line'] = graphics.lineGraphics.glProgram;
	CheckGLError( "after load line gl program" );
	graphics.currentProgram = graphics.lineGraphics.glProgram.glProgId;
	graphics.currentProgramName = 'line';
}

function GRPH_loadTriGraphics(){
	graphics.triGraphics = new TriGraphics(GRPH_loadCubeGraphics, 200);
	graphics.glPrograms['tri'] = graphics.triGraphics.glProgram;
	CheckGLError( "after load tri gl program" );
	graphics.currentProgram = graphics.triGraphics.glProgram.glProgId;
	graphics.currentProgramName = 'tri';
}

function GRPH_loadCubeGraphics(){
	graphics.cubeGraphics = new CubeGraphics(GRPH_loadDepthGraphics, 300);
	graphics.glPrograms['cube'] = graphics.cubeGraphics.glProgram;
	CheckGLError( "after load cube gl program" );
	graphics.currentProgram = graphics.cubeGraphics.glProgram.glProgId;
	graphics.currentProgramName = 'cube';
}
function GRPH_loadDepthGraphics(){
	graphics.depthGraphics = new DepthGraphics(graphics.loadCompleteCallback, 400);
	graphics.glPrograms['depth'] = graphics.depthGraphics.glProgram;
	CheckGLError( "after load depth gl program" );
	graphics.currentProgram = graphics.depthGraphics.glProgram.glProgId;
	graphics.currentProgramName = 'depth';
}

function GRPH_GetSceneZip(sceneName, callback, cbParams){
	if( graphics.sceneZips[sceneName] == undefined ){ //hasn't been asked to load yet, start loading
		graphics.sceneZips[sceneName] = [null, [[callback, cbParams]]];
		loadFile("scenes/"+sceneName+".zip", GRPH_GetSceneZipLoaded, sceneName );
	}else if( graphics.sceneZips[sceneName][0] == null ){ //append to the list of functions to call once it loads
		graphics.sceneZips[sceneName][1].push( [callback, cbParams] );
	}else{ //it's loaded, return it
		callback( graphics.sceneZips[sceneName][0], cbParams );
	}
}
function GRPH_GetSceneZipLoaded( sceneZip, sceneName ){
	let loadedZip = new JSZip();
	loadedZip.loadAsync(sceneZip)
		.then(function(zip) {
			graphics.sceneZips[sceneName][0] = zip; //keep a reference to the zip
			//call each queued callback
			let callbacks = graphics.sceneZips[sceneName][1];
			for( cbIdx in callbacks ){
				let callbackParams = callbacks[cbIdx];
				callbackParams[0]( zip, callbackParams[1] );
			}
			graphics.sceneZips[sceneName][1] = [];
		});
}

//object caching system to avoid fetching resources multiple times
//relies on the ObjConstructor having it's parameters in the form :
//ObjConstructor(nameIn, sceneNameIn, args, quadMeshReadyCallback, readyCallbackParameters)
//once it fetches files and constructs itself it calls GRPH_ObjReadyCallback
//which registers it as cached and calls objReadyCallback
//so if GRPH_GetCached(filename, sceneName, ObjConstructor is called again
//the cached obj is passed directly to objReadyCallback
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
		if( callbacksAndArgs[i] != null )
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

