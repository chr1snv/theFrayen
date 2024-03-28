//OctTree.js
//to request use or code/art please contact chris@itemfactorystudio.com

//the idea behind this was to mix between a binary space partioning tree and
//an oct tree (it wouldnt't work because of needing to recreate subtrees when rebalancing)
//this is an orthogonal binary space partition tree, each level splits only one axis

//adding objects that overlap AABBs is not allowed (concave objects have to be separated into convex parts)
//(for non square slanted surfaces (e.g. pyramid, hill or ramp) the surface should be descritized into
//small AABB sections and objects interacting (e.g. ball rolling down ramp) form a new AABB for the duration of the interaction

//all objects are contained in leaf nodes to minimize the number of object intersection tests
//for ray/point queries

//when a node reaches the max object count all 3 axies are checked to find a point that
//splits/seperates/divides the objects in the node as evenly as possible 
//without having objects overlap the splitting/dividing plane

//if the best found node dividing plane overlaps an object (the objects in a node
//are not seperable along the x y or z axies)
//the objects crossing the plane that overlaps the least number of objects and is closest to dividing the objects evenly
//||||||must be split into two objects||||| (this may happen when rebalancing)
//(attempting to adjust the dividing point when rebalancing may help prevent object splitting)
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


//because of multiple axies, when rebalancing the axis of subdivision
//may need to be redetermined to find the best division axis and point
//keep the objects sorted by x,y,z in each tree node, and generate object
//overlap groups ( || is an object min | is an object max )
// ||------|
//     ||-------|
//using the sum of object overlaps in each axis from each tree node is to minimize
//the number of best points considered for dividing the tree when a
//parent to be rebalanced is found
//when rebalancing at the rebalance parent a binary search is done starting at
//halfway in the min or max node (with more objects)
//overlapping groups of objects in the min and max nodes to find a
//point and axis that most evenly divides the number of objects


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
function TreeNode( minCoord, maxCoord, parent ){

	this.enabled = true; //for enab/disab using hierarchy for debugging
	this.rayHitsPerFrame = 0;

	this.AABB = new AABB( minCoord, maxCoord );
	
	this.uuid       = Math.random();
	
	this.parent  = parent; //link to the parent ( to allow traversing back up the tree )

	if( parent ){
		this.depth = parent.depth+1;
		this.root = parent.root;
	}else{ //inital node in a tree
		this.depth = 0;
		this.root = this;
		this.maxDepth = 0;
	}

	this.leaves = 1; //number of leaf nodes below or including this node (any new node is a leaf)


	this.objects = [[],[],[]];  //the per axis positionally sorted objects
	this.objectDictionary = {}; //object uuids in this node for checking if an object is present
	//(for ray traversal preventing checking objects twice (will likely be removed when
	//objects are subdivided instead of added to multiple nodes if they span node boundries)

	this.subNodes = [null,null,null,null,  null,null,null,null];

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
		for( let i = 0; i < this.objects[0].length; ++i ) //loop through the objects
			this.objects[0][ i ].Update(time);

		//recursevly update sub nodes
		//this eventually may cause cross thread/computer calls so may need to synchronize
		//to ensure nodes are updated before rendering
		for( let i = 0; i < this.subNodes.length; ++i )
			if( this.subNodes[i] )
				this.subNodes[i].Update( time );
		//if( this.minNode != null ) this.minNode.Update( time );
		//if( this.MaxNode != null ) this.MaxNode.Update( time );
	}

	this.addToThisNode = function( object ){
		//insertion sort the objects (find the objects that have a min edge
		//before this object)
		let numOvlapAxs = 0;
		let insertIdxs = [-1,-1,-1];
		for(let ax = 0; ax < 3; ++ax ){
			let lessThanIndex = -1;
			for( let i = 0; i < this.objects[ax].length; ++i ){
				let aObjMin = this.objects[ax][i].AABB.minCoord;
				let objMin  = object.AABB.minCoord;
				//sort objects by obj array axis
				if(  aObjMin[ax] < objMin[ax]  ){
					lessThanIndex = i; //increment the index until finding a object that has a min
					//greater than the new object min
				}else{
					break; //because less to greater sorted, once a greater than
					//object is found, the rest will be greater
				}
			}
			
			insertIdxs[ax] = lessThanIndex;
			
			//check if the new object overlaps with the previous or the next (if present)
			if( this.objects[ax].length > 0 ){
				var cmpIdx = lessThanIndex;
				if(cmpIdx < 0)
					cmpIdx = 0;
				//check the first obj in the array or one to come after it
				if( AABBsOverlap(this.objects[ax][cmpIdx].AABB, object.AABB) )
					numOvlapAxs += 1;//return false;
				//check the object before the new object if present
				if( cmpIdx-1 >= 0 && AABBsOverlap(this.objects[ax][cmpIdx-1].AABB, object.AABB) )
					numOvlapAxs += 1; //return false;
			}
			
			//there isn't an overlap so it's ok to insert
			
			//insert at the index
			//this.objects.splice(lessThanIndex+1, 0, object);
		}
		
		if( numOvlapAxs < 3 ){
			for(let ax = 0; ax < 3; ++ax ){
				this.objects[ax].splice(insertIdxs[ax]+1, 0, object);
			}
		}else{
			return false; //overlaps in 3 axies ( intersects another object, can't insert)
		}
		
		//keep a dictionary for quickly checking if an object is in the oct tree node
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

	
	function updtChldAABBLeafCts( parent, reassignMaxNode, newNode, divAxis ){
		//console.log( "%c reassignNode start ", "color:green" );
		//if( newNode.axis != divAxis )
		//	console.log("axis mismatch");
		//console.log( "par ax " + parent.axis + " min " + parent.AABB.minCoord[divAxis] + " max " + parent.AABB.maxCoord[divAxis] );
		
		//console.log( "minNode ax " + parent.minNode.axis +  
		//			 " min " + parent.minNode.AABB.minCoord[divAxis] + 
		//			 " max " + parent.minNode.AABB.maxCoord[divAxis] +
		//			 " :MaxNode ax " + parent.MaxNode.axis +  
		//			 " min " + parent.MaxNode.AABB.minCoord[divAxis] + 
		//			 " max " + parent.MaxNode.AABB.maxCoord[divAxis] );
		
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
		//add the min and max node leave counts (leaf nodes have a count of 1)
		parent.leaveCounts[0] = parent.minNode.leaveCounts[0] + parent.MaxNode.leaveCounts[0];
		parent.leaveCounts[1] = parent.minNode.leaveCounts[1] + parent.MaxNode.leaveCounts[1];
		parent.leaveCounts[2] = parent.minNode.leaveCounts[2] + parent.MaxNode.leaveCounts[2];
		
		//check if all subnodes are inside the min and max node
		
		
		//console.log( msg + " ax " + divAxis + " leaveCts " + parent.leaveCounts[divAxis] + " : " + 
		//			 parent.minNode.leaveCounts[divAxis] + " : " +
		//			 parent.MaxNode.leaveCounts[divAxis] + " parDpth " + parent.depth );
		let str =    "par ax " + parent.axis + 
					 " min " + parent.AABB.minCoord + 
					 " max " + parent.AABB.maxCoord +
					 "\n:minNde ax " + parent.minNode.axis +  
					 " min " + parent.minNode.AABB.minCoord + 
					 " max " + parent.minNode.AABB.maxCoord +
					 " NObj " + parent.minNode.objects.length + "\n";
		console.log( str );
		//let str1 = "";
		for( let i = 0; i < parent.minNode.objects.length; ++i ){
			//str1 += parent.minNode.objects[i].AABB.minCoord + ":";
			//str1 += parent.minNode.objects[i].AABB.maxCoord + " ";
			let nOvlapCords = parent.minNode.objects[i].AABB.minCoord + ":"
								+ parent.minNode.objects[i].AABB.maxCoord + " "+i;
			if( !AABBsOverlap(parent.minNode.objects[i].AABB, parent.minNode.AABB) ){
				console.log( "%c"+nOvlapCords, "color:red" );
			}else{
				console.log( nOvlapCords );
			}
		}
		//str1 += "\n";
		let str2 =   " :MaxNde ax " + parent.MaxNode.axis +  
					 " min " + parent.MaxNode.AABB.minCoord + 
					 " max " + parent.MaxNode.AABB.maxCoord +
 					 " NObj " + parent.minNode.objects.length + "\n";
 		console.log( str2 );
 		//let str3 = "";
 		for( let i = 0; i < parent.MaxNode.objects.length; ++i ){
			//str3 += parent.MaxNode.objects[i].AABB.minCoord + ":";
			//str3 += parent.MaxNode.objects[i].AABB.maxCoord + " ";
			let nOvlapCords = parent.MaxNode.objects[i].AABB.minCoord + ":"
								+ parent.MaxNode.objects[i].AABB.maxCoord + " "+i;
			if( !AABBsOverlap(parent.MaxNode.objects[i].AABB, parent.MaxNode.AABB) ){
				console.log( "%c"+nOvlapCords, "color:red" );
			}else{
				console.log( nOvlapCords );
			}
		}
		//str3 += "\n";
		//console.log( str2 +
		// 			 str3 );
	}
	
	//called after dividing, this node has become a parent, 
	this.updateParentLeafCountsAndRebalanceIfNecessary = function( ){
		//walk up the tree until finding an unbalance of the number of leaves in the newly divided axis
		let rebalanceParent = this;
		let parLeavDiff = 0;
		let minSubNdLeaves = 9999999;
		let minSubNdIdx    = 0;
		let minSubNdVect   = [0,0,0];
		let maxSubNdLeaves = 0;
		let maxSubNdIdx    = 0;
		let maxSubNdVect   = [0,0,0];
		while( Math.abs(parLeavDiff) < 0.35 ){
			rebalanceParent = rebalanceParent.parent;
			if(rebalanceParent == null)
				break;

			rebalanceParent.leaves = 0;
			minSubNdLeaves = 9999999;
			maxSubNdLeaves = 0;
			for(let z = 0; z < 2; ++z){
				for(let y = 0; y < 2; ++y){
					for(let x = 0; x < 2; ++x){
						let i = x+y*2+z*4;

						let subNdLeaves = rebalanceParent.subNodes[i].leaves;
						rebalanceParent.leaves += subNdLeaves;
						if( subNdLeaves < minSubNdLeaves ){
							minSubNdLeaves = subNdLeaves;
							minSubNdVect = [x,y,z];
							minSubNdIdx = x+y*2+z*4;
						}
						if( subNdLeaves > maxSubNdLeaves ){
							maxSubNdLeaves = subNdLeaves;
							maxSubNdVect = [x,y,z];
							maxSubNdIdx = x+y*2+z*4;
						}
					}
				}
			}
			
			parLeavDiff = (minSubNdLeaves - maxSubNdLeaves)/(minSubNdLeaves+maxSubNdLeaves);
		}
		
		
		if(rebalanceParent != null){ //found a node that needs rebalancing
		
			//given the min leaf sub node and max, find a new div point
			let maxDivPt = rebalanceParent.subNodes[maxSubNdIdx].divPt;
			let minToMaxDir = [ maxSubNdVect[0] - minSubNdVect[0],
								maxSubNdVect[1] - minSubNdVect[1],
								maxSubNdVect[2] - minSubNdVect[2] ];
			let maxDivPtWght = [Math.abs(minToMaxDir[0]), 
								Math.abs(minToMaxDir[1]), 
								Math.abs(minToMaxDir[2]) ];
			let newDivPt = [ maxDivPtWght[0]*maxDivPt[0] + (1-maxDivPtWght[0])*rebalanceParent.divPt[0],
							 maxDivPtWght[1]*maxDivPt[1] + (1-maxDivPtWght[1])*rebalanceParent.divPt[1],
							 maxDivPtWght[2]*maxDivPt[2] + (1-maxDivPtWght[2])*rebalanceParent.divPt[2] ];
							 
			//merge the leaves adjacent to eachother
			
			//1 pick new div pt (midpoint of leaf count node (to avoid thin aspect ratio subnodes) )
			//2 for each new region list the sub nodes that intersect it
			//3 merge the intersecting sub nodes by picking the largest and
			//	enlarging to fill the new region and adding objects from the
			//  other sub nodes in the new region to it
			
			//(walk from the min leaf node to the max one by the min to max dir)
			//find the new division points
			for(let zI = 0; z < 2; ++z){
				let z = minSubNdVect[2] + minToMaxDir[2]*zI;
				for(let yI = 0; y < 2; ++y){
					let y = minSubNdVect[1] + minToMaxDir[1]*yI;
					for(let xI = 0; x < 2; ++x){
						let x = minSubNdVect[0] + minToMaxDir[0]*xI;
						
						//the first node will be the min node (it should be added to by parts of other nodes)
					}
				}
			}
			
			let botMsg = " botLfs ";
			if( rebalanceParent.minNode.minNode != null )
				botMsg += rebalanceParent.minNode.minNode.leaveCounts + " : " + rebalanceParent.minNode.MaxNode.leaveCounts;
			let topMsg = " Lfs ";
			if( rebalanceParent.MaxNode.minNode != null )
				topMsg += rebalanceParent.MaxNode.minNode.leaveCounts + " : " + rebalanceParent.MaxNode.MaxNode.leaveCounts;
			console.log( "%crebal at dpth " + rebalanceParent.depth + 
			 			" ax " + ovAxis +
						" leavDiff " +  parLeavDiff.toPrecision(3) + " : " + parMinLeavsTot + " : " + parMaxLeavsTot +
						" leaveCts " + rebalanceParent.leaveCounts +
						 botMsg +
						 " :: maxAx " + rebalanceParent.MaxNode.axis + 
						 topMsg, "color:lightblue" );
			let nTm;                //node to move
			let nTmSibling;         //node to move sibling
			let lTm;                //leaf to move
			//let lTmPar;             //leaf to move parent
			let nTmPar;             //node to move parent
			//let nTmParPar;          //node to move parent parent (the rebalance parent)
			let nTmParParLinkIsMin; //is the nodeToMove parent the min or max child of node to move parent parent
			let maxToMinRebalance = (parLeavDiff < 0);
			if( maxToMinRebalance ){
				console.log("%cmax to min rebalance", "color:orange");
				//the max node has more leaves
				let axisVal = rebalanceParent.MaxNode.AABB.minCoord[ovAxis];
				nTm = rebalanceParent.MaxNode.minNode
				nTmPar = rebalanceParent.MaxNode;//nTm.parent;
				//nTmParPar = nTmPar.parent;
				nTmParParLinkIsMin = false;
				nTmSibling = nTmPar.MaxNode;
				lTm = rebalanceParent.minNode; //.getInnerMostNode(ovAxis, axisVal);
			}else{
				console.log("%cmin to max rebalance", "color:teal");
				//the min node has more leaves
				let axisVal = rebalanceParent.minNode.AABB.maxCoord[ovAxis];
				nTm = rebalanceParent.minNode.MaxNode;//getInnerMostNode(ovAxis, axisVal);
				nTmPar = rebalanceParent.minNode;//nTm.parent;
				//nTmParPar = nTmPar.parent;
				nTmSibling = nTmPar.minNode;
				nTmParParLinkIsMin = true;
				lTm = rebalanceParent.MaxNode; //.getInnerMostNode(ovAxis, axisVal);
			}
			let lTmDepth = lTm.depth;
			let nTmDepth = nTm.depth;
			
			//shared rebalance operation (max to min or min to max rebalance)
			
			//find which of the leafs of the rebalance parent to attach the nTm sibling to later
			//if( rebalanceParent.minNode == nTmPar ) //nTmParPar
			//	nTmParParLinkIsMin = true;
			//else
			//	nTmParParLinkIsMin = false;
			
			//move the nodes and reassign depth and min/mid/max values and AABBs
			//lTmPar = lTm.parent;

			//1//move the nTm and lTm under the nTmPar
			console.log("%c1 move the nTm and lTm under the nTmPar (lTm is min, nTm max)", "color:yellow");
			updtChldAABBLeafCts( nTmPar, !maxToMinRebalance, lTm, ovAxis );
			updtChldAABBLeafCts( nTmPar,  maxToMinRebalance, nTm, ovAxis );
			//the nTmPar leave count should now be 2

			//2////move the nTmPar to the leaf to be reparented's position
			//if the lTmPar is the rebalance parent, then move the
			//nTm parent to it's min node other wise, the max node will be 
			//the lTm it is the max most node of the min side to be rebalanced
			console.log("%c2 move the nTmPar to the lTm's position under the rebalanceParent", "color:yellow");//lTmPar
			if( maxToMinRebalance ){
				//move the nTmPar to whichever child of the rebalanceParent the lTm
				updtChldAABBLeafCts( rebalanceParent, false, nTmPar, ovAxis );
			}else{
				updtChldAABBLeafCts( rebalanceParent, true, nTmPar, ovAxis );
			}
			//the leave counts of the rebalanceParent should be the min branch + the nTmPar (2 leaves)
			nTmPar.depth = rebalanceParent.depth+1;//lTmPar
			lTm.depth = nTmPar.depth+1;
			nTm.depth = nTmPar.depth+1;
			
			//3//reassign the node to move sibling to where the node to move parent was
			console.log("%c3  reassign the node to move sibling to where the node to move parent was", "color:yellow");
			if( maxToMinRebalance ){
				updtChldAABBLeafCts(rebalanceParent, true, nTmSibling, ovAxis);
			}else{
				updtChldAABBLeafCts(rebalanceParent, false, nTmSibling, ovAxis);
			}
			//4 assign the depths of the nodes
			nTmSibling.depth = rebalanceParent.depth+1;
			
			
			parMinLeavsTot = rebalanceParent.minNode.leaveCounts;
			parMaxLeavsTot = rebalanceParent.MaxNode.leaveCounts;
			let parMinLeavs = rebalanceParent.minNode.leaveCounts[0]+rebalanceParent.minNode.leaveCounts[1]+rebalanceParent.minNode.leaveCounts[2];
			let parMaxLeavs = rebalanceParent.MaxNode.leaveCounts[0]+rebalanceParent.MaxNode.leaveCounts[1]+rebalanceParent.MaxNode.leaveCounts[2];
			parLeavDiff = (parMinLeavs - parMaxLeavs)/(parMinLeavs+parMaxLeavs);
			console.log( "%crebal done at dpth " + rebalanceParent.depth + " leavDiff " + 
						 parLeavDiff.toPrecision(3) + " : " + parMinLeavsTot + " : " + parMaxLeavsTot +
						 " axis " + ovAxis + " leaveCts " + rebalanceParent.leaveCounts, "color:#f27dff" );
		
			
			//continue propigating the additional leaf count up the tree (if not finished)
			let curParent = rebalanceParent;
			while( curParent != null && curParent.parent != null ){
				//curParent.parent.leaveCounts[ovAxis] += 1;
				curParent.parent.leaveCounts[0] = curParent.parent.minNode.leaveCounts[0]+curParent.parent.MaxNode.leaveCounts[0];
				curParent.parent.leaveCounts[1] = curParent.parent.minNode.leaveCounts[1]+curParent.parent.MaxNode.leaveCounts[1];
				curParent.parent.leaveCounts[2] = curParent.parent.minNode.leaveCounts[2]+curParent.parent.MaxNode.leaveCounts[2];
				console.log(
					"d " + curParent.parent.depth + " lfCt " + curParent.parent.leaveCounts +
					" minLfs " + curParent.parent.minNode.leaveCounts +
					" MaxLfs " + curParent.parent.MaxNode.leaveCounts 
				 );
				curParent = curParent.parent;
			}
			
			console.log(" ");
		
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
	this.FindMinOverlapClosestToCenterDivPoint = function( objs, divAxis ){
		//more important to divide the number of objects in half and place
		//the new node boundry on an object edge than be near the middle of the
		//current node (because then the number of objects per node is minimal
		//and the chance of a new object crossing the created boundry is minimized)
		
		bestDivPtRank = 9999; //initalize before comparing points in axis
		
		//objects are already sorted by the minCoord in each axis in objects array of arrays
		//for overlap checking

		//octTreeDivLogElm.innerHTML += "sorted ";
		//for( let i = 0; i < objects.length; ++i ){
		//	octTreeDivLogElm.innerHTML += sortedObjs[divAxis][i].AABB.minCoord[divAxis] + minMaxToCSide(sortedObjs[divAxis][i].AABB) + " ";
		//octTreeDivLogElm.innerHTML += "<br/>";
		//}


		//choose the min of the first object as the best division point until a better 
		//(closer to dividing the objects evenly) point is found
		bestDivPt = objs[0].AABB.minCoord[divAxis];
		bestNumOvlaps = 0;
		this.rankDivPt(bestDivPt, 0, 0, halfNumObjs); //check the min 
		//(though hopefully it doesn't divide here because all the objects would go to the max node)

		let rangeMin = objs[0].AABB.minCoord[divAxis];
		let rangeMax = objs[0].AABB.maxCoord[divAxis];
		
		let numOverlaps = 0;

		//sliding range comparison of the object overlaps |---|==|===|
		//add a new object and if its min is > the previous max then the new
		//possible overlap range min is the new object min
		for( let j = 1; j < objs.length; ++j ){ //iterate over the min to max minCoord sorted objects checking for overlaps
			let newMin = objs[j].AABB.minCoord[divAxis];
			let newMax = objs[j].AABB.maxCoord[divAxis];
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

	this.objSubsetForAxs = function(axs, subNdIdx, ovNumMinObjs){
		let objs = [];
		if( subNdIdx == 0 )
			objs = this.objects[axs].slice(0, ovNumMinObjs[axs]);
		else
			objs = this.objects[axs].slice(ovNumMinObjs[axs], this.objects[axs].length);
		let obDict = {};
		for(let i = 0; i < objs.length; ++i){
			let ob = objs[i];
			obDict[ ob.uuid ] = ob;
		}
		return obDict;
	}

	//add an object to the node, if it is full - subdivide it 
	//and place objects in the sub nodes
	this.AddObject = function( object, addCmpCallback ){
	
		if( object.AABB.minCoord[0] == 52 && object.AABB.maxCoord[1] == 88 ){
			let str = "%cadd at " + 
						object.AABB.minCoord + " : " + 
						object.AABB.maxCoord + "     " + 
						this.AABB.minCoord + " : " + this.AABB.maxCoord;
			console.log(str, "color:green" );
		}


		//fill nodes until they are full (prevent unessecary subdividing)
		//but also don't add objects if they are inside objects already in the world
		//(if something is inside an object it should be parented to it)
		if( this.subNodes[0] == null ){ //not yet subdivided, try to add to self
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
			if( this.objects[0].length < MaxTreeNodeObjects ){
				if( addCmpCallback != undefined )
					addCmpCallback();
				return sucesfullyAdded;
			}else{ //need to subdivide
				//only leaf nodes should contain objects to avoid overlap ambiguity
				//also to allow rays to only check leaves while traversing
				if( this.depth+1 > MaxTreeDepth ){ //prevent unbound tree depth to avoid running out of memory 
													//(if a mistake causes allot of object adding/tree division)
					octTreeDivLogElm.innerHTML += "<p style='color:#ff0000; margin:0px;'>Max Depth reached</p><br/>";
					return false;
				}

				//try to split the node so there are only MaxTreeNodeObjects per node
				//to keep performace gains
				halfNumObjs = Math.floor(this.objects[0].length/2);
				let ovNumMinObjs = [0,0,0]; //ov stands for overall (all axies)
				let ovDivPtRank = [99999, 99999, 99999];
				let ovNumOvlaps = [0,0,0];
				let ovDivPt = [0,0,0];
				octTreeDivLogElm.innerHTML += "<p style='color:#f8f07f; margin:0px;'>>>Max Obj ct for node reached, Dividing at Depth " + this.depth + 
					" axis " + aIdxToS(this.axis) + " numObj " + this.objects.length +"<br/>" +
					'finding best division axis and point</p><br/>';
				for( let dAxs = 0; dAxs < 3; ++dAxs ){ //check all axies for the best division planes
					this.FindMinOverlapClosestToCenterDivPoint(this.objects[dAxs], dAxs);
					octTreeDivLogElm.innerHTML += "a " + aIdxToS(dAxs) +
												  " numMin " + bestNumMinObjs +
												  " ovlaps " + bestNumOvlaps +
												  " divPt " + bestDivPt + " " +
												  " score " + bestDivPtRank + '<br/>';
					if( bestDivPtRank < ovDivPtRank[dAxs] ){
						ovNumMinObjs[dAxs]  = bestNumMinObjs;
						ovDivPtRank[dAxs]   = bestDivPtRank;
						ovNumOvlaps[dAxs]   = bestNumOvlaps;
						ovDivPt[dAxs]       = bestDivPt;
						octTreeDivLogElm.innerHTML += "best div pt found for axs " + dAxs + "<br/>";
					}
				}

				if( ovDivPtRank[0] < 99999 && ovDivPtRank[1] < 99999 && ovDivPtRank[2] < 99999 ){ //found a div point
					//check how dividing will affect the tree balance
					//find the closest parent with the same dividing axis as proposed
				
					//create the 8 (2x minmin minmax and maxmin maxmax ) nodes
					octTreeDivLogElm.innerHTML += "sub-dividing at point " + ovDivPt; //axis " + aIdxToS(ovAxis);
					octTreeDivLogElm.innerHTML += " numMin " + ovNumMinObjs;
					octTreeDivLogElm.innerHTML += " ovlaps " + ovNumOvlaps;
					octTreeDivLogElm.innerHTML += " divPt " + ovDivPt + "<br/>";
					this.divPt = ovDivPt;
					this.generateSubNodes(ovDivPt);

					//divide the objects between the 8 sub nodes (for now assume there are no divPt overlaps)
					for(let z = 0; z < 2; ++z){
						let zObDict = this.objSubsetForAxs(2, z, ovNumMinObjs);
						for(let y = 0; y < 2; ++y){
							let yObDict = this.objSubsetForAxs(1, y, ovNumMinObjs);
							for(let x = 0; x < 2; ++x){
								let xObDict = this.objSubsetForAxs(0, x, ovNumMinObjs);
								
								//get the sub node
								let nd = this.subNodes[x+y*2+z*4];

								//find the intersecting subset of nodes and
								//copy the intersecting subset of objects of the 3 axies into the subnode
								let objs = [];
								for( obUuid in xObDict )
									if( xObDict[ obUuid ] && yObDict[ obUuid ] && zObDict[ obUuid ] )
										nd.AddObject( xObDict[obUuid] );

							}
						}
					}
					
					this.objects = [];
					this.objectDictionary = {};
					this.leaves = 8; //update from 1 to 8 because this has become a parent

					if( addCmpCallback != undefined )
						addCmpCallback();
					octTreeDivLogElm.innerHTML += 
						'<p style="color:#d8f87f; margin:0px;">>' +
							'finished dividing node m:M ' + this.AABB.minCoord + 
							':' + this.AABB.maxCoord +
							' at depth ' + this.depth +
							' and divPt ' + ovDivPt + '</p><br/>';

					//the node was successfuly subdivided and objects
					//distributed to sub nodes such that
					//all nodes have less than MaxTreeNodeObjects
					
					//update the parent nodes depth below and leaf counters
					this.updateParentLeafCountsAndRebalanceIfNecessary( );
					
					return;
				}else{
					octTreeDivLogElm.innerHTML += 
						"<p style='color:#ff0000; margin:0px;'>didn't find div pt</p><br/>";
				}

			}
		}else{ //already subdivided, decide which sub node it should be added to
			let s = [ 
					object.AABB.minCoord[0] < this.divPt[0] ? 0 : 1,
					object.AABB.minCoord[1] < this.divPt[1] ? 0 : 1,
					object.AABB.minCoord[2] < this.divPt[2] ? 0 : 1 ];
			
			let nde = this.subNodes[ s[0]+s[1]*2+s[2]*4 ];
		
			octTreeDivLogElm.innerHTML += "DivdAddToMin: " +
										  " nde.dpth " + nde.depth +
										  " min " + nde.AABB.minCoord +
										  ' max ' + nde.AABB.maxCoord +
										  ' obj min ' + object.AABB.minCoord + 
										  '<br/>';
			return nde.AddObject( object, addCmpCallback );
		
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
	for( let i = 0; i < this.objects[0].length; ++i ){
	//loop through the objects (if one isn't yet loaded, it is ignored)
		if( ray.lastNode == null || 
			ray.lastNode.objectDictionary[ this.objects[0][i].uuid ] == null ){ //don't recheck if checked last node
			//check if the ray intersects the object
			if( this.objects[0][i].AABB.
				RangeOverlaps( minRayCoord, maxRayCoord, this.axis, true ) ){
				retVal[0] = -1;
				this.objects[0][i].RayIntersect( retVal, ray );
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
	//uses best dividing point found from FindMinOverlapClosestToCenterDivPoint
	this.generateSubNodes = function(divPt){
		//let numObjH = Math.floor(objects.length/2);

		if( this.subNodes[0] != null ) //if already subdivided dont generate new
			return -2;       //nodes (would loose objects)
			
		this.root.maxDepth += 1;
		
		//corners of the sub nodes (given min=0,mid=1,max=2 parent source coordinates) are
		//[0,0,0](0,0,0:1,1,1)	[1,0,0](1,0,0:2,1,1) //bottom layer
		//[0,1,0](0,1,0:1,2,1)	[1,1,0](1,1,0:2,2,1)
		//
		//[0,0,1](0,0,1:1,1,2)	[1,0,1](1,0,1:2,1,2) //top layer
		//[0,1,1](0,1,1:1,2,2)	[1,1,1](1,1,1:2,2,2)
		//the pattern above is in the loop below:
		
		//generates the min and max sub/child node corners
		let nDpth = this.depth+1;
		let maxDpth = this.root.maxDepth;
		let subNdIdx = 0;
		let srcCoords = [this.AABB.minCoord, divPt, this.AABB.maxCoord];
		for(let z = 0; z < 2; ++z){
			for(let y = 0; y < 2; ++y){
				for(let x = 0; x < 2; ++x){
					let nNdeMin = [srcCoords[x+0],srcCoords[y+0],srcCoords[z+0]];
					let nNdeMax = [srcCoords[x+1],srcCoords[y+1],srcCoords[z+1]];
					//create the subnode
					this.subNodes[subNdIdx] = new TreeNode(nNdeMin, nNdeMax, this);
					
					//set the debug oct tree color based on axis and depth
					this.subNodes[subNdIdx].boundColor[0] = (1-(nDpth)/maxDpth)*x;
					this.subNodes[subNdIdx].boundColor[1] = (1-(nDpth)/maxDpth)*y;
					this.subNodes[subNdIdx].boundColor[2] = (1-(nDpth)/maxDpth)*z;
					
					subNdIdx += 1;
				}
			}
		}

		
	}
	
	//given a node AABB and the text width and height, return the a point in the aabb closest to the canvas center
	//(for putting labled information in an oct tree node on screen (-10000 or 10000 may be off screen)
	function closestPointInAABBToCanvasCenter( AABB, textDim, canvasCenter ){
	
		let closestPoint = [canvasCenter[0], canvasCenter[1]]; //return the center of the canvas if it's inside the aabb
		
		let minBound = [ AABB.minCoord[0]+textDim[0], AABB.minCoord[1]+textDim[1] ];
		let maxBound = [ AABB.maxCoord[0]-textDim[0], AABB.maxCoord[1]-textDim[1] ];
		
		//check the x and y axies
		for( let i = 0; i < 2; ++i){
			if( minBound[i] > canvasCenter[i] || canvasCenter[i] > maxBound[i] ){
				let closestEdge = maxBound[i];
				if( Math.abs( (minBound[i]) - canvasCenter[i] ) < Math.abs( (maxBound[i]) - canvasCenter[i] ) ){ //check if the min bound is closer than the max
					closestEdge = minBound[i];
				}
				closestPoint[i] = closestEdge; //assign the closer of the min or max bounds
			}
		}
		
		return closestPoint;
	}

	
	this.DebugDraw = function(fCtx){
		
		
		//draw outline of this node
		vals = [0,0,0,1];
		vals[this.axis] = 255;
		
		lw = 1;
		let rgbString = "rgba("+vals[0]+","+vals[1]+","+vals[2]+","+vals[3]+")";
		fCtx.fillStyle = rgbString;
		fCtx.fillRect( this.AABB.minCoord[0]   , this.AABB.minCoord[1]   , this.AABB.maxCoord[0] - this.AABB.minCoord[0], lw); //top line
		fCtx.fillRect( this.AABB.minCoord[0]   , this.AABB.maxCoord[1]-lw, this.AABB.maxCoord[0] - this.AABB.minCoord[0], lw); //bottom
		fCtx.fillRect( this.AABB.minCoord[0]   , this.AABB.minCoord[1]   , lw, this.AABB.maxCoord[1] - this.AABB.minCoord[1]); //left
		fCtx.fillRect( this.AABB.maxCoord[0]-lw, this.AABB.minCoord[1]   , lw, this.AABB.maxCoord[1] - this.AABB.minCoord[1]); //right
		
		if( this.objects.length > 0 ){
			//fill the background
			vals[3] = ((this.depth+1) / this.root.maxDepth);
			rgbString = "rgba("+vals[0]+","+vals[1]+","+vals[2]+","+vals[3]+")";
			fCtx.fillStyle = rgbString;
			let nWidth  = this.AABB.maxCoord[0] - this.AABB.minCoord[0];
			let nHeight = this.AABB.maxCoord[1] - this.AABB.minCoord[1];
			//console.log(this.AABB.m " dim " + nWidth + ":" + nHeight );
			fCtx.fillRect(  this.AABB.minCoord[0], this.AABB.minCoord[1], nWidth, nHeight ); //fill center
			
			
			//draw debugging text (node traversal number and number of objects inside)
			fCtx.font = '6pt arial';
			rgbString = "rgba(255,255,255,1)";
			fCtx.fillStyle = rgbString;
			let mMLbl = 'n';
			if(this.parent){
				if(this.parent.minNode == this)
					mMLbl = 'm';
				else
					mMLbl = 'M';
			}
			let txt = nodeNum+":"+this.objects[0].length+mMLbl; //":"+this.AABB.minCoord[0]+",\n"+this.AABB.minCoord[1]+
			let txtHWdth = fCtx.measureText( txt ).width/2;
			let halfAABBWidth = (this.AABB.maxCoord[0] - this.AABB.minCoord[0])/2;
			if(txtHWdth > halfAABBWidth )
				txtHWdth = halfAABBWidth;
			let textCenter = closestPointInAABBToCanvasCenter( this.AABB, [txtHWdth*1.2, 5], [fCtx.canvas.width/2, fCtx.canvas.height/2] );
			console.log("textCenter " + textCenter );
			fCtx.fillText( txt, textCenter[0]-txtHWdth, textCenter[1] );
			
			//draw number on each object
			for( var i = 0; i < this.objects[0].length; ++i ){
				let cent = Vect3_CopyNew( this.objects[0][i].AABB.minCoord );
				Vect3_Add( cent, this.objects[0][i].AABB.maxCoord );
				Vect3_DivideScalar( cent, 2 );
				let txtN = nodeNum + ":" + i;
				let wdthH = fCtx.measureText( txtN ).width/2;
				fCtx.fillText( txtN, cent[0]-wdthH, cent[1] );
			}
			
			//draw color based on shared parent
			if(this.parent){
				let hexString = (Math.floor(this.parent.uuid*10000000)).toString(16);
				fCtx.fillStyle = "#"+hexString;
				fCtx.fillRect( textCenter[0]-txtHWdth, textCenter[1]+2, txtHWdth*2,3 );
			}
		}
		nodeNum+=1;

		//draw outline of child nodes if they exist
		if(this.minNode != null)
			this.minNode.DebugDraw(fCtx);
		if(this.MaxNode != null)
			this.MaxNode.DebugDraw(fCtx);
	}
}
var nodeNum = 0; //the oct tree node debug draw traversal number

