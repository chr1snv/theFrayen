//# sourceURL=Structures/BoundsObjects.js
//World bounds object

function BoundsObj(min, max){
	this.AABB = new AABB(min, max);
	this.physObj = new PhysObj(this.AABB, this);
	this.physObj.mass = Number.POSITIVE_INFINITY;
}


function CreateBoundsObjs( min, max, thickness ){
	let boundMin = Vect3_NewZero();
	let boundMax = Vect3_NewZero();

	let boundsObjs = [];

	//create the 6 bounding objects
	for( let ax = 0; ax < 3; ++ax ){ //axis
		for(let minMax = 0; minMax < 2; ++minMax){ //min or max side for axis pair
			let sCoord = minMax * (max[ax]-min[ax]) + min[ax];
			let sMin = sCoord - thickness; //min side (bottom, left, front)
			let sMax = sCoord;
			if( minMax > 0 ){ //max side (top, right, back)
				sMin = sCoord;
				sMax = sCoord + thickness;
			}
			boundMin[ax] = sMin;
			boundMin[(ax+1)%3] = min[(ax+1)%3];
			boundMin[(ax+2)%3] = min[(ax+2)%3];
			boundMax[ax] = sMax;
			boundMax[(ax+1)%3] = max[(ax+1)%3];
			boundMax[(ax+2)%3] = max[(ax+2)%3];
			console.log("create new bounds obj " + boundMin + " " + boundMax );
			
			boundsObjs.push( new BoundsObj(boundMin, boundMax) );
		}
	}
	
	console.log("returning bounds objs");
	return boundsObjs;
}
