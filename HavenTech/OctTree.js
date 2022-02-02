
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


function TreeNode(axis, minCoord, maxCoord, parent){

  this.axis = axis; //the axis that the node splits ( (0)x , (1)y , or (2)z )
  this.minCoord = minCoord; //the minimum corner that the node covers
  this.maxCoord = maxCoord; //the maximum corner that the node covers
  
  this.parent = parent; //link to the parent ( to allow traversing back up the tree )
  
  this.objects = []; //the objects local to the node
  
  this.minNode = none; //the next node that spans max = (maxCoord+minCoord)/2 and min = minCoord
  this.maxNode = none; //
  
  //to be called when the node is filled with the max number of objects
  //(decided on for performance of number of object tests vs overhead of the depth of the tree)
  this.generateMinAndMaxNodes = function(){

    var nextAxis = (this.axis + 1) % 3; //modulo wrap around from (2)z axis back to x
    var minminCoord = []; //fill these depending on the axis being subdivided
    var minMaxCoord = [];
    var MaxminCoord = [];
    var MaxMaxCoord = [];
    
    for(var i = 0; i < 3; ++i){ //for loop to avoid seperate if statement for x y and z axies
    
      minminCoord.push( this.minCoord[i] );
      if( nextAxis == i){ //if this is axis that the minAndMax nodes split then use the mid point
        var midPt = (this.minCoord[i] + this.maxCoord[i]) / 2;
        minMaxCoord.push( midPt );
        MaxminCoord.push( midPt );
      }else{ //else since only one axis is being split
        minMaxCoord.push( this.maxCoord[i] );
        MaxminCoord.push( this.minCoord[i] );
      }
      MaxMaxCoord.push( this.maxCoord[i] );
    }
    //now that the extents of the nodes have been found create them
    this.minNode = new TreeNode(nextAxis, minminCoord, minMaxCoord, this);   
    this.maxNode = new TreeNode(nextAxis, MaxminCoord, MaxMaxCoord, this);
    
  }
  
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

    this.subCubes = [None, None,  //(0)0,0,0   (1)0,0,1
                     None, None,  //(2)0,1,0   (3)0,1,1
                     
                     None, None,  //(4)1,0,0   (5)1,0,1
                     None, None]; //(6)1,1,0   (7)1,1,1
                     //index is = x * 4 + y * 2 + z
                     
    this.rootNode =  new TreeNode('x', none); //the root of the tree
                     
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
