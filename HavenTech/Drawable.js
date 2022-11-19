//Drawable.js: interface of a renderable object
//this class should not be instantiated.
//renderable objects inherit from this
//to present to the sceneGraph for draw requests.

function Drawable(){
    //Vertices is an array of verts that compose the triangles of the hull
    //this is depreciated by Triangle.js's RayTriangleIntersection function
    //and should be acclerated with an OctTree in QuadMesh to minimize the
    //number of triangles that need to be checked
    this.RayIntersectsHull = function( t, verticies, numTris,
                                       rayOrigin, rayDir )
    {
        //for each triangle
        //preform ray triange intersection
        for( var i=0; i<numTris; ++i )
        {
            var v1 = new Float32Array[3];
            v1[0] = verticies[i*9+0+0];
            v1[1] = verticies[i*9+0+1];
            v1[2] = verticies[i*9+0+2];

            var v2 = new Float32Array[3];
            v2[0] = verticies[i*9+3+0];
            v2[1] = verticies[i*9+3+1];
            v2[2] = verticies[i*9+3+2];

            var v3 = new Float32Array[3];
            v3[0] = verticies[i*9+6+0];
            v3[1] = verticies[i*9+6+1];
            v3[2] = verticies[i*9+6+2];

            //find the intersection point between the ray and the
            //plane passing through the triangle
            ///////////////////////////////////

            //find the normal to the triangle
            var vect1 = new Float32Array[3];
            var vect2 = new Float32Array[3];
            var normal= new Float32Array[3];
            Vect3_Copy(vect1, v1);
            Vect3_Copy(vect2, v2);
            Vect3_Subtract(vect1, v3);
            Vect3_Subtract(vect2, v3);
            Vect3_Cross(normal, vect1, vect2);

            //calculate the timestep of the ray at the intersection point
            //between the ray and the plane
            var tsTemp = new Float32Array[3];
            var numerator;
            Vect3_Copy(tsTemp, v3);
            Vect3_Subtract(tsTemp, rayOrigin);
            Vect3_Dot(numerator, tsTemp, normal);

            var denominator;
            Vect3_Dot(denominator, normal, rayDir);

            if(Math.abs(denominator) < 0.0001)
            {
                //Degenerate case: prevent division by zero
                continue;
            }

            t = numerator / denominator;

            if(t < 0)
            {
                //prevent looking backwards along the ray
                continue;
            }

            //plug t back into the ray equation to get the point of intersection
            var intPt = new Float32Array[3];
            intPt[0] = rayOrigin[0] + rayDir[0]*t;
            intPt[1] = rayOrigin[1] + rayDir[1]*t;
            intPt[2] = rayOrigin[2] + rayDir[2]*t;

            //now that we know the intersection point between
            //the plane and the ray, find out if it lies inside the
            //bounds of the triangle
            ///////////////////////////////////////////////////

            //treat the vector from v3->v1 as the x axis of the
            //new coordinate system

            //find the xAxis vector
            var xAxisVector = new Float32Array[3];
            var xAxisLenSquared;
            Vect3_Copy(xAxisVector, v1);
            Vect3_Subtract(xAxisVector, v3);
            Vect3_LengthSquared(xAxisLenSquared, xAxisVector);
            var xAxisLen = Math.sqrt(xAxisLenSquared);

            //find the yAxis vector
            //(take another edge of the triangle
            //and subtract out the amount of xAxis it has mixed in)
            var yAxisVector = new Float32Array[3];
            var yAxisLenSquared;
            var xyOverlap;
            var yOverlap = new Float32Array[3];
            Vect3_Copy(yAxisVector, v2);
            Vect3_Subtract(yAxisVector, v3);
            Vect3_Dot(xyOverlap, yAxisVector, xAxisVector);
            xyOverlap /= xAxisLen;
            Vect3_Copy(yOverlap, xAxisVector);
            Vect3_Multiply(yOverlap, xyOverlap/xAxisLen);
            Vect3_Subtract(yAxisVector, yOverlap);
            Vect3_LengthSquared(yAxisLenSquared, yAxisVector);
            var yAxisLen = Math.sqrt(yAxisLenSquared);

            //find the intersection point relative to v3
            var lcIntPt = new Float32Array[3];
            var intPtX, intPtY;
            Vect3_Copy(lcIntPt, intPt);
            Vect3_Subtract(lcIntPt, v3);
            //find the x and y axis components of the point
            Vect3_Dot(intPtX, lcIntPt, xAxisVector);
            Vect3_Dot(intPtY, lcIntPt, yAxisVector);
            intPtX /= xAxisLen;
            intPtY /= yAxisLen;

           var xRange, yRange;
           xRange = yRange =  false;

           if( (intPtX >= (0 + (xyOverlap/yAxisLen)*intPtY)) )
               xRange = true;

           if( intPtY >=0 &&
                   (intPtX <= (xAxisLen - ((xAxisLen-xyOverlap)/yAxisLen)*intPtY)) )
               yRange = true;

            if( xRange && yRange )
                return true;
        }
        t = -1.0;
        return false;
    }
    
}
