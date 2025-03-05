/*global EditTaskData, Dexie, Toodledo, Utils, $, Log*/
/*jslint laxbreak: true*/

Toodledo.prototype.getTasks = function(sync) {
	var self = this, d = $.Deferred(), getTasks = function() {
		var after = '', getDef = $.Deferred();
		if (self.syncTime.lastEditTask && self.syncTime.lastEditTask < self.user.lastedit_task) {
			after = '&after=' + self.syncTime.lastEditTask;
			Log.d('Sync: have edited tasks - ' + after + ': ' + self.syncTime.lastEditTask);
		}

		if (self.syncTime.lastEditTask && self.syncTime.lastEditTask >= self.user.lastedit_task) {
			Log.d('Sync: no edited tasks');
			getDef.resolve();
			return getDef.promise();
		}

		self.request('tasks/get.php', 'comp=0&fields=duedate,folder,duetime,status,order,context,priority' + after).then(function(response) {
			response.splice(0, 1);
			Log.d('Sync: set tasks - ' + response);
			self.setTasks(response).then(function(tasks) {
				self.syncTime.lastEditTask = self.user.lastedit_task;
				getDef.resolve(tasks);
			}, function(e) {
				getDef.reject(e);
			});
		}, function(err) {
			getDef.reject(err);
		});
		return getDef.promise();

	}, getDeletedTasks = function() {
		var delDef = $.Deferred();

		if (self.syncTime.lastDeleteTask && self.syncTime.lastDeleteTask >= self.user.lastdelete_task) {
			Log.d('Sync: no deleted tasks');
			getTasks().then(function(tasks) {
				delDef.resolve(tasks);
			}, function(err) {
				delDef.reject(err);
			});
			return delDef.promise();
		}
		self.request('tasks/deleted.php', 'after=' + self.syncTime.lastDeleteTask).then(function(response) {
			Log.d('Sync: have deleted tasks');
			response.splice(0, 1);
			self.deleteTasksFromDb(response).then(function() {
				self.syncTime.lastDeleteTask = self.user.lastdelete_task;
				getTasks().then(function(tasks) {
					delDef.resolve(tasks);
				}, function(err) {
					delDef.reject(err);
				});
			});
		}, function(err) {
			delDef.reject(err);
		});

		return delDef.promise();
	};

	if (!sync) {
		Log.d('Sync: no task sync');
		self.getFilteredTasks().then(function(tasks) {
			d.resolve(tasks);
		});
	} else {
		Log.d('Sync: sync tasks');
		getDeletedTasks().then(function() {
			self.getFilteredTasks().then(function(tasks) {
				d.resolve(tasks);
			});
		}, function(err) {
			d.reject(err);
		});
	}

	return d.promise();
};

Toodledo.prototype.setTasks = function(tasks) {
	var d = $.Deferred();

	if (!Array.isArray(tasks)) {
		tasks = [ tasks ];
	}

	this.db.tasks.bulkPut(tasks).then(function() {
		d.resolve(tasks);
	})['catch'](Dexie.BulkError, function(e) {
		d.reject(e);
	});

	return d.promise();
};

Toodledo.prototype.setTask = function(task) {
	var d = $.Deferred();

	this.db.tasks.put(task).then(function() {
		d.resolve(task);
	});
	return d.promise();
};

Toodledo.prototype.toDisplayDate = function(date) {
	if (!date) {
		return '';
	}
	var d = this.parseDate(date), replace = new RegExp('([.,;\\/ ]*' + d.getFullYear() + '\\s?\\D*)', 'g');
	return d.toLocaleDateString().replace(replace, '').trim();
};

Toodledo.prototype.getTodayTasks = function() {
	var today = [], self = this, overdue = [], d = $.Deferred();

	this.getFilteredTasksWithDate().then(function(tasks) {
		tasks.forEach(function(task) {

			var date = self.parseDate(task.duedate), now = tizen.time.getCurrentDateTime();

			if (date.getFullYear() === now.getFullYear()) {
				if (date.getMonth() === now.getMonth()) {
					if (date.getDate() === now.getDate()) {
						today.push(task);
						return;
					}
				}
			}

			if (date.earlierThan(now)) {
				overdue.push(task);
			}
		});
	}).then(function() {
		d.resolve({
			tasks : today,
			overdue : overdue
		});
	});

	return d.promise();
};

Toodledo.prototype.getNextTasks = function() {
	var tasks = [], overdue = [], self = this, d = $.Deferred();

	this.getFilteredTasksWithDate().then(function(tasks) {
		tasks.forEach(function(task) {

			var date = self.parseDate(task.duedate), now = tizen.time.getCurrentDateTime(), week = tizen.time.getCurrentDateTime().addDuration(new tizen.TimeDuration(7, "DAYS"));

			if (date.getFullYear() === now.getFullYear()) {
				if (date.getMonth() === now.getMonth()) {
					if (date.getDate() === now.getDate()) {
						tasks.push(task);
						return;
					}
				}
			}

			if (date.earlierThan(week) && date.laterThan(now)) {
				if (tasks.indexOf(task) === -1) {
					tasks.push(task);
					return;
				}
			}

			if (date.earlierThan(now)) {
				overdue.push(task);
			}

		});
	}).then(function() {
		d.resolve({
			tasks : tasks,
			overdue : overdue
		});
	});

	return d.promise();
};

Toodledo.prototype.createTask = function(editTask) {
	var self = this, uuid = Utils.generateUUID(), d = $.Deferred(),

	task = {
		id : uuid,
		completed : 0,
		title : editTask.title,
		folder : encodeURI(editTask.newProjectId ? editTask.newProjectId : editTask.projectId),
		status : editTask.status,
		context : editTask.contextId,
		duedate : editTask.dateString,
		ref : uuid,
		syncStatus : Toodledo.SYNC_STATUS.CREATE
	};

	this.setTask(task).then(function(task) {
		d.resolve(task);
		self.createTasks([ task ]);
	});
	return d.promise();
};

Toodledo.prototype.createTasks = function(tasks) {

	var d = $.Deferred(), cmd = [], self = this;

	if (!tasks || tasks.length === 0) {
		d.resolve();
		return d.promise();
	}

	if (!Array.isArray(tasks)) {
		tasks = [ tasks ];
	}

	tasks.forEach(function(task) {
		cmd.push(Toodledo.createUpdateTaskCommand(task));
	});

	self.request('tasks/add.php', 'tasks=' + JSON.stringify(cmd) + '&fields=folder,status,duedate,context').then(function(res) {
		if (!res[0].errorCode) {
			tasks.forEach(function(task) {
				task.syncStatus = Toodledo.SYNC_STATUS.OK;
			});

			self.deleteTasksFromDb(tasks).then(function() {
				self.setTasks(res).then(function(tasks) {
					d.resolve(tasks);
				});
			});
		}
	}, function(err) {
		d.reject(err);
	});

	return d.promise();

};

Toodledo.prototype.getFilteredTasks = function() {
	var d = $.Deferred();

	this.db.tasks.where('completed').equals(0).toArray(function(tasks) {
		d.resolve(tasks);
	});

	return d.promise();
};

Toodledo.prototype.getFilteredTasksWithDate = function() {
	var d = $.Deferred();

	this.db.tasks.where('completed').equals(0).filter(function(tasks) {
		return tasks.duedate;
	}).toArray(function(tasks) {
		d.resolve(tasks);
	});

	return d.promise();
};

Toodledo.prototype.checkTask = function(id) {
	var self = this, d = $.Deferred();

	this.getTaskById(id).then(function(task) {
		task.completed = Toodledo.dateToUNIX(tizen.time.getCurrentDateTime());
		task.syncStatus = Toodledo.SYNC_STATUS.CHECK;
		self.setTask(task).then(function(task) {
			d.resolve(task);
			self.checkTasks([ task ]);
		});
	});

	return d.promise();
};

Toodledo.prototype.checkTasks = function(tasks) {
	var cmd = [], d = $.Deferred(), self = this;

	if (!tasks || tasks.length === 0) {
		d.resolve();
		return d.promise();
	}

	if (!Array.isArray(tasks)) {
		tasks = [ tasks ];
	}

	tasks.forEach(function(task) {
		cmd.push({
			id : task.id,
			completed : task.completed
		});
	});

	this.request('tasks/edit.php', 'tasks=' + JSON.stringify(cmd)).then(function() {
		tasks.forEach(function(task) {
			task.syncStatus = Toodledo.SYNC_STATUS.OK;
		});

		self.setTasks(tasks).then(function() {
			d.resolve();
		});
	}, function(err) {
		d.reject(err);
	});

	return d.promise();
};

Toodledo.createUpdateTaskCommand = function(task) {
	var cmd = {
		id : task.id,
		title : task.title,
		status : task.status,
		completed : task.completed,
	};

	if (task instanceof EditTaskData) {
		cmd.folder = task.newProjectId ? task.newProjectId : task.projectId;
		cmd.context = task.contextId;
		cmd.duedate = task.dateString;
	} else {
		cmd.folder = task.folder;
		cmd.context = task.context;
		cmd.duedate = task.duedate;
	}
	return cmd;
};

Toodledo.prototype.updateTask = function(task) {
	var self = this, d = $.Deferred();

	this.getTaskById(task.id).then(function(t) {
		if (task instanceof EditTaskData) {
			if (task.title) {
				t.title = task.title;
			}
			if (task.newProjectId || task.newProjectId === 0 || task.projectId || task.projectId === 0) {
				t.folder = parseInt((task.newProjectId || task.newProjectId === 0) ? task.newProjectId : task.projectId);
			}
			if (task.status || task.status === 0) {
				t.status = task.status;
			}
			if (task.contextId || task.contextid === 0) {
				t.context = task.contextId;
			}
			if (task.completed || task.completed === 0) {
				t.completed = task.completed;
			}
			if (task.dateString || task.dateString === 0) {
				t.duedate = task.dateString;
			}
		} else {
			t = task;
		}
		t.syncStatus = Toodledo.SYNC_STATUS.UPDATE;
		self.setTask(t).then(function(t) {
			d.resolve(t);
			self.updateTasks([ t ]);
		});
	});

	return d.promise();
};

Toodledo.prototype.updateTasks = function(tasks) {

	var cmd = [], d = $.Deferred(), self = this;

	if (!tasks || tasks.length === 0) {
		d.resolve();
		return d.promise();
	}

	if (!Array.isArray(tasks)) {
		tasks = [ tasks ];
	}

	tasks.forEach(function(task) {
		cmd.push(Toodledo.createUpdateTaskCommand(task));
	});

	this.request('tasks/edit.php', 'tasks=' + JSON.stringify(cmd)).then(function() {
		tasks.forEach(function(task) {
			task.syncStatus = Toodledo.SYNC_STATUS.OK;
		});

		self.setTasks(tasks).then(function() {
			d.resolve();
		});
	}, function(err) {
		d.reject(err);
	});

	return d.promise();
};

Toodledo.prototype.sendNotSynchedTasks = function() {
	var d = $.Deferred(), self = this;

	this.db.tasks.where('syncStatus').notEqual(Toodledo.SYNC_STATUS.OK).toArray(function(tasks) {

		var createTasks = [], updateTasks = [], checkTasks = [];

		if (tasks.length === 0) {
			d.resolve();
			return;
		}

		tasks.forEach(function(task) {
			switch (task.syncStatus) {
			case Toodledo.SYNC_STATUS.CHECK:
				checkTasks.push(task);
				break;
			case Toodledo.SYNC_STATUS.UPDATE:
				updateTasks.push(task);
				break;
			case Toodledo.SYNC_STATUS.CREATE:
				createTasks.push(task);
				break;
			}
		});

		self.createTasks(createTasks).always(function() {
			self.updateTasks(updateTasks).always(function() {
				self.checkTasks(checkTasks).always(function() {
					d.resolve();
				});
			});
		});

	});

	return d.promise();
};

Toodledo.prototype.deleteTasksFromDb = function(tasks) {
	var i = 0, ids = [], d = $.Deferred();

	if (!tasks || !tasks.length || tasks.length === 0) {
		d.resolve();
		return d.promise();
	}

	for (i = 0; i < tasks.length; i++) {
		ids.push(tasks[i].id);
	}

	this.db.tasks.where('id').anyOf(ids)['delete']().then(function() {
		d.resolve();
	});

	return d.promise();
};

Toodledo.prototype.deleteTask = function(id) {
	var self = this, d = $.Deferred();

	this.db.tasks.where('id').equals(parseInt(id))['delete']().then(function() {
		self.request('tasks/delete.php', 'tasks=' + JSON.stringify([ id ])).then(function() {
			d.resolve();
		}, function(err) {
			d.reject(err);
		});
	});

	return d.promise();
};

Toodledo.prototype.getTasksByLabelId = function(labelId) {
	var d = $.Deferred();
	this.db.tasks.where({context: parseInt(labelId, 0), completed: 0}).toArray(function(arr) {
		d.resolve(arr);
	});
	return d.promise();
};

Toodledo.prototype.getTasksByProjectId = function(projectId) {
	var d = $.Deferred();
	this.db.tasks.where({ folder : parseInt(projectId, 0), completed: 0}).toArray(function(tasks) {
		d.resolve(tasks);
	});

	return d.promise();
};

Toodledo.prototype.getTaskById = function(id) {
	var d = $.Deferred();

	this.db.tasks.where({id : parseInt(id, 0), completed: 0}).first(function(task) {
		d.resolve(task);
	});

	return d.promise();
};

Toodledo.prototype.getTasksByStatus = function(status) {
	var d = $.Deferred();

	this.db.tasks.where({status : parseInt(status, 0), completed: 0}).toArray(function(tasks) {
		d.resolve(tasks);
	});

	return d.promise();
};

Toodledo.prototype.getTasksCountByStatus = function(status) {
	var d = $.Deferred();

	this.db.tasks.where({ status : parseInt(status, 0), completed: 0}).count(function(count) {
		d.resolve(count);
	});

	return d.promise();
};

Toodledo.prototype.getTasksByPriority = function(id) {
	var d = $.Deferred();
	this.db.tasks.where({priority: id, completed: 0}).toArray(function(arr) {
		d.resolve(arr);
	});
	return d.promise();
};

Toodledo.prototype.getTasksCountByPriority = function() {
	var d = $.Deferred();

	var i = 0, j = 0, result = [], count = 0;

	this.getFilteredTasks().then(function(tasks) {

		for (i = 0; i < Toodledo.PRIORITY.length; i++) {
			count = 0;
			for (j = 0; j < tasks.length; j++) {
				if (tasks[j].priority === Toodledo.PRIORITY[i]) {
					count++;
				}
			}
			result.push({
				priority : Toodledo.PRIORITY[i],
				count : count
			});
		}
		d.resolve(result);
	}, false);
	return d.promise();
};
