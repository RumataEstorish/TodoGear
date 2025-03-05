SyncTime.LAST_EDIT_TASK = 'LAST_EDIT_TASK';
SyncTime.LAST_DELETE_TASK = 'LAST_DELETE_TASK';
SyncTime.LAST_EDIT_FOLDER = 'LAST_EDIT_FOLDER';
SyncTime.LAST_EDIT_CONTEXT = 'LAST_EDIT_CONTEXT';

function SyncTime(){

	var lastEditTask = localStorage.getItem(SyncTime.LAST_EDIT_TASK), 
	lastDeleteTask = localStorage.getItem(SyncTime.LAST_DELETE_TASK), 
	lastEditFolder = localStorage.getItem(SyncTime.LAST_EDIT_FOLDER), 
	lastEditContext = localStorage.getItem(SyncTime.LAST_EDIT_CONTEXT);
	
	Object.defineProperty(this, 'lastEditTask', {
		get : function(){
			return lastEditTask;
		},
		set : function(val){
			lastEditTask = val;
			localStorage.setItem(SyncTime.LAST_EDIT_TASK, val);
		}
	});
	
	Object.defineProperty(this, 'lastDeleteTask', {
		get : function(){
			return lastDeleteTask;
		},
		set : function(val){
			lastDeleteTask = val;
			localStorage.setItem(SyncTime.LAST_DELETE_TASK, val);
		}
	});
	
	Object.defineProperty(this, 'lastEditFolder', {
		get : function(){
			return lastEditFolder;
		},
		set : function(val){
			lastEditFolder = val;
			localStorage.setItem(SyncTime.LAST_EDIT_FOLDER, val);
		}
	});
	
	Object.defineProperty(this, 'lastEditContext', {
		get : function(){
			return lastEditContext;
		},
		set : function(val){
			lastEditContext = val;
			localStorage.setItem(SyncTime.LAST_EDIT_CONTEXT, val);
		}
	});
}

SyncTime.prototype.clear = function(){
	this.lastEditTask = null;
	this.lastDeleteTask = null;
	this.lastEditFolder = null;
	this.lastEditContext = null;
};

