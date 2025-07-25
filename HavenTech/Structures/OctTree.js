//OctTree.js
//to request use or code/art please contact chris@itemfactorystudio.com

//the idea behind this was to mix between a binary space partioning tree and
//an oct tree (it wouldnt't work because of needing to recreate subtrees when rebalancing)
//this is a power of 2 orthogonal space partition tree that every time a node reaches the max
//number of objects it divides at it's center point into 8, 4 or 2 sub nodes
//(depending on if an axis has reached the min node size)

//power of 2 size and integer coordinates allows for seamlessly
//expanding/shrinking an oct tree world size later
//and also having a fixed depth makes it so that the positions and max memory
//usage of tree nodes can be known at root node creation time

function closestLrgrPoT(n){ //used to initially set dimensions of the oct tree
	return Math.pow(2,Math.ceil(Math.log2(n)));
}

//adding objects that overlap AABBs is not allowed (concave objects have to be separated into convex parts)
//(for non square slanted surfaces (e.g. pyramid, hill or ramp) the surface should be descritized into
//small AABB sections and objects interacting (e.g. ball rolling down ramp) 
//should form a new AABB for the duration of the interaction

//only leaf nodes contain objects 
//to minimize the number of object intersection tests for ray/point queries

//if an object overlaps a node boundry
//the objects crossing the plane
//||||||must be split into one object per tree node|||||
//(the parts, can be components managed by the original object and it's
//update ocur only once by checking the update time called from the oct tree)
//(trying to allow overlaps causes problems
//with maintaining a max number of objects per node 
//		(as an object moves and enters a new node)
//also if an object would intersect another if added,
//it then needs to be removed from all the nodes in the add process)

	//similar spatial subdivision/multiresolution methods/ideas are
	//(surfels https://en.wikipedia.org/wiki/Surfel) but this more like a 
	//higher resolution version of marching cubes
	//https://en.wikipedia.org/wiki/Marching_cubes
	//by allowing more detailed resolution placement of voxel surfaces
	//marching cubes can appear like a polygonal mesh, but be performant
	
	//in this by having quad/tri meshes in each sub node, this power of two oct tree
	//retains the graphical quality of arbitrary mesh geometery and
	//the spatial intersection/lookup performance of a tree data structure


//using the tree for raster based rendering,
//each node has a render buffer (vertex, uv, normal, textures and handles) 
//that holds the data of
//the objects in the node, updated when requested by the frame buffer manager to draw

function TND_initObjects(t){
	for( let i = 0; i < MaxTreeNodeObjects; ++i ){
		t.objects[i] = null;
	}
	t.objInsertIdx = 0; //object uids in this node for checking if an object is present
	t.objectDictionary = {};//(for ray traversal preventing checking objects twice (will likely be removed when
//objects are subdivided instead of added to multiple nodes if they span node boundries)
}

//where field properties influence objects i.e. gravity, temperature, gas/liquid drag etc and connections/constraints between objects are found
function TND_ApplyExternAffectsAndDetectCollisions( t, time ){
	for( let i = 0; i < t.objInsertIdx; ++i ){ //loop through the objects
		if( t.objects[ i ].physObj != null )
			PHYSOBJ_ApplyExternAffectsAndDetectCollisions( t.objects[ i ].physObj, time, t );
	}

	for( let i = 0; i < t.subNodes.length; ++i ) //recurse to sub nodes
		if( t.subNodes[i] )
			TND_ApplyExternAffectsAndDetectCollisions( t.subNodes[i], time );
}
function TND_LinkPhysGraphs( t, time ){ //combine constraint groups from each object
	for( let i = 0; i < t.objInsertIdx; ++i ){
		if( t.objects[ i ].physObj != null )
			PHYSOBJ_LinkPhysGraphs( t.objects[ i ].physObj, time );
	}

	for( let i = 0; i < t.subNodes.length; ++i )
		if( t.subNodes[i] )
			TND_LinkPhysGraphs( t.subNodes[i], time );
}
function TND_AppyInterpenOffset( t, time ){ //apply interpenetration offsets for constraint groups
	for( let i = 0; i < t.objInsertIdx; ++i ){
		if( t.objects[ i ].physObj != null )
			PHYSOBJ_ApplyInterpenOffset( t.objects[ i ].physObj, time );
	}

	for( let i = 0; i < t.subNodes.length; ++i )
		if( t.subNodes[i] )
			TND_AppyInterpenOffset( t.subNodes[i], time );
}
function TND_TransferEnergy( t, time ){ //(accel -> vel update step)
	//transfer energy through constraints and forces from tree parent and per treeNode (vac, water/air etc)
	for( let i = 0; i < t.objInsertIdx; ++i ){
		if( t.objects[ i ].physObj != null )
			PHYSOBJ_TransferEnergy( t.objects[ i ].physObj, time, t );
	}

	for( let i = 0; i < t.subNodes.length; ++i )
		if( t.subNodes[i] )
			TND_TransferEnergy( t.subNodes[i], time );
}
function TND_DetectAdditionalCollisions( t, time ){
	//check if objects are still going to collide, 
	//in which case dissipate more of their energy
	//and only allow them to move in free directions
	let additionalColis = 0;
	for( let i = 0; i < t.objInsertIdx; ++i ){
		if( t.objects[ i ].physObj != null )
			additionalColis += PHYSOBJ_DetectAdditionalCollisions( t.objects[ i ].physObj, time, t );
	}

	for( let i = 0; i < t.subNodes.length; ++i )
		if( t.subNodes[i] )
			additionalColis += TND_DetectAdditionalCollisions( t.subNodes[i], time );
	return additionalColis;
}
function TND_Update( t, time ){ //update model logic, animation and if has physObj lineraly update object positions up to the end of the timestep
	let numUpdated = 0;
	let obj = null;
	for( let i = 0; i < t.objInsertIdx; ++i ){
		obj = t.objects[i];
		if( obj ){
			switch( obj.otType ){
				case OT_TYPE_Model:
					MDL_Update( obj, time, t); //calls physObj Update if model has one
			}
			numUpdated += 1;
		}else{
			break;
		}
	}

	let numUpdatedInSubNodes = 0;
	let numSubNds = 0;
	for( let i = 0; i < t.subNodes.length; ++i ){
		if( t.subNodes[i] ){
			numSubNds += 1;
			numUpdatedInSubNodes += TND_Update( t.subNodes[i], time );
		}
	}
	if( numSubNds > 0 && numUpdatedInSubNodes <= 0 ){
		//should recombine subnodes
		//DTPrintf("0 updtsIn subnds ", "unsubdiv", "color:#4444ff", this.depth);	
		let unDivRes = t.TryUnsubdivide();
	}

}

function TND_traceAddedTo( nd ){
	let str = "path added to ";
	while( nd ){
		str += "trNd " + nd.uid.val;
		if( nd.parent ){
			for( let i = 0; i < nd.parent.subNodes.length; ++i )
				if( nd.parent.subNodes[i] == nd )
					str += ":sNiDx:" + i + ":depth:" + nd.depth + "  ";
		}
		str += " par-> ";
		nd = nd.parent;
	}
	return str;
}

function TND_addToAxisSortedObjects( axisSortedObjects, obj ){
	for( let i = 0; i < vertCard; ++i ){
		let axisSorted = axisSortedObjects[i];
		for( let j = 0; j < axisSorted.length; ++i ){
			if( obj.AABB.center < axisSorted[j].AABB.center[i] )
				axisSorted.splice(j,0, obj);
		}
	}
}
function TND_removeFromAxisSortedObjects( axisSortedObjects, obj ){
	for( let i = 0; i < vertCard; ++i ){
		let axisSorted = axisSortedObjects[i];
		for( let j = 0; j < axisSorted.length; ++i ){
			if( obj.uid == axisSorted[j].uid )
				axisSorted.splice( j,0 );
		}
	}
}

function TND_GetEmptySpaceRangesForAxis( t, a ){
	let ranges = [];//t.AABB.minCoord[a], t.AABB.maxCoord[a] ];

	for( let i = 0; i < vertCard; ++i ){
		ranges.push( [] );
		let sortedObjsForA = axisSortedObjects[i];
		let rmin = t.AABB.minCoord[i];
		for( let j = 0; j < sortedObjsForA.length; ++j ){
			let rmax = sortedObjsForA[j].AABB.minCoord[i];
			ranges[i].push([rmin,rmax]);
			rmin = sortedObjsForA[j].AABB.maxCoord[i];
		}
		ranges.push( [ rmin, t.AABB.maxCoord[i] ] );
	}
	return ranges;

}

function TND_addToThisNode( t, nLvsMDpth, object ){

	let isCocentric = false;
	let cocenDist = 0;
	let cocenObj = null;

	for( let i = 0; i < t.objInsertIdx; ++i ){

		let cenDist = Vect3_Distance( t.objects[i].AABB.center, object.AABB.center );
		if( cenDist < minNodeSideLength ){
			isCocentric = true;
			cocenDist = cenDist;
			cocenObj = t.objects[i];
			break;
		}

	}

	if( isCocentric ){
		DPrintf( "addToThisNode failed t.uid" + t.uid.val + " objMeshName " + object.meshName );
		nLvsMDpth[0] = -1; return; //overlaps in 3 axies ( intersects another object, can't insert )
	}

	//else ok to add object
	t.objects[t.objInsertIdx++] = object;
	TND_addToAxisSortedObjects( t.axisSortedObjects, object );
	object.treeNodes[ t.uid.val ] = t; //link this to the object so it knows where to remove itself from later

	//add to obj dictionary for quickly checking if an object is present
	t.objectDictionary[ object.uid.val ] = t.objInsertIdx-1;
	nLvsMDpth[0] = 0; return;
}

//given the sub node index (0 or 1) returns the objects that overlap it in the given axis
function TND_subNdObjDictForAxs(t, axs, subNdIdx, numNdAxs, srcCoords){ 
	//get the min and max bounds for the sub node
	let lowerBoundForAxs = srcCoords[subNdIdx][axs];
	let upperBoundForAxs = srcCoords[subNdIdx+1][axs];
	let obDict = {};
	//DTPrintf("subNdDict axs " + axs + " idx " + subNdIdx + 
	//" lwr " + lowerBoundForAxs + " uppr " + upperBoundForAxs + 
	//" srcCoords " + srcCoords, "ot subdiv", "color:#225555", this.depth);
	for( let i = 0; i < MaxTreeNodeObjects; ++i ){
		let ob = t.objects[i];
		if( ob != null ){
			if( ob.AABB.maxCoord[axs] >= lowerBoundForAxs &&
				ob.AABB.minCoord[axs] <= upperBoundForAxs ){ //check for opposite of the two conditions where it would be outside the node
				obDict[ob.uid.val] = ob;
				//if( ob.subNdsOvlapd == undefined )
				//	ob.subNdsOvlapd = {};
				//if( ob.subNdsOvlapd[ axs ] == undefined )
				//	ob.subNdsOvlapd[ axs ] = {};
				//ob.subNdsOvlapd[ axs ][ subNdIdx ] = 1;
			}
		}
	}
	return obDict;
}

//remove an object from a leaf tree node
//(possibly atteming to unsubdividing the node if after it is removed
//the node contains < MaxTreeNodeObjects/2 )
function TND_RemoveFromThisNode( t, object ){
	//if this isn't the root node and doesn't have a parent, 
	//then the node has been removed from the tree and don't need
	//to update its object refrences here
	//because this tree node is discarded (to be garbage collected)
	if( t.root == t || t.parent ){

		let objIdx = t.objectDictionary[object.uid.val];

		if( t.objects[objIdx] == object ){
			t.objects.splice(objIdx,1); //shift objects up filling space to remove 
			//(splice returns an array with the removed element and modifies the existing array to not have the returned elements)
			t.objects[MaxTreeNodeObjects-1] = null; //append empty space to end of 1 shorter array
			//remove from the sorted arrays
			TND_removeFromAxisSortedObjects( t.axisSortedObjects, object );

			t.objInsertIdx -= 1; //decrease the insert index
		}

		//shift up the obj indicies in the dictionary
		for( let i = objIdx; i < t.objInsertIdx; ++i )
			t.objectDictionary[ t.objects[i].uid.val ] = i;

		//remove from object dictionary
		delete t.objectDictionary[object.uid.val];

		if( t.objInsertIdx < MaxTreeNodeObjects/2 ){
			let unsubDivRes = TND_TryUnsubdivide(t);
			DTPrintf("unsubdivide initiating obj " + object.uid.val + 
				" node min " + t.AABB.minCoord + " max " + t.AABB.maxCoord +
				" node depth " + t.depth + " maxDepth " + t.maxDepth + " unSubDivRes " + unsubDivRes, "unsubdiv", "#4444ff", t.depth);
		}

	}

}

function TND_TryUnsubdivide( t ){ //can only be called on a leaf node

	//if the number of unique objects
	//(objects may cross subnodes so may appear in 1 to all 8 of the parent's subnodes)
	//is less than the MaxTreeNodeObjects, then remove the subnodes and add all their objects to the parent
	if(t.parent){ //may be a already disconnected leaf sibling or the tree parent if parent is null 
		//(in which case don't need to / shouldn't do anything)
		let par = t.parent;
		if( par.maxDepth - par.depth > 1 ) //prevent unsubdividing when all subNodes aren't the same depth subNodes must be un-subdivided first
			return -1;
		let parSn = t.parent.subNodes;
		let siblingSubNdObjs = {}; //get a unique list of all objects in subnodes
		let subNdCt = 0; //if zero (already unsubdivided) don't try to unsubdivide
		//count the subnodes and objects
		for( let i = 0; i < parSn.length; ++i){
			if( parSn[i] ){ //if the subnode exists
				if( parSn[i].nNLvs != undefined && parSn[i].nNLvs[0] > 0 ){
					let snDpthsStr = "";
					for( let j = 0; j < parSn.length; ++j ){
						if( parSn[j] )
							snDpthsStr += j + " : mDpth " + parSn[j].maxDepth + " dpth " + parSn[j].depth + " nNLvs " + parSn[j].nNLvs + "\n";
					}
					DTPrintf("trying to unsubdivide when there are subnodes " + 
						"this dpth " + t.depth + " par depth " + par.depth + "\n" +
						"par maxDepth " + par.maxDepth + " this maxDepth " + t.maxDepth + "\n" +
						" subndIdx " + i + " parSn[i].nNLvs " + parSn[i].nNLvs + "\n" +
						" parSn arr \n" + snDpthsStr, "unsubdiv", "color:red", t.depth );
					return -1;
				}
				subNdCt += 1;
				//let subNdObjs = parSn[i].getUpToNObjsInAndBelowNode(MaxTreeNodeObjects);
				for( let j = 0; j < parSn[i].objInsertIdx; ++j ){
					let obj = parSn[i].objects[j]; //add each object by uid to list of objects under the parent
					siblingSubNdObjs[ obj.uid.val ] = obj; //dictionary to avoid adjacent node duplicates
				}
			}
		}


		let objUids = Object.keys(siblingSubNdObjs);
		if( subNdCt > 0 && objUids.length < MaxTreeNodeObjects ){ //obj count is low enough for subnodes to be recombined
			for( let i = 0; i < parSn.length; ++i){ //remove and disconnect all sibling subnodes
				if( parSn[i] ){
					for( let j = 0; j < parSn[i].objInsertIdx; ++j ){
						delete( parSn[i].objects[j].treeNodes[ parSn[i].uid.val ]); //disconnect objects from subnode
					}
					parSn[i].parent = null; //signify in the subnode has been unsubdivided
					parSn[i] = null; //disconnect parent to subnode link
				}
			}

			par.maxDepth -= 1;
			par.leaves -= subNdCt-1;
			//t.maxDepth -= 1; //this node is being removed, if it remained it's max depth would be unchanged
			let parI = par.parent; //start propigating at the level above the parent because the level below it has been removed
			let nMaxDpth = t.maxDepth - 1;
			while( parI ){ //propigate the count update on this branch
				for( let si in parI.subNodes){
					if( parI.subNodes[si] )
						nMaxDpth = Math.max( nMaxDpth, parI.subNodes[si].maxDepth );
				}
				//if( nMaxDpth < parI.depth )
				//	console.log( "propigating small nMaxDpth " + nMaxDpth);
				parI.maxDepth = nMaxDpth;
				parI.leaves -= subNdCt-1; //-1 because the parent becomes a leaf
				parI = parI.parent; //next
			}
			//add objects to parent
			let nLvsMDpth = [0,0];
			for( let i = 0; i < objUids.length; ++i ){
				let obj = siblingSubNdObjs[objUids[i]];
				obj.numOctTreeNodesAddedTo = 
				TND_AddObject( par, nLvsMDpth, siblingSubNdObjs[objUids[i]] );
			}
			return 1;
		}else{
			return -2;
		}
	}else{
		return -3;
	}
}

//add an object to the node, if it is full - subdivide it 
//and place objects in the sub nodes
//returns 
//	the tree nodesAddedTo (by )
//	nLvsNLvls [num new leaves, num new depth levels, num new objs] (by refrence)
// adding an object may fail for the following reasons
//		-1 too many objects (sub divide was likely tried earlier add and failed)
//		-2 need to subdivide though the max depth has been reached
//		-3 need to subdivided though the min node size has been reached
//		-4 already subdivided (shouldn't happen)
function TND_AddObject( t, nLvsMDpth, object ){

	let objAABB = object.AABB;
	
	if( t == null )
		DPrintf("t == null objMeshName" + object.meshName);
	//fill nodes until they are full (prevent unessecary subdividing)
	//don't add objects if they intersect existing ones
	//(if necessary the smaller object should be parented to the one with enclosing aabb)
	if( t.subNodes[0] == null ){ //not yet subdivided, try to add to self
		
		if( t.objInsertIdx >= MaxTreeNodeObjects ){ 
			//sub divide was likely tried when adding to this node earlier and failed 
			//causing the number of objects in this node to already be maxed out
			nLvsMDpth[0] = -1; nLvsMDpth[1] = 0; nLvsMDpth[2] = 0;
			return;
		}

		if( t.objectDictionary[ object.uid.val ] != undefined ){ 
			//maybe this check should be after TND_addToThisNode
			DTPrintf( "not really sure if this is a valid reason for AddObject fail", "ot add error", "color:red", t.depth );
			nLvsMDpth[0] = -1; nLvsMDpth[1] = 0; nLvsMDpth[2] = 0;
			return; 
		}

		//there should be capacity in this node to add the object, attempt to add it
		TND_addToThisNode(t, nLvsMDpth, object);

		if( nLvsMDpth[0] < 0 ){ //the obj's overlapped (failed to add to this node)
			return;
		}

		if( t.objInsertIdx >= MaxTreeNodeObjects ){ //need to try to subdivide

			//only leaf nodes should contain objects to avoid overlap ambiguity 
			//(and so during raycasting rays only need check leaves while traversing)
			if( t.depth+1 > MaxTreeDepth ){
				//limit depth to avoid running out of memory 
				//(if a mistake causes allot of object adding adding and tree division 
				//this should prevent infinite looping and running out of memory)

				nLvsMDpth[0] = -2; nLvsMDpth[1] = 0;  //signify the max depth has been reached
				TND_RemoveFromThisNode(t, object);
				t.subNodes = [null,null,null,null,  null,null,null,null]
				return; 
			}

			//split the node until there are only MaxTreeNodeObjects per node

			//attempt to create the up to 8 (2x minmin minmax and maxmin maxmax ) nodes
			let srcCoords = [t.AABB.minCoord, Vect3_CopyNew(t.AABB.center), t.AABB.maxCoord];
			let numNodesCreated = TND_generateSubNodes(t, srcCoords); //[numNodesCreated, num[x,y,z] ]

			if( numNodesCreated < 2 ){ //min node size has been reached (couldn't subdivide)

				nLvsMDpth[0] = -3; nLvsMDpth[1] = 0;
				TND_RemoveFromThisNode(t, object);
				t.subNodes = [null,null,null,null,  null,null,null,null] 
				return;
			}


			let objsAdded = {};
			let leavesCreated = 0;
			let maxNewDpth = t.maxDepth;
			let maxObjsInNde = 0;

			for(let z = 0; z < t.nNLvs[1][2]; ++z){ //divide the objects between the sub nodes (for now assume there are no divPt overlaps)
				let zObDict = TND_subNdObjDictForAxs(t, 2, z, t.nNLvs[1][2], srcCoords);
				for(let y = 0; y < t.nNLvs[1][1]; ++y){
					let yObDict = TND_subNdObjDictForAxs(t, 1, y, t.nNLvs[1][1], srcCoords);
					for(let x = 0; x < t.nNLvs[1][0]; ++x){
						let xObDict = TND_subNdObjDictForAxs(t, 0, x, t.nNLvs[1][0], srcCoords);


						let subNdIdx = x+y*2+z*4;
						let nd = t.subNodes[subNdIdx]; //get the sub node


						let objsAttemptedToAdd = {};
						let xObDictKeys = Object.keys( xObDict );
						for( let obUidIdx = 0; obUidIdx < xObDictKeys.length; obUidIdx++ ){
							let obUid = xObDictKeys[obUidIdx];
							if( xObDict[ obUid ] && yObDict[ obUid ] && zObDict[ obUid ] ){ //add the intersecting subset of objects of the 3 axies into the subnode

								if( objsAttemptedToAdd[ obUid ] == undefined )
									objsAttemptedToAdd[ obUid ] = "";
								objsAttemptedToAdd[ obUid ] += subNdIdx + " ";

								let nNLvsMDpth = [0,0];
								let obToAdd = xObDict[obUid];

								TND_AddObject( nd, nNLvsMDpth, obToAdd );

								if( nNLvsMDpth[0] >= 0 ){ //added the object
									objsAdded[obUid] = obUid;

									leavesCreated += nNLvsMDpth[0];
									if( nNLvsMDpth[1] > maxNewDpth )
										maxNewDpth = nNLvsMDpth[1];
									if( nd.objInsertIdx > maxObjsInNde )
										maxObjsInNde = nd.objInsertIdx;

								}else{// subDiv AddObject failed
									DTPrintf("failed to add " + xObDict[obUid].meshName + " " + xObDict[obUid].uid.val + " to nd " + nd.uid.val, "ot add error", "color:red", t.depth );
								}
							}//else xObDict[ obUid ].notAddedStr
						}

					//if( Object.keys( obsShouldAddToNode ).length != Object.keys( objsAttemptedToAdd ).length )
					//	DTPrintf( "subNdObjDictForAxs didn't match all objs for node", "ot add error", "color:red", t.depth );
						
					}
				}
			}

			//check the subdivision was successful
			//all objects could be added and that the max num objs in each node has decreased
			let addedObjs = Object.keys(objsAdded);
			let allObjsLen = t.objInsertIdx;
			if( addedObjs.length < allObjsLen ){
				//the subdivision didn't work because some objects failed to add after subdivision

				nLvsMDpth[0] = -4; nLvsMDpth[1] = 0;
				t.subNodes = [null,null,null,null,  null,null,null,null]
				TND_RemoveFromThisNode(t, object);
				return;
			}else{

				/*
				//check that at least one node didn't get all the objects
				let minNumObjsInASubNode = MaxTreeNodeObjects;
				let maxNumObjsInASubNode = 0;
				for( let i = 0; i < t.subNodes.length; ++i ){
					if( t.subNodes[i] != null ){
						let subNdObjs = t.subNodes[i].objInsertIdx;
						if( subNdObjs < minNumObjsInASubNode )
							minNumObjsInASubNode = subNdObjs;
						if( subNdObjs > maxNumObjsInASubNode )
							maxNumObjsInASubNode = subNdObjs;
					}
				}


				if( minNumObjsInASubNode == maxNumObjsInASubNode ){

					//" failed to seperate objects during subdivision " + "ot add error"
					nLvsMDpth[0] = -4; nLvsMDpth[1] = 0;
					t.subNodes = [null,null,null,null,  null,null,null,null];
					TND_RemoveFromThisNode(t, object);

				}else{
				*/
					//subdivision success

					//remove object's association to this treeNode
					//since it is going to be added to one or more of the subnodes
					for( let i = 0; i < t.objInsertIdx; ++i ){
						delete t.objects[i].treeNodes[t.uid.val];
					}
					
					TND_initObjects(t); //clear the object array and dictionary
					t.leaves = t.nNLvs[0] + leavesCreated; //this treeNode has become a parent add the count of generateSubNodes
					//and any created when adding to a new subnode
					t.maxDepth = maxNewDpth;


					//the node was successfuly subdivided and objects distributed to sub nodes such that
					//all nodes have less than MaxTreeNodeObjects

					//parent max depth and leaf count update is based on the nLvsMDpth values
					nLvsMDpth[0] = t.nNLvs[0] + leavesCreated;

				//}

			} //end successfully subdivided and added obj to sub node

		}//end need to try to subdivide
		else{ //didn't subdivide, added to the initially passed in node t
			//object.treeNodes updated in the subdivision
			//TND_AddObject( nd, nNLvsMDpth, obToAdd ); -> TND_addToThisNode
			//call above
		}


		nLvsMDpth[1] = t.maxDepth;
		// "ot add success"

	}//end added to this node or created new sub nodes and 
	else{ //already subdivided, decide which sub nodes it should be added to

		let maxNewDpth = t.maxDepth;
		for(let i = 0; i < t.subNodes.length; ++i){
			let subnode = t.subNodes[i];
			if( subnode ){

				let ovlapPct = AABB_OthrObjOverlap( subnode.AABB.minCoord, subnode.AABB.maxCoord, object.AABB.minCoord, object.AABB.maxCoord );

				if( ovlapPct > 0 ){

					let snNLvsMDpth = [0,0];
					TND_AddObject( subnode, snNLvsMDpth, object );
					
					if( snNLvsMDpth[0] > 0 ) //num new leaves > 0
						nLvsMDpth[0] += snNLvsMDpth[0];
					if( snNLvsMDpth[1] > nLvsMDpth[1] ) //max depth from add obj > maxNewDpth
						nLvsMDpth[1]  = snNLvsMDpth[1];
					if(ovlapPct >= 1) //skip checking other subnodes if fully in this one
						break;
				}
			}
		}
		t.maxDepth = nLvsMDpth[1];
		t.leaves += nLvsMDpth[0];


	}



	return;
}

function TND_SubNode( t, point ){
	//find which node the ray origin is in
	//to start tracing though node walls and objects from the ray's starting point
	if(!t.enabled)
		return null;

	if( point[0] >= t.AABB.minCoord[0] && 
		point[1] >= t.AABB.minCoord[1] && 
		point[2] >= t.AABB.minCoord[2] && //each axis of the point is greater than those of the min coord
		point[0] <= t.AABB.maxCoord[0] && 
		point[1] <= t.AABB.maxCoord[1] && 
		point[2] <= t.AABB.maxCoord[2] ){ //each axis of the point is also less than those of the max coord

		//theirfore the ray origin is in this node

		//check the subnodes of this node if it has any
		for( let i = 0; i < t.subNodes.length; ++i ){
			if( t.subNodes[i] != null ){
				var node = TND_SubNode( t.subNodes[i], point );
				if( node != null )
					return node;
			}
		}

		return t; //the origin is in this node and this node 
		//is a leaf node ( doesn't have sub nodes / children )
		//or it was in this node and this node isn't a leaf node 
		//but it wasn't in one of the leaf nodes ( shouldn't happen )

	}else{
		return null; //the point is outside this node, null will allow 
	} //the calling instance of this function to try another node

}

function TND_GetNodesInFrustum( t, wrldToFrusMat, frusMaxFov, frusOrigin, retNodeMap ){
	if( FRUS_AABBOverlaps( wrldToFrusMat, t.AABB ) > 0 ){ //overlaps with the aabb

		//if the node occupies a significant on screen area (check it's sub nodes)
		//calculate the size of the oct tree node on screen
		let distFromCam = Vect3_Distance( t.AABB.center, frusOrigin );
		//given the distance and field of view in radians, find the length of the diagonal
		//in -1,1 screen coodrdinates
		t.nodePctOfHalfScreenWidth = Math.atan( t.AABB.diagLen/distFromCam ) / (frusMaxFov/180*Math.PI);
		if( t.nodePctOfHalfScreenWidth > 0.1 ){

			if( t.objInsertIdx > 0 ){ //this node has objects
				retNodeMap.set( t.uid.val, t ); //return the node
			}else{ //attempt to recurse into subnodes 
				for( let i = 0; i < t.subNodes.length; ++i ){
					if( t.subNodes[i] ){
						TND_GetNodesInFrustum( t.subNodes[i], wrldToFrusMat, frusMaxFov, frusOrigin, retNodeMap );
					}
				}
			}

		}

	}
}

function TND_addMdlsAndArmaturesInNodeToRasterBatch( mdls, armatures, t ){
	for( let i = 0; i < t.objInsertIdx; ++i ){ //loop through the objects
		let mdl = t.objects[ i ];
		mdls[mdl.uid.val] = mdl; //add each model
		let skelAnim = mdl.skelAnimation;
		if( skelAnim != null ){
			armatures[skelAnim.uid.val] = skelAnim; //add each armature
			//also add other models that use the armature
			for( let aMdlIdx = 0; aMdlIdx < skelAnim.animatedModels.length; ++aMdlIdx ){
				let aMdl = skelAnim.animatedModels[aMdlIdx];
				mdls[aMdl.uid.val] = aMdl;
			}
		}
	}
}

//function TND_GetObjectsInFrustum( t, wrldToFrusMat, frusMaxFov, frusOrigin, retObjMap ){


//	if( FRUS_AABBOverlaps( wrldToFrusMat, t.AABB ) > 0 ){ 
//		//overlaps with the aabb
//		if( t.objInsertIdx > 0 ){ //if this node has objects
//		
//			for( let i = 0; i < t.objInsertIdx; ++i ) //loop through the objects
//				retObjMap.set(t.objects[ i ].uid.val, t.objects[ i ]);
//		
//		}else{ //attempt to recurse into subnodes 
//		
//			//if occupies a significant on screen area
//			//calculate the size of the oct tree node on screen
//			let distFromCam = Vect3_Distance(t.AABB.center, frusOrigin);
//			//given the distance and field of view in radians, find the length of the diagonal
//			//in -1,1 screen coodrdinates
//			let nodePctOfHalfScreenWidth = Math.atan( t.AABB.diagLen/distFromCam ) / frusMaxFov;
//			if( nodePctOfHalfScreenWidth > 0.1 ){
//				for( let i = 0; i < t.subNodes.length; ++i ){
//					if( t.subNodes[i] ){
//						TND_GetObjectsInFrustum(t.subNodes[i], wrldToFrusMat, frusMaxFov, frusOrigin, retObjMap );
//					}
//				}
//			}
//			
//		}
//	}

//}

const OT_TYPE_QuadMesh = 0;
const OT_TYPE_Face = 1;
const OT_TYPE_Model = 2;

function TND_RayIntersect( obj, tempObjInt, ray ){
	switch( obj.otType ){
		case OT_TYPE_QuadMesh:
			return QM_RayIntersect( obj, tempObjInt, ray );
		case OT_TYPE_Face:
			return QMF_RayIntersect( obj, tempObjInt, ray );
		case OT_TYPE_Model:
			return MDL_RayIntersect( obj, tempObjInt, ray );
	}
}

let rayAABBIntPt = Vect3_New();
function TND_StartTrace( t, retDisNormCol, ray, minTraceTime ){
	//could be called with a ray origin inside or outside the oct tree
	let startTraceNode = t;
	if( !AABB_ContainsPoint( t.AABB, ray.origin ) ){
		//the ray origin is outside the oct tree

		const rayEnterStep = AABB_RayIntersects(t.AABB, ray, minTraceTime );
		if( rayEnterStep < minTraceTime ){
			retDisNormCol[0] = -1;
			return; //the ray didn't intersect with the oct tree
		}
		//Vect3_Copy( rayAABBIntPt, t.AABB.rayStepPoints[t.AABB.rayStepPtIntIdx] );

		ray.PointAtTime( rayAABBIntPt, rayEnterStep );//+ rayStepEpsilon );
		/*
		if( !AABB_ContainsPoint(t.AABB, rayAABBIntPt ) ){
			//retDisNormCol[2] = [1,0,1,1];
		}else{
			//retDisNormCol[2] = [1,1,0,1];
		}
		//retDisNormCol[0] = rayEnterStep;
		*/

	}else{ //the ray origin is inside the oct tree
		Vect3_Copy( rayAABBIntPt, ray.origin );
		//retDisNormCol[2] = [1,0,0,1];
		//retDisNormCol[0] = 1;
	}

	startTraceNode = TND_SubNode( t, rayAABBIntPt );
	if( !startTraceNode ){ 
		//possibly from floating point precision at edge of a node
		//DTPrintf("null startTraceNode", "ot trace error" );
		startTraceNode = t;
		//retDisNormCol[0] = 1;
		return;
	}

	TND_Trace( startTraceNode, retDisNormCol, ray, minTraceTime );
}


//to be called when the node is filled with the max number of objects
//uses best dividing point found from FindMinOverlapClosestToCenterDivPoint
//returns the [ total numNodesCreated, num nodes per axis[x,y,z] ]
function TND_generateSubNodes(t, srcCoords){
	//subDivAddDepth += 1;
	//if( subDivAddDepth > 1){
	//	DTPrintf( "potential for add error subDivAddDepth " + subDivAddDepth + 
	//		" tNId " + this.uid.val + " dpth " + this.depth + 
	//		" srcCoords " + Vect3_ArrToStr( srcCoords, 2, 6 ), "ot add error", "color:maroon", this.depth);
	//}

	if( t.nNLvs[0] > 0 ){ //if already subdivided don't generate new
		//DTPrintf("tNId " + this.uid.val + " dpth " + this.depth + " already subdivided", 
		//	"ot add error", "color:#e26b31", this.depth );
		return -4;       //nodes (would loose objects)
	}

	//this.root.maxDepth += 1;

	//corners of the sub nodes (given min=0,mid=1,max=2 parent source coordinates) are
	//[0,0,0](0,0,0:1,1,1)	[1,0,0](1,0,0:2,1,1) //bottom layer
	//[0,1,0](0,1,0:1,2,1)	[1,1,0](1,1,0:2,2,1)
	//
	//[0,0,1](0,0,1:1,1,2)	[1,0,1](1,0,1:2,1,2) //top layer
	//[0,1,1](0,1,1:1,2,2)	[1,1,1](1,1,1:2,2,2)
	//the pattern above is in the loop below:


	let numNodesCreated = 0;


	//generates the min and max sub/child node corners
	let nDpth = t.depth+1;
	let maxDpth = t.root.maxDepth;
	let subNdIdx = 0;

	t.nNLvs[1][0] = 2;
	t.nNLvs[1][1] = 2;
	t.nNLvs[1][2] = 2; //num new nodes per axis
	//check each axis if the min node side has already been reached
	//if it has don't divide that axis and set the upper srcCoord for the axis to the parent max
	if( srcCoords[2][0] - srcCoords[0][0] < minNodeSideLength ){
		t.nNLvs[1][0] = 1; srcCoords[1][0] = t.AABB.maxCoord[0]; }
	if( srcCoords[2][1] - srcCoords[0][1] < minNodeSideLength ){
		t.nNLvs[1][1] = 1; srcCoords[1][1] = t.AABB.maxCoord[1]; }
	if( srcCoords[2][2] - srcCoords[0][2] < minNodeSideLength ){
		t.nNLvs[1][2] = 1; srcCoords[1][2] = t.AABB.maxCoord[2]; }

	if( t.nNLvs[1][2] + t.nNLvs[1][1] + t.nNLvs[1][0] < 2 ){ //if not going to subdivide return
		t.nNLvs[0] = numNodesCreated;
		return 0;
	}

	for(let z = 0; z < t.nNLvs[1][2]; ++z){
		for(let y = 0; y < t.nNLvs[1][1]; ++y){
			for(let x = 0; x < t.nNLvs[1][0]; ++x){
				let nNdeMin = [srcCoords[x+0][0],srcCoords[y+0][1],srcCoords[z+0][2]];
				let nNdeMax = [srcCoords[x+1][0],srcCoords[y+1][1],srcCoords[z+1][2]];
				//create the subnode
				subNdIdx = x+y*2+z*4;
				let newPhysNode = null;
				if( t.physNode )
					newPhysNode = PHYS_ND_CopyNew( t.physNode );
				t.subNodes[subNdIdx] = new TreeNode(nNdeMin, nNdeMax, t, newPhysNode);
				numNodesCreated += 1;
				
				//set the debug oct tree color based on axis and depth
				//this.subNodes[subNdIdx].boundColor[0] = (1-(nDpth)/maxDpth)*x;
				//this.subNodes[subNdIdx].boundColor[1] = (1-(nDpth)/maxDpth)*y;
				//this.subNodes[subNdIdx].boundColor[2] = (1-(nDpth)/maxDpth)*z;
				
				//subNdIdx += 1;
			}
		}
	}
	t.nNLvs[0] = numNodesCreated;
	return numNodesCreated;
}

let nextNodeRayPoint = Vect3_NewZero();

function TND_Trace( t, retDisNormCol, ray, minTraceTime ){
	//returns data from nearest object the ray intersects

	let tempObjInt = NewDistNormColor();
	let bestObjInt = NewDistNormColor();
	let swapObjInt = null;

	if( !t.enabled )
		return;
	//traverses the binary oct tree, assumes this is a leaf node
	//checking objects in each node traversed for intersection with the ray
	//if no object intersections occur, 
	//the ray origin is advanced to the wall of the node it exits
	//and traversal returns to the parent node to check it's children for
	//the spatially adjacent node


	//find which wall of this node the ray exits and which node it enters

	//min trace time avoids getting intersection 
	//with the entrance wall again

	//increasing the wall intersection ray time by epsilon 
	//(is done in next GetClosestIntersecting surface call)
	//generating a new ray point (which is inside the adjacent node)
	const rayExitStep = AABB_RayIntersects(t.AABB, ray, minTraceTime );
	if( rayExitStep < 0 ){ 
		//somehow the ray started outside of this node and didn't intersect
		//with it
		retDisNormCol[0] = -1;
		return;
	} //ray has exited the entire oct tree


	//check if any objects in this node intersect with the ray
	//if the object aabb intersects, the object has to be tested, because a
	//small object aabb may be inside and infront of a larger object with
	//overlapping aabb
	bestObjInt[0] = -1;
	for( let i = 0; i < t.objInsertIdx; ++i ){
		//loop through the objects (if one isn't yet loaded, it is ignored)

		if( ray.lastNode == null || 
			ray.lastNode.objectDictionary[ t.objects[i].uid.val ] == null ){ //don't recheck if checked last node
			//check if the ray intersects the object
			//if( t.objects[0][i].fNum && t.objects[0][i].fNum == 8 )
			//	DTPrintf("aabb int test with 8", "ot trace");


			tempObjInt[0] = -1;
			tempObjInt[3] = retDisNormCol[3];
			TND_RayIntersect( t.objects[ i ], tempObjInt, ray );
			if( tempObjInt[0] > 0 && (bestObjInt[0] == -1 || tempObjInt[0] < bestObjInt[0]) ){
				swapObjInt = bestObjInt;
				bestObjInt = tempObjInt;
				tempObjInt = swapObjInt;
			}
		}
	}

	if( bestObjInt[0] > 0 ){
		retDisNormCol[0] = bestObjInt[0];
		Vect_Copy( retDisNormCol[2], bestObjInt[2] );
		//t.rayHitsPerFrame++;
		totalFrameRayHits++;
		return;
	} //return the result from the closest object intersection


	//didn't intersect and object in this node

	//get a point along the ray inside the next node
	const rayNextNodeStep = rayExitStep + rayStepEpsilon;
	RayPointAtTime( nextNodeRayPoint, ray.origin, ray.norm, rayNextNodeStep );

	//find the next node starting at the current node and going up the tree
	//until there is a subnode that contains the next node point
	let parentNode = t;
	let nextTraceNode = null;
	while( nextTraceNode == null ){ //next node has not yet been found
		nextTraceNode = TND_SubNode( parentNode, nextNodeRayPoint );
		if( nextTraceNode == null ){ //go up the hierarchy and try again
			parentNode = parentNode.parent; //up one level
			if( parentNode == null ){
				retDisNormCol[0] = -1;
				return; //the ray is outside the root node world space
			}
		}
	}
	if( nextTraceNode != null ){
		//the ray didn't hit anything in this node
		if( treeDebug && t.depth == Math.floor((sceneTime/2)%(t.root.maxDepth+1)) ){
			t.boundColor[3] = debOctOpac;
			mainScene.cameras[0].AddPoint( nextNodeRayPoint, t.boundColor );
		}

		ray.lastNode = t;
		return TND_Trace( nextTraceNode, retDisNormCol, ray, rayExitStep );
	}

	//this shouldn't be reached because of above if parent node == null
	retDisNormCol[0] = -1;
}



const MaxTreeDepth = 15;
const minNodeSideLength = 0.01;
const MaxTreeNodeObjects = 8; //must be a power of 2 for merge sort during trace
var totalFrameRayHits = 0;
const rayStepEpsilon = 0.0001;
function TreeNode( minCoord, maxCoord, parent, physNode ){

	this.enabled = true; //for enab/disab using hierarchy for debugging
	this.rayHitsPerFrame = 0;

	this.AABB = new AABB( minCoord, maxCoord );

	this.uid       = NewUID();

	this.parent  = parent; //link to the parent ( to allow traversing back up the tree )
	this.physNode = physNode;

	if( parent ){
		this.depth = parent.depth+1;
		this.root = parent.root;
		this.maxDepth = parent.depth+1;
	}else{ //inital node in a tree
		this.depth = 0;
		this.root = this;
		this.maxDepth = 0;
	}

	this.leaves = 1; //number of leaf nodes below or including this node (any new node is a leaf)
	this.nNLvs = [0, [0,0,0]]; //after subdividing number of children and divisions per axis (x,y,z)

	this.objects = new Array(MaxTreeNodeObjects);  //the per tree node objects
	this.axisSortedObjects = [[],[],[]];

	TND_initObjects(this);

	this.subNodes = [null,null,null,null,  null,null,null,null];

	this.nodePctOfHalfScreenWidth = 0; //for level of detail

	//this.boundColor = new Float32Array([0,0,0,0.5]);

	//idealy the oct treebounds are 32-64bit integers (to avoid precision loss
	//with distance from the origin)
	//and every node / sub division has a fill/occupancy type
	//i.e vaccum, air, water, elemental material, etc 
	//(for ray energy dissipation / participating media scattering )

	//check all objects below this node in the oct tree for collisions / physics constraints
	//later may add count of nodes requested/updated to signify completion if asynchronus
	//phases/steps should wait for each to complete to maintain synchronization if multithreaded/cross computer

}
var nodeNum = 0; //the oct tree node debug draw traversal number

/*
//functions for when was developing / testing physics with 2d dimensional visualization

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

		let vals = [0,0,0,1];
		//vals[this.axis] = 255;
		lw = 1;

		if( drawOctT ){
			//draw outline lines of this node
			let rgbString = "rgba("+vals[0]+","+vals[1]+","+vals[2]+","+vals[3].toPrecision(3)+")";
			fCtx.fillStyle = rgbString;
			fCtx.fillRect( this.AABB.minCoord[0]   , this.AABB.minCoord[1]   , this.AABB.maxCoord[0] - this.AABB.minCoord[0], lw); //top line
			fCtx.fillRect( this.AABB.minCoord[0]   , this.AABB.maxCoord[1]-lw, this.AABB.maxCoord[0] - this.AABB.minCoord[0], lw); //bottom
			fCtx.fillRect( this.AABB.minCoord[0]   , this.AABB.minCoord[1]   , lw, this.AABB.maxCoord[1] - this.AABB.minCoord[1]); //left
			fCtx.fillRect( this.AABB.maxCoord[0]-lw, this.AABB.minCoord[1]   , lw, this.AABB.maxCoord[1] - this.AABB.minCoord[1]); //right
		}

		if( this.leaves < 2 ){ //if it is a leaf node (has objects)
			//fill the background
			vals[0] = 255;
			vals[1] = 180;
			vals[2] = 255;
			if( this.root.maxDepth == 0 )
				vals[3] = 0.2;
			else
				vals[3] = (1- ( (this.depth-1) / this.root.maxDepth ) )* 0.2;


			rgbString = "rgba("+vals[0]+","+vals[1]+","+vals[2]+","+vals[3].toPrecision(3)+")";
			//console.log("dpth " + this.depth + " : maxDpth " + this.root.maxDepth + " alpha " + vals[3] + " rgbString " + rgbString );
			let nWidth  = this.AABB.maxCoord[0] - this.AABB.minCoord[0];
			let nHeight = this.AABB.maxCoord[1] - this.AABB.minCoord[1];
			//console.log(this.AABB.m " dim " + nWidth + ":" + nHeight );
			fCtx.fillStyle = rgbString;
			fCtx.fillRect(  this.AABB.minCoord[0]+lw, this.AABB.minCoord[1]+lw, nWidth-lw, nHeight-lw ); //fill center

			if( drawOctT ){
				//draw debugging text (node traversal number and number of objects inside)
				fCtx.font = '6pt arial';
				rgbString = "rgba(255,255,255,1)";
				fCtx.fillStyle = rgbString;
				let mMLbl = 'n';
				if(this.parent){
					for( let i = 0; i < this.parent.subNodes.length; ++i ){
						if( this.parent.subNodes[i] == this )
							mMLbl = 'i'+i;
					}
				}
				let txt = nodeNum+":"+this.objects[0].length+mMLbl; //":"+this.AABB.minCoord[0]+",\n"+this.AABB.minCoord[1]+
				let txtHWdth = fCtx.measureText( txt ).width/2;
				let halfAABBWidth = (this.AABB.maxCoord[0] - this.AABB.minCoord[0])/2;
				if(txtHWdth > halfAABBWidth )
					txtHWdth = halfAABBWidth;
				let textCenter = closestPointInAABBToCanvasCenter( this.AABB, [txtHWdth*1.2, 5], [fCtx.canvas.width/2, fCtx.canvas.height/2] );
				//console.log("textCenter " + textCenter );
				fCtx.fillText( txt, textCenter[0]-txtHWdth, textCenter[1] );
				
				//draw number on each object
				for( let i = 0; i < this.objects[0].length; ++i ){
					let cent = Vect3_CopyNew( this.objects[0][i].AABB.minCoord );
					Vect3_Add( cent, this.objects[0][i].AABB.maxCoord );
					Vect3_DivideScalar( cent, 2 );
					let txtN = nodeNum + ":" + i;
					let wdthH = fCtx.measureText( txtN ).width/2;
					fCtx.fillText( txtN, cent[0]-wdthH, cent[1] );
				}


				//draw color bar based on shared parent
				if(this.parent){
					fCtx.fillStyle = UIDToColorHexString( this.parent.uid );
					fCtx.fillRect( textCenter[0]-txtHWdth, textCenter[1]+2, txtHWdth*2,3 );
				}
			}
		}


		//draw the objects in this node
		for( let i = 0; i < this.objects[0].length; ++i ){
			this.objects[0][i].Draw(fCtx);
		}


		nodeNum+=1;

		//draw child nodes on top of this node if they exist
		for( let i = 0; i < this.subNodes.length; ++i ){
			if( this.subNodes[i] != null )
				this.subNodes[i].DebugDraw(fCtx);
		}
	}
*/
