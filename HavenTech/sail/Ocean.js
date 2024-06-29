
//maintains the ocean surface model

function Ocean(){
	this.uid = NewUID();

	this.windDirection = Vect3_NewVals(0,-1,0);
	this.swellDirectionAndAmplitude = Vect3_NewVals(0,-1,0);
	
	this.highResCenter = Vect3_NewZero();

	this.resolutionToDist = 16;
	this.halfResolutionDist = 32;
	
	this.quadmesh = new QuadMesh( "oceanSurface", "sailDefault", null, OCN_QMReady, this );
}

function OCN_Update( ocn, time ){
	QM_Update( ocn.quadmesh, time );
}

function OCN_QMReady( qm, ocn ){
	ocn.ready = true;
	
}
