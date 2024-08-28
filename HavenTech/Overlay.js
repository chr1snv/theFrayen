
var lastInputTime = -10;
const noInputDisplayHelpOverlayTime = 3; //display help if no user input for 3 seconds
const numTimesBtwnInputHelpOverlayReset = 2;
const resetTimeBtwnInputHelpOverlay = 60;
let numInputHelpOverlayTimesLeft = 2;
let wasntShowingHelpInputOverlay = true;

function Overlay_DrawInputHint(rB2DTris){
	
	
	let timeSinceShowingInputHelperOverlay = sceneTime-lastInputTime;
	if( timeSinceShowingInputHelperOverlay > noInputDisplayHelpOverlayTime ){
		
		if( timeSinceShowingInputHelperOverlay > resetTimeBtwnInputHelpOverlay )
			numInputHelpOverlayTimesLeft = numTimesBtwnInputHelpOverlayReset;
		
		if(numInputHelpOverlayTimesLeft >= 0 ){
		
			if(wasntShowingHelpInputOverlay){
				wasntShowingHelpInputOverlay = false;
				numInputHelpOverlayTimesLeft -= 1;
				if( numInputHelpOverlayTimesLeft <= 0 ) //avoid showing for only 1 frame
					return;
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
				//TRI_G_prepareScreenSpaceTexturedQuad(triG, rB2DTris, textureName, sceneName, center, widthHeight, minUv, maxUv, depth, sspTInstNum=0 )
				TRI_G_prepareScreenSpaceTexturedQuad(graphics.triGraphics, rB2DTris, 'controls.png', 'default',  cenPos, wdthHight, minUv, maxUv, 0 );
				
				
				cenPos        = [ 0.5      , 0    ];
				wdthHight     = [ 0.5      , 0.5  ];
				minUv         = [ 0.5      , 1    ];
				maxUv         = [ 1        , 0    ];
				TRI_G_prepareScreenSpaceTexturedQuad(graphics.triGraphics, rB2DTris, 'controls.png', 'default',  cenPos, wdthHight, minUv, maxUv, 0 );
			
			} else {
				//console.log("Desktop device detected");
				cenPos        = [ 0        , 0    ];
				wdthHight     = [ 2        , 1.5  ];
				minUv         = [ 0        , 1    ];
				maxUv         = [ 1        , 0    ];
				TRI_G_prepareScreenSpaceTexturedQuad(graphics.triGraphics, rB2DTris, 'kbMouControls.png', 'default',  cenPos, wdthHight, minUv, maxUv, 0 );
			}
			
		}
	}else{
		wasntShowingHelpInputOverlay = true;
	}
}
