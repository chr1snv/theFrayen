//Light.js

function Light(nameIn, sceneNameIn, colorIn, intensityIn, lightTypeIn, posIn, rotIn, coneAngleIn){
    this.Type = {
        Directional : 1,
        Point : 0,
        Spot : 2
    }

    var lname = nameIn;
    var sceneName = sceneNameIn;
    var ipoAnimation = new IPOAnimation(nameIn, sceneName);
    var pos       = new Float32Array([0,0,0]);
    var rot       = new Float32Array([0,0,0]);
    var color     = new Float32Array([0,0,0]);
    var intensity = intensityIn;
    var ambientIntensity = 0.0;
    var coneAngle = coneAngleIn !== undefined ? coneAngleIn : 180.0;
    var lightType = lightTypeIn !== undefined ? lightTypeIn : this.Type.Directional;

    var updatedTime = 0.0;

    //depending on the type of light, ignore constructor inputs
    Vect3_Copy(color, colorIn);
    if(lightType == this.Type.Directional){
        Vect3_Copy(rot, rotIn);
    }
    else if(lightType == this.Type.Point){
        Vect3_Copy(pos, posIn);
    }
    else{ //Spot
        Vect3_Copy(pos, posIn);
        Vect3_Copy(rot, rotIn);
    }

    
    this.GetName  = function()  { return lname; }
    this.GetPos   = function()  { return pos; }
    this.GetRot   = function()  { return rot; }
    this.GetColor = function()  { return color; }
    
    this.Update = function(time) { updatedTime = time; }

    this.BindToGL = function(lightNumber) {
        
        //pass color and intensity data
        var colIntens = new Array(4);
        Vect3_Copy(colIntens, color);
        colIntens[3] = intensity;
        gl.uniform4fv(
            gl.getUniformLocation(graphics.currentProgram, 'lightColor[' + lightNumber + ']'),
            colIntens );
        
        //get the position and rotation
        var position = new Array(3);
        var rotation = new Array(3);
        if(ipoAnimation.isValid){
            ipoAnimation.GetLocation(position, updatedTime);
            ipoAnimation.GetRotation(rotation, updatedTime);
        }
        else{ //if the ipo isn't valid just use the static values
            Vect3_Copy(position, pos);
            Vect3_Copy(rotation, rot);
        }

        //calculate the light direction normal
        var basisVect = [0.0,-1.0, 0.0];
        var lightNormal = new Array(4);
        var rotMatrix   = new Array(4*4);
        Matrix( rotMatrix, MatrixType.euler_rotate, rotation );
        Matrix_Multiply( lightNormal, rotMatrix, basisVect );
        
        //pass data dependent on the type of light
        if(lightType == this.Type.Directional){ //directional light
            lightNormal[3] = 0.0;
            Vect3_Negative(lightNormal);
            gl.uniform3f(
                gl.getUniformLocation(graphics.currentProgram, 'lightVector[' + lightNumber + ']'),
                lightNormal[0], lightNormal[1], lightNormal[2], lightNormal[3] );
            gl.uniform1f(
                gl.getUniformLocation(graphics.currentProgram, 'lightSpotConeAngle[' + lightNumber + ']'),
                180     );
        }
        else{ //either a point light or a spot light
            var lightPos = new Array(4);
            Vect3_Copy(lightPos, position);
            //lightPos[3] = 1.0;
            gl.uniform3f(
                gl.getUniformLocation(graphics.currentProgram, 'lightVector[' + lightNumber + ']'),
                lightPos[0], lightPos[1], lightPos[2] );
            
            //pass the direction and angle data (if spot)
            if(lightType == this.Type.Spot){
                lightNormal[3] = 1.0; //positional light
                gl.uniform4f(
                    gl.getUniformLocation(graphics.currentProgram, 'lightDirection[' + lightNumber + ']'), 
                    lightNormal[0], lightNormal[1], lightNormal[2], lightNormal[3] );
                gl.uniform1f(
                    gl.getUniformLocation(graphics.currentProgram, 'lightSpotConeAngle[' + lightNumber + ']'), 
                    coneAngle );
            }
            else{ //point light, set the spot cutoff to 180
                gl.uniform1f(
                    gl.getUniformLocation(graphics.currentProgram, 'lightSpotConeAngle[' + lightNumber + ']'), 
                    180 );
            }
        }
    }
}

