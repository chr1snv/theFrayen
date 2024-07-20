
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

const ocnWidth = 2;
const ocnHeight = 2;
function OCN_Update( ocn, time ){
	QM_Update( ocn.quadmesh, time );
	
	for( let i = 0; i < ocnWidth; ++i )
		for( let j = 0; j < ocnHeight; ++j )
			ocn.quadmesh.vertPositions[(j * ocnWidth + i)* vertCard + 2] = 1.2*Math.sin( j*2 + time );
	ocn.quadmesh.materialHasntDrawn[0] = true;
}

function OCN_QMReady( qm, ocn ){
	ocn.ready = true;
	
}
