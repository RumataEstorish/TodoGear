/*global Utils, Toodledo*/

/*jshint unused: false*/
/*jslint laxbreak: true*/
function EditTaskData(id, title, projectId, dueDate, _contextId) {
	var _title = title, contextId = _contextId, _projectId = projectId, _newProjectId = null, completed = null, _dueDate = dueDate, _id = id;
	if (!_id) {
		_id = Utils.generateUUID();
	}

	Object.defineProperty(this, "id", {
		get : function() {
			return _id;
		},
		set : function(val) {
			_id = val;
		}
	});
	
	Object.defineProperty(this, 'completed', {
		get : function(){
			return completed;
		},
		set : function(val){
			completed = val;
		}
	});
	
	Object.defineProperty(this, 'contextId', {
		get : function(){
			return contextId;
		},
		set : function(val){
			contextId = val;
		}
	});

	Object.defineProperty(this, "title", {
		get : function() {
			return _title;
		},
		set : function(val) {
			_title = val;
		}
	});

	Object.defineProperty(this, "newProjectId", {
		get : function() {
			return _newProjectId;
		},
		set : function(val) {
			_newProjectId = val;
		}
	});

	Object.defineProperty(this, "projectId", {
		get : function() {
			return _projectId;
		},
		set : function(val) {
			_projectId = val;
		}
	});

	Object.defineProperty(this, "dueDate", {
		get : function() {
			if (_dueDate) {
				if (!(_dueDate instanceof tizen.TZDate)) {
					_dueDate = new tizen.TZDate(new Date(_dueDate));
				}
				return _dueDate.toYYYYMMDDTHHMM();
			}
			return _dueDate;
		},
		set : function(val) {
			_dueDate = val;
		}
	});
	Object.defineProperty(this, "dateString", {
		get : function() {
			if (_dueDate === 0){
				return 0;
			}
			if (_dueDate) {
				if (!(_dueDate instanceof tizen.TZDate)) {
					_dueDate = new tizen.TZDate(new Date(_dueDate));
				}
				return Toodledo.dateToUNIX(_dueDate);
			}

		}
	});
}

EditTaskData.prototype.copyToTask = function(task){
	if (this.title){
		task.title = this.title;
	}
	if (this.newProjectId || this.newProjectId === 0 || this.projectId || this.projectId === 0) {
		task.folder = parseInt((this.newProjectId || this.newProjectId === 0) ? this.newProjectId
				: this.projectId);
	}
	if (this.status || this.status === 0) {
		task.status = this.status;
	}
	if (this.contextId || this.contextid === 0) {
		task.context = this.contextId;
	}
	if (this.completed || this.completed === 0) {
		task.completed = this.completed;
	}
	if (this.dateString || this.dateString === 0) {
		task.duedate = this.dateString;
	}
};