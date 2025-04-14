//why favor merge sort instead of quicksort?
//merge sort can be parallelized until the last merge level
//and its memory access patterns are predictable (linear chunks vs random/data dependant)
function MergeSort( arr, tempArr, cmpFunc ){  
	//takes in power of two size arrays
	//returns true if the sorted return is in tempArr instead of arr
	//	depends on number of merge levels


	//merge sort the array -         e.x.(4132)
	//start merging lists of length 1 (i.e. aItr=0 bItr=1)
	//dstArr[dItr] is the destination of the merge (merging in place)
	//a temp variable is used while arr[bItr] is replacing arr[aItr] values
	//if cmpFunc( arr[aItr] arr[bItr] ) < 0
	//
	//e.x. start with first and last pair     (14 23)
	//then increase iter spacing by 2x        (12 43)->(1234)
	//(13 93 81 28)
	//(13 39 18 28)
	
	let mergeLevels = Math.ceil(Math.log2(arr.length));
	let srcArr = tempArr;
	let dstArr = arr; //reverse because swap at start of level loop (to avoid if(l==0) )
	let lvlLstLen = 0;
	let dItr = 0;
	let aItr = 0;
	let bItr = 0;
	let maxAItr = 0;
	let maxBItr = 0;
	for( let l = 0; l < mergeLevels; ++l ){ //each power of 2 level
		
		//swap the source and destination arrays (clean vs dirty) for next level
		tempArr = srcArr;
		srcArr = dstArr;
		dstArr = tempArr;
		
		lvlLstLen = Math.pow(2,l);
		
		for( let i = 0; i < arr.length; i+=lvlLstLen*2 ){ //per list pair
			dItr = i;
			aItr = i;
			bItr = i+lvlLstLen;
			maxAItr = i+lvlLstLen;
			maxBItr = i+(lvlLstLen*2);
			while( dItr < maxBItr ){ //zipper merge elms from src lists
				if( (aItr >= maxAItr) ||
					(bItr < maxBItr && cmpFunc( srcArr[aItr], srcArr[bItr] ) <= 0) ){
					//b value is less than a
					dstArr[dItr] = srcArr[bItr++];
				}else{
					dstArr[dItr] = srcArr[aItr++];
				}
				++dItr;
			
			}
			
		}
		
	}
	
	//signify if arr and temp array should be swapped on return
	if( dstArr != arr )
		return true;
	return false;
	
}
