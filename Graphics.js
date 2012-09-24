//Graphics.js

function Graphics(canvasIn, bpp, depthIn){

//maps used to keep track of primative graphics objects
this.textures = {};
this.shaders = {};
this.quadMeshes = {};
this.textureRefCts = {};
this.shaderRefCts = {};
this.quadMeshRefCts = {};

var maxLights = 0;
var numLightsBounded = 0;

var screenWidth = 0;
var screenHeight = 0;
var bpp = 0;

//information about the rendering state (used to minimize the number of calls to gl)
var tex2Denb = false;
var lightingEnb = false;
var colorMaterialEnb = false;
var depthMaskEnb = false;
var depthTestEnb = false;
var currentTexId  = -1;
var currentColor = [0.0, 0.0, 0.0, 0.0];
var ambAndDiffuse = [0.0, 0.0, 0.0, 0.0];
var emission = [0.0, 0.0, 0.0, 0.0];
var specular = [0.0, 0.0, 0.0, 0.0];
var shinyness = 0;

//functions for preparing the render buffer
this.SwapBuffers = function(){}  //for displaying the color render buffer
this.Clear = function(){}        //for clearing the color buffer
this.ClearDepth = function(){}   //for clearing depth between scene renderings

//functions for fog
this.EnableFog = function(clipNear, clipFar) {
    gl.Enable(gl.FOG);
    gl.Fogx(gl.FOG_MODE, gl.LINEAR);
    var params = [];
    params[0]= 1.0; params[1]= 1.0; params[2]= 1.0; params[3]= 1.0;
    gl.Fogfv(gl.FOG_COLOR, params);
    gl.Fogf(gl.FOG_START, clipNear);
    gl.Fogf(gl.FOG_END, clipFar);
}
this.DisableFog = function() {glDisable(gl.FOG);}

this.GetScreenWidth = function(){ return screenWidth; }
this.GetScreenHeight = function(){ return screenHeight; }
this.GetScreenAspect = function(){ return screenWidth/screenHeight; }
    
//functions for altering the rendering state
this.enableTexture2D = function(val){
    if(tex2Denb != val){
        tex2Denb = val;
        if(val)
            gl.Enable(gl.TEXTURE_2D);
        else
            gl.Disable(gl.TEXTURE_2D);
    }
}
this.enableLighting = function(val){
    if(lightingEnb != val){
        lightingEnb = val;
        val ? gl.enable(gl.LIGHTING) : gl.disable(gl.LIGHTING);
    }
}
this.enableColorMat = function(val){
    if(colorMaterialEnb != val){
        colorMaterialEnb = val;
        val ? gl.enable(gl.COLOR_MATERIAL) : gl.disable(gl.COLOR_MATERIAL);
    }
}
this.enableDepthMask = function(val){
    if(depthMaskEnb != val){
        depthMaskEnb = val;
        val ? gl.depthMask(gl.TRUE) : gl.depthMask(gl.FALSE);
    }
}
this.enableDepthTest = function(val){
    if(depthTestEnb != val){
        depthTestEnb = val;
        val ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST);

    }
}
this.setTexture = function(texId){
    if(currentTexId != texId){
        currentTexId = texId;
        gl.bindTexture(gl.TEXTURE_2D, currentTexId);
    }
}
this.setColor4f = function(col){
    if( !Vect3_Cmp(currentColor, col) ){
        Vect3_Copy(currentColor, col);
        gl.uniform4fv(gl.getUniformLocation(this.currentShader.program, 'color'), currentColor);
    }
}
this.setAmbientAndDiffuse = function(col){
    if(ambAndDiffuse[0] != col[0] || ambAndDiffuse[1] != col[1] ||
       ambAndDiffuse[2] != col[2] || ambAndDiffuse[3] != col[3]){
        ambAndDiffuse[0] = col[0]; ambAndDiffuse[1] = col[1];
        ambAndDiffuse[2] = col[2]; ambAndDiffuse[3] = col[3];
        gl.materialfv(gl.FRONT_AND_BACK, gl.AMBIENT_AND_DIFFUSE, ambAndDiffuse);
    }
}
this.setEmission = function(col){
    if(emission[0] != col[0] || emission[1] != col[1] ||
       emission[2] != col[2] || emission[3] != col[3]){
        emission[0] = col[0]; emission[1] = col[1];
        emission[2] = col[2]; emission[3] = col[3];
        gl.materialfv(gl.FRONT_AND_BACK, gl.EMISSION, emission);
    }
}
this.setSpecular = function(col){
    if(specular[0] != col[0] || specular[1] != col[1] ||
       specular[2] != col[2] || specular[3] != col[3]){
        specular[0] = col[0]; specular[1] = col[1];
        specular[2] = col[2]; specular[3] = col[3];
        gl.materialfv(gl.FRONT_AND_BACK, gl.SPECULAR, specular);
    }
}
this.setShinyness = function(exp){
    if(shinyness != col){
        shinyness = col;
        gl.materialf(gl.FRONT_AND_BACK, gl.SHININESS, shinyness);
    }
}

this.ClearLights = function(){
    for(var i=0; i<this.maxLights; ++i)
        gl.disable(gl.LIGHT0+i);
    this.numLightsBounded = 0;
}
this.BindLight = function(light)
{
    if(numLightsBounded >= maxLights){
        alert("Graphics: error Max number of lights already bound.\n");
        return;
    }
    gl.enable(gl.LIGHTING);
    gl.enable(gl.COLOR_MATERIAL);
    light.BindToGL(gl.LIGHT0+this.numLightsBounded);
    ++this.numLightsBounded;
}



//content access functions
this.CopyShader = function(newName, newSceneName, oldShader) {}
this.GetShader = function(filename, sceneName) {}
this.UnrefShader = function(filename, sceneName) {}
this.GetTexture = function(filename, sceneName) {}
this.UnrefTexture = function(filename, sceneName) {}
this.GetQuadMesh = function(filename, sceneName) {
    var concatName = filename + sceneName;
    if(!this.quadMeshes[concatName]){
        //mesh is not loaded, load the new mesh and return it
        var newMesh = new QuadMesh(filename, sceneName);
        this.quadMeshes.concatName = newMesh;
        return newMesh;
    }
    return this.quadMeshes[concatName];
}
this.UnrefQuadMesh = function(filename, sceneName) {}



//initialization code
    gl = WebGLUtils.setupWebGL(canvasIn);

    //setup the gl state
    gl.clearColor(0.8, 0.8, 0.9, 0.5);
    
    gl.viewport(0, 0, screenWidth, screenHeight);
    
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    
    //enable depth testing
    gl.depthFunc(gl.LESS);
    this.enableDepthMask(true);
    
    //enable blending
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    
    //load and compile the program
    this.currentProgram = gl.createProgram();
    loadTextFile('frayenVertShader.vs', compileVertexShader, this);
    
    function compileVertexShader(textFile, thisP){
        var vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, textFile);
        gl.compileShader(vertexShader);
        alert('vertex shader log: ' + gl.getShaderInfoLog(vertexShader));
        gl.attachShader(thisP.currentProgram, vertexShader);
        loadTextFile('frayenFragmentShader.fs', compileFragmentShader, thisP);
    }
    function compileFragmentShader(textFile, thisP){
        var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, textFile);
        gl.compileShader(fragmentShader);
        alert('fragment shader log: ' + gl.getShaderInfoLog(vertexShader));
        gl.attachShader(thisP.currentProgram, fragmentShader);
        finishGraphicsInit(thisP);
    }
    
    
   function finishGraphicsInit(thisP){
       gl.validateProgram(thisP.currentProgram);
       gl.linkProgram(thisP.currentProgram);
       alert('gl currentProgram status: ' + gl.getProgramInfoLog(thisP.currentProgram));
   
        //enable passing render data by arrays
        var maxArrays = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
        alert('alert max vertex arrays ' + maxArrays);
        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        gl.enableVertexAttribArray(2);

        //clear the render buffer
        this.Clear();
        
        //set the rendering state varaibles (init them to 0 then set to 1 to ensure we are tracking the gl state)
        var temp = [1.0,1.0,1.0,1.0];
        this.setColor4f(temp);
        this.setAmbientAndDiffuse(temp);
        this.setEmission(temp);
        this.setSpecular(temp);
        this.setShinyness(1.0);
        
        //lighting setup
        this.enableLighting(true);
        
        //the world ambient lighting
        //var params = [0.0, 0.0, 0.0, 1.0];
        //glLightModelfv(gl.LIGHT_MODEL_AMBIENT, params);
        
        numLightsBounded = 0;

        if(CheckGLError("Graphics::end constructor "))
            exit(1);
    }
}
