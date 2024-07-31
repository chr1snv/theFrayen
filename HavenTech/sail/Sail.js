

function sceneSpecificLoad(newSceneName){
	if( newSceneName.startsWith( "girl" ) )
		ocean = new Ocean(mainScene);
}


const SailModes = {
	Menu: 0,
	Gameplay: 1
};

let sgMode = SailModes.Menu;
function sceneSpecificUpdate(sceneName, time){
	if( sceneName.startsWith( "girl" ) ){
		if( ocean.ready )
			OCN_Update( ocean, time );
			
	}
}

function sceneSpecificObjects( sceneName, objMap ){
if( sceneName.startsWith( "girl" ) )
	if( ocean.ready )
		objMap.set( ocean.uid.val, ocean );
	
}


function sceneSpecificDraw( hvnsc ){

	if( hvnsc.sceneName.startsWith( "girl" ) ){
		if( sgMode == SailModes.Menu ){
		
			//menu background overlay
			cenPos        = [ 0        , 0    ];
			wdthHight     = [ 1        , 1    ];
			minUv         = [ 0        , 1    ];
			maxUv         = [ 1        , 0    ];
			TRI_G_drawScreenSpaceTexturedQuad(graphics.triGraphics, 'menuBg.png', 'sailDefault',  cenPos, wdthHight, minUv, maxUv, 0.1 );
			
			
			//text
			TR_QueueText( -0.2, 0.3, 0, 10, "SAIL" );
		}
	}
}
