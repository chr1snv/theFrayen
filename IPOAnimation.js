//IPOAnimation.js

function IPOAnimation(nameIn, sceneNameIn){
    var ipoName = nameIn;
    var sceneName = sceneNameIn;

    // animation data
    var curves = [];

    var duration;

    var isValid;

    this.GetLocation = function(ret, time){
    }
    this.GetRotation = function(rot, time){
    }
    this.GetScale = function(scale, time){
    }

    this.GetMatrix = function(outMat, time){
    }

    this.GetDuration = function(){ return duration; }

    this.IsValid = function(){ return isValid; }

    //constructor functionality
    alert('opening: ' + 'scenes/' + sceneName + '/IPOs/' + ipoName + '.hvtIPO' );
    var txtFile = loadTextFileSynchronous( 'scenes/' + sceneName + '/IPOs/' + ipoName + '.hvtIPO' );
};
