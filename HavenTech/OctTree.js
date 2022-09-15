
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

function TreeNode( axis, minCoord, MaxCoord, parent ){

  this.axis = axis; //the axis that the node splits ( (0)x , (1)y , or (2)z )
  this.minCoord = minCoord; //the minimum corner that the node covers
  this.MaxCoord = MaxCoord; //the Maximum corner that the node covers
  this.midCoord = Vect3_CopyNew( this.minCoord );
  Vect3_Add( this.midCoord, this.MaxCoord );
  Vect3_MultiplyScalar( this.midCoord, 0.5 );
  
  this.parent  = parent; //link to the parent ( to allow traversing back up the tree )
  
  this.objects = []; //the objects local to the node
  
  this.minNode = null; //the next node that spans max = (maxCoord+minCoord)/2 and min = minCoord
  this.MaxNode = null; //
  
  //add an object to the node, if it is full subdivide it and place objects in the sub nodes
  this.AddObject = function( object, addDepth=0 ) //addDepth is to keep track of if all axis have been checked for seperating the objects
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

//check all 3 axies xyz if the two bounding boxes overlap
//checking one axis is not enough because if tbey only overlap in one axis that could mean they are infront or in back, side by side or on top of eachother
//but only if they are infront / inback, side by side and on top of eachother then they are intersecting/overlapping
function OctTree_AABBoverlapOrInside( aabb1, aabb2 ) //frustum is aabb2
{
    //the goal is, given a binary oct tree node aabb, and a frustum (or active region) determine if the oct tree aabb is:
    
    //partially /fully inside the frustum (in which case the aabb node should be drawn / updated )
    //if the frustum is completely inside of it (then parts of the binary oct tree node should try to be excluded to improve update / drawing performance)
    
    var numOverlappingAxies = 0;
    
    var numCoordsAABB1InsideAABB2 = 0;
    
    //x y z axie checks
    for( var i = 0; i < 3; ++i ){
        var minOrMaxCoordInside = false;
        if(  aabb2.minCoord[i] < aabb1.minCoord[i] && aabb1.minCoord[i] < aabb2.MaxCoord[i] ){ //xaxis aabb1 inside aabb2 (aabb inside frustum)
            numCoordsAABB1InsideAABB2 += 1;
            minOrMaxCoordInside = true;
        }
        if( aabb2.minCoord[i] < aabb1.MaxCoord[i] && aabb1.MaxCoord[i] < aabb2.MaxCoord[i] ){
            numCoordsAABB1InsideAABB2 += 1;
            minOrMaxCoordInside = true;
        }
        
        if( minOrMaxCoordInside )
            numOverlappingAxies += 1;
        
    }
      
    if( numOverlappingAxies >= 3 )
        return true;
        
    return [ numCoordsAABB1InsideAABB2 >= 6, numOverlappingAxies >= 3 ];
}

//find the minimal set of oct tree leaf nodes that are inside, or more than half inside the frustum (or frustum AABB)
//starting with the root, check if the volume of the node is inside the frustum AABB
//  if it is inside return the entire node
//if it is outside don't return it
//if it partially overlaps, ignore the parts that are entirely outside
//recursevely check the parts that partially overlap are there parts entirely inside? return those
//if there are no sub parts and it partially overlaps, return it, otherwise if there are sub parts that are entirely outside, don't return them


//if there is an overlap between the frustum and AABB

//either one of the point corners of the AABB frustum node will be inside the frustum
//or one of the frustum corners will be inside of the cube
// (
//  not entirely correct, the volumes of the two could overlap but the points of the AABB and frustum could be outside of eachother,
//  in that case though the edge lines of the frustum or AABB will intersect the bounding planes of the other
//  (intersect (6 planes with 12 lines) x 2 = (6 x 12 x 2 = 144 ray plane intersections)
//  or intersect (6 planes with 6 planes) =  36 intersection line
// )

//AABB overlap with another AABB is simple (not requiring many operations 8 per axis x 3 = 24), so first find if an AABB representing the frustum overlaps with the AABB, then find if the frustum overlaps
//in the x y z axies check if
// (minA < minF && minF < maxA) || (minA < maxF && maxF < maxA) ||
// (minF < minA && minA < maxF) || (minF < maxA && maxA < maxF)
// 8 float comparisons

//tries to efficently return a minimal set of nodes the (camera) frustum overlaps to
//get only the objects that need to be drawn
//get the objects tha
function OctTree_GetNodesThatOverlapOrAreInsideFrustum(node, frustum)
{
   //assume the root node overlaps the camera frustum ( the camera shouldn't be allowed to exit the world volume ) 
   //want to get the minimal set of nodes ( so if there are subnodes and one of them doesn't overlap ignore it ) that overlap with the camera
   //to only draw those values
   
   //check if the frustum is completely inside the node aabb (in which case subdivide until finding a binary oct tree node that can be excluded)
   
   //otherwise if a oct tree node is completely inside the frustum, update / draw it
   
   var nodeCorners = GenerateNodeCorners( node );
   var aabbInsideFrustumAndAABBOverlaps = OctTree_AABBoverlap( node, frustum );
   
   //the node is completely inside the frustum, return it's entirety
   if( aabbInsideFrustumAndAABBOverlaps[0] ){ 
    // should check if is actually within the frustum and not only it's aabb, but this is better than nothing for now
    return node;
   }
   
   //check if the node center is within the frustum aabb
   var nodeCenterInFrustumAABB = pointIsInsideAABB( aabb, node.midCoord );
   
   if( aabbInsideFrustumAndAABBOverlaps[1] ){
       //the aabb overlaps (intersects with) but is not completely inside the frustrum aabb (otherwise aabbInsideFrustum would be true because numCoordsAABB1InsideAABB2 would be all 6 of it's planes)
       //(partially but not completely within the frustum)
       
       
       if(nodeCenterInFrustumAABB){
        //then the frustum aabb is crossing the edge of the node and covering the center
        //(more than half of the node is in the frustum, so include the entire node (and it's sub nodes) in the draw / update)
        return node;
       }
       
       //the center is not covered
       //so less than half of the node is in the frustum, check if there are sub nodes and one can be excluded
       if( node.minNode == null && node.maxNode == null )
       {
         //there are no subnodes, so this is a leaf node of the binary oct tree (reached the bottom of the spatial division recursion)
         //return this node even though its area outside the frustum may be more than twice as larger than the area the frustum overlaps it 
         return node;
       }
   
       //the node isn't completely overlapping the frustum if one of it
       //check if any of it's sub nodes ( or sub sub nodes etc ) can be excluded from the
       //draw / update to improve performance
       
       var minNodeAabbInsideFrustumAndAABBOverlaps = OctTree_AABBoverlap( node.minNode, frustum );
       if( minNodeAabbInsideFrustumAndAABBOverlaps[0] 
       
  }
  
  //otherwise the frustum is either completely inside or outside the node
  
  //check if the center of the frustum is inside the node (if it is then the frustum aabb is probably in the middle of larger node than it
  var nodeCenterInFrustumAABB = pointIsInsideAABB( aabb, node.midCoord );
  
  return None;
}




