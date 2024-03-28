
function TriGraphics(loadCompleteCallback){

	this.currentTexId     = -1;
	this.currentColor     = [0.0, 0.0, 0.0, 0.0];
	this.ambAndDiffuse    = [0.0, 0.0, 0.0, 0.0];
	this.emission         = [0.0, 0.0, 0.0, 0.0];
	this.specular         = [0.0, 0.0, 0.0, 0.0];
	this.shinyness        = 0;
	
	this.mvpMatrixUnif = null;
	
	this.Setup = function(){
		
		let progId = this.triProgram.glProgId;
		
		gl.useProgram(progId);
		CheckGLError( "after enable tri glProgram " );
		
		//set the rendering state varaibles (init them to 0 then set to 1 to ensure we are tracking the gl state)
		var temp = [1.0,1.0,1.0,1.0];
		this.setColor(temp);
		this.setAmbientAndDiffuse(temp);
		this.setEmission(temp);
		this.setSpecular(temp);
		this.setShinyness(1.0);
		CheckGLError( "glProgram::before lighting enabled " );

		//lighting setup
		this.enableLighting(true);
		
		
		this.mvpMatrixUnif = gl.getUniformLocation( this.triProgram.glProgId, 'mvpMatrix');
		CheckGLError( "glProgram::end frag shader loaded " );
	}
	
	this.enableLighting = function(progId, val){
		if(this.lightingEnb != val){
			this.lightingEnb = val;
			gl.uniform1f(gl.getUniformLocation(this.triProgram.glProgId, 'lightingEnb'), this.lightingEnb);}
	}

	this.setColor = function(col){
		if( !Vect3_Cmp(this.currentColor, col) ){
			Vect3_Copy(this.currentColor, col);
			gl.uniform4fv(gl.getUniformLocation(this.triProgram.glProgId, 'color'), this.currentColor);}
	}
	this.setAmbientAndDiffuse = function(col){
		if(!Vect3_Cmp(this.ambAndDiffuse, col)){
			Vect3_Copy(this.ambAndDiffuse, col);
			gl.uniform4fv(gl.getUniformLocation(this.triProgram.glProgId, 'ambient'), this.ambAndDiffuse);}
	}
	this.setEmission = function(col){
		if(!Vect3_Cmp(this.emission, col)){
			Vect3_Copy(this.emission, col);
			gl.uniform4fv(gl.getUniformLocation(this.triProgram.glProgId, 'emission'), this.emission);}
	}
	this.setSpecular = function(col){
		if(!Vect3_Cmp(this.specular, col)){
			Vect3_Copy(this.specular, col);
			gl.uniform4fv(gl.getUniformLocation(this.triProgram.glProgId, 'specular'), this.specular);}
	}
	this.setShinyness = function(expV){
		if(this.shinyness != expV){
			this.shinyness = expV;
			gl.uniform1f(gl.getUniformLocation(this.triProgram.glProgId, 'shinyness'), this.shinyness);}
	}

	this.ClearLights = function(){
		for(var i=0; i<this.maxLights; ++i)
			gl.uniform4f(gl.getUniformLocation(this.triProgram.glProgId, 'lightColor['+i+']'), 0,0,0,0);
		this.numLightsBounded = 0;
	}
	this.BindLight = function(light){
		if(this.numLightsBounded >= this.maxLights){
			//DPrintf("Graphics: error Max number of lights already bound.\n");
			return;
		}
		this.enableLighting(true);
		light.BindToGL(this.numLightsBounded);
		++this.numLightsBounded;
	}
	
	this.texQuadTex = null;
	function texQuadTexReady(thisP, tex){
		thisP.texQuadTex = tex;
	}
	
	// Draw a textured screenspace rectangle
	this.drawScreenSpaceTexturedQuad = function (textureName, sceneName, center, widthHeight, minUv, maxUv ){
	
		if( !this.texQuadTex ){ //wait until the texture is loaded to draw it
			graphics.GetTexture(textureName, sceneName, this, texQuadTexReady);
			return;
		}
		
		this.texQuadTex.Bind();
		
		this.triProgram.setFloatUniform( 'texturingEnabled', 1 );
	
		//set the screenspace orthographic matrix
		glOrtho(-graphics.GetScreenAspect(), graphics.GetScreenAspect(),
				-graphics.screenHeight, graphics.screenHeight,
				-1, 1);
		gl.uniformMatrix4fv(this.mvpMatrixUnif, true, gOM, 0, 4*4 );
		
		
		//generate the 4 corners from the centerpoint and width/height
		let mm = [(center[0] - widthHeight[0]/2), (center[1] - widthHeight[1]/2)]; //left bottom
		let MM = [(center[0] + widthHeight[0]/2), (center[1] + widthHeight[1]/2)]; //right top 
		let mM = [ mm[0], MM[1] ]; //left top
		let Mm = [ MM[0], mm[1] ]; //right bottom
		
		//the two triangles 
		let vertices = [ mm[0], mm[1], 0.0,   //left bottom
						 mM[0], mM[1], 0.0,   //left top
						 MM[0], MM[1], 0.0,   //right top
						 MM[0], MM[1], 0.0,   //right top
						 Mm[0], Mm[1], 0.0,   //right bottom
						 mm[0], mm[1], 0.0 ]; //left bottom
		let verts = new Float32Array(vertices);
		
		let uvs = new Float32Array(6*2);
		uvs[0*2+0] = minUv[0]; uvs[0*2+1] = minUv[1]; //left  bottom
		uvs[1*2+0] = minUv[0]; uvs[1*2+1] = maxUv[1]; //left  top
		uvs[2*2+0] = maxUv[0]; uvs[2*2+1] = maxUv[1]; //right top
		uvs[3*2+0] = maxUv[0]; uvs[3*2+1] = maxUv[1]; //right top
		uvs[4*2+0] = maxUv[0]; uvs[4*2+1] = minUv[1]; //right bottom
		uvs[5*2+0] = minUv[0]; uvs[5*2+1] = minUv[1]; //left  bottom
		
		
		let progId = this.triProgram.glProgId;
		
		this.setColor([1,0,1]);

		attributeSetFloats( progId, "position",  3, verts );
		CheckGLError("draw square, after position attributeSetFloats");
		attributeSetFloats( progId, "norm",    3, verts );
		CheckGLError("draw square, after normal attributeSetFloats");
		attributeSetFloats( progId, "texCoord",  2, uvs );
		CheckGLError("draw square, after texCoord attributeSetFloats");
		gl.drawArrays(gl.TRIANGLES, 0, 6);
		CheckGLError("draw square, after drawArrays");
		gl.flush();
	}
	
	this.triProgram = new GlProgram('frayen', null, loadCompleteCallback);
	
}
