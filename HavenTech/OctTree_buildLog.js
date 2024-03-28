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


const treeDebug = false;

const divOverlapPenalty = 1;
const divHalfPenalty = 1;

const MaxTreeDepth = 10;
const minNodeSideLength = 4;
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
	this.minObjs = [0,0,0]; //the per axis num objs less than this.AABB.center
	this.objectDictionary = {}; //object uuids in this node for checking if an object is present
	//(for ray traversal preventing checking objects twice (will likely be removed when
	//objects are subdivided instead of added to multiple nodes if they span node boundries)

	this.subNodes = [null,null,null,null,  null,null,null,null];

	//idealy the oct treebounds are 32-64bit integers (to avoid precision loss
	//with distance from the origin)
	//and every node / sub division has a fill/occupancy type
	//i.e vaccum, air, water, elemental material, etc 
	//(for ray energy dissipation / participating media scattering )

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
	}

	this.addToThisNode = function( object ){
		//insertion sort the objects (find the objects that have a min edge
		//before this object)
		let numOvlapAxs = 0;
		let insertIdxs = [-1,-1,-1];
		for(let ax = 0; ax < 3; ++ax ){
			let objMin  = object.AABB.minCoord;
			
			if( objMin[ax] < this.AABB.center[ax] )
				this.minObjs[ax] += 1;
		
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
				if( AABBsOverlap(this.objects[ax][cmpIdx].AABB, object.AABB) )
					numOvlapAxs += 1;
				//check the object before the new object if present
				if( cmpIdx-1 >= 0 && AABBsOverlap(this.objects[ax][cmpIdx-1].AABB, object.AABB) )
					numOvlapAxs += 1;
			}
			
		}
		
		if( numOvlapAxs < 3 ){ //if 3 axies overlap the objects intersect
			for(let ax = 0; ax < 3; ++ax ){ //insert into the axis sorted arrays
				this.objects[ax].splice(insertIdxs[ax]+1, 0, object);
			}
		}else{
			return -1; //overlaps in 3 axies ( intersects another object, can't insert)
		}
		
		//for quickly checking if an object is present
		this.objectDictionary[ object.uuid ] = object;
		return 0;
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

	this.subNdObjDictForAxs = function(axs, subNdIdx){
		let objs = [];
		if( subNdIdx == 0 )
			objs = this.objects[axs].slice(0, this.minObjs[axs]);
		else
			objs = this.objects[axs].slice(this.minObjs[axs], this.objects[axs].length);
		let obDict = {};
		for(let i = 0; i < objs.length; ++i){
			let ob = objs[i];
			obDict[ ob.uuid ] = ob;
		}
		return obDict;
	}

	//add an object to the node, if it is full - subdivide it 
	//and place objects in the sub nodes
	//returns num new nodes generated, (8, 0 or -1 if failed to add)
	this.AddObject = function( object, addCmpCallback ){
	
		if( object.AABB.minCoord[0] == 52 && object.AABB.maxCoord[1] == 88 ){
			let str = "%cadd at " + 
						object.AABB.minCoord + " : " + 
						object.AABB.maxCoord + "     " + 
						this.AABB.minCoord + " : " + this.AABB.maxCoord;
			console.log(str, "color:green" );
		}


		//fill nodes until they are full (prevent unessecary subdividing)
		//don't add objects if they intersect existing ones
		//(if necessary the smaller object should be parented to the one with enclosing aabb)
		if( this.subNodes[0] == null ){ //not yet subdivided, try to add to self
			if( this.objects[0].length >= MaxTreeNodeObjects )
				return -1;
			const sucesfullyAdded = this.addToThisNode(object);
			let addStatusColor = '#ff0000';
			if( sucesfullyAdded >= 0 )
				addStatusColor = '#00ff00';
			octTreeDivLogElm.innerHTML += "<p style='color:" + addStatusColor + 
				"; margin:0px;'>addSucess " + sucesfullyAdded + 
						' ndeMin ' + this.AABB.minCoord + ' ndeMax ' + this.AABB.maxCoord + 
						' objMin ' +  object.AABB.minCoord[this.axis] + 
						' numNdeObjs ' + this.objects.length + ' ndeAxis ' + this.axis + 
						' ndeDpth ' + this.depth  + '</p><br/>';
			if( this.objects[0].length >= MaxTreeNodeObjects ){ //need to subdivide
				//only leaf nodes should contain objects to avoid overlap ambiguity
				//and so rays only need check leaves while traversing
				if( this.depth+1 > MaxTreeDepth ){ //limit depth to avoid running out of memory 
													//(if a mistake causes allot of object adding/tree division)
					octTreeDivLogElm.innerHTML += "<p style='color:#ff0000; margin:0px;'>Max Depth reached</p><br/>";
					return -2; //signify the max depth has been reached
				}

				//split the node until there are only MaxTreeNodeObjects per node
				
				//create the 8 (2x minmin minmax and maxmin maxmax ) nodes
				let numNewLeaves = this.generateSubNodes();
				
				if( numNewLeaves < 2 )
					return -3; //signify the min node size has been reached

				//divide the objects between the 8 sub nodes (for now assume there are no divPt overlaps)
				for(let z = 0; z < 2; ++z){
					let zObDict = this.subNdObjDictForAxs(2, z);
					for(let y = 0; y < 2; ++y){
						let yObDict = this.subNdObjDictForAxs(1, y);
						for(let x = 0; x < 2; ++x){
							let xObDict = this.subNdObjDictForAxs(0, x);
							
							//get the sub node
							let nd = this.subNodes[x+y*2+z*4];

							//add the intersecting subset of objects of the 3 axies into the subnode
							for( obUuid in xObDict ){
								if( xObDict[ obUuid ] && yObDict[ obUuid ] && zObDict[ obUuid ] )
									numNewLeaves += nd.AddObject( xObDict[obUuid] );
							}
						}
					}
				}
				
				this.objects = [[],[],[]];
				this.minObjs = [0,0,0];
				this.objectDictionary = {};
				this.leaves = numNewLeaves; //this treeNode has become a parent
				this.maxDepth += 1;

				if( addCmpCallback != undefined )
					addCmpCallback();
				octTreeDivLogElm.innerHTML += 
					'<p style="color:#d8f87f; margin:0px;">>' +
						'finished dividing node m:M ' + this.AABB.minCoord + 
						':' + this.AABB.maxCoord +
						' at depth ' + this.depth +
						' and divPt ' + this.AABB.center + '</p><br/>';

				//the node was successfuly subdivided and objects
				//distributed to sub nodes such that
				//all nodes have less than MaxTreeNodeObjects
				
				//parent max depth and leaf count update is based on this return
				return numNewLeaves;
			}
			
			if( addCmpCallback != undefined )
				addCmpCallback();
			return sucesfullyAdded;

		}else{ //already subdivided, decide which sub node it should be added to
			let s = [ 
					object.AABB.minCoord[0] < this.AABB.center[0] ? 0 : 1,
					object.AABB.minCoord[1] < this.AABB.center[1] ? 0 : 1,
					object.AABB.minCoord[2] < this.AABB.center[2] ? 0 : 1 ];
			
			let nde = this.subNodes[ s[0]+s[1]*2+s[2]*4 ];
		
			octTreeDivLogElm.innerHTML += "DivdAddToMin: " +
										  " nde.dpth " + nde.depth +
										  " min " + nde.AABB.minCoord +
										  ' max ' + nde.AABB.maxCoord +
										  ' obj min ' + object.AABB.minCoord + 
										  '<br/>';
			let numNewLeaves = nde.AddObject( object, addCmpCallback );
			if( numNewLeaves > 0 ){
				this.leaves += numNewLeaves-1;
				this.maxDepth += 1;
			}
			return numNewLeaves;
		
		}
		

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
		} //the calling instance of this function should try another node

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
			return;
		} //ray has exited the entire oct tree


		//first check if any objects in this node intersect with the ray
		for( let i = 0; i < this.objects[0].length; ++i ){
			//loop through the objects (if one isn't yet loaded, it is ignored)
			if( ray.lastNode == null || 
				ray.lastNode.objectDictionary[ this.objects[0][i].uuid ] == null ){ //don't recheck if checked last node
				//check if the ray intersects the object
				let rayIntersectPt = new Float32Array(3);
				let rayObIntTime = this.objects[0][i].AABB.RayIntersects( rayIntersectPt, ray, minTraceTime );
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
	this.generateSubNodes = function(){

		if( this.subNodes[0] != null ) //if already subdivided don't generate new
			return -4;       //nodes (would loose objects)
			
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
		let srcCoords = [this.AABB.minCoord, Vect3_CopyNew(this.AABB.center), this.AABB.maxCoord];
		
		let nds = [2,2,2]; //num new nodes per axis
		//check each axis if the min node side has already been reached
		if( srcCoords[2][0] - srcCoords[0][0] < minNodeSideLength ){
			nds[0] = 1;
			srcCoords[1][0] = this.AABB.maxCoord[0];
		}
		if( srcCoords[2][1] - srcCoords[0][1] < minNodeSideLength ){
			nds[1] = 1;
			srcCoords[1][1] = this.AABB.maxCoord[1];
		}
		if( srcCoords[2][2] - srcCoords[0][2] < minNodeSideLength ){
			nds[2] = 1;
			srcCoords[1][2] = this.AABB.maxCoord[2];
		}
		
		if( nds[2] + nds[1] + nds[0] < 2 ) //if not going to subdivide return
			return numNodesCreated;
		
		for(let z = 0; z < nds[2]; ++z){
			for(let y = 0; y < nds[1]; ++y){
				for(let x = 0; x < nds[0]; ++x){
					let nNdeMin = [srcCoords[x+0][0],srcCoords[y+0][1],srcCoords[z+0][2]];
					let nNdeMax = [srcCoords[x+1][0],srcCoords[y+1][1],srcCoords[z+1][2]];
					//create the subnode
					this.subNodes[subNdIdx] = new TreeNode(nNdeMin, nNdeMax, this);
					numNodesCreated += 1;
					
					//set the debug oct tree color based on axis and depth
					this.subNodes[subNdIdx].boundColor[0] = (1-(nDpth)/maxDpth)*x;
					this.subNodes[subNdIdx].boundColor[1] = (1-(nDpth)/maxDpth)*y;
					this.subNodes[subNdIdx].boundColor[2] = (1-(nDpth)/maxDpth)*z;
					
					subNdIdx += 1;
				}
			}
		}

		return numNodesCreated;
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
		//vals[this.axis] = 255;
		
		lw = 1;
		let rgbString = "rgba("+vals[0]+","+vals[1]+","+vals[2]+","+vals[3]+")";
		fCtx.fillStyle = rgbString;
		fCtx.fillRect( this.AABB.minCoord[0]   , this.AABB.minCoord[1]   , this.AABB.maxCoord[0] - this.AABB.minCoord[0], lw); //top line
		fCtx.fillRect( this.AABB.minCoord[0]   , this.AABB.maxCoord[1]-lw, this.AABB.maxCoord[0] - this.AABB.minCoord[0], lw); //bottom
		fCtx.fillRect( this.AABB.minCoord[0]   , this.AABB.minCoord[1]   , lw, this.AABB.maxCoord[1] - this.AABB.minCoord[1]); //left
		fCtx.fillRect( this.AABB.maxCoord[0]-lw, this.AABB.minCoord[1]   , lw, this.AABB.maxCoord[1] - this.AABB.minCoord[1]); //right
		
		if( this.objects.length > 0 ){
			//fill the background
			vals[3] = ((this.depth-1) / this.root.maxDepth);
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
		for( let i = 0; i < this.subNodes.length; ++i ){
			if( this.subNodes[i] != null )
				this.subNodes[i].DebugDraw(fCtx);
		}
	}
}
var nodeNum = 0; //the oct tree node debug draw traversal number

