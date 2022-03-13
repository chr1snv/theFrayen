//CameraStream.js - provides navigator.getUserMedia access

function CameraStream(){
    navigator.getMedia = ( navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia);
    
    this.video = document.createElement( "video" );
    this.video.setAttribute( "id", "cameraStream" );
    this.video.setAttribute( "width", "640" );
    this.video.setAttribute( "height", "480" );
    this.video.setAttribute( "autoplay", true );
    document.body.appendChild( this.video );
    
    //call getMedia with callback
    navigator.getMedia(
        //constraints
        { video: true },
    
        function(localMediaStream){
           var video = document.querySelector("video");
            video.src = window.URL.createObjectURL(localMediaStream);
            video.onloadedmetadata = function(e){
                //do something with the video here
            };
        },
        //errorCallback
        function(err){
            document.querySelector("#status").innerHTML = err;
        }
                       );
                       
};
