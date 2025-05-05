
let sceneScripts = [
	'sail/Sail.js',
	'iceMountian/iceMountian.js'
];

const ScnIds = {
	Sail       : 0,
	IceMountian: 1
};

const SceneNameToScnId = {
	"girl"          : ScnIds.Sail,
	"iceM"          : ScnIds.IceMountian
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
			break;
		case ScnIds.IceMountian:
			ICEM_sceneSpecificLoad(ldScnLdCmpCb);
	}
}


function sceneSpecificLoad(scnId, cmpCb){
	if( scnId >= 0 ){
		incFileIdx = 0;
		incFileList = [ 'SceneLogic/'+sceneScripts[scnId] ];
		loadScriptCmpCb = loadScnScriptsCmp;

		loadScnId = scnId;
		ldScnLdCmpCb = cmpCb;
		
		loadScriptLoop();
	}else{
		cmpCb();
	}
}

let lastFrameMDown = false;
let lastFrameMenuTouch = null;

//returns the number of active rasterBatches
function sceneSpecificUpdateAndGatherObjsToDraw(scnId, time, cam, rb2DTris, rb3DTris_array, rb3DLines_array){
	switch( scnId ){
		case ScnIds.Sail:
			return SAIL_sceneSpecificUpdateAndGatherObjsToDraw(time, cam, rb2DTris, rb3DTris_array, rb3DLines_array);
		case ScnIds.IceMountian:
			return ICEM_sceneSpecificUpdateAndGatherObjsToDraw(time, cam, rb2DTris, rb3DTris_array, rb3DLines_array);
	}
	return 1;
}


