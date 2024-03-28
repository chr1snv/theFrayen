//OctTree.js
//to request use or code/art please contact chris@itemfactorystudio.com

//the idea behind this is a mix between a binary space partioning tree and
//an oct tree
//when writing the if statement branches for an oct tree there were many similar
//cases, so to simplify the number of if else's at each level
//this is an orthogonal binary space partition tree, each level splits only one axis

//adding objects that overlap AABBs are not allowed (concave objects have to be separated into convex parts)
//(for non square slanted surfaces (e.g. pyramid, hill or ramp) the surface should be descritized into
//small AABB sections and objects interacting (e.g. ball rolling down ramp) form a new AABB for the duration of the interaction

//all objects are contained in leaf nodes to minimize the number of object intersection tests
//for ray/point queries


//when a node reaches the max object count all 3 axies are checked to find a plane that
//splits/seperates/divides the objects in the node as evenly as possible 
//without having objects overlap the splitting/dividing plane

//if the best found node dividing plane overlaps an object (the objects in a node
//are not seperable along the x y or z axies)
//the objects crossing the plane that overlaps the least number of objects and is closest to dividing the objects evenly
//must be split into two objects
//(trying to allow overlaps or having each node division a subsequent axis causes problems
//with maintaining a max number of objects per node, deciding on the dividing point, and 
//if an object would intersect another if added)

//when adding objects and dividing the tree may also need to be rebalanced
//i.e adding objects in a line with increasing x and 0 y, 0 z

//numbers in {} represent {leaf nodes of axis in branch}
//         1 level
// [x]{1}1 2 3 4 5 -> divide

//           2 levels
//       [x]{2}p empty
// [x]{1}1 2 | [x]{1}3 4 5 6 7 -> divide


//          3 levels
//      [x]{3}p empty
// [x]{1}1 2 | [x]{2}rempty
//             [x]{1}3 4 | [x]{1}5 6 7 8 9 -> divide
//^should rebalance here after dividing^
//
// - without rebalancing this happens -
//           4 levels
//       [x]{4}p empty
//  [x]{1}1 2 | [x]{3}rempty
//            | [x]{1}3 4 | [x]{2}empty
//                          [x]{1}5 6 | [x]{1}7 8 9
//at this point there is a node with a leaf count difference of 2   4->1,3
//if unbalanced by more than one
//starting at the newly divided node [x]{2}empty, go up until finding a parent
// with children of the same axis as divided [x] leaf node{} difference > 2 {0-3}
//move the leaves of the unbalanced axis by moving leaves adjacent to the dividing plane
//move the inner most leaf of the divided axis [x]{1}3 4 from the
//branch with more leaves to the one with less
//by replacing its parent with its sibling [x]{3}rempty -> [x]{2}empty 
//and inner most leaf (closest to the dividing axis) 
//[x]{1}1 2 with the replaced parent [x]{3}rempty now with children
//[x]{1}1 2  | [x]{1}3 4  and leaf count {2}

//after rebalancing
//                     3 levels
//                  [x]{4}p empty
//      [x]{2}rempty      |      [x]{2}rempty
// [x]{1}1 2  | [x]{1}3 4 | [x]{1}5 6 | [x]{1}7 8 9
//                                



//using the tree for raster based rendering,
//each node has a render buffer (vertex, uv, normal, textures and handles) 
//that holds the data of
//the objects in the node, updated when requested by the frame buffer manager to draw

function aIdxToS(a){ //axis index to string
	if(a == 0)
		return "x";
	else if(a == 1)
		return "y";
	else
		return "z";
}

const treeDebug = false;

const divOverlapPenalty = 1;
const divHalfPenalty = 1;

const MaxTreeDepth = 10;
const MaxTreeNodeObjects = 5;
var totalFrameRayHits = 0;
const rayStepEpsilon = 0.0001;
function TreeNode( axis, minCoord, maxCoord, parent ){

	this.enabled = true; //for enab/disab using hierarchy for debugging
	this.rayHitsPerFrame = 0;

	this.axis = axis; //the axis that the node splits (has a sibling adjacent to it) ( (0)x , (1)y , or (2)z )

	this.AABB = new AABB( minCoord, maxCoord );

	if( parent ){
		this.depth = parent.depth+1;
		this.root = parent.root;
	}else{ //inital node in a tree
		this.depth = 0;
		this.root = this;
		this.maxDepth = 0;
	}

	this.leaveCounts = [0,0,0]; //number of x y z leaf nodes below this node
	this.leaveCounts[this.axis] = 1; //new nodes are themself leaf nodes

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
		//insertion sort the objects (find the objects that have a min edge
		//before this object)
		let lessThanIndex = -1;
		for( let i = 0; i < this.objects.length; ++i ){
			if( this.objects[i].AABB.minCoord[this.axis] < object.AABB.minCoord[this.axis] ){
				lessThanIndex = i; //increment the index until finding a object that has a min
				//greater than the new object min
			}else{
				break; //because less to greater sorted, once a greater than
				//object is found, the rest will be greater
			}
		}
		
		//check if the new object overlaps with the previous or the next (if present)
		if( this.objects.length > 0 ){
			var cmpIdx = lessThanIndex;
			if(cmpIdx < 0)
				cmpIdx = 0;
			//check the first obj in the array or one to come after it
			if( AABBsOverlap(this.objects[cmpIdx].AABB, object.AABB) )
				return false;
			//check the object before the new object if present
			if( cmpIdx-1 >= 0 && AABBsOverlap(this.objects[cmpIdx-1].AABB, object.AABB) )
				return false;
		}
		
		//there isn't an overlap so it's ok to insert
		
		//insert at the index
		this.objects.splice(lessThanIndex+1, 0, object);

		//keep a dictionary for quickly checking if an object is present
		this.objectDictionary[ object.uuid ] = object;
		return true;
	}
	
	//helper function for below, updates the closest and given canidate list
	updateClosesetAndAddToList = function(axisVal, node, list, distanceList, closestDistAdded){
		let closestNodeVal = getClosestNodeIsToAxisVal(node, axisVal);
		if( closestNodeVal <= closestDistAdded[0] ){
			closestDistAdded[0] = closestNodeVal;
			closestDistAdded[1] = true;
			list.push(node);
			distanceList.push(closestNodeVal);
		}else{
			closestDistAdded[1] = false;
		}
	}
	//checks min and max because could be checking either side of rebalance dividing plane
	//(could be sped up by checking only the max or min if passed in or two functions made)
	getClosestNodeIsToAxisVal = function(node, axisVal){
		let axisValDistm = Math.abs(axisVal - node.AABB.minCoord[axis]); //check the min and max
		let axisValDistM = Math.abs(axisVal - node.AABB.maxCoord[axis]);
		let minAxisValDist = Math.min( axisValDistm, axisValDistM );
		return minAxisValDist;
	}

	//get the node closest to the axis coordinante
	this.getInnerMostNode = function( axis, axisVal ){
		if( this.minNode == null )
			return this;
		let traversalNodes = [this.minNode, this.MaxNode]; //breadth first traversal
		let closestDistAdded = [100000000, false]; //the distance and if the most recent was added (pass by refrence)
		let childrenAdded = true;
		let canidateTraversalNodes = [];
		let canidateTraversalNodeDistances = [];
		let newTraversalNodes = [];
		let newTraversalNodeDistances = [];
		while( traversalNodes.length > 0 && childrenAdded ){ //while there are new canidate nodes
			
			canidateTraversalNodes = [];
			canidateTraversalNodeDistances = [];
			for( let i = 0; i < traversalNodes.length; ++i ){ //find the closest of the nodes
				updateClosesetAndAddToList( axisVal, 
									traversalNodes[i], canidateTraversalNodes,
									canidateTraversalNodeDistances, closestDistAdded );
			}
			newTraversalNodes = [];
			newTraversalNodeDistances = [];
			childrenAdded = false;
			for( let i = 0; i < canidateTraversalNodes.length; ++i ){ //keep only those that are closest
				let canidateToKeep = canidateTraversalNodes[i];
				let dist = getClosestNodeIsToAxisVal(canidateToKeep, axisVal );
				if( dist <= closestDistAdded[0] ){ //will keep this node or its leaves if it has any
					let canidateToKeepMinN = canidateToKeep.minNode;
					let canidateToKeepMaxN = canidateToKeep.MaxNode;
					let childAdded = false;
					if( canidateToKeepMinN != null ){
						updateClosesetAndAddToList( axisVal, canidateToKeepMinN, newTraversalNodes,
										newTraversalNodeDistances, closestDistAdded );
						childAdded = true;
					}
					if( canidateToKeepMaxN != null ){
						updateClosesetAndAddToList( axisVal, canidateToKeepMaxN, newTraversalNodes,
										newTraversalNodeDistances, closestDistAdded );
						childAdded = true;
					}
					if( !childAdded ){ //add the canidate instead
						newTraversalNodes.push(canidateToKeep);
						newTraversalNodeDistances.push(dist);
					}else{
						childrenAdded = true;
					}
				}
				traversalNodes = newTraversalNodes;
			}
			
		}
		let closestDist = 100000000;
		let closest = null;
		for( let i = 0; i < traversalNodes.length; ++i ){
			let dist = getClosestNodeIsToAxisVal(traversalNodes[i], axisVal);
			if( dist < closestDist ){
				closestDist = dist;
				closest = traversalNodes[i];
			}
		}
		return closest;
	}
	
	function updtChldAABBLeafCts( parent, reassignMaxNode, newNode, divAxis ){
		console.log( "%c reassignNode start ", "color:green" );
		if( newNode.axis != divAxis || newNode.axis != parent.axis || divAxis != parent.axis )
			console.log("axis mismatch");
		console.log( "par ax " + parent.axis + " min " + parent.AABB.minCoord[divAxis] + " max " + parent.AABB.maxCoord[divAxis] );
		
		console.log( "minNode ax " + parent.minNode.axis +  
					 " min " + parent.minNode.AABB.minCoord[divAxis] + 
					 " max " + parent.minNode.AABB.maxCoord[divAxis] +
					 " :MaxNode ax " + parent.MaxNode.axis +  
					 " min " + parent.MaxNode.AABB.minCoord[divAxis] + 
					 " max " + parent.MaxNode.AABB.maxCoord[divAxis] );
		
		let msg = "";
		if(reassignMaxNode){
			parent.MaxNode = newNode;
			msg = "MaxNde assignd";
		}else{
			parent.minNode = newNode;
			msg = "minNde assignd";
		}
		newNode.parent = parent;
		
		//update the aabb
		parent.AABB.UpdateMinMaxCenter( parent.minNode.AABB.minCoord, parent.MaxNode.AABB.maxCoord );
		
		//update the leaf counts
		parent.leaveCounts[divAxis] = 0;
		//add the min and max node leave counts (leaf nodes have a count of 1)
		parent.leaveCounts[divAxis] += parent.minNode.leaveCounts[divAxis];
		
		parent.leaveCounts[divAxis] += parent.MaxNode.leaveCounts[divAxis];
		
		console.log( msg + " ax " + divAxis + " leaveCts " + parent.leaveCounts[divAxis] + " : " + 
					 parent.minNode.leaveCounts[divAxis] + " : " +
					 parent.MaxNode.leaveCounts[divAxis] + " parDpth " + parent.depth );
		
		console.log( "par ax " + parent.axis + 
					 " min " + parent.AABB.minCoord + 
					 " max " + parent.AABB.maxCoord +
					 " :minNde ax " + parent.minNode.axis +  
					 " min " + parent.minNode.AABB.minCoord[divAxis] + 
					 " max " + parent.minNode.AABB.maxCoord[divAxis] +
					 " NObj " + parent.minNode.objects.length +
		 			 " :MaxNde ax " + parent.MaxNode.axis +  
					 " min " + parent.MaxNode.AABB.minCoord[divAxis] + 
					 " max " + parent.MaxNode.AABB.maxCoord[divAxis] +
 					 " NObj " + parent.minNode.objects.length );
	}
	
	//called after dividing, this node has become a parent, 
	this.updateParentLeafCountsAndRebalanceIfNecessary = function( ovAxis ){
		//walk up the tree until finding an unbalance of the number of leaves in the newly divided axis
		let rebalanceParent = this;
		let parLeavDiff = 0;
		let parMinLeavsTot;
		let parMaxLeavsTot;
		while( Math.abs(parLeavDiff) < 1 ){
			rebalanceParent = rebalanceParent.parent;
			if(rebalanceParent == null)
				break;
			rebalanceParent.leaveCounts[ovAxis] += 1; //now 3 for the node above this
			parMinLeavsTot = rebalanceParent.minNode.leaveCounts;
			parMaxLeavsTot = rebalanceParent.MaxNode.leaveCounts;
			let parMinLeavs = rebalanceParent.minNode.leaveCounts[ovAxis];
			let parMaxLeavs = rebalanceParent.MaxNode.leaveCounts[ovAxis];
			parLeavDiff = parMinLeavs - parMaxLeavs;
		}
		
		
		if(rebalanceParent != null){ //found a node that needs rebalancing
			
			console.log( "%crebalancing at depth " + rebalanceParent.depth + " leavDiff " + 
						 parLeavDiff + " : " + parMinLeavsTot + " : " + parMaxLeavsTot +
						 " axis " + ovAxis + " leaveCts " + rebalanceParent.leaveCounts, "color:lightblue" );
			let nTm;                //node to move
			let nTmSibling;         //node to move sibling
			let lTm;                //leaf to move
			let lTmPar;             //leaf to move parent
			let nTmPar;             //node to move parent
			let nTmParPar;          //node to move parent parent
			let nTmParParLinkIsMin; //is the nodeToMove parent the min or max child of node to move parent parent
			if( parLeavDiff < 0 ){
				console.log("%cmax to min rebalance", "color:orange");
				//the max node has more leaves
				let axisVal = rebalanceParent.MaxNode.AABB.minCoord[ovAxis];
				nTm = rebalanceParent.MaxNode.getInnerMostNode(ovAxis, axisVal);
				nTmPar = nTm.parent;
				nTmParPar = nTmPar.parent;
				nTmSibling = nTmPar.MaxNode;
				lTm = rebalanceParent.minNode.getInnerMostNode(ovAxis, axisVal);
			}else{
				console.log("%cmin to max rebalance", "color:teal");
				//the min node has more leaves
				let axisVal = rebalanceParent.minNode.AABB.maxCoord[ovAxis];
				nTm = rebalanceParent.minNode.getInnerMostNode(ovAxis, axisVal);
				nTmPar = nTm.parent;
				nTmParPar = nTmPar.parent;
				nTmSibling = nTmPar.MaxNode;
				lTm = rebalanceParent.MaxNode.getInnerMostNode(ovAxis, axisVal);
			}
			let lTmDepth = lTm.depth;
			let nTmDepth = nTm.depth;
			
			//shared rebalance operation (max to min or min to max rebalance)
			
			//find which of the leafs of the nTm parent parent to attach the nTm sibling to later
			if( nTmParPar.minNode == nTmPar )
				nTmParParLinkIsMin = true;
			else
				nTmParParLinkIsMin = false;
			
			//move the nodes and reassign depth and min/mid/max values and AABBs
			lTmPar = lTm.parent;

			//1//move the nTm and lTm under the nTmPar
			console.log("%c1 move the nTm and lTm under the nTmPar (lTm is min, nTm max)", "color:yellow");
			updtChldAABBLeafCts( nTmPar, false, lTm, ovAxis );
			updtChldAABBLeafCts( nTmPar, true, nTm, ovAxis );
			//the nTmPar leave count should now be 2

			//2////move the nTmPar to the leaf to be reparented's position
			//if the lTmPar is the rebalance parent, then move the
			//nTm parent to it's min node other wise, the max node will be 
			//the lTm it is the max most node of the min side to be rebalanced
			console.log("%c2 move the nTmPar to the lTm's position under the lTmPar", "color:yellow");
			if( lTmPar.minNode == lTm ){
				//move the nTmPar to whichever child of the lTmPar the lTm is
				updtChldAABBLeafCts( lTmPar, false, nTmPar, ovAxis );
			}else{
				updtChldAABBLeafCts( lTmPar, true, nTmPar, ovAxis );
			}
			//the leave counts of the lTmPar should be the min branch + the nTmPar (2 leaves)
			nTmPar.depth = lTmPar.depth+1;
			lTm.depth = nTmPar.depth+1;
			nTm.depth = nTmPar.depth+1;
			
			//3//reassign the node to move sibling to where the node to move parent was
			console.log("%c3  reassign the node to move sibling to where the node to move parent was", "color:yellow");
			if( nTmParParLinkIsMin ){
				updtChldAABBLeafCts(nTmParPar, false, nTmSibling, ovAxis);
			}else{
				updtChldAABBLeafCts(nTmParPar, true, nTmSibling, ovAxis);
			}
			//4 assign the depths of the nodes
			nTmSibling.depth = nTmParPar.depth+1;
			
			//continue propigating the additional leaf count up the tree (if not finished)
			let curParent = rebalanceParent;
			while( curParent.parent != null ){
				curParent.parent.leaveCounts[ovAxis] += 1;
				curParent = curParent.parent;
			}
		
		}
		
	}


	//rank and record the dividing point if it's the best scoring found so far
	this.rankDivPt = function(divPt, numOverlaps, idx, halfNumObjs){
	
		let diffMinHalfObjs = Math.abs(idx-halfNumObjs);

		//rank this dividing point using a metric involving the number of overlaps and number of objects un evenly divided
		let divPtRank = numOverlaps*divOverlapPenalty + diffMinHalfObjs*divHalfPenalty; //lower is better

		//if this is a better scoring division point than previous for this axis record it as best
		if( divPtRank < bestDivPtRank ){
			bestDivPtRank = divPtRank;
			bestNumOvlaps = numOverlaps;
			bestNumMinObjs = idx;
			bestDivPt = divPt;
		}
		
	}

	//check the objects along the axis for overlaps 
	//filling in the number of overlaps in each object
	//and return with the -
	//least overlapping min edge point (closest to the midpoint) and
	// numObjects before it (minObjects),
	let bestDivPt; //best for an axis (these values defined here to allow returning to add object function)
	let bestDivPtRank = 9999;
	let bestNumMinObjs;
	let bestNumOvlaps;
	let halfNumObjs;
	let sortedObjs = [ [], [], [] ];
	this.FindMinOverlapClosestToCenterDivPoint = function( objects, newAxis ){
		//more important to divide the number of objects in half and place
		//the new node boundry on an object edge than be near the middle of the
		//current node (because then the number of objects per node is minimal
		//and the chance of a new object crossing the created boundry is minimized)
		
		bestDivPtRank = 9999; //initalize before comparing points in axis
		
		//need to sort objects by the minCoord in the newAxis before checking
		//for overlaps
		
		if( newAxis == this.axis ){
			sortedObjs[newAxis] = this.objects; //already kept in sorted order for the axis of the tree node
		}else{ //for other axies need to sort
			//copy the objects into the new array
			sortedObjs[newAxis] = new Array(objects.length);
			for( let i = 0; i < objects.length; ++i ){
				sortedObjs[newAxis][i] = objects[i];
			}
			//sort them by min coord in the axis of comparison
			sortedObjs[newAxis].sort( function( a, b ){ return a.AABB.minCoord[newAxis] - b.AABB.minCoord[newAxis]; } );
			
		}

		//octTreeDivLogElm.innerHTML += "sorted ";
		//for( let i = 0; i < objects.length; ++i ){
		//	octTreeDivLogElm.innerHTML += sortedObjs[newAxis][i].AABB.minCoord[newAxis] + minMaxToCSide(sortedObjs[newAxis][i].AABB) + " ";
		//octTreeDivLogElm.innerHTML += "<br/>";
		//}


		//choose the min of the first object as the best division point until a better 
		//(closer to dividing the objects evenly) point is found
		bestDivPt = sortedObjs[newAxis][0].AABB.minCoord[newAxis];
		bestNumOvlaps = 0;
		this.rankDivPt(bestDivPt, 0, 0, halfNumObjs); //check the min 
		//(though hopefully it doesn't divide here because all the objects would go to the max node)

		let rangeMin = sortedObjs[newAxis][0].AABB.minCoord[newAxis];
		let rangeMax = sortedObjs[newAxis][0].AABB.maxCoord[newAxis];
		
		let numOverlaps = 0;

		//sliding range comparison of the object overlaps |---|==|===|
		//add a new object and if its min is > the previous max then the new
		//possible overlap range min is the new object min
		for( let j = 1; j < sortedObjs[newAxis].length; ++j ){ //iterate over the min to max minCoord sorted objects checking for overlaps
			let newMin = sortedObjs[newAxis][j].AABB.minCoord[newAxis];
			let newMax = sortedObjs[newAxis][j].AABB.maxCoord[newAxis];
			//forget prior object ranges that don't overlap 
			//(advance the min if it doesn't overlap with previous objects)
			if( newMin > rangeMax ){
				rangeMin = newMin;
				rangeMax = newMax;
				numOverlaps = 0;
			}else{ //the new object range overlaps, extend the max
				numOverlaps++;
				rangeMax = newMax;
			}

			//consider dividing at this object's min point
			this.rankDivPt(newMin, numOverlaps, j, halfNumObjs);

		}

	}

	this.clearRayCtrs = function(){
		this.rayHitsPerFrame = 0;
		
		if( this.minNode ){
				this.minNode.clearRayCtrs();
		}
		if( this.MaxNode ){
			this.MaxNode.clearRayCtrs();
		}
	}

	//add an object to the node, if it is full - subdivide it 
	//and place objects in the sub nodes
	this.AddObject = function( object, addCmpCallback ){


		//fill nodes until they are full (prevent unessecary subdividing)
		//but also don't add objects if they are inside objects already in the world
		//(if something is inside an object it should be parented to it)
		if( this.minNode == null ){ //not yet subdivided, try to add to self
			const sucesfullyAdded = this.addToThisNode(object);
			let addStatusColor = '#ff0000';
			if( sucesfullyAdded )
				addStatusColor = '#00ff00';
			octTreeDivLogElm.innerHTML += "<p style='color:" + addStatusColor + 
				"; margin:0px;'>addSucess " + sucesfullyAdded + 
						' ndeMin ' + this.AABB.minCoord + ' ndeMax ' + this.AABB.maxCoord + 
						' objMin ' +  object.AABB.minCoord[this.axis] + 
						' numNdeObjs ' + this.objects.length + ' ndeAxis ' + this.axis + 
						' ndeDpth ' + this.depth  + '</p><br/>';
			if( this.objects.length < MaxTreeNodeObjects ){
				if( addCmpCallback != undefined )
					addCmpCallback();
				return sucesfullyAdded;
			}else{ //need to subdivide
				//only leaf nodes should contain objects to avoid overlap ambiguity
				//also to allow rays to only check leaves while traversing
				if( this.depth+1 > MaxTreeDepth ){ //prevent unbound tree growth to help avoid running out of memory
					octTreeDivLogElm.innerHTML += "<p style='color:#ff0000; margin:0px;'>Max Depth reached</p><br/>";
					return false;
				}

				//try to split the node until there are only MaxTreeNodeObjects per node
				//to keep performace gains
				halfNumObjs = Math.floor(this.objects.length/2);
				let ovNumMinObjs; //ov stands for overall (all axies)
				let ovDivPtRank = 99999;
				let ovNumOvlaps;
				let ovDivPt;
				let ovAxis;
				octTreeDivLogElm.innerHTML += "<p style='color:#f8f07f; margin:0px;'>>>Max Obj ct for node reached, Dividing at Depth " + this.depth + 
					" axis " + aIdxToS(this.axis) + " numObj " + this.objects.length +"<br/>" +
					'finding best division axis and point</p><br/>';
				for( let a = 0; a < 3; ++a ){ //check all axies including this one
					let newAxis = (this.axis + a) % 3;
					this.FindMinOverlapClosestToCenterDivPoint(this.objects, newAxis);
					octTreeDivLogElm.innerHTML += "a " + aIdxToS(newAxis) +
												  " numMin " + bestNumMinObjs +
												  " ovlaps " + bestNumOvlaps +
												  " divPt " + bestDivPt + " " +
												  " score " + bestDivPtRank + '<br/>';
					if( bestDivPtRank < ovDivPtRank ){
						ovNumMinObjs  = bestNumMinObjs;
						ovDivPtRank   = bestDivPtRank;
						ovNumOvlaps   = bestNumOvlaps;
						ovDivPt       = bestDivPt;
						ovAxis        = newAxis;
						octTreeDivLogElm.innerHTML += "best div pt and axis found so far<br/>";
					}
				}

				if( ovNumMinObjs > 0 &&  ovNumMinObjs < this.objects.length ){ //found a div point
					//check how dividing will affect the tree balance
					//find the closest parent with the same dividing axis as proposed
				
					//create the min and max nodes
					octTreeDivLogElm.innerHTML += "dividing with axis " + aIdxToS(ovAxis);
					octTreeDivLogElm.innerHTML += " numMin " + ovNumMinObjs;
					octTreeDivLogElm.innerHTML += " ovlaps " + ovNumOvlaps;
					octTreeDivLogElm.innerHTML += " divPt " + ovDivPt + "<br/>";
					this.generateMinAndMaxNodes(ovAxis, ovDivPt);

					//divide the objects between the min and max nodes
					for( let i = 0; i < this.objects.length; ++i ){
						if( i < ovNumMinObjs ){
							octTreeDivLogElm.innerHTML += "addToMin objMin " + 
								sortedObjs[ovAxis][i].AABB.minCoord[ovAxis] + '<br/>';
							this.minNode.AddObject( sortedObjs[ovAxis][i], addCmpCallback );
							if( i + ovNumOvlaps > ovNumMinObjs ){ //also add it to the max node
								octTreeDivLogElm.innerHTML += "OvlpAddToMax " + 
									sortedObjs[ovAxis][i].AABB.minCoord[ovAxis] + '<br/>';
								this.MaxNode.AddObject( sortedObjs[ovAxis][i], addCmpCallback );
							}
						}else{
							octTreeDivLogElm.innerHTML += "addToMax " + 
								sortedObjs[ovAxis][i].AABB.minCoord[ovAxis] + '<br/>';
							this.MaxNode.AddObject( sortedObjs[ovAxis][i], addCmpCallback );
						}
					}
					this.objects = [];
					this.objectDictionary = {};
					this.leaveCounts[ovAxis] = 2; //update from 1 to 2 because this has become a parent

					if( addCmpCallback != undefined )
						addCmpCallback();
					octTreeDivLogElm.innerHTML += 
						'<p style="color:#d8f87f; margin:0px;">>finished dividing node a ' + this.axis + 
										' dpth ' + this.depth + ' with new axis ' + ovAxis + 
										' and divPt ' + ovDivPt + '</p><br/>';

					//the node was successfuly subdivided and objects
					//distributed to sub nodes such that
					//all nodes have less than MaxTreeNodeObjects
					
					//update the parent nodes depth below and leaf counters
					this.updateParentLeafCountsAndRebalanceIfNecessary( ovAxis );
					
					return;
				}else{
					octTreeDivLogElm.innerHTML += 
						"<p style='color:#ff0000; margin:0px;'>didn't find div pt</p><br/>";
				}

			}
		}else{ //already subdivided, decide if should add to min or max node
			if( object.AABB.minCoord[this.minNode.axis] < this.minNode.AABB.maxCoord[this.minNode.axis] ){
				octTreeDivLogElm.innerHTML += "DivdAddToMin: a " + this.minNode.axis +
											  " mNde.dpth " + this.minNode.depth +
											  " minMin " + this.minNode.AABB.minCoord +
											  ' minMax ' + this.minNode.AABB.maxCoord +
											  ' obj min ' + object.AABB.minCoord[this.minNode.axis] + 
											  '<br/>';
				return this.minNode.AddObject( object, addCmpCallback );
			}else{
				octTreeDivLogElm.innerHTML += "DivdAddToMax: a " + this.MaxNode.axis + 
											  " MNde.dpth " + this.MaxNode.depth + 
											  " MaxMin " + this.MaxNode.AABB.minCoord + 
											  ' maxMax ' + this.MaxNode.AABB.maxCoord + 
											  ' obj min ' + object.AABB.minCoord[this.minNode.axis] + 
											  '<br/>';
				return this.MaxNode.AddObject( object, addCmpCallback );
			}
		}

		return false;
	}

	this.SubNode = function( point ){
		//find which node the ray origin is in
		//to start tracing though node walls and objects from the ray's starting point
		if(!this.enabled)
			return null;

		if( point[0] > this.AABB.minCoord[0] && 
			point[1] > this.AABB.minCoord[1] && 
			point[2] > this.AABB.minCoord[2] && //each axis of the point is greater than
											//those of the min coord
			point[0] < this.AABB.maxCoord[0] && 
			point[1] < this.AABB.maxCoord[1] && 
			point[2] < this.AABB.maxCoord[2] ){ //each axis of the point is also 
											//less than those of the max coord

			//theirfore the ray origin is in this node
			if( this.minNode != null ){ 
				//check if it is in the min node or one of the min node's subnodes
				var node = this.minNode.SubNode( point );
				if( node != null )
					return node;}
			if( this.MaxNode != null ){ 
				//check if it is in the max node or one of the max node's subnodes
				var node = this.MaxNode.SubNode( point );
				if( node != null )
					return node;}
			return this; //the origin is in this node and this node 
			//is a leaf node ( doesn't have a min or max child )
			//or it was in this node and this node isn't a leaf node 
			//but it wasn't in one of the leaf nodes ( shouldn't happen )
		}else{
			return null;} //the point is outside this node, null will allow 
			//the calling instance of this function to try another node
	}

	this.nextNodeRayPoint = new Float32Array(3);
	this.boundColor = new Float32Array([0,0,0,0.5]);
	this.rayExitPoint = new Float32Array(3);
	this.Trace = function( retVal, ray, minTraceTime ){
	//returns data from nearest object the ray intersects

	if( !this.enabled )
		return;
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
		return;} //ray has exited the entire oct tree

	const minRayCoord = ray.origin[this.axis] < this.rayExitPoint[this.axis] ? 
						ray.origin[this.axis] : this.rayExitPoint[this.axis];
	const maxRayCoord = this.rayExitPoint[this.axis] > ray.origin[this.axis] ? 
						this.rayExitPoint[this.axis] : ray.origin[this.axis];

	//first check if any objects in this node intersect with the ray
	for( let i = 0; i < this.objects.length; ++i ){
	//loop through the objects (if one isn't yet loaded, it is ignored)
		if( ray.lastNode == null || 
			ray.lastNode.objectDictionary[ this.objects[i].uuid ] == null ){ //don't recheck if checked last node
			//check if the ray intersects the object
			if( this.objects[i].AABB.
				RangeOverlaps( minRayCoord, maxRayCoord, this.axis, true ) ){
				retVal[0] = -1;
				this.objects[i].RayIntersect( retVal, ray );
				if( retVal[0] > 0 ){
					this.rayHitsPerFrame++;
					totalFrameRayHits++;
					return;
				} //return the result from the object
			}
		}
	}

	//get a point along the ray inside the next node
	const rayNextNodeStep = rayExitStep + rayStepEpsilon;
	this.nextNodeRayPoint[0] = ray.norm[0] * rayNextNodeStep + ray.origin[0];
	this.nextNodeRayPoint[1] = ray.norm[1] * rayNextNodeStep + ray.origin[1];
	this.nextNodeRayPoint[2] = ray.norm[2] * rayNextNodeStep + ray.origin[2];

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
		//the ray didn't hit anything in this node
		if( treeDebug && this.depth == Math.floor((sceneTime/2)%(this.root.maxDepth+1)) ){
			this.boundColor[3] = debOctOpac;
			mainScene.cameras[0].AddPoint( this.rayExitPoint, this.boundColor );
		}

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
	this.generateMinAndMaxNodes = function(newAxis, divPt){
		//let numObjH = Math.floor(objects.length/2);

		if( this.minNode != null ) //if already subdivided dont generate new
			return -2;       //nodes (would loose objects)

		//generate the min and max corners of the nodes
		for(let i = 0; i < 3; ++i){
			//loop to avoid seperate if's for different x y and z nextAxies
			minminCoord[i] = this.AABB.minCoord[i]; //least is least of this node
			if( newAxis == i){ //if this is the axis (x y or z) that
				//minAndMax nodes split then use the dividing point given

				//the closest between object midpoint to the middle of the node is selected
				minMaxCoord[i] = divPt;
				MaxminCoord[i] = divPt;

			}else{ //for other axies use full range of this node
				minMaxCoord[i] = this.AABB.maxCoord[i]; //the other axies span
				MaxminCoord[i] = this.AABB.minCoord[i]; //the full extent of this node
			}
			MaxMaxCoord[i] = this.AABB.maxCoord[i]; //max is max of this node
		}
		//now that the extents of the nodes have been found create them
		this.root.maxDepth += 1;
		this.minNode = new TreeNode(newAxis, minminCoord, minMaxCoord, this);
		this.MaxNode = new TreeNode(newAxis, MaxminCoord, MaxMaxCoord, this);

		//set the debug oct tree color based on axis and depth
		if(		 newAxis == 0 ){
			this.minNode.boundColor[0] = 1-this.minNode.depth/(this.root.maxDepth+1);
			this.MaxNode.boundColor[0] = 1-this.MaxNode.depth/(this.root.maxDepth+1);  }
		else if( newAxis == 1 ){
			this.minNode.boundColor[1] = 1-this.minNode.depth/(this.root.maxDepth+1);
			this.MaxNode.boundColor[1] = 1-this.MaxNode.depth/(this.root.maxDepth+1);  }
		else if( newAxis == 2 ){
			this.minNode.boundColor[2] = 1-this.minNode.depth/(this.root.maxDepth+1);
			this.MaxNode.boundColor[2] = 1-this.MaxNode.depth/(this.root.maxDepth+1);  }
	}

}

