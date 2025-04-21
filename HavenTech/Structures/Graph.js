//an associative graph

function GraphLink(type, strenth){
	this.type = type;
	this.strength = strength;
}

function GraphEntry(val){
	this.val = val;
	this.links = {};
}

function Graph(name){
	this.name = name;

	this.graphEntries = {};


	this.activeEntry = null;

	this.drawDepth = 5;
	this.drawMaxSpanPerEntry = 10;

	this.havenScene = null;
	this.cam = null;
}

function GRPH_AddEntry(gEntry){
	
}



//draw a graph in 3 dimensions
//prefer ordered row/column alignment if possible
//i.e. if object has multiple links of same type, draw them in a row/colum layout

//links specify strength of connection ( distance of something connected to another )


function GRPH_Draw( gph, rastB, time ){
	if ( gph.havenScene == null ){
		gph.havenScene = new HavenScene(gph.name, null, true);
	}

	//active entry is the selected node or one closest to the camera


	//check drawDepth and drawMaxSpanPerEntry from activeEntry are shown
	//draw the graph entries

	//breadth first traverse graph from the activeEntry
	let travDepth = 0;
	let travSpan = 0;
	let dpthObjs = new Array(1);
	if( gph.activeEntry ){
		dpthObjs[0] = gph.activeEntry;
	}else{
		let gphEntries = Object.entries( gph.graphEntries );
		if( gphEntries.length < 1 ){
			travDepth = gph.drawDepth; //don't try to traverse if graph is empty
		}
	}	
	while( travDepth < gph.drawDepth ){
		let nextDpthObjs = new Array();

		for( let j = 0; j < dpthObjs.length; ++j ){
			let travEntry = dpthObjs[j];
			if( travEntry == null )
				break;

			//draw the entry
			GRPH_DrawEntry( travEntry, gph.havenScene );

			//breadth first gather next depth objects from links from the travEntry
			let travLinkEntries = Object.entries(travEntry.links);
			for ( let i = 0; i < travLinkEntries.length; ++i ) {
				const [key, value] = travLinkEntries[i];
				dpthLnks.push( value );
			}

		}

		//increase the depth and breadth first continue breadth first adding objects
		travDepth += 1;
		dpthObjs = nextDpthObjs;
	}

	let cam = gph.havenScene.cameras[0];
	cam.GenWorldToFromScreenSpaceMats();
	rastB.worldToScreenSpaceMat = cam.worldToScreenSpaceMat;
	rastB.camFov = cam.fov;
	rastB.camWorldPos = cam.camTranslation;
	
	HVNSC_UpdateInCamViewAreaAndGatherObjsToDraw( gph.havenScene, time, rastB, null )

	//if objects in havenscene have been out of view for too long
	//and their are too many dormant objects then remove them

	//for( let i = 0; i < ; ++i){
	//	
	//}
}

function GRPH_DrawEntry(gphEntry, hvnSc){
	//update or create the graphical depiction (Model / quadmesh) of the entry in the havenScene
	
}
