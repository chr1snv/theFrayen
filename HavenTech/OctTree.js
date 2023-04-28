//OctTree.js
//to request use or code/art please contact chris@itemfactorystudio.com

//the idea behind this is a mix between a binary space partioning tree and
//an oct tree
//when writing the if statement branches for an oct tree there were many similar
//cases, so to simplify the number of if else's at each level
//this is an orthogonal binary space partition tree, each level splits only one axis
//and each subsequent level splits the next axis in the order (x, y , z , x , y ... etc)

//each node has a render buffer (vertex, uv, normal, textures and handles) 
//that holds the data of
//the objects in the node, updated when requested by the frame buffer manager to draw

const MaxTreeDepth = 4;
const MaxTreeNodeObjects = 5;
var totalFrameRayHits = 0;
const rayStepEpsilon = 0.0001;
function TreeNode( axis, minCoord, MaxCoord, parent ){

	this.enabled = true; //for enab/disab using hierarchy for debugging
	this.rayHitsPerFrame = 0;

	this.axis = axis; //the axis that the node splits ( (0)x , (1)y , or (2)z )
	this.minCoord = minCoord; //the minimum corner that the node covers
	this.MaxCoord = MaxCoord; //the Maximum corner that the node covers
	this.midCoord = Vect3_CopyNew( this.minCoord );
	Vect3_Add( this.midCoord, this.MaxCoord );
	Vect3_MultiplyScalar( this.midCoord, 0.5 ); //the center coordinate

	this.AABB = new AABB( this.minCoord, this.MaxCoord );

	if( parent ){
		this.depth = parent.depth+1;
		this.maxDepth = parent.maxDepth;
	}else{
		this.depth = 0;
		this.maxDepth = 0;
	}


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
		for( let i = 0; i < this.objects.length; ++i ){
			if( this.objects[i].AABB.minCoord[this.axis] < object.AABB.minCoord[this.axis] )
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
	
	this.PrintHierarchy = function( nodeName, parn ){

		let prevHiLActvElm = hiLActvElm;

		let tt = document.createElement('table');
		tt.parn = parn;
		tt.style.setProperty('margin-left', '4px');
		tt.style.setProperty('display', 'table');
		let bgOpacity = numToHex(this.rayHitsPerFrame/totalFrameRayHits*255);
		if( bgOpacity[0] > '0' ) //indicate the number of ray hits with opacity intensity
			bgOpacity = "55";
		let bgCol = '1px solid ' + aIdxToC(this.axis);
		
		let c = document.createElement('table');

		tt.style.setProperty('outline', bgCol  + bgOpacity );
		let t = document.createElement('table');
			let ttr = document.createElement('tr');
				let td = document.createElement('td');
					td.style.setProperty('background-color', '#00000000');
					td.style.setProperty('width', '5px');
					td.style.setProperty('height', '5px');
					tt.camIco = td;
			ttr.appendChild(td);
				td = document.createElement('td');
					let b = document.createElement('button');
					b.onclick = function(e){ sohdDiv(e); };
					b.style.setProperty('outline', bgCol );
					b.style.setProperty('width', '18px');
					b.innerText = '>';
					b.subNdsDiv = c;
				td.appendChild( b );
			ttr.appendChild(td);
			td = document.createElement('td');
				b = document.createElement('button');
				b.style.setProperty('margin-left', '4px');
				b.style.setProperty('background-color','white');
				b.style.setProperty('color','black');
				b.style.setProperty('width', '18px');
				b.oNode = this;
				b.innerText = 'I';
				b.onclick = function(e){ enbDisabONode(e); };
			td.appendChild( b );
			ttr.appendChild( td );
				td = document.createElement('td');
				td.innerText = nodeName;
				//td.innerText = aIdxToS(this.axis); //+ " " + vFxLenStr(this.minCoord, 2, 4) + " " + vFxLenStr(this.MaxCoord, 2, 4);
			ttr.appendChild( td );
		t.appendChild( ttr );


		let tr = document.createElement('tr');
		td = document.createElement('td');
		td.appendChild( t );
		tr.appendChild(td);

		tt.appendChild( tr );

		tt.oNode = this;
		this.hNode = tt; //link the hierarchy view element for updating as the camera moves

		let objSummary = document.createElement('td');
		objSummary.style.setProperty('width', '100px');
		objSummary.style.setProperty('height', '20px');
		objSummary.style.setProperty('overflow', 'scroll');
		objSummary.style.setProperty('display', 'block ruby');
		objSummary.style.setProperty('scrollbar-width', 'none');
		
		objSummary.onVisible;


		c.style.setProperty('display', 'none');
		for(let i = 0; i < this.objects.length; ++i ){
			if( this.objects[i].meshName ){
				objSummary.innerText += " " + this.objects[i].meshName;
				//td.innerText = this.objects[i].meshName;
				//tr.appendChild( td );
				//c.appendChild( tr );
				tr = document.createElement('tr');
				td = document.createElement('td');
				hiLActvElm = td;
				this.objects[i].PrintHierarchy(this.objects[i].meshName);
				tr.appendChild( td );
				c.appendChild( tr );
			}else{
				tr = document.createElement('tr');
				td = document.createElement('td');
				td.innerText = minMaxToCSide(this.objects[i].AABB);
				objSummary.innerText += " " + td.innerText;
				tr.appendChild( td );
				c.appendChild( tr );
			}
		}
		tt.sT = objSummary;
		ttr.appendChild( objSummary );
		tr = document.createElement('tr');
		td = document.createElement('td');
		hiLActvElm = td;
		if( this.minNode != null ) tt.mN = this.minNode.PrintHierarchy( 'm'+(this.maxDepth-this.depth), tt );
		tr.appendChild( td );
		c.appendChild( tr );
		tr = document.createElement('tr');
		td = document.createElement('td');
		hiLActvElm = td;
		if( this.MaxNode != null ) tt.MN = this.MaxNode.PrintHierarchy( 'M'+(this.maxDepth-this.depth), tt );
		tr.appendChild( td );
		c.appendChild( tr );

		tr = document.createElement('tr');
		td = document.createElement('td');
		td.appendChild( c );
		tr.appendChild(td);
		tt.appendChild( tr );


		tr = document.createElement('tr');
		td = document.createElement('td');
		td.appendChild( tt );
		tr.appendChild(td);
		prevHiLActvElm.appendChild( tr );
		hiLActvElm = prevHiLActvElm;

		return tt;
	}

	//check the objects along the axis for overlaps 
	//filling in the number of overlaps in each object
	//and return with the -
	//least overlapping min edge point (closest to the midpoint) and
	// numObjects before it (minObjects),
	let bestDivPt; //best for an axis
	let bestDivPtRank = 9999;
	let bestNumMinObjs;
	let bestNumOvlaps;
	let halfNumObjs;
	let sortedObjs = [ [], [], [] ];
	this.FindOverlaps = function( objects, newAxis ){
		//more important to divide the number of objects in half and place
		//the new node boundry on an object edge than be near the middle of the
		//current node (because then the number of objects per node is minimal
		//and the chance of a new object crossing the created boundry is minimized)
		
		//need to sort objects by the minCoord in the newAxis before checking
		//for overlaps
		
		if( newAxis == this.axis ){
			sortedObjs[newAxis] = this.objects;
		}else{
			//copy the objects into the new array
			sortedObjs[newAxis] = new Array(objects.length);
			for( let i = 0; i < objects.length; ++i ){
				sortedObjs[newAxis][i] = objects[i];
			}
			//make a temp array
			let tempArr = new Array(objects.length);
			//merge sort the array - writing merged values into tempArr and
			//then back into place
			let mergeLevels = Math.ceil(Math.log2(objects.length));
			for( let l = 0; l < mergeLevels; ++l ){ //each power of 2 level
				let lvlStep = Math.pow(2,l);
				let temp;
				for( let i = 0; i < objects.length; i+=lvlStep*2 ){ //per block pair
					let aItr = 0;
					let bItr = 0;
					let j = 0;
					while( i+j < objects.length && j < lvlStep*2 ){ //merge elms in block pairs
						if( bItr >= lvlStep ){ //if a & b >= lvlStep j will be >= lvlStep
							tempArr[j] = sortedObjs[newAxis][i+aItr]; aItr++;
						}else if( aItr >= lvlStep ){
							tempArr[j] = sortedObjs[newAxis][i+lvlStep+bItr]; bItr++;
						}else if( (i+lvlStep+bItr) >= objects.length ||
							(sortedObjs[newAxis][i+aItr].AABB.minCoord[newAxis] <= 
							sortedObjs[newAxis][i+lvlStep+bItr].AABB.minCoord[newAxis]) ){
							tempArr[j] = sortedObjs[newAxis][i+aItr]; aItr++;
						}else{
							tempArr[j] = sortedObjs[newAxis][i+lvlStep+bItr]; bItr++;
						}
						j++;
					}

					//copy merged blocks back in place
					for( let k = 0; k < j; ++k ){
						sortedObjs[newAxis][i+k] = tempArr[k];
					}

				}
			}
		}

		octTreeDivLogElm.innerHTML += "sorted ";
		for( let i = 0; i < objects.length; ++i ){
			octTreeDivLogElm.innerHTML += sortedObjs[newAxis][i].AABB.minCoord[newAxis] + minMaxToCSide(sortedObjs[newAxis][i].AABB) + " ";
		}

		bestDivPt = sortedObjs[newAxis][0].AABB.minCoord[newAxis];
		const queueLen = MaxTreeNodeObjects;
		//circular fifo queue of objects that overlap in the axis being checked
		let prevMinPts = [ sortedObjs[newAxis][0].AABB.minCoord[newAxis], null, null, null, null ];
		let prevMaxPts = [ sortedObjs[newAxis][0].AABB.maxCoord[newAxis], null, null, null, null ];
		let queueMin = 0;
		let queueMax = 0;
		octTreeDivLogElm.innerHTML += "<br/>";

		//iterate over
		//min to max minCoord sorted objects checking for overlaps
		for( let j = 1; j < sortedObjs[newAxis].length; ++j ){
			//add the new object to the overlap queue
			++queueMax; if( queueMax >= queueLen ) queueMax = 0; //circular increment
			prevMinPts[queueMax] = sortedObjs[newAxis][j].AABB.minCoord[newAxis];
			prevMaxPts[queueMax] = sortedObjs[newAxis][j].AABB.maxCoord[newAxis];
			//forget prior objects that don't overlap
			while( prevMaxPts[queueMin] <= prevMinPts[queueMax] && queueMin != queueMax ){
				++queueMin; if( queueMin >= queueLen ) queueMin = 0;}

			//calculate the number of overlaps for the object
			let numOverlaps = queueMax-queueMin; if( numOverlaps < 0 ) numOverlaps += queueLen;

			//find the best dividing point between this and previous objects (closest to midpoint)
			let divPt = sortedObjs[newAxis][j].AABB.minCoord[newAxis];
			let diffMinHalfObjs = j-halfNumObjs; if( diffMinHalfObjs < 0 ) diffMinHalfObjs = -diffMinHalfObjs;

			//rank this dividing point using a metric involving the number of overlaps and distance to the mid
			let divPtRank = numOverlaps*divOverlapPenalty + diffMinHalfObjs*divHalfPenalty; //lower is better

			//if a better scoring division point has been found record it as best for this axis
			if( divPtRank < bestDivPtRank ){
				bestDivPtRank = divPtRank;
				bestNumOvlaps = numOverlaps;
				bestNumMinObjs = j;
				bestDivPt = divPt;
			}

		}

	}
	
	function aIdxToC(a){
		if(a == 0)
			return "#FF0000";
		else if(a == 1)
			return "#00FF00";
		else
			return "#0000FF";
	}
	function aIdxToS(a){
		if(a == 0)
			return "x";
		else if(a == 1)
			return "y";
		else
			return "z";
	}
	
	function minMaxToCSide(aabb){

		if( aabb.minCoord[0] < 0.5 ){
			if( aabb.minCoord[1] < 0.5 ){
				if( aabb.minCoord[2] < 0.5 ){ //bottom left back corner
					if( aabb.maxCoord[0] < 0.5 ){
						return "left";
					}else{ //bottom, back
						if( aabb.maxCoord[2] > 0.5 ){
							return "bottom";
						}
						return "back";
					}
				}else{
					return "front";
				}
			}else{ //bottom left front corner
				return "top";
			}
		}else{
			return "right";
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
	this.AddObject = function( object, addDepth=0 ){
	//addDepth is to keep track of if all axies
	//have been checked for seperating the objects
		octTreeDivLogElm.innerHTML += "addObject d " + this.depth + 
							" a " + aIdxToS(this.axis) + 
							" ob " + minMaxToCSide(object.AABB) + "<br/>";

		//fill nodes until they are full (prevent unessecary subdividing)
		//but also don't add objects if they are inside objects already in the world
		//(if something is inside an object it should be parented to it)
		if( this.minNode == null ){ //not yet subdivided, try to add to self
			this.addToThisNode(object);
			if( this.objects.length < MaxTreeNodeObjects ){
				return;
			}else{ //need to subdivide
				//only leaf nodes should contain objects to avoid overlap ambiguity
				//also to allow rays to only check leaves while traversing
				if( this.depth+1 > MaxTreeDepth ) //prevent unbound tree growth to help avoid running out of memory
					return false;

				//try to split the node until there are only MaxTreeNodeObjects per node
				//to keep performace gains
				halfNumObjs = Math.floor(this.objects.length/2);
				let ovNumMinObjs; //ov stands for overall (all axies)
				let ovDivPtRank = 99999;
				let ovNumOvlaps;
				let ovDivPt;
				let ovAxis;
				octTreeDivLogElm.innerHTML += "Div at Depth " + addDepth + 
					" axis " + aIdxToS(this.axis) + " numObj " + this.objects.length +"<br/>";
				for( let a = 1; a < 3; ++a ){ //each level a different axis
					let newAxis = (this.axis + a) % 3;
					octTreeDivLogElm.innerHTML += "a " + aIdxToS(newAxis) + " ";
					this.FindOverlaps(this.objects, newAxis);
					octTreeDivLogElm.innerHTML += "numMin " + bestNumMinObjs;
					octTreeDivLogElm.innerHTML += " ovlaps " + bestNumOvlaps;
					octTreeDivLogElm.innerHTML += " divPt " + bestDivPt + "<br/>";
					if( bestDivPtRank < ovDivPtRank ){
						ovNumMinObjs  = bestNumMinObjs;
						ovDivPtRank   = bestDivPtRank;
						ovNumOvlaps   = bestNumOvlaps;
						ovDivPt       = bestDivPt;
						ovAxis        = newAxis;
					}
				}

				if( ovNumMinObjs > 0 &&  ovNumMinObjs < this.objects.length ){
					//create the min and max nodes
					octTreeDivLogElm.innerHTML += "div axis " + aIdxToS(ovAxis) + "<br/>";
					octTreeDivLogElm.innerHTML += "numMin " + ovNumMinObjs;
					octTreeDivLogElm.innerHTML += " ovlaps " + ovNumOvlaps;
					octTreeDivLogElm.innerHTML += " divPt " + ovDivPt + "<br/>";
					this.generateMinAndMaxNodes(ovAxis, ovDivPt);

					//divide the objects between the min and max nodes
					addDepth = addDepth + 1;
					for( let i = 0; i < this.objects.length; ++i ){
						if( i < ovNumMinObjs ){
							octTreeDivLogElm.innerHTML += "addToMin " + sortedObjs[ovAxis][i].AABB.minCoord[ovAxis];
							this.minNode.AddObject( sortedObjs[ovAxis][i], addDepth );
							if( i + ovNumOvlaps > ovNumMinObjs ){ //also add it to the max node
								octTreeDivLogElm.innerHTML += "OvlpAddToMax " + sortedObjs[ovAxis][i].AABB.minCoord[ovAxis];
								this.MaxNode.AddObject( sortedObjs[ovAxis][i], addDepth );

							}
						}else{
							octTreeDivLogElm.innerHTML += "addToMax " + sortedObjs[ovAxis][i].AABB.minCoord[ovAxis];
							this.MaxNode.AddObject( sortedObjs[ovAxis][i], addDepth );
						}
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
			if( object.AABB.minCoord[this.axis] < this.minNode.MaxCoord[this.axis] ){
				octTreeDivLogElm.innerHTML += "DivdAddToMin " + object.AABB.minCoord[this.axis];
				return this.minNode.AddObject( object, addDepth+1 );
			}else{
				octTreeDivLogElm.innerHTML += "DivdAddToMax " + object.AABB.minCoord[this.axis];
				return this.MaxNode.AddObject( object, addDepth+1 );
			}
		}

		return false;
	}

	this.SubNode = function( point ){
		//find which node the ray origin is in
		//to start tracing though node walls and objects from the ray's starting point
		if(!this.enabled)
			return null;

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
				RangeOverlaps( minRayCoord, maxRayCoord, this.axis ) ){
				retVal[0] = -1;
				this.objects[i].RayIntersect( retVal, ray );
				if( retVal[0] > 0 ){
					this.rayHitsPerFrame++;
					totalFrameRayHits++;
					this.objects[i].RayIntersect( retVal, ray );
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
		if( treeDebug && this.depth == Math.floor((sceneTime/2)%(this.maxDepth+1)) ){
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
			minminCoord[i] = this.minCoord[i]; //least is least of this node
			if( newAxis == i){ //if this is the axis (x y or z) that
				//minAndMax nodes split then use the dividing point given

				//the closest between object midpoint to the middle of the node is selected
				minMaxCoord[i] = divPt;
				MaxminCoord[i] = divPt;

			}else{ //for other axies use full range of this node
				minMaxCoord[i] = this.MaxCoord[i]; //the other axies span
				MaxminCoord[i] = this.minCoord[i]; //the full extent of this node
			}
			MaxMaxCoord[i] = this.MaxCoord[i]; //max is max of this node
		}
		//now that the extents of the nodes have been found create them
		this.maxDepth += 1;
		this.minNode = new TreeNode(newAxis, minminCoord, minMaxCoord, this);
		this.MaxNode = new TreeNode(newAxis, MaxminCoord, MaxMaxCoord, this);

		//set the debug oct tree color based on axis and depth
		if(		 newAxis == 0 ){
			this.minNode.boundColor[0] = 1-this.minNode.depth/(this.maxDepth+1);
			this.MaxNode.boundColor[0] = 1-this.MaxNode.depth/(this.maxDepth+1);  }
		else if( newAxis == 1 ){
			this.minNode.boundColor[1] = 1-this.minNode.depth/(this.maxDepth+1);
			this.MaxNode.boundColor[1] = 1-this.MaxNode.depth/(this.maxDepth+1);  }
		else if( newAxis == 2 ){
			this.minNode.boundColor[2] = 1-this.minNode.depth/(this.maxDepth+1);
			this.MaxNode.boundColor[2] = 1-this.MaxNode.depth/(this.maxDepth+1);  }
	}

}

