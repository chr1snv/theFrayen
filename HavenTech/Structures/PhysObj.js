//# sourceURL=Structures/PhysObj.js
const RESTING_VEL = 0.1;

function PhysObj(AABB, obj, time){
	this.uid = NewUID();

	this.obj = obj; //the parent object added to the oct tree

	this.AABB = AABB; //alias to parent's aabb for position

	this.physStatus = 0; //0-kinematic, 1-static contact with other object, 2-fixed (immutable object)

	//physics simulation state and constants
	this.lastDetectTime = time;
	this.lastAggColisTime = time;
	this.lastTransEnergTime = time;
	this.lastDetectStaticTime = time;
	this.lastUpdtTime = time;

	this.interpenOffsetApplied = false;

	this.linAccel = Vect3_NewZero();
	this.linVel = Vect3_NewZero(); //meters/sec
	this.rotVelQuat = Quat_New_Identity( ); //x,y,z axis, radian rotation / sec
	this.mass = 1; //kg

	this.linearMomentum = Vect3_NewZero();

	this.specificHeatCapac = 4.2; // kj/k/degK (liquid water)
	this.degC = 21; //"room temperature is considered to be between 20 to 25 degrees celcius
	//https://scienceinsights.org/what-is-standard-temperature-and-pressure-stp/
	//"The most common application of STP is in the field of chemistry, specifically in stoichiometry problems involving gases. By knowing the standard conditions, chemists can utilize the molar volume concept, which states that one mole of any ideal gas occupies a specific, fixed volume at STP. At the modern IUPAC standard (0 °C and 100 kPa), this molar volume is calculated to be 22.7 liters."

	//collision
	this.colisCOR = 0.8;
	//0-1  ratio of the relative velocity of separation after collision
	//to the relative velocity of approach before collision
	//can also be defined as the square root of the ratio of the 
	//final kinetic energy to the initial kinetic energy
	//it is assumed to be between identical spheres

	//friction
	this.dryCOF = 0.3; //gives static friction limit from normal force before kinetic friction begins
	this.kinCOF = 0.1; //Energy is transformed from other forms into thermal energy

	//MPa mega pascals force at which elastic deformation ends and plastic deformation begins
	this.yeildPoint = 10; 

	//if an object is resting it requires no position update unless
	//it becomes part of anothers constraintGraph or treeNode forces change
	this.resting = false;

	//if an object is inside another, it should be continuously moved towards the
	//surface
	this.penVec = Vect3_NewZero();
	this.penObj = undefined;

	//objects in contact / affecting this object and type of effect 
	//(0-kinetic/static colision, 1-spring/rope, 2-electrostatic, 3-magnetic, 4-radiative)
	this.persistantPhysGraph = undefined;
	this.framePhysGraph = undefined; 
	this.radius = (AABB.maxCoord[0] - AABB.minCoord[0])*0.5; //spherical radius of the colider
	this.capsule = new Capsule(this.radius, this.linVel, this.obj.origin); //sphere swept over time collision time calculator

}


	//an object may collide with multiple objects in a time step.
	//when objects are densly packed approximations have to be made because
	//there may be infinitely many collisions before the end of the timestep
	//to handle this, check each object in the octTreeNodes (the object is a part of) for a collision time
	//if collision times are found, the total energy in and resulting energy of position and velocitiy changes
	//after must be equal or lesser (entropy must increase, and localized energy gradients (/per object decrease)


function PHYSOBJ_GenColisRestitutionVects(pObj, stepTime, intTime, otherObj, colisPosVect, colisVelVect){
	let intDt = pObj.lastUpdtTime; //time in seconds to advance object positions to
	let afterIntDt = stepTime - intTime;
	let restDir = Vect3_CopyNew( pObj.obj.origin );
	Vect3_Subtract( restDir, otherObj.obj.origin  ); //vector from other obj center to this center
	//let restDir = Vect3_CopyNew( otherObj.linVel );
	//Vect3_MultiplyScalar(restDir, -1);
	//Vect3_Subtract( restDir, pObj.linVel );
	//Vect3_Normal( restDir );
	//find the surfaces of both objects that intersect with the vector 
	//between the cg of the objects (aabb midpoint for now)
	//for a more detailed collision algorithm it would need to check all of 
	//the object verticies to find if they are inside
	//of the other object which could be sped up by using the object oct tree 
	//to cast rays opposite to the relative motion of the two objects
	//from the verticies of each object

	let ray = new Ray(pObj.obj.origin , restDir);
	let otherObjPenPoint = new Float32Array(3);
	let aabbintTime = AABB_RayIntersects(otherObj.AABB, ray, 0 );
	RayPointAtTime( otherObjPenPoint, ray.origin, ray.norm, aabbIntTime );
	let thisEntPoint = new Float32Array(3);
	aabbIntTime = AABB_RayIntersects(pObj.AABB, ray, 0 );
	RayPointAtTime( thisEntPoint, ray.origin, ray.norm, aabbIntTime );

	Vect3_Copy( colisVect, thisEntPoint );
	Vect3_Subtract( colisVect, otherObjPenPoint );
	let intAmt = Vect3_Length(colisVect);
	Vect3_Normal( colisVect );
	let restAmt = pObj.colisCoef * intAmt;
	Vect3_MultiplyScalar( colisVect, restAmt );
}

//if the object collides with a bound then the group/combined kinetic energy 
//is set to 0 with inifinte mass (subtracting individual object energy doesn't change it)
function PHYSOBJ_DetectBoundsCollisions( pObj, dt, worldRootTnd, statColisCheck=false ){ //dt is length of physics step
	let numColis = 0;
	let worldBoundsAABB = worldRootTnd.AABB;
	let secsTillHitWorldBounds = pObj.capsule.ExitAABBTime(pObj.obj.origin, 
				pObj.linVel, pObj.radius, worldBoundsAABB);
	if( secsTillHitWorldBounds < Number.POSITIVE_INFINITY && secsTillHitWorldBounds < dt ){
		let timeOfWorldBoundCollision = secsTillHitWorldBounds + pObj.lastUpdtTime;
		let boundAxis = pObj.capsule.intAxis;
		let boundObj = worldRootTnd.boundsObjs[pObj.capsule.intAxis * 2 + pObj.capsule.intSide];

		//get the inner side of the bound obj for the bound coord
		let boundCoord = boundObj.AABB.maxCoord[boundAxis];
		if( pObj.capsule.intSide )
			boundCoord = boundObj.AABB.minCoord[boundAxis];

		let colisNormal = Vect3_NewZero();
		colisNormal[ pObj.capsule.intAxis ] = (pObj.capsule.intSide * -2) + 1; //1 or -1 on the world bound axis
		let colisPoint = Vect3_NewZero();
		pObj.capsule.BoundsColisPosGivenNormalAndTime( colisPoint, pObj.obj.origin, 
				pObj.linVel, pObj.radius, colisNormal, secsTillHitWorldBounds );
		//check the colision pos vs the surface to get penetration depth
		let interpenD = 0;
		let colisType = PHYS_SURFCOLIS;
		if( secsTillHitWorldBounds < 0 ){
			interpenD = -pObj.capsule.penD;
			colisType = PHYS_INTERPEN;
			timeOfWorldBoundCollision = pObj.lastUpdtTime;
		}


		let cnstOb1 = pObj;
		let cnstOb2 = boundObj.physObj;
		PHYSGRPH_AddConstraint( pObj.framePhysGraph, 
			{type:colisType, time:timeOfWorldBoundCollision, 
			 normal:colisNormal, pos:colisPoint, intrD:interpenD, ob1:cnstOb1, ob2:cnstOb2,
			 cnstrId: PHYGRPH_GenConstraintID( colisType, cnstOb1.uid.val, cnstOb2.uid.val )
			}
		);
		numColis += 1;
	}
	return numColis;
}

//checks tree nodes object occupied by pObj for other objects it may intersect with within the timestep
function PHYSOBJ_DetectColidingObjsAndTimes( pObj, dt, statColisCheck=false ){
	let numColis = 0;
	let checkedObjs = {};
	checkedObjs[pObj.uid.val] = 1;
	let treeNodes = pObj.obj.treeNodes;
	//check if coliding with any objects
	let totRestVect = Vect3_NewZero();
	for( let ndKey in treeNodes ){ //check all possibly adjacent objs (treeNodes is a dict)
		let tN = treeNodes[ndKey];
		let tNObjs = tN.objects[0];
		let colisVect = Vect3_NewZero();
		for( let i = 0; i < tNObjs.length; ++i ){
			let oOb = tNObjs[i].physObj;
			if( !checkedObjs[oOb.uid.val] ){
				checkedObjs[oOb.uid.val] = 1;
				let intTime = pObj.capsule.CapIntrTime( pObj.obj.origin, 
					pObj.linVel, pObj.radius, oOb.obj.origin, oOb.linVel, oOb.radius );
				if( !isNaN(intTime) ){
					if( intTime <= dt ){
						if( intTime >= 0 ){ //not NaN and occurs within this timestep
							let colisNormal = Vect3_NewZero();
							let colisPos = Vect3_NewZero();
							let interpenD = pObj.capsule.OthrCapCollisNormalPosDepth( 
								colisNormal, colisPos,
								pObj.obj.origin, pObj.linVel, pObj.radius, 
								oOb.obj.origin, oOb.linVel, oOb.radius, intTime );
							let timeOfColis = intTime + pObj.lastUpdtTime;
							pObj.framePhysGraph.AddConstraint( PHYS_SURFCOLIS, timeOfColis,
								colisNormal, colisPos, interpenD, pObj, oOb );
							//DTPrintf( "add " + pObj.uid.val + " " + oOb.uid.val, "phys detc" );
							numColis += 1;
						}else{// inter penetration (negative colision time)
							//DTPrintf( "time " + intTime, "phys detc" );
							let colisNormal = Vect3_NewZero();
							let colisPos = Vect3_NewZero();
							let interpenD = 0;
							interpenD = pObj.capsule.OthrCapCollisNormalPosDepth( colisNormal, colisPos,
								pObj.obj.origin, pObj.linVel, pObj.radius, 
								oOb.obj.origin, oOb.linVel, oOb.radius, 0 ); //zero to get interpentation at start of frame
							PHYSGRPH_AddConstraint( pObj.framePhysGraph, PHYS_INTERPEN, [pObj.lastUpdtTime, 
								colisNormal, colisPos, interpenD], pObj, oOb );
							//DTPrintf( "add " + pObj.uid.val + " " + oOb.uid.val, "phys detc" );
							numColis += 1;
						}
					}
				}
			}
		}
	}
	return numColis;
}

//applies affects such as gravity, fluid/air drag to the acceleration * dt -> velocity
function PHYSOBJ_ApplyFieldAffectsAndDetectCollisions( pObj, time, tnd ){
	if( time == pObj.lastDetectTime )
		return;

	let dt = time - pObj.lastUpdtTime;

	//DTPrintf("externAccel linvel " + pObj.linVel + " uid " + pObj.uid.val, "linvel");

	let numCollisions = 0;

	if( tnd.physNode )
		Vect3_Copy( pObj.linAccel, tnd.physNode.gravAccelVec );

	if( !pObj.resting ){
		//a = 1/2v^2 (accel is dv/dt)
		//f = ma   f=(d/dt)mv
		//find and apply the change in velocity
		let accel = Vect3_CopyNew( pObj.linAccel );
		Vect3_MultiplyScalar( accel, dt );
		Vect3_Add( pObj.linVel, accel );
		KineticEnergyVector( pObj.linearMomentum, pObj.linVel, pObj.mass );
		if( isNaN(Vect3_Length(pObj.linearMomentum)) )
				DTPrintf("detect nan externAccel add", "phys detc" );


		//find any object collisions using linear object position extrapolation from lastUpdtTime to time
		pObj.framePhysGraph = new PhysConstraintGraph(pObj.AABB.minCoord, 
			pObj.AABB.maxCoord, pObj); //clear previous list;

		numCollisions += PHYSOBJ_DetectColidingObjsAndTimes( pObj, dt );


		numCollisions += PHYSOBJ_DetectBoundsCollisions( pObj, dt, tnd.root); //check if coliding with ground ( y = 0 or canv.height)


		if( numCollisions >= 1 ){
			//DTPrintf( "detect " + numCollisions + " uid " + pObj.uid.val, "detc additional" );
			//subtract the linear velocity (because it was integrated 
			//over the entire timestep, though the colision occured before then)
			Vect3_Subtract( pObj.linVel, accel );
			KineticEnergyVector( pObj.linearMomentum, pObj.linVel, pObj.mass );
			if( isNaN(Vect3_Length(pObj.linearMomentum)) )
						DTPrintf("detect nan remKinEn", "phys detc" );
		}

		//now have a list of object collisions and times
		//sort them by time (needed for finding time of first colision)
		PHYSGRPH_SortByTime( pObj.framePhysGraph );
	}

	//may need to store node updated from so can check where updated from

	pObj.lastDetectTime = time; //remember to prevent being called twice from different tree nodes

	pObj.interpenOffsetApplied = false;

	return numCollisions;
}

function PHYSOBJ_LinkPhysGraphs( pObj, time ){
	if( time == pObj.lastAggColisTime )
		return;

	//check if any object in the colision group have a colisGroup/constraintGraph with different obj uids (sum of obj uids could be an optimization)
	if( !pObj.resting && pObj.framePhysGraph )
		PHYSGRPH_ConsolidateGraphs( pObj.framePhysGraph, pObj.persistantPhysGraph );


	pObj.lastAggColisTime = time;
}

function PHYSOBJ_ApplyInterpenOffset( pObj, time ){
	if( !pObj.resting && pObj.framePhysGraph && !pObj.interpenOffsetApplied ){
		//DTPrintf("interpen linvel " + pObj.linVel + " uid " + pObj.uid.val, "linvel");
		PHYSGRPH_ApplyInterpenOffset( pObj.framePhysGraph, pObj );
		pObj.interpenOffsetApplied = true;
	}
}


//the timestep update function, it is called transfer energy because
//it needs to follow energy conservation to avoid an unstable simulation
//e.g. the timestep update is a discretization, if the discretized calculation/approximation
//puts more energy into the momentum / velocity of an object then it started with
//multiple collisions / spring force updates will cause unrealistic behavior
//(so for stability it's usally better to tune towards dampning, though it's not completely realistic)
let aDiffLinEnVec = Vect3_NewZero();
let aDiffLinVel = Vect3_NewZero();
function PHYSOBJ_TransferEnergyViaConstraints( pObj, time, treeNode ){
	if( time == pObj.lastTransEnergTime )
		return;
	//DTPrintf("transEnergy linvel " + pObj.linVel + " uid " + pObj.uid.val, "linvel");
	if( !pObj.resting ){
		//dt is the timestep for integrating forces into and accelerations into position changes
		let dt = time - pObj.lastUpdtTime; //time from end of last frame until end of this update interval frame
		let constrGraph = pObj.framePhysGraph;
		if( constrGraph ){

			if( constrGraph.constrPairs[pObj.uid.val] ){

				//time from last end of frame until first constraint this frame (time when velocity is changed)
				let timeSortedConstrPairs = constrGraph.constrPairs[pObj.uid.val]['timeSorted'];
				if( timeSortedConstrPairs.length >= 1 ){

					let constrPair = timeSortedConstrPairs[0];

					dt = constrPair.time - pObj.lastUpdtTime;

					let constrObj = GetOtherConstrObj(constrPair, pObj);

					if( constrPair.type == PHYS_INTERPEN ){
						//set all object velocities in group to move out of the interpenetrating object
						//colisNormal
					}else if( constrPair.type == PHYS_SURFCOLIS ){
					
						let constrNormal = Vect3_CopyNew( constrPair.normal );
						//given the ratio of kinetic energy (velocity and mass) of  pObj vs combined objects
						//(and the restitution coef of both?) find the transfered amount of energy
						//ex. two objs with r=1 m=1 vel=[1,0,0] cr1=0.8 vel2=[-1,0,0] cr2=0.8
						//surface area of a sphere = 4   pi r^2
						//volume of a sphere       = 4/3 pi r^3
						//avgObj m=2 r=1.259 v=[0,0,0]

						//rotat velocity, heat, composition (conductance), sum of mass and center of inertia
						let diffObjMomentum = Vect3_NewZero();
						PHYSGRPH_GetAggWithoutObjMomentum( constrGraph, diffObjMomentum, pObj.linearMomentum );
						let diffPrior = Vect3_CopyNew( diffObjMomentum );
						Vect3_Subtract( diffObjMomentum, pObj.linearMomentum ); //inverted agg -> pObj for reflection below
						let diffMomentumMagnitude = Vect3_Length( diffObjMomentum );
						let combinedCOR = constrObj.colisCOR * pObj.colisCOR;
						let magnitudeOfMomentumCvtToHeat = diffMomentumMagnitude * (1- combinedCOR);

						//reflect the difference in momentum vector across the normal
						let momentLenNormProjLen = Vect3_Dot( constrNormal, diffObjMomentum );
						Vect3_MultiplyScalar( constrNormal, momentLenNormProjLen ); //scale the colision plane normal to the height of the momentum vector
						let colisMomntHalfTang = Vect3_CopyNew( constrNormal );
						Vect3_Subtract( colisMomntHalfTang, diffObjMomentum ); //get 1/2 len vector from end of momentum vector to its reflection
						let reflectedLinVel = Vect3_CopyNew( constrNormal );
						Vect3_Add( reflectedLinVel, colisMomntHalfTang ); //add the appropriate length tangent to get reflection
						let lenDiffPrior =  Vect3_Length( diffPrior );
						let lenDiffMom = Vect3_Length( diffObjMomentum );

						/*
						console.log("colGph "    + colisGraph.uid.val    + " obj " + pObj.uid.val          + 
									" colObj "   + colisObj.uid.val      + " ob1 " + colisPair.ob1.uid.val + 
									" type "     + colisPair.type +
									" ob2 "      + colisPair.ob2.uid.val + 
									" aggMom "   + Vect3_Length( colisGraph.aggregateObject.linearMomentum ).toPrecision(5) +
									" aggM "     + colisGraph.aggregateObject.mass +
									" diffMomP " + lenDiffPrior.toPrecision(5) +
									" difMom "   + lenDiffMom.toPrecision(5)     +
									" prevMom "  + Vect3_Length( pObj.linearMomentum ).toPrecision(5) + 
									" reflMom "  + Vect3_Length( reflectedLinVel ).toPrecision(5) );
						*/


						if( isNaN(lenDiffMom) )
							console.log("nan difMom");

						kineticEnergyToVelocity( reflectedLinVel, diffMomentumMagnitude * combinedCOR, pObj.mass );
						Vect3_MultiplyScalar( reflectedLinVel, 0.5 ); //assuming equal and opposite reaction divides momentum between two objs

						pObj.linVel = reflectedLinVel;

						KineticEnergyVector( pObj.linearMomentum, pObj.linVel, pObj.mass ); //recalculate whenever linear velocity is updated
						if( isNaN(Vect3_Length(pObj.linearMomentum)) )
							console.log("nan linmomentum transfer energy");

						Quat_Identity(pObj.rotVelQuat); //x,y,z axis, radian rotation / sec

						//dt = time - pObj.constraintGraph.colisGroupTimesAndObjs[0].time; //for external accel use time from collision vel update to end of frame

					}else if( constrPair.type == PHYS_SPRING ){
						
					}

				}
			}
		}
	}

	pObj.lastTransEnergTime = time;
}

	//if after transfering energy the update will cause this object to be in colision again
	//need to add the new object the kinetic collision graph and re evolve from the beginning of the timestep
	///////////then make a static (collision continuing past this update) constraint for the object
function PHYSOBJ_DetectAdditionalCollisions( pObj, time, tnd){
	if( time == pObj.lastDetectStaticTime )
		return;
	//DTPrintf("detcAddit linvel " + pObj.linVel + " uid " + pObj.uid.val, "linvel");
	let numCollisions = 0;

	if( !pObj.resting ){

		let constrGraph = pObj.framePhysGraph;
		if( constrGraph ){
			if( constrGraph.constrPairs[pObj.uid.val] ){
				//time from last end of frame until first interaction this frame (time when velocity is changed)
				let constrPair = pObj.framePhysGraph.constrPairs[pObj.uid.val]['timeSorted'][0];
				let dt = time - constrPair.time;

				//generate list/constraintGraph  of objects collided with
				//check other objects
				//pObj.FindCollisionTimesAndObjs(colisGroupTimesAndObjs);
				//check if coliding with ground ( y = 0 or canv.height)
				//pObj.FindBoundsCollisions(colisGroupTimesAndObjs);
				//if there are still collisions (then group the touching  objects
				//and set their relative velocities to zero)

				let accel = Vect3_CopyNew( pObj.linAccel );
				Vect3_MultiplyScalar( accel, dt );
				Vect3_Add( pObj.linVel, accel );
				KineticEnergyVector( pObj.linearMomentum, pObj.linVel, pObj.mass );
				if( isNaN(Vect3_Length(pObj.linearMomentum)) )
						console.log("nan linMom detect additional");


				numCollisions += PHYSOBJ_DetectColidingObjsAndTimes( pObj, dt, true );

				numCollisions += PHYSOBJ_DetectBoundsCollisions( pObj, dt, tnd.root, true ); //check if coliding with ground ( y = 0 or canv.height)


				if( numCollisions >= 1 ){
					//DTPrintf( "detectAdditional " + numCollisions + " uid " + pObj.uid.val, "detc additional" );
					//subtract the extern accel 
					//(because it was integrated over the entire timestep, 
					//though the colision occured before then)

					Vect3_Subtract( pObj.linVel, accel );
					KineticEnergyVector( pObj.linearMomentum, pObj.linVel, pObj.mass );
					if( isNaN(Vect3_Length(pObj.linearMomentum)) )
						console.log("nan linMom detect additional remove accel");
				}


				//now have a list of object collisions and times
				//sort them by time (needed for finding time of first colision)
				PHYSGRPH_SortByTime( pObj.framePhysGraph );
			}
		}

	}

	pObj.lastDetectStaticTime = time;

	return numCollisions;
}

	//axis angle rotational velocity  inertia determined by mass distribution, around center of gravity
	//x,y,z linear velocity  inertia from mass
	//coefficent of restitution affects acceleration and heat/sound generation from impact
function PHYSOBJ_Update( pObj, time, treeNode){
	if(time == pObj.lastUpdtTime) //only once per frame (avoid multiple tree node calls)
		return;
	let dt = time - pObj.lastUpdtTime;
	//DTPrintf("updt linvel " + pObj.linVel + " uid " + pObj.uid.val, "linvel" );
	//if linVel is below a threshold and obj is resting dont update position
	if( !pObj.resting ){

		let prevPosition = Vect3_CopyNew(pObj.obj.origin);

		//check if should enter rest mode
		if( Vect3_Length( pObj.linVel ) < RESTING_VEL && 
			pObj.framePhysGraph && pObj.framePhysGraph.constrPairs[pObj.uid.val] ){ //must be touching something (or possibly have low enough speed and no external accel [which wouldn't happen because there would always be some gravity or light/radiative pressure]) to stop updating
			//if there is a contact normal that is opposing the externAccel (gravity) for this frame
			//(and the objs velocity / total forces have been low enough so it hasn't moved for a few frames)
			//then the object can be in rest mode (to avoid reduce checks/calculations by the physics simulator per frame)
			let normGravAccel = Vect3_CopyNew( treeNode.physNode.gravAccelVec ); //pObj.linAccel );
			Vect3_Normal( normGravAccel );
			let constrsForPObj = pObj.framePhysGraph.constrPairs[pObj.uid.val];
			let constrsForPObjOthrObjIds = Object.keys( constrsForPObj );
			for( let i = 0; i < constrsForPObjOthrObjIds.length; ++i ){
				if( constrsForPObjOthrObjIds[i] == 'timeSorted' )
					continue;
				////physG.constrPairs[ob1UidVal] = obConstrs = { 'timeSorted':[constrPair], ob2UidVal:{constrPair.cnstrId:constrPair}};
				let constrsWithOtherObj = constrsForPObj[ constrsForPObjOthrObjIds[i] ];
				let constrIdsWithOtherObj = Object.keys( constrsWithOtherObj );
				for( let j = 0; j < constrIdsWithOtherObj.length; ++j ){
					let constr = constrsWithOtherObj[constrIdsWithOtherObj[j]];
					if( constr.type == PHYS_INTERPEN || constr.type == PHYS_SPRING) //resolve interpenetration before suspending updates for object
						continue;
					let constrNormDot = Vect3_Dot( constr.normal, normGravAccel );
					if( constrNormDot < -0.8 ){
						pObj.resting = true;
						break;
					}
				}
			}
		}else{ //not resting, preform position update

			//update the position
			let delP = Vect3_CopyNew(pObj.linVel);
			Vect3_MultiplyScalar( delP, dt );
			Vect3_Add(pObj.obj.origin, delP);
			//AABB_OffsetPos(pObj.AABB, delP);

			//console.log( 
			//	" linVel " + Vect_ToFixedPrecisionString( pObj.linVel, 5 ) + 
			//	" center " + Vect_ToFixedPrecisionString( pObj.obj.origin, 5 ) );

		}


		//check all subNodes added to if it has moved outside of their bounds
		//do this also when transitioning to resting because position may have been updated by apply interpen offset
		let ReAddToOctTree = false;
		let totOvlapPct = 0;
		let nodesToRemoveFrom = {};
		for( let nd in pObj.obj.treeNodes ){
			let ndOvLapPct = AABB_OthrObjOverlap(
						pObj.obj.treeNodes[nd].AABB.minCoord,
						pObj.obj.treeNodes[nd].AABB.maxCoord,
						pObj.AABB.minCoord,
						pObj.AABB.maxCoord );
			totOvlapPct += ndOvLapPct;
			if( ndOvLapPct < 0.01 ){
				//remove from the node the obj has moved out of
				nodesToRemoveFrom[nd] = ndOvLapPct;
			}
		}

		if( nodesToRemoveFrom.length > 0 ){
			//moved into a new subnode or out of bounds
			//need to check it's possible to move into the new subnode before
			//changing the position and removing from the old nodes
		}
		
		//some part of the obj is now in a new node, need to add to that one
		let addSuccess = true;
		if(totOvlapPct < 0.99){
			let nLvsMDpth = [0, 0];
			subDivAddDepth = 0;
			TND_AddObject( treeNode.root, nLvsMDpth, pObj.obj );
			if( nLvsMDpth[0] < 0 ){
				//failed to add to the new node
				addSuccess = false;
			}
		}

		if( addSuccess ){
			for( nd in nodesToRemoveFrom ){
				let tNd = pObj.obj.treeNodes[nd];
				if( tNd != undefined ){
					TND_RemoveFromThisNode(tNd, pObj.obj); //node may unsubdivide during remove
					delete(pObj.obj.treeNodes[nd]);
				}
			}
		}else{
			if( nodesToRemoveFrom.length > 0 ){
				//revert to previous position (and collide with the node boundry or set zero velocity)
				AABB_MoveCenter(pObj.AABB, prevPosition);
				Vect3_SetScalar(pObj.linVel, 0);
			}
		}

	}

	pObj.lastUpdtTime = time;
}

const earthGravityAccel = new Float32Array([0,0, -9.8]);

const PHYS_FILL_VACCUM	= 0;
const PHYS_FILL_AIR		= 1;
const PHYS_FILL_WATER	= 2;
const PHYS_FILL_SOLID	= 3;

//field physics simulation (as opposed to particles connected by constraint graph)
//definition/data of affects on objects that are within a region of space / treeNode
//idea of doing multiple types of physics simulation in a game inspired by prior games i.e.
//quantum conundrum, half life, mass effect
//and engineering tools i.e. solidworks, comsol, matlab
function PhysNode(){
	//fill/occupancy type
	//i.e vaccum, air, water, elemental material, etc
	//(for ray energy dissipation / participating media scattering )

	this.gravAccelVec = Vect3_CopyNew( earthGravityAccel );
	this.fillType    = PHYS_FILL_AIR;
	this.relHumidity = 0.5; //for heat conduction, condensate precipiation etc
	this.pH = 7; //also indicates oxygen/oxidizer percentage
	this.degC = 27; //affects rigidity/expansion of objects and can cause them to solidify/melt/react with fill type
	//https://www.omnicalculator.com/physics/air-density
	this.densityKgM3 = 1.168; //affects bouyancy of objects
	this.psi = 14.7; //affects forces on membranes, flow through pipes, piston movement etc
	//this.dewPoint
	this.fluidFlowVec = Vect3_NewZero(); //psi is the w component
	//it's not practical to simulate atoms / sub atom scale physics so everything is an approximation of types of affects 
	this.electricVec  = Vect_NewZero(4); //xyz flux magitude and w divergence (in or out magnitude in all axies)
	//diffrent frequency scales of electro magnetic energy
	this.gammaRayVec  = Vect_NewZero(4); //breaks chemical bonds without changing material phase, can reveal diffaction patterns, gets absorbed / scattered by objects
	this.lightRayVec  = Vect_NewZero(4); //affects global illuminaton (bounce light) and can be absorbed by photovoltaics
	this.radioFluxVec = Vect_NewZero(4); //can be absorbed / converted into heat by objects
	this.magneticVec  = Vect_NewZero(4); //affects iorn and conductive objects
	this.dustOpacity = 0; //amount of light scattering / attenuation by dust in air or turbidity in water
	this.fuelPct = 0; //e.g. voc volativity //ex. when ph (oxygen level is high enough) and temperature or energy vectors are high enough, combustion or explosion occurs

}

function PHYS_ND_CopyNew( physNd ){
	let ret = new PhysNode();
	Vect3_Copy( ret.gravAccelVec, physNd.gravAccelVec );
	ret.fillType = physNd.fillType;
	ret.relHumidity = physNd.relHumidity;
	ret.degC = physNd.degC;

	ret.densityKgM3 = physNd.densityKgM3;
}
