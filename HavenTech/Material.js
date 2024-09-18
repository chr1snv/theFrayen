//Material.js: - to request use permission please contact chris@itemfactorystudio.com

//originally there was one shared gl program and
//had per object settings passed to it.
//Though with different gl programs (e.x. for point and quad drawing)

//and software raytrace rendering
//a material is now a software defined collection of settings / texture(s)

//it is queried through GetColorAtUVCoord for software rendering

//(and may have an option to set settings on glPrograms if gl rasterization is used)

function Material( nameIn, sceneNameIn, args, materialReadyCallback, readyCallbackParams )
{
	let programaticlyCreatedFromTexture = (args != null);

	this.materialReadyCallback = materialReadyCallback;
	this.readyCallbackParams = readyCallbackParams;

	this.uid = NewUID();
	this.materialName = nameIn;
	this.sceneName = sceneNameIn;
	this.glMaterialProgramRefId = graphics.currentProgram;

	this.lumCol = Vect3_New();

	this.subSurfaceExponent = 0;

	this.alpha = 1.0;
	this.normalMix = 0;
	this.specularAmtExponent = Vect_New(2);
	this.specularAmtExponent[0] = 0; this.specularAmtExponent[1] = 1;
	this.emitMix = 0;
	this.diffuseTextureAlpha = false;
	if( programaticlyCreatedFromTexture )
		this.diffuseTextureAlpha = true;
	
	this.numTexturesToLoad = 0;

	this.IsTransparent = function() { return this.alpha < 1.0 || this.diffuseTextureAlpha; }

	this.isShadeless = false;
	if( programaticlyCreatedFromTexture )
		this.isShadeless = true;

	this.isHit = false;
	this.isValid = false;


	if( programaticlyCreatedFromTexture )
		this.emitMix = 1;

	if(this.materialName == "hit"){
		//this is a hit geometry material
		this.isHit = true;
		this.isValid = true;
		this.materialReadyCallback( this, this.readyCallbackParams );
	}else{
		//read in the material settings from a file

		//initialize diffuse color and specular color
		this.diffuseCol =  Vect3_NewAllOnes();
		this.specularCol = Vect3_NewAllOnes();
		
		//calculate the material file filename
		let filename = "scenes/"+this.sceneName+"/materials/"+this.materialName+".hvtMat";

		//open the material file (unless its a programatically created material)
		if( !programaticlyCreatedFromTexture ){
			loadTextFile(filename, MAT_materialTextLoaded, this);
		}else{
			this.numTexturesToLoad += 1;
			GRPH_GetCached(nameIn, this.sceneName, Texture, 1, MAT_textureLoaded, this);
		}
			
	}


}

function MAT_textureLoaded( tex, thisP ){
	thisP.texture = tex;
	thisP.numTexturesToLoad -= 1;
	if( thisP.numTexturesToLoad <= 0 )
		thisP.isValid = true;
}


function MAT_materialTextLoaded(materialFile, thisP){
	if( materialFile === undefined ){
		//if unable to open, try loading the texture of the same name as diffuse
		DPrintf("Unable to open Material file: " + nameIn);
		thisP.isHit = true;
		thisP.isValid = true;
		//only valid if we successfully loaded the texture of the corresponding name
		thisP.materialReadyCallback( thisP, thisP.readyCallbackParams );
	}else{
		//read in the file contents
		if(thisP.materialName == 'skin')
			thisP.subSurfaceExponent = 5;


		let materialFileLines = materialFile.split('\n');
		for( let i = 0; i < materialFileLines.length; ++i ){
			let temp = materialFileLines[i].split(' ');
			temp[0] = temp[0].split('\t')[0];
			if( temp[0] == 'shadeless' )
				thisP.isShadeless = true;
			if(temp[0] == 'difCol'){ //read in diffuse color
				Vect3_parse( thisP.diffuseCol, temp, 1 );
				/*
				thisP.diffuseCol = [ parseFloat( temp[1] ),
									parseFloat( temp[2] ),
									parseFloat( temp[3] ) ];
				*/
				//thisP.diffuseMix =	parseFloat( temp[4] );
				thisP.diffuseMix = 1;
			}
			if( temp[0] == 'specMixHrd' ){ //read in specular color
				thisP.specularAmtExponent[0] =	parseFloat( temp[1] );
				thisP.specularAmtExponent[1] =	parseFloat( temp[2] );
			}
			if(temp[0] == 'alph'){ // read in alpha amount
				thisP.alpha = parseFloat( temp[1] );
			}
			if(temp[0] == 'lumAmt'){
				thisP.lumAmt = parseFloat( temp[1] );
			}
			if(temp[0] == 'lumCol'){ // read in emit color
				thisP.lumCol[0] = parseFloat( temp[1] );
				thisP.lumCol[1] = parseFloat( temp[2] );
				thisP.lumCol[2] = parseFloat( temp[3] );
			}

			if(temp[0] == 'tex'){ //read in texture information

				//keep track of the type of texture this one is
				let isDiffuse = false;
				let isNormal = false;
				let isEmit = false;
				let wrapType = 1; //repeat
				while(++i < materialFileLines.length){
					temp = materialFileLines[i].split(' ');
					temp[0] = temp[0].split('\t')[0];
					if(temp[0] == 'wrapType' ){
						if( temp[1] == 'clamp' )
							wrapType = 0;
					}
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
						thisP.emitAmount = parseFloat( temp[1] );
						isEmit = true;
					}
					if(temp[0] == 'fileName'){ //read in the texture file name
						let textureName = temp[1];
						//ask the graphics instance to load the corresponding texture file
						if(isDiffuse)
							thisP.diffuseTextureName = textureName;
						if(isNormal)
							thisP.normalTextureName  = textureName;
						if(isEmit)
							thisP.emitTextureName    = textureName;


						//preload the texture
						thisP.numTexturesToLoad += 1;
						//function(filename, sceneName, ObjConstructor, ObjConstructorArgs, objReadyCallback, readyCallbackParameters)
						GRPH_GetCached(textureName, thisP.sceneName, Texture, wrapType, MAT_textureLoaded, thisP);
					}
					if(temp[0] == 'e') // sort of unnesscary, as soon as the file
						break;			//name is read reading this texture is done
				}
			}
		}

		//loosely check that some of the values were read in correctly
		if( thisP.diffuseMix == 0 &&
			thisP.specularMix == 0 &&
			thisP.emitMix == 0 )
			 return;

		if(thisP.diffuseMix == -1.0)
			thisP.diffuseMix = 0.0;
		if(thisP.specularMix == -1.0)
			thisP.specularMix = 0.0;
		if(thisP.emitMix == -1.0)
			thisP.emitMix = 0.0;
		//only set the valid flag if everything loaded correctly

		if( this.numTexturesToLoad == 0 )
			thisP.isValid = true;
		//otherwise not valid until texture loads
	}

	thisP.materialReadyCallback( thisP, thisP.readyCallbackParams );
}

/*
function MAT_GetTexCoordBounds(mat){


	let texture = GRPH_GetCached( mat.diffuseTextureName, mat.sceneName, Texture, mat.wrapType, mat.textureLoaded, thisP);
	let texture = graphics.GetTexture( this.diffuseTextureName, this.sceneName );
	if( texture == NULL )
		return texture;
	
	return [
		0.0,
		texture.GetWidth(),
		0.0,
		texture.GetHeight()
	];


}
*/

function MAT_GetColorAtUVCoord( mat, color, uv ){

	if( mat.texture )
		mat.texture.GetColorAtUV( color, uv );
	else{
		color[0] = this.diffuseCol[0];
		color[1] = this.diffuseCol[1];
		color[2] = this.diffuseCol[2];
		color[3] = this.diffuseMix;
	}

}
