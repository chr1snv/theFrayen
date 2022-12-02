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
    }

    this.meshName        = nameIn;
    this.sceneName       = sceneNameIn;

    this.isValid         = false; //true once loading is complete
    this.isAnimated      = false;

    //the orientation matrix
    this.scale           = new Float32Array([1,1,1]);
    this.rotation        = new Float32Array([0,0,0]);
    this.origin          = new Float32Array([0,0,0]);

    this.shaderNames     = [];

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
    
    /*

    //calculate per vertex normals from face averaged normals
    //calculated from vertex position coordinates
    this.GenerateNormalCoords = function( vertNormals, faces, positionCoords )
    {

        //zero the output accumulator
        for( var i in vertNormals )
            vertNormals[i] = 0;

        //for each face generate an accumulated normal vector
        for(var i=0; i<faces.length; ++i)
        {
            var numVertIdxs = faces[i].vertIdxs.length;
            if(numVertIdxs < 3)
                DPrintf("GenerateNormalCoords: expected 3 or more vertIdx's, got: %i", numVertIdxs);
            //newell's method
            var normal = [0,0,0];
            //go through all of the verticies in the face
            for(var j=0; j<numVertIdxs; ++j)
            {
                //fetch 3 verticies from the face 
                //(to get two edges to compute a normal from)
                var vIdx0 = faces[i].vertIdxs[(0+j)%numVertIdxs];
                var vIdx1 = faces[i].vertIdxs[(1+j)%numVertIdxs];
                var vIdx2 = faces[i].vertIdxs[(2+j)%numVertIdxs];
                //graphics.vertCard is the cardinality of a vertex (3 x y z)
                var v0 = [positionCoords[vIdx0*graphics.vertCard+0],
                          positionCoords[vIdx0*graphics.vertCard+1],
                          positionCoords[vIdx0*graphics.vertCard+2]];
                var v1 = [positionCoords[vIdx1*graphics.vertCard+0],
                          positionCoords[vIdx1*graphics.vertCard+1],
                          positionCoords[vIdx1*graphics.vertCard+2]];
                var v2 = [positionCoords[vIdx2*graphics.vertCard+0],
                          positionCoords[vIdx2*graphics.vertCard+1],
                          positionCoords[vIdx2*graphics.vertCard+2]];

                //calculate the relative vectors 
                //(relative to the current middle vert)
                //(vectors in the direction of the edges of the face 
                //from v1->v0 and v1->v2)
                Vect3_Subtract(v0, v1);
                Vect3_Subtract(v2, v1);
                //calculate the normal (orthogonal vector to the edge vectors)
                var crossProd = [];
                Vect3_Cross(crossProd, v2, v0); 
                //normal is the cross product of the relative vectors
                Vect3_Add(normal, crossProd); 
                //average the contribution of the sub edges of the face
            }
            //normalize the accumulation of normals 
            //from the edge pairs of the face 
            Vect3_Unit(normal); //possibly optional or to be changed 
            //so that faces with more / less vertices
            //contribute more to the per vertex normal

            //accumulate the face normal back to each vertex
            for(var j=0; j<numVertIdxs; ++j)
            {
                //add the new normal to it
                var vertIdx = (faces[i].vertIdxs[j])*graphics.normCard;
                var tempAccum = [];
                Vect3_Copy(tempAccum, [ vertNormals[vertIdx+0],
                                        vertNormals[vertIdx+1],
                                        vertNormals[vertIdx+2] ]);
                Vect3_Add(tempAccum, normal);
                vertNormals[vertIdx+0] = tempAccum[0];
                vertNormals[vertIdx+1] = tempAccum[1];
                vertNormals[vertIdx+2] = tempAccum[2];
                
            } //end write normal data
        } //end for each face

        //normalize the accumulated face normals vectors for each  
        //make the normals unit length (average output)
        for(var i=0; i<positionCoords.length; ++i){
            var idx = i*graphics.normCard;
            var len = Vect3_Length( [ vertNormals[idx+0],
                                      vertNormals[idx+1],
                                      vertNormals[idx+2] ] );
            vertNormals[idx+0] /= len;
            vertNormals[idx+1] /= len;
            vertNormals[idx+2] /= len;
        }
    }
    
    //used to tesselate position coordinates
    //(convert from quad and triangle faces to only triangles
    //3 verticies per face) for rendering with webgl 
    this.tesselateCoords = function( coords,
                                     faces,
                                     inputCoords )
    {
        var cI = 0;
        
        //create the vertex array
        for(var i=0; i<faces.length; ++i)
        {
            var coordsSize = faces[i].vertIdxs.length;
            
            if(coordsSize == 3) //triangle
            {
                for(var j=0; j<faces[i].vertIdxs.length; ++j)
                {
                    var coordIdx = (faces[i].vertIdxs[j])*graphics.vertCard;
                    coords[cI++] = inputCoords[coordIdx];
                    coords[cI++] = inputCoords[coordIdx+1];
                    coords[cI++] = inputCoords[coordIdx+2];
                }
            }
            else if(coordsSize == 4) //quad. tesselate into two triangles
            {
                var coordIdx = (faces[i].vertIdxs[0])*graphics.vertCard;
                coords[cI++] = inputCoords[coordIdx];
                coords[cI++] = inputCoords[coordIdx+1];
                coords[cI++] = inputCoords[coordIdx+2];
                
                coordIdx = (faces[i].vertIdxs[1])*graphics.vertCard;
                coords[cI++] = inputCoords[coordIdx];
                coords[cI++] = inputCoords[coordIdx+1];
                coords[cI++] = inputCoords[coordIdx+2];
                
                coordIdx = (faces[i].vertIdxs[2])*graphics.vertCard;
                coords[cI++] = inputCoords[coordIdx];
                coords[cI++] = inputCoords[coordIdx+1];
                coords[cI++] = inputCoords[coordIdx+2];
                
                coordIdx = (faces[i].vertIdxs[2])*graphics.vertCard;
                coords[cI++] = inputCoords[coordIdx];
                coords[cI++] = inputCoords[coordIdx+1];
                coords[cI++] = inputCoords[coordIdx+2];
                
                coordIdx = (faces[i].vertIdxs[3])*graphics.vertCard;
                coords[cI++] = inputCoords[coordIdx];
                coords[cI++] = inputCoords[coordIdx+1];
                coords[cI++] = inputCoords[coordIdx+2];
                
                coordIdx = (faces[i].vertIdxs[0])*graphics.vertCard;
                coords[cI++] = inputCoords[coordIdx];
                coords[cI++] = inputCoords[coordIdx+1];
                coords[cI++] = inputCoords[coordIdx+2];
            }
        }
        if(cI != coords.length)
            DPrintf("GenerateCoords: unexpected number of vertCoords generated.\n");
    }
    
    //baised on faces (that may be a mixture of triangles and quads)
    // generate only triangle uv coordinates
    //for buffering and rendering with gl
    this.tesselateUVCoords = function( uvCoords, faces )
    {
        var cI = 0;
        
        //create the vertex index array
        for(var i=0; i<faces.length; ++i)
        {
            var vertsSize = faces[i].vertIdxs.length;
            
            if( vertsSize == 3) //triangle
            {
                for(var j=0; j<3*graphics.uvCard; j+=graphics.uvCard)
                {
                    uvCoords[cI++] = faces[i].uvs[j+0];
                    uvCoords[cI++] = faces[i].uvs[j+1];
                }
            }
            else if(vertsSize == 4) //quad. tesselate into two triangles
            {
                uvCoords[cI++] = faces[i].uvs[0+0];
                uvCoords[cI++] = faces[i].uvs[0+1];
                
                uvCoords[cI++] = faces[i].uvs[1+0];
                uvCoords[cI++] = faces[i].uvs[1+1];
                
                uvCoords[cI++] = faces[i].uvs[2+0];
                uvCoords[cI++] = faces[i].uvs[2+1];
                
                uvCoords[cI++] = faces[i].uvs[2+0];
                uvCoords[cI++] = faces[i].uvs[2+1];
                
                uvCoords[cI++] = faces[i].uvs[3+0];
                uvCoords[cI++] = faces[i].uvs[3+1];
                
                uvCoords[cI++] = faces[i].uvs[0+0];
                uvCoords[cI++] = faces[i].uvs[0+1];
            }
        }
    }
    */
    
    
    //returns the non tessilated verts. returns new memory
    this.UpdateTransformedVerts = function(time)
    {
        var positionCoords;
        
        if(this.keyedPositions.length != 0)
            positionCoords = this.keyedPositions; //keyframe animated positions
        else if(this.skelPositions.length != 0)
            positionCoords = this.skelPositions;
        else
            positionCoords = this.vertPositions;  //static vert positions
            
        if( this.skelAnimation.isValid )
            this.skelAnimation.GenerateMesh( 
                this.transformedVerts, numVerts, mesh, time );
        else
            this.transformedVerts = positionCoords;
        
        //return positionCoords;
    }

    //using the MeshKeyAnimation
    //update the current mesh (used by skeletal animation if present) 
    //to the current animationFrame
    this.Update = function(animationTime) {
        if( animationTime > this.lastMeshUpdateTime ){
            this.lastMeshUpdateTime = animationTime > 0 ? animationTime : 0;
            this.UpdateTransformedVerts(this.lastMeshUpdateTime);
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

    
    //draw interface
    this.Draw = function(verts, normals, uvs)
    {
        //since quad meshes are a mixture of quads and tris,
        //use the face vertex indices to tesselate the entire mesh into
        //tris, calculate face normals, and upload to gl and draw

        if(!this.isValid)
        {
            DPrintf("QuadMesh::Draw: failed to draw.\n");
            return;
        }

        /* //assumed Update( time ) has updated the transformedPositions
           //before this Draw function is called
        //
        ///get the animation transformed mesh vertex data
        ////////////////////////////////////////////////////////////

        var transformedPositions = this.getTransformedVerts();
        */

        //
        ///Generate the vertex position coordinates
        ////////////////////////////////////////////////////////////

        //tesselate the mesh
        this.tesselateCoords( verts, this.faces, this.transformedPositions );
        
        gl.bindBuffer(gl.ARRAY_BUFFER, vertsBuffer);
        var attr = gl.getAttribLocation( graphics.currentProgram, "position");
        gl.enableVertexAttribArray(attr);
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(attr, graphics.vertCard, gl.FLOAT, false, 0, 0);

        ////
        //Generate the vertex normal coordinates
        ////////////////////////////////////////////////////////////

        var normCard = 3;

        //generate & tesselate the normal coords 
        //from the batch of verts currently being used
        
        var normalCoords = new Float32Array(this.transformedPositions.length);
        this.GenerateNormalCoords(
                normalCoords, this.faces, this.transformedPositions);
        this.tesselateCoords(normals, this.faces, normalCoords);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
        var attr = gl.getAttribLocation( graphics.currentProgram, "norm");
        gl.enableVertexAttribArray(attr);
        gl.bufferData(gl.ARRAY_BUFFER, normals, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(attr, graphics.normCard, gl.FLOAT, false, 0, 0);
        
        
        ////
        //Generate the texture coordinates (per vertex)
        /////////////////////////////////////////////////////////////

        this.tesselateUVCoords(uvs, this.faces);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, uvsBuffer);
        var attr = gl.getAttribLocation( graphics.currentProgram, "texCoord");
        gl.enableVertexAttribArray(attr);
        gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(attr, graphics.uvCard, gl.FLOAT, false, 0, 0);
    }
    
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
    this.GetBoundingPlanes = function() { return {1:{}, 2:{} }; }
    
    this.lastAABBUpdateTime = -1;
    this.lastAABB = null;
    //get the axis aligned bounding box of the mesh
    this.GetAABB = function(time) {
        if( this.lastAABBUpdateTime < time )
        {
            var minX =  Number.MAX_VALUE;
            var minY =  Number.MAX_VALUE;
            var minZ =  Number.MAX_VALUE;
            var maxX = -Number.MAX_VALUE;
            var maxY = -Number.MAX_VALUE;
            var maxZ = -Number.MAX_VALUE;
            //assumed that Update( time ) has been called to update the 
            //transformedPositions before this
            if( this.transformedVerts == null || this.lastMeshUpdateTime < time)
                this.Update( time );
            for ( var i = 0; i < this.transformedVerts.length; 
                  i+=graphics.vertCard ){
            
                if( this.transformedVerts[ i + 0] < minX ){
                    minX = this.transformedVerts[ i + 0];
                }
                if( this.transformedVerts[ i + 1] < minY ){
                    minY = this.transformedVerts[ i + 1];
                }
                if( this.transformedVerts[ i + 2] < minZ ){
                    minZ = this.transformedVerts[ i + 2];
                }
                if( this.transformedVerts[ i + 0] > maxX ){
                    maxX = this.transformedVerts[ i + 0];
                }
                if( this.transformedVerts[ i + 1] > maxY ){
                    maxY = this.transformedVerts[ i + 1];
                }
                if( this.transformedVerts[ i + 2] > maxZ ){
                    maxZ = this.transformedVerts[ i + 2];
                }
                
            }
            this.lastAABBUpdateTime = this.lastMeshUpdateTime;
            this.lastAABB = new AABB( [ minX, minY, minZ], [maxX, maxY, maxZ] );
            
        }
        return this.lastAABB;
    }
    
    
    this.GetRayIntersection = function(ray){
    
        //check all faces of the mesh if the ray intersects, if it does, return the
        //intersection point, ray distance, face index, that the ray hit
        
        //to avoid checking all faces for each ray, use an oct tree on the model
        for( var f = 0; f < this.faces.length; ++f ){
            //each face should have 3 or 4 verticies
            var numFaceVerts = this.faces[f].vertIdxs.length;
            
            var vertVect3s = [];
            for( var v = 0; v < numFaceVerts; ++v ){
                vertVect3s[v] = [ 
                    this.transformedVerts[ 
                        this.faces[f].vertIdxs[v]*graphics.vertCard + 0 ],
                    this.transformedVerts[ 
                        this.faces[f].vertIdxs[v]*graphics.vertCard + 1 ],
                    this.transformedVerts[ 
                        this.faces[f].vertIdxs[v]*graphics.vertCard + 2 ] ];
            }
            
            var triangle = new Triangle( 
                vertVect3s[0], vertVect3s[1], vertVect3s[2] );
            
            
            
            //get a point and the face normal and check 
            //where the ray intersects the plane
            //rayTriangleIntersection
            var intersectionPointTime = triangle.RayTriangleIntersection( ray );
            if( intersectionPointTime != null )
                return [intersectionPointTime, f];
            //else try another triangle
            
        }
        
        return null;
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
		                thisP.origin =   [ 
		                    parseFloat(words[1]), 
		                    parseFloat(words[2]), 
		                    parseFloat(words[3]) ];
		            }
		            else if( temp[0] == 'r' )
		            {
		                thisP.rotation = [ 
		                    parseFloat(words[1]), 
		                    parseFloat(words[2]), 
		                    parseFloat(words[3]) ];
		            }
		            else if( temp[0] == 's' )
		            {
		                thisP.scale =    [ 
		                    parseFloat(words[1]), 
		                    parseFloat(words[2]), 
		                    parseFloat(words[3]) ];
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
		                newFace.materialID = words[1];

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
		    }
		}
		if( thisP.shaderNames.length < 1 )
		{
		    DPrintf('QuadMesh: ' + thisP.meshName + 
		        ', failed to read any materials, loading default material');
		    thisP.shaderNames.push("default");
		}

		//read in the mesh file
		var meshFileName = "scenes/"  + thisP.sceneName + 
		                   "/meshes/" + thisP.meshName + ".hvtMesh";
		loadTextFile( meshFileName, thisP.meshFileLoaded, thisP );
	}
	loadTextFile( matFileName, this.matFileLoaded, this );

	
    
}
