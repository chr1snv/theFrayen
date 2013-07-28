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

function Texture(nameIn, sceneNameIn, textureReadyCallback){
    
    this.textureHandle = 0;
    this.texName = nameIn;
    this.sceneName = sceneNameIn;
    this.maxXCoord = 0.0;
    this.maxYCoord = 0.0;
    this.isValid   = false;

    var filename = "scenes/"+this.sceneName+"/textures/"+this.texName+".png";

    //load a texture from a file, and upload it to gl
    
    var loadedImage = new Image();
    var thisP = this;

    loadedImage.onload = function() {
        thisP.textureHandle = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, thisP.textureHandle);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, loadedImage);
        //gl.texSubImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, loadedImage);
        gl.generateMipmap(gl.TEXTURE_2D);
        thisP.isValid = true;

        graphics.AppendTexture( thisP.texName, thisP.sceneName, thisP );
        textureReadyCallback( thisP );
    }
    loadedImage.onerror = function(){
        textureReadyCallback( thisP );
        graphics.GetTexture("default", "default", textureReadyCallback);
    }
    loadedImage.onabort = function(){
        textureReadyCallback( thisP );
    }
    loadedImage.src = filename;


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
