/*	xRot = xRot % Math.PI; //angles greater than +-pi repeat
	let sign = Math.sign(xRot);
	xRot *= sign;
	if( xRot > Math.PI/2 ){ //need two stages of rotation
		xRot = xRot - Math.PI/2;
		Mat_xRot( tempRotMat, sign*Math.PI/2 );
		Mat_xRot( tempRotMat1, sign*xRot );
		Matrix_Multiply( retMat, tempRotMat, tempRotMat1 );
	}else{
		Mat_xRot( retMat, sign*xRot );
	}
	*/
