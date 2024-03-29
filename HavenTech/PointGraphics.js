

function PointGraphics(loadCompleteCallback){

	this.pointSize = 10;
	this.pointFalloff = 0.5;

	//https://www.tutorialspoint.com/webgl/webgl_drawing_points.htm
	this.pointBuffer      = null;
	this.colorBuffer      = null;
	this.pointPosAttr     = null;
	this.pointColorAttr   = null;
	this.projMatAttr      = null;
	this.pointSizeAttr    = null;
	this.pointFalloffAttr = null;
	this.Setup = function(){
	
		let glProgId = this.pointProgram.glProgId;
	
		gl.useProgram(glProgId);
	
		if( this.pointBuffer == null )
			this.pointBuffer = gl.createBuffer();
		if( this.colorBuffer == null )
			this.colorBuffer = gl.createBuffer();
		
		if( !this.projMatAttr )
			this.projMatAttr      = gl.getUniformLocation( glProgId, "projection"   );
	
		if( !this.pointPosAttr )
			this.pointPosAttr     = gl.getAttribLocation(  glProgId, "position"     );
		if( !this.pointColorAttr )
			this.pointColorAttr   = gl.getAttribLocation(  glProgId, "ptCol"        );
	
		if( !this.pointSizeAttr )
			this.pointSizeAttr    = gl.getUniformLocation(  glProgId, "pointSize"    );
		if( !this.pointFalloffAttr )
			this.pointFalloffAttr = gl.getUniformLocation(  glProgId, "pointFalloff" );
		
		//set point size and falloff
		gl.uniform1f(this.pointSizeAttr, this.pointSize );
		gl.uniform1f(this.pointFalloffAttr, this.pointFalloff );
	}

	this.drawPixels = function( float32VecPositions, float32VecColors, numPoints, projMat ){
		//gl.bufferData( buffer type, 

		gl.uniformMatrix4fv(this.projMatAttr, true, projMat, 0, 4*4 );
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuffer);
		gl.bufferData( gl.ARRAY_BUFFER, float32VecPositions, gl.STATIC_DRAW );

		gl.enableVertexAttribArray( this.pointPosAttr );
		//void gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
		gl.vertexAttribPointer(this.pointPosAttr, 3, gl.FLOAT, false, 0, 0);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
		gl.bufferData( gl.ARRAY_BUFFER, float32VecColors, gl.STATIC_DRAW );
		
		gl.enableVertexAttribArray( this.pointColorAttr );
		//void gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
		gl.vertexAttribPointer(this.pointColorAttr, 4, gl.FLOAT, false, 0, 0);
		
		gl.drawArrays( gl.POINTS, 0, numPoints );
		//gl.flush();
	}
	
	//really should buffer pixels before drawing them to reduce gl calls
	//also should use some sort of point radius falloff or generate a mesh
	//with interpolation between point values to create a continuous image
	//maybe sort points by x and y values, then put them into an indexable array
	//(i think there is a max size for uniform variables, so might have to be
	//a texture)
	//https://stackoverflow.com/questions/44856413/why-does-webgl-put-limit-on-uniform-size
	//"WebGL on my browser only supports 1024 * 4 bytes uniform."
	//a screenspace shader can get the closest points to an xy coordinate to
	//and look up their significance to determine their weight/contribution
	//to a pixel value
	this.drawPixel = function( x, y ){
		// Fills the buffer with a single point?
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array([
		  x+0.5,     y+0.5]), gl.STATIC_DRAW );
		//void gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
		gl.vertexAttribPointer(pointPosAttr, 2, gl.FLOAT, false, 0, 0);
		// Draw one point.
		gl.drawArrays( gl.POINTS, 0, 1 );

		/*
		// https://stackoverflow.com/questions/35444202/draw-a-single-pixel-in-webgl-using-gl-points
		//if you want to draw 3 points at (0,0) (1,1), (2,2) 
		//then you need to do gl.bufferData(gl.ARRAY_BUFFER, 
		//new Float32Array([0.5, 0.5, 1.5, 1.5, 2.5, 2.5], gl.STATIC_DRAW) and 
		//then gl.drawArrays(gl.POINTS, 0, 3);
		*/
	}
	
	
	
	
	
	this.pointProgram = new GlProgram('frayenPoint', this, loadCompleteCallback);
	
}
