//QuadMesh.js - implementation of QuadMesh

function QuadMesh(nameIn, sceneNameIn)
{
    function Face()
    {
        this.materialID = 0;
        this.uvs = [];
        this.vertIdxs = [];
    }

    this.meshName = nameIn;
    this.sceneName = sceneNameIn;

    this.isValid = false;
    this.isAnimated = false;

    //the orientation matrix
    this.scale = [1,1,1];
    this.rotation = [0,0,0];
    this.origin = [0,0,0];

    this.shaderNames = [];

    //the raw mesh data
    this.faces = [];
    this.faceVertsCt = 0;
    this.vertPositions = [];
    this.vertNormals = [];
    this.vertBoneWeights = [];

    //animated mesh
    this.keyedPositions = [];
    this.skelPositions = [];
    this.ipoOriginMatrix = new Array(4*4);
    Matrix(this.ipoOriginMatrix, MatrixType.identity);

    //animation classes
    this.ipoAnimation  = new IPOAnimation(this.meshName, this.sceneName);
    this.keyAnimation  = undefined;
    this.skelAnimation = undefined;

    //returns the non tessilated verts. returns new memory
    getWorldSpaceVerts = function() {}

    //using the MeshKeyAnimation, update the current mesh (used by skeletal animation if present) to the current animationFrame
    this.Update = function(animationTime) {}
    this.GetAnimationLength = function() {}

    //used by skeletal animation classes
    this.GetVertsCt = function() { return vertsCt; }
    this.GetVertPosition = function(posRet, idx) {}
    this.GetOrientationMatrix = function(matrixRet) {}

    //used by Model to cache data for later fast lookup
    this.GetVertBoneWeightsSize = function(){ return vertBoneWeights.size(); }
    this.GetVertBoneWeights = function(i) { return vertBoneWeights[i]; }
    this.SetVertBoneWeights = function(i) { return vertBoneWeights[i]; }

    //transformation query functions
    this.GetPosition = function(pos) { Vect3_Copy(pos, origin); }
    this.GetScale = function(scaleOut) { Vect3_Copy(scaleOut, scale); }
    this.GetRotation = function(rotOut) { Vect3_Copy(rotOut, rotation); }
    this.GetWorldSpaceMesh = function(meshOut, meshOutCt) {}
    this.GetFaceVertsCt = function() { return faceVertsCt; }

    //color manipulation functions
    this.GetShaderName = function(shaderNameOut, shaderSceneOut){ shaderNameOut = this.shaderNames[0]; shaderSceneOut = this.sceneName; }

    //draw interface
    this.Draw = function(verts, normals, uvs) {}
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
                alert('QuadMesh: ' + this.meshName + ', error expected vertex normal when reading mesh file');
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
                        alert( 'QuadMesh: ' + this.meshName + ', face: ' +
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
                        alert('QuadMesh: ' + this.meshName + 'reading face: ' +
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
                        alert( 'QuadMesh: ' + this.meshName + 'reading face: ' +
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
        alert("Quadmesh: verts read mismatch\n");
    else if ( !(Math.abs(this.vertNormals.length - numVerts*3) < 0.01) )
        alert("Quadmesh: normals read mismatch\n");
    else
        this.isValid = true;

    //initialize the animation
    if( this.ipoAnimation.isValid || this.keyAnimation.isValid || this.skelAnimation.isValid ){
        this.isAnimated = true;
        this.Update(0.0);
    }
    else
       Matrix(ipoOriginMatrix, MatrixType.euler_transformation, this.scale, this.rotation, this.origin);


    alert('Quadmesh: ' + this.meshName + ', successfully read in faces: ' + this.faces.length + ', verts: ' + this.vertPositions.length/3 );

    //finalize the binding between the quadMesh and the skelAnimation
    //by setting the boneID's in the bone weights based on the bone positions
    //in the animation bone list
    for( var i in this.vertBoneWeights ){
        for( var boneName in this.vertBoneWeights[i] ){
            for( var k in this.skelAnimation.bones ){
                if(skelAnimation.bones[k].boneName == boneName){
                    this.vertBoneWeights[i][boneName].boneID = k;
                }
            }
        }
    }
}
