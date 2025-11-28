//# sourceURL=Structures/SpectralImage.js
//for use or code/art requests please contact chris@itemfactorystudio.com

//idea for denoising the sparse number of samples that can be obtained when
//compute time is limited in realtime raytracing

//an image composed of spectral components
//when rendering or sampling given an estimate of how many sample points will be
//avaliable to render the frame, returns a list of where next to sample that
//will cause the greatest waveform energy change in the image
//in practice though sampling so that cache coherance is maintained 
//(grouping the computation of similar rays) may need to be weighted
//against minimal selection of rays

//because the complexity is number of x weights * y weights * height * width
//need to consider using a heirarachy maybe only use 5 weights per level

//also converts it's spectral representation to a bitmap image given requested
//width and height
function SpectralImage(){

  //https://www.slideserve.com/MartaAdara/data-compression-2
  //most examples seem to have f(x,y) = coef(u,v) * cos((2x+1)/n * u * pi) * cos((2y+1)/n * v * pi)
  //think the 2 is from 2pi and /n is to map the x and y's into 0-1 so the cosine is computed from 0 - u or 0 - v

  //0th order is sum of all the pixel values
  //1st order is sum of samples convolved (weighted multipy) by the 1 hz x and y cosine wave

  //invert the cosine transform 
  this.getBitmap = function(width, height){
  
    var pixels = new Int32Array[width*height];
    pixels.fill(0);
    
    for(w = 0; w < width; ++w){
      var xt = w/width * 2 * Math.PI;
      for(h = 0; h < height; ++h){
        var yt = h/height * 2 * Math.PI;
        
        //for each pixel
        for(xW = 0; xW < xWeights.length; ++xW){
          for(yW = 0; yW < yWeights.length; ++yW){
            //for each weight accumulate coefficent contributions
            pixels[w + h * width] +=
            ( xWeights[xW] * Math.cos(xt * (xW) ) ) * 
            ( xWeights[yW] * Math.cos(yt * (yW) ) );
          }
        }
        
      }
    }
  }
  
  this.samples = [];
  
  this.coefficents = [];
  
  //given sample points compute the discrete cosine transform
  this.computeCoefficents = function(xCoefs, yCoefs){
    for(xW = 0; xW < xWeights.length; ++xW){
      for(yW = 0; yW < yWeights.length; ++yW){
      
      }
    }
  }
  
  
}
