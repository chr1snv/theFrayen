
function TXTR_StrVertBufObj(numVerts){
	this.vertBufferForMat = [new Float32Array(numVerts*vertCard)];
	this.normBufferForMat = [new Float32Array(numVerts*normCard)];
	this.uvBufferForMat = [new Float32Array(numVerts*uvCard)];
}


let textScene = null;
let glyphMeshes = {};
let textMaterial = null;
function TXTR_TextSceneLoaded(txtScene){
	//get the letter meshes from the text scene
	let mdlKeys = Object.keys(txtScene.models);
	//console.log("text mdls");
	for( let i = 0; i < mdlKeys.length; ++i ){
		let model = txtScene.models[mdlKeys[i]];
		let glyphName = txtScene.models[mdlKeys[i]].meshName;
		//console.log( txtScene.models[mdlKeys[i]].meshName );
		glyphMeshes[glyphName] = model.quadmesh;
	}
	
	//get the letter material from the first object
	if( mdlKeys.length > 0 ){
		let model = txtScene.models[mdlKeys[0]];
		textMaterial = model.quadmesh.materials[0];
	}
	
	txtR_dbB = new DrawBatchBuffer( textMaterial );
}

let txtR_dbB = null;
function TXTR_Init(){

	//load the text meshes
	textScene = new HavenScene("text", TXTR_TextSceneLoaded);

}

function TXTR_AllocSubRngBuffer(numVerts, subBufId){

	let obj = new TXTR_StrVertBufObj(numVerts);

	//BufSubRange(startIdxIn, lenIn, objIn, objMatIdxIn)
	let textR_sbb = new BufSubRange( txtR_dbB.bufferIdx, numVerts, obj, 0 );
	Matrix_SetIdentity( textR_sbb.toWorldMatrix );
	txtR_dbB.bufSubRanges[subBufId] = textR_sbb;
	
	txtR_dbB.bufferIdx += numVerts;
	
	let subRngKeys = Object.keys(txtR_dbB.bufSubRanges);
	for(let i = 0; i < subRngKeys.length; ++i ){
		txtR_dbB.bufSubRanges[subRngKeys[i]].vertsNotYetUploaded = true;
	}
	//txtR_dbB.regenAndUploadEntireBuffer = true;
	
	return obj;
}

const xKernSpc = 0.5;
const lVertSpc = 0.2;

//draw text at certian size
let tmpGlyphVert = Vect3_New();
function TR_QueueText( x, y, dpth, size, str ){
	
	//check if its something that wasn't rendered last frame
	let glyphStrKey = "" + x + ":" + y + ":" + dpth + ":" + size + " " + str;
	if( txtR_dbB.bufSubRanges[ glyphStrKey ] == undefined ){
	
		//count the number of verts and generate them for each glyph
		let strNumVerts = 0;
		let escpSeqActive = false;
		let escpStr = "";
		for( let i = 0; i < str.length; ++i ){
			let ltr = str[i];
			if( ltr == ":" ){
				if( !escpSeqActive ){
					escpSeqActive = true;
					continue;
				}else{
					escpSeqActive = false;
					ltr = escpStr;
					escpStr = "";
				}
			}else if(escpSeqActive){
				escpStr += ltr;
				continue;
			}
			
			strNumVerts += glyphMeshes[ltr].vertBufferForMat[0].length;
			//generate the tesselated vert Coords for the glyph if necessary
			if( glyphMeshes[ltr].materialHasntDrawn[0] ){
				QM_SL_GenerateDrawVertsNormsUVsForMat( glyphMeshes[ltr], null, 0, null );
			}
		}
		
		//allocate glyph vert buffer for the string
		let strVertBufObj = TXTR_AllocSubRngBuffer( strNumVerts, glyphStrKey );
		let vertBufIdx = 0;
		let normBufIdx = 0;
		let uvBufIdx = 0;
		escpSeqActive = false;
		let escpdLen = 0;
		//generate the mesh for the glyph positions to draw
		let lNum = 0; //line number
		for( let i = 0; i < str.length; ++i ){
		
			//apply offsets to each
			let posX = escpdLen*xKernSpc;
			let posY = lNum*lVertSpc;
			
			let ltr = str[i];
			if( ltr == ":" ){
				if( !escpSeqActive ){
					escpSeqActive = true;
					continue;
				}else{
					escpSeqActive = false;
					ltr = escpStr;
					escpStr = "";
				}
			}else if(escpSeqActive){
				escpStr += ltr;
				continue;
			}
			
			
			let glyphM = glyphMeshes[ltr];
			let glyphVerts = glyphM.vertBufferForMat[0];
			let glyphNorms = glyphM.normBufferForMat[0];
			let glyphUvs   = glyphM.uvBufferForMat[0];
			let numGlyphVerts = glyphVerts.length;
			for( let j = 0; j < numGlyphVerts; ++j ){
				Vect3_CopyFromArr( tmpGlyphVert, glyphVerts, j*vertCard );
				tmpGlyphVert[0] = ((tmpGlyphVert[0]+posX) * size) + x;
				tmpGlyphVert[1] = ((tmpGlyphVert[1]+posY) * size) + y;
				tmpGlyphVert[2] += dpth;
				Vect3_CopyToArr(strVertBufObj.vertBufferForMat[0], vertBufIdx, tmpGlyphVert);

				Vect_CopyToFromArr( strVertBufObj.normBufferForMat[0], normBufIdx, glyphNorms, 0, normCard );
				Vect_CopyToFromArr( strVertBufObj.uvBufferForMat[0], uvBufIdx, glyphUvs, 0, uvCard );
				vertBufIdx += vertCard;
				normBufIdx += normCard;
				uvBufIdx += uvCard;

			}
			escpdLen += 1;
		}
		
		
		
		//glyphStrVertBuffers[ glyphStrKey ] = [ strVertBuffer, true ];
	}
	
	//enable the sub batch buffer to draw this frame
	if( txtR_dbB.sortedSubRngKeys == null )
		txtR_dbB.sortedSubRngKeys = [];
	txtR_dbB.sortedSubRngKeys.push(  glyphStrKey );
	txtR_dbB.numBufSubRanges += 1;

}

function TR_DrawText(){
	//draw the active glyph vert buffers
	let triG = graphics.triGraphics;
	
	TRI_G_Setup(triG);
	
	//GLP_setIntUniform( triG.glProgram, 'lightingEnabled', 0 );
	//GLP_setFloatUniform( triG.glProgram, 'texturingEnabled', 0 );
	//GLP_setIntUniform( triG.glProgram, 'skelSkinningEnb', 0 );
	
	TRIG_SetDefaultOrthoCamMat(triG);
	
	TRI_G_drawTriangles( triG, txtR_dbB.texName,
		txtR_dbB.material.sceneName, txtR_dbB, 0 );
	
}

function TR_DeactivateFrameGlyphs(){
	//set the buffer as not active for the frame
	txtR_dbB.sortedSubRngKeys = [];
	txtR_dbB.numBufSubRanges = 0;
	
	//let vrtBufKeys = Object.keys(glyphStrVertBuffers);
	//for( let i = 0; vrtBufKeys.length; ++i ){
	//	glyphStrVertBuffers[ vrtBufKeys[i] ][1] = false;
	//}
}

function TR_CleanupFrameGlyphs(){
}
