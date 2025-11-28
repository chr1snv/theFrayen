//# sourceURL=Structures/Curve.js : implementation of curve
//to request use or code/art please contact chris@itemfactorystudio.com

const Curve_Interp_Type_CONSTANT = 0;
const Curve_Interp_Type_LINEAR   = 1;
const Curve_Interp_Type_BEZIER   = 2;

function curveInterpTypeStrToInt(typeStr){
	if( typeStr == 'CONSTANT' )
		return Curve_Interp_Type_CONSTANT;
	if( typeStr == 'LINEAR' )
		return Curve_Interp_Type_LINEAR;
	if( typeStr == 'BEZIER' )
		return Curve_Interp_Type_BEZIER;
}

function Curve( interpType, numPoints ){
	this.interpolationType = interpType;
	this.numPoints = numPoints;
	this.points = new Array(numPoints);
	this.pointInsertIdx = 0;
	
	this.lastFirstIndex = 0;
	this.lastEndIndex = 1;
}
function Curv_comparePoints( p1, p2 ){
	//compare points based on their location (time)
	return p1[0] < p2[0];
}

function Curv_InsertPoint( c, newPoint ){
	c.points[c.pointInsertIdx++] = newPoint;
	//sort points based on their location (time)
	//this.points.sort(comparePoints);
}

function Curv_RemovePoint( c, point ){
	for(let i=0; i < c.points.length; ++i)
		if( c.points[i][0] == point[0] && c.points[i][1] == point[1] ){
			c.points.splice(i, 1);
			return;
		}
}

function Curv_FindBoundingPoints( c, firstIndex, endIndex, value ){
	//Perform a binary search through the points to find the two points that
	//the value lies between

	//set up the interval of search to initially be the entire array
	let midIndex = endIndex / 2;

	//keep searching until the bounding points have no points between them
	while((endIndex - firstIndex) > 1){
		//recalculate the midIndex
		midIndex = Math.floor((endIndex-firstIndex) / 2)+firstIndex;

		if( c.points[firstIndex][0] >= value ){
			//the value is the firstPoint
			b0 = c.points[firstIndex]; b1 = c.points[firstIndex];
			return;
		}else if( c.points[midIndex][0] > value ){
			//the value is between the firstPoint and the midPoint
			//adjust the interval of search
			endIndex = midIndex;
		}else if( c.points[midIndex][0] == value ){
			//the value is the mid point
			b0 = c.points[midIndex];
			b1 = c.points[midIndex];
			c.lastFirstIndex = midIndex;
			c.lastEndIndex = midIndex+1;
			return;
		}
		//at this point, the value is greater than the midpoint
		
		//check if the value is also greater than the endPoint
		else if ( c.points[endIndex][0] <= value ){
			//the value is the endPoint
			b0 = c.points[endIndex];
			b1 = c.points[endIndex];
			c.lastFirstIndex = endIndex;
			c.lastEndIndex = endIndex;
			return;
		}

		//by elimination, the value is between the midpoint and the endpoint
		else{
			//the value is between the midPoint and the endPoint
			//adjust the interval of search
			firstIndex = midIndex;
		}
	}

	//the firstPoint and endPoint are now bounding the value
	b0 = c.points[firstIndex];
	b1 = c.points[endIndex];
	c.lastFirstIndex = firstIndex;
	c.lastEndIndex = endIndex;
	return;
}

function Curv_LinearFindBoundingPoints(c, value){
	//first try the last two bounding points 
	//(cache locality makes this faster than a full binary search of the curve points)
	let firstIndex = c.lastFirstIndex;
	let endIndex = c.lastEndIndex;
	
	if( value < c.points[firstIndex][0] ){
		firstIndex = 0;
		endIndex = 1;
	}
	while( value > c.points[endIndex][0] && endIndex < c.numPoints-1){
		++firstIndex;
		++endIndex;
	}
	
	b0 = c.points[firstIndex];
	b1 = c.points[endIndex];
	c.lastFirstIndex = firstIndex;
	c.lastEndIndex = endIndex;
	//Curv_FindBoundingPoints(c, firstIndex, endIndex, value);
}

let b0 = 0;
let b1 = 1;
function Curv_GetValue(c, value)
{
	let pointsLen = c.numPoints;
	if(pointsLen < 1)
		return 0.0;
		
	//search for the two closest points (bounding points) of the value
	Curv_LinearFindBoundingPoints( c, value );
	
	//value is before the first point
	if(value <= b0[0])
		return b0[1];

	//value is after the last point
	if(value > b1[0])
		return b1[1];
	
	
	//otherwise interpolate between the bounding points
	
	let intervalLength = b1[0] - b0[0];
	
	//if the endpoints are the same, return one of them
	if(intervalLength < epsilon)
		return b0[0];
	
	//return the linear interpolation between the two points
	let distFromFirstPoint = value - b0[0];
	let normalizedLocation = distFromFirstPoint / intervalLength;

	let ret = b0[1]*(1.0-normalizedLocation) + b1[1]*(normalizedLocation);
	return ret;
}

function Curv_GetLength(c){
	if(c.points.length < 1)
		return 0.0;
	return c.points[c.points.length - 1][0];
}

function Curv_ToString(c){
	let ret = 'Curve: String representation: ';
	for(let i in c.points)
		ret += c.points[i][0] + ':' + c.points[i][1] + ' ';
	return ret;
}


