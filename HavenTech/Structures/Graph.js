//an associative graph
//like a tree datastructure except that it can loop back on itself

function GraphLink(target, type, strength){
	this.type = type;
	this.strength = strength;
	this.target = target;
}

function GraphEntry(val){
	this.val = val;
	this.links = {};
	this.minRadius = 2; //the distance where the node will start pushing away other objects
}

function Graph(name){
	this.name = name;

	this.graphEntries = {};


	this.activeEntry = null;

	this.drawMaxDepth = 5;
	this.drawMaxSpanPerEntry = 10;

	this.havenScene = null;
}

//adds a node/datapoint/entry to the graph
function GRPH_AddEntry(gph, gEntry){
	gph.graphEntries[gEntry.val] = gEntry;

}



//draw a graph in 3 dimensions
//prefer ordered row/column alignment if possible
//i.e. if object has multiple links of same type, draw them in a row/colum layout

//links specify strength of connection ( distance of something connected to another )


function GRPH_AddObjsToSceneToDraw( gph, time ){
	if ( gph.havenScene == null ){
		gph.havenScene = new HavenScene(gph.name, null, true, [-100,-100,-100], [100,100,100], new PhysNode() );
		gph.havenScene.octTree.physNode.gravAccelVec[1] *= 0.1;
	}

	//active entry is the selected node or one closest to the camera


	//check drawMaxDepth and drawMaxSpanPerEntry from activeEntry are shown
	//draw the graph entries

	//breadth first traverse graph from the activeEntry
	let travDepth = 0; //depth of the traversal iteration
	let dpthObjs = new Array(1);
	if( gph.activeEntry ){ //use the selected entry to start drawing the graph
		dpthObjs[0] = [null,gph.activeEntry];
	}else{ //no object selected get some objects from the entries dictionary to draw
		dpthObjs = Object.entries( gph.graphEntries );
		if( dpthObjs.length < 1 ){
			travDepth = gph.drawMaxDepth; //don't try to traverse if graph is empty
		}
	}
	while( travDepth < gph.drawMaxDepth ){
		let nextDpthObjs = new Array();

		for( let j = 0; j < dpthObjs.length && j < gph.drawMaxSpanPerEntry; ++j ){
			let LinkEntryPair = dpthObjs[j];
			let objLinkedFrom = LinkEntryPair[0];
			let entry         = LinkEntryPair[1];
			if( entry == null )
				break;

			if( objLinkedFrom ){ //draw the link
				GRPH_AddLinkToScene( objLinkedFrom, entry, gph.havenScene );
			}

			//add the entry to the scene if not added already
			GRPH_AddEntryToScene( entry, gph.havenScene );

			//breadth first gather next depth objects from links from the entry
			let travLinkEntries = Object.entries(entry.links);
			for ( let i = 0; i < travLinkEntries.length && i < gph.drawMaxSpanPerEntry; ++i ) {
				const [key, value] = travLinkEntries[i];
				nextDpthObjs.push( [entry, value.target] );
			}

		}

		//increase the depth and breadth first continue breadth first adding objects
		travDepth += 1;
		dpthObjs = nextDpthObjs;
	}



}

let lastGraphVisInsertPosition = [0,0,0];
function GRPH_modelLoadedCb( model, cbData ){
	let hvnSc = cbData;

	//Vect3_Copy( model.origin, lastGraphVisInsertPosition );

	HVNSC_FinishAddingLoadedModelToScene( hvnSc, model );


	let cam = hvnSc.cameras[0];
	//hvnSc.cameras[0].lookAtWorldPos = model.quadmesh.origin;
	//blenderToCubeMapEulerRot

	cam.userPosition = new Float32Array([0,-2,0]);

	//Quat_LookAt( cam.userRotation, model.quadmesh.origin, cam.userPosition );
	Quat_FromXRot( cam.userRotation, -blenderToCubeMapEulerRot[0] ); //Math.PI/2 );
	//Matrix_SetEulerRotate( blenderToCubeMapEulerRot, blenderToCubeMapEulerRot );

	
}

function GRPH_AddEntryToScene(gphEntry, hvnSc){
	//update or create the graphical depiction (Model / quadmesh) of the entry in the havenScene
	if( hvnSc.modelNames[gphEntry.val] == undefined && hvnSc.pendingModelNamesToLoad[gphEntry.val] == undefined ){

		hvnSc.pendingModelNamesToLoad[gphEntry.val] = 1;

		//shape for the graph concept / entry / datapoint
		let entryMdl = new Model( nameIn=gphEntry.val, meshNameIn='gphDefaultEntryMesh', armNameIn=null, ipoNameIn=null, materialNamesIn=["Material"], 
				sceneNameIn='graph', AABBIn=new AABB([-1,-1,-1], [1,1,1]),
				locationIn=Vect3_CopyNew(lastGraphVisInsertPosition), rotationIn=Quat_New_Identity(), scaleIn=Vect3_NewAllOnes(),
				modelLoadedParameters=hvnSc, modelLoadedCallback=GRPH_modelLoadedCb, isPhysical=true );


		lastGraphVisInsertPosition[0] += 4;
	}

}

function GRPH_AddLinkToScene( objLinkedFrom, entry, hvnSc ){
	let name = "lnk:"+objLinkedFrom.val+":"+entry.val;

	//update or create the graphical depiction (Model / quadmesh) of the entry in the havenScene
	if( hvnSc.modelNames[name] == undefined && hvnSc.pendingModelNamesToLoad[name] == undefined ){

		hvnSc.pendingModelNamesToLoad[name] = 1;

		//create model for the links/lines to other concepts
		let entryMdl = new Model( nameIn=name, meshNameIn='gphDefaultLinkMesh', armNameIn=null, ipoNameIn=null, materialNamesIn=["Material"], 
								  sceneNameIn='graph', AABBIn=new AABB([-1,-1,-1], [1,1,1]),
								  locationIn=Vect3_CopyNew(lastGraphVisInsertPosition), rotationIn=Quat_New_Identity(), scaleIn=Vect3_NewAllOnes(),
								  modelLoadedParameters=hvnSc, modelLoadedCallback=GRPH_modelLoadedCb, isPhysical=true );


		lastGraphVisInsertPosition[0] += 4;
	}
}


//draws the scene
function GRPH_Draw(gph, rastB, time){

	//generate the camera matrix
	let cam = gph.havenScene.cameras[0];
	cam.GenWorldToFromScreenSpaceMats();
	//set the camera parameters (matrix, fov, pos) of draw batches
	rastB.worldToScreenSpaceMat = cam.worldToScreenSpaceMat;
	rastB.camFov = cam.fov;
	rastB.camWorldPos = cam.camTranslation;


	HVNSC_UpdateInCamViewAreaAndGatherObjsToDraw( gph.havenScene, time, rastB, rastB3DLines=null, simPhys=true );
	rastB.activeForFrame = true;

	FlyingCameraControlInput( time, camToUpdate=gph.havenScene.cameras[0] );

	//hvnSc.models[gphEntry.val]


	//if objects in havenscene have been out of view for too long
	//and their are too many dormant objects then remove them

	//for( let i = 0; i < ; ++i){
	//
	//}
}
