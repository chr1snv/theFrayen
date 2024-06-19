//Curve.js: implementation of curve
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
	this.points = new Array(numPoints);
	this.pointInsertIdx = 0;

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

function Curv_FindBoundingPoints( c, b, value ){
	//Perform a binary search through the points to find the two points that
	//the value lies between

	//set up the interval of search to initially be the entire array
	let firstIndex = 0;
	let endIndex = c.points.length-1;
	let midIndex = endIndex / 2;

	//keep searching until the bounding points have no points between them
	while((endIndex - firstIndex) > 1){
		//recalculate the midIndex
		midIndex = Math.floor((endIndex-firstIndex) / 2)+firstIndex;

		if( c.points[firstIndex][0] >= value ){
			//the value is the firstPoint
			b[0] = c.points[firstIndex]; b[1] = c.points[firstIndex];
			return;
		}else if( c.points[midIndex][0] > value ){
			//the value is between the firstPoint and the midPoint
			//adjust the interval of search
			endIndex = midIndex;
		}else if( c.points[midIndex][0] == value ){
			//the value is the mid point
			b[0] = c.points[midIndex];
			b[1] = c.points[midIndex];
			return;
		}
		//at this point, the value is greater than the midpoint
		
		//check if the value is also greater than the endPoint
		else if ( c.points[endIndex][0] <= value ){
			//the value is the endPoint
			b[0] = c.points[endIndex];
			b[1] = c.points[endIndex];
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
	b[0] = c.points[firstIndex];
	b[1] = c.points[endIndex];
	return;
}

let b = [null, null];
function Curv_GetValue(c, value)
{
	if(c.points.length < 1)
		return 0.0;
	
	//find if the value is before the first point
	if(value <= c.points[0][0])
		return c.points[0][1];

	//find if the value is after the last point
	if(value > c.points[c.points.length - 1][0])
		return c.points[c.points.length -1][1];
	
	//find the two closest points to the value
	Curv_FindBoundingPoints(c, b, value);
	
	let intervalLength = b[1][0] - b[0][0];
	
	//if the endpoints are the same, return one of them
	if(intervalLength < epsilon)
		return b[0][0];
	
	//return the linear interpolation between the two points
	let distFromFirstPoint = value - b[0][0];
	let normalizedLocation = distFromFirstPoint / intervalLength;

	let ret = b[0][1]*(1.0-normalizedLocation) + b[1][1]*(normalizedLocation);
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


