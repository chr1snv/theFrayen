//Texture.js: texture implementation

//get the next power of two size up
function nextPot(size)
{
    var i = 1;
    for(var i=0; i<8; ++i)
    {
        if(size <= (32 << i))
        {
            ret = (32 << i);
            break;
        }
    }
    return ret;
}

function isPowerOfTwo(x) {
    return (x & (x - 1)) == 0;
}

//called to create a new texture,
//the texture ready callback is called to return the result to the caller when loading is complete

function Texture( nameIn, sceneNameIn, textureReadyCallback ){
    
    this.textureHandle = 0;
    this.texName = nameIn;
    this.sceneName = sceneNameIn;
    this.maxXCoord = 0.0;
    this.maxYCoord = 0.0;
    this.isValid   = false;

    this.filename = "scenes/"+this.sceneName+"/textures/"+this.texName;

    //load a texture from a file, and upload it to gl
    
    this.loadedImage = new Image();
    var thisP = this;

    this.loadedImage.onload = function() { //when the image file loads sucessfully this is called
        //upload the texture to webgl
        thisP.textureHandle = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, thisP.textureHandle);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, thisP.loadedImage);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

        thisP.isValid = true;

        //locally cache the successfully loaded texture so when it is asked for from graphics again it can be reloaded
        graphics.AppendTexture( thisP.texName, thisP.sceneName, thisP );
        textureReadyCallback(thisP); //when the image is loaded and uploaded to gl, return
    }
    
    //if the texture doesn't load from the server correctly
    //get the default texture from graphics and store
    this.loadedImage.onerror = function(){
    
        graphics.GetTexture( "default.png", "default", 
            function( defaultTexture ){
                graphics.AppendTexture( thisP.texName, thisP.sceneName, defaultTexture );
                textureReadyCallback( defaultTexture );
            }
        );
        
    }
    this.loadedImage.onabort = function(){
    
        graphics.GetTexture( "default.png", "default", 
            function( defaultTexture ){
                graphics.AppendTexture( thisP.texName, thisP.sceneName, defaultTexture );
                textureReadyCallback( defaultTexture );
            }
        );
    }
    
    
    
    //begin loading the asynchronous loading of the texture image file
    this.loadedImage.src = this.filename; 



    //called when a shader uses the loaded texture, makes it accessable to webgl shader program
    this.Bind = function(textureUnitToBindTo){
        if(this.isValid){
            gl.activeTexture( gl.TEXTURE0+textureUnitToBindTo );
            gl.bindTexture( gl.TEXTURE_2D, this.textureHandle );
        }
    }

    this.GetTextureHandle = function()
    {
        return this.textureHandle;
    }

}
