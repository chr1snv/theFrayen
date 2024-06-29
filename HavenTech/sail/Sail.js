

function sceneSpecificLoad(newSceneName){
	if( newSceneName.startsWith( "girl" ) )
		ocean = new Ocean(mainScene);
}

function sceneSpecificUpdate(sceneName, time){
if( sceneName.startsWith( "girl" ) )
	if( ocean.ready )
		OCN_Update( ocean, time );
}

function sceneSpecificObjects( sceneName, objMap ){
if( sceneName.startsWith( "girl" ) )
	if( ocean.ready )
		objMap.set( ocean.uid.val, ocean );
	
}
