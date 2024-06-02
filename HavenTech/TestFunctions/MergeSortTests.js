
function testMergeSort(){
	let aTemp = null;
	let tempArr = [0,0,0,0,0,0,0,0]
	let a = [4,1,3,2]
	if( MergeSort( a, tempArr, function(a,b){return a<=b;}) ){
		aTemp = a;
		a = tempArr;
		tempArr = aTemp;
	}
	a = [1,3,9,3,8,1,2,8]
	tempArr = [0,0,0,0,0,0,0,0]
	if( MergeSort( a, tempArr, function(a,b){return a<=b;}) ){
		aTemp = a;
		a = tempArr;
		tempArr = aTemp;
	}
}
