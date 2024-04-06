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




const gravityAccel = [0,9.8, 0];

const MaxTreeDepth = 10;
const minNodeSideLength = 0.01;
const MaxTreeNodeObjects = 10;
var totalFrameRayHits = 0;
const rayStepEpsilon = 0.0001;
function TreeNode( minCoord, maxCoord, parent ){

	this.enabled = true; //for enab/disab using hierarchy for debugging
	this.rayHitsPerFrame = 0;

	this.AABB = new AABB( minCoord, maxCoord );
	
	this.uid       = NewUID();
	
	this.parent  = parent; //link to the parent ( to allow traversing back up the tree )

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
	this.nNLvs = [0, [0,0,0]];

	this.objects = [[],[],[]];  //the per axis positionally sorted objects
	this.objectDictionary = {}; //object uids in this node for checking if an object is present
	//(for ray traversal preventing checking objects twice (will likely be removed when
	//objects are subdivided instead of added to multiple nodes if they span node boundries)

	this.subNodes = [null,null,null,null,  null,null,null,null];

	//idealy the oct treebounds are 32-64bit integers (to avoid precision loss
	//with distance from the origin)
	//and every node / sub division has a fill/occupancy type
	//i.e vaccum, air, water, elemental material, etc 
	//(for ray energy dissipation / participating media scattering )

	//check all objects below this node in the oct tree for collisions / physics constraints
	//later may add count of nodes requested/updated to signify completion if asynchronus
	//phases/steps should wait for each to complete to maintain synchronization if multithreaded/cross computer
	this.ApplyExternAccelAndDetectCollisions = function( time ){
		for( let i = 0; i < this.objects[0].length; ++i ) //loop through the objects
			this.objects[0][ i ].physObj.ApplyExternAccelAndDetectCollisions(time, gravityAccel); //pass node so can check where updated from

		for( let i = 0; i < this.subNodes.length; ++i ) //recurse to sub nodes
			if( this.subNodes[i] )
				this.subNodes[i].ApplyExternAccelAndDetectCollisions( time );
	}
	this.LinkPhysGraphs = function( time ){ //combine constraint groups from each object
		for( let i = 0; i < this.objects[0].length; ++i )
			this.objects[0][ i ].physObj.LinkPhysGraphs(time);

		for( let i = 0; i < this.subNodes.length; ++i )
			if( this.subNodes[i] )
				this.subNodes[i].LinkPhysGraphs( time );
	}
	this.AppyInterpenOffset = function( time ){ //apply interpenetration offsets for constraint groups
		for( let i = 0; i < this.objects[0].length; ++i )
			this.objects[0][ i ].physObj.ApplyInterpenOffset(time);

		for( let i = 0; i < this.subNodes.length; ++i )
			if( this.subNodes[i] )
				this.subNodes[i].AppyInterpenOffset( time );
	}
	this.TransferEnergy = function( time ){ //transfer energy through constraints and forces from tree parent and per treeNode (vac, water/air etc)
		for( let i = 0; i < this.objects[0].length; ++i )
			this.objects[0][ i ].physObj.TransferEnergy(time, this);

		for( let i = 0; i < this.subNodes.length; ++i )
			if( this.subNodes[i] )
				this.subNodes[i].TransferEnergy( time );
	}
	this.DetectAdditionalCollisions = function( time ){
		//check if objects are still going to collide, 
		//in which case dissipate more of their energy
		//and only allow them to move in free directions
		let additionalColis = 0;
		for( let i = 0; i < this.objects[0].length; ++i )
			additionalColis += this.objects[0][ i ].physObj.DetectAdditionalCollisions(time, gravityAccel);

		for( let i = 0; i < this.subNodes.length; ++i )
			if( this.subNodes[i] )
				additionalColis += this.subNodes[i].DetectAdditionalCollisions( time );
		return additionalColis;
	}
	this.Update = function( time ){ //lineraly update object positions up to the end of the timestep
		let numUpdated = 0;
		for( let i = 0; i < this.objects[0].length; ++i ){
			this.objects[0][ i ].physObj.Update(time, gravityAccel, this);
			numUpdated += 1;
		}
		
		let numUpdatedInSubNodes = 0;
		let numSubNds = 0;
		for( let i = 0; i < this.subNodes.length; ++i ){
			if( this.subNodes[i] ){
				numSubNds += 1;
				numUpdatedInSubNodes += this.subNodes[i].Update( time );
			}
		}
		if( numSubNds > 0 && numUpdatedInSubNodes <= 0 ){
			//should recombine subnodes
			DTPrintf("0 updtsIn subnds ", "unsubdiv", "color:#4444ff", this.depth);	
			let unDivRes = this.TryUnsubdivide();
		}
		
	}
	
	function traceAddedTo( nd ){
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
	
	this.addToThisNode = function( nLvsMDpth, object ){

		//if( object.AABB.minCoord[0] == 312 && object.AABB.minCoord[1] == 46 ){
		DTPrintf("add at obj " + 
			Vect_ToFixedPrecisionString(object.AABB.minCoord,5) + " : " + 
			Vect_ToFixedPrecisionString(object.AABB.maxCoord,5) + "   nd  " + 
			Vect_ToFixedPrecisionString(this.AABB.minCoord,5) + " : " + Vect_ToFixedPrecisionString(this.AABB.maxCoord,5), "ot add",  "color:#ccffcc", this.depth );
		//}
		
		let isCocentric = false;
		let cocenDist = 0;
		let cocenObj = null;
		let numOvlapAxs = 0;
		let insertIdxs = [-1,-1,-1]; 
		for(let ax = 0; ax < 3; ++ax ){ //insertion sort the min edge of the objects
			let objMin  = object.AABB.minCoord;
		
			let lessThanIndex = -1;
			for( let i = 0; i < this.objects[ax].length; ++i ){
				let aObjMin = this.objects[ax][i].AABB.minCoord;

				if(  aObjMin[ax] < objMin[ax]  ){ //sort objects by obj array axis
					lessThanIndex = i; //increment the index until an obj min is greater than the new obj min
				}else{ break; }//because sorted, once a grtr obj is found, rest are greater
			}
			
			insertIdxs[ax] = lessThanIndex;
			
			
			//check if the new object overlaps with the previous or the next (if present)
			if( this.objects[ax].length > 0 ){
				var cmpIdx = lessThanIndex;
				if(cmpIdx < 0)
					cmpIdx = 0;
				//check the first obj in the array or one to come after it
				let ovlapPct = AABBsOverlap(this.objects[ax][cmpIdx].AABB, object.AABB);
				if( ovlapPct > 0 ){
					numOvlapAxs += 1;
					let cenDist = Vect3_Distance( this.objects[ax][cmpIdx].AABB.center, object.AABB.center );
					if( cenDist < minNodeSideLength ){
						isCocentric = true;
						cocenDist = cenDist;
						cocenObj = this.objects[ax][cmpIdx];
					}
				}
				//check the object before the new object if present
				if( cmpIdx-1 >= 0 ){
					let prevObjOvlapPct = AABBsOverlap(this.objects[ax][cmpIdx-1].AABB, object.AABB);
					if( prevObjOvlapPct > 0 ){
						numOvlapAxs += 1;
						let cenDist = Vect3_Distance( this.objects[ax][cmpIdx-1].AABB.center, object.AABB.center );
						if( cenDist < minNodeSideLength ){
							isCocentric = true;
							cocenDist = cenDist;
							cocenObj = this.objects[ax][cmpIdx];
						}
					}
				}
			}
			
			
		}
		
		if( !isCocentric /*numOvlapAxs < 3*/ ){ //if 3 axies overlap the objects intersect
			for(let ax = 0; ax < 3; ++ax ){ //insert into the axis sorted arrays
				this.objects[ax].splice(insertIdxs[ax]+1, 0, object);
			}
			object.treeNodes[ this.uid.val ] = this; //link this to the object so it knows where to remove itself from later
		}else{
			DTPrintf( "add failed otName " + this.root.name + " obj concentiric overlap obj " + object.uid.val + " objMin " + Vect_FixedLenStr( object.AABB.minCoord, 2, 6 ) + " objMax " + Vect_FixedLenStr( object.AABB.maxCoord, 2, 6 ) +
				" node " + this.uid.val + " ndNumObjs " +  this.objects[0].length + " cocenDist " + cocenDist + "\n" +
				"cocenObjUid " + cocenObj.uid.val +
				" cocenObjMin " + Vect_FixedLenStr( cocenObj.AABB.minCoord, 2, 6 ) + 
				" cocenObjMax " + Vect_FixedLenStr( cocenObj.AABB.maxCoord, 2, 6 )
				, "ot add error", "color:red", this.depth );
			nLvsMDpth[0] = -1; return; //overlaps in 3 axies ( intersects another object, can't insert )
		}
		
		DTPrintf( "addToThisNode success obj " + object.uid.val + " " + traceAddedTo(this), "ot add", "color:green", this.depth );
		
		//for quickly checking if an object is present
		this.objectDictionary[ object.uid.val ] = object;
		nLvsMDpth[0] = 0; return;
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

	//given the sub node index (0 or 1) returns the objects that overlap it in the given axis
	this.subNdObjDictForAxs = function(axs, subNdIdx, numNdAxs, srcCoords){ 
		//get the min and max bounds for the sub node
		let lowerBoundForAxs = srcCoords[subNdIdx][axs];
		let upperBoundForAxs = srcCoords[subNdIdx+1][axs];
		let obDict = {};
		DTPrintf("subNdDict axs " + axs + " idx " + subNdIdx + 
		" lwr " + lowerBoundForAxs + " uppr " + upperBoundForAxs + 
		" srcCoords " + srcCoords, "ot subdiv", "color:#225555", this.depth);
		for( let i = 0; i < this.objects[axs].length; ++i ){
			let ob = this.objects[axs][i];
			if( ob.AABB.maxCoord[axs] >= lowerBoundForAxs &&
				ob.AABB.minCoord[axs] <= upperBoundForAxs ){ //check for opposite of the two conditions where it would be outside the node
				obDict[ob.uid.val] = ob;
				if( ob.subNdsOvlapd == undefined )
					ob.subNdsOvlapd = {};
				if( ob.subNdsOvlapd[ axs ] == undefined )
					ob.subNdsOvlapd[ axs ] = {};
				ob.subNdsOvlapd[ axs ][ subNdIdx ] = 1;
			}
		}
		return obDict;
	}
	
	this.RemoveFromThisNode = function( object ){
		//if this isn't the root node and doesn't have a parent, 
		//then the node has been removed from the tree and don't need
		//to update its object refrences
		if( this.root == this || this.parent ){
	
			//remove from each axis
			for( let ax = 0; ax < 3; ++ax ){
				
				for( let i = 0; i < this.objects[ax].length; ++i ){
					if( this.objects[ax][i] == object ){
						this.objects[ax].splice(i,1);
						break;
					}
				}
				
			}
			//remove from object dictionary
			delete this.objectDictionary[object.uid.val];
			
			if( this.objects[0].length < MaxTreeNodeObjects/2 ){
				let unsubDivRes = this.TryUnsubdivide();
				DTPrintf("unsubdivide initiating obj " + object.uid.val + 
					" node min " + this.AABB.minCoord + " max " + this.AABB.maxCoord +
					" node depth " + this.depth + " maxDepth " + this.maxDepth + " unSubDivRes " + unsubDivRes, "unsubdiv", "#4444ff", this.depth);
			}
		
		}
		
	}
	
	/*
	this.getUpToNObjsInAndBelowNode = function(maxNumObjs){
		let retObjs = [];
		for( let i = 0; i < this.objects[0].length; ++i ){
			retObjs.push(this.objects[0][i]);
		}
		if( retObjs.length >= maxNumObjs )
			return retObjs;
		for( let i = 0; i < this.subNodes.length; ++i ){
			let subNd = this.subNodes[i];
			if( subNd ){
				let subNdObjs = subNd.getUpToNObjsInAndBelowNode(maxNumObjs);
				for( let j = 0; j < subNdObjs.length; ++j )
					retObjs.push(subNdObjs[j]);
				if( retObjs.length >= maxNumObjs )
					return retObjs;
			}
		}
		return retObjs;
	}
	*/
	
	this.TryUnsubdivide = function( ){ //can only be called on a leaf node
		
		//if the number of unique objects
		//(objects may cross subnodes so may appear in 1 to all 8 of the parent's subnodes)
		//is less than the MaxTreeNodeObjects, then remove the subnodes and add all their objects to the parent
		if(this.parent){ //may be a already disconnected leaf sibling or the tree parent if parent is null 
			//(in which case don't need to / shouldn't do anything)
			let par = this.parent;
			if( par.maxDepth - par.depth > 1 ) //prevent unsubdividing when all subNodes aren't the same depth subNodes must be un-subdivided first
				return -1;
			let parSn = this.parent.subNodes;
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
							"this dpth " + this.depth + " par depth " + par.depth + "\n" +
							"par maxDepth " + par.maxDepth + " this maxDepth " + this.maxDepth + "\n" +
							" subndIdx " + i + " parSn[i].nNLvs " + parSn[i].nNLvs + "\n" +
							" parSn arr \n" + snDpthsStr, "unsubdiv", "color:red", this.depth );
						return -1;
					}
					subNdCt += 1;
					//let subNdObjs = parSn[i].getUpToNObjsInAndBelowNode(MaxTreeNodeObjects);
					for( let j = 0; j < parSn[i].objects[0].length; ++j ){
						let obj = parSn[i].objects[0][j]; //add each object by uid to list of objects under the parent
						siblingSubNdObjs[ obj.uid.val ] = obj; //dictionary to avoid adjacent node duplicates
					}
				}
			}
			
			
			let objUids = Object.keys(siblingSubNdObjs);
			if( subNdCt > 0 && objUids.length < MaxTreeNodeObjects ){ //obj count is low enough for subnodes to be recombined
				for( let i = 0; i < parSn.length; ++i){ //remove and disconnect all sibling subnodes
					if( parSn[i] ){
						for( let j = 0; j < parSn[i].objects[0].length; ++j ){
							delete( parSn[i].objects[0][j].treeNodes[ parSn[i].uid.val ]); //disconnect objects from subnode
						}
						parSn[i].parent = null; //signify in the subnode has been unsubdivided
						parSn[i] = null; //disconnect parent to subnode link
					}
				}
				
				par.maxDepth -= 1;
				par.leaves -= subNdCt-1;
				//this.maxDepth -= 1; //this node is being removed, if it remained it's max depth would be unchanged
				let parI = par.parent; //start propigating at the level above the parent because the level below it has been removed
				let nMaxDpth = this.maxDepth - 1;
				while( parI ){ //propigate the count update on this branch
					for( let si in parI.subNodes){
						if( parI.subNodes[si] )
							nMaxDpth = Math.max( nMaxDpth, parI.subNodes[si].maxDepth );
					}
					if( nMaxDpth < parI.depth )
						console.log( "propigating small nMaxDpth " + nMaxDpth);
					parI.maxDepth = nMaxDpth;
					parI.leaves -= subNdCt-1; //-1 because the parent becomes a leaf
					parI = parI.parent; //next
				}
				//add objects to parent
				let nLvsMDpth = [0,0];
				for( let i = 0; i < objUids.length; ++i ){
					par.AddObject( nLvsMDpth, siblingSubNdObjs[objUids[i]] );
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
	//returns num new nodes generated, (8, 0 or -1 if failed to add)
	//ret vals nLvsNLvls [num new leaves, num new depth levels, num new objs]
	//-1 too many objects (sub divide was likely tried on earlier add and failed)
	//-2 need to subdivide though the max depth has been reached
	//-3 need to subdivided though the min node size has been reached
	//-4 already subdivided (shouldn't happen)
	this.AddObject = function( nLvsMDpth, object, addCmpCallback ){
	
		let objAABB = object.AABB;
		DTPrintf( "tNId" + this.uid.val + " AddObject obj uid " + object.uid.val + 
			" obj min " + Vect_ToFixedPrecisionString(objAABB.minCoord,3) + 
					" :Max " + Vect_ToFixedPrecisionString(objAABB.maxCoord,3) + " :: otnId " + this.uid.val +
					" otmin " + Vect_ToFixedPrecisionString(this.AABB.minCoord,3) + " :otMax " + 
					Vect_ToFixedPrecisionString(this.AABB.maxCoord,3) + " otDpth " + this.depth, 
						"ot add", "color:#66ccff", this.depth );
		
		//fill nodes until they are full (prevent unessecary subdividing)
		//don't add objects if they intersect existing ones
		//(if necessary the smaller object should be parented to the one with enclosing aabb)
		if( this.subNodes[0] == null ){ //not yet subdivided, try to add to self
			DTPrintf( "tNId " + this.uid.val + " dpth " + this.depth + " obj " + object.uid.val + 
				" not yet subdivided", "ot add", "color:#ffff66", this.depth );
			if( this.objects[0].length >= MaxTreeNodeObjects ){ //sub divide was likely tried on earlier add and failed
				DTPrintf( "tNId " + this.uid.val + " divide likely tried earlier num objs " + this.objects[0].length, 
					"ot add", "color:#ff0066", this.depth );
				nLvsMDpth[0] = -1; nLvsMDpth[1] = 0; 
				if( addCmpCallback != undefined ) addCmpCallback(); return; }
			if( this.objectDictionary[ object.uid.val ] != undefined ){
				DTPrintf( "tNId " + this.uid.val + " obj " + object.uid.val + 
					" object already added", "ot add", "color:#ff5511", this.depth );
				nLvsMDpth[0] = -1; nLvsMDpth[1] = 0; 
				if( addCmpCallback != undefined ) addCmpCallback(); return; }
			
			this.addToThisNode(nLvsMDpth, object);
			
			if( nLvsMDpth[0] < 0 ){ //obj's overlapped
				DTPrintf( "tNId " + this.uid.val + " tName '" + this.root.name + "' obj " + object.uid.val + 
				" addToThisNode rejected, obj's overlapped", "ot add error", "color:red", this.depth);
				if( addCmpCallback != undefined ) addCmpCallback();
				return;
			}
			
			if( this.objects[0].length >= MaxTreeNodeObjects ){ //need to try to subdivide
				//subDivAddDepth += 1;
				DTPrintf( "tNId " + this.uid.val + " dpth " + this.depth + 
				" subdividing when adding obj " + object.uid.val, "ot add", "color:yellow", this.depth );
				//only leaf nodes should contain objects to avoid overlap ambiguity 
				//and so rays only need check leaves while traversing
				if( this.depth+1 > MaxTreeDepth ){ //limit depth to avoid running out of memory (if a mistake causes allot of object adding/tree division)
					let objDimStr = "";
					for( let i = 0; i < this.objects[0].length; ++i ){
						objDimStr += "obj " + this.objects[0][i].uid.val + " min " + Vect_FixedLenStr( this.objects[0][i].AABB.minCoord, 2, 6 ) + " max " + Vect_FixedLenStr( this.objects[0][i].AABB.maxCoord, 2, 6 ) + " \n";
					}
					DTPrintf("tNId " + this.uid.val + " " + this.root.name + " max subdiv depth reached when adding obj " + object.uid.val +
							" ndMin " + Vect_FixedLenStr( this.AABB.minCoord, 2, 6 ) +
							" ndMax " + Vect_FixedLenStr( this.AABB.maxCoord, 2, 6 ) +
							" nLvsMDpth " + nLvsMDpth + '\n' +
							" obMin " + Vect_FixedLenStr( object.AABB.minCoord, 2, 6 ) +
							" obMax " + Vect_FixedLenStr( object.AABB.maxCoord, 2, 6 ) +
							" numObjs " + this.objects[0].length +
							" depth " + this.depth + "\n" +
							objDimStr
							, "ot add error", "color:orange", this.depth); 
					nLvsMDpth[0] = -2; nLvsMDpth[1] = 0;  //signify the max depth has been reached
					this.RemoveFromThisNode(object);
					this.subNodes = [null,null,null,null,  null,null,null,null]
					if( addCmpCallback != undefined ) addCmpCallback(); return; 
				}

				//split the node until there are only MaxTreeNodeObjects per node
				
				//attempt to create the up to 8 (2x minmin minmax and maxmin maxmax ) nodes
				let srcCoords = [this.AABB.minCoord, Vect3_CopyNew(this.AABB.center), this.AABB.maxCoord];
				let nNLvs = this.generateSubNodes(srcCoords); //[numNodesCreated, num[x,y,z] ]
				this.nNLvs = nNLvs;
				
				if( nNLvs[0] < 2 ){ //min node size has been reached (couldn't subdivide)
					DTPrintf( "tNId " + this.uid.val + "nNLvs " + nNLvs + 
						" this.maxDepth " + this.maxDepth + 
						" genSubNodes nNLvs[0] < 2 (min node size reached) minNodeSideLength " + minNodeSideLength + 
						" subdiv srcCoords " + Vect3_ArrToStr( srcCoords, 4, 8) + 
						" object uid " + object.uid.val, "ot add error", "color:red", this.depth );
					nLvsMDpth[0] = -3; nLvsMDpth[1] = 0;
					this.RemoveFromThisNode(object);
					this.subNodes = [null,null,null,null,  null,null,null,null]
					if( addCmpCallback != undefined ) addCmpCallback(); return;
				}
				
				
				
				DTPrintf( "tNId " + this.uid.val + "nNLvs " + nNLvs + "  generateSubNodes success " +
				" this.maxDepth " + this.maxDepth + " srcCoords " + srcCoords, "ot subdiv", "color:#ff4499", this.depth );
				
				//reset the debugging subNdsOvlapd dictionary for the objects
				for( let i = 0; i < this.objects[0].length; ++i )
					this.objects[0].subNdsOvlapd = {};
				object.subNdsOvlapd = {};
				
				let objsAdded = {};
				let leavesCreated = 0;
				let maxNewDpth = this.maxDepth;
				let maxObjsInNde = 0;

				for(let z = 0; z < nNLvs[1][2]; ++z){ //divide the objects between the sub nodes (for now assume there are no divPt overlaps)
					let zObDict = this.subNdObjDictForAxs(2, z, nNLvs[1][2], srcCoords);
					for(let y = 0; y < nNLvs[1][1]; ++y){
						let yObDict = this.subNdObjDictForAxs(1, y, nNLvs[1][1], srcCoords);
						for(let x = 0; x < nNLvs[1][0]; ++x){
							let xObDict = this.subNdObjDictForAxs(0, x, nNLvs[1][0], srcCoords);
							
							let subNdIdx = x+y*2+z*4;
							let nd = this.subNodes[subNdIdx]; //get the sub node
							DTPrintf("\n"+
								"z " + z + " " + Object.keys(zObDict) + "\n" +
								"y " + y + " " + Object.keys(yObDict) + "\n" +
								"x " + x + " " + Object.keys(xObDict) + "\n" +
								"subnd " + nd.uid.val + " dpth" + nd.depth + " min " + nd.AABB.minCoord + 
									" max " + nd.AABB.maxCoord, "ot subdiv", "color:orange", this.depth );
							
							/*
							let obsShouldAddToNode = {};
							for( let i = 0; i < this.objects[0].length; ++i ){
								let ovlapVal = AABBsOverlap( nd.AABB, this.objects[0][i].AABB );
								if( ovlapVal > 0 ){
									if( obsShouldAddToNode[ this.objects[0][i].uid.val ] == undefined )
										obsShouldAddToNode[ this.objects[0][i].uid.val ] = "";
									obsShouldAddToNode[ this.objects[0][i].uid.val ] += subNdIdx + " ";
								}
							}
							*/
							
							
							let objsAttemptedToAdd = {};
							let xObDictKeys = Object.keys( xObDict );
							for( let obUidIdx = 0; obUidIdx < xObDictKeys.length; obUidIdx++ ){
								let obUid = xObDictKeys[obUidIdx];
								if( xObDict[ obUid ] && yObDict[ obUid ] && zObDict[ obUid ] ){ //add the intersecting subset of objects of the 3 axies into the subnode
									if( objsAttemptedToAdd[ obUid ] == undefined )
										objsAttemptedToAdd[ obUid ] = "";
									objsAttemptedToAdd[ obUid ] += subNdIdx + " ";
									
									let nNLvsMDpth = [0,0];
									DTPrintf( "subnd " + nd.uid.val + " dpth " + nd.depth +  " addingobject  " + obUid + 
											" result nLvsMDpth " + nNLvsMDpth, "ot add", "color:#ae7a53", this.depth );
									if( obUid == "100225" && nd.uid.val == 101694 )
										DTPrintf("before obj add error ob uid 100225 nd uid 101694", "ot add error", "color:#ffffaa", this.depth);
									nd.AddObject( nNLvsMDpth, xObDict[obUid] );
									DTPrintf( "subnd " + nd.uid.val + " dpth " + nd.depth +  " addobject  " + obUid + 
											" result nLvsMDpth " + nNLvsMDpth, "ot add", "color:#ae4e08", this.depth );
									if( nNLvsMDpth[0] >= 0 ){ //added the object
										objsAdded[obUid] = obUid;
										DTPrintf( "objAdded " + obUid + " subnd " + nd.uid.val + " dpth " + nd.depth, 
											"ot add", "color:green", this.depth );
										leavesCreated += nNLvsMDpth[0];
										if( nNLvsMDpth[1] > maxNewDpth )
											maxNewDpth = nNLvsMDpth[1];
										if( nd.objects[0].length > maxObjsInNde )
											maxObjsInNde = nd.objects[0].length;
										
									}else{
										DTPrintf( "subDiv AddObject failed - xyz subNdIdx's " + x + "," + y + "," + z + 
												" subNdObjs " + nd.objects[0].length + " subNdDepth " + nd.depth + '\n' +
												" ndMin " + Vect_FixedLenStr( nd.AABB.minCoord, 2, 6 ) + 
												" ndMax " + Vect_FixedLenStr( nd.AABB.maxCoord, 2, 6 ) +
												" objUid " + obUid + " nNLvsMDpth " + nNLvsMDpth + '\n' +
												" obMin " + Vect_FixedLenStr( xObDict[obUid].AABB.minCoord, 2, 6 ) + 
												" obMax " + Vect_FixedLenStr( xObDict[obUid].AABB.maxCoord, 2, 6 ) , 
												"ot add error", "color:red", this.depth  );
									}
								}else{
									xObDict[ obUid ].notAddedStr = 
										"not in all dicts obUid " + obUid + " axs idxs " +
										x + "," + y + "," + z + "\n" +
										"nd minCoord " + Vect_FixedLenStr( nd.AABB.minCoord, 2, 6 ) + 
										" nd maxCoord " + Vect_FixedLenStr( nd.AABB.maxCoord, 2, 6 ) +
										"  in xDict " + (xObDict[ obUid ] == undefined ? 'no' : 'yes') + 
										" in yDict " + (yObDict[ obUid ] == undefined ? 'no' : 'yes') + 
										" in zDict " + (zObDict[obUid] == undefined ? 'no' : 'yes');
								}
							}
							
						//if( Object.keys( obsShouldAddToNode ).length != Object.keys( objsAttemptedToAdd ).length )
						//	DTPrintf( "subNdObjDictForAxs didn't match all objs for node", "ot add error", "color:red", this.depth );
							
						}
					}
				}
				
				//check the subdivision was successful
				//all objects could be added and that the max num objs in each node has decreased
				let addedObjs = Object.keys(objsAdded);
				let allObjs = this.objects[0];
				if( addedObjs.length < allObjs.length ){
					//the subdivision didn't work
					DTPrintf( "tNId " + this.uid.val + " treeNode subdivision didn't work    added:" + 
						addedObjs.length + " of " + allObjs.length + " to have been added", 
							"ot add error", "color:red", this.depth  );
					//create the all objects string and 
					//pre populate the not added objs dictionary
					let allObjsStr = "";
					let notAddedObjsDict = {};
					for( let i = 0; i < allObjs.length; ++i ){
						allObjsStr += allObjs[i].uid.val + ":";
						notAddedObjsDict[allObjs[i].uid.val] = allObjs[i];
					}
					//remove added objects and create added objs string
					let addedStr = "";
					for( let i = 0; i < addedObjs.length; ++i ){
						let addedUid = addedObjs[i];
						addedStr += addedUid + ":";
						delete(notAddedObjsDict[addedUid]);
					}
					//fill in not added string from not added dictionary
					let notAddedStr = "";
					let notAddedObjs = Object.keys(notAddedObjsDict);
					DTPrintf("notAddedObjs " + notAddedObjs, "ot add error", "color:red", this.depth );
					for( let i = 0; i < notAddedObjs.length; ++i ){
						let obj     = notAddedObjsDict[ notAddedObjs[i] ];
						let objAABB = obj.AABB;
						notAddedStr += notAddedObjs[i] + ":m" + Vect_ToFixedPrecisionString(objAABB.minCoord,3);
						notAddedStr += ":M" + Vect_ToFixedPrecisionString(objAABB.maxCoord,3) + 
						" ovLp " + AABBsOverlap(objAABB, this.AABB) + "  ,\n  ";
						
						notAddedStr += "overlapping sub node axies ";
						if( obj.subNdsOvlapd ){
							let overlapingAxies = Object.keys(obj.subNdsOvlapd);
							for( ix in overlapingAxies ){
								let idxsForAxis = obj.subNdsOvlapd[ix];
								if ( idxsForAxis == undefined )
									notAddedStr += ix + ": " + "none";
								else
									notAddedStr += ix + ": " + Object.keys( idxsForAxis ) + "  ";
							}
						}else{
							notAddedStr += " obj.subNdsOvlapd is null ";
						}
						if( obj.notAddedStr )
							notAddedStr += "\n " + obj.notAddedStr + " \n";
					}
					
					DTPrintf( 
							"tNId " + this.uid.val + " dpth " + this.depth + " subD added objsAdded " + addedStr + 
							" all " + allObjsStr + "\n notAdded " + notAddedStr + "\n" +
							"node min " + Vect_FixedLenStr( this.AABB.minCoord, 2, 6 ) + 
							" max " + Vect_FixedLenStr( this.AABB.maxCoord, 2, 6 ), 
							"ot add error", "color:red", this.depth );
					nLvsMDpth[0] = -4; nLvsMDpth[1] = 0;
					this.subNodes = [null,null,null,null,  null,null,null,null]
					this.RemoveFromThisNode(object);
				}else{
					DTPrintf( " trNd " + this.uid.val + " dpth " + this.depth + " all objs added " +
						" addedLen " + addedObjs.length + " allObjLen " + allObjs.length, "ot add", "color:green", this.depth );
					
					//check that at least one node didn't get all the objects
					let minNumObjsInASubNode = MaxTreeNodeObjects;
					let maxNumObjsInASubNode = 0;
					for( let i = 0; i < this.subNodes.length; ++i ){
						if( this.subNodes[i] != null ){
							let subNdObjs = this.subNodes[i].objects[0].length;
							if( subNdObjs < minNumObjsInASubNode )
								minNumObjsInASubNode = subNdObjs;
							if( subNdObjs > maxNumObjsInASubNode )
								maxNumObjsInASubNode = subNdObjs;
						}
					}
					
					if( minNumObjsInASubNode == maxNumObjsInASubNode ){
					
						DTPrintf( 
							"tNId " + this.uid.val + " dpth " + this.depth + " failed to seperate objects during subdivision " + 
							" minInSubNd " + minNumObjsInASubNode + " maxInASubNd " + maxNumObjsInASubNode
							, "ot add error", "color:red", this.depth );
						nLvsMDpth[0] = -4; nLvsMDpth[1] = 0;
						this.subNodes = [null,null,null,null,  null,null,null,null];
						this.RemoveFromThisNode(object);
						
					}else{
					
						//subdivision success
						DTPrintf( " oTName '" + this.root.name + "' subdiv success " + 
							" minInSubNd " + minNumObjsInASubNode + 
							" maxInASubNd " + maxNumObjsInASubNode + " numSubNds " + nNLvs + " thisDepth " + this.depth, "ot subdiv success", "color:green", this.depth );
				
						//remove object's association to this treeNode
						//since it is going to be added to one or more of the subnodes
						for( let i = 0; i < this.objects[0].length; ++i ){
							delete this.objects[0][i].treeNodes[this.uid.val];
						}
						
						this.objects = [[],[],[]];
						this.objectDictionary = {};
						this.leaves = nNLvs[0] + leavesCreated; //this treeNode has become a parent add the count of generateSubNodes
						//and any created when adding to a new subnode
						this.maxDepth = maxNewDpth;


						//the node was successfuly subdivided and objects distributed to sub nodes such that
						//all nodes have less than MaxTreeNodeObjects
						
						//parent max depth and leaf count update is based on the nLvsMDpth values
						nLvsMDpth[0] = nNLvs[0] + leavesCreated;
						
					}
					
				}
			}
			
			
			nLvsMDpth[1] = this.maxDepth;
			let ndObjsStr = "";
			for( let i = 0; i < this.objects[0].length; ++i )
				ndObjsStr += this.objects[0][i].uid.val + " ";
			DTPrintf( "otName " + this.root.name + " tNId " + this.uid.val + 
				" ndMin " + Vect_FixedLenStr( this.AABB.minCoord, 2, 6 ) + " ndMax " + Vect_FixedLenStr( this.AABB.maxCoord, 2, 6 ) +
				" dpth " + this.depth + " nLvsMDpth " + nLvsMDpth + " ndObjs " + ndObjsStr + "\n" +
				"objUid " + object.uid.val + " objMin " + Vect_FixedLenStr( object.AABB.minCoord, 2, 6 ) + " objMax " + Vect_FixedLenStr( object.AABB.maxCoord, 2, 6 )
				, "ot add success", UIDToColorHexString(this.root.uid), this.depth );

		}else{ //already subdivided, decide which sub nodes it should be added to
			DTPrintf( "tNId " + this.uid.val + " dpth " + this.depth + 
				" already subdivided", "ot add", "color:#3366ff", this.depth );
		
			let maxNewDpth = this.maxDepth;
			for(let i = 0; i < this.subNodes.length; ++i){
				let subnode = this.subNodes[i];
				if( subnode ){
					let ovlapPct = AABBsOverlap( subnode.AABB, object.AABB );
					if( ovlapPct > 0 ){
						let snNLvsMDpth = [0,0];
						subnode.AddObject( snNLvsMDpth, object, addCmpCallback );
						if( snNLvsMDpth[0] > 0 ) //num new leaves > 0
							nLvsMDpth[0] += snNLvsMDpth[0];
						if( snNLvsMDpth[1] > nLvsMDpth[1] ) //max depth from add obj > maxNewDpth
							nLvsMDpth[1]  = snNLvsMDpth[1];
						if(ovlapPct >= 1) //skip checking other subnodes if fully in this one
							break;
					}
				}
			}
			this.maxDepth = nLvsMDpth[1];
			this.leaves += nLvsMDpth[0];
			
		
		}
		
		if( addCmpCallback != undefined )
			addCmpCallback();
		
	}

	this.SubNode = function( point ){
		//find which node the ray origin is in
		//to start tracing though node walls and objects from the ray's starting point
		if(!this.enabled)
			return null;

		if( point[0] >= this.AABB.minCoord[0] && 
			point[1] >= this.AABB.minCoord[1] && 
			point[2] >= this.AABB.minCoord[2] && //each axis of the point is greater than those of the min coord
			point[0] <= this.AABB.maxCoord[0] && 
			point[1] <= this.AABB.maxCoord[1] && 
			point[2] <= this.AABB.maxCoord[2] ){ //each axis of the point is also less than those of the max coord

			//theirfore the ray origin is in this node
			
			//check the subnodes of this node if it has any
			for( let i = 0; i < this.subNodes.length; ++i ){
				if( this.subNodes[i] != null ){
					var node = this.subNodes[i].SubNode( point );
					if( node != null )
						return node;
				}
			}
			
			return this; //the origin is in this node and this node 
			//is a leaf node ( doesn't have sub nodes / children )
			//or it was in this node and this node isn't a leaf node 
			//but it wasn't in one of the leaf nodes ( shouldn't happen )
			
		}else{
			return null; //the point is outside this node, null will allow 
		} //the calling instance of this function to try another node

	}

	this.nextNodeRayPoint = Vect3_NewZero();
	this.boundColor = new Float32Array([0,0,0,0.5]);
	this.rayExitPoint = Vect3_NewZero();
	this.rayIntersectPt = Vect3_NewZero();
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
		
		//ray.visitedNodes.push(this);

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
			return;
		} //ray has exited the entire oct tree


		//first check if any objects in this node intersect with the ray
		for( let i = 0; i < this.objects[0].length; ++i ){
			//loop through the objects (if one isn't yet loaded, it is ignored)
			if( ray.lastNode == null || 
				ray.lastNode.objectDictionary[ this.objects[0][i].uid.val ] == null ){ //don't recheck if checked last node
				//check if the ray intersects the object
				//let rayIntersectPt = Vect3_NewZero();
				let rayObIntTime = this.objects[0][i].AABB.RayIntersects( this.rayIntersectPt, ray, minTraceTime );
				if( rayObIntTime >= 0 ){
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
	//returns the [ total numNodesCreated, num nodes per axis[x,y,z] ]
	this.generateSubNodes = function(srcCoords){
		subDivAddDepth += 1;
		if( subDivAddDepth > 1){
			DTPrintf( "potential for add error subDivAddDepth " + subDivAddDepth + 
				" tNId " + this.uid.val + " dpth " + this.depth + 
				" srcCoords " + Vect3_ArrToStr( srcCoords, 2, 6 ), "ot add error", "color:maroon", this.depth);
		}

		if( this.nNLvs[0] > 0 ){ //if already subdivided don't generate new
			DTPrintf("tNId " + this.uid.val + " dpth " + this.depth + " already subdivided", 
				"ot add error", "color:#e26b31", this.depth );
			return [-4,[0,0,0]];       //nodes (would loose objects)
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
		let nDpth = this.depth+1;
		let maxDpth = this.root.maxDepth;
		let subNdIdx = 0;
		
		
		let nds = [2,2,2]; //num new nodes per axis
		//check each axis if the min node side has already been reached
		//if it has don't divide that axis and set the upper srcCoord for the axis to the parent max
		if( srcCoords[2][0] - srcCoords[0][0] < minNodeSideLength ){
			nds[0] = 1; srcCoords[1][0] = this.AABB.maxCoord[0]; }
		if( srcCoords[2][1] - srcCoords[0][1] < minNodeSideLength ){
			nds[1] = 1; srcCoords[1][1] = this.AABB.maxCoord[1]; }
		if( srcCoords[2][2] - srcCoords[0][2] < minNodeSideLength ){
			nds[2] = 1; srcCoords[1][2] = this.AABB.maxCoord[2]; }
		
		if( nds[2] + nds[1] + nds[0] < 2 ) //if not going to subdivide return
			return [numNodesCreated, nds];
		
		for(let z = 0; z < nds[2]; ++z){
			for(let y = 0; y < nds[1]; ++y){
				for(let x = 0; x < nds[0]; ++x){
					let nNdeMin = [srcCoords[x+0][0],srcCoords[y+0][1],srcCoords[z+0][2]];
					let nNdeMax = [srcCoords[x+1][0],srcCoords[y+1][1],srcCoords[z+1][2]];
					//create the subnode
					subNdIdx = x+y*2+z*4;
					this.subNodes[subNdIdx] = new TreeNode(nNdeMin, nNdeMax, this);
					numNodesCreated += 1;
					
					//set the debug oct tree color based on axis and depth
					this.subNodes[subNdIdx].boundColor[0] = (1-(nDpth)/maxDpth)*x;
					this.subNodes[subNdIdx].boundColor[1] = (1-(nDpth)/maxDpth)*y;
					this.subNodes[subNdIdx].boundColor[2] = (1-(nDpth)/maxDpth)*z;
					
					//subNdIdx += 1;
				}
			}
		}

		return [numNodesCreated, nds];
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
}
var nodeNum = 0; //the oct tree node debug draw traversal number

