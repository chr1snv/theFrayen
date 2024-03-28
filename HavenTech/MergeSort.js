
	//make a temp array
	let tempArr = new Array(objects.length);
	//merge sort the array - writing merged values into tempArr and
	//then back into place
	let mergeLevels = Math.ceil(Math.log2(objects.length));
	for( let l = 0; l < mergeLevels; ++l ){ //each power of 2 level
		let lvlStep = Math.pow(2,l);
		let temp;
		for( let i = 0; i < objects.length; i+=lvlStep*2 ){ //per block pair
			let aItr = 0;
			let bItr = 0;
			let j = 0;
			while( i+j < objects.length && j < lvlStep*2 ){ //merge elms in block pairs
				if( bItr >= lvlStep ){ //if a & b >= lvlStep j will be >= lvlStep
					tempArr[j] = sortedObjs[newAxis][i+aItr]; aItr++;
				}else if( aItr >= lvlStep ){
					tempArr[j] = sortedObjs[newAxis][i+lvlStep+bItr]; bItr++;
				}else if( (i+lvlStep+bItr) >= objects.length ||
					(sortedObjs[newAxis][i+aItr].AABB.minCoord[newAxis] <= 
					sortedObjs[newAxis][i+lvlStep+bItr].AABB.minCoord[newAxis]) ){
					tempArr[j] = sortedObjs[newAxis][i+aItr]; aItr++;
				}else{
					tempArr[j] = sortedObjs[newAxis][i+lvlStep+bItr]; bItr++;
				}
				j++;
			}

			//copy merged blocks back in place
			for( let k = 0; k < j; ++k ){
				sortedObjs[newAxis][i+k] = tempArr[k];
			}

		}
	}
