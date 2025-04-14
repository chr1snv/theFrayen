
let _n = 1024; //fft window size

// core operation of FFT
function fastFourierTransform(re, im, inv) {
  let d;
  let h;
  let ik;
  let m;
  let tmp;
  let wr;
  let wi;
  let xr;
  let xi;
  let n4 = _n >> 2;
  // bit reversal
  for (let l = 0; l < _n; l++) {
    m = _bitrev[l];
    if (l < m) {
      tmp = re[l];
      re[l] = re[m];
      re[m] = tmp;
      tmp = im[l];
      im[l] = im[m];
      im[m] = tmp;
    }
  }
  // butterfly operation
  for (let k = 1; k < _n; k <<= 1) {
    h = 0;
    d = _n / (k << 1);
    for (let j = 0; j < k; j++) {
      wr = _cstb[h + n4];
      wi = inv * _cstb[h];
      for (let i = j; i < _n; i += k << 1) {
        ik = i + k;
        xr = wr * re[ik] + wi * im[ik];
        xi = wr * im[ik] - wi * re[ik];
        re[ik] = re[i] - xr;
        re[i] += xr;
        im[ik] = im[i] - xi;
        im[i] += xi;
      }
      h += d;
    }
  }
}

// initialize the array (supports TypedArray)
function _initArray() {
  if (typeof Uint32Array !== "undefined") {
    _bitrev = new Uint32Array(_n);
  } else {
    _bitrev = [];
  }
  if (typeof Float64Array !== "undefined") {
    _cstb = new Float64Array(_n * 1.25);
  } else {
    _cstb = [];
  }
}

//function _paddingZero() {
//    // TODO
//}

function _makeBitReversalTable() {
  let i = 0;
  let j = 0;
  let k = 0;
  _bitrev[0] = 0;
  while (++i < _n) {
    k = _n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
    _bitrev[i] = j;
  }
}

// makes trigonometric function table
function _makeCosSinTable() {
  let n2 = _n >> 1;
  let n4 = _n >> 2;
  let n8 = _n >> 3;
  let n2p4 = n2 + n4;
  let t = Math.sin(Math.PI / _n);
  let dc = 2 * t * t;
  let ds = Math.sqrt(dc * (2 - dc));
  let c = (_cstb[n4] = 1);
  let s = (_cstb[0] = 0);
  t = 2 * dc;
  for (let i = 1; i < n8; i++) {
    c -= dc;
    dc += t * c;
    s += ds;
    ds -= t * s;
    _cstb[i] = s;
    _cstb[n4 - i] = c;
  }
  if (n8 !== 0) {
    _cstb[n8] = Math.sqrt(0.5);
  }
  for (let j = 0; j < n4; j++) {
    _cstb[n2 - j] = _cstb[j];
  }
  for (let k = 0; k < n2p4; k++) {
    _cstb[k + n2] = -_cstb[k];
  }
}
//_makeCosSinTable();

//fft can be done as a matrix (dft matrix)
//matrix multiplication implementations of algorithms are very efficent because
//they can be done in parallel (minimal co dependance of inputs and are 
//fixed/deterministic length operations
//(also they can be done on the gpu which has faster parallel multiplication and ordered memory lookup than the cpu)
//https://en.wikipedia.org/wiki/DFT_matrix
//in the case of the fft, there are symmetries which can be used to do it faster than the n^2 matrix
//(radix decimation in frequency)

function generateDFFT_Matrix(n){
	let m = new Float32Array(n*n*2); //complex number x + i y matrix
	
	//( 1 + 0 i ) * ( 0 + 1 i ) = 
	
	//w = ( w^jk / sqrt(n) )
	//for w^x = w ^ ( x mod N )
	//w = e ^ -((2 PI i) / N) // negative exponent means reciprocal (x^-2 = 1/(x^2))
	//cos(2kpi/n)+isin(2kpi/n)
	//primitive Nth root of unity (on imaginary unit circle (y=i)) (i^2 = -1)
	//forward and reverse transformations have opposite sign exponents
	//eulers formula
	//e^ix = cos x + i sin x
	for( let j = 0; j < n; ++j ){ //row
		for( let i = 0; i < n; ++i ){ //column
			let p = (j*i)%n; //power to raise w to
			let f = (2*Math.PI*p)/n; //factor for real and imaginary part
			m[(j*n*2)+(i*2)  ] = Math.cos(f);//real (cosine)
			m[(j*n*2)+(i*2)+1] = Math.sin(f);//imaginary (sine)
		}
	}
	return m;
}

function Matrix_Print_Complex(m, dim, name){
	DPrintf("Matrix : " + name );
	for( let j = 0; j < dim; ++j ){ //row
		let str = "";
		for( let i = 0; i < dim; ++i ){ //column
			str += m[(j*2)*dim+(i*2)+0].toFixed(2) + ":";
			str += m[(j*2)*dim+(i*2)+1].toFixed(2) + " ";
		}
		DPrintf( str );
	}
}

function VectComplex_FromArrMult( retV, v1Arr, v1Idx, v2 ){
	//if z1=a+bi and z2=c+di, then z1⋅z2=(ac−bd)+(ad+bc)i
	let a = v1Arr[v1Idx+0];
	let b = v1Arr[v1Idx+1];
	let c = v2[0];
	let d = v2[1];
	retV[0] = (a*c-b*d);
	retV[1] = (a*d+b*c);
}

function Matrix_mul_Complex(retV, m, dim, v){
	for( let j = 0; j < dim; ++j ){ //row
		let rAccum = 0; //row accumulation of real value
		let iAccum = 0; //row accumulation of imaginary value
		for( let i = 0; i < dim; ++i ){ //column

			//dot product of two complex vectors (row of matrix and column vector input)
			//is A dot B = sum( a[i] * complex conjugate(b[i]) )
			//complex conjugate of a + ib being a − ib

			let retV = new Float32Array(2);
			VectComplex_FromArrMult(retV, m, (j*2)*dim+(i*2), [v[i],0] );

			rAccum += retV[0];
			iAccum += retV[1];
		}
		retV[j*2+0] = rAccum;
		retV[j*2+1] = iAccum;
	}
}

let dfftMatSize = 4;
let dfft2M = generateDFFT_Matrix(dfftMatSize);
Matrix_Print_Complex( dfft2M, dfftMatSize, dfftMatSize+"x"+dfftMatSize+" DFFTMat" );
let retV = new Float32Array(dfftMatSize);
let inputV = new Float32Array([0.1,0.4,0.0,0.9]);
Matrix_mul_Complex( retV, dfft2M, dfftMatSize, inputV );
console.log("retV " + retV );

//plot function in opengl
//update texture and uv coordinates to display

//use shaders and render to render buffer to improve speed

//use frequency domain to shift pitch / distort / tweak effects


//each coefficent has periodicity
//only need to generate time domain once and then duplicate to larger array size
//power of two upscaling
//for length, fill all frequencies below that size that repeat

function InverseFourierTransform(timeSamples, coefs, n){
	//real and imaginary coefficents

	//find non zero coefs for each timeIntensity sample
	let coef = Math.sin( Math.PI * coefIdx / nCoefs );

	for(let i = 0; i < n; ++i){
		timeSamples[i] = coefs
	}
}
