
function Overlay_DrawInputHint(){
	framesSinceLastFPSOutputTime += 1;
	if( sceneTime - lastSceneFPSOutputTime >= 1 ){
		fpsElm.innerHTML = framesSinceLastFPSOutputTime;
		lastSceneFPSOutputTime = sceneTime;
		framesSinceLastFPSOutputTime = 0;
	}
	
	let timeSinceShowingInputHelperOverlay = sceneTime-lastInputTime;
	if( timeSinceShowingInputHelperOverlay > noInputDisplayHelpOverlayTime ){
		
		if( timeSinceShowingInputHelperOverlay > resetTimeBtwnInputHelpOverlay )
			numInputHelpOverlayTimesLeft = numTimesBtwnInputHelpOverlayReset;
		
		if(numInputHelpOverlayTimesLeft > 0 ){
		
			if(wasntShowingHelpInputOverlay){
				wasntShowingHelpInputOverlay = false;
				numInputHelpOverlayTimesLeft -= 1;
			}
		
			TRI_G_Setup(graphics.triGraphics);
			
			if (hasTouchSupport()) {
				//console.log("Mobile device detected");
			
				//draw quads with left of screen movement and right rotate graphics
				
				let transAnimTime = sceneTime%4;
				let lrOff = 0;
				let udOff = 0;
				if( lrOrUdAnim ){
					lrOff = Math.sin(sceneTime*2)*0.25;
					if( Math.abs(lrOff) < 0.05 && lrOrUdChangeResetFrames-- <= 0 ){
						lrOrUdAnim = false;
						lrOrUdChangeResetFrames = 10;
					}
				}else{
					udOff = Math.sin(sceneTime*2)*0.25;
					if( Math.abs(udOff) < 0.05 && lrOrUdChangeResetFrames-- <= 0 ){
						lrOrUdAnim = true;
						lrOrUdChangeResetFrames = 10;
					}
				}
				let cenPos    = [-0.5+lrOff, udOff];
				let wdthHight = [ 0.5      , 0.5  ];
				let minUv     = [   0      , 1    ];
				let maxUv     = [ 0.5      , 0    ];
				TRI_G_drawScreenSpaceTexturedQuad(graphics.triGraphics, 'controls.png', 'default',  cenPos, wdthHight, minUv, maxUv );
				
				
				cenPos        = [ 0.5      , 0    ];
				wdthHight     = [ 0.5      , 0.5  ];
				minUv         = [ 0.5      , 1    ];
				maxUv         = [ 1        , 0    ];
				TRI_G_drawScreenSpaceTexturedQuad(graphics.triGraphics, 'controls.png', 'default',  cenPos, wdthHight, minUv, maxUv );
			
			} else {
				//console.log("Desktop device detected");
				cenPos        = [ 0        , 0    ];
				wdthHight     = [ 2        , 1.5  ];
				minUv         = [ 0        , 1    ];
				maxUv         = [ 1        , 0    ];
				TRI_G_drawScreenSpaceTexturedQuad(graphics.triGraphics, 'kbMouControls.png', 'default',  cenPos, wdthHight, minUv, maxUv );
			}
			
		}
	}else{
		wasntShowingHelpInputOverlay = true;
	}
}
