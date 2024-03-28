//Capsule.js
//to request use or code/art please contact chris@itemfactorystudio.com

//exists to hold working variables for calculation, parameters are passed in
//when called as it changes frame to frame
function Capsule(){
	let sD = Vect3_NewZero();
	let rtot = 0;
	let c = 0;
	let b = 0;
	let a = 0;
	let dD = Vect3_NewZero();
	let s = new Float32Array(2);
	this.CapIntrTime = function( thisS, thisD, thisR, othrS, othrD, othrR ){
		//set y=mx+b line equations equal to eachother
		//and solve for t where the distance between points is the sum of radii
		Vect3_Copy( sD, thisS );
		Vect3_Subtract( sD, othrS ); //start difference
		sDLen = Vect3_Length( sD );
		
		//if there is overlap at the start of the timestep
		//don't attempt to advance the position in time, signal interpentration
		//of the objects (requires moving objects apart which can add free energy and
		//cause the simulation to break)
		if( sDLen < (thisR + othrR) ){
			//console.log( "interpen " + sDLen );
			return -1;
		}
		
		rtot = (thisR + othrR); //radius total
		c = Vect3_LengthSquared( sD ) - (rtot*rtot); // quadratic constant
		Vect3_Copy( dD, thisD );
		Vect3_Subtract( dD, othrD ); //direction difference
		b = 2 * Vect3_Dot( sD, dD ); //quadratic x component
		a = Vect3_Dot( dD, dD ); //quadratic x^2 component
		
		quadraticSolutions(s,  a,b,c);
		if( s[0] != s[0] ) //no solutions
			return NaN;
		let ret = s[0]; //return s[0];
		if( s[1] > 0 && s[1] < s[0] ) //return the lesser greater than zero solution //s[1] < s[0] && -s[0] < -s[1]
			ret = s[1];//return s[1];
		//if( ret < 0 )
		//	console.log( 'ret' + ret + ' : s[0] ' + s[0] + '  s[1] ' + s[1] + '  a ' + a + '  b ' + b + '  c ' + c );
		return ret;
	}
	
	//given the bounds normal and time
	let negColisNorm = Vect3_NewZero();
	this.BoundsColisPosGivenNormalAndTime = function( colisPos, thisS, thisD, thisR, colisNorm, colisTime ){
		//advance the center of the obj to the time of colision
		let thisCenterRay = new Ray( thisS, thisD );
		thisCenterRay.PointAtTime( colisPos, colisTime );
		
		//use the opposite bounds normal to get the surface position of the obj colision
		Vect3_Copy( negColisNorm, colisNorm );
		Vect3_Negative( negColisNorm );
		Vect3_MultiplyScalar( negColisNorm, thisR );
		Vect3_Add( colisPos, negColisNorm );
		
	}
	

	let sp2PtAtTime = Vect3_NewZero();
	this.OthrCapCollisNormalPosDepth = function( colisNorm, colisPos, 
			thisS, thisD, thisR, othrS, othrD, othrR, colisTime ){
		let thisCenterRay = new Ray( thisS, thisD );
		let otherCenterRay = new Ray( othrS, othrD );
		
		thisCenterRay.PointAtTime( colisPos, colisTime );
		otherCenterRay.PointAtTime( sp2PtAtTime, colisTime );
		Vect3_Copy( colisNorm, colisPos );
		Vect3_Subtract( colisNorm, sp2PtAtTime );
		
		let centerDist = Vect3_Length( colisNorm );
		let radiusSum = thisR + othrR;
		let interpenD = Math.max(0, (radiusSum - centerDist) );
		
		if( centerDist != 0 )
			Vect3_MultiplyScalar(colisNorm, 1/centerDist );
		
		return interpenD;
	}
	
	let rAABBShrink = Vect3_NewAllOnes();
	let aabbCnrs = [Vect3_NewZero(), Vect3_NewZero()]; //corners
	let tTmp = 0;
	this.penD = 0;
	let t = 0;
	this.intAxis = -1;
	this.intSide = -1;
	//find the time, axis, side  at which the sphere exits the aabb bounds
	this.ExitAABBTime = function(thisS, thisD, thisR, AABB){
		Vect3_Copy( aabbCnrs[0], AABB.minCoord );
		Vect3_Copy( aabbCnrs[1], AABB.maxCoord );
		//subtract the radius from the AABB min and max
		Vect3_SetScalar( rAABBShrink, 1 );
		Vect3_MultiplyScalar( rAABBShrink, thisR );
		Vect3_Add( aabbCnrs[0], rAABBShrink );
		Vect3_Subtract( aabbCnrs[1], rAABBShrink );
		//for each axis find the time at which it goes > aabbMax or < aabbMin (out of bounds)
		t = Number.POSITIVE_INFINITY;
		for( let i = 0; i < 3; ++i ){ //x y z axies
			for( let m = 0; m < 2; ++m ){ //min or max of axis
				this.penD = ( aabbCnrs[m][i] - thisS[i] ) * (-1+(2*m)); //(wall coord+-radius) - (center of sphere) * -1 if its the min side
				tTmp = (aabbCnrs[m][i] - thisS[i]) / thisD[i];
				if( this.penD < 0 || (tTmp >= 0 && tTmp < t) ){
					this.intAxis = i;
					this.intSide = m;
					if(this.penD < 0){ //if it is outof bounds / penetrating signal it
						t = -1;
						return t;
					}else{
						t = tTmp; //keep searching for smallest time
					}
				}
			}
		}
		return t;
	}
	
	/*
	this.IntersectsCapsule( othr ){
		//find the orthogonal plane to the directions of the cylinders
		//in the 2d planes z they are a constant distance from another in
		//and in it's x,y directions if they intersect the 2d projection of the
		//capsules overlap ( the boundries cross or are inside of eachother)
		let pZ = Vect3_NewZero();
		let pY = Vect3_NewZero();
		let pX = this.d;
		Vect3_Cross(pZ, pX, othr.d); //pZ may not be unit length
		Vect3_Cross(pY, pX, pZ); //pY should? be unit length
		Vect3_Normal(pY);
		//then project the two cylinders onto the plane (as their centerlines and then rectangles)
		let thisD = new Float32Array(3); //vect3's though 2d space so functions can be used
		          thisD[0] = this.d[0];
		Vect3_Dot(thisD[1], pY, this.d);
		let thisS = new Float32Array(3); //plane is defined with thisS as 0,0,0 in plane space
		
		let othrD = new Float32Array(3);
		Vect3_Dot(othrDir[0], intX, othrCap.dir);
		Vect3_Dot(othrDir[1], intY, othrCap.dir);
		let othrSDiff = new Float32Array(3);
		Vect3_Copy( othrSDiff, othr.s );
		Vect3_Subtract( othrSDiff, this.s );
		let otherS = new Float32Array(3);
		Vect3_Dot( othrS[0], othrSDiff, pX);
		Vect3_Dot( othrS[1], othrSDiff, pY);
		Vect3_Dot( othrS[2], othrSDiff, pZ);
		
		if(otherS[2] > this.r + othr.r){
			return -1; //in the axis of constant distance, (orthogonal to the directions of both capsules)
			//the distance between the center of the capsules is greater than the
			//their radii, so it is impossible for them to intersect
		}
		
		
		
		
		//intersect the 2 projected centerlines or find the closest they are to eachother
		//within their start and end
		//if the points are less than r1+r2 in 3 space then the cylinders intersect
		
		
		//sort the directions and y direction less/greater than start positions of the
		//cylinder min and max lines to minimize line intersection tests
		
		//before or after the first cylinder and extends away
		if( othrS[0] > thisD[0] + this.r ){ //other starts beyond the end sphere of this
			if(othrD[0] > 0 ) //other extends away from this
				return undefined;
		}else if( otherS[0] < thisS[0] - this.r ){ //starts before the start sphere of this
			if(othrD[0] < 0 ) //extends away from this
				return undefined;
		}
		//above or below the first cylinder and extends away
		if( othrS[1]-thisS[1] > this.d[1]*(othrS[0]/thisD[0]) ){ //starts above 
		}
		
		//check the 4 lines of the two cylinders if they intersect or are inside eachother
		
		let thisSOffset = new Float32Array(3);
		Vect3_Copy( thisSOffset, pY );
		Vect3_MultiplyScalar( thisS1Offset, this.r );
		let thisS1 = Vect3_CopyNew( thisS );
		Vect3_Add( thisS1, thisSOffset );
		Vect3_MultiplyScalar( thisSOffset, -1 );
		let thisS2 = Vect3_CopyNew( thisS );
		Vect3_Add( thisS2, thisSOffset );
		
		let othrSOffset = new Float32Array(3);
		Vect3_Cross( othrSOffset, othrD, pZ);
		Vect3_Normal( othrSOffset );
		Vect3_MultiplyScalar( othrSOffset, othr.r );
		let othrS1 = Vect3_CopyNew( othrS );
		Vect3_Add( othrS1, othrSOffset );
		Vect3_MultiplyScalar( othrSOffset, -1 );
		let thisS2 = Vect3_CopyNew( othrS );
		Vect3_Add( othrS2, othrSOffset );
		
		//intersection of two lines
		//m1*t1+b1=m2*t2+b2
		let othrT = RayRayIntersection( thisS, thisD, othrS, othrD ); //undefined means they do not intersect
		
		if( othrT != undefined ){
			let othrP = new Float32Array(2);
			othrP[0] = otherD[0];
			othrP[1] = otherD[1];
			Vect3_MultiplyScalar( otherP, othrT );
			Vect3_Add( otherP, otherS ); //the intersection point
			
		}
		
	}
	*/
	
}
