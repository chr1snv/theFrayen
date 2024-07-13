//Texture.js: texture implementation
//for use or code/art requests please contact chris@itemfactorystudio.com

//called to create a new texture,
//the texture ready callback is called to return the result to the caller when loading is complete

function Texture( nameIn, sceneNameIn, readyCallbackParams, textureReadyCallback ){

    this.textureHandle = 0;
    this.texName = nameIn;
    this.sceneName = sceneNameIn;
    this.maxXCoord = 0.0;
    this.maxYCoord = 0.0;
    this.isValid   = false;

    //thisP.textureHandle = null;

    this.filename = "scenes/"+this.sceneName+"/textures/"+this.texName;

    //load a texture from a file, and store its pixels in shared memory for the
    //section of the oct tree where it is used

    this.loadedImage = new Image();
    this.width = 0;
    this.height = 0;
    this.pixData = null;
    var thisP = this;

    this.GetColorAtUV = function( retVal, uv ){
        const x = Math.round(uv[0] * this.width);
        const y = Math.round(uv[1] * this.height);
        retVal[0] = this.pixData[ (x + y * this.width) * 4 + 0 ] / 255.0;
        retVal[1] = this.pixData[ (x + y * this.width) * 4 + 1 ] / 255.0;
        retVal[2] = this.pixData[ (x + y * this.width) * 4 + 2 ] / 255.0;
        retVal[3] = this.pixData[ (x + y * this.width) * 4 + 3 ] / 255.0;
    }

    this.Bind = function(){
    	if( !this.textureHandle ){
		    this.textureHandle = gl.createTexture(); //gl.deleteTexture(Object texture)
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textureHandle);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.loadedImage);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        }else{
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.textureHandle);
        }
    }

    this.loadedImage.onload = function() { 
        //when the image file loads sucessfully this is called
        //upload the texture to webgl (maybe used when adding gpu compute)
        //thisP.textureHandle = gl.createTexture();
        //gl.activeTexture(gl.TEXTURE0);
        //gl.bindTexture(gl.TEXTURE_2D, thisP.textureHandle);
        //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, thisP.loadedImage);
        //gl.generateMipmap(gl.TEXTURE_2D);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

        thisP.isValid = true;

		var c = document.createElement('canvas');
		c.width = thisP.loadedImage.width;
		c.height = thisP.loadedImage.height;
		var context = c.getContext("2d");
		context.drawImage(thisP.loadedImage, 0, 0);
		
		var imgd = context.getImageData(0, 0, c.width, c.height);
	    thisP.width = c.width;
	    thisP.height = c.height;
        thisP.pixData = imgd.data;

        for (var i = 0, n = thisP.pixData.length; i < n; i += 4) {
            //pix[i  ] = 255 - pix[i  ]; // red
            //pix[i+1] = 255 - pix[i+1]; // green
            //pix[i+2] = 255 - pix[i+2]; // blue
            // i+3 is alpha (the fourth element)
        }


        //console.log( thisP.pixData[0] + ", " + thisP.pixData[1] + ", " + thisP.pixData[2] );

        //register the successfully loaded texture with the global texture list
        //so when it is asked for again the cached data can be fetched
        graphics.AppendTexture( thisP.texName, thisP.sceneName, thisP );
        if(textureReadyCallback)
            textureReadyCallback(readyCallbackParams, thisP); //when the image is loaded, return
    }

    //if the texture doesn't load from the server correctly
    //get the default texture from graphics and store
    this.loadedImage.onerror = function(){
        graphics.GetTexture( "default.png", "default", 
            function( defaultTexture ){
                graphics.AppendTexture( thisP.texName, thisP.sceneName, defaultTexture );
                textureReadyCallback( readyCallbackParams, defaultTexture );
            }
        );
    }
    this.loadedImage.onabort = function(){
        graphics.GetTexture( "default.png", "default", 
            function( defaultTexture ){
                graphics.AppendTexture( thisP.texName, thisP.sceneName, defaultTexture );
                textureReadyCallback( readyCallbackParams, defaultTexture );
            }
        );
    }

    //begin the asynchronous loading of the texture image file
    this.loadedImage.src = this.filename; 

}
