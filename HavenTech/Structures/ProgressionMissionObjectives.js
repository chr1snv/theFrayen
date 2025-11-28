//# sourceURL=Structures/ProgressionMissionObjectives.js
//progression - overall game completion
//mission - a task with objectives to be completed sequentially or seprately (in parallel)
//objective - a task to be completed (has conditions)

function Progression(){
	this.completedMissions = [];
	this.missions = [];
}

function Mission(){
	this.objectives = [];
	this.mname = "";
}

function Objective(){
	this.explination = "";
	this.completed = false;
	this.hiddenUntilPrevObjectiveCompleted = true;
}
