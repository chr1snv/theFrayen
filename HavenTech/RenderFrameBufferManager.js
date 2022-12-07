//SceneGraph.js - implementation of render buffer managment by haven tech

//manages a collection of drawables
//(provides 
//add
//remove and
//draw functions)

//the render buffer manager
//maintains vertex, normal, uv, gl buffer handles for gl rasterization
//grouped by vertex / fragment shader programs
//tries to minimally update objects and then if there are changes from
//last frame, pass them to the gpu and rasterize

//contained by HavenScene which updates and manages the objects
//the idea with the scene graph is to manage the gl buffers 
//per scene, per shader, vertex,uv,and normal buffers
//that are stored in the gpu
//and only update them when mustDraw flags are set
//indicating a model has changed

//data movement is the bottleneck between the main program and gpu
//so avoiding data movement when not necessary is key to good performance

//with more objects and geometry, draw culling (only drawing things in view)
//will need to be added to keep frame rates up
//this is planned to be implemented with OctTree
//(which also may be used for physics and raytracing performance)


//more on optimal drawing - effectively the render engine is a cache hierachy structure
//that optimally moves data of objects in view of the camera that are mostly static objects
//with some number of dynamic (animated and moving) objects
//into the gpu vertex, normal, and texture buffers for buffered rendering
//assume one shader for all objects and lighting
//and object updates are handled by seperate processes from the
//render loop

//handling transparency might be easiest (in terms of using less memory and time for sorting)
//with particles / hashed on off objects
//otherwise a frame buffer with ability to store color, alpha and depth for the number of trasparent objects
//in each pixel is needed, then for each pixel
//z sorting the fragments
//then baised on which fragment is behind set:
// alpha = front alpha + back alpha
//         blendAmt = front alpha / (front alpha + back alpha)
// value = value * ( blendAmt ) + value * ( 1 - blendAmt )
//so the pixel becomes more opaque 

//handling shadows and lighting will be done after object updates with a world space raytracer
//that runs for as long as there is compute time avaliable each frame and draws into a lightmap on each
//object

//the goal of the render frame buffer manager is to gather all the data to be drawn for a frame before
//asking the gpu to draw it (reducing draw calls)
//it gets it's data from oct tree nodes, if a node is completely in the view frustrum it's buffers
//get added to the render buffer. otherwise it's subnodes that are in view get added.

//the camera then transforms the verticies into camera space and rasterizes fragments to the framebuffer
//using a depth test to ignore behind geometry
//camera space raytracing could be used for camera lens effects (boka, depth of field, astigmatisim)
//or the camera rays could be traced through the oct tree without the renderframebuffermanager,
//but it will likely be slower than rasterizing until the number of polygons / overdraw becomes greater than polygons

//to prevent overdraw (and polygons that are smaller than pixels) each oct tree node has levels of detail
//overdraw is reduced by checking if the faces of a node or it's low level of detail version are
//blocked by opaque screen pixels

function RenderBufferManager(sceneNameIn)
{
    this.sceneName = sceneNameIn;

    //links a drawable to a index and length in the buffer
    function ShaderDrawablePair(){
        this.startIndex = 0;       //RenderBufferManager buffer index
        this.numVerts   = 0;
        this.drawable;
        this.mustDraw;
    };


    this.collections.opaque      = {};
    this.collections.transparent = {};

    //per object buffers, unless object doesn't move often, then it should be put into a static buffer
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
    //adds a drawable to the gl render buffer manager
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
    
    
    
    //draws the drawables that are associated with the in view oct tree nodes
    this.Draw = function( camera, nodesToDraw )
    {
        var cameraCenter = new Float32Array(3);
        camera.getLocation( cameraCenter );
        var frustum = camera.GetFrustum();
        var cameraProjectionMatrix = camera.GetProjectionMatrix();
        
        //i think only the camera matrix should be sent to the shader once per frame to reduce data transfer overhead
        var uploadMatrixTemp = new Float32Array(4*4); 
        //the projection and model matrix combined
        var uploadMatrix = new Float32Array(4*4);     
        //the transposed (inverse) projection and model matrix

        var previousShader = undefined; 
        //idealy all rendering should be done with one shader 
        //(or an opaque and transparent shader)
        
        

        //sort or assume the nodesToDraw are sorted by distance from the camera
        // (so that occlusion culling and level of detail usage can be done)
        nodesToDraw.sort(
            function( a, b ){
                var distToCamA = Vect3_Distance( cameraCenter, a.midCoord );
                var distToCamB = Vect3_Distance( cameraCenter, b.midCoord );
                return distToCamA - distToCamB;
            }
        );
        
        //loops through the depth sorted nodes to draw
        //drawing front to back
        for( var i = 0; i < nodesToDraw.length; ++i ){
            node.Draw( verts, normals, uvs, modelTransform, mustDraw, completeCallback )
        }
        
        /*
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
                            var uvs          = new Float32Array( drawablePair.numVerts*graphics.uvCard   );
                            var modelMatrix  = new Float32Array( 4*4 );
                            drawablePair.drawable.Draw( frustum, verts, normals, uvs, modelMatrix,
                                                        true, function(){

                                Matrix_Multiply( uploadMatrixTemp, cameraProjectionMatrix, modelMatrix);
                                Matrix_Transpose( uploadMatrix, uploadMatrixTemp );
                                var mvpMatHandle = gl.getUniformLocation( graphics.currentProgram, 'mvpMatrix' );
                                gl.uniformMatrix4fv( mvpMatHandle, false, uploadMatrix );

                                var vertBuffer = 0;
                                //attributeSetFloats( graphics.currentProgram,
                                //                    "position", graphics.vertCard,
                                //                    verts, vertBuffer );
                                //attributeSetFloats( graphics.currentProgram,
                                //                    "normal", graphics.normCard,
                                //                    verts );
                                var uvBuffer = 0;
                                //attributeSetFloats( graphics.currentProgram,
                                //                    "texCoord", graphics.uvCard,
                                //                    uvs, uvBuffer );

                                gl.drawArrays( gl.TRIANGLES, 0, drawablePair.numVerts );

                            });
                        }
                    });
                });
            }
        }
        */

    }


    //returns the closest model that the given ray intersects
    this.ClosestRayIntersection = function(rayOrig, rayDir){
    }
};
