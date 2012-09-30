//Camera.js

function glOrtho(left, right, bottom, top, nearVal, farVal)
{
    var tx = -(right+left)/(right-left);
    var ty = -(top+bottom)/(top-bottom);
    var tz = -(farVal+nearVal)/(farVal-nearVal);
    var xs = 2/(right-left);
    var ys = 2/(top-bottom);
    var zs = -2/(farVal-nearVal);
    return [ xs,  0,  0, tx,
              0, ys,  0, ty,
              0,  0, zs, tz,
              0,  0,  0,  1 ];
}
function gluPerspective(fovy, aspect, zNear, zFar)
{
    var f = 1/Math.tan(fovy/2);
    var xs = f/aspect;
    var ys = f;
    var zs = (zFar+zNear)/(zNear-zFar);
    var tz = (2*zFar*zNear)/(zNear-zFar);
    return [ xs,  0,  0,  0,
              0, ys,  0,  0,
              0,  0, zs, tz,
              0,  0, -1,  0 ];
}

function Camera(nameIn, sceneNameIn, fovIn, nearClipIn, farClipIn, positionIn, rotationIn)
{
    this.cameraName = nameIn;
    this.sceneName = sceneNameIn;

    this.position = positionIn;
    this.rotation = rotationIn;
    this.fov = fovIn;

    this.setPositionDelta = [0,0,0];
    this.setRotationDelta = [0,0,0];

    this.nearClip = nearClipIn;
    this.farClip = farClipIn;
        
    this.frustum;
        
    this.ipoAnimation = 0;
    this.time = 0;

    this.updateFrustum = function() {}
        
    this.getRotation = function(rotOut)
    {
        if(!this.ipoAnimation.GetRotation(rotOut, time))
            Vect3_Copy(rotOut, rotation);
        //urotate the camera by 90 degrees (blender camera starts off looking straight down)
        rotOut[0] -= 90.0*(M_PI/180.0);
        Vect3_Add(rotOut, setRotationDelta);
    }
    this.getLocation = function(locOut)
    {
        if(!this.ipoAnimation.GetLocation(locOut, time))
            Vect3_Copy(locOut, position);
        Vect3_Add(locOut, setPositionDelta);
    }

    //apply the Cameras transformation
    this.applyTransform = function()
    {
        alert('applying camera transform');
        if(this.fov == 0.0)
        {
            var m = glOrtho(-graphics.GetScreenAspect(), graphics.GetScreenAspect(),
                            -graphics.GetScreenHeight(), graphics.GetScreenHeight(),
                            -1, 1);
            gl.uniformMatrix4fv(gl.getUniformLocation(graphics.currentProgram, 'projectionMatrix'), true, m);
            Matrix_SetIdentity(m);
            gl.uniformMatrix4fv(gl.getUniformLocation(graphics.currentProgram, 'modelViewMatrix'), true, m);
        }
        else
        {
            var m = gluPerspective(this.fov,                   //field of view
                                   graphics.GetScreenAspect(), //aspect ratio
                                   this.nearClip,              //near clip plane distance
                                   this.farClip                //far clip plane distance
                                   );
            gl.uniformMatrix4fv(gl.getUniformLocation(graphics.currentProgram, 'projectionMatrix'), true, m);

            //get the camera rotation and translation from the ipo
            var translation = new Array(3);
            var rot = new Array(3);
            this.getRotation(rot);
            this.getLocation(translation);

            //calculate the inverse position transformation matrix for the camera
            //(the transformation matrix for the camera would be the matrix required
            //to transform the camera to its position in the world, but we want the
            //model view matrix to be the inverse of that, the matrix required to
            //bring the world into the view of the camera)
            var invTransformationMat = new Array(4*4);

            var rotMat = new Array(4*4);
            var transMat = new Array(4*4); //translation matrix
            var invTransMat = new Array(4*4);
            var invRotMat = new Array(4*4);
            Matrix( rotMat, MatrixType.euler_rotate, rot );
            Matrix_Inverse( invRotMat, rotMat );
            Matrix( transMat, MatrixType.translate, translation );
            Matrix_Inverse( invTransMat, transMat );
            Matrix_Multiply(invTransformationMat, invRotMat, invTransMat);

            gl.uniformMatrix4fv(gl.getUniformLocation(graphics.currentProgram, 'modelViewMatrix'), true, invTransformationMat);
        }
        alert('successfully uploaded camera matricies');
        CheckGLError("Camera::applyTransform end");
    }

    //update the Cameras position
    this.Update = function(timeIn) { time = timeIn; }
    this.update = function(positionDelta, rotationDelta) {}
    this.SetPosDelta = function(posIn) { Vect3_Copy(setPositionDelta, posIn); }

    //return a Frustum representing the volume to be rendered by the Camera
    this.GetFrustum = function() {}

    //generate a ray from the camera origin passing through the screen coordinates given
    this.GenerateWorldCoordRay = function(rayOrig, rayDir, screenCoords) {}

}
