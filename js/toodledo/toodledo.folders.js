/*global Toodledo, Dexie, LANG_JSON_DATA, $, Log*/
Toodledo.prototype.getFolders = function() {
	var self = this, d = $.Deferred(), emptyFolder = { id : 0, name : LANG_JSON_DATA.INBOX, ord : 0, 'private' : 0 };

	if (!self.syncTime.lastEditFolder || self.syncTime.lastEditFolder < self.user.lastedit_folder) {
		
		Log.d('Sync: have edit folder');
		
		self.request('folders/get.php', null).then(function(response) {
			if (response && response.length > 0) {
				response.splice(0, 0, emptyFolder);
			} else {
				response = [ emptyFolder ];
			}

			// Clear old folders
			self.db.projects.clear().then(function() {
				// Write new folders
				self.setFolders(response).then(function() {
					// Update last time receive folders
					self.syncTime.lastEditFolder = self.user.lastedit_folder;
					// Sort folder
					self.db.projects.orderBy('ord').toArray(function(projects) {
						d.resolve(projects);
					});
				});
			});
		}, function(err){
			d.reject(err);
		});
	} else {
		
		Log.d('Sync: no edit folder');
		
		self.db.projects.orderBy('ord').toArray(function(projects) {
			d.resolve(projects);
		});
	}

	return d.promise();
};

Toodledo.prototype.setFolders = function(folders) {
	var d = $.Deferred();

	this.db.projects.bulkPut(folders).then(function() {
		d.resolve();
	})['catch'](Dexie.BulkError, function(e) {
		d.reject(e);
	});

	return d.promise();
};

Toodledo.prototype.getFolderById = function(id) {
	var d = $.Deferred();

	this.db.projects.where('id').equals(parseInt(id, 0)).first(function(folder) {
		d.resolve(folder);
	});

	return d.promise();
};

Toodledo.prototype.getTasksCountByFolders = function(folders) {
	var i = 0, j = 0, result = [], count = 0, d = $.Deferred();

	this.getTasks().then(function(tasks) {
		for (i = 0; i < folders.length; i++) {
			count = 0;
			for (j = 0; j < tasks.length; j++) {
				if (tasks[j].folder === folders[i].id) {
					count++;
				}
			}
			result.push({
				project : folders[i],
				count : count
			});
		}
		d.resolve(result);
	}, false);

	return d.promise();
};