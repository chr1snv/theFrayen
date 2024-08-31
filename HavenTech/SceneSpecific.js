
let sceneScripts = [
	'sail/Sail.js'
];

const ScnIds = {
	Sail: 0
};

const SceneNameToScnId = {
	"girl" : ScnIds.Sail
};


function SceneNameToId( sceneName ){
	let scnNamePrefixs = Object.keys( SceneNameToScnId );
	for( let i = 0; i < scnNamePrefixs.length; ++i ){
		if( sceneName.startsWith( scnNamePrefixs[i] ) ){
			return SceneNameToScnId[scnNamePrefixs[i]];
		}
	}
	return -1;
}

let loadScnId = -1;
let ldScnLdCmpCb = null;
function loadScnScriptsCmp(){
	switch( loadScnId ){
		case ScnIds.Sail:
			SAIL_sceneSpecificLoad(ldScnLdCmpCb);
	}
}


function sceneSpecificLoad(scnId, cmpCb){
	if( scnId >= 0 ){
		incFileIdx = 0;
		incFileList = [ sceneScripts[scnId] ];
		loadScriptCmpCb = loadScnScriptsCmp;

		loadScnId = scnId;
		ldScnLdCmpCb = cmpCb;
		
		loadScriptLoop();
	}else{
		cmpCb();
	}
}

//returns the number of active rasterBatches
function sceneSpecificUpdateAndGatherObjsToDraw(scnId, time, cam, rb2DTris, rb3DTris_array, rb3DLines_array){
	switch( scnId ){
		case ScnIds.Sail:
			return SAIL_sceneSpecificUpdateAndGatherObjsToDraw(time, cam, rb2DTris, rb3DTris_array, rb3DLines_array);
	}
	return 1;
}

/*
function sceneSpecificObjects( scnId, objMap ){

	switch( scnId ){
		case ScnIds.Sail:
			SAIL_sceneSpecificObjects( objMap );
	}

}
*/

/*
function sceneSpecificDraw( scnId ){

	switch( scnId ){
		case ScnIds.Sail:
			SAIL_sceneSpecificDraw();
	}

}
*/
