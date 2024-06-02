

//test cam matrices
function testCamMatricies(cam, octTreeRoot){
	let camOrigin = Vect3_New();
	cam.getLocation(camOrigin);


	let scrnSpcNear = Vect3_NewVals(0,0,-1);
	let nearW = Vect3_New();
	Matrix_Multiply_Vect3( nearW, cam.screenSpaceToWorldMat, scrnSpcNear );

	let nearCamOriDiff = Vect3_CopyNew( nearW );
	Vect3_Subtract( nearCamOriDiff, camOrigin );

	let nearDist = Vect3_Length( nearCamOriDiff );

	let nearWStr 			       = Vect_FixedLenStr( nearW, 3, 6 );
	let scrnSpaceNearWDistFromCamOriStr    = Vect_FixedLenStr( nearCamOriDiff, 3, 6 );
	console.log( "scrnSpaceNearW " + nearWStr + 
				 " diff from camOrigin " + scrnSpaceNearWDistFromCamOriStr +
				 " dist " + nearDist );


	let scrnSpaceFar  = Vect3_NewVals(0,0,1);
	let scrnSpaceFarW = Vect3_New();
	Matrix_Multiply_Vect3( scrnSpaceFarW, cam.screenSpaceToWorldMat, scrnSpaceFar );

	let scrnSpaceFarWDistFromCamOri = Vect3_CopyNew( scrnSpaceFarW );
	Vect3_Subtract( scrnSpaceFarWDistFromCamOri, camOrigin );
	console.log( "scrnSpaceFarW " + Vect_FixedLenStr( scrnSpaceFarW, 3, 6 ) +
				" diff from camOrigin " + Vect_FixedLenStr( scrnSpaceFarWDistFromCamOri, 3, 6 ) +
				" dist " + Vect3_Length(scrnSpaceFarWDistFromCamOri) );

	let oTMin = octTreeRoot.AABB.minCoord;
	let oTMax = octTreeRoot.AABB.maxCoord;
	
	let oTMinStr = Vect_FixedLenStr( oTMin, 3, 6 );
	let oTMaxStr = Vect_FixedLenStr( oTMax, 3, 6 );
	
	console.log( "oTMin " + oTMinStr + " oTMax " + oTMaxStr );
	
	let scrnSpaceOtMin = Vect3_New();
	let scrnSpaceOtMax = Vect3_New();
	Matrix_Multiply_Vect3( scrnSpaceOtMin, cam.worldToScreenSpaceMat, oTMin );
	Matrix_Multiply_Vect3( scrnSpaceOtMax, cam.worldToScreenSpaceMat, oTMax );
	
	let scrnSpaceOtMinStr = Vect_FixedLenStr( scrnSpaceOtMin, 3, 6 );
	let scrnSpaceOtMaxStr = Vect_FixedLenStr( scrnSpaceOtMax, 3, 6 );
	
	console.log( "scrnSpaceOtMin " + scrnSpaceOtMinStr + " oTMax " + scrnSpaceOtMaxStr );

}

