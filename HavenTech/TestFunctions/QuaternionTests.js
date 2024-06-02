
function test_quatMult(){
	let qe = Quat_New();
	qe[0] =-9; qe[1] = -2; qe[2] =11; qe[3] = 8;
	let q = Quat_New();
	 q[0] = 1;  q[1] = -2;  q[2] = 1; q[3] = 3;
	let q1 = Quat_New();
	q1[0] =-1; q1[1] =  2; q1[2] = 3; q1[3] = 2;
	let qr = Quat_New();
	Quat_MultQuat( qr, q, q1 );
	DTPrintf( "quat mult q" + q + " q1 " + q1 + " qr " + qr,
					"test", "color:white", 1 );
	DTPrintf( "expected " + qe,
					"test", "color:white", 1 );
}

function test_quatIdentMult(){
	//test quaternion identity multiplication
	let v = Vect3_NewZero();
	let vret = Vect3_NewZero();
	for( let i = 0; i < 3; ++i ){
		Vect3_Zero(v);
		v[i] = 1;
		q = Quat_New_Identity();
		Quat_MultVect( vret, q, v );
		console.log( "i " + i + " " + vret ); //vret should be 1,0,0 : 0,1,0 : 0,0,1
	}
}


function test_quatRecipMult(){
	//test quaternion reciprocal multiplication
	let qe = Quat_New();
	let q = Quat_New();
	let elrAngIn = Vect3_New();
	let elrAngOut = Vect3_New();
	let qret = Quat_New();
	for( let i = 0; i < 3; ++i ){
		Vect3_Zero( elrAngIn );
		elrAngIn[i] = 90*Math.PI/180;
		Quat_FromEuler( qe, elrAngIn );
		
		
		Quat_Copy(q, qe);
		Quat_Recip(q);
		
		
		Quat_MultQuat( qret, q, qe)
		
		Quat_Decompose( qe );
		QuatAxisAng_ToEuler( elrAngOut, qe  );
		
		console.log( "recip test axis " + i + " " + qret + " euler read back " + elrAngOut + " eul in " + elrAngIn ); //qr should be 0,0,0,1
	}
}

function test_quatToMatrix(){
	//test that euler and axis angle quat -> MatrixType.quat_rotate generates
	//the same matrix as MatrixType.euler_rotate
	let elrAngIn = Vect3_New();
	let quat = Quat_New();
	let fromEulrMat = Matrix_New();
	let fromQuatMat = Matrix_New();
	for( let i = 0; i < 3; ++i ){
		Vect3_Zero( elrAngIn );
		elrAngIn[i] = 90*Math.PI/180;
		Quat_FromEuler( quat, elrAngIn );
		Matrix( fromQuatMat, MatrixType.quat_rotate, quat );
		Matrix( fromEulrMat, MatrixType.euler_rotate, elrAngIn );
		DTPrintf("test_quatToMatrix " + i, "test", "color:beige", 0 );
		Matrix_Print( fromQuatMat, "quat Mat");
		Matrix_Print( fromEulrMat, "eulr Mat");
		
		for( let j = 0; j < 4*4; ++j )
			if( Math.abs(fromQuatMat[j] - fromEulrMat[j]) > epsilon ){
				let row = j % 4;
				let col = j - row;
				DTPrintf( "matricies not equal\n\n\n at idx " + row + 
					" , " + col + " val " + fromQuatMat[j] + " " + fromEulrMat[j],
					"test", "color:red", 1 );
			}
		DTPrintf( "matricies equal\n\n",
					"test", "color:green", 1 );
	}
}

