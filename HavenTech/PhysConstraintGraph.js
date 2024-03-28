
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

//for performance purposes 
//an oct tree is to be used on
//the physics graph to approximate the behavior of 
//closely packed and continously touching inner objects with
//liquid/solid regions to transmit impulses/waves to the outer surfaces
//only objects that are exposed to free space (areas without other object constraints)
//are simulated as objects with interactions

function GetOtherConstrObj(constrPair, tObj){
	if( constrPair.ob2.uid.val == tObj.uid.val )
		return constrPair.ob1;
	return constrPair.ob2;
}

function PhysConstraintGraph(type, AABBmin, AABBmax, colisRootObj){

	this.colisRootObj = colisRootObj;

	//0-kinematic (collision), 1-static contact with other object, 2-fixed (all immutable objects)
	//this.physType = 0; 
	
	this.AABB = new AABB(AABBmin, AABBmax);
	this.aggregateObject = new PhysObj(this.AABB); //the approximate object 
	this.aggregateObject.mass = 0;
	
	
	//this.interPenNormal = Vect3_NewZero();
	this.numInterPen = 0;
	//this.interpenOffsetApplied = false;
	
	
	this.firstCollisTime = Number.POSITIVE_INFINITY;
	this.timeSortedConstraints = []; //time sorted object interactions
	this.totalConstrPairs = 0;
	this.constrPairs = {}; //dictionary of per object constraints
	this.uid = NewUID();
	
	this.removeFromOthrObjPairs = function( othrObjPairs, objUid ){
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
	this.RemoveObjConstraintsFromGraph = function(obj, type){
		let obPairs = this.constrPairs[obj.uid.val];
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
				
				this.removeFromOthrObjPairs( 
					this.constrPairs[othrObj.uid.val], obj.uid.val );
				
			}
			
			//remove all pairs for this object now that
			//pairs with it have been removed from other objects in the physGraph
			delete(this.constrPairs[obj.uid.val]);
		}
		
	}
	
	//dictionary[obj1] of dictionaries[obj2]
	this.AddConstraint = function(typeIn, intTime, contactNormal, contactPos, interpenDepth, ob1In, ob2In){
		if( isNaN(contactNormal[0]) ){
			console.log("nan contact normal");
			return;
		}
		
		if( this.firstCollisTime > intTime )
			this.firstCollisTime = intTime;
		
		
		if( intTime == undefined ){
			console.log("undefined intersection time");
			return;
		}
		
		if( typeIn == PHYS_INTERPEN && interpenDepth < 0.05 )
			return; //reject too small interpenetration depth
	
		//add the object to the connections of object interaction  times
		//and sum the properties of the coliding object into the aggregate object
		//to get the relative forces on each object
		let constrPair = {type:typeIn, time:intTime, normal:contactNormal, pos:contactPos, intrD:interpenDepth, ob1:ob1In, ob2:ob2In};
		DTPrintf("add constrPair " +
				 " type " + constrPair.type + 
				 " time " + constrPair.time.toPrecision(3) +
				 " normal " + Vect_ToFixedPrecisionString( constrPair.normal, 3 ) +
				 " pos " + Vect_ToFixedPrecisionString( constrPair.pos, 3 ) +
				 " intrD " + Vect_ToFixedPrecisionString( constrPair.intrD, 3 ) +
				 " ob1 " + constrPair.ob1.uid.val +
				 " ob2 " + constrPair.ob2.uid.val
				 , "constr msg");
		let pairAdded = false;
		//store indexed on the first object
		let ob1Constrs = this.constrPairs[ob1In.uid.val];
		if( ob1Constrs == undefined ){
			this.constrPairs[ob1In.uid.val] = {};
			ob1Constrs = this.constrPairs[ob1In.uid.val];
			ob1Constrs['timeSorted'] = [];
			AddAggregateKineticEnergyAndMass( this.aggregateObject, ob1In.linearMomentum, ob1In.mass );
			AddUIDs( this.uid, ob1In.uid );
		}
		if( ob1Constrs[ob2In.uid.val] == undefined ){
			ob1Constrs[ob2In.uid.val] = constrPair;
			pairAdded = true;
		}else{
			DTPrintf("ob1 constrs pair already added ob2 uid " + ob2In.uid.val + " ob2 mass " + ob2In.mass, "constr msg");
			return;
		}
		let ob1TimeSortedConstrs = ob1Constrs['timeSorted'];
		if( ob1TimeSortedConstrs.length > 0 ){ 
			for( let i = 0; i < ob1TimeSortedConstrs.length; ++i ){
				if( ob1TimeSortedConstrs[i].time > constrPair.time ){
					ob1TimeSortedConstrs.splice( i, 0, constrPair );
					break;
				}
			}
		}else{
			ob1TimeSortedConstrs.push( constrPair );
		}
		
		
		//store indexed on the second object
		let ob2Constrs = this.constrPairs[ob2In.uid.val];
		if( ob2Constrs == undefined ){
			this.constrPairs[ob2In.uid.val] = {};
			ob2Constrs = this.constrPairs[ob2In.uid.val];
			ob2Constrs['timeSorted'] = [];
			AddAggregateKineticEnergyAndMass( this.aggregateObject, ob2In.linearMomentum, ob2In.mass );
			AddUIDs( this.uid, ob2In.uid );
		}
		if( ob2Constrs[ob1In.uid.val] == undefined ){
			ob2Constrs[ob1In.uid.val] = constrPair;
			pairAdded = true;
		}else{
			DTPrintf("ob2 constrs pair already added ob1 uid " + ob1In.uid.val, "constr msg");
			return;
		}
		let ob2TimeSortedConstrs = ob2Constrs['timeSorted'];
		if( ob2TimeSortedConstrs.length > 0 ){ 
			//insertion sort, should be a binary tree instead of array
			for( let i = 0; i < ob2TimeSortedConstrs.length; ++i ){
				if( ob2TimeSortedConstrs[i].time > constrPair.time ){
					ob2TimeSortedConstrs.splice( i, 0, constrPair );
					break;
				}
			}
		}else{
			ob2TimeSortedConstrs.push( constrPair );
		}
		
		
		if( typeIn == PHYS_INTERPEN ){
			//Vect3_Add( this.interPenNormal, contactNormal );
			this.numInterPen += 1;
		}
		
		if( pairAdded )		
			this.totalConstrPairs += 1;
		
		DTPrintf("total pairs " + this.totalConstrPairs + " numInterpen " + this.numInterPen, "constr msg");
	}
	
	this.SortByTime = function(){
		//now have a list of object collisions and times
		//sort them by time (needed for finding time of first colision)
		let constrPairKeys = Object.keys( this.constrPairs );
		for( let i = 0; i < constrPairKeys.length; ++i ){
			let colisObjs = this.constrPairs[constrPairKeys[i]];
			if( colisObjs.length > 0 ){
				colisObjs.sort( function( a, b ){ return a.time - b.time; } ); //given two collisions compare them by time
			}
		}
	}
	
	//consolidate dictionary[obj1] of dictionaries[obj2]
	this.ConsolidateGraphs = function(){
		//check if any object in the colision group have a colisGroup with different sum of obj uids
		let constrPairKeys = Object.keys( this.constrPairs );
		for( let i = 0; i < constrPairKeys.length; ++i ){
			if(constrPairKeys[i] == 'timeSorted')
				continue;
			DTPrintf("consolidate 1", "consolidate");
			let colisObjs = this.constrPairs[constrPairKeys[i]]; //objs that the key object colides with
			let colisObjKeys = Object.keys( colisObjs );
			if( colisObjKeys.length > 0 ){
				for( let j = 0; j < colisObjKeys.length; ++j ){
					if( colisObjKeys[j] == 'timeSorted' )
						continue;
					DTPrintf("consolidate 2", "consolidate");
					let ob2 = colisObjs[colisObjKeys[j]].ob2;
					if( ob2.physGraph ){
						let objGraph = ob2.physGraph;
						if( objGraph && objGraph.uid.val != this.uid.val ){
							//need to combine colisGroupTimesAndObjs[i].obj colision group and this
							//console.log( "combine graphs " + objGraph.uid.val + " and " + this.uid.val );
							let objKeys = Object.keys( objGraph.constrPairs );
							let strUids = "";
							DTPrintf("consolidate 3", "consolidate");
							for( let k = 0; k < objKeys.length; ++k ){
								strUids += "  " + objKeys[k] + " ";
								let objConstrPairs = objGraph.constrPairs[objKeys[k]];
								let objPairKeys = Object.keys( objConstrPairs );
								DTPrintf("consolidate 4", "consolidate");
								for( let l = 0; l < objPairKeys.length; ++l ){
									if(objPairKeys[l] == 'timeSorted')
										continue;
									DTPrintf("consolidate 5", "consolidate");
									let objPair = objConstrPairs[objPairKeys[l]];
									this.AddConstraint( 
												objPair.type,
												objPair.time, 
												objPair.normal, 
												objPair.pos, 
												objPair.intrD,
												objPair.ob1, objPair.ob2 );
									strUids += objPair.ob1.uid.val + ":" + objPair.ob2.uid.val + ",";
									DTPrintf("consolidate 6", "consolidate");
								}
							}
							ob2.physGraph = this; //ob2's graph has been consolidated with this
							//console.log("graphs combined total pairs " + this.totalConstrPairs + " " + strUids );
						}
					}
				}
			}
		}
	}
	
	let avgInterpenNorm = Vect3_NewZero();
	let tmpInterpenNorm = Vect3_NewZero();
	let totalInterpenDepth = 0;
	this.ApplyInterpenOffset = function(ob){ //apply after consolidating
		if( this.numInterPen > 0 ){
			DTPrintf( "ob uid " + ob.uid.val + " mass " + ob.mass + " pos " + Vect_ToFixedPrecisionString(ob.AABB.center, 5), "interpen" );
			let colisObjs = this.constrPairs[ob.uid.val]; //objs that the key object colides with
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
					ob.AABB.OffsetPos( avgInterpenNorm );
					DTPrintf( 
					"pos offset " + Vect_ToFixedPrecisionString(avgInterpenNorm, 3) + 
					" len " + interpenLen + "\n" +
					"new pos " + Vect_ToFixedPrecisionString(ob.AABB.center, 5), "interpen" );
					Vect3_Zero( ob.linVel );
					//ob1.linVel = this.interPenNormal;
					//ob2.linVel = this.interPenNormal;
				}
				
			}
				
			
		}
	}
	
	this.GetAggWithoutObjMomentum = function( aggObjMomentum, objMomentum ){ //get the difference in energy vector of obj and the aggregate object
		if( this.aggregateObject.mass == Number.Infinity ){
			Vect3_Copy( aggObjMomentum, this.aggregateObject.linVel );
			return;
		}
		//these are recalculated when their linear velocity is updated
		//let objMomentum = Vect3_NewZero();
		//KineticEnergyVector( objMomentum, physObj.linVel, physObj.mass );
		//KineticEnergyVector( this.aggregateObject.linearMomentum, this.aggregateObject.linVel, this.aggregateObject.mass );
		SubtractEnergy( aggObjMomentum, this.aggregateObject, objMomentum ); //aDiffLinVel is the aggregate energy without the object
	}
	
	this.OutlineAllPairsInGraph = function(){
		
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

}
