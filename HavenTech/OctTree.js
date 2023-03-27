
//when tracing rays check if the cross the planes defined in the if statement tree
//then test for intersection with the 


//the idea behind this is a mix between a binary space partioning tree and
//an oct tree
//when writing the if statement branches to decide which sub nodes of the oct tree
//an object should be added to I realized that there would be cases where the object
//might be in multiple sub nodes. the easiest way to handle it might be to use
//a binary (at each level only split one axis) partition tree instead because
//then with only two tests ( min and max of one axis of the object) it can
//be determined if the object should be in the current node, or the min or max sub node
//also when objects move (are dynamically updated) balancing a binary tree will
//simplify the logic
//so this is an orthogonal binary space partition tree, each level splits only one axis
//and each subsequent level splits the next axis in the order (x, y , z , x , y ... etc)

//each node has a render buffer (vertex, uv, normal, textures and handles) 
//that holds the data of
//the objects in the node, updated when requested by the frame buffer manager to draw

var MaxTreeNodeObjects = 5;

function TreeNode( axis, minCoord, MaxCoord, parent ){

  this.axis = axis; //the axis that the node splits ( (0)x , (1)y , or (2)z )
  this.minCoord = minCoord; //the minimum corner that the node covers
  this.MaxCoord = MaxCoord; //the Maximum corner that the node covers
  this.midCoord = Vect3_CopyNew( this.minCoord );
  Vect3_Add( this.midCoord, this.MaxCoord );
  Vect3_MultiplyScalar( this.midCoord, 0.5 ); //the center coordinate
  
  this.AABB = new AABB( this.minCoord, this.MaxCoord );
  
  this.parent  = parent; 
  //link to the parent ( to allow traversing back up the tree )
  
  this.objects = [];  //the axis positionally sorted objects
  this.objectDictionary = {}; //the objects local to the node
  
  this.minNode = null; 
  //the next node that spans max = (maxCoord+minCoord)/2 and min = minCoord
  this.MaxNode = null; //
  
  //idealy the oct treebounds are 32-64bit integers
  //and every node / sub division has a fill/occupancy type
  //i.e vaccum, air, water, elemental material, etc
  //the node also may have an object parent, and polygonal bounds
  //the slope of the surface of a voxel is determined 
  //by the triangle it is part of
  //vox tris - voxels are good but they don't allow for arbitrary 
  //edge directions / positions
  //so have the triangle outer mesh inside be filled with voxels
  //and in each voxel determine if it is inside or outside an object
  //by starting at the corners of the object aabb and filling to assign outside 
  //or inside object status
  
  //alternatively use a binary space partition tree, and choose random dividing
  //plane directions then in objects choose triangle edges and verticies on
  //opposite sides of the model to subdivide the interior space
  
  //having object details at low parts of the tree and summaries / objects
  //at higher up larger nodes works if no objects span higher node boundries
  //when small objects span large boundries it causes their parent point to
  //go higher up in  the tree
  //the ideal solution is maybe multiple oct trees
  //static part of the world objects abide by a fixed division oct tree
  //and dynamic moving objects have a local oct tree that is checked against the
  //world oct tree
  //but it still ends up having to be in one structure to do comparision and rendering
  //so the best is having one structure and mapping things to it as best as possible
  //voxels either have full occupancy or a point and normal
  //(portion of a triangle mesh inside) (might be an edge between triangles)
  //(similar to a surfel https://en.wikipedia.org/wiki/Surfel) but more like a 
  //higher resolution version of marching cubes
  //https://en.wikipedia.org/wiki/Marching_cubes
  //by allowing more detailed resolution placement of voxel surfaces
  //it can appear like a polygonal mesh, but be performant
  
  //update all objects below this node in the oct tree
  //later may add count of nodes requested/updated to signify completion
  this.Update = function( time ){
    var obDict = this.objectDictionary;
    var obKeys = Object.keys(obDict);
    for( var i = 0; i < obKeys.length; ++i ) //loop through the objects
        obDict[ obKeys[i] ].Update(time);
        
    //recursevly update sub nodes
    //this may cause calls to other computers so may need to synchronize
    //to ensure nodes are updated before rendering
    if( this.minNode != null )
        this.minNode.Update( time );
     if( this.MaxNode != null )
        this.MaxNode.Update( time );
  }
  
  this.addToThisNode = function( object )
  {
        //insertion sort the objects
        var lessThanIndex = 0;
        for( var i = 0; i < this.objects.length; ++i){
            if( this.objects[i].GetAABB().center[this.axis] < 
                object.GetAABB().center[this.axis] )
                lessThanIndex = i;
            else
                break; //because less to greater sorted, once a greater than
                //object is found, the rest will be greater
        }
        this.objects.splice(lessThanIndex+1, 0, object);
        
        //keep a dictionary for quickly checking if an object is present
        this.objectDictionary[ object.uuid ] = object;
        return true;
  }
  
  //add an object to the node, if it is full - subdivide it 
  //and place objects in the sub nodes
  this.AddObject = function( object, addDepth=0 ) 
  //addDepth is to keep track of if all axies 
  //have been checked for seperating the objects
  {
        
    //fill nodes until they are full (prevent unessecary subdividing)
    //but also don't add objects if they are inside objects already in the world
    //(if something is inside an object it should be parented to it)
    if( this.objects.length < MaxTreeNodeObjects ){
        return this.addToThisNode(object);
    }
    //only leaf nodes should contain objects because that's where rays
    //check for intersection
    
    //else 
    //split the node until there are only MaxTreeNodeObjects per node
    //to keep object intersection / overlap test performace gains 
    //given by the binary oct tree
    var nextAxisAndNumMinObjs = this.generateMinAndMaxNodes(this.objects);
    var nextAxis = nextAxisAndNumMinObjs[0];
    var numMinObjs = nextAxisAndNumMinObjs[1];

    //divide the objects between the min and max nodes
    //subdivide leaf node spanning objects, parenting the subdivided 
    //parts to the object
    //distribute the objects between the two new nodes
    //because each layer of the tree only splits one axis, 
    //and the nodes are orthogonal
    //checking which sub node the object goes in requires only one comparison
    // axis split by min and max node
    //  -------minNode-------|minNodeMaxCoord 
    //                        maxNodeMinCoord | -------maxNode-------
    //the minNodeMin and maxNodeMax were already checked
    //by this node (the parent of the min and max nodes)
    //so only need to check the extents of the object
    //vs where the min and max nodes are split
    addDepth = addDepth + 1;
    var numObjectsAddedToMinNode = 0;
    for( var i = 0; i < this.objects.length; ++i ){
        
        if( i < numMinObjs )
            this.minNode.AddObject( this.objects[i], addDepth );
        else
            this.MaxNode.AddObject( this.objects[i], addDepth );
    }
    this.objects = [];
    this.objectDictionary = {};
    
    if( this.objects.length < MaxTreeNodeObjects )
        return this.addToThisNode(object); 
        //the node was successfuly subdivided and objects 
        //distributed to sub nodes such that
        //all nodes have less than MaxTreeNodeObjects
        //now that this node has room for the new object add it
    return false;
  }
  
  /*
  //rasterize the objects in the node, depreciated because without raytracing
  //render cost scales with triangles, depth culling and physically based materials
  //transparency, reflectivity and shadowing each incur extra steps
  //rasterization is faster and less noisy for low poly and overdraw scenes
  //though when attempting to reach photo realisim, raytracing with de noising
  //samples the world less (only dependent on desired generated image quality)
  this.RasterDraw = function( camera, cameraCenter ){
    //select a level of detail baised on the distance from the camera
    var distToCam = 0;
    
    Vect3_Distance( distToCam, cameraCenter, this.midCoord );
    
    for( var i = 0; i < this.objects.length; ++i ){
            //this.objects[i].Draw(  
    }
  
  }
  */
  
  
  this.FindTreeNodeForPoint = function( point )
  {
    //find which node the ray origin is in
    //to start tracing though node walls and objects from the ray's starting point
    
    if( point[0] > this.minCoord[0] && 
        point[1] > this.minCoord[1] && 
        point[2] > this.minCoord[2] && //each axis of the point is greater than
                                       //those of the min coord
        point[0] < this.MaxCoord[0] && 
        point[1] < this.MaxCoord[1] && 
        point[2] < this.MaxCoord[2] ){ //each axis of the point is also 
                                       //less than those of the max coord
        
        //theirfore the ray origin is in this node
        
        if( this.minNode != null ){ 
            //check if it is in the min node or one of the min node's subnodes
            var node = this.minNode.FindTreeNodeForPoint( point );
            if( node != null )
                return node;
        }
        if( this.MaxNode != null ){ 
            //check if it is in the max node or one of the max node's subnodes
            var node = this.MaxNode.FindTreeNodeForPoint( point );
            if( node != null )
                return node;
        }
        
        return this; //the origin is in this node and this node 
        //is a leaf node ( doesn't have a min or max child )
        //or it was in this node and this node isn't a leaf node 
        //but it wasn't in one of the leaf nodes ( shouldn't happen )
        
    }else{
    
        return null; //the point is outside this node, null will allow 
        //the calling instance of this function to try another node
        
    }
    
  }
  
  this.GetClosestIntersectingSurface = function( ray, 
                                            rayLastTime, nodeEntrancePoint ){
    //returns the intersection point, face index, 
    //model and object that the ray hit
    
    //traverses the binary oct tree, starting at a node 
    //checking objects in each node traversed for intersection with the ray
    //if no object intersections occur, 
    //the ray origin is advanced to the wall of the node it exits
    //and traversal returns to the parent node to check it's children for
    //the spatially adjacent node
    
    //if this node contains objects check all objects in the node
    //with aabb's overlapping the ray's path through the node 
    //otherwise recurse until reaching a leaf node
    //if it misses all the objects in a leaf node, 
    //find the next leaf node it might intersect with objects in
    
    
    //check all nodes below this node if the point is in a sub node for
    //the starting point to trace from
    var lastPointNodeIn = this.FindTreeNodeForPoint( nodeEntrancePoint );
    if( lastPointNodeIn == null )
        return null;
    
    //find which wall of this node the ray exits and which node it enters
    
    //create a new ray starting in this node to avoid getting intersection
    //with the entrance wall again
    var toNextNodeRay = new Ray( nodeEntrancePoint, ray.norm );
    //DPrintf( "toNextNodeRay origin " + toNextNodeRay.origin + " norm " + toNextNodeRay.norm );
    var nodeExitPointAndRayTime = lastPointNodeIn.AABB.RayIntersects( toNextNodeRay );
    //increaseing the wall intersection ray time by epsilon 
    //(is done in next GetClosestIntersecting surface call)
    //generating a new ray point (which is inside the adjacent node)
    if( nodeExitPointAndRayTime == null ){ 
        //somehow the ray started outside of this node and didn't intersect
        //with it
        
        //DPrintf( "aabb intersects " + this.AABB.RayIntersects( toNextNodeRay ) );
        return null; //ray has exited the entire oct tree
    }
    
    var minRayCoord = Math.min( nodeEntrancePoint[this.axis], 
                                nodeExitPointAndRayTime[0][this.axis] );
    var maxRayCoord = Math.max( nodeEntrancePoint[this.axis], 
                                nodeExitPointAndRayTime[0][this.axis] );
    
    //first check if any objects in this node intersect with the ray
    for( var i = 0; i < this.objects.length; ++i ) 
    //loop through the objects (if one isn't yet loaded, it is ignored)
    {
        if( ray.lastNode != null ) //don't recheck if checked last node
            if( ray.lastNode.objectDictionary[ this.objects[i].uuid ] != null )
                continue; //if already checked skip it
        //check if the ray intersects the object
        var intersectionResult = this.objects[i].RayIntersect( ray );
        if( intersectionResult != null ){ //if it did intersect
            return intersectionResult; //return the result from the object
        }
    }
        
    //the ray didn't hit anything in this node 
    
    //get a point along the ray at the next intersection point + epsilon
    var nextNodeRayTime = nodeExitPointAndRayTime[1] + rayStepEpsilon;
    var nextNodeRayPoint = toNextNodeRay.PointAtTime( nextNodeRayTime );
    var parentNode = this;
    var nextTraceNode = null;
    while( nextTraceNode == null ){ //next node has not yet been found
        //DPrintf( "nextTraceNode search Parent: " + parentNode.midCoord + 
        //         " nextRayPoint " + nextNodeRayPoint );
        nextTraceNode = parentNode.FindTreeNodeForPoint( nextNodeRayPoint );
        if( nextTraceNode == null ){ //go up the hierarchy and try again
            parentNode = parentNode.parent; //up one level
            if( parentNode == null ){
                //DPrintf( "nextTraceNode parentNode == null" );
                return null; //the ray is outside the root node world space
            }
        }
    }
    if( nextTraceNode != null ){
        //DPrintf( "found next trace node " + nextTraceNode.midCoord + 
        //         " this mid: " + this.midCoord + 
        //         " rayNorm " + ray.norm + 
        //         " nextNodeRayPoint " + nextNodeRayPoint );
        ray.lastNode = this;
        return nextTraceNode.GetClosestIntersectingSurface( 
            ray, nodeExitPointAndRayTime[1] + rayStepEpsilon, 
            nextNodeRayPoint );
    }
    //otherwise the ray has left the world parent node
    //this shouldn't be reached though because of above if parent node == null
    //return null in while loop
    
    return null; //all nodes along the ray path have been checked and didn't
    //have an intersection with the ray
    
  }
  
  //to be called when the node is filled with the max number of objects
  //(decided on for performance of number of object tests vs 
  //overhead of the depth of the tree)
  //should this try to put an equal number of objects in each sub node?
  //(and divide at aabb boundries)
  //yes, because otherwise objects that straddle a node boundry are put in
  //both the min and max nodes and it doesn't reduce the number of objects
  //in a node (leading to infinite attempts to split the node to reach the
  //max object count)
  this.generateMinAndMaxNodes = function(objects){

    var nextAxis = (this.axis + 1) % 3; 
    //modulo wrap around from (2)z axis back to x
    
    if( this.minNode != null ) //if already subdivided dont generate new
        return nextAxis;       //nodes and abandond previosly generated ones
    
    var minminCoord = []; //fill these depending on the axis being subdivided
    var minMaxCoord = [];
    var MaxminCoord = [];
    var MaxMaxCoord = [];
    
    //generate the min and max corners of the nodes
    for(var i = 0; i < 3; ++i){ 
        //(x y z) for loop to avoid seperate if statement for x y and z axies
    
      minminCoord.push( this.minCoord[i] ); //least is least of this node
      if( nextAxis == i){ //if this is axis (x y or z) that the 
        //minAndMax nodes split then use the mid point (could try to put even
        var midPt = this.midCoord[i]; //number of objects in min and max)
        var midOfObjs2And3 = ( objects[2].GetAABB().maxCoord[i] + objects[2].GetAABB().minCoord[i] ) / 2;
        var midOfObjs1And2 = ( objects[1].GetAABB().maxCoord[i] + objects[2].GetAABB().minCoord[i] ) / 2;
        if( Math.abs(midOfObjs2And3 - midPt) < Math.abs(midOfObjs1And2 - midPt) )
            midPt = midOfObjs2And3;
        else
            midPt = midOfObjs1And2;
        //the closest between object midpoint to the middle of the node is selected
        minMaxCoord.push( midPt );
        MaxminCoord.push( midPt );
      }else{ //for other axies use full range of this node  
        minMaxCoord.push( this.MaxCoord[i] ); //the other axies span
        MaxminCoord.push( this.minCoord[i] ); //the full extent of this node
      }
      MaxMaxCoord.push( this.MaxCoord[i] ); //max is max of this node
    }
    //now that the extents of the nodes have been found create them
    this.minNode = new TreeNode(nextAxis, minminCoord, minMaxCoord, this);   
    this.MaxNode = new TreeNode(nextAxis, MaxminCoord, MaxMaxCoord, this);
    return nextAxis;
  }
  
}


