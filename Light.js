//Light.js

function Light(nameIn, sceneNameIn, colorIn, intensityIn, lightTypeIn, posIn, rotIn, coneAngleIn){
    this.Type = {
        Directional : "Directional",
        Point : "Point",
        Spot : "Spot"
    }

    var lname = nameIn;
    var sceneName = sceneNameIn;
    var ipoAnimation = new IPOAnimation(nameIn, sceneName);
    var pos = [];
    var rot = [];
    var color = [];
    var intensity = intensityIn;
    var ambientIntensity = 0.0;
    var coneAngle = coneAngleIn !== undefined ? coneAngleIn : 180.0;
    var lightType = lightTypeIn !== undefined ? lightTypeIn : this.Type.Directional;

    var updatedTime = 0.0;

    //depending on the type of light, igonore constructor inputs
    Vect3_Copy(color, colorIn);
    
    if(lightType == Light_Type::Directional){
        Vect3_Copy(rot, rotIn);
    }
    else if(lightType == Light_Type::Point){
        Vect3_Copy(pos, posIn);
    }
    else{ //Spot
        Vect3_Copy(pos, posIn);
        Vect3_Copy(rot, rotIn);
    }

    
    this.GetName = function(){ return lname; }
    this.GetPos() = function() { return pos; }
    this.GetRot() = function() { return rot; }
    this.GetColor() = function() { return color; }
    
    this.Update = function(time) { updatedTime = time; }

    this.BindToGL = function(lightEnum) {}
}

