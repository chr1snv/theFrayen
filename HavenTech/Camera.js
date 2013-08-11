//Camera.js

function glOrtho(left, right, bottom, top, nearVal, farVal)
{
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
    var f = 1/Math.tan(fovy/2);
    var xs = f/aspect;
    var ys = f;
    var zs = (zFar+zNear)/(zNear-zFar);
    var tz = (2*zFar*zNear)/(zNear-zFar);
    return new Float32Array([ xs,  0,  0,  0,
                               0, ys,  0,  0,
                               0,  0, zs, tz,
                               0,  0, -1,  0 ]);
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
            var cameraProjectionMatrix = glOrtho(-graphics.GetScreenAspect(), graphics.GetScreenAspect(),
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

            //get the camera rotation and translation from the ipo
            var translation = new Float32Array(3);
            var rot = new Float32Array(3);
            this.getRotation(rot);
            this.getLocation(translation);

            //calculate the inverse position transformation matrix for the camera
            //(the transformation matrix for the camera would be the matrix required
            //to transform the camera to its position in the world, but we want the
            //model view matrix to be the inverse of that, the matrix required to
            //bring the world into the view of the camera)
            var invTransformationMat = new Float32Array(4*4);

            var rotMat      = new Float32Array(4*4);
            var transMat    = new Float32Array(4*4);
            var invTransMat = new Float32Array(4*4);
            var invRotMat   = new Float32Array(4*4);
            Matrix( rotMat, MatrixType.euler_rotate, rot );
            Matrix_Inverse( invRotMat, rotMat );
            Matrix( transMat, MatrixType.translate, translation );
            Matrix_Inverse( invTransMat, transMat );
            Matrix_Multiply(invTransformationMat, invRotMat, invTransMat);

            //multiply the inverseTransformationMatrix by the perspective matrix to get the mvpMatrix
            Matrix_Multiply( cameraProjectionMatrix, projectionMat, invTransformationMat );
        }
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

        //    //prevent up down rotation past vertical
        //    if (rotation[0] > 90.0)
        //        rotation[0] = 90.0;
        //    if (rotation[0] < -90.0)
        //        rotation[0] = -90.0;

        //calculate the normal of the camera
        var nz =  Math.cos(rot[1]*Math.PI/180.0);
        var nx = -Math.sin(rot[1]*Math.PI/180.0);
        var ny =  Math.sin(rot[0]*Math.PI/180.0);
        //and the orthogonal of that normal
        var oz = -nx;
        var ox =  nz;
        var oy = 0.0;
        //one last step to get the proper normal (rotation.y is being converted to
        //radians before applying cos here)
        var xzNormalLength = Math.cos(rot[0]*Math.PI/180.0);
        if (xzNormalLength != 0)
        {
            nz = nz*xzNormalLength;
            nx = nx*xzNormalLength;
        }

        //now use the camera normal to apply the forward and sideways motion.

        //forwards backwards
        this.setPositionDelta[0] += nx*positionDelta[1];
        this.setPositionDelta[1] += ny*positionDelta[1];
        this.setPositionDelta[2] += nz*positionDelta[1];

        //sideways
        this.setPositionDelta[0] += ox*positionDelta[0];
        this.setPositionDelta[1] += oy*positionDelta[0];
        this.setPositionDelta[2] += oz*positionDelta[0];
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
