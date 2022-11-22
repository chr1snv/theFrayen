
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

//each node has a render buffer (vertex, uv, normal, textures and handles) that holds the data of
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
  
  this.parent  = parent; //link to the parent ( to allow traversing back up the tree )
  
  this.objects = []; //the objects local to the node
  
  this.minNode = null; //the next node that spans max = (maxCoord+minCoord)/2 and min = minCoord
  this.MaxNode = null; //
  
  //add an object to the node, if it is full - subdivide it and place objects in the sub nodes
  this.AddObject = function( object, addDepth=0 ) //addDepth is to keep track of if all axies have been checked for seperating the objects
  {
    if( this.objects.length < MaxTreeNodeObjects ){
        this.objects.push( object );
        return true;
    }
    
    //else, split the node until there are only MaxTreeNodeObjects per node
    //to keep object intersection / overlap test performace gains given by the binary oct tree
    var nextAxis = this.generateMinAndMaxNodes();
    
    //distribute the objects between the two new nodes
    //because each layer of the tree only splits one axis, and the nodes are orthogonal
    //checking which sub node the object goes in requires only one comparison
    // axis split by min and max node  -------minNode-------|minNodeMaxCoord maxNodeMinCoord | -------maxNode-------
    //the minNodeMin and maxNodeMax were already checked by this node (the parent of the min and max nodes)
    //so only need to check the extents of the object vs where the min and max nodes are split
    var numObjectsAddedToMinNode = 0;
    for( var i = 0; i < this.objects.length; ++i ){
        
        var objectAABB = this.objects[i].GetAABB(); //get the axis aligned bounding box for the object 
                                                    //( min and max points defining a box with faces (planes) aligned with the x y z axies
        objectAABBMinCoord = [ objectAABB[0], objectAABB[1], objectAABB[2] ]
        objectAABBMaxCoord = [ objectAABB[3], objectAABB[4], objectAABB[5] ]
        if( objectAABBMinCoord[nextAxis] < this.minNode.MaxCoord[nextAxis] &&
                                            this.minNode.MaxCoord[nextAxis] < objectAABBMaxCoord[nextAxis] ){
            //the object straddles the center and isn't fully in the min or max nodes
            //leave it in this node
        }else if( objectAABBMaxCoord[nextAxis] < this.minNode.MaxCoord[nextAxis] ){
            if( numObjectsAddedToMinNode >= MaxTreeNodeObjects - 1 && addDepth >= 2 )
                return false; //the objects were not successfuly seperated by the nextAxis splitting 
                              //(addDepth causes wait until all 3 (x y z) axis have been tried 
                              //before considering the objects non seperable
            this.minNode.AddObject( this.objects[i], addDepth += 1 );
            this.objects.splice( i,1 );
            numObjectsAddedToMinNode += 1;
        }else{
            if( numObjectsAddedToMinNode < 1 && i >= MaxTreeNodeObjects - 1 && addDepth >= 2 )
                return false; //objects were not successfuly seperated
                              //(break before adding to sub node or the subnode will again try to split)
            this.MaxNode.AddObject( this.objects[i], addDepth += 1 );
            this.objects.splice( i,1 );
        }
        
    }
    
    if( this.objects.length < MaxTreeNodeObjects )
        return true; //the node was successfuly subdivided and objects distributed to sub nodes such that
                     //all nodes have less than MaxTreeNodeObjects
  }
  
  /*
  //rasterize the objects in the node, depreciated because without raytracing
  //render cost scales with triangles, depth culling and physically based materials
  //transparency, reflectivity and shadowing each incur extra steps
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
        point[2] > this.minCoord[2] &&
        
        point[0] < this.MaxCoord[0] && 
        point[1] < this.MaxCoord[1] && 
        point[2] < this.MaxCoord[2] ){
        
        //the ray origin is in this node
        
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
        
        return this; //the origin is in this node and this node is a leaf node ( doesn't have a min or max child )
        //or it was in this node and this node isn't a leaf node but it wasn't in one of the leaf nodes ( shouldn't happen )
        
    }else{
    
        return null; //the point is outside this node, null will allow the calling instance of this function to try another node
        
    }
    
  }
  
  this.GetClosestIntersectingSurface = function( ray, rayLastTime, rayLastPoint ){
    //returns the intersection point, face index, model and object that the ray hit
    
    //traverses the binary oct tree, starting at a node checking objects in it for intersection with the ray
    //if there isn't an intersection or there are no objects, 
    //the ray origin is advanced to epsilon + where it intersects the wall of the current node and exits it
    //and the parent node is returned to checking for a node containing that point
    
    //if this is a leaf node check all objects in the node otherwise recurse until reaching a leaf node
    //if it misses all the objects in a leaf node, find the next leaf node it might intersect with objects in
    
    if( this.minNode == null && this.MaxNode == null )
    {
        //the node is a leaf node, check if any objects in it intersect with the ray
       
        for( var i = 0; i < this.objects.length; ++i ) //loop through the objects (if one isn't yet loaded, it is ignored)
        {
        
            //first check if the ray intersects the model's aabb
            var aabbPointAndTime = this.objects[i].GetAABB().RayIntersects( ray );
            if( aabbPointAndTime[0] != null ){
            
                //since the ray intersects the aabb, check all faces of the mesh if the ray intersects, if it does, return the
                //intersection point, ray distance, face index, model and object that the ray hit
                    
                if( this.objects[i].quadmesh != null ){
                    var intptDistFaceidx = 
                        this.objects[i].quadmesh.GetRayIntersection( ray );
                    if( intptDistFaceidx[0] != null ){
                        return [ intptDistFaceidx[0], intptDistFaceidx[1], intptDistFaceidx[2], i ];
                    }
                }
            
            }
            
        }
        
        //this was a leaf node and the ray didn't hit anything in it, find which wall it exits and node it enters
        var intersectionPointAndRayTime = this.AABB.RayIntersects( ray );
        //increase the wall intersection ray time by epsilon and generate new ray point
        //it should be inside the adjacent node
        var nextNodeRayPoint = ray.pointAtTime( intersectionPointAndRayTime[1] + rayStepEpsilon );
        var parentNode = this.parent;
        var nextTraceNode = this;
        var numTries = 3; //if the node is at the edge of the wo
        while( nextTraceNode == this ){
            nextTraceNode = this.FindRayOriginNode( ray, nextNodeRayPoint );
        }
        if( nextTraceNode != null )
            return nextTraceNode.GetClosestIntersectingSurface( 
                ray, intersectionPointAndRayTime[1], intersectionPointAndRayTime[0] );
        //otherwise the ray may have left the world parent node, fall through to
        //return null below
    }else{ 
        //this node has subnodes, decide which should be checked
        var node = this.FindTreeNodeForPoint( rayLastPoint );
        if( node != null && node != this )
            return node.GetClosestIntersectingSurface( ray, rayLastTime, rayLastPoint );
    }
    
    return null; //all nodes along the ray path have been checked and didn't
    //have an intersection with the ray
    
  }
  
  //to be called when the node is filled with the max number of objects
  //(decided on for performance of number of object tests vs overhead of the depth of the tree)
  this.generateMinAndMaxNodes = function(){

    var nextAxis = (this.axis + 1) % 3; //modulo wrap around from (2)z axis back to x
    var minminCoord = []; //fill these depending on the axis being subdivided
    var minMaxCoord = [];
    var MaxminCoord = [];
    var MaxMaxCoord = [];
    
    for(var i = 0; i < 3; ++i){ //(x y z) for loop to avoid seperate if statement for x y and z axies
    
      minminCoord.push( this.minCoord[i] );
      if( nextAxis == i){ //if this is axis (x y or z) that the minAndMax nodes split then use the mid point
        var midPt = this.midCoord[i];
        minMaxCoord.push( midPt );
        MaxminCoord.push( midPt );
      }else{ //else since only one axis is being split
        minMaxCoord.push( this.MaxCoord[i] );
        MaxminCoord.push( this.minCoord[i] );
      }
      MaxMaxCoord.push( this.MaxCoord[i] );
    }
    //now that the extents of the nodes have been found create them
    this.minNode = new TreeNode(nextAxis, minminCoord, minMaxCoord, this);   
    this.MaxNode = new TreeNode(nextAxis, MaxminCoord, MaxMaxCoord, this);
    return nextAxis;
  }
  
}

function GenerateNodeCorners(node)
{
    //the 8 corners of the node cube, 4 bottom corners and 4 top corners
   return [
     [ node.minCoord[0], node.minCoord[1], node.minCoord[2] ],  //left back bottom
     [ node.MaxCoord[0], node.minCoord[1], node.minCoord[2] ],
     [ node.minCoord[0], node.MaxCoord[1], node.minCoord[2] ],
     [ node.MaxCoord[0], node.MaxCoord[1], node.minCoord[2] ],
   
     [ node.minCoord[0], node.minCoord[1], node.MaxCoord[2] ],  //top
     [ node.MaxCoord[0], node.minCoord[1], node.MaxCoord[2] ],
     [ node.minCoord[0], node.MaxCoord[1], node.MaxCoord[2] ],
     [ node.MaxCoord[0], node.MaxCoord[1], node.MaxCoord[2] ]  ];
}


//returns true if the 8 corners of the node are within the frustum
function OctTree_NumNodeCornersInFrustum(nodeCorners, frustum)
{
   
   var numPointsInFrustum = 0;
   
   for( var i = 0; i < nodeCorners.length; ++i )
   {
      if( frustum.PointInFrustum( nodeCorners[i] ) )
         numPointsInFrustum += 1;
   }
   //a corner of the cube is in the frustum return it
   return numPointsInFrustum;
   
}


function pointIsInsideAABB( aabb, point ){

    if( aabb.minCoord[0] < point[0] && point[0] < aabb.MaxCoord[0] &&
        aabb.minCoord[1] < point[1] && point[1] < aabb.MaxCoord[1] &&
        aabb.minCoord[2] < point[2] && point[2] < aabb.MaxCoord[2] )
        return true;
    return false;
    
}

//check all 3 xyz axies bounds if the two bounding boxes have at least one corner inside eachother
//if they overlap in one axis, that means they are in front/back, left/right or top/bottom of eachother
//need xyz overlap for volume intersection test
function OctTree_AABBsIntersect( aabb1, aabb2 ) //frustum is aabb2
{
    var numOverlappingAxies = 0;
    for( var i = 0; i < 3; ++i ){ //check if aabb1 is inside aabb2
        if( ( aabb2.minCoord[i] < aabb1.minCoord[i] && aabb1.minCoord[i] < aabb2.MaxCoord[i] ) ||
            ( aabb2.minCoord[i] < aabb1.MaxCoord[i] && aabb1.MaxCoord[i] < aabb2.MaxCoord[i] ) )
            numOverlappingAxies += 1;
    }
    if( numOverlappingAxies >= 3 )
        return true;  //part of aabb1 is inside aabb2
    numOverlappingAxies = 0;
    for( var i = 0; i < 3; ++i ){ //check if aabb2 is inside aabb1
        if( ( aabb1.minCoord[i] < aabb2.minCoord[i] && aabb2.minCoord[i] < aabb1.MaxCoord[i] ) ||
            ( aabb1.minCoord[i] < aabb2.MaxCoord[i] && aabb2.MaxCoord[i] < aabb1.MaxCoord[i] ) )
            numOverlappingAxies += 1;
    }
    if( numOverlappingAxies >= 3 )
        return true; //part of aabb2 is inside aabb1
        
    return false; //a corner of aabb1 is not inside aabb2 and a corner of aabb2 is not inside aabb1
}

//find the minimal set of oct tree leaf nodes that are inside or overlap the frustum
//starting with the root, check if the volume of the node is inside the frustum AABB
//  if it is inside return the entire node
//  if it is outside don't return it
//  if it partially overlaps
//     if it is a leaf node return it, otherwise
//     for each sub node
//        if it partially or fully is inside repeat the above
//        ignore fully outside nodes
function OctTree_GetNodesThatOverlapOrAreInsideFrustum(node, frustum)
{   
   var overlap = OctTree_AABBsIntersect( node, frustum );
   
   if( overlap ){
       //the aabb overlaps
       
       //check if there are sub nodes and one can be excluded
       if( node.minNode == null && node.MaxNode == null )
       {
         //there are no subnodes, so this is a leaf node of the binary oct tree 
         //(reached the bottom of the spatial division recursion)
         //return this node even though its area outside the frustum may be larger than the frustum
         return [node];
       }
   
       //the node isn't completely overlapping the frustum if one of it
       //check if any of it's sub nodes ( or sub sub nodes etc ) can be excluded from the
       //draw / update to improve performance
       var returnNodes = [];
       overlap = OctTree_AABBsIntersect( node.minNode, frustum );
       if( overlap ){
         var overlapNodes = OctTree_GetNodesThatOverlapOrAreInsideFrustum( node.minNode, frustum );
         for( var i = 0; i < overlapNodes.length; ++i )
           returnNodes.push( overlapNodes[i] );
       }
       
       overlap = OctTree_AABBsIntersect( node.MaxNode, frustum );
       if( overlap ){
         var overlapNodes = OctTree_GetNodesThatOverlapOrAreInsideFrustum( node.MaxNode, frustum );
         for( var i = 0; i < overlapNodes.length; ++i )
           returnNodes.push( overlapNodes[i] );
       }
       
       return returnNodes;
  }
  
  //otherwise the frustum is completely outside the node
  return [];
}




