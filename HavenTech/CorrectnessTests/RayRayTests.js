//# sourceURL=CorrectnessTests/RayRayTests.js

function ray2Tests(){
	let r1O = [0,0];
	let r1D = [1,0];
	let r2O = [1,0];
	let r2D = [-1,0];
	let t2 = R2RayIntersection( r1O, r1D, r2O, r2D );
	DTPrintf( "r1O " + r1O + " r1D " + r1D + " r2O " + r2O + " r2D " + r2D + "  t2= " + t2 + " expected 0.5", "test", "", 0 );

	r1O = [0,0];
	r1D = [0,1];
	r2O = [0,1];
	r2D = [0,-1];
	t2 = R2RayIntersection( r1O, r1D, r2O, r2D );
	DTPrintf( "r1O " + r1O + " r1D " + r1D + " r2O " + r2O + " r2D " + r2D + "  t2= " + t2 + " expected 0.5", "test", "", 0 );
}


