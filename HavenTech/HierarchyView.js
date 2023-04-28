//HierarchyView.js
//to request use or code/art please contact chris@itemfactorystudio.com

//gives a visual editor view of the scene oct tree for performance diagnosis

function hideNode(n){
	n.style.setProperty('display', 'none');
}
let hideAllElm = document.getElementById('hideAllTreeHierarchy');
function hideAllHierarchy(){
	depthFirstTraverseHierarchy(hideNode);
	//hideAllHierarchy = 
}

function expandNode(n){
	n.style.setProperty('display', 'inherit');
}
let expandAllElm = document.getElementById('expandAllTreeHierarchy');
function expandAllHierarchy(){
	depthFirstTraverseHierarchy(expandNode);
	//expandAllElm = 
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

function sohdDiv(e){
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
		hierarchyRoot = mainScene.octTree.PrintHierarchy( 'Root' );
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

function depthFirstTraverseHierarchy(nodeAction){

	let h = hierarchyRoot;
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
		if( stk[lidx] == 3 ){ //node and subnodes visited return to parent
			h = h.parn;
			stk.pop(); }
	}
}

var scrollFramePx = 0.001;
let hierarchyUpdateInterval = 10;
let numNonHierarchyUpdates = 0;
function updateHierarchyView( camNode ){
	numNonHierarchyUpdates++;	
	if( numNonHierarchyUpdates < hierarchyUpdateInterval )
		return;
	else
		numNonHierarchyUpdates = 0;

	let hNd = camNode.hNode;
	let h = hierarchyRoot;
	let stk = [0]; //stack to traverse hierarchy view (integer state keeps track of if min and max have been visited at parent nodes of traversal)
	if(hNd){ //node the camera is in
		depthFirstTraverseHierarchy(scrollAndDisableCamIco);

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
