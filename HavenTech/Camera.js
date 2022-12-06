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
function gluPerspective(fovy, aspect, zNear, zFar)
{
    //generates the perspective projection matrix
    //to convert verticies from positions in the camera frustum
    //to render/fragment shader coordinates (a rectangular volume x,y with depth)
    
    //tan(theta) = opposite/adjacent or (vertical far frustum half height) / 1 (frustum depth)
    var f = 1/Math.tan(fovy/2); //f = inverse vertical far frustum half height / frustum depth ( goes to inf as fovy -> pi (180 deg)
    //if aspect is 1 (square rendered image) xs and ys will be equal
    var xs = f/aspect;                     //x scale factor
    var ys = f;                            //y scale factor
    var zs = (zFar+zNear)/(zNear-zFar);    //z scale factor
    var tz = (2*zFar*zNear)/(zNear-zFar);
    return new Float32Array([ xs,  0,  0,  0,
                               0, ys,  0,  0,
                               0,  0, zs, tz,
                               0,  0, -1,  0 ]);
    
    var frustumDepth = (zFar-zNear);
    //depth_pct = (z-zNear)/frustumDepth
    //x_projected = x / ( depth_pct * farfrustumWidth  + (1-depth_pct) * nearfrustumWidth  )
    //y_projected = y / ( depth_pct * farfrustumHeight + (1-depth_pct) * nearfrustumHeight )
    //z_projected = depth_pct
    //need to put equations in the form
    //x_proj =  a*x / w  +  b*y / w  +  c*z / w  +  d*1 / w
    //     w =  a*x      +  b*y      +  c*z      +  d*1
    
}

function perspectiveMatrix(fovy, aspect, zNear, zFar)
{
    var lrHalfDist = 0.5;//*zFar;
    var btHalfDist = 0.5;//*zFar;
    return glFrustum(-lrHalfDist, lrHalfDist, -btHalfDist, btHalfDist, zNear, zFar);
}

function glFrustum(l, r, b, t, n, f)
{
    //l and r are the coordinates for the left and right vertical clipping planes.
    //b and t are the coordinates for the bottom and top horizontal clipping planes.
    //n and f are the distances to the near and far depth clipping planes. Both distances must be positive.
    //the ratio between near val and far val determines the depth buffer bits per z
    //dont set n to 0 because the ratio will go to infinity

    //from the opengl redbook appendix f http://glprogramming.com/red/appendixf.html
    var x0 =   2*n   / ( r - l );
    var x1 =                   0;
    var x2 = ( r+l ) / ( r - l );
    var x3 =                   0;
    
    var y0 =                   0;
    var y1 =   2*n   / ( t - b );
    var y2 = ( t+b ) / ( t - b );
    var y3 =                   0;
    
    var z0 =                   0;
    var z1 =                   0;
    var z2 =-( f+n ) / ( f - n );
    var z3 = -2*f*n  / ( f - n );
    
    var w0 =                   0;
    var w1 =                   0;
    var w2 =                  -1;
    var w3 =                   0;
    
    return new Float32Array([ x0,  x1,  x2,  x3,
                              y0,  y1,  y2,  y3,
                              z0,  z1,  z2,  z3,
                              w0,  w1,  w2,  w3 ]);
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

    this.ProjectionMatrix = new Float32Array(4*4);
    this.frustum;

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
    this.GetProjectionMatrix = function() 
    //world space to camera space matrix 
    //( invert the projection matrix (camera space to screen space) * camera to world space matrix )
    {
        if(this.fov == 0.0) //zero deg fov, orthographic (no change in size with depth) projection assumed
        {
            var projectionMat = glOrtho(-graphics.GetScreenAspect(), graphics.GetScreenAspect(),
                                         -graphics.screenHeight, graphics.screenHeight,
                                         -1, 1);
        }
        else
        {
            var gluPersepctiveProjectionMat = gluPerspective(
                                               this.fov,                   //field of view
                                               graphics.GetScreenAspect(), //aspect ratio
                                               this.nearClip,              //near clip plane distance
                                               this.farClip                //far clip plane distance
                                              );
           var glFrustumProjectionMat       = perspectiveMatrix(
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
        var invTransformMat = new Float32Array(4*4);
        var transformMat    = this.getCameraToWorldMatrix();
        Matrix_Inverse( invTransformMat, transformMat );

        //multiply the inverseTransformationMatrix by the perspective matrix to get the camera projection matrix
        Matrix_Multiply( this.ProjectionMatrix, gluPersepctiveProjectionMat, invTransformMat );
        return this.ProjectionMatrix;
    }

    this.getCameraToWorldMatrix = function()
    {
        //get the camera rotation and translation from the ipo
        var translation     = new Float32Array(3);
        var rot             = new Float32Array(3);
        this.getRotation(rot);
        this.getLocation(translation);

        var transMat        = new Float32Array(4*4);
        var invTransMat     = new Float32Array(4*4);
        var rotMat          = new Float32Array(4*4);

        var transformMat    = new Float32Array(4*4);
        Matrix( transMat, MatrixType.translate, translation );
        Matrix( rotMat, MatrixType.euler_rotate, rot );
        Matrix_Multiply( transformMat, transMat, rotMat );
        return transformMat;
    }

    //update the Cameras position based on its animation
    this.Update = function(timeIn)
    {
        this.lastUpdateTime = timeIn;
    }
    
    this.UpdateOrientation = function(positionDelta, rotationDelta, rotation, updateTime)
    {
        //Update the cameras transformation given a change in position and rotation.
        
        this.lastUpdateTime = updateTime;

        //apply the change in rotation
        this.userRotation[0] += rotationDelta[0];
        this.userRotation[1] += rotationDelta[1];
        
        if( rotation != undefined )
            Vect3_Copy( this.rotation, rotation );

        //get the new rotation
        var rot            = new Float32Array( 3 );
        this.getRotation(rot);

        var rotMat         = new Float32Array( 4 * 4 );
        Matrix( rotMat, MatrixType.euler_rotate, rot );

        //apply the camera rotation to the positionDeta to get a new position offset (vector the direction of the camera correspondi
        var transformedRot = new Float32Array( 3 );
        Matrix_Multiply_Vect3( transformedRot, rotMat, positionDelta );

        //    //prevent up down rotation past vertical
        //    if (rotation[0] > 90.0)
        //        rotation[0] = 90.0;
        //    if (rotation[0] < -90.0)
        //        rotation[0] = -90.0;

        //forwards backwards
        this.userPosition[0] += transformedRot[0];
        this.userPosition[1] += transformedRot[1];
        this.userPosition[2] += transformedRot[2];
        
        var infoString  = "position "        + ToFixedPrecisionString( this.userPosition, 2 ) + "\n";
            infoString += "rotation "        + ToFixedPrecisionString( this.userRotation, 2 ) + "\n";
            infoString += "defaultPosition " + ToFixedPrecisionString( this.position, 2 ) + "\n";
            infoString += "defaultRotation " + ToFixedPrecisionString( this.rotation, 2 ) + "\n";
        document.getElementById( "cameraDebugText" ).innerHTML = infoString;
        
    }

    //return a Frustum (a 4 sided pyramid with a the top (the near clip plane) parallel to the base)
    //representing the volume to be rendered by the Camera
    //recalculate if not updated
    this.lastFrustumCalculationTime = -1;
    this.GetFrustum = function()
    {
        if( this.lastFrustumCalculationTime != this.lastUpdateTime ) 
        //the camera has likely moved since the last frustum parameters 
        //were calculated, update the frustum
        {
            this.frustum          = new Frustum();
            this.frustum.origin   = new Float32Array( 3 ); this.getLocation( this.frustum.origin );
            this.frustum.rotMat   = this.getRotationMatrix();
            
            
            //three principle axies in world space based on the camera orientation 
            this.frustum.normal = new Float32Array( 3 );
            Matrix_Multiply_Vect3( this.frustum.normal,  this.frustum.rotMat, [ 0, 0, 1 ] );
            //forward along the camera axis in world space
            this.frustum.up = new Float32Array( 3 );
            Matrix_Multiply_Vect3( this.frustum.up,      this.frustum.rotMat, [ 0, 1, 0 ] );
            //upward from the camera view in world space
            this.frustum.down = Vect3_CopyNew( this.frustum.up );
            Vect3_MultiplyScalar( this.frustum.down, -1 );
            this.frustum.right = new Float32Array( 3 );
            Matrix_Multiply_Vect3( this.frustum.right,   this.frustum.rotMat, [ 1, 0, 0 ] );
            //rightwards from the camera view in world space
            this.frustum.left = Vect3_CopyNew( this.frustum.right );
            Vect3_MultiplyScalar( this.frustum.left, -1 );
    
            this.frustum.nearClip = this.nearClip;
            this.frustum.farClip  = this.farClip;
        
            this.frustum.horizFov = this.fov;
            this.frustum.vertFov  = this.fov / graphics.GetScreenAspect(); //screen aspect is width / height
            
            
            //calculate the frustum planes from its parameters
            
            //get the near plane center
            //obtain the offset from the camera origin to the near clip plane by scaling the cameraForward vector by the nearClipDistance
            this.frustum.vectToNearPlane = Vect3_CopyNew( this.frustum.normal );
            Vect3_MultiplyScalar( this.frustum.vectToNearPlane, this.nearClip );
            //world space vector from the camera origin to the near clip plane
            this.frustum.nearPlaneCenter = Vect3_CopyNew( this.frustum.origin );
            Vect3_Add( this.frustum.nearPlaneCenter, this.frustum.vectToNearPlane );
            //world space location of the near plane center
            //get the near plane normal
            this.frustum.nearPlaneNormal = Vect3_CopyNew( this.frustum.normal );
            
            
            //get the far plane center
            this.frustum.vectToFarPlane = Vect3_CopyNew( this.frustum.normal );
            Vect3_MultiplyScalar( this.frustum.vectToFarPlane, this.farClip );
            //world space vector from the camera origin to the far clip plane
            this.frustum.farPlaneCenter = Vect3_CopyNew( this.frustum.origin );
            Vect3_Add( this.frustum.farPlaneCenter, this.frustum.vectToFarPlane );
            //world space location of the far plane center
            //get the far plane normal
            this.frustum.farPlaneNormal = Vect3_CopyNew( this.frustum.normal );
            Vect3_MultiplyScalar( this.frustum.farPlaneNormal, -1 );
            
            
            //get the midpoint between the near and far plane centers
            this.frustum.distToNearFarPlaneMidpoint = (this.nearClip + this.farClip) / 2.0;
            this.frustum.vectToNearFarPlaneMidpoint = Vect3_CopyNew( this.frustum.normal );
            Vect3_MultiplyScalar( this.frustum.vectToNearFarPlaneMidpoint, this.frustum.distToNearFarPlaneMidpoint );
            this.frustum.nearFarPlaneMidpoint = Vect3_CopyNew( this.frustum.vectToNearFarPlaneMidpoint );
            Vect3_Add( this.frustum.nearFarPlaneMidpoint, this.frustum.origin );
            
            
            //get the right plane center
            //the distance to the right plane center from the nearFarPlaneMidpoint is given by 
            //tan (because) tan = opposite / adjacent * distToNearFarPlaneMidpoint (
            var distToLeftRightPlaneCenters = Math.tan( this.frustum.horizFov / 2 ) * this.frustum.distToNearFarPlaneMidpoint;
            this.frustum.rightPlaneCenter = Vect3_CopyNew( this.frustum.right );
            Vect3_MultiplyScalar( this.frustum.rightPlaneCenter, distToLeftRightPlaneCenters );
            Vect3_Add( this.frustum.rightPlaneCenter, this.frustum.nearFarPlaneMidpoint );            
            //get the right plane normal
            var tempVectToRightPlaneCenterFromOrigin = Vect3_CopyNew( this.frustum.rightPlaneCenter );
            Vect3_Subtract( tempVectToRightPlaneCenterFromOrigin, this.frustum.origin );
            //vector from camera origin to center of right plane
            this.frustum.rightPlaneNormal = new Float32Array( 3 );
            Vect3_Cross( this.frustum.rightPlaneNormal, this.frustum.up, tempVectToRightPlaneCenterFromOrigin ); 
            //right hand rule (index finger = camera up, mid finger = origin to plane center (plane tangent), 
            //thumb = resultant normal to the plane )
            
            //get the left plane center
            this.frustum.leftPlaneCenter = Vect3_CopyNew( this.frustum.left );
            Vect3_MultiplyScalar( this.frustum.leftPlaneCenter, distToLeftRightPlaneCenters ); //inverse scalar to get the left plane
            Vect3_Add( this.frustum.leftPlaneCenter, this.frustum.nearFarPlaneMidpoint );
            //get the left plane normal
            var tempVectToLeftPlaneCenter = Vect3_CopyNew( this.frustum.leftPlaneCenter );
            Vect3_Subtract( tempVectToLeftPlaneCenter, this.frustum.origin );
            this.frustum.leftPlaneNormal = new Float32Array( 3 );
            Vect3_Cross( this.frustum.leftPlaneNormal, this.frustum.up, tempVectToLeftPlaneCenter ); 
            //right hand rule (index finger = camera up, mid finger = origin to plane center (plane tangent), 
            //thumb = resultant normal to the plane )
            
            
            //get the top plane center
            var distToTopBottomPlaneCenters = Math.tan( this.frustum.vertFov / 2 ) * this.frustum.distToNearFarPlaneMidpoint;
            this.frustum.topPlaneCenter = Vect3_CopyNew( this.frustum.up );
            Vect3_MultiplyScalar( this.frustum.topPlaneCenter, this.frustum.distToTopPlaneCenter );
            Vect3_Add( this.frustum.topPlaneCenter, this.frustum.nearFarPlaneMidpoint );
            //get the top plane normal
            var tempVectToTopPlaneCenter = Vect3_CopyNew( this.frustum.topPlaneCenter );
            Vect3_Subtract( tempVectToTopPlaneCenter, this.frustum.origin );
            this.frustum.topPlaneNormal = new Float32Array( 3 );
            Vect3_Cross( this.frustum.topPlaneNormal, tempVectToTopPlaneCenter, this.frustum.right ); 
            //right hand rule (index finger = top plane tangent (from camera origin towards camera forward), 
            //mid finger = camera right, thumb = resultant normal to the plane )
            
            
            //get the bottom plane center
            this.frustum.bottomPlaneCenter = Vect3_CopyNew( this.frustum.down );
            Vect3_MultiplyScalar( this.frustum.bottomPlaneCenter, this.frustum.distToTopPlaneCenter );
            Vect3_Add( this.frustum.bottomPlaneCenter, this.frustum.nearFarPlaneMidpoint );
            //get the top plane normal
            var tempVectToBottomPlaneCenter = Vect3_CopyNew( this.frustum.bottomPlaneCenter );
            Vect3_Subtract( tempVectToBottomPlaneCenter, this.frustum.origin );
            this.frustum.bottomPlaneNormal = new Float32Array( 3 );
            Vect3_Cross( this.frustum.bottomPlaneNormal, tempVectToBottomPlaneCenter, this.frustum.left ); 
            //right hand rule (index finger = bottom plane tangent (from camera origin towards camera forward), 
            //mid finger = camera left, thumb = resultant normal to the plane )
            
            //get the width and height of the near plane
            this.frustum.nearPlaneWidth  = Math.tan( this.frustum.horizFov / 2 ) * this.nearClip;
            this.frustum.nearPlaneHeight = Math.tan( this.frustum.vertFov  / 2 ) * this.nearClip;
            //get the left right up and down vectors on the near plane
            var nearLeft = Vect3_CopyNew( this.frustum.left );
            Vect3_MultiplyScalar( nearLeft, this.frustum.nearPlaneWidth );
            var nearRight = Vect3_CopyNew( this.frustum.right );
            Vect3_MultiplyScalar( nearRight, this.frustum.nearPlaneWidth );
            var nearUp = Vect3_CopyNew( this.frustum.up );
            Vect3_MultiplyScalar( nearUp, this.frustum.nearPlaneHeight );
            var nearDown = Vect3_CopyNew( this.frustum.down );
            Vect3_MultiplyScalar( nearDown, this.frustum.nearPlaneHeight );
            //get the upper corners of the near plane
            this.frustum.nearTopCenter = Vect3_CopyNew( this.frustum.nearPlaneCenter );
            Vect3_Add( this.frustum.nearTopCenter, nearUp );
            this.frustum.nearUpperLeft = Vect3_CopyNew( this.frustum.nearTopCenter );
            Vect3_Add( this.frustum.nearUpperLeft, nearLeft );
            this.frustum.nearUpperRight = Vect3_CopyNew( this.frustum.nearTopCenter );
            Vect3_Add( this.frustum.nearUpperRight, nearRight );
            //get the lower corners of the near plane
            this.frustum.nearBottomCenter = Vect3_CopyNew( this.frustum.nearPlaneCenter );
            Vect3_Add( this.frustum.nearBottomCenter, nearDown );
            this.frustum.nearBottomLeft = Vect3_CopyNew( this.frustum.nearBottomCenter );
            Vect3_Add( this.frustum.nearBottomLeft, nearLeft );
            this.frustum.nearBottomRight = Vect3_CopyNew( this.frustum.nearBottomCenter );
            Vect3_Add( this.frustum.nearBottomRight, nearRight );
            
            //get the width and height of the far plane
            this.frustum.farPlaneWidth  = Math.tan( this.frustum.horizFov / 2 ) * this.farClip;
            this.frustum.farPlaneHeight = Math.tan( this.frustum.vertFov  / 2 ) * this.farClip;
            //get the left right up and down vectors on the far plane
            var farLeft = Vect3_CopyNew( this.frustum.left );
            Vect3_MultiplyScalar( farLeft, this.frustum.farPlaneWidth );
            var farRight = Vect3_CopyNew( this.frustum.right );
            Vect3_MultiplyScalar( farRight, this.frustum.farPlaneWidth );
            var farUp = Vect3_CopyNew( this.frustum.up );
            Vect3_MultiplyScalar( farUp, this.frustum.farPlaneHeight );
            var farDown = Vect3_CopyNew( this.frustum.down );
            Vect3_MultiplyScalar( farDown, this.frustum.farPlaneHeight );
            //get the upper corners of the far plane
            this.frustum.farTopCenter = Vect3_CopyNew( this.frustum.farPlaneCenter );
            Vect3_Add( this.frustum.farTopCenter, farUp );
            this.frustum.farUpperLeft = Vect3_CopyNew( this.frustum.farTopCenter );
            Vect3_Add( this.frustum.farUpperLeft, farLeft );
            this.frustum.farUpperRight = Vect3_CopyNew( this.frustum.farTopCenter );
            Vect3_Add( this.frustum.farUpperRight, farRight );
            //get the lower corners of the far plane
            this.frustum.farBottomCenter = Vect3_CopyNew( this.frustum.farPlaneCenter );
            Vect3_Add( this.frustum.farBottomCenter, farDown );
            this.frustum.farBottomLeft = Vect3_CopyNew( this.frustum.farBottomCenter );
            Vect3_Add( this.frustum.farBottomLeft, farLeft );
            this.frustum.farBottomRight = Vect3_CopyNew( this.frustum.farBottomCenter );
            Vect3_Add( this.frustum.farBottomRight, farRight );
            
            //get corners of an AABB containing the frustum
            var minX =  Number.MAX_VALUE;
            var maxX = -Number.MAX_VALUE;
            var minY =  Number.MAX_VALUE;
            var maxY = -Number.MAX_VALUE;
            var minZ =  Number.MAX_VALUE;
            var maxZ = -Number.MAX_VALUE;
            var cornerPoints = [ 
                this.frustum.nearUpperLeft,  this.frustum.nearUpperRight, 
                this.frustum.nearBottomLeft, this.frustum.nearBottomRight,
                
                this.frustum.farUpperLeft,   this.frustum.farUpperRight, 
                this.frustum.farBottomLeft,  this.frustum.farBottomRight
            ];
            for( var i = 0; i < cornerPoints.length; i++ )
            {
                if( minX > cornerPoints[i][0] )
                    minX = cornerPoints[i][0];
                if( maxX < cornerPoints[i][0] )
                    maxX = cornerPoints[i][0];
                    
                if( minY > cornerPoints[i][0] )
                    minY = cornerPoints[i][0];
                if( maxY < cornerPoints[i][0] )
                    maxY = cornerPoints[i][0];
                    
                if( minZ > cornerPoints[i][0] )
                    minZ = cornerPoints[i][0];
                if( maxZ < cornerPoints[i][0] )
                    maxZ = cornerPoints[i][0];
            }
            
            this.frustum.minCoord = [ minX, minY, minZ ];
            this.frustum.MaxCoord = [ maxX, maxY, maxZ ];
            
            
        }
        
        return this.frustum;
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

    //generate a ray from the camera origin in the direction 
    //of the screen into the world
    //used for ray intersection / hit tests, interactions 
    //and clicking on objects in the rendered scene
    this.GenerateWorldCoordRay = function(rayOrig, rayDir, screenCoords)
    {
        var vertCard = 3;
        
        //get the camera origin
        this.getLocation(rayOrig);
        
        //construct the far clip plane, and get the rayDir by
        //lerping between the boundries of the farClip plane
        /////////
        
        //get the camera rotation matrix
        var rot        = new Float32Array(3);
        this.getRotation(rot);
        var rotMat     = new Float32Array(4*4);
        Matrix(rotMat, MatrixType.euler_rotate, rot);
        //get the far clip plane bounds and rotate them 
        //by the camera rotation matrix
        var boundsTemp = new Array(4);
        var bounds     = new Array(4);
        GetFarClipBounds(boundsTemp, fov, 1.0, farClip);

        Matrix_Multiply_Array3(bounds, rotMat, boundsTemp);
        
        //interpolate between the points to get the end point of the ray
        var leftTemp     = new Array(vertCard);
        var rightTemp    = new Array(vertCard);
        var frustumPoint = new Array(vertCard);
        Vect3_LERP(leftTemp,  bounds[0], bounds[1], screenCoords[1]*0.5+0.5);   
        //bottom left, top left lerp
        Vect3_LERP(rightTemp, bounds[2], bounds[3], screenCoords[1]*0.5+0.5);   
        //bottom right, top right lerp
        Vect3_LERP(frustumPoint, leftTemp, rightTemp, screenCoords[0]*0.5+0.5); 
        //left, right lerp

        Vect3_Copy(rayDir, frustumPoint);
    }
    
    
    //traces rays from the camera and returns a SpectralImage (frequency domain) 
    //(for conversion and display as bitmap)
    
    //time domain multisampling could also be used to improve image quality
    //if there isn't much movement from last frame -use the first intersection
    //point of the previous frame's rays and translate them by the new camera
    //movement amount
    //then fade them out by the amount of frames behind the samples are and
    //if they are from static world objects or dynamicly updated models
    //refrence - linus tech tips framerate enhancement reprojection video
    
    this.RayTraceDraw = function( octTreeRoot, width, height, 
                                  aspect, numNewRays ){
        var rayOrigin = [0, 0, 0];
        this.getLocation( rayOrigin );
    
        var horizFov = this.fov;
        var vertFov  = this.fov * aspect;
    
        var normal = new Float32Array( 3 );
        var camRotMat = this.getRotationMatrix();
        Matrix_Multiply_Vect3( normal,  this.getRotationMatrix(), [ 0, 0, 1 ] );
        
        graphics.SetupForPixelDrawing();
        
        var pixPositions = new Float32Array(numNewRays*2);
        var pixColors    = new Float32Array(numNewRays*3);
        
        //to avoid blocking the calling thread for too long
        //only trace the requested number of new rays before returning
        var numRaysIntersected = 0;
        for( var r = 0; r < numNewRays; ++r )
        {
             var w = Math.random();
             //while( Math.abs(w - 0.5) < 0.1 )
             //   w = Math.random();
             var h = Math.random();
             //while( Math.abs(h - 0.5) < 0.1 )
             //   h = Math.random();
             var vertAngle = -(vertFov/2.0) + ( vertFov * w );
             var horizAngle = -(horizFov/2.0) + ( horizFov * h );
            
             var rayNormal = Vect3_CopyNew( normal );
            
             var rayHorizRotMat = new Float32Array(4*4);
             Matrix(rayHorizRotMat, MatrixType.xRot, horizAngle);
            
             var rayVertRotMat = new Float32Array(4*4);
             Matrix(rayVertRotMat, MatrixType.yRot, vertAngle);

             Matrix_Multiply_Vect3( rayNormal, rayHorizRotMat, [0,0,1] );
            
             Matrix_Multiply_Vect3( rayNormal, rayVertRotMat,  rayNormal );
            
             Matrix_Multiply_Vect3( rayNormal, camRotMat, rayNormal );
            
             var ray = new Ray( rayOrigin, rayNormal );
            
             //get the closest
             //intersection point, ray distance, face index, and object
             //that the ray hit
             //intptDistFaceidx[0], intptDistFaceidx[1], 
             //intptDistFaceidx[2], this.objects[i]
             var intptdist_Faceidx_pixcolor = 
               octTreeRoot.GetClosestIntersectingSurface( ray, 0, rayOrigin );
             
             if( intptdist_Faceidx_pixcolor != null ){
                //store pixel screenspace position
                pixPositions[numRaysIntersected*2 + 0] = w*2.0 - 1.0;
                pixPositions[numRaysIntersected*2 + 1] = h*2.0 - 1.0;
                //pixPositions[r*3 + 2] = 0.0;
                //store pixel color
                pixColors   [numRaysIntersected*3 + 0] = 1;//intptdist_Faceidx_pixcolor[2][0];
                pixColors   [numRaysIntersected*3 + 1] = 0;//intptdist_Faceidx_pixcolor[2][1];
                pixColors   [numRaysIntersected*3 + 2] = 0;//intptdist_Faceidx_pixcolor[2][2];
                numRaysIntersected += 1;
             }
                 
             
             
        }
        graphics.drawPixels( pixPositions, pixColors, numRaysIntersected );
        
    }

}
