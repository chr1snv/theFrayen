//QuadMesh.js - implementation of QuadMesh
//a polygonal mesh with faces of 3 or 4 (quad) verticies

function QuadMesh(nameIn, sceneNameIn, quadMeshReadyCallback, readyCallbackParameters)
{
	this.quadMeshReadyCallback = quadMeshReadyCallback;
	this.readyCallbackParameters = readyCallbackParameters;

    function Face()
    {
        this.materialID = 0;
        this.uvs        = [];
        this.vertIdxs   = [];
        this.tris       = [];
        this.AABB       = null;
        this.GetAABB = function(){ return this.AABB; }
    }

    this.meshName        = nameIn;
    this.sceneName       = sceneNameIn;

    this.isValid         = false; //true once loading is complete
    this.isAnimated      = false;

    //the orientation matrix
    this.scale           = new Float32Array([1,1,1]);
    this.rotation        = new Float32Array([0,0,0]);
    this.origin          = new Float32Array([0,0,0]);
    this.toWorldMatrix   = new Float32Array(4*4);
    Matrix_SetIdentity( this.toWorldMatrix );
    this.lastToWorldMatrixUpdateTime = -1;

    this.shaderNames     = [];
    this.shaders         = [];

    //the calculated mesh data
    
    //the gl buffers
    var vertsBuffer   = gl.createBuffer();
    var normalsBuffer = gl.createBuffer();
    var uvsBuffer     = gl.createBuffer();

    //the raw mesh data
    this.faces           = [];
    this.faceVertsCt     = 0;
    this.vertPositions   = [];
    this.vertNormals     = [];
    this.vertBoneWeights = [];

    //animated mesh
    this.keyedPositions  = [];
    this.skelPositions   = [];
    
    //the oct tree of the mesh faces (updated with mesh animations)
    this.octTree = new TreeNode( 0, [-10000, -10000, -10000], [10000, 10000, 10000], null );
    this.localMinAndMaxCorners = null;

    //animation classes
    //ipo animation affects the root transformation of the quadmesh
    this.ipoAnimation    = new IPOAnimation(      this.meshName, this.sceneName );
    //keyframe animation has basis meshes and an ipo curve for each giving weight at time
    this.keyAnimation    = new MeshKeyAnimation(  this.meshName, this.sceneName );
    //skeletal animation has bones (heirarchical transformations), ipo curves for
    //properties of each transformation at time and weights for how each vertex
    //is affected by a transformation
    this.skelAnimation   = new SkeletalAnimation( this.meshName, this.sceneName );
    
    this.lastMeshUpdateTime = -0.5;
    
    
    //updates the non tessilated "transformedVerts" with the mesh animation/simulation
    //transformed verts are in mesh space
    //(need to have the orientation matrix
    //applied for world space coordinates)
    this.UpdateTransformedVerts = function(time)
    {
        var updated = false;
        var transformedVertCoords = null;
        
        //use the unmodified vertex coordinates from the appropriate
        //animation type
        if(this.keyedPositions.length != 0)
            transformedVertCoords = this.keyedPositions; //keyframe animated positions
        else if(this.skelPositions.length != 0)
            transformedVertCoords = this.skelPositions;
        else
            transformedVertCoords = this.vertPositions;  //static vert positions
        
        //update the coordinates with the animation / simulation type
        if( this.skelAnimation.isValid )
            updated = this.skelAnimation.GenerateMesh( 
                this.transformedVerts, numVerts, mesh, time );
        else //there isn't a simulation use the unmodified base coordinates
            this.transformedVerts = transformedVertCoords;
        
        return updated;
    }
    
    //update the quadmesh to world transformation
    this.UpdateToWorldMatrix = function(time){
        if( this.lastToWorldMatrixUpdateTime == time )
            return this.toWorldMatrix;
        Matrix( this.toWorldMatrix, 
                MatrixType.euler_transformation, 
                this.scale, this.rotation, this.origin );
        this.lastToWorldMatrixUpdateTime = time;
        
        return this.toWorldMatrix;
    
    }

    //using the MeshKeyAnimation
    //update the current mesh (used by skeletal animation if present) 
    //to the current animationFrame
    this.Update = function(animationTime) {
        //if the new update time is newer (don't update twice for the same frame)
        if( animationTime > this.lastMeshUpdateTime ){
            
            var vertsUpdated = this.UpdateTransformedVerts(this.lastMeshUpdateTime);
            if( vertsUpdated || this.lastMeshUpdateTime < 0){ //than rebuild the face octTree
                this.localMinAndMaxCorners = this.UpdateOctTree();
            }
            
            var worldTransformUpdated = this.UpdateToWorldMatrix(this.lastMeshUpdateTime);
            if( worldTransformUpdated || this.lastMeshUpdateTime < 0){ //then update the AABB
                this.UpdateAABB(animationTime);
            }
            
            this.lastMeshUpdateTime = animationTime > 0 ? animationTime : 0;
        }
    }
    this.GetAnimationLength = function() {}

    //used by skeletal animation classes
    this.GetVertsCt = function() { return vertsCt; }
    this.GetVertPosition = function( posRet, idx ) {}

    //used by Model to cache data for later fast lookup
    this.GetVertBoneWeightsSize = function()  { return vertBoneWeights.size(); }
    this.GetVertBoneWeights     = function(i) { return vertBoneWeights[i];     }
    this.SetVertBoneWeights     = function(i) { return vertBoneWeights[i];     }

    //transformation query functions
    this.GetPosition = function(pos)      { Vect3_Copy(pos, this.origin);      }
    this.GetScale    = function(scaleOut) { Vect3_Copy(scaleOut, this.scale);  }
    this.GetRotation = function(rotOut)   { Vect3_Copy(rotOut, this.rotation); }

    //color manipulation functions
    this.GetShaderName = function() { return [this.shaderNames[0], this.sceneName]; }
    
    this.DrawSkeleton = function() { this.skelAnimation.Draw(); }

    //type query functions
    this.IsHit = function() {}
    //thisP is from the caller of this function, 
    //so the callback can return to the same context
    this.IsTransparent = function(callback, thisP) 
    {
        graphics.GetShader( this.shaderNames[0], this.sceneName, callback,
            function( shader, cb )
            {
                cb( shader.IsTransparent(), thisP );
            });
    }
    

    //geometry query function
    //this.GetBoundingPlanes = function() { return {1:{}, 2:{} }; }
    
    this.AABBUpdateTime = -1;
    this.AABB = null;
    //get the axis aligned bounding box of the mesh
    this.UpdateAABB = function(time) {
        if( this.AABBUpdateTime < time )
        {
            
            this.AABBUpdateTime = this.lastMeshUpdateTime;
            //transform the min and max into world space
            var minW = new Float32Array(3);
            var maxW = new Float32Array(3);
            Matrix_Multiply_Vect3( minW, this.toWorldMatrix, this.localMinAndMaxCorners[0] );
            Matrix_Multiply_Vect3( maxW, this.toWorldMatrix, this.localMinAndMaxCorners[1] );
            this.AABB = new AABB( minW, maxW );
            
        }
        return this.AABB;
    }
    
    //generate world space triangles from a face index
    this.UpdateFaceAABBAndGenerateTriangles = function(f){
        var face = this.faces[f];
        var numFaceVerts = face.vertIdxs.length;
        
        //initialized to opposite extrema to accept any value at first
        var minCorner = new Float32Array( [  999999,  999999,  999999 ] );
        var maxCorner = new Float32Array( [ -999999, -999999, -999999 ] );
        
        var vertVect3s = []; //the world position verts of the face
        for( var v = 0; v < numFaceVerts; ++v ){
            //get the vert local position and transform it to world position
            var vert = [ 
                this.transformedVerts[ 
                    this.faces[f].vertIdxs[v]*graphics.vertCard + 0 ],
                this.transformedVerts[ 
                    this.faces[f].vertIdxs[v]*graphics.vertCard + 1 ],
                this.transformedVerts[ 
                    this.faces[f].vertIdxs[v]*graphics.vertCard + 2 ] ];
            vertVect3s.push( new Float32Array(3) );
            Matrix_Multiply_Vect3( vertVect3s[v], this.toWorldMatrix, vert);
            
            minCorner[0] = Math.min( minCorner[0], vert[0] );
            minCorner[1] = Math.min( minCorner[1], vert[1] );
            minCorner[2] = Math.min( minCorner[2], vert[2] );
            
            maxCorner[0] = Math.max( maxCorner[0], vert[0] );
            maxCorner[1] = Math.max( maxCorner[1], vert[1] );
            maxCorner[2] = Math.max( maxCorner[2], vert[2] );
                                    
        }
        this.faces[f].AABB =  new AABB( minCorner, maxCorner );
        
        //construct the triangles (maybe should add uv's when constructing)
        this.faces[f].tris.push( 
            new Triangle( vertVect3s[0], vertVect3s[1], vertVect3s[2] ) );
        if( numFaceVerts > 3 ){ //if face is a quad generate second triangle
            this.faces[f].tris.push( 
                new Triangle( vertVect3s[2], vertVect3s[3], vertVect3s[0] ) );
        }
        
        return [minCorner, maxCorner];
    }
    
    this.UpdateOctTree = function(){
        //update the oct tree of faces for the current time
        //to minimize number of triangle ray intersection tests
        
        var localMinCorner = new Float32Array( [  999999,  999999,  999999 ] );
        var localMaxCorner = new Float32Array( [ -999999, -999999, -999999 ] );
        
        for( var f = 0; f < this.faces.length; ++f ){
            //get an aabb around the face and insert it into an oct tree
            var minAndMaxCorner = this.UpdateFaceAABBAndGenerateTriangles( f );
            localMinCorner[0] = Math.min( localMinCorner[0], minAndMaxCorner[0][0] );
            localMinCorner[1] = Math.min( localMinCorner[1], minAndMaxCorner[0][1] );
            localMinCorner[2] = Math.min( localMinCorner[2], minAndMaxCorner[0][2] );
            
            localMaxCorner[0] = Math.max( localMaxCorner[0], minAndMaxCorner[1][0] );
            localMaxCorner[1] = Math.max( localMaxCorner[1], minAndMaxCorner[1][1] );
            localMaxCorner[2] = Math.max( localMaxCorner[2], minAndMaxCorner[1][2] );
            
            this.octTree.AddObject(this.faces[f]);
        }
        return [localMinCorner, localMaxCorner];
    }
    
    //called during ray trace rendering
    //returns the 
    this.GetRayIntersection = function(ray){
    
        //check all faces of the mesh if the ray intersects, 
        //if it does return the 
        //[intersection point, ray distance, face, normal, color]
        //that the ray hit
        //else returns null
        
        //to avoid checking all faces for each ray, use an oct tree on the model
        for( var f = 0; f < this.faces.length; ++f ){
            //each face should have 3 or 4 verticies
            var face = this.faces[f];
            var numFaceVerts = face.vertIdxs.length;
            
            var vertVect3s = []; //the world position verts of the face
            for( var v = 0; v < numFaceVerts; ++v ){
                //get the vert local position and transform it to world position
                var vert = [ 
                    this.transformedVerts[ 
                        this.faces[f].vertIdxs[v]*graphics.vertCard + 0 ],
                    this.transformedVerts[ 
                        this.faces[f].vertIdxs[v]*graphics.vertCard + 1 ],
                    this.transformedVerts[ 
                        this.faces[f].vertIdxs[v]*graphics.vertCard + 2 ] ];
                vertVect3s.push( new Float32Array(3));
                Matrix_Multiply_Vect3( vertVect3s[v], this.toWorldMatrix, vert);
            }

            //triangles constructed from the verts
            var triangle = new Triangle( 
                vertVect3s[0], vertVect3s[1], vertVect3s[2] );
                
            var dist_norm_ptL = triangle.RayTriangleIntersection( ray );
            if( dist_norm_ptL != null ){
                //the ray intersects the triangle, find the uv coordinate
                var uvCoord = triangle.
                    UVCoordOfPoint( dist_norm_ptL[2],
                                [face.uvs[0*2],face.uvs[0*2+1]], 
                                [face.uvs[1*2],face.uvs[1*2+1]],
                                [face.uvs[2*2],face.uvs[2*2+1]] );

                var color = this.GetMaterialColorAtUVCoord( uvCoord, face.materialID );
                return [ dist_norm_ptL[0], dist_norm_ptL[1], color ]; //, uvCoord ];
            }
                
            if( numFaceVerts > 3 ){ //if face is a quad try the other triangle
                    triangle = new Triangle( 
                                    vertVect3s[2], vertVect3s[3], vertVect3s[0] );
                 dist_norm_ptL = triangle.RayTriangleIntersection( ray );
                 if( dist_norm_ptL != null ){
                    //the ray intersects the triangle, find the uv coordinate
                    var uvCoord = triangle.
                        UVCoordOfPoint( dist_norm_ptL[2],
                                    [face.uvs[2*2],face.uvs[2*2+1]], 
                                    [face.uvs[3*2],face.uvs[3*2+1]],
                                    [face.uvs[0*2],face.uvs[0*2+1]] );
                    var color = this.GetMaterialColorAtUVCoord( uvCoord, face.materialID );
                    return [ dist_norm_ptL[0], dist_norm_ptL[1], color ]; //, uvCoord ];
                }                   
            }
            
        } //end this.faces.length loop
        
        return null;
    }
    
    this.GetMaterialColorAtUVCoord = function( uv, matID ){
        //method from rasterization was to asynchronously load the shader
        //and bind it, impractical for query based rays where each ray
        //may reach a different shader
        //need to make sure the shaders in each mesh are loaded before rendering
        //though may be good to keep them stored in scene global dictionary to
        //avoid duplicate per mesh loading/instancing of shaders and materials
        //graphics.GetShader( filename, sceneName, 
        //     readyCallbackParams, shaderReadyCallback ) )
        //return [0.5,0.2,0.7,1.0]; //use a solid color until shaders and textures
        //for raytracing implemented
        return this.shaders[matID].GetColorAtUVCoord( uv );

    }

    //constructor functionality
    ///////////////////////////
    
    this.meshFileLoaded = function(meshFile, thisP)
	{	
		var meshFileLines = meshFile.split('\n');

		var numVerts = 0; //value to check for errors
		var faceCt = 0;
		for( var mLIdx = 0; mLIdx < meshFileLines.length; ++mLIdx )
		{
		    var temp = meshFileLines[mLIdx];
		    var words = temp.split(' ');

		    //read in the mesh transformation matrix (translate, scale, rotate)
		    if( temp[0] == 'm' )
		    {
		        while( ++mLIdx < meshFileLines.length )
		        {
		            temp = meshFileLines[mLIdx];
		            var words = temp.split(' ');
		            //read in the origin rotation and size of the mesh
		            if( temp[0] == 'x' )
		            {
		                thisP.origin =   new Float32Array([ 
		                    parseFloat(words[1]), 
		                    parseFloat(words[2]), 
		                    parseFloat(words[3]) ] );
		            }
		            else if( temp[0] == 'r' )
		            {
		                thisP.rotation = new Float32Array([ 
		                    parseFloat(words[1]), 
		                    parseFloat(words[2]), 
		                    parseFloat(words[3]) ] );
		            }
		            else if( temp[0] == 's' )
		            {
		                thisP.scale =    new Float32Array([ 
		                    parseFloat(words[1]), 
		                    parseFloat(words[2]), 
		                    parseFloat(words[3]) ] );
		            }
		            else if( temp[0] == 'e' )
		            {
		                break;
		            }
		        }
		    }

		    //read in the number of vertices
		    else if( temp[0] == 'c' && temp[1] == 'v' )
		    {
		        numVerts = words[1];
		    }

		    //read in a vertex
		    else if( temp[0] == 'v' )
		    {
		        //read in the position
		        thisP.vertPositions.push( parseFloat(words[1]) );
		        thisP.vertPositions.push( parseFloat(words[2]) );
		        thisP.vertPositions.push( parseFloat(words[3]) );

		        //read in the normal
		        temp = meshFileLines[++mLIdx];
		        words = temp.split(' ');
		        if( temp[0] != 'n' )
		        {
		            DPrintf('QuadMesh: ' + thisP.meshName +
		                    ', error expected vertex normal when reading mesh file');
		            return;
		        }
		        thisP.vertNormals.push( parseFloat(words[1]) );
		        thisP.vertNormals.push( parseFloat(words[2]) );
		        thisP.vertNormals.push( parseFloat(words[3]) );

		        //read in the bone weights until the end of the vertex
		        var boneWeights = {};
		        while( ++mLIdx < meshFileLines.length )
		        {
		            temp = meshFileLines[mLIdx];
		            words = temp.split(' ');
		            if( temp[0] == 'w' )
		            {
		                var boneName = words[1];
		                var boneWeight = parseFloat(words[2]);
		                boneWeights[boneName] = boneWeight;
		            }
		            else if( temp[0] == 'e')
		                break; //done reading the vertex
		        }
		        thisP.vertBoneWeights.push(boneWeights);
		    }

		    //read in the number of faces
		    else if( temp[0] == 'c' && temp[1] == 'f' )
		    {
		        faceCt = words[1];
		    }

		    //read in a face
		    else if( temp[0] == 'f' )
		    {
		        var newFace = new Face();
		        while( ++mLIdx < meshFileLines.length )
		        {
		            temp = meshFileLines[mLIdx];
		            words = temp.split(' ');

		            //read in the material id of the face
		            if( temp[0] == 'm' )
		                newFace.materialID = parseInt(words[1]);

		            //read in the vertex idx's of the face
		            if( temp[0] == 'v' )
		            {
		                var numFaceVerts = 0;
		                for( var vertNumIdx = 1; 
		                    vertNumIdx < words.length; ++vertNumIdx )
		                {
		                    var vertIdx = parseFloat(words[vertNumIdx]);
		                    if( vertIdx < 0 || vertIdx > numVerts )
		                    {
		                        DPrintf( 'QuadMesh: ' + thisP.meshName +
		                                 ', face: ' +
		                                    (thisP.faces.length-1).toString()  + 
		                                 ', vertIdx: ' + vertIdx +
		                                 ' is out of range.' );
		                        return;
		                    }
		                    newFace.vertIdxs.push(vertIdx);
		                    ++numFaceVerts;
		                }
		                if(numFaceVerts == 3)
		                    thisP.faceVertsCt += 3;
		                else if(numFaceVerts == 4)
		                    thisP.faceVertsCt += 6; //since will have to tesselate
		                else{
		                    DPrintf( 'QuadMesh: ' + thisP.meshName + 
		                             'reading face: ' +
		                                (thisP.faces.length-1).toString()  +
		                         ', expected 3 or 4 vertices, instead got: ' + 
		                            numFaceVerts);
		                    return;
		                }
		            }

		            //read in the face texture coords
		            if( temp[0] == 'u' )
		            {
		                for( var uvIdx = 1; uvIdx < words.length; uvIdx += 2 )
		                {
		                    var u = parseFloat(words[uvIdx]);
		                    var v = parseFloat(words[uvIdx+1]);
		                    //v = 1.0 - v; 
		                    // flip the texture vertically if necessay
		                    newFace.uvs.push(u);
		                    newFace.uvs.push(v);
		                }
		            }

		            //end of face data
		            if( temp[0] == 'e' )
		            {
		                if( !(newFace.uvs.length/2 >= newFace.vertIdxs.length) )
		                {
		                    DPrintf( 'QuadMesh: ' + thisP.meshName + 
		                             'reading face: ' + thisP.faces.length  + 
		                             ', expected: ' + newFace.vertIdxs.length + 
		                             ' uv\'s, but got: ' + newFace.uvs.length/2 );
		                    //return;
		                }
		                thisP.faces.push(newFace);
		                break;
		            }
		        }
		    }
		}

		if( !(Math.abs(thisP.vertPositions.length - numVerts*3) < 0.01) )
		    DPrintf("Quadmesh: verts read mismatch\n");
		else if ( !(Math.abs(thisP.vertNormals.length - numVerts*3) < 0.01) )
		    DPrintf("Quadmesh: normals read mismatch\n");
		else
		    thisP.isValid = true;

		//copy the normals and verticies into a float32 array 
		//for compatibility with gl
		thisP.vertPostions = new Float32Array(thisP.vertPositions);
		thisP.vertNormals  = new Float32Array(thisP.vertNormals);

		//initialize the animation
		if( thisP.ipoAnimation.isValid || 
		    thisP.keyAnimation.isValid || 
		    thisP.skelAnimation.isValid )
		{
		    thisP.isAnimated = true;
		    thisP.Update(0.0);
		}

		DPrintf('Quadmesh: ' + thisP.meshName +
		        ', successfully read in faces: ' + thisP.faces.length + 
		        ', verts: ' + thisP.vertPositions.length/3 );

		//finalize the binding between the quadMesh and the skelAnimation
		//by setting the boneID's in the bone weights 
		//based on the bone positions
		//in the animation bone list
		for( var i in thisP.vertBoneWeights )
		    for( var boneName in thisP.vertBoneWeights[i] )
		        for( var k in thisP.skelAnimation.bones )
		            if(thisP.skelAnimation.bones[k].boneName == boneName)
		                thisP.vertBoneWeights[i][boneName].boneID = k;
		thisP.quadMeshReadyCallback(thisP, thisP.readyCallbackParameters);
    }

    //read in the materials file
    var matFileName = "scenes/" + this.sceneName + "/meshMaterials/" + 
                                  this.meshName + ".hvtMeshMat";
                                  
    this.shaderReady = function( shader, thisPAndShaderIdx ){
        thisPAndShaderIdx[0].shaders.splice( thisPAndShaderIdx[1], 0, shader);
    }

    this.matFileLoaded = function(matFile, thisP)
    {
		var matFileLines = matFile.split('\n');

		for( var matIdx in matFileLines )
		{
		    var temp = matFileLines[matIdx];
		    if( temp[0] == 's' ) //name of a shader
		    {
		        var words = temp.split(' ');
		        thisP.shaderNames.push(words[1]);
		        //preload the shader
		        graphics.GetShader( words[1], thisP.sceneName, 
		        [thisP, thisP.shaderNames.length-1], thisP.shaderReady );
		    }
		}
		if( thisP.shaderNames.length < 1 )
		{
		    DPrintf('QuadMesh: ' + thisP.meshName + 
		        ', failed to read any materials, loading default material');
		    thisP.shaderNames.push("default");
		    //preload the shader
	        graphics.GetShader( "default", thisP.sceneName,
	        [thisP, thisP.shaderNames.length-1], thisP.shaderReady );
		}

		//read in the mesh file
		var meshFileName = "scenes/"  + thisP.sceneName + 
		                   "/meshes/" + thisP.meshName + ".hvtMesh";
		loadTextFile( meshFileName, thisP.meshFileLoaded, thisP );
		//when completed calls mesh file loaded above
	}
	loadTextFile( matFileName, this.matFileLoaded, this );
	//when completed calls to mat file loaded above

	
    
}
