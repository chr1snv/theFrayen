//# sourceURL=Output/Rendering/Camera.js
//to request use or code/art please contact chris@itemfactorystudio.com
var gOM = new Float32Array(4*4);
function glOrtho(left, right, bottom, top, nearVal, farVal, gOM)
{
	//generates an orthographic (rectangular non perspective)
	//projection matrix for the camera

	let tx = -(right+left)/(right-left);
	let ty = -(top+bottom)/(top-bottom);
	let tz = -(farVal+nearVal)/(farVal-nearVal);
	let xs =  2.0/(right-left);
	let ys =  2.0/(top-bottom);
	let zs = -2.0/(farVal-nearVal);

	gOM[0*4+0]=xs;gOM[0*4+1]=0 ;gOM[0*4+2]=0; gOM[0*4+3]=tx;
	gOM[1*4+0]=0; gOM[1*4+1]=ys;gOM[1*4+2]=0; gOM[1*4+3]=ty;
	gOM[2*4+0]=0; gOM[2*4+1]=0; gOM[2*4+2]=zs;gOM[2*4+3]=tz;
	gOM[3*4+0]=0; gOM[3*4+1]=0; gOM[3*4+2]=0; gOM[3*4+3]=1.0;

	//return Float32Array([ xs,  0,  0, tx,
	//                       0, ys,  0, ty,
	//                       0,  0, zs, tz,
	//                       0,  0,  0,  1 ] );
}
var gPM = new Float32Array(4*4);
function gluPerspective(fovy, aspect, zNear, zFar)
{
	//generates the perspective projection matrix
	//to convert verticies from camera space positions in the frustum
	//to render/fragment shader coordinates in ndc/clip/screenSpace (a rectangular volume x,y with depth, range -1,1)

	let frusLen = (zFar-zNear);

	//tan(theta) = opposite/adjacent or (vertical far frustum half height) / (frustum depth)
	let f = 1/Math.tan(fovy*0.5); //f = frustum depth / inverse vertical far frustum half height
	//( goes to inf as fovy -> pi (180 deg)
	//if aspect (width/height) is 1 (square rendered image) xs and ys will be equal
	let xs = (f/aspect);                     //x scale factor
	let ys = (f);                            //y scale factor
	let zs =  (zFar+zNear)/frusLen;    //z scale factor
	let tz = -2*(zNear*zFar)/frusLen;//((2*zFar)*zNear)/(zNear-zFar);
	gPM[0*4+0]=xs;gPM[0*4+1]=0 ;gPM[0*4+2]=0;  gPM[0*4+3]=0;
	gPM[1*4+0]=0; gPM[1*4+1]=ys;gPM[1*4+2]=0;  gPM[1*4+3]=0;
	gPM[2*4+0]=0; gPM[2*4+1]=0; gPM[2*4+2]=-zs; gPM[2*4+3]=tz;
	gPM[3*4+0]=0; gPM[3*4+1]=0; gPM[3*4+2]=-1;  gPM[3*4+3]=0;

	//let w = z - 

	//depth_pct = (z-zNear)/frustumDepth
	//x_projected = x / ( depth_pct * farFrustumWidth  + (1-depth_pct) * nearFrustumWidth  )
	//y_projected = y / ( depth_pct * farFrustumHeight + (1-depth_pct) * nearFrustumHeight )
	//z_projected = depth_pct
	//need to put equations in the form
	//x_proj =  a*x / w  +  b*y / w  +  c*z / w  +  d*1 / w
	//     w =  a*x      +  b*y      +  c*z      +  d*1

	//solve for the z scaling
	//-1 = A + B/zNear
	//-1 = A / zNear + B / zNear
	//A / zNear = 1 + B / zNear
	//A = zNear + B

	// 1 = A + B/zFar
	// -A = 1 + B/zFar
	// A = -1 - B/zFar

}

//derivation of perspective transform matrix
//truncated pyramid [frustum] (near clip plane removes the pointy part of the 4 sided pyramid)
//everything is linear (this is linear algebra) so the matrix is really a coordinate transformation
//of the space inside the frustum to opengl ndc space ( x,y,z [-1,1] (normalized device space) )
//at the near clip plane r-l gives the clip plane width,
//turns out the problem was set depth mask being passed gl.TRUE instead of true


function NewDistNormColor(){
	return [0, new Float32Array(3), new Float32Array(4), null];
}

function Camera( nameIn, sceneNameIn, args, camReadyCallback, camReadyParameters )
{
	this.camReadyCallback = camReadyCallback;
	this.camReadyParameters = camReadyParameters;

	let ipoName     = args[0];
	let fovIn       = args[1];
	let nearClipIn  = args[2];
	let farClipIn   = args[3];
	let positionIn  = args[4];
	let rotationIn  = args[5];
	let lenArgs     = args.length;
	let stereoIn    = false; if( lenArgs > 6 )  stereoIn = args[6];
	let ipdCMIn     =3.9;    if( lenArgs > 7  ) ipdCMIn = args[7];


	this.cameraName = nameIn;
	this.sceneName  = sceneNameIn; //used to fetch ipo name / sceneName
	
	this.lookAtWorldPos = null;

	this.position = Vect3_CopyNew( positionIn ); //spawn position or ipoAnim position of the camera (camTranslation factors in this)
	this.rotation = Vect3_CopyNew( rotationIn );
	this.fov        = fovIn;      //the horizontal field of view

	this.nearClip   = nearClipIn; //the distance to the near clip plane from the camera origin in
	this.farClip    = farClipIn;

	this.stereo     = stereoIn;
	this.stereoIPD  = ipdCMIn;    //the ipd in centimeters

	this.userPosition = Vect3_NewZero(); //user input position (offset added to this.position to get this.camTranslation)
	this.userRotation = Quat_New_Identity(); //user input rotation

	this.isAnimated = false;
	this.ipoAnimation = null; //the animation curve for the camera (constructor fetches it from url based on the name and scene name)
	if( ipoName != '' ){
		this.isAnimated = true;
		//(filename, sceneName, ObjConstructor, ObjConstructorArgs, objReadyCallback, readyCallbackParameters)
		GRPH_GetCached( ipoName, sceneNameIn, IPOAnimation, null, CAM_IpoReady, this);
	}
	this.lastUpdateTime = 0;

	this.camToWorldMat         = Matrix_New();
	this.worldToCamMat         = Matrix_New(); //view matrix
	this.worldToScreenSpaceMat = Matrix_New();
	this.screenSpaceToWorldMat = Matrix_New();
	this.frustum = new Frustum;
	
	let tempMat    = Matrix_New(); //gets inverted

	//gets the quaternion camera in world space rotation
	//from either the ipo animation or assigned initial orientation
	let rotTmp = Quat_New();
	this.getRotation = function(rotOut)
	{
		if(!this.ipoAnimation || !IPOA_GetRotation( this.ipoAnimation, rotOut, this.lastUpdateTime))
			Quat_FromEuler(rotOut, this.rotation); //use assigned rotation (usually from user mouse or touchscreen input)
		//apply the user input rotation
		Quat_Copy( rotTmp, rotOut );
		Quat_MultQuat( rotOut, rotTmp, this.userRotation );
		Quat_Norm( rotOut );
	}
	this.getLocation = function(locOut)
	{
		if(!this.ipoAnimation || !IPOA_GetLocation( this.ipoAnimation, locOut, this.lastUpdateTime))
			Vect3_Copy( locOut, this.position);
		Vect3_Add( locOut, this.userPosition);
	}

	let rotMatRotQuatTemp = Quat_New();
	this.getRotationMatrix = function(rotMat)
	{
		if( this.lookAtWorldPos == null ){
			//get the new rotation from the ipo, assigned rotation, or initial rotation
			this.getRotation(rotMatRotQuatTemp);
			//convert it to a 4x4 matrix
			Matrix_SetQuatRotate( rotMat, rotMatRotQuatTemp );
		}else{ //use look at position and this position for rotation
			//assumes this.getLocation( this.camTranslation ); was called before getRotationMatrix
			Matrix_LookAt( rotMat, this.lookAtWorldPos, this.camTranslation );
		}
	}

	//apply the Cameras transformation
	this.GenWorldToFromScreenSpaceMats = function()
	//world space to camera space matrix 
	//( invert the projection matrix (camera space to screen space) * camera to world space matrix )
	{


		//calculate the inverse position transformation matrix for the camera
		//(the transformation matrix for the camera would be the matrix required
		//to transform the camera to its position in the world, but we want the
		//model view matrix to be the inverse of that, the matrix required to
		//bring the world into the view of the camera)
		this.genCameraToWorldMatrix();
		Matrix_Copy( tempMat, this.camToWorldMat ); //save before inverting
		Matrix_Inverse( this.worldToCamMat, tempMat );


		//multiply the inverseTransformationMatrix by the 
		//perspective (or othographic) matrix to get the camera projection matrix
		if( this.fov == 0.0 ) //zero deg fov, orthographic (no change in size with depth) projection assumed
		{
			glOrtho( -graphics.GetScreenAspect(), graphics.GetScreenAspect(),
					-graphics.screenHeight, graphics.screenHeight,
					-1, 1, gOM );
			Matrix_Multiply( this.worldToScreenSpaceMat, gOM, this.worldToCamMat );
		}
		else
		{
			gluPerspective(
				this.fov,					//field of view
				graphics.GetScreenAspect(), //aspect ratio
				this.nearClip,				//near clip plane distance
				this.farClip				//far clip plane distance
											);
			Matrix_Multiply( this.worldToScreenSpaceMat, gPM, this.worldToCamMat );
		}

		//invert the cam to world matrix 
		Matrix_Copy( tempMat, this.worldToScreenSpaceMat );
		Matrix_Inverse( this.screenSpaceToWorldMat, tempMat );

	}


	this.camTranslation       = Vect3_New();
	this.camRotation          = Quat_New();
	let transMat          = Matrix_New();
	Matrix_SetIdentity( transMat );
	//let invTransMat       = Matrix_New();
	this.camToWorldRotMat = Matrix_New();


	this.genCameraToWorldMatrix = function()
	{
		//get the translation from the ipo (animation), assigned position, or initial position
		this.getLocation(this.camTranslation);
		Matrix_SetTranslate(               transMat, this.camTranslation );

		//get the camera rotation from the lookat world position and the camera position, ipo assigned rotation or initial rotation
		this.getRotationMatrix( this.camToWorldRotMat );

		//combine the translation and rotation into one matrix
		Matrix_Multiply( this.camToWorldMat, transMat, this.camToWorldRotMat );
	}

	//update the Cameras position based on its animation
	this.Update = function(timeIn)
	{
		if( this.ipoAnimation != null )
			IPOA_GetMatrix( this.ipoAnimation, this.camToWorldMat, timeIn );
		this.lastUpdateTime = timeIn;
	}


	let worldCamRollAxis = Vect3_New();
	let rotTransPosDelta = Vect3_New();
	let infoString = "";
	let rotOriTmp = Quat_New();
	this.UpdateOrientation = function( positionDelta, rotationDelta, updateTime )
	{
		//Update the cameras transformation given a change in position and rotation.

		this.lastUpdateTime = updateTime;


		//append the rotation / roll in different axies to the camera
		Quat_Copy( rotOriTmp, this.userRotation );
		Quat_MultQuat( this.userRotation, rotOriTmp, rotationDelta );
		Quat_Norm( this.userRotation );

		//apply the camera rotation to the positionDeta 
		//to get a new position offset 
		//transform positionDelta from camera to world space
		Matrix_Multiply_Vect3( rotTransPosDelta, this.camToWorldRotMat, positionDelta );

		//forwards backwards left and right movement in world space
		this.userPosition[0] += rotTransPosDelta[0];
		this.userPosition[1] += rotTransPosDelta[1];
		this.userPosition[2] += rotTransPosDelta[2];

	}


	function GetFarClipBounds( bounds, fovy, aspect, zFar )
	//used to generate world coordinate rays from 
	//2d viewport (camera space) points
	{
		var ymax = zFar * Math.tan(fovy * Math.PI / 360.0);
		var ymin = -ymax;
		var xmin = ymin * aspect;
		var xmax = ymax * aspect;

		bounds = [ [xmin, ymin, -zFar],   //bottom left
		           [xmin, ymax, -zFar],   //top left
		           [xmax, ymin, -zFar],   //bottom right
		           [xmax, ymax, -zFar] ]; //top right
	}


	//traces rays from the camera and returns a SpectralImage (frequency domain) 
	//(for conversion and display as bitmap)

	//time domain multisampling is used to improve image quality
	//the intersection points in 3d camera space from previous frames are
	//transformed by the change in camera position matrix to generate new pixels
	//if there isn't much movement from last frame -use the first intersection
	//point of the previous frame's rays and translate them by the new camera
	//movement amount
	//then fade them out by the amount of frames behind the samples are and
	//if they are from static world objects or dynamicly updated models
	//refrence - linus tech tips framerate enhancement reprojection video

	this.numRaysToAccum = -1;
	this.prevPixPositions;
	this.prevRayPositions;
	this.prevPixColors;
	this.numRaysAccumulated = 0;
	this.accumIndex = 0;

	var horizFov = this.fov;
	var vertFov  = this.fov * graphics.GetScreenAspect();

	this.autoRaysPerFrame = false;
	this.minAutoRaysPerFrame = 500;
	this.maxAutoRaysPerFrame = 5000;

	//buffers of new ray intersections this frame
	this.numRaysPerFrame = 5000;

	this.numHorizRays = Math.sqrt(this.numRaysPerFrame) * graphics.GetScreenAspect();
	this.numVertRays = this.numRaysPerFrame / this.numHorizRays;

	this.changeNumRaysPerFrame = function( 
			newNumRaysPerFrame, 
			newAccumulatedRays, 
			minRays=this.minAutoRaysPerFrame, 
			maxRays=this.maxAutoRaysPerFrame, 
			autoAdjRays=this.autoRaysPerFrame 
		){
		this.numRaysPerFrame = newNumRaysPerFrame;

		this.minAutoRaysPerFrame = minRays;
		this.maxAutoRaysPerFrame = maxRays;
		this.autoRaysPerFrame = true;

		this.numHorizRays = Math.sqrt(this.numRaysPerFrame) * graphics.GetScreenAspect();
		this.numVertRays = this.numRaysPerFrame / this.numHorizRays;
		
		if( newAccumulatedRays != this.numRaysToAccum ){
			this.numRaysToAccum = newAccumulatedRays;
			this.prevRayPositions = new Float32Array(this.numRaysToAccum*3);
			this.prevPixColors    = new Float32Array(this.numRaysToAccum*4);
			this.numRaysAccumulated = 0;
			this.accumIndex = 0;
		}
	}
	this.changeNumRaysPerFrame(5000, 8000, 500, 5000, true);

	let avgPctRaysPerFrame = 1;
	let avgPctRaysFrameWeightIfDecrease = 0.4;
	let avgPctRaysFrameWeightIfIncrease = 0.001;
	let newTime = 0;
	this.checkShouldChangeNumRays = function(){
		newTime = Date.now();
		let elaspedMills = newTime - startTime;
		if ( elaspedMills < 1 )
			elaspedMills = 1; //prevent divide by zero

		let pctRaysInAllowedTime = allowedFrameMills/elaspedMills;

		if(pctRaysInAllowedTime < 1)
			avgPctRaysPerFrame = (avgPctRaysPerFrame*(1-avgPctRaysFrameWeightIfDecrease))+(pctRaysInAllowedTime*avgPctRaysFrameWeightIfDecrease);
		else
			avgPctRaysPerFrame = (avgPctRaysPerFrame*(1-avgPctRaysFrameWeightIfIncrease))+(pctRaysInAllowedTime*avgPctRaysFrameWeightIfIncrease);

		let newNumRaysPerFrame = avgPctRaysPerFrame*0.8*this.numRaysPerFrame;

		//prevent increasing unbounded increase when looking at empty space, and too low of a limit
		newNumRaysPerFrame = Math.min ( Math.max( newNumRaysPerFrame, this.minAutoRaysPerFrame ), this.maxAutoRaysPerFrame )
		
		if( Math.abs( newNumRaysPerFrame - this.numRaysPerFrame ) / this.numRaysPerFrame  > 0.3 ){
			//newNumRaysPerFrame = numRaysPerFrame*0.98 + newNumRaysPerFrame *0.02;
			raysPerFrameElm.value = newNumRaysPerFrame;
			this.changeNumRaysPerFrame(newNumRaysPerFrame, this.numRaysToAccum);
		}

	}


	this.onlyRaysNearCursor = false;


	if( !this.isAnimated && this.camReadyCallback != null )
		this.camReadyCallback(this, camReadyParameters );
}

function CAM_IpoReady(ipoAnim, cam){
	cam.ipoAnimation = ipoAnim;
	
	if( cam.camReadyCallback != null )
		cam.camReadyCallback(cam, cam.camReadyParameters );
}

let numRaysIntersected = 0; //number of intersections found
//generate rays in a grid and perturb the positions randomly
//to generate the sample positions (to be tiled "bundled" when multi-threaded)
let rayNorm = Vect3_New();
let screenPos = Vect3_New(); screenPos[2] = 0;
let len = rayNorm[0];
let ray = new Ray( Vect3_New(), Vect3_New() );
let dist_norm_color = NewDistNormColor();
let intPt = Vect3_New();
let allowedFrameMills = 100;
let startTime = 0;
let camOrigin = Vect3_New();
function CAM_RayCastDraw(cam, octTreeRoot ){

	startTime = Date.now();
	allowedFrameMills = 1000/targFps;


	cam.getLocation( camOrigin ); //shared between rays (copy per ray so doesn't get modified)

	//get the camera matrices to cast and reproject previous rays
	cam.GenWorldToFromScreenSpaceMats();

	//document.getElementById("cameraDebugText").innerHTML = 
	//	"cam pos: " + ToFixedPrecisionString( camOrigin, 1 );


	for(let v = 0; v < cam.numVertRays; ++v ){
		for( let h = 0; h < cam.numHorizRays; ++h ){
			//pick a random screen space position to cast the ray from
			screenPos[1] = (( Math.random() / cam.numVertRays ) + ( v / cam.numVertRays ))*2-1;
			screenPos[0] = ((Math.random() / cam.numHorizRays ) + ( h / cam.numHorizRays))*2-1;
			//get the world space end position of the ray normal
			Matrix_Multiply_Vect3( rayNorm, cam.screenSpaceToWorldMat, screenPos );
			//get the forward normal of the camera
			Vect3_Subtract( rayNorm, camOrigin );
			Vect3_Normal( rayNorm );
			
			Vect3_Copy( ray.origin, camOrigin );
			ray.norm = rayNorm;
			ray.lastNode = null;
			
			if( !cam.onlyRaysNearCursor ){
				TND_StartTrace( octTreeRoot, dist_norm_color, ray, float0 );
			}else{
				if( Math.abs(v - mScreenRayCoords[1]) < 2 && Math.abs(h - mScreenRayCoords[0]) < 2  ){
					
					//"trace" cause this line to be called for debug breakpointing
					if( keys[keyCodes.KEY_T] && v == mScreenRayCoords[1] && h == mScreenRayCoords[0] )
						DTPrintf("selected ray" + v + " " + h, "trace info" ); 
					
					
					//get the closest intersection point and pixel color of the ray in the scene
					TND_StartTrace( octTreeRoot, dist_norm_color, ray, float0 );
					if( keys[keyCodes.KEY_L] ) //"log" call this line for console log message printing
						DTPrintf("v" + v + " h" + h + " dist " + dist_norm_color[0] + " pt " + dist_norm_color[2], "trace info");
				}else{
					dist_norm_color[0] = -1;
				}
			}
			if( dist_norm_color[0] > float0 ){
				intPt[0] = ray.norm[0] * dist_norm_color[0] + ray.origin[0];
				intPt[1] = ray.norm[1] * dist_norm_color[0] + ray.origin[1];
				intPt[2] = ray.norm[2] * dist_norm_color[0] + ray.origin[2];

				CAM_AddPoint(cam, intPt, dist_norm_color[2] );
			}
	 }
	}
	if( cam.autoRaysPerFrame )
		cam.checkShouldChangeNumRays();
	
	updateHierarchyView(octTreeRoot); //update the debugging tree view
	
	if( cam.numRaysAccumulated > cam.numRaysToAccum )
		cam.numRaysAccumulated = cam.numRaysToAccum;
	
	//transform previous frame rays to screen space done in vertex shader
	
	//draw the newly and previously calculated pixels
	graphics.pointGraphics.drawPixels(
		cam.prevRayPositions, cam.prevPixColors, 
		cam.numRaysAccumulated, cam.worldToScreenSpaceMat );
	
	/*    
	//if the number of new rays in this frame is low
	//remove rays to avoid stale rays from cluttering view
	//(only benificial to remove samples
	//when a camera view change causes z depth overdraw or with animated objects)
	var numRaysToRemove = (numRaysPerFrame - numRaysIntersected) * 0.3;
	cam.numRaysAccumulated -= numRaysToRemove;
	if( cam.numRaysAccumulated < 0 )
		cam.numRaysAccumulated = 0;
	if( cam.accumIndex > cam.numRaysAccumulated )
		cam.accumIndex = 0;
	*/
}

//used with ray cast drawing when a new point is found
//(also for debug drawing oct tree node bound intersections)
function CAM_AddPoint(cam, intPt, col){

	//save new rays to accumulation buffer
	//store pixel worldspace position
	cam.prevRayPositions[cam.accumIndex*3 + 0] = intPt[0];
	cam.prevRayPositions[cam.accumIndex*3 + 1] = intPt[1];
	cam.prevRayPositions[cam.accumIndex*3 + 2] = intPt[2];

	cam.prevPixColors[cam.accumIndex*4 + 0]    = col[0];
	cam.prevPixColors[cam.accumIndex*4 + 1]    = col[1];
	cam.prevPixColors[cam.accumIndex*4 + 2]    = col[2];
	cam.prevPixColors[cam.accumIndex*4 + 3]    = col[3];

	cam.accumIndex += 1;
	//wrap around to beginning of accum buffer when reaching the end
	//to maximize buffered points
	//(could further improve this with some sort of area density
	//or time based flag for samples of animated object points
	//though this is simpler (something more complex may only be better
	//if it improved cached sample quality more than not doing it allows
	//time to sample more rays per frame))
	if( cam.accumIndex > cam.numRaysToAccum )
		cam.accumIndex = 0;

	cam.numRaysAccumulated += 1;
	//if( cam.numRaysAccumulated > cam.numRaysToAccum )
	//    cam.numRaysAccumulated = cam.numRaysToAccum;
}

/*
function CAM_ScanLineObjects( cam ){


	//generate the camera matrix
	cam.GenWorldToFromScreenSpaceMats();

	//testCamMatricies(cam, octTreeRoot);

}
*/
