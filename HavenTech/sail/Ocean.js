
//maintains the ocean surface model

function Ocean(){
	this.uid = NewUID();

	this.windDirection = Vect3_NewVals(0,-1,0);
	this.swellDirectionAndAmplitude = Vect3_NewVals(0,-1,0);

	this.highResCenter = Vect3_NewZero();

	this.resolutionToDist = 16;
	this.halfResolutionDist = 32;

	this.ready = false;

	this.quadmesh = new QuadMesh( "oceanSurface", "sailDefault", null, OCN_QMReady, this );
}

let rotationMatrix = Matrix_New();

const ocnWidth = 2;
const ocnHeight = 2;
function OCN_Update( ocn, rb3D, time, boatHeading ){
	QM_Update( ocn.quadmesh, time );
	
	rb3D.objs[ ocn.uid.val ] = ocn;
	
	let vertPositns = ocn.quadmesh.vertPositions;
	let indx = 0;
	
	for( let i = 0; i < ocnWidth; ++i ){
		for( let j = 0; j < ocnHeight; ++j ){
			indx = (j * ocnWidth + i)* vertCard;
			//vertPositns[indx + 0] = 
			//vertPositns[indx + 1] = 
			vertPositns[indx + 2] = 1.2*Math.sin( j*2 + time );
		}
	}
	ocn.quadmesh.materialHasntDrawn[0] = true;
	ocn.quadmesh.isAnimated = true;
	
	Matrix_SetEulerRotate( ocn.quadmesh.toWorldMatrix, [0,0,boatHeading] );
	ocn.quadmesh.toWorldMatrix[4*2+3] = -4;
}

function OCN_QMReady( qm, ocn ){
	ocn.ready = true;

}
