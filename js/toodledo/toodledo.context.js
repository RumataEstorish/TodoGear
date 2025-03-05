/*global Toodledo, LANG_JSON_DATA, Dexie, $, Log*/
Toodledo.prototype.getLabels = function() {
	var self = this, d = $.Deferred(), emptyLabel = {
		id : 0,
		name : LANG_JSON_DATA.EMPTY_LABEL,
		'private' : 0
	};

	if (!self.syncTime.lastEditContext || self.syncTime.lastEditContext < self.user.lastedit_context) {
		Log.d('Sync: have edit context');
		self.request('contexts/get.php', null).then(function(response) {
			if (response && response.length > 0) {
				response.splice(0, 0, emptyLabel);
			} else {
				response = [ emptyLabel ];
			}

			// Clear old context
			self.db.labels.clear().then(function() {
				// Write new context
				self.setLabels(response).then(function() {
					self.syncTime.lastEditContext = self.user.lastedit_context;
					// Return context
					self.db.labels.toArray(function(labels) {
						d.resolve(labels);
					});
				});
			});
		}, function(err){
			d.reject(err);
		});
	}
	else{
		Log.d('Sync: no edit context');
		self.db.labels.toArray(function(labels){
			d.resolve(labels);
		});
	}
	
	return d.promise();
};

Toodledo.prototype.setLabels = function(labels) {

	var d = $.Deferred();
	this.db.labels.bulkPut(labels).then(function() {
		d.resolve();
	})['catch'](Dexie.BulkError, function(e) {
		d.reject(e);
	});

	return d.promise();
};

Toodledo.prototype.getLabelById = function(id) {
	var d = $.Deferred();

	this.db.labels.where('id').equals(parseInt(id, 0)).first(function(label) {
		d.resolve(label);
	});

	return d.promise();
};

Toodledo.prototype.getTasksCountByLabels = function(labels) {
	var i = 0, j = 0, result = [], count = 0, d = $.Deferred();

	this.getTasks().then(function(tasks) {
		for (i = 0; i < labels.length; i++) {
			count = 0;
			for (j = 0; j < tasks.length; j++) {
				if (tasks[j].context === labels[i].id) {
					count++;
				}
			}
			result.push({
				label : labels[i],
				count : count
			});
		}
		d.resolve(result);
	});

	return d.promise();
};