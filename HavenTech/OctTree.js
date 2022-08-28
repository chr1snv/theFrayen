
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

var MaxTreeNodeObjects = 5;

function TreeNode(axis, minCoord, MaxCoord, parent){

  this.axis = axis; //the axis that the node splits ( (0)x , (1)y , or (2)z )
  this.minCoord = minCoord; //the minimum corner that the node covers
  this.MaxCoord = MaxCoord; //the Maximum corner that the node covers
  
  this.parent = parent; //link to the parent ( to allow traversing back up the tree )
  
  this.objects = []; //the objects local to the node
  
  this.minNode = null; //the next node that spans max = (maxCoord+minCoord)/2 and min = minCoord
  this.MaxNode = null; //
  
  this.nodeQueue = "";
  
  //add an object to the node, if it is full subdivide it and place objects in the sub nodes
  this.AddObject = function(object, addDepth=0){ //addDepth is to keep track of if all axis have been checked for seperating the objects 
    if(this.objects.length < MaxTreeNodeObjects){
        this.objects.push(object);
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
    for(var i = 0; i < this.objects.length; ++i){
        
        var objectBounds = this.objects[i].GetAABB( function( minMaxAABBPoints ){
        
        } ); //get the axis aligned bounding box for the object 
                                                      //( min and max points defining a box with faces (planes) aligned with the x y z axies
        if( objectBounds.minCoord[nextAxis] < this.minNode.MaxCoord[nextAxis] &&
                                              this.minNode.MaxCoord[nextAxis] < objectBounds.MaxCoord[nextAxis] ){
            //the object straddles the center and isn't fully in the min or max nodes
            //leave it in this node
        }else if( objectBounds.MaxCoord[nextAxis] < this.minNode.MaxCoord[nextAxis] ){
            if( numObjectsAddedToMinNode >= MaxTreeNodeObjects - 1 && addDepth >= 2)
                return false; //the objects were not successfuly seperated by the nextAxis splitting 
                              //(addDepth causes wait until all 3 (x y z) axis have been tried 
                              //before considering the objects non seperable
            this.minNode.AddObject(this.objects[i], addDepth += 1);
            this.objects.splice(i,1);
            numObjectsAddedToMinNode += 1;
        }else{
            if( numObjectsAddedToMinNode < 1 && i >= MaxTreeNodeObjects - 1 && addDepth >= 2)
                return false; //objects were not successfuly seperated
                              //(break before adding to sub node or the subnode will again try to split)
            this.MaxNode.AddObject(this.objects[i], addDepth += 1);
            this.objects.splice(i,1);
        }
        
    }
    
    if(this.objects.length < MaxTreeNodeObjects)
        return true; //the node was successfuly subdivided and objects distributed to sub nodes such that
                    //all nodes have less than MaxTreeNodeObjects
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
        var midPt = (this.minCoord[i] + this.MaxCoord[i]) / 2;
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
     [ node.minCoord[0], node.minCoord[1], node.minCoord[2] ],
     [ node.MaxCoord[0], node.minCoord[1], node.minCoord[2] ],
     [ node.minCoord[0], node.MaxCoord[1], node.minCoord[2] ],
     [ node.MaxCoord[0], node.MaxCoord[1], node.minCoord[2] ],
   
     [ node.minCoord[0], node.minCoord[1], node.minCoord[2] ],
     [ node.MaxCoord[0], node.minCoord[1], node.minCoord[2] ],
     [ node.minCoord[0], node.MaxCoord[1], node.minCoord[2] ],
     [ node.MaxCoord[0], node.MaxCoord[1], node.minCoord[2] ]  ];
}


//returns true if the 8 corners of the node are within the frustum
function OctTree_NumNodeCornersInFrustum(nodeCorners, frustum)
{
   
   var numPointsInFrustum = 0;
   
   for( var i = 0; i < nodeCorners.length; ++i )
    if( frustum.PointInFrustum( cubeCorners[i] ) )
      numPointsInFrustum += 1;
   
   //a corner of the cube is in the frustum return it
   return numPointsInFrustum;
   
}

//either one of the point corners of the cube will be inside the frustum
//or one of the frustum corners will be inside of the cube
//if there is an overlap between the two

//tries to efficently return a minimal set of nodes the (camera) frustum overlaps to
//get only the objects that need to be drawn
function OctTree_GetNodesInFrustum(rootNode, frustum){
   //the root node obviously would overlap the camera frustum
   //but want to get the minimal set of nodes ( so if there are subnodes and one of them doesn't overlap ignore it
   
   var nodeCorners = GenerateNodeCorners(rootNode);
   
   var numCornersInFrustum = OctTree_NumNodeCornersInFrustum(rootNode, frustum);
   
   //if the node is completely within the frustum return it
   if( numCornersInFrustum >= 8 )
     return rootNode;
   
   //else
   if( rootNode.minNode == null && rootNode.maxNode == null ){
     //there are no subnodes, so return the root node even though it may be larger than the frustum 
     return rootNode;
   }
   
   //else there are subnodes, if one of them is fully outside of the frustum don't return it
   var minNodeOverlaps = OctTree_NodeAndFrustumOverlap( rootNode.minNode, frustum );
   var maxNodeOverlaps = OctTree_NodeAndFrustumOverlap( rootNode.maxNode, frustum );
   if( minNodeOverlaps && maxNodeOverlaps )
     return rootNode;
   if( minNodeOverlaps )
     return this.minNode;
   if( maxNodeOverlaps )
     return this.maxNode;
}

//a sparse oct tree (3d xyz subdivided cubes) representing the world
//to accelerate physics and raycasting / tracing in the scene
//possibly also for signed distance voxels and other space filling objects
//i.e. spheres (elipsoids), cylinders, cones, nbody, mass springs,
// fluid elements, emitters, attractors, lights, rays, cameras, lenses, etc
//so that the number of intersection tests between objects can be minimized
//(avoiding testing every object against every other object)
//by only considering the portion of the tree (and theirfore world space) that
//an object occupies
function OctTree(){

    this.subCubes = [null, null,  //(0)0,0,0   (1)0,0,1
                     null, null,  //(2)0,1,0   (3)0,1,1
                     
                     null, null,  //(4)1,0,0   (5)1,0,1
                     null, null]; //(6)1,1,0   (7)1,1,1
                     //index is = x * 4 + y * 2 + z
                     
    this.rootNode =  new TreeNode('x', null); //the root of the tree
                     
    this.addObject =
    function( xMin, xMax, yMin, yMax, zMin, zMax, obj ){
      //find the subCubes that the object occupies
      var occupiedSubCubes = [];
      if( xMin > 0 ){ // x greater than zero (4,5,6,7)
         if( yMin > 0 ){ //y greater than zero (6,7)
           if( zMin > 0 ){
             occupiedSubCubes.push( this.subCubes[7] );
           }else if( zMax < 0 ){
             occupiedSubCubes.push( this.subCubes[6] );
           }else{
             occupiedSubCubes.push( this.subCubes[7] );
             occupiedSubCubes.push( this.subCubes[6] );
           }
         }else if( yMax < 0 ){ // y less than zero (4,5)
            if( zMin > 0){
             occupiedSubCubes.push( this.subCubes[5] );
           }else if( zMax < 0 ){
             occupiedSubCubes.push( this.subCubes[4] );
           }else{
             occupiedSubCubes.push( this.subCubes[5] );
             occupiedSubCubes.push( this.subCubes[4] );
           }
         }else{ //y spans 0 (4,5,6,7)
           if( zMin > 0 ){
             occupiedSubCubes.push( this.subCubes[7] );
             occupiedSubCubes.push( this.subCubes[5] );
           }else if( zMax < 0 ){
             occupiedSubCubes.push( this.subCubes[6] );
             occupiedSubCubes.push( this.subCubes[4] );
           }else{
             occupiedSubCubes.push( this.subCubes[7] );
             occupiedSubCubes.push( this.subCubes[5] );
             occupiedSubCubes.push( this.subCubes[6] );
             occupiedSubCubes.push( this.subCubes[4] );
           }
         }
         
      }else if( xMax < 0 ){ // x greater than zero (0,1,2,3)
        if( yMin > 0 ){ //y greater than zero (2,3)
           if( zMin > 0 ){
             occupiedSubCubes.push( this.subCubes[3] );
           }else if( zMax < 0 ){
             occupiedSubCubes.push( this.subCubes[2] );
           }else{
             occupiedSubCubes.push( this.subCubes[3] );
             occupiedSubCubes.push( this.subCubes[2] );
           }
         }else if( yMax < 0 ){ // y less than zero (0,1)
            if( zMin > 0 ){
             occupiedSubCubes.push( this.subCubes[1] );
           }else if( zMax < 0 ){
             occupiedSubCubes.push( this.subCubes[0] );
           }else{
             occupiedSubCubes.push( this.subCubes[1] );
             occupiedSubCubes.push( this.subCubes[0] );
           }
         }else{ //y spans 0 (0,1,2,3)
           if( zMin > 0 ){
             occupiedSubCubes.push( this.subCubes[3] );
             occupiedSubCubes.push( this.subCubes[1] );
           }else if( zMax < 0 ){
             occupiedSubCubes.push( this.subCubes[2] );
             occupiedSubCubes.push( this.subCubes[0] );
           }else{
             occupiedSubCubes.push( this.subCubes[3] );
             occupiedSubCubes.push( this.subCubes[1] );
             occupiedSubCubes.push( this.subCubes[2] );
             occupiedSubCubes.push( this.subCubes[0] );
           }
         }
         
      }else{ //x spans 0 (0,1,2,3,4,5,6,7)
        if( yMin > 0 ){ //y greater than zero (2,3,6,7)
           if( zMin > 0 ){
             occupiedSubCubes.push( this.subCubes[7] );
             occupiedSubCubes.push( this.subCubes[3] );
           }else if( zMax < 0 ){
             occupiedSubCubes.push( this.subCubes[6] );
             occupiedSubCubes.push( this.subCubes[2] );
           }else{
             occupiedSubCubes.push( this.subCubes[7] );
             occupiedSubCubes.push( this.subCubes[3] );
             occupiedSubCubes.push( this.subCubes[6] );
             occupiedSubCubes.push( this.subCubes[2] );
           }
         }else if( yMax < 0 ){ // y less than zero (0,1,4,5)
            if( zMin > 0){
             occupiedSubCubes.push( this.subCubes[5] );
             occupiedSubCubes.push( this.subCubes[1] );
           }else if( zMax < 0 ){
             occupiedSubCubes.push( this.subCubes[4] );
             occupiedSubCubes.push( this.subCubes[0] );
           }else{
             occupiedSubCubes.push( this.subCubes[5] );
             occupiedSubCubes.push( this.subCubes[1] );
             occupiedSubCubes.push( this.subCubes[4] );
             occupiedSubCubes.push( this.subCubes[0] );
           }
         }else{ //y spans 0 (0,1,2,3,4,5,6,7)
           if( zMin > 0 ){
             occupiedSubCubes.push( this.subCubes[7] );
             occupiedSubCubes.push( this.subCubes[5] );
             occupiedSubCubes.push( this.subCubes[3] );
             occupiedSubCubes.push( this.subCubes[1] );
           }else if( zMax < 0 ){
             occupiedSubCubes.push( this.subCubes[6] );
             occupiedSubCubes.push( this.subCubes[4] );
             occupiedSubCubes.push( this.subCubes[2] );
             occupiedSubCubes.push( this.subCubes[0] );
           }else{ //x spans, y spans, and z spans
             //need to either split the object or have it as a object local to the cube
             occupiedSubCubes.push( this.subCubes[7] );
             occupiedSubCubes.push( this.subCubes[6] );
             occupiedSubCubes.push( this.subCubes[5] );
             occupiedSubCubes.push( this.subCubes[4] );
             occupiedSubCubes.push( this.subCubes[3] );
             occupiedSubCubes.push( this.subCubes[2] );
             occupiedSubCubes.push( this.subCubes[1] );
             occupiedSubCubes.push( this.subCubes[0] );
           }
         }
      }
    }

}
