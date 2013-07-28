//QuadMesh.js - implementation of QuadMesh

function QuadMesh(nameIn, sceneNameIn)
{
    function Face()
    {
        this.materialID = 0;
        this.uvs        = [];
        this.vertIdxs   = [];
    }

    this.meshName        = nameIn;
    this.sceneName       = sceneNameIn;

    this.isValid         = false;
    this.isAnimated      = false;

    //the orientation matrix
    this.scale           = new Float32Array([1,1,1]);
    this.rotation        = new Float32Array([0,0,0]);
    this.origin          = new Float32Array([0,0,0]);

    this.shaderNames     = [];

    //the raw mesh data
    this.faces           = [];
    this.faceVertsCt     = 0;
    this.vertPositions   = [];
    this.vertNormals     = [];
    this.vertBoneWeights = [];

    //animated mesh
    this.keyedPositions  = [];
    this.skelPositions   = [];

    //animation classes
    this.ipoAnimation    = new IPOAnimation(     this.meshName, this.sceneName);
    this.keyAnimation    = new MeshKeyAnimation( this.meshName, this.sceneName);
    this.skelAnimation   = new SkeletalAnimation(this.meshName, this.sceneName);

    //calculate vertex normals from face and vertex coordinate data
    this.GenerateNormalCoords = function( vertNormals, faces, positionCoords )
    {

        //zero the output accumulator
        for( var i in vertNormals )
            vertNormals[i] = 0;

        //for each vertex occurrence in a face generate an accumulated normal vector
        for(var i=0; i<faces.length; ++i)
        {
            var numVertIdxs = faces[i].vertIdxs.length;
            if(numVertIdxs < 3)
                alert("GenerateNormalCoords: expected 3 or more vertIdx's, got: %i", numVertIdxs);
            //newell's method
            var normal = [0,0,0];
            for(var j=0; j<numVertIdxs; ++j)
            {
                //fetch the vert data
                var vIdx0 = faces[i].vertIdxs[(0+j)%numVertIdxs];
                var vIdx1 = faces[i].vertIdxs[(1+j)%numVertIdxs];
                var vIdx2 = faces[i].vertIdxs[(2+j)%numVertIdxs];
                var v0 = [positionCoords[vIdx0*graphics.vertCard+0],
                          positionCoords[vIdx0*graphics.vertCard+1],
                          positionCoords[vIdx0*graphics.vertCard+2]];
                var v1 = [positionCoords[vIdx1*graphics.vertCard+0],
                          positionCoords[vIdx1*graphics.vertCard+1],
                          positionCoords[vIdx1*graphics.vertCard+2]];
                var v2 = [positionCoords[vIdx2*graphics.vertCard+0],
                          positionCoords[vIdx2*graphics.vertCard+1],
                          positionCoords[vIdx2*graphics.vertCard+2]];

                //calculate the relative vectors (relative to the current middle vert)
                Vect3_Subtract(v0, v1);
                Vect3_Subtract(v2, v1);
                //calculate the normal
                var crossProd = [];
                Vect3_Cross(crossProd, v2, v0); //normal is the cross product of the relative vectors
                Vect3_Add(normal, crossProd); //average the contribution of the sub triangles of this face
            }
            //make each face contribute an equal amount to the vertex normal
            //regardless of face size
            Vect3_Unit(normal);

            //write normal data
            for(var j=0; j<numVertIdxs; ++j)
            {
                //add the new normal to it
                var vertIdx = (faces[i].vertIdxs[j])*graphics.normCard;
                var tempAccum = [];
                Vect3_Copy(tempAccum, [ vertNormals[vertIdx+0],
                                        vertNormals[vertIdx+1],
                                        vertNormals[vertIdx+2] ]);
                Vect3_Add(tempAccum, normal);
                Vect3_Copy(vertNormals[vertIdx], tempAccum);
            } //end write normal data
        } //end for each vertex occurrence in a face

        //make the normals unit length (average output)
        for(var i=0; i<positionCoords.length; ++i){
            var idx = i*graphics.normCard;
            Vect3_Unit( [ vertNormals[idx+0],
                          vertNormals[idx+1],
                          vertNormals[idx+2] ] );
        }
    }
    
    //used to tesselate normal and position coordinates
    this.tesselateCoords = function( coords,
                                     faces,
                                     inputCoords )
    {
        var card = 3; //x,y,z components, cardinality 3
        var cI = 0;
        
        //create the vertex array
        for(var i=0; i<faces.length; ++i)
        {
            var coordsSize = faces[i].vertIdxs.length;
            
            if(coordsSize == 3) //triangle
            {
                for(var j=0; j<faces[i].vertIdxs.length; ++j)
                {
                    var coordIdx = (faces[i].vertIdxs[j])*card;
                    coords[cI++] = inputCoords[coordIdx];
                    coords[cI++] = inputCoords[coordIdx+1];
                    coords[cI++] = inputCoords[coordIdx+2];
                }
            }
            else if(coordsSize == 4) //quad. tesselate into two triangles
            {
                var coordIdx = (faces[i].vertIdxs[0])*card;
                coords[cI++] = inputCoords[coordIdx];
                coords[cI++] = inputCoords[coordIdx+1];
                coords[cI++] = inputCoords[coordIdx+2];
                
                vertIdx = (faces[i].vertIdxs[1])*card;
                coords[cI++] = inputCoords[coordIdx];
                coords[cI++] = inputCoords[coordIdx+1];
                coords[cI++] = inputCoords[coordIdx+2];
                
                vertIdx = (faces[i].vertIdxs[2])*card;
                coords[cI++] = inputCoords[coordIdx];
                coords[cI++] = inputCoords[coordIdx+1];
                coords[cI++] = inputCoords[coordIdx+2];
                
                vertIdx = (faces[i].vertIdxs[2])*card;
                coords[cI++] = inputCoords[coordIdx];
                coords[cI++] = inputCoords[coordIdx+1];
                coords[cI++] = inputCoords[coordIdx+2];
                
                vertIdx = (faces[i].vertIdxs[3])*card;
                coords[cI++] = inputCoords[coordIdx];
                coords[cI++] = inputCoords[coordIdx+1];
                coords[cI++] = inputCoords[coordIdx+2];
                
                vertIdx = (faces[i].vertIdxs[0])*card;
                coords[cI++] = inputCoords[coordIdx];
                coords[cI++] = inputCoords[coordIdx+1];
                coords[cI++] = inputCoords[coordIdx+2];
            }
        }
        if(cI != coords.length)
            DPrintf("GenerateCoords: unexpected number of vertCoords generated.\n");
    }
    
    this.tesselateUVCoords = function( uvCoords, faces )
    {
        var cI = 0;
        
        //create the vertex index array
        for(var i=0; i<faces.length; ++i)
        {
            var vertsSize = faces[i].vertIdxs.length;
            
            if( vertsSize == 3) //triangle
            {
                for(var j=0; j<faces[i].vertIdxs.length; ++j)
                {
                    uvCoords[cI++] = faces[i].uvs[j].u;
                    uvCoords[cI++] = faces[i].uvs[j].v;
                }
            }
            else if(vertsSize == 4) //quad. tesselate into two triangles
            {
                uvCoords[cI++] = faces[i].uvs[0].u;
                uvCoords[cI++] = faces[i].uvs[0].v;
                
                uvCoords[cI++] = faces[i].uvs[1].u;
                uvCoords[cI++] = faces[i].uvs[1].v;
                
                uvCoords[cI++] = faces[i].uvs[2].u;
                uvCoords[cI++] = faces[i].uvs[2].v;
                
                uvCoords[cI++] = faces[i].uvs[2].u;
                uvCoords[cI++] = faces[i].uvs[2].v;
                
                uvCoords[cI++] = faces[i].uvs[3].u;
                uvCoords[cI++] = faces[i].uvs[3].v;
                
                uvCoords[cI++] = faces[i].uvs[0].u;
                uvCoords[cI++] = faces[i].uvs[0].v;
            }
        }
    }
    
    //returns the non tessilated verts. returns new memory
    this.getTransformedVerts = function()
    {
        var vertCard = 3;
        var positionCoords;
        if(this.skelPositions.length != 0)
            positionCoords = this.skelPositions;
        else if(this.keyedPositions.length != 0)
            positionCoords = this.keyedPositions;
        else
            positionCoords = this.vertPositions;

        return positionCoords;
    }

    //using the MeshKeyAnimation
    //update the current mesh (used by skeletal animation if present) to the current animationFrame
    this.Update = function(animationTime) {}
    this.GetAnimationLength = function() {}

    //used by skeletal animation classes
    this.GetVertsCt = function() { return vertsCt; }
    this.GetVertPosition = function(posRet, idx) {}

    //used by Model to cache data for later fast lookup
    this.GetVertBoneWeightsSize = function(){ return vertBoneWeights.size(); }
    this.GetVertBoneWeights = function(i) { return vertBoneWeights[i]; }
    this.SetVertBoneWeights = function(i) { return vertBoneWeights[i]; }

    //transformation query functions
    this.GetPosition = function(pos) { Vect3_Copy(pos, this.origin); }
    this.GetScale = function(scaleOut) { Vect3_Copy(scaleOut, this.scale); }
    this.GetRotation = function(rotOut) { Vect3_Copy(rotOut, this.rotation); }

    //color manipulation functions
    this.GetShaderName = function(){ return [this.shaderNames[0], this.sceneName]; }

    //draw interface
    this.Draw = function(verts, normals, uvs)
    {
        //since quad meshes are a mixture of quads and tris,
        //use the face vertex indices to tesselate the entire mesh into
        //tris, calculate face normals, and upload to gl and draw

        if(!this.isValid) {
            alert("QuadMesh::Draw: failed to draw.\n");
            return;
        }

        //
        ///Select the source of mesh vertex data
        ////////////////////////////////////////////////////////////

        var transformedPositions = this.getTransformedVerts();

        //
        ///Generate the vertex position coordinates
        ////////////////////////////////////////////////////////////

        //tesselate the mesh
        this.tesselateCoords( verts, this.faces, transformedPositions );

        ////
        //Generate the vertex normal coordinates
        ////////////////////////////////////////////////////////////

        var normCard = 3;

        //generate & tesselate the normal coords from the batch of verts currently being used
        var normalCoords = new Float32Array(transformedPositions.length);
        this.GenerateNormalCoords(normalCoords, this.faces, transformedPositions);
        this.tesselateCoords(normals, this.faces, normalCoords);
        
        ////
        //Generate the vertex texture coordinates
        /////////////////////////////////////////////////////////////

        this.tesselateUVCoords(uvs, this.faces);
    }
    this.DrawSkeleton = function() { skelAnimation.Draw(); }

    //type query functions
    this.IsHit = function() {}
    this.IsTransparent = function() { return graphics.GetShader(this.shaderNames[0], this.sceneName).IsTransparent(); }

    //geometry query function
    this.GetBoundingPlanes = function(boxPlanes, boxPlanesSize) {}

    //constructor functionality
    ///////////////////////////

    //read in the materials file
    var matFileName = "scenes/"+this.sceneName+"/meshMaterials/"+this.meshName+".hvtMeshMat";
    var matFile = loadTextFileSynchronous(matFileName);
    var matFileLines = matFile.split('\n');

    for( var matIdx in matFileLines )
    {
        var temp = matFileLines[matIdx];
        if( temp[0] == 's' ) //name of a shader
        {
            var words = temp.split(' ');
            this.shaderNames.push(words[1]);
        }
    }
    if( this.shaderNames.length < 1 ){
        alert('QuadMesh: ' + this.meshName + ', failed to read any materials, loading default material');
        this.shaderNames.push("default");
    }

    //read in the mesh file
    var meshFileName = "scenes/"+this.sceneName+"/meshes/"+this.meshName+".hvtMesh";
    var meshFile = loadTextFileSynchronous(meshFileName);
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
                    this.origin =   [ parseFloat(words[1]), parseFloat(words[2]), parseFloat(words[3]) ];
                }
                else if( temp[0] == 'r' )
                {
                    this.rotation = [ parseFloat(words[1]), parseFloat(words[2]), parseFloat(words[3]) ];
                }
                else if( temp[0] == 's' )
                {
                    this.scale =    [ parseFloat(words[1]), parseFloat(words[2]), parseFloat(words[3]) ];
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
            this.vertPositions.push(parseFloat(words[1]));
            this.vertPositions.push(parseFloat(words[2]));
            this.vertPositions.push(parseFloat(words[3]));

            //read in the normal
            temp = meshFileLines[++mLIdx];
            words = temp.split(' ');
            if( temp[0] != 'n' ){
                DPrintf('QuadMesh: ' + this.meshName +
                        ', error expected vertex normal when reading mesh file');
                return;
            }
            this.vertNormals.push(parseFloat(words[1]));
            this.vertNormals.push(parseFloat(words[2]));
            this.vertNormals.push(parseFloat(words[3]));

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
            this.vertBoneWeights.push(boneWeights);
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
                {
                    newFace.materialID = words[1];
                }

                //read in the vertex idx's of the face
                if( temp[0] == 'v' )
                {
                    var numFaceVerts = 0;
                    for( var vertNumIdx = 1; vertNumIdx < words.length; ++vertNumIdx )
                    {
                        var vertIdx = parseFloat(words[vertNumIdx]);
                        if( vertIdx < 0 || vertIdx > numVerts ){
                            DPrintf( 'QuadMesh: ' + this.meshName + ', face: ' +
                                   (this.faces.length-1).toString()  + ', vertIdx: ' + vertIdx +
                                   ' is out of range.' );
                            return;
                        }
                        newFace.vertIdxs.push(vertIdx);
                        ++numFaceVerts;
                    }
                    if(numFaceVerts == 3)
                        this.faceVertsCt += 3;
                    else if(numFaceVerts == 4)
                        this.faceVertsCt += 6; //since will have to tesselate
                    else{
                        DPrintf('QuadMesh: ' + this.meshName + 'reading face: ' +
                              (this.faces.length-1).toString()  +
                              ', expected 3 or 4 vertices, instead got: ' + numFaceVerts);
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
                        //v = 1.0 - v; // flip the texture vertically if necessay
                        newFace.uvs.push(u);
                        newFace.uvs.push(v);
                    }
                }

                //end of face data
                if( temp[0] == 'e' )
                {
                    if( !(Math.abs(newFace.uvs.length/2 - newFace.vertIdxs.length) < 0.01) )
                    {
                        DPrintf( 'QuadMesh: ' + this.meshName + 'reading face: ' +
                                this.faces.length  + ', expected: ' +
                                newFace.vertIdxs.length + ' uv\'s, but got: ' +
                                newFace.uvs.length/2 );
                        return;
                    }
                    this.faces.push(newFace);
                    break;
                }
            }
        }
    }

    if( !(Math.abs(this.vertPositions.length - numVerts*3) < 0.01) )
        DPrintf("Quadmesh: verts read mismatch\n");
    else if ( !(Math.abs(this.vertNormals.length - numVerts*3) < 0.01) )
        DPrintf("Quadmesh: normals read mismatch\n");
    else
        this.isValid = true;

    //copy the normals and verticies into a float32 array for compatibility with gl
    this.vertPostions = new Float32Array(this.vertPositions);
    this.vertNormals  = new Float32Array(this.vertNormals);

    //initialize the animation
    if( this.ipoAnimation.isValid || this.keyAnimation.isValid || this.skelAnimation.isValid ){
        this.isAnimated = true;
        this.Update(0.0);
    }

    DPrintf('Quadmesh: ' + this.meshName +
            ', successfully read in faces: ' + this.faces.length + 
            ', verts: ' + this.vertPositions.length/3 );

    //finalize the binding between the quadMesh and the skelAnimation
    //by setting the boneID's in the bone weights based on the bone positions
    //in the animation bone list
    for( var i in this.vertBoneWeights ){
        for( var boneName in this.vertBoneWeights[i] ){
            for( var k in this.skelAnimation.bones ){
                if(this.skelAnimation.bones[k].boneName == boneName){
                    this.vertBoneWeights[i][boneName].boneID = k;
                }
            }
        }
    }
}
