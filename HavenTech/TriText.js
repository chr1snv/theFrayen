


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

	//txtR_dbB = new DrawBatchBuffer( textMaterial );
	txtr_ldCmpCb();
}
let txtr_ldCmpCb = null;
function TXTR_Init(ldCmpCb){

	txtr_ldCmpCb = ldCmpCb;

	//load the text meshes
	textScene = new HavenScene("textMeshes", TXTR_TextSceneLoaded);

}



function TR_QueueTime( rb2DTris, x, y, dpth, size, m, s ){

    let nextLtrStartX = TR_QueueNumber( rb2DTris, x, y, dpth, size, m );
        nextLtrStartX =  TR_QueueText( rb2DTris, nextLtrStartX, y, dpth, size, 'M', false );
        nextLtrStartX = TR_QueueNumber( rb2DTris, nextLtrStartX, y, dpth, size, s );
                         TR_QueueText( rb2DTris, nextLtrStartX, y, dpth, size, 'S', false );

}
function TR_QueueNumber( rb2DTris, x, y, dpth, size, num, numDecPlaces=0 ){

	let numDigits = 1;
	if( num > 0 ) 
		numDigits = Math.floor( Math.log10( num ) ) + 1;
	let mostSignificantPrinted = 0;
	let numRemainder = num;
	let nextStrXOffset = x;
	for( let i = 0; i < numDigits; ++i ){
		let digitPowerOfTen = Math.pow(10, (numDigits-1)-i);
		let digit = Math.floor( numRemainder / digitPowerOfTen );
		nextStrXOffset = TR_QueueText( rb2DTris, nextStrXOffset, y, dpth, size, ''+digit, false );
		numRemainder = numRemainder - (digit * digitPowerOfTen);
	}


	if( numRemainder > 0 && numDecPlaces > 0 ){
		nextStrXOffset = TR_QueueText( rb2DTris, nextStrXOffset, y, dpth, size, '.' );
		numRemainder = numRemainder * Math.pow(10, numDecPlaces );
		nextStrXOffset = TR_QueueNumber( rb2DTris, nextStrXOffset, y, dpth, size, numRemainder );
	}
	return nextStrXOffset;
}

const xKernOverrides = {
	" ":0.3,

	"A":0.6,
	"C":0.7,
	"D":0.7,
	"G":0.7,
	"H":0.7,
	"I":0.25,
	"S":0.45,
	"T":0.6,
	"U":0.6,
	"R":0.65,
	"M":0.75,
	"N":0.7,
	"O":0.8,
	"W":1.0,
	
	"aL":0.4,
	"iL":0.25,
	"fL":0.3,
	"wL":0.65,
	"rL":0.4,
	"sL":0.4,
	"tL":0.35,
};

const xKernSpc = 0.5;
const lVertSpc = 0.2;

let strAABBMin = Vect3_New();
let strAABBMax = Vect3_New();

//draw text at certian size
let maxTextX = 0;
let tmpGlyphVert = Vect3_NewZero();
function TR_QueueText( rb2DTris, x, y, dpth, size, str, interactive ){

	let txtR_dbB = GetDrawBatchBufferForMaterial( rb2DTris, textMaterial );

	//check if its something that wasn't rendered in previous frames
	let glyphStrKey = "" + x + ":" + y + ":" + dpth + ":" + size + ":" + str;

	let sbb = null;

	if( txtR_dbB.bufSubRanges[ glyphStrKey ] == undefined ){
	
		let lwrACharCode = "a".charCodeAt(0);
		let lwrZCharCode = "z".charCodeAt(0);

		//count the number of verts and generate them for each glyph
		let strNumVerts = 0;
		let escpSeqActive = false;
		let escpStr = "";
		for( let i = 0; i < str.length; ++i ){
			let ltr = str[i];
			let ltrCharCode = ltr.charCodeAt(0);
			if( !escpSeqActive && ltrCharCode >= lwrACharCode && ltrCharCode <= lwrZCharCode ){
				ltr = ltr+'L'; //fix for case insensitive url mesh file loading
			}else if( ltr == '.' ){
				ltr = 'dot';
			}else if( ltr == ":" ){
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
			
			if( ltr != ' ' ){
				strNumVerts += glyphMeshes[ltr].vertBufferForMat[0].length;
				//generate the tesselated vert Coords for the glyph if necessary
				if( glyphMeshes[ltr].materialHasntDrawn[0] ){
					QM_SL_GenerateDrawVertsNormsUVsForMat( glyphMeshes[ltr], null, 0, null );
				}
			}
		}

		let strObj = new TRI_G_VertBufObj(strNumVerts, str, interactive);

		//allocate glyph vert buffer for the string
		//GetDrawSubBatchBuffer( dbB, subRangeId, numVerts, subRangeQm, qmMatID )
		sbb = GetDrawSubBatchBuffer( txtR_dbB, glyphStrKey, strNumVerts, strObj, 0 );//, interactive );
		//set the matrix directly on the sub batch buffer,
		//RastB_PrepareBatchToDraw only copies toWorldMatricies from raster batch .objs
		//(text bypasses it and makes the text ready to draw by calling GetDrawSubBatchBuffer
		//and setting the length of the sub batch buffer)
		Matrix_SetIdentity( sbb.toWorldMatrix ); //should maybe use this instead of per vertex x,y,dpth offset
		Matrix_SetTranslate( sbb.toWorldMatrix, [x,y,dpth] );
		let strVertBufObj = sbb.obj;

		let vertBufIdx = 0;
		let normBufIdx = 0;
		let uvBufIdx = 0;
		escpSeqActive = false;
		let escpdLen = 0; //the number of glyphs to draw the the screen after evaluating escape sequences
		let strMinTemp = Vect3_NewScalar( Number.POSITIVE_INFINITY );
		let strMaxTemp = Vect3_NewScalar( Number.NEGATIVE_INFINITY );
		//generate the mesh for the glyph positions to draw
		let lNum = 0; //line number
		let posX = escpdLen*xKernSpc;
		let posY = lNum*lVertSpc;
		for( let i = 0; i < str.length; ++i ){

			//apply offsets to each

			let ltr = str[i];
			let ltrCharCode = ltr.charCodeAt(0);
			if( !escpSeqActive && ltrCharCode >= lwrACharCode && ltrCharCode <= lwrZCharCode ){
				ltr = ltr+'L'; //fix for case insensitive url mesh file loading
			}else if( ltr == '.' ){
				ltr = 'dot';
			}else if( ltr == ":" ){
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

			if( ltr != ' ' ){
				let glyphM = glyphMeshes[ltr];
				let glyphVerts = glyphM.vertBufferForMat[0];
				let glyphNorms = glyphM.normBufferForMat[0];
				let glyphUvs   = glyphM.uvBufferForMat[0];
				let numGlyphVerts = glyphVerts.length;

				for( let j = 0; j < numGlyphVerts; j+=vertCard ){
					Vect3_CopyFromArr( tmpGlyphVert, glyphVerts, j );
					tmpGlyphVert[0] = ((tmpGlyphVert[0]+posX) * size);// + x;
					tmpGlyphVert[1] = ((tmpGlyphVert[1]+posY) * size);// + y;
					//tmpGlyphVert[2] += dpth;
					Vect_minMax( strMinTemp, strMaxTemp, tmpGlyphVert );
					Vect3_CopyToArr(strVertBufObj.vertBufferForMat[0], vertBufIdx, tmpGlyphVert);

					Vect_CopyToFromArr( strVertBufObj.normBufferForMat[0], normBufIdx, glyphNorms, 0, normCard );
					Vect_CopyToFromArr( strVertBufObj.uvBufferForMat[0], uvBufIdx, glyphUvs, 0, uvCard );
					vertBufIdx += vertCard;
					normBufIdx += normCard;
					uvBufIdx += uvCard;

				}
			}

			escpdLen += 1; //above continue;'s prevent going to here until characters btwn : :'s have been condensed to one ltr
			let xKrnOvrd = xKernOverrides[ltr];
			if( xKrnOvrd )
				posX += xKrnOvrd;
			else
				posX += xKernSpc;
		}
		//transform the min and max of the aabb so that RayIntersects in 
		//RaycastPointer allows for detecting when the pointer selects interactable strings
		Matrix_Multiply_Vect3( strAABBMin, sbb.toWorldMatrix, strMinTemp );
		Matrix_Multiply_Vect3( strAABBMax, sbb.toWorldMatrix, strMaxTemp );
		strVertBufObj.AABB = new AABB( strAABBMin, strAABBMax );
		txtR_dbB.numSubBufferUpdatesToBeValid -= 1;

		sbb.obj.textEndX = strAABBMax[0];
		//glyphStrVertBuffers[ glyphStrKey ] = [ strVertBuffer, true ];
	}else{
		//restore the number of verts for the sub batch buffer to draw
		sbb = GetDrawSubBatchBuffer( txtR_dbB, glyphStrKey, 0, null, 0 );
		sbb.len = sbb.maxLen; //subb.obj.vertBufferForMat.length / vertCard;
	}

	//enable the sub batch buffer to draw this frame
	if( txtR_dbB.sortedSubRngKeys == null )
		txtR_dbB.sortedSubRngKeys = [];
	txtR_dbB.sortedSubRngKeys.push( glyphStrKey );
	//txtR_dbB.numBufSubRanges += 1;

	return sbb.obj.textEndX;

}

let tr_highlightedColor = new Float32Array([1,1,0]);

const MAX_M_OVRED_OBJS = 10;
let mOvrdStrs = new Array(MAX_M_OVRED_OBJS);
let numMOvrdStrs = 0;

let tr_ptrRay = new Ray( Vect3_New(), Vect3_NewZero() );
tr_ptrRay.norm[2] = -1;
let ndcSpaceAABB = new AABB( Vect3_New(), Vect3_New() );
function TR_RaycastPointer(rb2DTris, pLoc){
	//cast the given location into the aabb's to find
	//which text objects it intersects with
	numMOvrdStrs = 0;

	let txtR_dbB = GetDrawBatchBufferForMaterial( rb2DTris, textMaterial );

	tr_ptrRay.origin[0] = ((pLoc.x / graphics.screenWidth) - 0.5)* 2;
	tr_ptrRay.origin[1] = ((pLoc.y / graphics.screenHeight) - 0.5)* -2;

	let subRngKeys = txtR_dbB.sortedSubRngKeys;
	for( let i = 0; i < txtR_dbB.numBufSubRanges; ++i ){
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


function TR_CleanupFrameGlyphs(){
}
