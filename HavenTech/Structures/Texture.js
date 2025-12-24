//# sourceURL=Structures/Texture.js : texture implementation
//for use or code/art requests please contact chris@itemfactorystudio.com

//called to create a new texture,
//the texture ready callback is called to return the result to the caller when loading is complete

//+x, -x, +y, -y, +z -z
let CubeTexIdxToName = [ '_rt', '_lf', '_up', '_dn', '_ft', '_bk', ];

function Texture( nameIn, sceneNameIn, wrapOrTexType, textureReadyCallback, readyCallbackParams ){

	this.textureReadyCallback = textureReadyCallback;
	this.readyCallbackParams = readyCallbackParams;

	this.textureHandle = null;
	this.texName = nameIn;
	this.sceneName = sceneNameIn;
	this.width = 0;
	this.height = 0;
	this.wrapOrTexType = wrapOrTexType;
	this.isValid   = false;

	this.filename = this.sceneName+"/textures/"+this.texName;


	if( wrapOrTexType == 3 ){ //framebuffer
		this.width = 1024;//closestLargerPowerOfTwo( graphics.screenWidth );
		this.height = 1024;//closestLargerPowerOfTwo( graphics.screenHeight );
	
		gl.activeTexture(gl.TEXTURE7); //avoid bindTexture call while on a texture unit that will cause a same texture same pass read write error


		//create depth output texture
		const ext = gl.getExtension('EXT_color_buffer_float');
		if (!ext) {
			console.error("Rendering to floating point textures is not supported on this platform!");
			// Fallback to the original RGBA8 solution with precision hints, or a workaround
		}
		this.textureHandle = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.textureHandle );
		gl.texImage2D(target=gl.TEXTURE_2D, level=0, internalFormat=gl.RGBA, 
					  width= this.width, height= this.height , 
					  border=0, format=gl.RGBA, type=gl.UNSIGNED_BYTE, data=null); //RGBA //UNSIGNED_BYTE
  		//gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);//LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);



		// Create a depth texture
		this.depthTextureHandle = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.depthTextureHandle ); //depthTextureHandle );
		gl.texImage2D(gl.TEXTURE_2D, level=0, internalFormat=gl.DEPTH_COMPONENT16,//32F,//32F,//16,//32F,//16,//16 
						width=this.width, height= this.height, border=0, format=gl.DEPTH_COMPONENT, type=gl.UNSIGNED_SHORT, data=null); //FLOAT

		//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
		//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);				

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);//LINEAR);//_MIPMAP_NEAREST);//NEAREST); //no mimap needed for depth buffer
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);//LINEAR);//_MIPMAP_NEAREST);//NEAREST);
		//gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


		this.framebuffer = gl.createFramebuffer();
		gl.bindFramebuffer( gl.FRAMEBUFFER, this.framebuffer );

		gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTextureHandle, level=0); //depthTextureHandle
		gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textureHandle, level=0 );

		//gl.drawBuffers([gl.NONE]); 
		//gl.readBuffer(gl.NONE);


		if( gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
			console.error("Framebuffer is not complete");
			
			
		gl.bindTexture(gl.TEXTURE_2D, null);


		this.isValid = true;
	}
	else if( wrapOrTexType == 2 ){ //cube texture
		this.numCubeTexsLoaded = 0;
		this.numCubeTexsLoadedToGL = 0;
		this.loadedImages = new Array(6);
		for( var i = 0; i < 6; ++i )
			StartNewTexLoad(this, i, true);
	}
	else{ //repeat or clamp 2d texture
		StartNewTexLoad(this);
	}

	//load a texture from a file, and store its pixels in shared memory for the
	//section of the oct tree where it is used

/*
	this.width = 0;
	this.height = 0;
	this.pixData = null;

	this.GetColorAtUV = function( retVal, uv ){
		const x = Math.round(uv[0] * this.width);
		const y = Math.round(uv[1] * this.height);
		retVal[0] = this.pixData[ (x + y * this.width) * 4 + 0 ] / 255.0;
		retVal[1] = this.pixData[ (x + y * this.width) * 4 + 1 ] / 255.0;
		retVal[2] = this.pixData[ (x + y * this.width) * 4 + 2 ] / 255.0;
		retVal[3] = this.pixData[ (x + y * this.width) * 4 + 3 ] / 255.0;
	}
*/


}
function GenCubeTexFilename(texP, idx){
	return texP.filename + CubeTexIdxToName[idx] + '.jpg';
}
function initTextLoadImage(texP, loadFileName){
	let lImg = new Image();
	lImg.onload = TEX_ImgLoaded;

	//if the texture doesn't load from the server correctly
	//get the default texture from graphics and store
	lImg.onerror = TEX_LoadDefault;
	lImg.onabort = TEX_LoadDefault;

	//begin the asynchronous loading of the texture image file
	lImg.hvnTex = texP;
	
	//console.log("attempt to load texture " + loadFileName);

	getFileFromSceneZip(texP.sceneName, loadFileName, "blob", TEX_ImgFetched, [loadFileName, texP, lImg]);
	
	return lImg;
}

function TEX_ImgFetched(texBlob, params){
	//console.log("textureBlob loaded " + params[1].filename);
	let typeStrParts = params[0].split('.');
	let type = typeStrParts[typeStrParts.length-1];
	if(type == 'jpg')
		type = 'jpeg';
	let imgUrl = URL.createObjectURL( texBlob, { type: 'image/'+type } );
	params[2].src = imgUrl;

}
function StartNewTexLoad(texP, cubeTexIdx=0, cubeTex=false){

	if( cubeTex ){
		texP.loadedImages[cubeTexIdx] = initTextLoadImage( texP, GenCubeTexFilename(texP, cubeTexIdx) );
	}else{
		texP.loadedImage = initTextLoadImage( texP, texP.filename );
	}
}

function TEX_ImgLoaded(evnt){
	let texP = evnt.srcElement.hvnTex;

	//when the image file loads sucessfully this is called
	//upload the texture to webgl (maybe used when adding gpu compute)
	//texP.textureHandle = gl.createTexture();
	//gl.activeTexture(gl.TEXTURE0);
	//gl.bindTexture(gl.TEXTURE_2D, texP.textureHandle);
	//gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texP.loadedImage);
	//gl.generateMipmap(gl.TEXTURE_2D);
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

/*
	let c = document.createElement('canvas');
	c.width = texP.loadedImage.width;
	c.height = texP.loadedImage.height;
	let context = c.getContext("2d");
	context.drawImage(texP.loadedImage, 0, 0);
	
	let imgd = context.getImageData(0, 0, c.width, c.height);
	texP.width = c.width;
	texP.height = c.height;
	texP.pixData = imgd.data;
*/

	/*
	//for get color at uv for raycast rendering
	for (let i = 0, n = texP.pixData.length; i < n; i += 4) {
		//pix[i  ] = 255 - pix[i  ]; // red
		//pix[i+1] = 255 - pix[i+1]; // green
		//pix[i+2] = 255 - pix[i+2]; // blue
		// i+3 is alpha (the fourth element)
	}
	*/

	if( texP.wrapOrTexType == 2 ){ //cube texture
		texP.numCubeTexsLoaded += 1;
		if( texP.numCubeTexsLoaded  < texP.loadedImages.length ){
			return;
		}else{
			texP.isValid = true;
		}
	}else{
		texP.isValid = true;
	}


	//console.log( texP.pixData[0] + ", " + texP.pixData[1] + ", " + texP.pixData[2] );

	//register the successfully loaded texture with the global texture list
	//so when it is asked for again the cached data can be fetched
	if(texP.textureReadyCallback)
		texP.textureReadyCallback(texP, texP.readyCallbackParams); //when the image is loaded, return

}

function TEX_LoadDefault(evnt){
	let texP = evnt.srcElement.hvnTex;
	//filename, sceneName, ObjConstructor, ObjConstructorArgs, objReadyCallback, readyCallbackParameters)
	GRPH_GetCached( "default.png", "default", Texture, 1, texP.textureLoaded, texP);
}

function TEX_Bind(texP, glTexNum=gl.TEXTURE0){
	if( !texP.textureHandle ){
		texP.textureHandle = gl.createTexture(); //gl.deleteTexture(Object texture)
		gl.activeTexture(glTexNum);
		gl.bindTexture(gl.TEXTURE_2D, texP.textureHandle);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texP.loadedImage);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		let wrapOrTexType = gl.REPEAT;
		if( texP.wrapOrTexType == 0 )
			wrapOrTexType = gl.CLAMP_TO_EDGE;
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapOrTexType ); // GL_REPEAT
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapOrTexType );
	}else{
		gl.activeTexture(glTexNum);
		gl.bindTexture(gl.TEXTURE_2D, texP.textureHandle);
	}
}


function TEX_BindCube(texP, glTexNum=gl.TEXTURE0){
	if( !texP.textureHandle ){
		texP.textureHandle = gl.createTexture(); //gl.deleteTexture(Object texture)
		gl.activeTexture(glTexNum);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, texP.textureHandle);
		const placeholderColor = new Uint8Array([0, 0, 255, 255]); 
		for(let i = 0; i < 6; ++i){
			if( i < texP.numCubeTexsLoaded && i >= texP.numCubeTexsLoadedToGL ){ //actual image
				gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, texP.loadedImages[i]);
				texP.numCubeTexsLoadedToGL += 1;
			}else{ // placeholder
				gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, placeholderColor );
			}
			
		}
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		//clamp to edge may be preferred for cubemaps
		let wrapOrTexType = gl.CLAMP_TO_EDGE;
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, wrapOrTexType ); // GL_REPEAT
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, wrapOrTexType );
		gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, wrapOrTexType );
		gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
	}else{
		gl.activeTexture(glTexNum);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, texP.textureHandle);
	}
}

function TEX_BindFramebuffer(texP){
	gl.bindFramebuffer( gl.FRAMEBUFFER, texP.framebuffer );

	gl.viewport(0, 0, texP.width, texP.height );

	//gl.disable(gl.CULL_FACE);
	
	//gl.clearDepth(0.0);
	//gl.depthMask(true);
	//gl.disable(gl.DEPTH_TEST);
	//gl.enable(gl.DEPTH_TEST);
	//gl.depthFunc(gl.LESS);

	//gl.clearColor(1.0,0,0,0.5);
	
	
	//gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		

	//clear the render buffer and reset rendering state
	//graphics.ClearColor();
	//graphics.Clear();
	graphics.ClearDepth();
	//gl.colorMask(true, true, true, true);
	//graphics.Flush();
	//graphics.ClearLights();
	//gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	//gl.flush();
}
