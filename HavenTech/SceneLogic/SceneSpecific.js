
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
			break;
		default:
			cntrlsTxtElm.innerText = "Touch / WASD keys Move, Q-E Roll, Shift 5x speed, Mouse click fullscreen look : ESC exit";
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

function DrawDefaultMainCam(){
	//generate the camera matrix
	mainCam.GenWorldToFromScreenSpaceMats();
	//set the camera parameters (matrix, fov, pos) of draw batches
	rastBatch3dTris_array[0].worldToScreenSpaceMat = mainCam.worldToScreenSpaceMat;
	rastBatch3dTris_array[0].camFov = mainCam.fov;
	rastBatch3dTris_array[0].camWorldPos = mainCam.camTranslation;

	rastBatch3dLines_array[0].worldToScreenSpaceMat = mainCam.worldToScreenSpaceMat;
	rastBatch3dLines_array[0].camFov = mainCam.fov;
	rastBatch3dLines_array[0].camWorldPos = mainCam.camTranslation;

	HVNSC_UpdateInCamViewAreaAndGatherObjsToDraw( mainScene, sceneTime, rastBatch3dTris_array[0], rastBatch3dLines_array[0] );
}

//returns the number of active rasterBatches
function sceneSpecificUpdateAndGatherObjsToDraw(scnId, time, cam, rb2DTris, rb3DTris_array, rb3DLines_array){
	switch( scnId ){
		case ScnIds.Sail:
			return SAIL_sceneSpecificUpdateAndGatherObjsToDraw(time, cam, rb2DTris, rb3DTris_array, rb3DLines_array);
		case ScnIds.IceMountian:
			return ICEM_sceneSpecificUpdateAndGatherObjsToDraw(time, cam, rb2DTris, rb3DTris_array, rb3DLines_array);
		default:
			DrawDefaultMainCam();
	}
	return 1;
}


