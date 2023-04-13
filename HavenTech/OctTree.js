
//when tracing rays check if the cross the planes defined in the if statement tree
//then test for intersection with the 


//the idea behind this is a mix between a binary space partioning tree and
//an oct tree
//when writing the if statement branches for an oct tree there were many similar
//cases, so to simplify the number of if else's at each level
//this is an orthogonal binary space partition tree, each level splits only one axis
//and each subsequent level splits the next axis in the order (x, y , z , x , y ... etc)

//each node has a render buffer (vertex, uv, normal, textures and handles) 
//that holds the data of
//the objects in the node, updated when requested by the frame buffer manager to draw

var MaxTreeNodeObjects = 5;
const rayStepEpsilon = 0.0001;
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

	this.minNode = null; //spans max = (maxCoord+minCoord)/2 and min = minCoord
	this.MaxNode = null; //

	//idealy the oct treebounds are 32-64bit integers (to avoid precision loss
	//with distance from the origin)
	//and every node / sub division has a fill/occupancy type
	//i.e vaccum, air, water, elemental material, etc 
	//(for ray energy dissipation / participating media scattering )

	//similar ideas are
	//(surfels https://en.wikipedia.org/wiki/Surfel) but more like a 
	//higher resolution version of marching cubes
	//https://en.wikipedia.org/wiki/Marching_cubes
	//by allowing more detailed resolution placement of voxel surfaces
	//it can appear like a polygonal mesh, but be performant

	//update all objects below this node in the oct tree
	//later may add count of nodes requested/updated to signify completion
	this.Update = function( time ){
	for( let i = 0; i < this.objects.length; ++i ) //loop through the objects
		this.objects[ i ].Update(time);

	//recursevly update sub nodes
	//this eventually may cause cross thread/computer calls so may need to synchronize
	//to ensure nodes are updated before rendering
	if( this.minNode != null ) this.minNode.Update( time );
	if( this.MaxNode != null ) this.MaxNode.Update( time );
	}

	this.addToThisNode = function( object ){
		//insertion sort the objects
		let lessThanIndex = -1;
		for( let i = 0; i < this.objects.length; ++i){
			if( this.objects[i].AABB.center[this.axis] < 
				object.AABB.center[this.axis] )
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
	this.AddObject = function( object, addDepth=0 ){
	//addDepth is to keep track of if all axies
	//have been checked for seperating the objects

		//fill nodes until they are full (prevent unessecary subdividing)
		//but also don't add objects if they are inside objects already in the world
		//(if something is inside an object it should be parented to it)
		if( this.minNode == null ){ //not yet subdivided
			this.addToThisNode(object);
			if( this.objects.length < MaxTreeNodeObjects ){
				return;
			}else{ //need to subdivide
				//only leaf nodes should contain objects to avoid overlap ambiguity
				//also to allow rays to only check leaves while traversing

				//split the node until there are only MaxTreeNodeObjects per node
				//to keep performace gains
				let newAxis = (this.axis + 1) % 3;
				let numMinObjs = this.generateMinAndMaxNodes(this.objects, newAxis);

				while( newAxis != this.axis && numMinObjs == -2 ){ //objects overlap in this axis (not seperable)
					newAxis = (newAxis + 1) % 3;
					numMinObjs = this.generateMinAndMaxNodes(this.objects, newAxis);
				}
				if( numMinObjs > 0 ){
					//divide the objects between the min and max nodes
					addDepth = addDepth + 1;
					var numObjectsAddedToMinNode = 0;
					for( let i = 0; i < this.objects.length; ++i ){
						if( i < numMinObjs )
							this.minNode.AddObject( this.objects[i], addDepth );
						else
							this.MaxNode.AddObject( this.objects[i], addDepth );
					}
					this.objects = [];
					this.objectDictionary = {};
					
					return;
					
					//the node was successfuly subdivided and objects
					//distributed to sub nodes such that
					//all nodes have less than MaxTreeNodeObjects
					//now that this node has room for the new object add it
				}

			}
		}else{ //already subdivided, decide if should add to min or max node
			if( object.AABB.center[this.axis] < this.minNode.MaxCoord[this.axis] )
				return this.minNode.AddObject( object, addDepth+1 );
			else
				return this.MaxNode.AddObject( object, addDepth+1 );
		}

		return false;
	}


	this.SubNode = function( point )
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
			var node = this.minNode.SubNode( point );
			if( node != null )
				return node;
		}
		if( this.MaxNode != null ){ 
			//check if it is in the max node or one of the max node's subnodes
			var node = this.MaxNode.SubNode( point );
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


	this.nextNodeRayPoint = new Float32Array(3);
	this.boundColor = new Float32Array([1,1,0]);
	this.rayExitPoint = new Float32Array(3);
	this.Trace = function( retVal, ray, minTraceTime ){
	//returns data from nearest object the ray intersects

	//traverses the binary oct tree, starting at a node 
	//checking objects in each node traversed for intersection with the ray
	//if no object intersections occur, 
	//the ray origin is advanced to the wall of the node it exits
	//and traversal returns to the parent node to check it's children for
	//the spatially adjacent node

	//check nodes below this for a sub node
	//var lastPointNodeIn = this.SubNode( nodeWallEntPt );
	//if( lastPointNodeIn == null )
	//    return null;

	//find which wall of this node the ray exits and which node it enters

	//create a new ray starting in this node to avoid getting intersection
	//with the entrance wall again

	//increasing the wall intersection ray time by epsilon 
	//(is done in next GetClosestIntersecting surface call)
	//generating a new ray point (which is inside the adjacent node)
	const rayExitStep = this.AABB.RayIntersects( this.rayExitPoint, ray, minTraceTime );
	if( rayExitStep < 0 ){ 
		//somehow the ray started outside of this node and didn't intersect
		//with it
		retVal[0] = -1;
		return; //ray has exited the entire oct tree
	}

	const minRayCoord = Math.min( ray.origin[this.axis], 
								this.rayExitPoint[this.axis] );
	const maxRayCoord = Math.max( ray.origin[this.axis], 
								this.rayExitPoint[this.axis] );

	//first check if any objects in this node intersect with the ray
	for( let i = 0; i < this.objects.length; ++i ) 
	//loop through the objects (if one isn't yet loaded, it is ignored)
	{
		if( ray.lastNode != null ) //don't recheck if checked last node
			if( ray.lastNode.objectDictionary[ this.objects[i].uuid ] != null )
				continue; //if already checked skip it
		//check if the ray intersects the object
		if( this.objects[i].AABB.
				RangeOverlaps( minRayCoord, maxRayCoord, this.axis ) ){
			retVal[0] = -1;
			this.objects[i].RayIntersect( retVal, ray );
			if( retVal[0] > 0 ){ //if it did intersect
				return; //return the result from the object
			}
		}
	}

	//the ray didn't hit anything in this node 

	//get a point along the ray inside the next node
	const rayNextNodeStep = rayExitStep + rayStepEpsilon;
	this.nextNodeRayPoint[0] = ray.norm[0] * rayNextNodeStep + ray.origin[0];
	this.nextNodeRayPoint[1] = ray.norm[1] * rayNextNodeStep + ray.origin[1];
	this.nextNodeRayPoint[2] = ray.norm[2] * rayNextNodeStep + ray.origin[2];
	mainScene.cameras[0].AddPoint(this.nextNodeRayPoint, this.boundColor );
	//find the next node starting at the current node and going up the tree
	//until there is a subnode that contains the next node point
	let parentNode = this;
	let nextTraceNode = null;
	while( nextTraceNode == null ){ //next node has not yet been found
		nextTraceNode = parentNode.SubNode( this.nextNodeRayPoint );
		if( nextTraceNode == null ){ //go up the hierarchy and try again
			parentNode = parentNode.parent; //up one level
			if( parentNode == null ){
				retVal[0] = -1;
				return; //the ray is outside the root node world space
			}
		}
	}
	if( nextTraceNode != null ){
		ray.lastNode = this;
		return nextTraceNode.Trace( retVal, ray, rayExitStep );
	}

	//this shouldn't be reached because of above if parent node == null
	retVal[0] = -1; 
	}

	//to be called when the node is filled with the max number of objects
	//uses closest object bounds to midpoint
	let minminCoord = new Float32Array(3); //filled based on the axis being subdivided
	let minMaxCoord = new Float32Array(3);
	let MaxminCoord = new Float32Array(3);
	let MaxMaxCoord = new Float32Array(3);
	let numMinObjs = 0;
	this.generateMinAndMaxNodes = function(objects){
		const nextAxis = (this.axis + 1) % 3; //modulo wrap around from (2)z axis back to x
		let numObjH = Math.floor(objects.length/2);

		if( this.minNode != null ) //if already subdivided dont generate new
			return -2;       //nodes (would loose objects)

		//generate the min and max corners of the nodes
		for(let i = 0; i < 3; ++i){
			//loop to avoid seperate if's for different x y and z nextAxies
			minminCoord[i] = this.minCoord[i]; //least is least of this node
			if( nextAxis == i){ //if this is the axis (x y or z) that
				//minAndMax nodes split then 
				//find a point closest to the mid point that is between
				//objects (don't subdivide objects because then ray traversal
				//may pass through / skip triangles)
				//assumes that objects are sorted least to greatest and if
				//there is overlap, they are seperated in another axis 
				let midPt = this.midCoord[i];
				
				let bestDivPt = objects[0].AABB.minCoord[i];
				let prevMaxPt = objects[0].AABB.minCoord[i];
				let newCenDst;
				let bestCenDst = bestDivPt - midPt;
				bestCenDst = bestCenDst > 0 ? bestCenDst : -bestCenDst;
				for( let j = 1; j < objects.length; ++j ){
					//if the minCoord is less than the prevMaxPt
					if( objects[j].AABB.minCoord[i] >= prevMaxPt ){ //doesn't overlap
						newCenDst = objects[j].AABB.minCoord[i] - midPt;
						newCenDst = newCenDst > 0 ? newCenDst : -newCenDst;
						if( bestCenDst > newCenDst ){ //a closer divison point has been found
							bestCenDst = newCenDst;
							bestDivPt = objects[j].AABB.minCoord[i];
							numMinObjs = j-1;
						}
					}
					prevMaxPt = prevMaxPt > objects[j].AABB.maxCoord[i] ? prevMaxPt : objects[j].AABB.maxCoord[i];
				}
				/*
				var midOfObjs2And3 = ( objects[numObjH-1].AABB.maxCoord[i] + 
										objects[numObjH].AABB.minCoord[i] ) / 2;
				var midOfObjs3And4 = ( objects[numObjH].AABB.maxCoord[i] + 
										objects[numObjH+1].AABB.minCoord[i] ) / 2;

				if( Math.abs(midOfObjs2And3 - midPt) < Math.abs(midOfObjs3And4 - midPt) ){
					midPt = midOfObjs2And3;
					numMinObjs = numObjH;
				}else{
					midPt = midOfObjs3And4;
					numMinObjs = numObjH+1;}
				*/
				//the closest between object midpoint to the middle of the node is selected
				minMaxCoord[i] = bestDivPt
				MaxminCoord[i] = bestDivPt;

			}else{ //for other axies use full range of this node
				minMaxCoord[i] = this.MaxCoord[i]; //the other axies span
				MaxminCoord[i] = this.minCoord[i]; //the full extent of this node
			}
			MaxMaxCoord[i] = this.MaxCoord[i]; //max is max of this node
		}
		//now that the extents of the nodes have been found create them
		if ( numMinObjs != 0 ){
			this.minNode = new TreeNode(nextAxis, minminCoord, minMaxCoord, this);
			this.MaxNode = new TreeNode(nextAxis, MaxminCoord, MaxMaxCoord, this);
			return numMinObjs;
		}
		return -1;
	}

}

