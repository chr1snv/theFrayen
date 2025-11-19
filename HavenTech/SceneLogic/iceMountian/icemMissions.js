



function iceMObjectives(){
	this.progression = new Progression();

	let newMission = new Mission();
	newMission.mname = "Intro Story";
	
	let newObjective = new Objective();
	newObjective.explination = "Meet Leana";
	newObjective.completed = false;
	newMission.objectives.push( newObjective );
	
	newObjective = new Objective();
	newObjective.explination = "Pillow Fight";
	newObjective.completed = false;
	newMission.objectives.push( newObjective );
	
	newObjective = new Objective();
	newObjective.explination = "Watch News";
	newObjective.completed = false;
	newMission.objectives.push( newObjective );

	newObjective = new Objective();
	newObjective.explination = "Devise Plan";
	newObjective.completed = false;
	newMission.objectives.push( newObjective );

	this.progression.missions.push( newMission );


	newMission = new Mission();
	newMission.mname = "Fight for Survival";

	newObjective = new Objective();
	newObjective.explination = "Fight Way out of Ice House";
	newObjective.completed = false;
	newMission.objectives.push( newObjective );

	newObjective = new Objective();
	newObjective.explination = "Reach Craft";
	newObjective.completed = false;
	newMission.objectives.push( newObjective );

	this.progression.missions.push( newMission );



	newMission = new Mission();
	newMission.mname = "Get to Town to save others";

	newObjective = new Objective();
	newObjective.explination = "Find Battery To Start Craft";
	newObjective.completed = false;
	newMission.objectives.push( newObjective );

	newObjective = new Objective();
	newObjective.explination = "Fly to Town To Repair first network Hub";
	newObjective.completed = false;
	newMission.objectives.push( newObjective );

	this.progression.missions.push( newMission );

}
