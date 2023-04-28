//Shader.js: implementation of Shader class
//for use or code/art requests please contact chris@itemfactorystudio.com

function Shader(nameIn, sceneNameIn, readyCallbackParams, shaderReadyCallback)
{
	this.shaderName = nameIn;
	this.sceneName = sceneNameIn;
	this.glShaderProgramRefId = graphics.currentProgram;

	this.emitAmount = 0.0;

	this.diffuseMix = -1.0;
	this.alpha = 1.0;
	this.normalMix = -1.0;
	this.specularMix = -1.0;
	this.emitMix = -1.0;
	this.diffuseTextureAlpha = false;

	this.IsTransparent = function() { return this.alpha < 1.0 || this.diffuseTextureAlpha; }

	this.specularHardness = 10.0;

	this.isShadeless = false;

	this.isHit = false;
	this.isValid = false;

	this.textureLoaded = function( thisP, tex ){
		thisP.texture = tex;
	}

	this.shaderTextLoaded = function(shaderFile, thisP){
		if( shaderFile === undefined ){
			//if unable to open, try loading the texture of the same name as diffuse
			DPrintf("Unable to open Shader file: " + nameIn);
			thisP.isHit = true;
			thisP.isValid = true;
			//only valid if we successfully loaded the texture of the corresponding name
			shaderReadyCallback( thisP, readyCallbackParams );
		}else{
			//read in the file contents
			var shaderFileLines = shaderFile.split('\n');
			for( var i = 0; i < shaderFileLines.length; ++i ){
				var temp = shaderFileLines[i].split(' ');
				if(temp[0] == 'd'){ //read in diffuse color
					thisP.diffuseCol = [ parseFloat( temp[1] ),
										parseFloat( temp[2] ),
										parseFloat( temp[3] ) ];
					thisP.diffuseMix =	parseFloat( temp[4] );
				}
				if(temp[0] == 's' && temp[1] != 'h'){ //read in specular color
					thisP.specularCol		= [ temp[1], temp[2], temp[3] ];
					thisP.specularMix		=	parseFloat( temp[4] );
					thisP.specularHardness =	parseFloat( temp[5] );
				}
				if(temp[0] == 's' && temp[1] == 'h'){ //read in specular color
					thisP.isShadeless = temp[3] == 'true' ? true : false;
				}
				if(temp[0] == 'a'){ // read in alpha amount
					thisP.alpha = parseFloat( temp[1] );
				}
				if(temp[0] == 'l'){ // read in emit amount
					thisP.emitAmount = parseFloat( temp[1] );
				}

				if(temp[0] == 't'){ //read in texture information

					//keep track of the type of texture this one is
					var isDiffuse = false;
					var isNormal = false;
					var isEmit = false;
					while(++i < shaderFileLines.length){
						temp = shaderFileLines[i].split(' ');
						if(temp[0] == 'd' && temp[1] == 'a')
							thisP.diffuseTextureAlpha = true;
						else if(temp[0] == 'd'){ // the texture is diffuse type
							thisP.diffuseMix = parseFloat( temp[1] );
							isDiffuse = true;
						}
						if(temp[0] == 'n'){ // the texture is normal type
							thisP.normalMix = parseFloat( temp[1] );
							isNormal = true;
						}
						if(temp[0] == 'l'){ // the texture is emit type
							thisP.emitMix = parseFloat( temp[1] );
							isEmit = true;
						}
						if(temp[0] == 'f'){ //read in the texture file name
							var textureName = temp[1];
							//ask the graphics instance to load the corresponding texture file
							//graphics.GetTexture(textureName, this.sceneName);
							if(isDiffuse)
								thisP.diffuseTextureName = textureName;
							if(isNormal)
								thisP.normalTextureName  = textureName;
							if(isEmit)
								thisP.emitTextureName    = textureName;
								
							//preload the texture
							graphics.GetTexture(textureName, thisP.sceneName, thisP, thisP.textureLoaded);
						}
						if(temp[0] == 'e') // sort of unnesscary, as soon as the file
							break;			//name is read reading this texture is done
					}
				}
			}

			//loosely check that some of the values were read in correctly
			if( thisP.diffuseMix == -1.0 &&
				thisP.specularMix == -1.0 &&
				thisP.emitMix == -1.0 )
				 return;

			if(thisP.diffuseMix == -1.0)
				thisP.diffuseMix = 0.0;
			if(thisP.specularMix == -1.0)
				thisP.specularMix = 0.0;
			if(thisP.emitMix == -1.0)
				thisP.emitMix = 0.0;
			//only set the valid flag if everything loaded correctly

			thisP.isValid = true;
		}

		shaderReadyCallback( thisP, readyCallbackParams );
	}

	if(this.shaderName == "hit"){
		//this is a hit geometry shader
		this.isHit = true;
		this.isValid = true;
		shaderReadyCallback( this, readyCallbackParams );
	}else{
		//read in the shader settings from a file

		//initialize diffuse color and specular color
		this.diffuseCol =  [ 1.0, 1.0, 1.0 ];
		this.specularCol = [ 1.0, 1.0, 1.0 ];
		
		//calculate the shader file filename
		var filename = "scenes/"+this.sceneName+"/shaders/"+this.shaderName+".hvtShd";

		//open the shader file
		loadTextFile(filename, this.shaderTextLoaded, this);
	}
		

	this.GetTexCoordBounds = function( ){
		var texture = graphics.GetTexture( this.diffuseTextureName, this.sceneName );
		if( texture == NULL )
			return texture;
		
		return [
			0.0,
			texture.GetWidth(),
			0.0,
			texture.GetHeight()
		];
	}

	this.GetColorAtUVCoord = function( color, uv ){
		if( this.texture )
			this.texture.GetColorAtUV( color, uv );
		else{
			color[0] = this.diffuseCol[0];
			color[1] = this.diffuseCol[1];
			color[2] = this.diffuseCol[2];
			color[3] = this.diffuseCol[3];
		}
	}


}
