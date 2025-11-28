//# sourceURL=Input/CapacitiveAndGFieldSensing/InertialSensors.js
//for use or code/art requests please contact chris@itemfactorystudio.com

//for reading data from the Gyroscope / Acclerometer / Compass for tilt control
function InertialSensors(){

	this.getLastOrientationData = function( ){

		return prevValues[lastPrevValueIdx];
		
	}

	this.pushOrientationData = function( newData ){

		var oldIdx = lastPrevValueIdx;
		//get the new index
		lastPrevValueIdx =
			lastPrevValueIdx+1 < maxHistoryPoints ? lastPrevValueIdx+1 : 0;
		
		//if there was a previous entry copy the position at that time so
		//we can later integrate to get a new position when we get orientation data
		if( prevValues[oldIdx] ){
			newData.position = prevValues[oldIdx].position;
		}
		
		//push the new data
		prevValues[lastPrevValueIdx] = newData;

	}

	this.pushAbsOrientationData = function( orientIn, timeIn ){
		
		//search for the newest relative change data
		var closestData = undefined;
		var closestTime = Number.MAX_FLOAT;
		var i;
		for( i = 0; i< prevValues.length; ++i ){
			var state = prevValues[i];
			if( Math.abs( timeIn - state.time ) < closestTime ){
				closestTime = Math.abs( timeIn - state.time );
				closestData = state;
			}
		}
		
		if( closestData != undefined ){
			//if we found an entry update its orientation
			closestData.orient = orientIn;

			//and now integrate to get the new position
			var positionDelta =
				Vect3_Add( closestData.position, positionDelta );
		}
		
	}

	this.getAveragedAccel = function( numHistoryPoints ){
		var idx = lastPrevValueIdx-numHistoryPoints;
		idx = idx < 0 ? maxHistoryPoints + idx : idx;
		var ret = [0,0,0];
		for( var i=0; i < numHistoryPoints; ++i ){
			var accel = prevValues[idx].accel;
			Vect3_Add( ret, accel );
			if( !(++idx < maxHistoryPoints) )
				idx = 0;
		}
		Vect3_Mult( ret, 1/numHistoryPoints );
		return ret;
	}

	this.devMotionHandler = function(e){
		
		var time = Date.now();
		
		var accel =        [e.acceleration.x,
							e.acceleration.y,
							e.acceleration.z];
		var accelIncGrav = [e.accelerationIncludingGravity.x,
							e.accelerationIncludingGravity.y,
							e.accelerationIncludingGravity.z];
		var rotationRate = [e.rotationRate.alpha * Math.PI/180,
							e.rotationRate.beta * Math.PI/180,
							e.rotationRate.gamma * Math.PI/180];
		
		if( navigator.userAgent.search('Android') > -1 ){
			Vect3_Negative(accel);
			Vect3_Negative(accelIncGrav);
		}

		var state = new OrientationState();
		state.time = time;
		state.accel = accel;
		state.accelIncGrav = accelIncGrav;
		state.rotationRate = rotationRate;
		pushOrientationData( state );
		deviceMotionInterval = e.interval;
		
		//get averaged acceleration
		var avgAccel = getAveragedAccel( maxHistoryPoints );
		
	}

	this.devOrientationHandler = function(e){

		if( e.alpha == null )
			return;
		
		var orient = Quat_FromEuler( [e.alpha, e.beta, e.gamma] );
		
		pushAbsOrientationData( orient, Date.now() );
		
	}

}
