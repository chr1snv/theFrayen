//Camera.js

function Camera(nameIn, sceneNameIn, fovIn, nearClipIn, farClipIn, positionIn, rotationIn) {
var name = nameIn;
var sceneName = sceneNameIn;

var position = positionIn;
var rotation = rotationIn;
var fov = fovIn;

var setPositionDelta = [0,0,0];
var setRotationDelta = [0,0,0];

var nearClip = nearClipIn;
var farClip = farClipIn;
    
var frustum;
    
var ipoAnimation;
var time = 0;

updateFrustum = function() {}
    
this.getRotation = function(rotOut) {}
this.getLocation = function(locOut) {}

//apply the Cameras transformation to the gl Projection Matrix and the modelview matrix
this.applyTransform = function() {}

//update the Cameras position
this.Update = function(timeIn) { time = timeIn; }
this.update = function(positionDelta, rotationDelta) {}
this.SetPosDelta = function(posIn) { Vect3_Copy(setPositionDelta, posIn); }

//return a Frustum representing the volume to be rendered by the Camera
this.GetFrustum = function() {}

//generate a ray from the camera origin passing through the screen coordinates given
this.GenerateWorldCoordRay = function(rayOrig, rayDir, screenCoords) {}

this.GetName = function() {return name;}
}
