
//x = (-b +- sqrt( b^2 - 4ac ) ) / 2a
function quadraticSolutions(s, a,b,c){
	if( c < 0.000001 && c > -0.000001 ){
		s[0] = 0;
		s[1] = 0;
		return;
	}
	let det = 4*a*c;
	let bsqu = b*b;
	if( bsqu < det || (a < 0.000001 && a > -0.000001) ){
		s[0] = NaN;
		s[1] = NaN;
		return;
	}
		
	let m = Math.sqrt(bsqu-det);
	s[0] = (-b + m) / (2*a);
	s[1] = (-b - m) / (2*a);
}

//surface area of a sphere = 4   pi r^2
function sphereArea( r ){
	return 4 * Math.PI * r*r;
}
//volume of a sphere       = 4/3 pi r^3
function sphereVolume( r ){
	return 4/3 * Math.PI * r*r*r;
}
function sphereRadiusFromVolume( v ){
	return Math.pow( v * 3/4 / Math.PI, 1/3);
}

function clamp01( a ){
	if( a < 0 )
		return 0;
	if( a > 1 )
		return 1;
	return a;
}

//write into arrays of min and max values 
//given an index and value
function minMax( m, M, i, val ){
	m[i] = m[i] < val ? m[i] : val;
	M[i] = M[i] > val ? M[i] : val;
}

function mnMax( mM, val ){
	mM[0] = mM[0] < val ? mM[0] : val;
	mM[1] = mM[1] > val ? mM[1] : val;
}

function SystemOfEquationSolver(){

	
}
