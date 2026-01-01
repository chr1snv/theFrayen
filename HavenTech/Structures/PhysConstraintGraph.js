//# sourceURL=Structures/PhysConstraintGraph.js
//a physics constraint graph (types of 
//group of objects that are interconnected in a simulation timestep by
//physics (wave energy propigation) interactions 
// of types ( 
//0 - interpenetration (need to move entire graph of objects outward from surface if possible)
const PHYS_INTERPEN = 0
		//(i.e. not blocked by another inifite mass object)
//1 - surface collision/resting contact, ((kinetic, friction, heat) energy transfer)
const PHYS_SURFCOLIS = 1
//2 - spring/rope (tension/pushing for ropes, cloth, soft body etc)
const PHYS_SPRING = 2
//3 - pressure (2 or more objects pushed/pulled from their average position 
const PHYS_PRESSURE = 3
//					to prevent collapse of point mass spring soft body objects) 

//types to be solved iteratively through the intermediary of an external field
//3 - electrostatic
const PHYS_ELECTROSTATIC = 4
//4 - magnetic 
const PHYS_MAGNETIC = 5
//5 - radiative (optical/thermal)
const PHYS_RADIATIVE = 6
//)

//for performance purposes 
//if a phys graph has above a certian number of objects
//an oct tree should be used to model the graph as a fluid/finite element field
//to approximate the behavior of 
//closely packed and continously touching inner objects with
//liquid/solid regions to transmit impulses/waves to the outer surfaces
//only objects that are exposed to free space (number of constraints below a limit) i.e. (areas without other object constraints)
//should be simulated as objects with constraint interactions

function GetOtherConstrObj(constrPair, tObj){
	if( constrPair.ob2.uid.val == tObj.uid.val )
		return constrPair.ob1;
	return constrPair.ob2;
}

function PhysConstraintGraph(AABBmin, AABBmax, colisRootObj){

	this.colisRootObj = colisRootObj;

	//a physics graph is only the interactions of objects within itself
	//not a field affecting all objects within it (unless reaching a performance threshold number of constraints)

	this.AABB = new AABB(AABBmin, AABBmax);
	this.aggregateObject = new PhysObj(this.AABB, {}); //the approximate object 
	this.aggregateObject.mass = 0;


	//this.interPenNormal = Vect3_NewZero();
	this.numInterPen = 0;
	//this.interpenOffsetApplied = false;


	this.firstCollisTime = Number.POSITIVE_INFINITY;
	this.timeSortedConstraints = []; //time sorted object interactions for the entire graph (currently not used)
	this.totalConstraints = 0;
	this.constrPairs = {}; //dictionary of time sorted arrays(or binary trees) of constraintPairs per object physObj uid
	//i.e. 2 physObjs with a spring and colision constraint between a and b it would be stored as
	
	//this.constrPairs[a.uid.val] = {'timeSorted':[sprPair, colisPair], b.uid.val:[sprPair, colisPair]};
	//this.constrPairs[b.uid.val] = {'timeSorted':[sprPair, colisPair], a.uid.val:[sprPair, colisPair]};
	
	//so that Object.keys( this.constrPairs ) returns all object uids in the graph/list
	//all constraints (sorted by which occurs first) on an object can be found with this.constrPairs[a.uid.val]

	this.uid = NewUID();

}

// helper function for below PHYSGRPH_RemoveObjConstraintsFromGraph
function PHYSGRPH_removeFromOthrObjPairs( othrObjPairs, objUid ){
	//
	delete(othrObjPairs[objUid]);
	let timeSortedPairs = othrObjPairs['timeSorted'];
	for( let i = 0; i < timeSortedPairs.length; ++i ){
		if( timeSortedPairs[i].ob1 == objUid || timeSortedPairs[i].ob2 == objUid ){
			timeSortedPairs.splice(i,1);
			i -= 1;
		}
	}
}

	//in the dic[obj1]dic[obj2] find all entries with obj1 or obj2 as obj
	//and remove them
function PHYSGRPH_RemoveObjConstraintsFromGraph( physG, obj, type ){
	let obPairs = physG.constrPairs[obj.uid.val];
	if( obPairs ){

		//all pairs and time sorted objects under this object
		//are to be removed
		delete(obPairs['timeSorted']); 


		//remove this object from other object pairs
		let pairKeys = Object.keys( obPairs );
		for( let i = 0; i < pairKeys.length; ++i ){ 
			//each pair has a different object that this interacts with

			let pair = obPairs[pairKeys[i]];
			let othrObj = pair.ob1;
			if( othrObj.uid.val == obj.uid.val )
				 othrObj = pair.ob2;

			PHYSGRPH_removeFromOthrObjPairs( 
				physG.constrPairs[othrObj.uid.val], obj.uid.val );

		}

		//remove all pairs for this object now that
		//pairs with it have been removed from other objects in the physGraph
		delete(physG.constrPairs[obj.uid.val]);
	}

}

//add constraint indexed on one of the objects i.e.
//this.constrPairs[a.uid.val] = {'timeSorted':[sprPair, colisPair], b.uid.val:[sprPair, colisPair]};
//needs to be called twice to store a constraint under both object indicies
function PHYSGRPH_AddConstraintAndTimeSort( physG, constrPair, ob1, ob2 ){

	let ob1UidVal = ob1.uid.val;
	let ob2UidVal = ob2.uid.val;

	let constraintAdded = false;

	//store in the constrPairs indexed on the specified ob/end point of the constraint
	let obConstrs = physG.constrPairs[ob1UidVal];
	if( obConstrs == undefined ){ //create entry for object (ob doesn't have any constraints in the PhysConstraintGraph yet)
		//physG.constrPairs[ob1UidVal] = obConstrs = { 'timeSorted':[constrPair], ob2UidVal:{constrPair.cnstrId:constrPair}};
		obConstrs = { };
		obConstrs['timeSorted'] = [constrPair];
		let ob1ob2Constrs = {};
		obConstrs[ob2UidVal] = ob1ob2Constrs;
		ob1ob2Constrs[constrPair.cnstrId] = constrPair;


		physG.constrPairs[ob1UidVal] = obConstrs;
		constraintAdded = true;

		//used ( to calculate collision reactions ) (may also be used for something like modeling the graph as a fluid/finite element field or aggregate if there are many interconnected objects )
		AddAggregateKineticEnergyAndMass( physG.aggregateObject, ob1.linearMomentum, ob1.mass );
		AddUIDs( physG.uid, ob1UidVal ); //used to 
		return constraintAdded;
	}else{ //other constraints exist on object, check if this one is not yet added

		let ob1ob2Constrs = obConstrs[ob2UidVal];
		if( ob1ob2Constrs == undefined ){ //don't yet have a collection of constraints under ob1 -> ob2
			ob1ob2Constrs = {};
			obConstrs[ob2UidVal] = ob1ob2Constrs;
		}
		let alreadyAddedPair = ob1ob2Constrs[constrPair.cnstrId];
		if( alreadyAddedPair == undefined ){
			ob1ob2Constrs[constrPair.cnstrId] = constrPair;
			constraintAdded = true;
		}else{
			DTPrintf("ob1 constrs pair already added ob2 uid " + ob2UidVal + " ob2 mass " + ob2.mass, "constr msg");
			return constraintAdded; //don't need to time sort because didn't add a new constraint
		}

	}

	let ob1TimeSortedConstrs = obConstrs['timeSorted'];
	let constrInserted = false;
	for( let i = 0; i < ob1TimeSortedConstrs.length; ++i ){
		if( ob1TimeSortedConstrs[i].time > constrPair.time ){
			ob1TimeSortedConstrs.splice( i, 0, constrPair );
			constrInserted = true;
			break;
		}
	}
	if(!constrInserted){
		ob1TimeSortedConstrs.push( constrPair );
	}

	return constraintAdded;
}

function PHYGRPH_GenConstraintID( type, ob1UidVal, ob2UidVal ){
	return ob1UidVal + ob2UidVal + type;
}

	//dictionary[obj1] of dictionaries[obj2]
function PHYSGRPH_AddConstraint( physG, constrPair ){

	let typeIn = constrPair['type'];
	let ob1In  = constrPair['ob1'];
	let ob2In  = constrPair['ob2'];

	if( typeIn == PHYS_INTERPEN || typeIn == PHYS_SURFCOLIS || typeIn == PHYS_SPRING ){

		if( typeIn == PHYS_INTERPEN || typeIn == PHYS_SURFCOLIS ){

			let intTime			= constrPair['time'];
			let contactNormal	= constrPair['normal'];
			let contactPos		= constrPair['pos'];
			let interpenDepth	= constrPair['intrD'];

			if( isNaN(contactNormal[0]) ){
				console.log("nan contact normal");
				return;
			}

			if( physG.firstCollisTime > intTime )
				physG.firstCollisTime = intTime;


			if( intTime == undefined ){
				console.log("undefined intersection time");
				return;
			}

			if( typeIn == PHYS_INTERPEN && interpenDepth < 0.05 )
				return; //reject too small interpenetration depth

			//add the object to the connections of object interaction  times
			//and sum the properties of the coliding object into the aggregate object
			//to get the relative forces on each object

			/*
			DTPrintf("add constrPair " +
					 " type " + constrPair.type + 
					 " time " + constrPair.time.toPrecision(3) +
					 " normal " + Vect_ToFixedPrecisionString( constrPair.normal, 3 ) +
					 " pos " + Vect_ToFixedPrecisionString( constrPair.pos, 3 ) +
					 " intrD " + Vect_ToFixedPrecisionString( constrPair.intrD, 3 ) +
					 " ob1 " + constrPair.ob1.uid.val +
					 " ob2 " + constrPair.ob2.uid.val
					 , "constr msg");
			*/

		}
		else if( typeIn == PHYS_SPRING ){

			//constrPair is passed into PHYSGRPH_AddConstraint function call
		}

		//store the constraint indexed under both ob1 uid and ob2 uid (because the same physgraph is checked by both in their update function)
		let constraintAdded1 = PHYSGRPH_AddConstraintAndTimeSort( physG, constrPair, ob1In, ob2In );
		let constraintAdded2 = PHYSGRPH_AddConstraintAndTimeSort( physG, constrPair, ob2In, ob1In );
		let constraintAdded = constraintAdded1 || constraintAdded2;


		if( typeIn == PHYS_INTERPEN ){
			//Vect3_Add( physG.interPenNormal, contactNormal );
			physG.numInterPen += 1;
		}

		if( constraintAdded )
			physG.totalConstrints += 1;

	}
	else{ //field type interaction (between physObj and treeNode) PHYS_PRESSURE, PHYS_ELECTROSTATIC, PHYS_MAGNETIC, PHYS_RADIATIVE
	}


	DTPrintf("total pairs " + physG.totalConstraints + " numInterpen " + physG.numInterPen, "constr msg");
}

function PHYSGRPH_SortByTime( physG ){
	//given a list of object collisions and times
	//sort them by time (needed for finding time of first colision)
	let constrPairKeys = Object.keys( physG.constrPairs );
	for( let i = 0; i < constrPairKeys.length; ++i ){
		let colisObjs = physG.constrPairs[constrPairKeys[i]];
		if( colisObjs.length > 0 ){
			colisObjs.sort( function( a, b ){ return a.time - b.time; } ); //given two collisions compare them by time
		}
	}
}

//consolidate dictionary[obj1] of dictionaries[obj2]
function PHYSGRPH_ConsolidateGraphs( framePhysG, persistPhysG ){

	//combine the constraint pairs from obj1 persistant physGraph into obj1's framePhysG
	//so that in PHYSOBJ_TransferEnergy there is a unified list
	if( persistPhysG != undefined ){
		let persistConstrPairOtherObjectIds = Object.keys( persistPhysG.constrPairs );
		for( let i = 0; i < persistConstrPairOtherObjectIds.length; ++i ){
			let persistObjConstrs = persistPhysG.constrPairs[persistConstrPairOtherObjectIds[i]];
			//physG.constrPairs[ob1UidVal] = obConstrs = { 'timeSorted':[constrPair], ob2UidVal:{constrPair.cnstrId:constrPair}};
			let perstObjConstrIds = Object.keys(persistObjConstrs);
			for( let j = 0; j < perstObjConstrIds.length; ++j ){
				if(perstObjConstrIds[i] == 'timeSorted') //skip time sorted list (will be rebuilt after consolidation)
					continue;
				let constraints = persistObjConstrs[perstObjConstrIds[j]];
				let constraintIds = Object.keys( constraints );
				for( let k = 0; k < constraintIds.length; ++k ){
					let constraint = constraints[constraintIds[k]];
					PHYSGRPH_AddConstraint( framePhysG, constraint );
				}
			}
		}
	}

	//check if any object in the colision group have a colisGroup/constraintGraph with different obj uids (first checking sum of obj uids could be an optimization)
	let graphObjIds = Object.keys( framePhysG.constrPairs );
	for( let i = 0; i < graphObjIds.length; ++i ){
		if(graphObjIds[i] == 'timeSorted') //skip time sorted list (will be rebuilt after consolidation)
			continue;
		let obj1Constraints = framePhysG.constrPairs[graphObjIds[i]]; //objs that the key/this object interacts with
		let obj2Ids = Object.keys( obj1Constraints );
		for( let j = 0; j < obj2Ids.length; ++j ){
			if( obj2Ids[j] == 'timeSorted' )
				continue;
			//physG.constrPairs[ob1UidVal] = obConstrs = { 'timeSorted':[constrPair], ob2UidVal:{constrPair.cnstrId:constrPair}};
			let ob1ob2Constrs = obj1Constraints[obj2Ids[j]];
			let ob1ob2ConstrIds = Object.keys(ob1ob2Constrs);
			for( let k = 0; k < ob1ob2ConstrIds.length; ++k ){
				let ob1ob2Constr = ob1ob2Constrs[ob1ob2ConstrIds];
				let ob2 = ob1ob2Constr.ob2;
				if( ob2.framePhysGraph ){
					let obj2Graph = ob2.framePhysGraph;
					if( obj2Graph && obj2Graph.uid.val != framePhysG.uid.val ){
						//need to combine colisGroupTimesAndObjs[i].obj colision group and framePhysG
						//console.log( "combine graphs " + objGraph.uid.val + " and " + framePhysG.uid.val );
						let obj2Keys = Object.keys( obj2Graph.constrPairs );
						let strUids = "";
						//DTPrintf("consolidate 3", "consolidate");
						for( let l = 0; l < obj2Keys.length; ++l ){
							//strUids += "  " + objKeys[l] + " ";
							let obj2ObjIds = obj2Graph.constrPairs[obj2Keys[l]];
							let obj2PairKeys = Object.keys( obj2ObjIds );
							//DTPrintf("consolidate 4", "consolidate");
							for( let m = 0; m < obj2PairKeys.length; ++m ){
								let obj2Obj1Constrnts = obj2ObjIds[obj2PairKeys[m]];
								if(obj2Obj1Constrnts == 'timeSorted')
									continue;
									
								//DTPrintf("consolidate 5", "consolidate");
								let obj2obj1CnstrIds = Object.keys( obj2Obj1Constrnts );
								for( let n = 0; n < obj2obj1CnstrIds.length; ++n ){
									let constrnt = obj2Obj1Constrnts[obj2obj1CnstrIds[n]];
									PHYSGRPH_AddConstraint( framePhysG, constrnt );
									//strUids += objPair.ob1.uid.val + ":" + objPair.ob2.uid.val + ",";
									//DTPrintf("consolidate 6", "consolidate");
								}
							}
						}
						ob2.framePhysGraph = framePhysG; //ob2's graph has been consolidated with framePhysG
						//console.log("graphs combined total pairs " + framePhysG.totalConstraints + " " + strUids );
					}
				}
			}
		}
	}
}

let avgInterpenNorm = Vect3_NewZero();
let tmpInterpenNorm = Vect3_NewZero();
let totalInterpenDepth = 0;
function PHYSGRPH_ApplyInterpenOffset( physG, ob ){ //apply after consolidating
	if( physG.numInterPen > 0 ){
		DTPrintf( "ob uid " + ob.uid.val + " mass " + ob.mass + " pos " + Vect_ToFixedPrecisionString(ob.AABB.center, 5), "interpen" );
		let colisObjs = physG.constrPairs[ob.uid.val]; //objs that the key object colides with
		let colisObjKeys = Object.keys( colisObjs );
		if( colisObjKeys.length > 0 ){
			//get the average of the interpentation normals and push object away in that direction
			Vect3_Zero( avgInterpenNorm );
			let numNorms = 0;
			for( let j = 0; j < colisObjKeys.length; ++j ){
				if( colisObjKeys[j] == 'timeSorted' ) //skip non pair entry
					continue;
				let constrPair = colisObjs[colisObjKeys[j]];
				if( constrPair.type != 0 ) //skip non interpenetration constraint types
					continue;

				let interPenOb = constrPair.ob2;
				Vect3_Copy( tmpInterpenNorm, constrPair.normal );
				if( interPenOb.uid.val == ob.uid.val ){
					interPenOb = constrPair.ob1;
					Vect3_MultiplyScalar( tmpInterpenNorm, -1 );
				}

				//Vect3_MultiplyScalar( tmpInterpenNorm, constrPair.intrD );
				Vect3_Add( avgInterpenNorm, tmpInterpenNorm );
				DTPrintf( "\n" +
					"ob1 " + constrPair.ob1.uid.val +
					" ob1 pos " + Vect_ToFixedPrecisionString(constrPair.ob1.AABB.center, 3) + " mass " + constrPair.ob1.mass + "\n" +
					"ob2 " + constrPair.ob2.uid.val + 
					" ob2 pos " + Vect_ToFixedPrecisionString(constrPair.ob2.AABB.center, 3) + " mass " + constrPair.ob2.mass + "\n" + 
					"interPenOb " + interPenOb.uid.val +
					" tmpNorm " + Vect_ToFixedPrecisionString(tmpInterpenNorm, 3) +
					" avgNorm " + Vect_ToFixedPrecisionString(avgInterpenNorm, 3)
					, "interpen" );
				totalInterpenDepth += constrPair.intrD;
				numNorms += 1;
			}

			if( numNorms > 0 ){
				let interpenLen = totalInterpenDepth/numNorms * 0.1;
				DTPrintf("interpenLen " + interpenLen.toPrecision(3), "interpen" );
				if( interpenLen < 0.1 )
					interpenLen = 0.1;

				Vect3_MultiplyScalar( avgInterpenNorm, interpenLen );
				AABB_OffsetPos(ob.AABB, avgInterpenNorm );
				DTPrintf( 
				"pos offset " + Vect_ToFixedPrecisionString(avgInterpenNorm, 3) + 
				" len " + interpenLen + "\n" +
				"new pos " + Vect_ToFixedPrecisionString(ob.AABB.center, 5), "interpen" );
				Vect3_Zero( ob.linVel );
				//ob1.linVel = physG.interPenNormal;
				//ob2.linVel = physG.interPenNormal;
			}
			
		}


	}
}

function PHYSGRPH_GetAggWithoutObjMomentum( physG, aggObjMomentum, objMomentum ){ 
//get the difference in energy vector of obj and the aggregate object

	if( physG.aggregateObject.mass == Number.Infinity ){
		Vect3_Copy( aggObjMomentum, physG.aggregateObject.linVel );
		return;
	}
	//these are recalculated when their linear velocity is updated
	//let objMomentum = Vect3_NewZero();
	//KineticEnergyVector( objMomentum, physObj.linVel, physObj.mass );
	//KineticEnergyVector( physG.aggregateObject.linearMomentum, physG.aggregateObject.linVel, physG.aggregateObject.mass );
	SubtractEnergy( aggObjMomentum, physG.aggregateObject, objMomentum ); //aDiffLinVel is the aggregate energy without the object
}

function PHYSGRPH_OutlineAllPairsInGraph( physG ){

	let constrPairKeys = Object.keys( this.constrPairs );
	for( let i = 0; i < constrPairKeys.length; ++i ){
		if(constrPairKeys[i] == 'timeSorted') //skip non pair entry
			continue;
		let colisObjs = this.constrPairs[constrPairKeys[i]]; //objs that the key object colides with
		let colisObjKeys = Object.keys( colisObjs );
		if( colisObjKeys.length > 0 ){
			//get the average of the interpentation normals and push object away in that direction
			Vect3_Zero( avgInterpenNorm );
			for( let j = 0; j < colisObjKeys.length; ++j ){
				let constrPair = colisObjs[colisObjKeys[j]];
			}
		}
	}
	
}

