
function TXTR_StrVertBufObj(numVerts){
	this.vertBufferForMat = [new Float32Array(numVerts*vertCard)];
	this.normBufferForMat = [new Float32Array(numVerts*normCard)];
	this.uvBufferForMat = [new Float32Array(numVerts*uvCard)];
	this.AABB = null;
	this.str = "";
	this.interactive = false;
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

function TXTR_AllocSubRngBuffer(numVerts, subBufId, str, interactive){

	let obj = new TXTR_StrVertBufObj(numVerts);
	obj.str = str;
	obj.interactive = interactive;

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
function TR_QueueText( x, y, dpth, size, str, interactive ){
	
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
		let strVertBufObj = TXTR_AllocSubRngBuffer( strNumVerts, glyphStrKey, str, interactive );
		let vertBufIdx = 0;
		let normBufIdx = 0;
		let uvBufIdx = 0;
		escpSeqActive = false;
		let escpdLen = 0;
		let strMin = Vect3_NewScalar( Number.POSITIVE_INFINITY );
		let strMax = Vect3_NewScalar( Number.NEGATIVE_INFINITY );
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
			//Vect3_SetScalar( strMin, Number.POSITIVE_INFINITY );
			//Vect3_SetScalar( strMax, Number.NEGATIVE_INFINITY );
			for( let j = 0; j < numGlyphVerts; j+=vertCard ){
				Vect3_CopyFromArr( tmpGlyphVert, glyphVerts, j );
				tmpGlyphVert[0] = ((tmpGlyphVert[0]+posX) * size) + x;
				tmpGlyphVert[1] = ((tmpGlyphVert[1]+posY) * size) + y;
				tmpGlyphVert[2] += dpth;
				Vect_minMax( strMin, strMax, tmpGlyphVert );
				Vect3_CopyToArr(strVertBufObj.vertBufferForMat[0], vertBufIdx, tmpGlyphVert);

				Vect_CopyToFromArr( strVertBufObj.normBufferForMat[0], normBufIdx, glyphNorms, 0, normCard );
				Vect_CopyToFromArr( strVertBufObj.uvBufferForMat[0], uvBufIdx, glyphUvs, 0, uvCard );
				vertBufIdx += vertCard;
				normBufIdx += normCard;
				uvBufIdx += uvCard;

			}
			escpdLen += 1;
		}
		strVertBufObj.AABB = new AABB( strMin, strMax );
		
		
		
		//glyphStrVertBuffers[ glyphStrKey ] = [ strVertBuffer, true ];
	}
	
	//enable the sub batch buffer to draw this frame
	if( txtR_dbB.sortedSubRngKeys == null )
		txtR_dbB.sortedSubRngKeys = [];
	txtR_dbB.sortedSubRngKeys.push(  glyphStrKey );
	txtR_dbB.numBufSubRanges += 1;

}

let tr_highlightedColor = new Float32Array([1,1,0, 1]);

const MAX_M_OVRED_OBJS = 10;
let mOvrdStrs = new Array(MAX_M_OVRED_OBJS);
let numMOvrdStrs = 0;

let tr_ptrRay = new Ray( Vect3_New(), Vect3_NewZero() );
tr_ptrRay.norm[2] = -1;
let ndcSpaceAABB = new AABB( Vect3_New(), Vect3_New() );
function TR_RaycastPointer(pLoc){
	//cast the given location into the aabb's to find
	//which text objects it intersects with
	numMOvrdStrs = 0;
	
	tr_ptrRay.origin[0] = ((pLoc.x / graphics.screenWidth) - 0.5)* 2;
	tr_ptrRay.origin[1] = ((pLoc.y / graphics.screenHeight) - 0.5)* -2;
	
	let subRngKeys = txtR_dbB.sortedSubRngKeys;
	for( let i = 0; i < subRngKeys.length; ++i ){
		let subRng = txtR_dbB.bufSubRanges[ subRngKeys[i] ];
		if( !subRng.obj.interactive ) //skip non interactable text objects
			continue;
		let aabb = subRng.obj.AABB;
		Matrix_Multiply_Vect3( ndcSpaceAABB.minCoord, gOM, aabb.minCoord );
		Matrix_Multiply_Vect3( ndcSpaceAABB.maxCoord, gOM, aabb.maxCoord );
		//console.log( "aabbMin " + Vect_ToFixedPrecisionString( aabb.minCoord, 4 ) + " max " + Vect_ToFixedPrecisionString( aabb.maxCoord, 4 ) );
		//console.log( "tr_ptrRay " + Vect_ToFixedPrecisionString( tr_ptrRay.origin, 4 ) );
		if( AABB_RayIntersects(ndcSpaceAABB, tr_ptrRay, 0 ) > 0 ){
			//change the text color
			subRng.overrideColor = tr_highlightedColor;
			mOvrdStrs[ numMOvrdStrs++ ] = subRng.obj.str;
		}else{
			subRng.overrideColor = null;
		}
			
	}
}

function TR_DrawText(){
	//draw the active glyph vert buffers
	let triG = graphics.triGraphics;
	
	//TRI_G_Setup(triG);
	
	//GLP_setIntUniform( triG.glProgram, 'lightingEnabled', 0 );
	//GLP_setFloatUniform( triG.glProgram, 'texturingEnabled', 0 );
	//GLP_setIntUniform( triG.glProgram, 'skelSkinningEnb', 0 );

	TRIG_SetDefaultOrthoCamMat(triG);

	TRI_G_drawTriangles( triG, txtR_dbB.texName,
		txtR_dbB.material.sceneName, txtR_dbB, 0 );

}

function TR_DeactivateFrameGlyphs(){
	//set the buffer as not active for the next frame 
	//(until/unless next frame the same string is asked to draw)
	txtR_dbB.sortedSubRngKeys = [];
	txtR_dbB.numBufSubRanges = 0;
	
	//let vrtBufKeys = Object.keys(glyphStrVertBuffers);
	//for( let i = 0; vrtBufKeys.length; ++i ){
	//	glyphStrVertBuffers[ vrtBufKeys[i] ][1] = false;
	//}
}

function TR_CleanupFrameGlyphs(){
}
