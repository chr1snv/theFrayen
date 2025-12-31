//# sourceURL=Structures/TriText.js


let textScene = null;
let textMaterial = null;
function TXTR_TextSceneLoaded(txtScene){
	//get the letter meshes from the text scene
	let mdlKeys = Object.keys(txtScene.models);
	//console.log("text mdls");
	//create a lookup by glyph name instead of uid
	txtScene.glyphModels = {};
	for( let i = 0; i < mdlKeys.length; ++i ){
		let model = txtScene.models[mdlKeys[i]];
		let glyphName = txtScene.models[mdlKeys[i]].modelName;
		//console.log( txtScene.models[mdlKeys[i]].meshName );
		txtScene.glyphModels[glyphName] = model;
	}

	//get the letter material from the first object
	if( mdlKeys.length > 0 ){
		let model = txtScene.models[mdlKeys[0]];
		textMaterial = model.materials[0];
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


//set st = -1 to only print minutes seconds
function TR_QueueTime( rb2DTris, x, y, dpth, size, m, s, st, justify=TxtJustify.Left, overideColor=null ){

	//get the number of digits and str len for center and right justified strings
	let numMinDigits = 1;
	let numSecDigits = 2;
	let numTSecDigits = 2;
	if( st == -1 ){
		numTSecDigits = 0;
	}

	if( m > 9 ) //more than one minutes
		numMinDigits += Math.floor( Math.log10( m ) );

	//compute the right justify offsets for mins : secs : tenth secs
	let sTnthsXStart	= x				-  numTSecDigits*xKernSpc*size;
	let sColXStrt		= sTnthsXStart  - (xKernOverrides["col"]*size);
	let mColXStrt		= sColXStrt		- (numSecDigits*xKernSpc*size);
	let minXStrt		= mColXStrt		- numMinDigits * xKernSpc*size;

	if( justify == TxtJustify.Right ){ //shift to the left based of size of parts

	}else if( justify == TxtJustify.Left ){ //offset to the right parts
		minXStrt = x;
	}else if( justify == TxtJustify.Center ){
		let wdth = minXStrt - x;
		let minXStrt = x - wdth/2;
	}

	//generate and queue the text meshes
	let dgtSpc = xKernSpc * size;
	let decPlcs = 0;
	let nextLtrStartX = TR_QueueNumber(	rb2DTris, minXStrt, y, dpth, size,  m			, decPlcs, TxtJustify.Left, overideColor );
		nextLtrStartX = TR_QueueText(	rb2DTris, nextLtrStartX, y, dpth, size, ':col:'		, false	, TxtJustify.Left, overideColor );
		nextLtrStartX += xKernOverrides["col"]*size;
	if( s < 10 ){ //prepend zero
						TR_QueueNumber(	rb2DTris, nextLtrStartX, y, dpth, size,  0 			, decPlcs, TxtJustify.Left, overideColor );
						nextLtrStartX += xKernSpc * size;
	}
		nextLtrStartX = TR_QueueNumber(	rb2DTris, nextLtrStartX, y, dpth, size,  s 			, decPlcs, TxtJustify.Left, overideColor );
	if( st > -1 ){
		nextLtrStartX = TR_QueueText(	rb2DTris, nextLtrStartX, y, dpth, size, ':col:'		, false	, TxtJustify.Left, overideColor );
		nextLtrStartX += xKernOverrides["col"]*size;
		nextLtrStartX = TR_QueueNumber(	rb2DTris, nextLtrStartX, y, dpth, size,  st			, decPlcs, TxtJustify.Left, overideColor );
	}
	return nextLtrStartX;

}
function TR_QueueNumber( rb2DTris, x, y, dpth, size, num, numDecPlaces=0, justify=TxtJustify.Center, overideColor=null ){
	//the specified location x,y is of the int.decimal sperator so that each 10's place stays
	//in the same spot on screen as values change


	let negNum = num < 0;
	if( negNum ){
		num = -num;
	}
	let decNum = num - Math.floor( num );


	let numDigits = 1;
	if( num >= 1 )
		numDigits = Math.floor( Math.log10( num ) ) + 1;



	//get the total string widths (to reposition for center or right justification)
	//of the parts to the left and right of the decimal
	let intStrWdth = 0;
	let decStrWdth = 0;
	if( negNum )
		intStrWdth += xKernOverrides["min"]*size;
	intStrWdth += numDigits * xKernSpc * size;
	if( decNum > 0 )
		decStrWdth += numDecPlaces;

	let intStrStX = 0;
	let decStrStX = 0;
	if( justify == TxtJustify.Center ){
		intStrStX = x-intStrWdth;
		decStrStX = x;//+xKernOverrides["min"]*size;
	}else if( justify == TxtJustify.Left ){
		intStrStX = x;
		decStrStX = x + intStrWdth;
	}else{ //right justify
		decStrStX = x-decStrWdth;
		intStrStX = decStrStX-intStrWdth;
	}
	let nextStrXOffset = intStrStX;

	//print the string ( with offsets for left, center or right justification )
	if( negNum ){
		TR_QueueText( rb2DTris, nextStrXOffset, y, dpth, size, ":min:", false, TxtJustify.Left, overideColor );
		nextStrXOffset += xKernOverrides["min"]*size;
	}


	if( numDigits <= 0 ){
		TR_QueueText( rb2DTris, nextStrXOffset, y, dpth, size, '0', false, TxtJustify.Left, overideColor );
		nextStrXOffset += xKernSpc * size;
	}else{
		let numRemainder = num;
		for( let i = 0; i < numDigits; ++i ){
			let digitPowerOfTen = Math.pow(10, (numDigits-1)-i);
			let digit = Math.floor( numRemainder / digitPowerOfTen );
			TR_QueueText( rb2DTris, nextStrXOffset, y, dpth, size, ''+digit, false, TxtJustify.Left, overideColor );
			nextStrXOffset += xKernSpc * size;
			numRemainder = numRemainder - (digit * digitPowerOfTen);
		}
	}

	if( decNum > 0 && numDecPlaces > 0 ){
		nextStrXOffset = TR_QueueText( rb2DTris, decStrStX, y, dpth, size, '.', false, TxtJustify.Left, overideColor );
		decNum = decNum * Math.pow(10, numDecPlaces );
		nextStrXOffset = TR_QueueNumber( rb2DTris, nextStrXOffset, y, dpth, size, decNum, 0, TxtJustify.Left, overideColor );
	}
	return nextStrXOffset;
}

const TxtJustify = {
	Left: 0,
	Center: 1,
	Right: 2
};

const xKernOverrides = {
	"min": 0.3,
	"col": 0.1,
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
	"fL":0.3,
	"iL":0.25,
	"lL":0.25,
	"rL":0.4,
	"sL":0.4,
	"tL":0.35,
	"mL":0.7,
	"wL":0.65,
	"yL":0.4,
};

const xKernSpc = 0.5;
const lVertSpc = 0.2;

let strAABBMin = Vect3_New();
let strAABBMax = Vect3_New();

//draw text at certian size
let maxTextX = 0;
let tmpGlyphVert = Vect3_NewZero();
var queuedTextSbb = null;
let blibQuat = Quat_New();
function TR_QueueText( rb2DTris, x, y, dpth, size, str, interactive, justify=TxtJustify.Left, overideColor=null, bilboard=false ){

	let txtR_dbB = GetDrawBatchBufferForMaterial( rb2DTris, textMaterial );

	//check if its something that wasn't rendered in previous frames
	let glyphStrKey = "" + x.toFixed(2) + ":" + y.toFixed(2) + /*":" + dpth + ":" + size +*/ ":" + str;


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
			}else if( ltr == ',' ){
				ltr = 'com';
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
				strNumVerts += textScene.glyphModels[ltr].quadmesh.vertBufferForMat[0].length;
				//generate the tesselated vert Coords for the glyph if necessary
				if( textScene.glyphModels[ltr].materialHasntDrawn[0] ){
					QM_SL_GenerateDrawVertsNormsUVsForMat( textScene.glyphModels[ltr], null, 0, null );
				}
			}
		}


		let strQm = new TRI_G_VertBufQuadmesh(strNumVerts);

		let mdlName = glyphStrKey;//ltr + " glyph";
		let strMdl = new Model( mdlName, meshNameIn=null, armNameIn=null, ipoNameIn=null, 
		materialNamesIn=[textMaterial.materialName], sceneNameIn=textScene.sceneName, AABBIn=new AABB([-1,-1,-1], [1,1,1]),
				locationIn=[x,y,dpth], rotationIn=Quat_New(), scaleIn=[size,size,1],
					modelLoadedParameters=null, modelLoadedCallback=null, isPhysical=false );
		strMdl.quadmesh = strQm;
		strMdl.str = str;
		strMdl.interactive = interactive;
		MDL_Update(strMdl, 0, null);

		//allocate glyph vert buffer for the string
		//GetDrawSubBatchBuffer( dbB, subRangeId, numVerts, subRangeQm, qmMatID )
		queuedTextSbb = GetDrawSubBatchBuffer( txtR_dbB, glyphStrKey, strNumVerts, strMdl, 0 );//, interactive );
		//set the matrix directly on the sub batch buffer,
		//RastB_PrepareBatchToDraw only copies toWorldMatricies from raster batch .mdls
		//(text bypasses it and makes the text ready to draw by calling GetDrawSubBatchBuffer
		//and setting the length of the sub batch buffer)
		//Matrix_SetIdentity( queuedTextSbb.toWorldMatrix ); //this is used instead of per vertex x,y,dpth offset
		//Matrix_SetTranslate( queuedTextSbb.toWorldMatrix, [x,y,dpth] );
		let strVertBufObj = queuedTextSbb.mdl;


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

			//apply offsets to each glyph while copying its verts into the quadmesh representation

			let ltr = str[i];
			let ltrCharCode = ltr.charCodeAt(0);
			if( !escpSeqActive && ltrCharCode >= lwrACharCode && ltrCharCode <= lwrZCharCode ){
				ltr = ltr+'L'; //fix for case insensitive url mesh file loading
			}else if( ltr == '.' ){
				ltr = 'dot';
			}else if( ltr == ',' ){
				ltr = 'com';
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
				let glyphM = textScene.glyphModels[ltr].quadmesh;
				let glyphVerts = glyphM.vertBufferForMat[0];
				let glyphNorms = glyphM.normBufferForMat[0];
				let glyphUvs   = glyphM.uvBufferForMat[0];
				let numGlyphVerts = glyphVerts.length;

				for( let j = 0; j < numGlyphVerts; j+=vertCard ){
					Vect3_CopyFromArr( tmpGlyphVert, glyphVerts, j );
					tmpGlyphVert[0] = (tmpGlyphVert[0]+posX);// * size);// + x;
					tmpGlyphVert[1] = (tmpGlyphVert[1]+posY);// * size);// + y;
					//tmpGlyphVert[2] += dpth;
					Vect_minMax( strMinTemp, strMaxTemp, tmpGlyphVert );
					Vect3_CopyToArr(strQm.vertBufferForMat[0], vertBufIdx, tmpGlyphVert);

					Vect_CopyToFromArr( strQm.normBufferForMat[0], normBufIdx, glyphNorms, 0, normCard );
					Vect_CopyToFromArr( strQm.uvBufferForMat[0], uvBufIdx, glyphUvs, 0, uvCard );
					vertBufIdx += vertCard;
					normBufIdx += normCard;
					uvBufIdx += uvCard;

				}
			}
			//Vect3_MultiplyScalar( strMinTemp, size );
			//Vect3_MultiplyScalar( strMaxTemp, size );

			escpdLen += 1; //above continue;'s prevent going to here until characters btwn : :'s have been condensed to one ltr
			let xKrnOvrd = xKernOverrides[ltr];
			if( xKrnOvrd )
				posX += xKrnOvrd;
			else
				posX += xKernSpc;
		}

		//offset toWorldMatrix transform for center and right justification
		if( justify != TxtJustify.Left ){
			let strWdth = (strMaxTemp[0] - strMinTemp[0]) * size;
			if( justify == TxtJustify.Center ){
				Matrix_SetTranslate( queuedTextSbb.mdl.toWorldMatrix, [x-strWdth/2,y,dpth] );
			}else if( justify == TxtJustify.Right ){
				Matrix_SetTranslate( queuedTextSbb.mdl.toWorldMatrix, [x-strWdth  ,y,dpth] );
			}
		}

		//transform the min and max of the aabb so that RayIntersects in 
		//RaycastPointer allows for detecting when the pointer selects interactable strings
		Matrix_Multiply_Vect3( strAABBMin, queuedTextSbb.mdl.toWorldMatrix, strMinTemp );
		Matrix_Multiply_Vect3( strAABBMax, queuedTextSbb.mdl.toWorldMatrix, strMaxTemp );
		strMdl.AABB = new AABB( strAABBMin, strAABBMax );
		txtR_dbB.numSubBufferUpdatesToBeValid -= 1;


		if( justify == TxtJustify.Center ){
			queuedTextSbb.mdl.textEndX = x; //likely not used
		}else if( justify == TxtJustify.Right ){
			queuedTextSbb.mdl.textEndX = strAABBMin[0];
		}else{ //left justify (default)
			queuedTextSbb.mdl.textEndX = strAABBMax[0];
		}

		Matrix_Copy( queuedTextSbb.toWorldMatrix, queuedTextSbb.mdl.toWorldMatrix );

		//glyphStrVertBuffers[ glyphStrKey ] = [ strVertBuffer, true ];
	}else{
		//restore the number of verts for the sub batch buffer to draw
		queuedTextSbb = GetDrawSubBatchBuffer( txtR_dbB, glyphStrKey, 0, null, 0 );
		if( queuedTextSbb.len < queuedTextSbb.maxLen ) //re enable for drawing (if prevents setting len to 0 if same text queued twice in a frame)
			queuedTextSbb.len = queuedTextSbb.maxLen; //subb.mdl.vertBufferForMat.length / vertCard;
		//
	}

	queuedTextSbb.overrideColor = overideColor;
	queuedTextSbb.nonHighlightedColor = overideColor;
	if( bilboard ){
		let txtOri = [x, y, dpth];
		//Matrix_LookAt( queuedTextSbb.mdl.toWorldMatrix, rb2DTris.camWorldPos, txtOri );
		Quat_LookAt( blibQuat, rb2DTris.camWorldPos, txtOri );//queuedTextSbb.mdl.origin ); //x, y, dpth
		Matrix_SetQuatRotate( queuedTextSbb.mdl.toWorldMatrix, blibQuat );
		Matrix_SetTranslate( queuedTextSbb.mdl.toWorldMatrix, txtOri );

		Matrix_Copy( queuedTextSbb.toWorldMatrix, queuedTextSbb.mdl.toWorldMatrix );
	}

/*
	//enable the sub batch buffer to draw this frame
	if( txtR_dbB.sortedSubRngKeys == null )
		txtR_dbB.sortedSubRngKeys = [];
	txtR_dbB.sortedSubRngKeys.push( glyphStrKey );
	//txtR_dbB.numBufSubRanges += 1;
	*/

	return queuedTextSbb.mdl.textEndX;

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
		if( !subRng.mdl.interactive ) //skip non interactable text objects
			continue;
		let aabb = subRng.mdl.AABB;
		Matrix_Multiply_Vect3( ndcSpaceAABB.minCoord, gOM, aabb.minCoord );
		Matrix_Multiply_Vect3( ndcSpaceAABB.maxCoord, gOM, aabb.maxCoord );
		//console.log( "aabbMin " + Vect_ToFixedPrecisionString( aabb.minCoord, 4 ) + " max " + Vect_ToFixedPrecisionString( aabb.maxCoord, 4 ) );
		//console.log( "tr_ptrRay " + Vect_ToFixedPrecisionString( tr_ptrRay.origin, 4 ) );
		if( AABB_RayIntersects(ndcSpaceAABB, tr_ptrRay, 0 ) > 0 ){
			//change the text color
			subRng.overrideColor = tr_highlightedColor;
			mOvrdStrs[ numMOvrdStrs++ ] = subRng.mdl.str;
		}else{
			subRng.overrideColor = subRng.nonHighlightedColor;
		}

	}
}


function TR_CleanupFrameGlyphs(){
}
