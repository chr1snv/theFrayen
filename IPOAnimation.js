//IPOAnimation.js

function IPOAnimation(nameIn, sceneNameIn){
    this.ipoName = nameIn;
    this.sceneName = sceneNameIn;

    // animation data
    this.curves = {};

    this.duration;

    this.isValid = false;

    this.GetLocation = function(ret, time)
    {
        var success = false;
        //get location
        Vect3_Zero(ret);
        if(this.curves.LocX){
            ret[0] = this.curves.LocX.GetValue(time);
            success = true;
        }
        if(this.curves.LocY){
            ret[2] = -this.curves.LocY.GetValue(time);
            success = true;
        }
        if(this.curves.LocZ){
            ret[1] = this.curves.LocZ.GetValue(time);
            success = true;
        }
        return success;
    }
    this.GetRotation = function(rot, time)
    {
        var success = false;

        //get rotation (blender stores it as degrees/10)
        Vect3_Zero(rot);
        if(this.curves.RotX){
            rot[0] = this.curves.RotX.GetValue(time)*Math.PI/18.0;
            success = true;
        }
        if(this.curves.RotY){
            rot[2] = -this.curves.RotY.GetValue(time)*M_PI/18.0;
            success = true;
        }
        if(this.curves.RotZ){
            rot[1] = this.curves.RotZ.GetValue(time)*M_PI/18.0;
            success = true;
        }
        return success;
    }
    this.GetScale = function(scale, time)
    {
        var success = false;
        //get scale
        scale = [1,1,1];
        if(this.curves.ScaleX){
            scale[0] = this.curves.ScaleX.GetValue(time);
            success = true;
        }
        if(iter != this.curves.ScaleY){
            scale[2] = this.curves.ScaleY.GetValue(time);
            success = true;
        }
        if(this.curves.ScaleZ){
            scale[1] = this.curves.ScaleZ.GetValue(time);
            success = true;
        }
        return success;
    }

    this.GetMatrix = function(outMat, time)
    {
        if(!isValid)
            return;

        var location = new Array(3);
        GetLocation(location, time);

        var rot = new Array(3);
        GetRotation(rot, time);

        //get scale
        var scale = new Array(3);
        GetScale(scale, time);

        //return the corresponding matrix
        Matrix(outMat, MatrixType.euler_transformation, scale, rot, location);
    }

    this.GetDuration = function(){ return duration; }

    //constructor functionality
    var txtFile = loadTextFileSynchronous( 'scenes/' + this.sceneName + '/IPOs/' + this.ipoName + '.hvtIPO' );
    if(txtFile === undefined)
        return;
    var textFileLines = txtFile.split('\n');
    for(var lineNum = 0; lineNum < textFileLines.length; ++lineNum )
    {
        var temp = textFileLines[ lineNum ];
        if(temp[0] == 'c') //this is the start of a curve
        {
            var words = temp.split(' ');
            var curveName = words[1];
            this.curves[curveName] = new Curve();
            while( ++lineNum < textFileLines.length )
            {
                temp = textFileLines[lineNum];
                if(temp[0] == 'i') //this is the curve interpolation type
                {
                    var words = temp.split(' ');
                    this.curves[curveName].interpolationType = parseInt(words[1]);
                }
                //read in the bezier points
                if(temp[0] == 'b')
                {
                    while( ++lineNum < textFileLines.length )
                    {
                        temp = textFileLines[lineNum];
                        words = textFileLines[lineNum];
                        //read in a point
                        if(temp[0] == 'p')
                            this.curves[curveName].InsertPoint(parseFloat(words[1]), parseFloat(words[2]));
                        if(temp[0] == 'e'){
                            var tempDuration = this.curves[curveName].GetLength();
                            if(tempDuration > this.duration) //set the duration
                                this.duration = tempDuration;
                            break; // finish reading in bezier points
                        }
                    }
                }
                if(temp[0] == 'e')
                    break; //done reading in this curves data
            }
        }
    }
    this.isValid = true;
};
