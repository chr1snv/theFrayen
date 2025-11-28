//# sourceURL=SceneLogic/SceneSpecific.js
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
		
		loadScriptLoop(havenSourceZip);
	}else{
		cmpCb();
	}
}

let lastFrameMDown = false;
let lastFrameMenuTouch = null;

function GatherModelsToDrawForDefaultMainCam(batchArrayIdx=0){
	//generate the camera matrix
	mainCam.GenWorldToFromScreenSpaceMats();
	//set the camera parameters (matrix, fov, pos) of draw batches
	rastBatch3dTris_array[batchArrayIdx].worldToScreenSpaceMat = mainCam.worldToScreenSpaceMat;
	rastBatch3dTris_array[batchArrayIdx].camFov = mainCam.fov;
	rastBatch3dTris_array[batchArrayIdx].camWorldPos = mainCam.camTranslation;

	rastBatch3dLines_array[batchArrayIdx].worldToScreenSpaceMat = mainCam.worldToScreenSpaceMat;
	rastBatch3dLines_array[batchArrayIdx].camFov = mainCam.fov;
	rastBatch3dLines_array[batchArrayIdx].camWorldPos = mainCam.camTranslation;

	HVNSC_UpdateInCamViewAreaAndGatherObjsToDraw( mainScene, sceneTime, rastBatch3dTris_array[batchArrayIdx], rastBatch3dLines_array[batchArrayIdx] );
}

//returns the number of active rasterBatches
function sceneSpecificUpdateAndGatherObjsToDraw(scnId, time, cam, rb2DTris, rb3DTris_array, rb3DLines_array){

	if(AnimPlaybackEnabled){
		let now = Date.now();
		if( lastSceneTimeUpdate <= 0 || lastSceneTimeUpdate > now )
			lastSceneTimeUpdate = now;
		let delTime = ( now - lastSceneTimeUpdate ) /1000;
		sceneTime += delTime;
		lastSceneTimeUpdate = now;
	}

	switch( scnId ){
		case ScnIds.Sail:
			return SAIL_sceneSpecificUpdateAndGatherObjsToDraw(time, cam, rb2DTris, rb3DTris_array, rb3DLines_array);
		case ScnIds.IceMountian:
			return ICEM_sceneSpecificUpdateAndGatherObjsToDraw(time, cam, rb2DTris, rb3DTris_array, rb3DLines_array);
		default:
			FlyingCameraControlInput( time );
			GatherModelsToDrawForDefaultMainCam();
	}
	return 1;
}


