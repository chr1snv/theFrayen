//Camera.js

function glOrtho(left, right, bottom, top, nearVal, farVal)
{
    //generates an orthographic (rectangular non perspective)
    //projection matrix for the camera

    var tx = -(right+left)/(right-left);
    var ty = -(top+bottom)/(top-bottom);
    var tz = -(farVal+nearVal)/(farVal-nearVal);
    var xs = 2/(right-left);
    var ys = 2/(top-bottom);
    var zs = -2/(farVal-nearVal);
    return Float32Array([ xs,  0,  0, tx,
                           0, ys,  0, ty,
                           0,  0, zs, tz,
                           0,  0,  0,  1 ] );
}
function gluPerspective(fovy, aspect, zNear, zFar)
{
    //generates the perspective projection matrix
    //to convert verticies from positions in the camera frustrum
    //to render/fragment shader coordinates (a rectangular volume x,y with depth)
    
    //tan(theta) = opposite/adjacent or (vertical far frustum half height) / 1 (frustrum depth)
    var f = 1/Math.tan(fovy/2); //f = inverse vertical far frustum half height / frustrum depth ( goes to inf as fovy -> pi (180 deg)
    //if aspect is 1 (square rendered image) xs and ys will be equal
    var xs = f/aspect;                     //x scale factor
    var ys = f;                            //y scale factor
    var zs = (zFar+zNear)/(zNear-zFar);    //z scale factor
    var tz = (2*zFar*zNear)/(zNear-zFar);
    return new Float32Array([ xs,  0,  0,  0,    
                               0, ys,  0,  0,
                               0,  0, zs, tz,    
                               0,  0, -1,  0 ]);
    
    var frustrumDepth = (zFar-zNear);
    //depth_pct = (z-zNear)/frustrumDepth
    //x_projected = x / ( depth_pct * farFrustrumWidth  + (1-depth_pct) * nearFrustrumWidth  )
    //y_projected = y / ( depth_pct * farFrustrumHeight + (1-depth_pct) * nearFrustrumHeight )
    //z_projected = depth_pct
    //need to put equations in the form
    //x_proj =  a*x / w  +  b*y / w  +  c*z / w  +  d*1 / w
    //     w =  a*x      +  b*y      +  c*z      +  d*1
    
}

function perspectiveMatrix(fovy, aspect, zNear, zFar)
{
    var lrHalfDist = 1*zFar;
    var btHalfDist = 1*zFar;
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

function Camera(nameIn, sceneNameIn, fovIn, nearClipIn, farClipIn, positionIn, rotationIn)
{
    this.cameraName = nameIn;
    this.sceneName = sceneNameIn;

    this.position = positionIn;
    this.rotation = rotationIn;
    this.fov = fovIn;

    this.setPositionDelta = new Float32Array([0,0,0]);
    this.setRotationDelta = new Float32Array([0,0,0]);

    this.nearClip = nearClipIn;
    this.farClip = farClipIn;
        
    this.frustum;
        
    this.ipoAnimation = new IPOAnimation(nameIn, sceneNameIn);
    this.time = 0;

    this.PerspectiveMatrix = new Float32Array(4*4);

    this.updateFrustum = function() {}
        
    this.getRotation = function(rotOut)
    {
        if(!this.ipoAnimation.GetRotation(rotOut, this.time))
            Vect3_Copy(rotOut, this.rotation);
        //urotate the camera by 90 degrees (blender camera starts off looking straight down)
        rotOut[0] -= 90.0*(Math.PI/180.0);
        Vect3_Add(rotOut, this.setRotationDelta);
    }
    this.getLocation = function(locOut)
    {
        if(!this.ipoAnimation.GetLocation(locOut, this.time))
            Vect3_Copy(locOut, this.position);
        Vect3_Add(locOut, this.setPositionDelta);
    }

    //apply the Cameras transformation
    this.calculateTransform = function(cameraProjectionMatrix)
    {
        if(this.fov == 0.0)
        {
            var projectionMat = glOrtho(-graphics.GetScreenAspect(), graphics.GetScreenAspect(),
                                         -graphics.screenHeight, graphics.screenHeight,
                                         -1, 1);
        }
        else
        {
            var projectionMat = gluPerspective(this.fov,                   //field of view
                                               graphics.GetScreenAspect(), //aspect ratio
                                               this.nearClip,              //near clip plane distance
                                               this.farClip                //far clip plane distance
                                              );
           var projectionMat2 = perspectiveMatrix(this.fov,                   //field of view
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
        var transformMat = this.getCameraToWorldMatrix();
        Matrix_Inverse( invTransformMat, transformMat );

        //multiply the inverseTransformationMatrix by the perspective matrix to get the camera projection matrix
        Matrix_Multiply( cameraProjectionMatrix, projectionMat, invTransformMat );
    }

    this.getCameraToWorldMatrix = function(){
        //get the camera rotation and translation from the ipo
        var translation = new Float32Array(3);
        var rot = new Float32Array(3);
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

    //update the Cameras position
    this.Update = function(timeIn) { time = timeIn; }
    this.UpdateOrientation = function(positionDelta, rotationDelta)
    {
        //Update the cameras transformation given a change in position and rotation.

        //apply the change in rotation
        this.setRotationDelta[0] += rotationDelta[0];
        this.setRotationDelta[1] += rotationDelta[1];

        //get the new rotation
        var rot = new Float32Array(3);
        this.getRotation(rot);

        var rotMat = new Float32Array(4*4);
        Matrix( rotMat, MatrixType.euler_rotate, rot );

        var transformedRot = new Float32Array(4*4);
        Matrix_Multiply_Vect3( transformedRot, rotMat, positionDelta );

        //    //prevent up down rotation past vertical
        //    if (rotation[0] > 90.0)
        //        rotation[0] = 90.0;
        //    if (rotation[0] < -90.0)
        //        rotation[0] = -90.0;

        //forwards backwards
        this.setPositionDelta[0] += transformedRot[0];
        this.setPositionDelta[1] += transformedRot[1];
        this.setPositionDelta[2] += transformedRot[2];
    }
    this.SetPosDelta = function(posIn) { Vect3_Copy(setPositionDelta, posIn); }

    //return a Frustum representing the volume to be rendered by the Camera
    this.GetFrustum = function() {}

    function GetFarClipBounds( bounds, fovy, aspect, zFar )
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

    //generate a ray from the camera origin in the direction of the screen
    this.GenerateWorldCoordRay = function(rayOrig, rayDir, screenCoords)
    {
        var vertCard = 3;
        
        //get the camera origin
        this.getLocation(rayOrig);
        
        //construct the far clip plane, and get the rayDir by
        //lerping between the boundries of the farClip plane
        /////////
        
        //get the camera rotation matrix
        var rot = new Float32Array(3);
        this.getRotation(rot);
        var rotMat = new Float32Array(4*4);
        Matrix(rotMat, MatrixType.euler_rotate, rot);
        //get the far clip plane bounds and rotate them by the camera rotation matrix
        var boundsTemp = new Array(4);
        var bounds =     new Array(4);
        GetFarClipBounds(boundsTemp, fov, 1.0, farClip);

        Matrix_Multiply_Array3(bounds, rotMat, boundsTemp);
        
        //interpolate between the points to get the end point of the ray
        var leftTemp =     new Array(vertCard);
        var rightTemp =    new Array(vertCard);
        var frustumPoint = new Array(vertCard);
        Vect3_LERP(leftTemp,  bounds[0], bounds[1], screenCoords[1]*0.5+0.5);   //bottom left, top left lerp
        Vect3_LERP(rightTemp, bounds[2], bounds[3], screenCoords[1]*0.5+0.5);   //bottom right, top right lerp
        Vect3_LERP(frustumPoint, leftTemp, rightTemp, screenCoords[0]*0.5+0.5); //left, right lerp

        Vect3_Copy(rayDir, frustumPoint);
    }


}
