
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
	this.rotVelQuat = Quat_Identity(); //x,y,z axis, radian rotation / sec
	this.mass = 1; //kg
	
	this.linearMomentum = Vect3_NewZero();
	
	this.specificHeatCapac = 4.2; // kj/k/degK (liquid water)
	this.degC = 50;
	
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
	this.physGraph = undefined; 
	this.radius = (AABB.maxCoord[0] - AABB.minCoord[0])*0.5; //spherical radius of the colider
	this.capsule = new Capsule(this.radius, this.linVel, AABB.center); //sphere collision time calculator
	
	
	//an object may collide with multiple objects in a time step.
	//when objects are densly packed approximations have to be made because
	//there may be infinitely many collisions before the end of the timestep
	//to handle this, check each object in the octTreeNodes (the object is a part of) for a collision time
	//if collision times are found, the total energy in and resulting energy of position and velocitiy changes
	//after must be equal or lesser (entropy must increase, and localized energy gradients (/per object decrease)
	
	
	
	this.GenColisRestitutionVects = function(stepTime, intTime, otherObj, colisPosVect, colisVelVect){
		let intDt = this.lastUpdtTime; //time in seconds to advance object positions to
		let afterIntDt = stepTime - intTime;
		let restDir = Vect3_CopyNew( this.AABB.center );
		Vect3_Subtract( restDir, otherObj.AABB.center ); //vector from other obj center to this center
		//let restDir = Vect3_CopyNew( otherObj.linVel );
		//Vect3_MultiplyScalar(restDir, -1);
		//Vect3_Subtract( restDir, this.linVel );
		//Vect3_Normal( restDir );
		//find the surfaces of both objects that intersect with the vector 
		//between the cg of the objects (aabb midpoint for now)
		//for a more detailed collision algorithm it would need to check all of 
		//the object verticies to find if they are inside
		//of the other object which could be sped up by using the object oct tree 
		//to cast rays opposite to the relative motion of the two objects
		//from the verticies of each object
		
		let ray = new Ray(this.AABB.center, restDir);
		let otherObjPenPoint = new Float32Array(3);
		otherObj.AABB.RayIntersects( otherObjPenPoint, ray, 0 );
		let thisEntPoint = new Float32Array(3);
		this.AABB.RayIntersects( thisEntPoint, ray, 0 );
		
		Vect3_Copy( colisVect, thisEntPoint );
		Vect3_Subtract( colisVect, otherObjPenPoint );
		let intAmt = Vect3_Length(colisVect);
		Vect3_Normal( colisVect );
		let restAmt = this.colisCoef * intAmt;
		Vect3_MultiplyScalar( colisVect, restAmt );
	}
	
	//if the object collides with a bound then the group/combined kinetic energy 
	//is set to 0 with inifinte mass (subtracting individual object energy doesn't change it)
	this.FindBoundsCollisions = function( dt, statColisCheck=false ){ //dt is length of physics step
		let numColis = 0;
		let secsTillHitWorldBounds = this.capsule.ExitAABBTime(this.AABB.center, 
					this.linVel, this.radius, worldBoundsAABB);
		if( secsTillHitWorldBounds < Number.POSITIVE_INFINITY && secsTillHitWorldBounds < dt ){
			let timeOfWorldBoundCollision = secsTillHitWorldBounds + this.lastUpdtTime;
			let boundAxis = this.capsule.intAxis;
			let boundObj = boundsObjs[this.capsule.intAxis * 2 + this.capsule.intSide];
			
			//get the inner side of the bound obj for the bound coord
			let boundCoord = boundObj.AABB.maxCoord[boundAxis];
			if( this.capsule.intSide )
				boundCoord = boundObj.AABB.minCoord[boundAxis];
			
			let colisNormal = Vect3_NewZero();
			colisNormal[ this.capsule.intAxis ] = (this.capsule.intSide * -2) + 1; //1 or -1 on the world bound axis
			let colisPoint = Vect3_NewZero();
			this.capsule.BoundsColisPosGivenNormalAndTime( colisPoint, this.AABB.center, 
					this.linVel, this.radius, colisNormal, secsTillHitWorldBounds );
			//check the colision pos vs the surface to get penetration depth
			let interpenD = 0;
			let colisType = PHYS_SURFCOLIS;
			if( secsTillHitWorldBounds < 0 ){
				interpenD = -this.capsule.penD;
				colisType = PHYS_INTERPEN;
				timeOfWorldBoundCollision = this.lastUpdtTime;
			}
			this.physGraph.AddConstraint( colisType, timeOfWorldBoundCollision, 
						colisNormal, colisPoint, interpenD, this, boundObj.physObj );
			numColis += 1;
		}
		return numColis;
	}
	this.FindColidingObjsAndTimes = function( dt, statColisCheck=false ){
		let numColis = 0;
		let checkedObjs = {};
		checkedObjs[this.uid.val] = 1;
		let treeNodes = this.obj.treeNodes;
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
					let intTime = this.capsule.CapIntrTime( this.AABB.center, 
						this.linVel, this.radius, oOb.AABB.center, oOb.linVel, oOb.radius );
					if( !isNaN(intTime) ){
						if( intTime <= dt ){
							if( intTime >= 0 ){ //not NaN and occurs within this timestep
								let colisNormal = Vect3_NewZero();
								let colisPos = Vect3_NewZero();
								let interpenD = this.capsule.OthrCapCollisNormalPosDepth( 
									colisNormal, colisPos,
									this.AABB.center, this.linVel, this.radius, 
									oOb.AABB.center, oOb.linVel, oOb.radius, intTime );
								let timeOfColis = intTime + this.lastUpdtTime;
								this.physGraph.AddConstraint( PHYS_SURFCOLIS, timeOfColis,
									colisNormal, colisPos, interpenD, this, oOb );
								DTPrintf( "add " + this.uid.val + " " + oOb.uid.val, "phys detc" );
								numColis += 1;
							}else{// inter penetration (negative colision time)
								DTPrintf( "time " + intTime, "phys detc" );
								let colisNormal = Vect3_NewZero();
								let colisPos = Vect3_NewZero();
								let interpenD = 0;
								interpenD = this.capsule.OthrCapCollisNormalPosDepth( colisNormal, colisPos,
									this.AABB.center, this.linVel, this.radius, 
									oOb.AABB.center, oOb.linVel, oOb.radius, 0 ); //zero to get interpentation at start of frame
								this.physGraph.AddConstraint( PHYS_INTERPEN, this.lastUpdtTime, 
									colisNormal, colisPos, interpenD, this, oOb );
								DTPrintf( "add " + this.uid.val + " " + oOb.uid.val, "phys detc" );
								numColis += 1;
							}
						}
					}
				}
			}
		}
		return numColis;
	}
	
	this.ApplyExternAccelAndDetectCollisions = function( time, externAccel ){
		if( time == this.lastDetectTime )
			return;
		
		let dt = time - this.lastUpdtTime;
		
		DTPrintf("externAccel linvel " + this.linVel + " uid " + this.uid.val, "linvel");
		
		let numCollisions = 0;
		
		if( !this.resting ){
			//a = 1/2v^2 (accel is dv/dt)
			//f = ma   f=(d/dt)mv
			//find and apply the change in velocity
			let accel = Vect3_CopyNew( externAccel );
			Vect3_MultiplyScalar( accel, dt );
			Vect3_Add( this.linVel, accel );
			KineticEnergyVector( this.linearMomentum, this.linVel, this.mass );
			if( isNaN(Vect3_Length(this.linearMomentum)) )
					DTPrintf("detect nan externAccel add", "phys detc" );
					
			
			//find any object collisions using linear object position extrapolation from lastUpdtTime to time
			this.physGraph = new PhysConstraintGraph(0, this.AABB.minCoord, 
				this.AABB.maxCoord, this); //clear previous list;
			
			numCollisions += this.FindColidingObjsAndTimes(dt);
			
			numCollisions += this.FindBoundsCollisions(dt); //check if coliding with ground ( y = 0 or canv.height)
			
			
			if( numCollisions >= 1 ){
				DTPrintf( "detect " + numCollisions + " uid " + this.uid.val, "detc additional" );
				//subtract the linear velocity (because it was integrated 
				//over the entire timestep, though the colision occured before then)
				Vect3_Subtract( this.linVel, accel );
				KineticEnergyVector( this.linearMomentum, this.linVel, this.mass );
				if( isNaN(Vect3_Length(this.linearMomentum)) )
							DTPrintf("detect nan remKinEn", "phys detc" );
			}
			
			//now have a list of object collisions and times
			//sort them by time (needed for finding time of first colision)
			this.physGraph.SortByTime();
		}
		
		this.lastDetectTime = time; //remember to prevent being called twice from different tree nodes
		
		this.interpenOffsetApplied = false;
		
		return numCollisions;
	}
	
	this.LinkPhysGraphs = function( time ){
		if( time == this.lastAggColisTime )
			return;
		
		//check if any object in the colision group have a colisGroup with different sum of obj uids
		if( !this.resting && this.physGraph )
			this.physGraph.ConsolidateGraphs();
		
		
		this.lastAggColisTime = time;
	}
	
	this.ApplyInterpenOffset = function( time ){
		if( !this.resting && this.physGraph && !this.interpenOffsetApplied ){
			DTPrintf("interpen linvel " + this.linVel + " uid " + this.uid.val, "linvel");
			this.physGraph.ApplyInterpenOffset(this);
			this.interpenOffsetApplied = true;
		}
	}
	
	
	let aDiffLinEnVec = Vect3_NewZero();
	let aDiffLinVel = Vect3_NewZero();
	this.TransferEnergy = function( time, treeNode ){
		if( time == this.lastTransEnergTime )
			return;
		DTPrintf("transEnergy linvel " + this.linVel + " uid " + this.uid.val, "linvel");
		if( !this.resting ){
			//dt is the timestep for integrating forces into and accelerations into position changes
			let dt = time - this.lastUpdtTime; //time from end of last frame until end of this
			let constrGraph = this.physGraph;
			if( constrGraph ){
			
				if( constrGraph.constrPairs[this.uid.val] ){
				
					//time from last end of frame until first constraint this frame (time when velocity is changed)
					let timeSortedConstrPairs = constrGraph.constrPairs[this.uid.val]['timeSorted'];
					if( timeSortedConstrPairs.length >= 1 ){
						
						let constrPair = timeSortedConstrPairs[0];
						
						dt = constrPair.time - this.lastUpdtTime;
						
						let constrObj = GetOtherConstrObj(constrPair, this);
						
						let constrNormal = Vect3_CopyNew( constrPair.normal );
						//given the ratio of kinetic energy (velocity and mass) of  this vs combined objects
						//(and the restitution coef of both?) find the transfered amount of energy
						//ex. two objs with r=1 m=1 vel=[1,0,0] cr1=0.8 vel2=[-1,0,0] cr2=0.8
						//surface area of a sphere = 4   pi r^2
						//volume of a sphere       = 4/3 pi r^3
						//avgObj m=2 r=1.259 v=[0,0,0]
						
						if( constrPair.type == PHYS_INTERPEN ){
							//set all object velocities in group to move out of the interpenetrating object
							//colisNormal
						}else if( constrPair.type == PHYS_SURFCOLIS ){
						
							//rotat velocity, heat, composition (conductance), sum of mass and center of inertia
							let diffObjMomentum = Vect3_NewZero();
							constrGraph.GetAggWithoutObjMomentum( diffObjMomentum, this.linearMomentum );
							let diffPrior = Vect3_CopyNew( diffObjMomentum );
							Vect3_Subtract( diffObjMomentum, this.linearMomentum ); //inverted agg -> this for reflection below
							let diffMomentumMagnitude = Vect3_Length( diffObjMomentum );
							let combinedCOR = constrObj.colisCOR * this.colisCOR;
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
							console.log("colGph "    + colisGraph.uid.val    + " obj " + this.uid.val          + 
										" colObj "   + colisObj.uid.val      + " ob1 " + colisPair.ob1.uid.val + 
										" type "     + colisPair.type +
										" ob2 "      + colisPair.ob2.uid.val + 
										" aggMom "   + Vect3_Length( colisGraph.aggregateObject.linearMomentum ).toPrecision(5) +
										" aggM "     + colisGraph.aggregateObject.mass +
										" diffMomP " + lenDiffPrior.toPrecision(5) +
										" difMom "   + lenDiffMom.toPrecision(5)     +
										" prevMom "  + Vect3_Length( this.linearMomentum ).toPrecision(5) + 
										" reflMom "  + Vect3_Length( reflectedLinVel ).toPrecision(5) );
							*/
							
							
							if( isNaN(lenDiffMom) )
								console.log("nan difMom");
							
							kineticEnergyToVelocity( reflectedLinVel, diffMomentumMagnitude * combinedCOR, this.mass );
							Vect3_MultiplyScalar( reflectedLinVel, 0.5 ); //assuming equal and opposite reaction divides momentum between two objs
							
							this.linVel = reflectedLinVel;
							
							KineticEnergyVector( this.linearMomentum, this.linVel, this.mass ); //recalculate whenever linear velocity is updated
							if( isNaN(Vect3_Length(this.linearMomentum)) )
								console.log("nan linmomentum transfer energy");
							
							this.rotVelQuat = Quat_Identity(); //x,y,z axis, radian rotation / sec
							
							//dt = time - this.constraintGraph.colisGroupTimesAndObjs[0].time; //for external accel use time from collision vel update to end of frame
						}
						
					}
				}
			}
		}
		
		this.lastTransEnergTime = time;
	}
	
	//if after transfering energy the update will cause this object to be in colision again
	//need to add the new object the kinetic collision graph and re evolve from the beginning of the timestep
	///////////then make a static (collision continuing past this update) constraint for the object
	this.DetectAdditionalCollisions = function(time, externAccel){
		if( time == this.lastDetectStaticTime )
			return;
		DTPrintf("detcAddit linvel " + this.linVel + " uid " + this.uid.val, "linvel");
		let numCollisions = 0;
		
		if( !this.resting ){
			
			let constrGraph = this.physGraph;
			if( constrGraph ){
				if( constrGraph.constrPairs[this.uid.val] ){
					//time from last end of frame until first interaction this frame (time when velocity is changed)
					let constrPair = this.physGraph.constrPairs[this.uid.val]['timeSorted'][0];
					let dt = time - constrPair.time;
					
					//generate list of objects collided with
					//check other objects
					//this.FindCollisionTimesAndObjs(colisGroupTimesAndObjs);
					//check if coliding with ground ( y = 0 or canv.height)
					//this.FindBoundsCollisions(colisGroupTimesAndObjs);
					//if there are still collisions (then group the touching  objects
					//and set their relative velocities to zero)
					
					let accel = Vect3_CopyNew( externAccel );
					Vect3_MultiplyScalar( accel, dt );
					Vect3_Add( this.linVel, accel );
					KineticEnergyVector( this.linearMomentum, this.linVel, this.mass );
					if( isNaN(Vect3_Length(this.linearMomentum)) )
							console.log("nan linMom detect additional");
					
					
					numCollisions += this.FindColidingObjsAndTimes(dt, true);
					
					numCollisions += this.FindBoundsCollisions(dt, true); //check if coliding with ground ( y = 0 or canv.height)
					
					
					if( numCollisions >= 1 ){
						DTPrintf( "detectAdditional " + numCollisions + " uid " + this.uid.val, "detc additional" );
						//subtract the extern accel 
						//(because it was integrated over the entire timestep, 
						//though the colision occured before then)
						
						Vect3_Subtract( this.linVel, accel );
						KineticEnergyVector( this.linearMomentum, this.linVel, this.mass );
						if( isNaN(Vect3_Length(this.linearMomentum)) )
							console.log("nan linMom detect additional remove accel");
					}
					
					
					//now have a list of object collisions and times
					//sort them by time (needed for finding time of first colision)
					this.physGraph.SortByTime();
				}
			}
		
		}
		
		this.lastDetectStaticTime = time;
		
		return numCollisions;
	}
	
	//axis angle rotational velocity  inertia determined by mass distribution, around center of gravity
	//x,y,z linear velocity  inertia from mass
	//coefficent of restitution affects acceleration and heat/sound generation from impact
	this.Update = function(time, externAccel, treeNode){
		if(time == this.lastUpdtTime) //only once per frame (avoid multiple tree node calls)
			return;
		let dt = time - this.lastUpdtTime;
		DTPrintf("updt linvel " + this.linVel + " uid " + this.uid.val, "linvel" );
		//if linVel is below a threshold and obj is resting dont update position
		if( !this.resting ){
		
			let prevPosition = Vect3_CopyNew(this.AABB.center);
			
			if( Vect3_Length( this.linVel ) < RESTING_VEL && 
				this.physGraph && this.physGraph.totalConstrPairs > 0 ){
				//if there is a contact normal that is opposing the externAccel
				//then the object should stop moving
				let normExternAccel = Vect3_CopyNew( externAccel );
				Vect3_Normal( normExternAccel );
				let constrPairs = this.physGraph.constrPairs[this.uid.val];
				let constrPairKeys = Object.keys( constrPairs );
				for( let i = 0; i < constrPairKeys.length; ++i ){
					if( constrPairKeys[i] == 'timeSorted' )
						continue;
					if( constrPairs[constrPairKeys[i]].type == 0) //resolve interpenetration before suspending updates for object
						continue;
					let constrNormDot = Vect3_Dot( constrPairs[constrPairKeys[i]].normal, normExternAccel );
					if( constrNormDot < -0.8 ){
						this.resting = true;
						break;
					}
				}
			}else{
			
				//update the position
				let delP = Vect3_CopyNew(this.linVel);
				Vect3_MultiplyScalar( delP, dt );
				this.AABB.OffsetPos(delP);
				
				//console.log( 
				//	" linVel " + Vect_ToFixedPrecisionString( this.linVel, 5 ) + 
				//	" center " + Vect_ToFixedPrecisionString( this.AABB.center, 5 ) );
				
			}
			
			
			//check all subNodes added to if it has moved outside of their bounds
			//do this also when transitioning to resting because position may have been updated by apply interpen offset
			let ReAddToOctTree = false;
			let totOvlapPct = 0;
			let nodesToRemoveFrom = {};
			for( let nd in this.obj.treeNodes ){
				let ndOvLapPct = AABBsOverlap(this.obj.treeNodes[nd].AABB, this.AABB);
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
				treeNode.root.AddObject(nLvsMDpth, this.obj);
				if( nLvsMDpth[0] < 0 ){
					//failed to add to the new node
					addSuccess = false;
				}
			}
			
			if( addSuccess ){
				for( nd in nodesToRemoveFrom ){
					let tNd = this.obj.treeNodes[nd];
					if( tNd != undefined ){
						tNd.RemoveFromThisNode(this.obj); //node may unsubdivide during remove
						delete(this.obj.treeNodes[nd]);
					}
				}
			}else{
				if( nodesToRemoveFrom.length > 0 ){
					//revert to previous position (and collide with the node boundry or set zero velocity)
					this.AABB.MoveCenter(prevPosition);
					Vect3_SetScalar(this.linVel, 0);
				}
			}
			
		}
		
		this.lastUpdtTime = time;
	}
}
