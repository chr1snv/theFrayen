//Material.js: - to request use permission please contact chris@itemfactorystudio.com

//originally there was one shared gl program and
//had per object settings passed to it.
//Though with different gl programs (e.x. for point and quad drawing)

//and software raytrace rendering
//a material is now a software defined collection of settings / texture(s)

//it is queried through GetColorAtUVCoord for software rendering

//(and may have an option to set settings on glPrograms if gl rasterization is used)

function Material(nameIn, sceneNameIn, readyCallbackParams, materialReadyCallback)
{
	this.materialName = nameIn;
	this.sceneName = sceneNameIn;
	this.glMaterialProgramRefId = graphics.currentProgram;

	this.emitAmount = 0.0;

	this.diffuseMix = -1.0;
	this.alpha = 1.0;
	this.normalMix = -1.0;
	this.specularMix = -1.0;
	this.specRoughness = 1;
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

	this.materialTextLoaded = function(materialFile, thisP){
		if( materialFile === undefined ){
			//if unable to open, try loading the texture of the same name as diffuse
			DPrintf("Unable to open Material file: " + nameIn);
			thisP.isHit = true;
			thisP.isValid = true;
			//only valid if we successfully loaded the texture of the corresponding name
			materialReadyCallback( thisP, readyCallbackParams );
		}else{
			//read in the file contents
			let materialFileLines = materialFile.split('\n');
			for( let i = 0; i < materialFileLines.length; ++i ){
				let temp = materialFileLines[i].split(' ');
				temp[0] = temp[0].split('\t')[0];
				if(temp[0] == 'difCol'){ //read in diffuse color
					Vect3_parse( thisP.diffuseCol, temp, 1 );
					/*
					thisP.diffuseCol = [ parseFloat( temp[1] ),
										parseFloat( temp[2] ),
										parseFloat( temp[3] ) ];
					*/
					//thisP.diffuseMix =	parseFloat( temp[4] );
				}
				if( temp[0] == 'specMixHrd' ){ //read in specular color
					thisP.specularMix		=	parseFloat( temp[1] );
					thisP.specRoughness		=	parseFloat( temp[2] );
				}
				if(temp[0] == 'alph'){ // read in alpha amount
					thisP.alpha = parseFloat( temp[1] );
				}
				if(temp[0] == 'lumCol'){ // read in emit amount
					thisP.emitAmount = parseFloat( temp[1] );
				}

				if(temp[0] == 'tex'){ //read in texture information

					//keep track of the type of texture this one is
					var isDiffuse = false;
					var isNormal = false;
					var isEmit = false;
					while(++i < materialFileLines.length){
						temp = materialFileLines[i].split(' ');
						if(temp[0] == 'difTexAisAlpha')
							thisP.diffuseTextureAlpha = true;
						else if(temp[0] == 'difTex'){ // the texture is diffuse type
							thisP.diffuseMix = parseFloat( temp[1] );
							isDiffuse = true;
						}
						if(temp[0] == 'normTex'){ // the texture is normal type
							thisP.normalMix = parseFloat( temp[1] );
							isNormal = true;
						}
						if(temp[0] == 'lumTex'){ // the texture is emit type
							thisP.emitMix = parseFloat( temp[1] );
							isEmit = true;
						}
						if(temp[0] == 'fileName'){ //read in the texture file name
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

		materialReadyCallback( thisP, readyCallbackParams );
	}

	if(this.materialName == "hit"){
		//this is a hit geometry material
		this.isHit = true;
		this.isValid = true;
		materialReadyCallback( this, readyCallbackParams );
	}else{
		//read in the material settings from a file

		//initialize diffuse color and specular color
		this.diffuseCol =  [ 1.0, 1.0, 1.0 ];
		this.specularCol = [ 1.0, 1.0, 1.0 ];
		
		//calculate the material file filename
		var filename = "scenes/"+this.sceneName+"/materials/"+this.materialName+".hvtMat";

		//open the material file
		loadTextFile(filename, this.materialTextLoaded, this);
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
			color[3] = this.diffuseMix;
		}
	}


}
