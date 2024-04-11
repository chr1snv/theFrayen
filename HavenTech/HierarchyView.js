//HierarchyView.js
//to request use or code/art please contact chris@itemfactorystudio.com

//gives a visual editor view of the scene oct tree for performance diagnosis

function hideNode(n){
	n.style.setProperty('display', 'none');
}
let hideAllElm = document.getElementById('hideAllTreeHierarchy');
function hideAllHierarchy(){

	depthFirstTraverseHierarchy(hierarchyRoot.mN.mN, hideNode, true);
	depthFirstTraverseHierarchy(hierarchyRoot.mN.MN, hideNode, true);
	depthFirstTraverseHierarchy(hierarchyRoot.MN.mN, hideNode, true);
	depthFirstTraverseHierarchy(hierarchyRoot.MN.MN, hideNode, true);
	//hideAllHierarchy = 
}

function expandNode(n){
	n.btn.subNdsDiv.style='display:table;';
	n.btn.innerHTML = 'V';
	n.style.setProperty('display', 'inherit');
}
let expandAllElm = document.getElementById('expandAllTreeHierarchy');
function expandAllHierarchy(){
	depthFirstTraverseHierarchy(hierarchyRoot, expandNode, true);
	//expandAllElm = 
}

let enDisHirhElm = document.getElementById('enDisHirh');
function enDisHirhUpdate(){
	if( hierarchyUpdateEn ){
		enDisHirhElm.innerText = "Enable Update";
		hierarchyUpdateEn = false;
	}else{
		enDisHirhElm.innerText = "Disable Update";
		hierarchyUpdateEn = true;
	}
}

var hierarchyRoot;

//toggle enable status of a octTree element from hierarchy view
function enbDisabONode(e){ 
	let elm = e.target;
	if(elm.oNode.enabled){
		elm.oNode.enabled = false;
		elm.style.setProperty('background-color','black');
		elm.style.setProperty('color','white');
		elm.innerText = 'O';
	}else{
		elm.oNode.enabled = true;
		elm.style.setProperty('background-color','white');
		elm.style.setProperty('color','black');
		elm.innerText = 'I';		
	}

}

function sohdDiv(e){ //show hide div
	let elm = e.target;
	let subNds = elm.subNdsDiv;
	if( subNds.style.display == 'none' ){
		subNds.style='display:table;';
		elm.innerHTML = 'V';
	}else{
		subNds.style='display:none;';
		elm.innerHTML = ">";
	}
}

let treeHierarchyButtonElm = document.getElementById('showTreeHierachy');
let treeHierarchyElm = document.getElementById('treeHierarchy');
let hiLActvElm = treeHierarchyElm; //pointer to the tree hierarchy elm being appended to
function showHideTreeHierachy(){
	if( treeHierarchyElm.style.display == 'none' ){
		treeHierarchyElm.style.display='contents';
		treeHierarchyButtonElm.innerHTML = 'V Tree Hierarchy';
		//generate the hierarcy view
		treeHierarchyElm.innerHTML = '';
		hiLActvElm = treeHierarchyElm;
		hierarchyRoot = PrintHierarchy(mainScene.octTree, 'Root' );
	}else{
		treeHierarchyElm.style.display='none';
		treeHierarchyButtonElm.innerHTML = '> Tree Hierarchy';
	}
}

let treeBuildLogButtonElm = document.getElementById('showTreeBuildLog');
let treeBuildLogTableElm = document.getElementById('octTreeDivLog');
function showHideTreeBuildLog(){
	if( treeBuildLogTableElm.style.display == 'none' ){
		treeBuildLogTableElm.style.display='flex';
		treeBuildLogButtonElm.innerHTML = 'V Tree Build Log';
	}else{
		treeBuildLogTableElm.style.display='none';
		treeBuildLogButtonElm.innerHTML = '> Tree Build Log';
	}
}

function scrollAndDisableCamIco(h){
	h.camIco.style.backgroundColor = '#00000000'; //disable camera icon

	//scroll object summary
	if( h.sT.scrollWidth > 0 ){
		if( h.sT.prevScroll == undefined ){
			h.sT.prevScroll = 0;
			h.sT.maxScroll = h.sT.scrollWidth - h.sT.clientWidth;
		}
		if( h.sT.maxScroll > 0 ){
			let newP = h.sT.prevScroll+scrollFramePx;
			if( newP >= h.sT.maxScroll )
				newP = 0;
			h.sT.scrollTo( Math.floor(newP), 0 );
			h.sT.prevScroll = newP;
		}
	}
}

function depthFirstTraverseHierarchy(h, nodeAction, visitObjs){

	//let h = hierarchyRoot;
	let stk = [0]; //stack
	while( stk.length > 0 ){
		let lidx = stk.length-1;
		if( stk[lidx] == 0 ){ //do current node
			nodeAction(h);
			stk[lidx] = 1; //next operation on this node
		}
		if( stk[lidx] == 1 ){ //visit min node
			stk[lidx] = 2;
			if( h.mN ){
				h = h.mN;
				stk.push(0);
				continue; }
		}
		if( stk[lidx] == 2 ){ //visit max node
			stk[lidx] = 3;
			if( h.MN ){
				h = h.MN;
				stk.push(0);
				continue; }
		}
		if( stk[lidx] >= 3 ){ //node and subnodes visited optionally visit objects
			if( visitObjs ){
				let objIdx = stk[lidx] - 3;
				stk[lidx] += 1;
				if( objIdx < h.objs.length )
					depthFirstTraverseHierarchy(h.objs[objIdx], nodeAction, visitObjs);
				else
					stk[lidx] = -1;
			}else{
				stk[lidx] = -1;
			}
		 }
		if( stk[lidx] == -1 ){ //return to parent
			h = h.parn;
			stk.pop();
		}
	}
}

var scrollFramePx = 0.001;
let hierarchyUpdateInterval = 10;
let numNonHierarchyUpdates = 0;
let hierarchyUpdateEn = true;
function updateHierarchyView( camNode ){
	if( !hierarchyUpdateEn )
		return;
	numNonHierarchyUpdates++;	
	if( numNonHierarchyUpdates < hierarchyUpdateInterval )
		return;
	else
		numNonHierarchyUpdates = 0;

	let hNd = camNode.hNode;
	let h = hierarchyRoot;
	let stk = [0]; //stack to traverse hierarchy view (integer state keeps track of if min and max have been visited at parent nodes of traversal)
	if(hNd){ //node the camera is in
		depthFirstTraverseHierarchy(hierarchyRoot, scrollAndDisableCamIco);

		//now all previous camera icons are disabled
		//make the camera icon visible and
		//walk up the hierarchy to make sure that node is visible
		while( hNd && hNd != hierarchyRoot ){ 
			if( hNd.camIco )
				hNd.camIco.style.setProperty( 'background-color', 'gray' );
			hNd.style.setProperty('display', 'contents' );
			hNd = hNd.parentElement;
		}
	}
}

function aIdxToC(a){ //axis index to color
	if(a == 0)
		return "#FF0000";
	else if(a == 1)
		return "#00FF00";
	else
		return "#0000FF";
}
function aIdxToS(a){ //axis index to string
	if(a == 0)
		return "x";
	else if(a == 1)
		return "y";
	else
		return "z";
}

//for test cube use the min max of the face aabb to determine which of the 6 faces it is
function minMaxToCSide(aabb){

	if( aabb.minCoord[0] < 0.5 ){ //x left
		if( aabb.minCoord[1] < 0.5 ){ //y down
			if( aabb.minCoord[2] < 0.5 ){ //z into screen
				//bottom left back corner is part of aabb
				if( aabb.maxCoord[0] < 0.5 ){ //entire side is to the left of center
					return "left";
				}else{ //must be the bottom or back
					if( aabb.maxCoord[2] > 0.5 ){ //entire side is below center
						return "bottom";
					}//not the left or bottom so must be the back side
					return "back";
				}
			}else{
				//has a corner below the midpoint (so it's not the top)
				//also a corner left down (so can't be the right side)
				return "front";
			}
		}else{ //left top corner and left, back and front already checked
			return "top";
		}
	}else{ // min x is to right of center and the other 5 sides have been checked
		return "right";
	}
	
}

//recursive function to walk the oct tree and print nodes
function PrintHierarchy( on, nodeName, parn, obSumCnts = undefined ){

	let prevHiLActvElm = hiLActvElm;

	let tt = document.createElement('table');  //top table
	tt.parn = parn; //(top table of parent)
	tt.style.setProperty('margin-left', '4px');
	tt.style.setProperty('display', 'table');
	let bgOpacity = numToHex(on.rayHitsPerFrame/totalFrameRayHits*255);
	if( bgOpacity[0] > '0' ) //indicate the number of ray hits with opacity intensity
		bgOpacity = "55";
	let bgCol = '1px solid ' + aIdxToC(on.axis);

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
				tt.btn = b;
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
			//td.innerText = aIdxToS(on.axis); //+ " " + Vect_FixedLenStr(on.minCoord, 2, 4) + " " + vFxLenStr(on.MaxCoord, 2, 4);
		ttr.appendChild( td );
	t.appendChild( ttr );

	let tr = document.createElement('tr');
	td = document.createElement('td');
	td.appendChild( t );
	tr.appendChild(td);

	tt.appendChild( tr );

	tt.oNode = on; //the oct tree node
	on.hNode = tt; //link the hierarchy view element for updating from the oct tree node as the camera moves

	let objSummary = document.createElement('td');
	objSummary.style.setProperty('width', '100px');
	objSummary.style.setProperty('height', '20px');
	objSummary.style.setProperty('overflow', 'scroll');
	objSummary.style.setProperty('display', 'block ruby');
	objSummary.style.setProperty('scrollbar-width', 'none');

	objSummary.onVisible; //attempt to have a callback when in view to scroll contents
	
	tt.objs = [];

	c.style.setProperty('display', 'none');
	hiLActvElm = c;
	for(let i = 0; i < on.objects[0].length; ++i ){
		if( on.objects[0][i].meshName ){
			objSummary.innerText += " " + on.objects[0][i].meshName;
			//td.innerText = on.objects[0][i].meshName;
			//tr.appendChild( td );
			//c.appendChild( tr );
			//tr = document.createElement('tr');
			//td = document.createElement('td');
			
			tt.objs.push( PrintHierarchy(on.objects[0][i].quadmesh.octTree, on.objects[0][i].meshName, tt, 
					Vect_FixedLenStr(on.objects[0][i].AABB.minCoord, 2, 3 ) + ":" + Vect_FixedLenStr(on.objects[0][i].AABB.maxCoord, 2, 3 ) ) );
			//tr.appendChild( td );
			//c.appendChild( tr );
		}else{
			tr = document.createElement('tr');
			td = document.createElement('td');
			td.innerText = minMaxToCSide(on.objects[0][i].AABB) + ":" + Vect_FixedLenStr( on.objects[0][i].AABB.minCoord, 2, 3 ) + ":" + Vect_FixedLenStr(on.objects[0][i].AABB.maxCoord, 2, 3 );
			objSummary.innerText += " " + minMaxToCSide(on.objects[0][i].AABB);
			tr.appendChild( td );
			c.appendChild( tr );
		}
	}
	if( objSummary.innerText == "" && obSumCnts != undefined )
		objSummary.innerText = obSumCnts;
	
	tt.sT = objSummary;
	ttr.appendChild( objSummary );
	tr = document.createElement('tr');
	td = document.createElement('td');
	hiLActvElm = td;
	if( on.minNode != null ) tt.mN = PrintHierarchy(on.minNode, 'm'+(on.root.maxDepth-on.depth), tt );
	tr.appendChild( td );
	c.appendChild( tr );
	tr = document.createElement('tr');
	td = document.createElement('td');
	hiLActvElm = td;
	if( on.MaxNode != null ) tt.MN = PrintHierarchy(on.MaxNode, 'M'+(on.root.maxDepth-on.depth), tt );
	tr.appendChild( td );
	c.appendChild( tr );

	//add the child objects and min max nodes as a table row to the top level table of this
	tr = document.createElement('tr');
	td = document.createElement('td');
	td.appendChild( c );
	tr.appendChild(td);
	tt.appendChild( tr );

	//add the this top level table as a row to the parent at the time of calling
	tr = document.createElement('tr');
	td = document.createElement('td');
	td.appendChild( tt );
	tr.appendChild(td);
	prevHiLActvElm.appendChild( tr );
	hiLActvElm = prevHiLActvElm;

	return tt;
}
