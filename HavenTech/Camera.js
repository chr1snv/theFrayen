//Camera.js


function glOrtho(left, right, bottom, top, nearVal, farVal)
{
    //generates an orthographic (rectangular non perspective)
    //projection matrix for the camera

    var tx = -(right+left)/(right-left);
    var ty = -(top+bottom)/(top-bottom);
    var tz = -(farVal+nearVal)/(farVal-nearVal);
    var xs =  2/(right-left);
    var ys =  2/(top-bottom);
    var zs = -2/(farVal-nearVal);
    return Float32Array([ xs,  0,  0, tx,
                           0, ys,  0, ty,
                           0,  0, zs, tz,
                           0,  0,  0,  1 ] );
}
var gPM = new Float32Array(4*4);
function gluPerspective(fovy, aspect, zNear, zFar)
{
    //generates the perspective projection matrix
    //to convert verticies from positions in the camera frustum
    //to render/fragment shader coordinates (a rectangular volume x,y with depth)
    
    //tan(theta) = opposite/adjacent or (vertical far frustum half height) / 1 (frustum depth)
    var f = 1/Math.tan(fovy/2); //f = inverse vertical far frustum half height / frustum depth 
    //( goes to inf as fovy -> pi (180 deg)
    //if aspect is 1 (square rendered image) xs and ys will be equal
    var xs = f/aspect;                     //x scale factor
    var ys = f;                            //y scale factor
    var zs = (zFar+zNear)/(zNear-zFar);    //z scale factor
    var tz = (2*zFar*zNear)/(zNear-zFar);
    gPM[0*4+0]=xs;gPM[0*4+1]=0 ;gPM[0*4+2]=0; gPM[0*4+3]=0;
    gPM[1*4+0]=0; gPM[1*4+1]=ys;gPM[1*4+2]=0; gPM[1*4+3]=0;
    gPM[2*4+0]=0; gPM[2*4+1]=0; gPM[2*4+2]=zs;gPM[2*4+3]=tz;
    gPM[3*4+0]=0; gPM[3*4+1]=0; gPM[3*4+2]=-1;gPM[3*4+3]=0;
    
    //var frustumDepth = (zFar-zNear);
    
    //depth_pct = (z-zNear)/frustumDepth
    //x_projected = x / ( depth_pct * farfrustumWidth  + (1-depth_pct) * nearfrustumWidth  )
    //y_projected = y / ( depth_pct * farfrustumHeight + (1-depth_pct) * nearfrustumHeight )
    //z_projected = depth_pct
    //need to put equations in the form
    //x_proj =  a*x / w  +  b*y / w  +  c*z / w  +  d*1 / w
    //     w =  a*x      +  b*y      +  c*z      +  d*1
    
}

//derivation of perspective transform matrix
//truncated pyramid [frustum] (near clip plane removes the pointy part of the 4 sided pyramid)
//everything is linear (this is linear algebra) so the matrix is really a coordinate transformation
//of the space inside the frustum to opengl ndc space ( x,y,z [-1,1] )
//at the near clip plane r-l gives the clip plane width,
//turns out the problem was set depth mask being passed gl.TRUE instead of true


function Camera(nameIn, sceneNameIn, fovIn, nearClipIn, farClipIn, positionIn, rotationIn, stereoIn=false, ipdCMIn=3.9)
{
    this.cameraName = nameIn;
    this.sceneName  = sceneNameIn;

    this.position   = positionIn; //animated / set position in the map
    this.rotation   = rotationIn;
    this.fov        = fovIn;      //the horizontal field of view
    
    this.nearClip   = nearClipIn; //the distance to the near clip plane from the camera origin in
    this.farClip    = farClipIn;
    
    this.stereo     = stereoIn;
    this.stereoIPD  = ipdCMIn;    //the ipd in centimeters

    this.userPosition = new Float32Array([0,0,0]); //user input position
    this.userRotation = new Float32Array([0,0,0]); //user input rotation
    
    this.ipoAnimation = new IPOAnimation(nameIn, sceneNameIn); //the animation curve for the camera (constructor fetches it from url based on the name and scene name)
    this.lastUpdateTime = 0;

    this.camToWorldMat         = new Float32Array(4*4);
    this.worldToCamMat         = new Float32Array(4*4); //view matrix
    this.worldToScreenSpaceMat = new Float32Array(4*4);
    this.screenSpaceToWorldMat = new Float32Array(4*4);
    //this.frustum;

    //gets the xyz euler radian camera in world space rotation
    //from either the ipo animation or assigned
    this.getRotation = function(rotOut) 
    {
        if(!this.ipoAnimation.GetRotation(rotOut, this.lastUpdateTime))
            Vect3_Copy(rotOut, this.rotation); //use assigned rotation (usually from user mouse or touchscreen input)
        else
            rotOut[0] -= 90.0*(Math.PI/180.0); //urotate the ipo animation by 90 degrees (blender camera starts off looking straight down)
        Vect3_Add(rotOut, this.userRotation);
    }
    this.getLocation = function(locOut)
    {
        if(!this.ipoAnimation.GetLocation(locOut, this.lastUpdateTime))
            Vect3_Copy(locOut, this.position);
        Vect3_Add(locOut, this.userPosition);
    }
    
    this.getRotationMatrix = function()
    {
        //get the new rotation
        var rot            = new Float32Array( 3 );
        this.getRotation(rot);

        var rotMat         = new Float32Array( 4 * 4 );
        Matrix( rotMat, MatrixType.euler_rotate, rot );
        return rotMat;
    }

    //apply the Cameras transformation
    this.GenWorldToFromScreenSpaceMats = function() 
    //world space to camera space matrix 
    //( invert the projection matrix (camera space to screen space) * camera to world space matrix )
    {
        if(this.fov == 0.0) //zero deg fov, orthographic (no change in size with depth) projection assumed
        {
            projectionMat = glOrtho(-graphics.GetScreenAspect(), graphics.GetScreenAspect(),
                                    -graphics.screenHeight, graphics.screenHeight,
                                    -1, 1);
        }
        else
        {
                gluPerspective(
                       this.fov,                   //field of view
                       graphics.GetScreenAspect(), //aspect ratio
                       this.nearClip,              //near clip plane distance
                       this.farClip                //far clip plane distance
                                          );
        }
        
        //calculate the inverse position transformation matrix for the camera
        //(the transformation matrix for the camera would be the matrix required
        //to transform the camera to its position in the world, but we want the
        //model view matrix to be the inverse of that, the matrix required to
        //bring the world into the view of the camera)
        this.genCameraToWorldMatrix();
        Matrix_Copy(this.camToWorldMat, camToWorldMat); //save before inverting
        Matrix_Inverse( this.worldToCamMat, camToWorldMat );
        
        //multiply the inverseTransformationMatrix by the 
        //perspective matrix to get the camera projection matrix
        Matrix_Multiply( this.worldToScreenSpaceMat, gPM, this.worldToCamMat );
        
        Matrix_Copy(camToWorldMat, this.worldToScreenSpaceMat);
        Matrix_Inverse( this.screenSpaceToWorldMat, camToWorldMat );
        
    }

    let translation     = new Float32Array(3);
    let rot             = new Float32Array(3);
    let transMat        = new Float32Array(4*4);
    let invTransMat     = new Float32Array(4*4);
    let rotMat          = new Float32Array(4*4);

    var camToWorldMat    = new Float32Array(4*4); //gets inverted
    this.genCameraToWorldMatrix = function()
    {
        //get the camera rotation and translation from the ipo (animation)
        
        this.getRotation(rot);
        this.getLocation(translation);


        //combine the translation and rotation into one matrix
        Matrix( transMat, MatrixType.translate, translation );
        Matrix( rotMat, MatrixType.euler_rotate, rot );
        Matrix_Multiply( camToWorldMat, transMat, rotMat );
        //return camToWorldMat;
    }

    //update the Cameras position based on its animation
    this.Update = function(timeIn)
    {
        this.lastUpdateTime = timeIn;
    }
    
    let transformedRot = new Float32Array( 3 );
    let infoString = "";
    this.UpdateOrientation = function(positionDelta, rotationDelta, updateTime, rotation=null)
    {
        //Update the cameras transformation given a change in position and rotation.
        
        this.lastUpdateTime = updateTime;
        
        //apply the change in rotation
        this.userRotation[0] += rotationDelta[0];
        this.userRotation[1] += rotationDelta[1];
        
        if( rotation != undefined ) //may be defunct
            Vect3_Copy( this.rotation, rotation );

        //get the new rotation
        this.getRotation(rot);

        Matrix( rotMat, MatrixType.euler_rotate, rot );

        //apply the camera rotation to the positionDeta 
        //to get a new position offset 
        //transform positionDelta from camera to world space
        Matrix_Multiply_Vect3( transformedRot, rotMat, positionDelta );

        //    //prevent up down rotation past vertical
        //    if (rotation[0] > 90.0)
        //        rotation[0] = 90.0;
        //    if (rotation[0] < -90.0)
        //        rotation[0] = -90.0;

        //forwards backwards left and right movement in world space
        this.userPosition[0] += transformedRot[0];
        this.userPosition[1] += transformedRot[1];
        this.userPosition[2] += transformedRot[2];
        
        //let camOrigin = [0, 0, 0];
        //this.getLocation( camOrigin );
        
        /*
        infoString  = "pos "        + ToFixedPrecisionString( camOrigin, 2 ) + "\n";
        infoString += "rot "        + ToFixedPrecisionString( rot, 2 ) + "\n";
        infoString += "defaultPos " + ToFixedPrecisionString( this.position, 2 ) + "\n";
        infoString += "defaultRot " + ToFixedPrecisionString( this.rotation, 2 ) + "\n";
        document.getElementById( "cameraDebugText" ).innerHTML = infoString;
        */
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
    
    this.numRaysToAccum;
    this.prevPixPositions;
    this.prevRayPositions;
    this.prevPixColors;
    this.numRaysAccumulated;
    this.accumIndex;
    
    let camOrigin = new Float32Array( 3 );
    
    var horizFov = this.fov;
    var vertFov  = this.fov * graphics.GetScreenAspect();
    
    //buffers of new ray intersections this frame
    let numRaysPerFrame;
    let rayPositions;
    let pixPositions;
    let pixColors;
    
    let numHorizRays = Math.sqrt(numRaysPerFrame) * graphics.GetScreenAspect();
    let numVertRays = numRaysPerFrame / numHorizRays;
    
    this.changeNumRaysPerFrame = function( newNumRaysPerFrame, newAccumulatedRays ){
        numRaysPerFrame = newNumRaysPerFrame;
        rayPositions = new Float32Array(numRaysPerFrame*3);
        pixPositions = new Float32Array(numRaysPerFrame*2);
        pixColors    = new Float32Array(numRaysPerFrame*3);
    
        numHorizRays = Math.sqrt(numRaysPerFrame) * graphics.GetScreenAspect();
        numVertRays = numRaysPerFrame / numHorizRays;
        
        newAccumulatedRays
        this.numRaysToAccum = newAccumulatedRays;
        this.prevPixPositions = new Float32Array(this.numRaysToAccum*2);
        this.prevRayPositions = new Float32Array(this.numRaysToAccum*3);
        this.prevPixColors    = new Float32Array(this.numRaysToAccum*3);
        this.numRaysAccumulated = 0;
        this.accumIndex = 0;
    }
    this.changeNumRaysPerFrame(5000, 8000);
    
    let numRaysIntersected = 0; //number of intersections found
    //generate rays in a grid and perturb the positions randomly
    //to generate the sample positions (to be tiled "bundled" when multi-threaded)
    let rayNorm = new Float32Array( 3 );
    let screenPos = new Float32Array( 3 );
    screenPos[2] = 0;
    let len = rayNorm[0];
    let ray = new Ray( camOrigin, rayNorm );
    let dist_norm_color = [0, new Float32Array(3), new Float32Array(4)];
    let intPt = new Float32Array(3);
    const startTime = (new Date()).getTime();
    let newTime = startTime;
    const allowedTime = 100;
    let worldPos  = new Float32Array( 3 );
    this.RayTraceDraw = function( octTreeRoot ){
        
        this.getLocation( camOrigin );
        
        
        
        //get the camera matrix and inverse to cast and reproject ray
        //intersections from previous frames
        this.GenWorldToFromScreenSpaceMats();
        //Matrix_Print( this.worldToScreenSpaceMat, "worldToScreenMatrix" );
        
        //Matrix_Print( this.screenSpaceToWorldMat, "screenToWorldMatrix" );
        
        
        
        
        
        for(let v = 0; v < numVertRays; ++v ){
            //newTime = (new Date()).getTime();
            //if ( newTime - startTime > allowedTime) //prevent slowing the browser
             //   break;
            for( let h = 0; h < numHorizRays; ++h ){
                screenPos[1] = (( Math.random() / numVertRays ) + ( v / numVertRays ))*2-1;
                screenPos[0] = ((Math.random() / numHorizRays) + (h / numHorizRays))*2-1;
                //get the world space end position of the ray normal
                Matrix_Multiply_Vect3( rayNorm, this.screenSpaceToWorldMat, screenPos );
                rayNorm[0]-=camOrigin[0];rayNorm[1]-=camOrigin[1];rayNorm[2]-=camOrigin[2];
                //get the forward normal of the camera
                len = rayNorm[0]*rayNorm[0]+rayNorm[1]*rayNorm[1]+rayNorm[2]*rayNorm[2];
                rayNorm[0]/=len;rayNorm[1]/=len;rayNorm[2]/=len;
                
                ray.origin = camOrigin;
                ray.norm = rayNorm;
                ray.lastNode = null;
                
                //get the closest intersection point and pixel color
                
                octTreeRoot.Trace( dist_norm_color, ray, 0 );
                
                if( dist_norm_color[0] > 0 ){
                   
                   ray.PointAtTime( intPt, dist_norm_color[0] );
                   
                   //store pixel screenspace position
                   pixPositions[numRaysIntersected*2 + 0] = screenPos[0];
                   pixPositions[numRaysIntersected*2 + 1] = screenPos[1];
                   
                   //store pixel color
                   pixColors   [numRaysIntersected*3 + 0] = dist_norm_color[2][0];
                   pixColors   [numRaysIntersected*3 + 1] = dist_norm_color[2][1];
                   pixColors   [numRaysIntersected*3 + 2] = dist_norm_color[2][2];
                   numRaysIntersected += 1;
                   
                   //save new rays to accumulation buffer
                   //store pixel worldspace position
                   this.prevRayPositions[this.accumIndex*3 + 0] = intPt[0];
                   this.prevRayPositions[this.accumIndex*3 + 1] = intPt[1];
                   this.prevRayPositions[this.accumIndex*3 + 2] = intPt[2];
                   
                   this.prevPixColors[this.accumIndex*3 + 0]    = dist_norm_color[2][0];
                   this.prevPixColors[this.accumIndex*3 + 1]    = dist_norm_color[2][1];
                   this.prevPixColors[this.accumIndex*3 + 2]    = dist_norm_color[2][2];
                   
                   this.accumIndex += 1;
                   if( this.accumIndex > this.numRaysToAccum )
                       this.accumIndex = 0;
                }
         }
        }
        
        //transform previous frame rays to screen space
        //let screenPos = new Float32Array( 3 );
        /*
        for( let i = 0; i < this.numRaysAccumulated; ++i ){
            worldPos[0] = this.prevRayPositions[i*3 + 0];
            worldPos[1] = this.prevRayPositions[i*3 + 1];
            worldPos[2] = this.prevRayPositions[i*3 + 2];
            Matrix_Multiply_Vect3( screenPos, this.worldToScreenSpaceMat, worldPos );
            this.prevPixPositions[i*2 + 0] = screenPos[0];
            this.prevPixPositions[i*2 + 1] = screenPos[1];
        }
        */
        
        //redraw previously calculated pixels
        graphics.drawPixels( /*this.prevPixPositions*/
            this.prevRayPositions, this.prevPixColors, 
            this.numRaysAccumulated, this.worldToScreenSpaceMat );
        
        this.numRaysAccumulated += numRaysIntersected;
        if( this.numRaysAccumulated > this.numRaysToAccum )
            this.numRaysAccumulated = this.numRaysToAccum;
        
        /*    
        //if the number of new rays in this frame is low
        //remove rays to avoid stale rays from cluttering view
        var numRaysToRemove = (numRaysPerFrame - numRaysIntersected) * 0.3;
        this.numRaysAccumulated -= numRaysToRemove;
        if( this.numRaysAccumulated < 0 )
            this.numRaysAccumulated = 0;
        if( this.accumIndex > this.numRaysAccumulated )
            this.accumIndex = 0;
        */
    }

}
