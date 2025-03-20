
function CubeGraphics(loadCompleteCallback, unifLocOffset){

	this.loadCompleteCallback = loadCompleteCallback;
	this.glProgram = new GlProgram('frayenCube', this, TRIG_LoadComp);

}

function CUBE_G_Setup(cubeG){
	//called when switching from another program (i.e. line or point drawing gl program)

	let progId = cubeG.glProgram.glProgId;

	gl.useProgram(progId);

}

let cubeWorldToCamMat = new Float32Array(4*4);
let rotWorldToScreenSpaceMat = new Float32Array(4*4);
let tqvrts = new Float32Array(3*4*2);
let tquvs = new Float32Array(2*4*2);
function CUBE_G_DrawSkyBox(mainCam){


	Matrix_Copy( tempMat, mainCam.camToWorldRotMat ); //save before inverting
	Matrix_Inverse( cubeWorldToCamMat, tempMat );

	Matrix_Multiply( rotWorldToScreenSpaceMat, gPM, cubeWorldToCamMat );

	let center = [0,0];
	let widthHeight = [1,1];
	let depth = 1;
	let minUv = [0,0];
	let maxUv = [1,1];

	//generate the 6 corners from the centerpoint and width/height
	let mm = [(center[0] - widthHeight[0]/2), (center[1] - widthHeight[1]/2)]; //left bottom
	let MM = [(center[0] + widthHeight[0]/2), (center[1] + widthHeight[1]/2)]; //right top 
	let mM = [ mm[0], MM[1] ]; //left top
	let Mm = [ MM[0], mm[1] ]; //right bottom

	//the two triangles 
	tqvrts[0*3+0] = mm[0]; tqvrts[0*3+1] = mm[1]; tqvrts[0*3+2] = depth; //left bottom
	tqvrts[1*3+0] = MM[0]; tqvrts[1*3+1] = MM[1]; tqvrts[1*3+2] = depth; //right top
	tqvrts[2*3+0] = mM[0]; tqvrts[2*3+1] = mM[1]; tqvrts[2*3+2] = depth; //left top
	
	tqvrts[3*3+0] = MM[0]; tqvrts[3*3+1] = MM[1]; tqvrts[3*3+2] = depth; //right top
	tqvrts[4*3+0] = mm[0]; tqvrts[4*3+1] = mm[1]; tqvrts[4*3+2] = depth; //left bottom
	tqvrts[5*3+0] = Mm[0]; tqvrts[5*3+1] = Mm[1]; tqvrts[5*3+2] = depth; //right bottom


	tquvs[0*2+0] = minUv[0]; tquvs[0*2+1] = minUv[1]; //left  bottom
	tquvs[1*2+0] = maxUv[0]; tquvs[1*2+1] = maxUv[1]; //right top
	tquvs[2*2+0] = minUv[0]; tquvs[2*2+1] = maxUv[1]; //left  top

	tquvs[3*2+0] = maxUv[0]; tquvs[3*2+1] = maxUv[1]; //right top
	tquvs[4*2+0] = minUv[0]; tquvs[4*2+1] = minUv[1]; //left  bottom
	tquvs[5*2+0] = maxUv[0]; tquvs[5*2+1] = minUv[1]; //right bottom
	//drawBatch.numSubBufferUpdatesToBeValid -= 1;
	
	
	//disable depth buffer writing (infinite distance to skybox)

}
