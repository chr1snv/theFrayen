
//math functions for physically simulated objects

//1/2mv^2 the momentum or energy from the linear motion of the object
function kineticEnergy( v, m ){
	return 0.5 * m * Vect3_LengthSquared( v );
}

function kineticEnergyToVelocity( ke, keMag, m ){
	if( keMag == 0 ){
		Vect3_Zero(ke);
	}else{
		let linVelMag = Math.sqrt( keMag );
		Vect3_MultiplyScalar( ke, (linVelMag / keMag ) / m );
	}
}

//momentum vector of object from it's linear velocity and mass
function KineticEnergyVector(kinEnVec, v,m){ 
	Vect3_Copy( kinEnVec, v );
	if( m == Number.POSITIVE_INFINITY )
		return;
	let kinEnVecMagnitude = kineticEnergy( kinEnVec, m );
	Vect3_Normal( kinEnVec );
	Vect3_MultiplyScalar( kinEnVec, kinEnVecMagnitude );
}

//for constructing info about the combined energy of objects transfering energy during a timestep
function AddAggregateKineticEnergyAndMass( aggObj, objKE, objM ){
	if( objM == Number.POSITIVE_INFINITY ){ //new object is a simulation bounds object
		if( aggObj.mass != Number.POSITIVE_INFINITY){ //aggregate is not a bounds object
			Vect3_Copy( aggObj.linearMomentum, objKE ); //theirfore new bounds object velocity overwrites
			aggObj.mass = objM;
			return;
		}else{ //both are "infinite mass" simulation bounds objects
				//velocity of both should be the same, or it should be an error or they should be averaged
				if( objKE[0] != aggObj.linearMomentum[0] ||
					objKE[1] != aggObj.linearMomentum[1] ||
					objKE[2] != aggObj.linearMomentum[2] ){
						console.log("sum of inertia energy error, differing energy of inifite mass objects");
					}
		}
	}else if( aggObj.mass == Number.POSITIVE_INFINITY ){
		return; //existing object is infite mass, takes precident over non infinte mass new object
	}
	Vect3_Add( aggObj.linearMomentum, objKE ); //else both are normal objects, add the new kinetic energy
	aggObj.mass += objM;
	Vect3_Copy( aggObj.linVel, aggObj.linearMomentum);
	if( aggObj.mass != Number.POSITIVE_INFINITY)
		Vect3_MultiplyScalar( aggObj.linVel, 1/aggObj.mass );
}

//given a cluster of objects including this object subtract this object's energy
//from the cluster to get the energy of only the cluster
function SubtractEnergy( combKinEnVecMinusObj, aggObj, objKinEnVec ){
	Vect3_Copy(combKinEnVecMinusObj, aggObj.linearMomentum);
	if( aggObj.mass == Number.POSITIVE_INFINITY )
		return;
	//else not infinite mass, the object has a contribution percentage based on it's velocity and mass to the combined kinetic energy
	Vect3_Subtract( combKinEnVecMinusObj, objKinEnVec );
}
