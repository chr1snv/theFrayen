//SceneGraph.js - implementation of a scene drawable by haven tech

//manages a collection of drawables 

function SceneGraph(sceneNameIn)
{
    this.sceneName = sceneNameIn;

    function ShaderDrawablePair(){
        this.startIndex = 0;       //scenegraph buffer index
        this.numVerts   = 0;
        this.drawable;
        this.mustDraw;
    };

    this.collections             = {};
    this.collections.opaque      = {};
    this.collections.transparent = {};

    this.vertexBufferID = 0;
    this.normalBufferID = 0;
    this.uvBufferID     = 0;

    this.vertCard = 3;
    this.normCard = 3;
    this.uvCard   = 2;

    this.desiredVerts   = 0;
    this.allocatedVerts = 256;
    this.verts   = new Float32Array( this.allocatedVerts * this.vertCard );
    this.normals = new Float32Array( this.allocatedVerts * this.normCard );
    this.uvs     = new Float32Array( this.allocatedVerts * this.uvCard );

    this.alterAllocationSize = function(sizeDelta){
        this.desiredVerts += sizeDelta;
        if( this.desiredVerts > this.allocatedVerts )
            this.allocatedVerts *= 2;
        this.verts.length   = this.allocatedVerts*this.vertCard;
        this.normals.length = this.allocatedVerts*this.normCard;
        this.uvs.length     = this.allocatedVerts*this.uvCard;
    }
    this.setDrawFlags   = function( whichVec, whichElm ){
    }
    this.uploadGeometry = function( startIdx, numVerts ){

//        graphics.
    }

//public methods
    //adds a drawable to the scene
    this.Add = function( newDrawable, addedCallback ){
        
        var shaderName = newDrawable.shaderName;
        if( shaderName == "undefined" )
            console.log( "shadername is undefined" );

        newDrawable.GetNumVerts( {1:this, 2:newDrawable, 3:addedCallback}, function(numVerts, cbObj){
            var drawablePair = new ShaderDrawablePair();
            drawablePair.drawable = cbObj[2];
            drawablePair.mustDraw = true;
            drawablePair.numVerts = numVerts;

            var thisP = cbObj[1];
            var isTransparentCallback = 
            	function( transparent, thisP )
                {
                    if( transparent ){
                        if( thisP.collections.transparent[shaderName] === undefined )
                            thisP.collections.transparent[shaderName] = {};
                        thisP.collections.transparent[shaderName][newDrawable.modelName] = drawablePair;
                    }
                    else{
                        if( thisP.collections.opaque[shaderName] === undefined )
                            thisP.collections.opaque[shaderName] = {};
                        thisP.collections.opaque[shaderName][newDrawable.modelName] = drawablePair;

                    }
                    thisP.alterAllocationSize( numVerts );
                    cbObj[3]();
                };
            newDrawable.IsTransparent(isTransparentCallback, thisP);

        });
    }
    
    //removes the drawable with the given name from the scene
    this.Remove = function(givenDrawable, removedCallback)
    {
    	var isTransparentCallback = function(transparent, thisP)
	    {
	    	if(transparent)
	    		thisP.collections.transparent[givenDrawable.shaderName][givenDrawable.GetName()] = undefined;
	    	else
	    		thisP.collections.opaque[givenDrawable.shaderName][givenDrawable.GetName()] = undefined;
	    	thisP.alterAllocationSize(-givenDrawable.GetNumVerts());
	    	removedCallback(thisP);
	    }
        givenDrawable.IsTransparent( isTransparentCallback, this );
    }
    
    //draws the drawables that are within the frustrum
    this.Draw = function(camera)
    {
        var frustum = camera.GetFrustum();
        var cameraProjectionMatrix = new Float32Array(4*4);
        camera.calculateTransform(cameraProjectionMatrix);
        var uploadMatrixTemp = new Float32Array(4*4);
        var uploadMatrix = new Float32Array(4*4);

        var previousShader = undefined;
        for(var i in this.collections){ //loop through the transparent and opaque lists
            for(var j in this.collections[i]) //loop through the shaders
            {
                var shaderName = j;
                var thisP = this;
                graphics.GetShader(shaderName, this.sceneName, this.collections[i][j], function(shader, drawables){
                    shader.Bind( previousShader, drawables, function(drawables){
                        for(var k in drawables) //loop through the drawables
                        {
                            var drawablePair = drawables[k];
                            var verts        = new Float32Array( drawablePair.numVerts*graphics.vertCard );
                            var normals      = new Float32Array( drawablePair.numVerts*graphics.vertCard );
                            var uvs          = new Float32Array( drawablePair.numVerts*graphics.uvCard );
                            var modelMatrix  = new Float32Array( 4*4 );
                            drawablePair.drawable.Draw( frustum, verts, normals, uvs, modelMatrix,
                                                        true, function(){

                                Matrix_Multiply( uploadMatrixTemp, cameraProjectionMatrix, modelMatrix);
                                Matrix_Transpose( uploadMatrix, uploadMatrixTemp );
                                var mvpMatHandle = gl.getUniformLocation( graphics.currentProgram, 'mvpMatrix' );
                                gl.uniformMatrix4fv( mvpMatHandle, false, uploadMatrix );

                                var vertBuffer = 0;
                                attributeSetFloats( graphics.currentProgram,
                                                    "position", graphics.vertCard,
                                                    verts, vertBuffer );
                                //attributeSetFloats( graphics.currentProgram,
                                //                    "normal", graphics.normCard,
                                //                    verts );
                                var uvBuffer = 0;
                                attributeSetFloats( graphics.currentProgram,
                                                    "texCoord", graphics.uvCard,
                                                    uvs, uvBuffer );

                                gl.drawArrays( gl.TRIANGLES, 0, drawablePair.numVerts );

                                UpdateCamera();
                            });
                        }
                    });
                });
            }
        }

    }


    //returns the closest model that the given ray intersects
    this.ClosestRayIntersection = function(rayOrig, rayDir){
    }
};
