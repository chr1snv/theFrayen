
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


function sceneSpecificUpdateAndGatherObjsToDraw(scnId, time, rb2D, rb3D){
	switch( scnId ){
		case ScnIds.Sail:
			SAIL_sceneSpecificUpdateAndGatherObjsToDraw(time, rb2D, rb3D);
	}
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
