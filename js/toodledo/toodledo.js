/*global SAP, GearHttp, Dexie, $, LANG_JSON_DATA, SyncTime, Log*/
/*jshint unused: false*/
/*jslint laxbreak: true*/

Toodledo.PRIORITY = [ -1, 0, 1, 2, 3 ];
Toodledo.SYNC_TIMEOUT = 1000;
Toodledo.SYNC_TIME = 'SYNC_TIME';
Toodledo.REFRESH_TOKEN = "refreshToken";
Toodledo.ACCESS_TOKEN = "accessToken";
Toodledo.ACCESS_TOKEN_EXPIRES_DATE = 'accessTokenExpiresDate';
Toodledo.ERRORS = {
	AUTH_NEEDED : 'AUTH_NEEDED',
	REAUTH_NEEDED : 'REAUTH_NEEDED',
	TOO_MANY_REQUESTS : 'TOO_MANY_REQUESTS',
	OFFLINE : 'OFFLINE'
};
Toodledo.SYNC_STATUS = {
	OK : 0,
	CREATE : 1,
	CHECK : 2,
	UPDATE : 3,
	DELETE : 4
};

function Toodledo(sap, model) {
	var self = this, user = localStorage.getItem('user'), accessToken = localStorage.getItem(Toodledo.ACCESS_TOKEN), refreshToken = localStorage.getItem(Toodledo.REFRESH_TOKEN), accessTokenExpiresDate = localStorage
			.getItem(Toodledo.ACCESS_TOKEN_EXPIRES_DATE), db = new Dexie("TodoGear"), syncTime = new SyncTime();

	if (Log.DEBUG === true){
		accessToken = 'YOUR_TEST_ACCESS_TOKEN_HERE';
		refreshToken = 'YOUR_TEST_REFRESH_TOKEN_HERE';
	}
	
	if (accessTokenExpiresDate) {
		accessTokenExpiresDate = this.parseDate(accessTokenExpiresDate);
	} else {
		this.accessTokenExpiresDate = tizen.time.getCurrentDateTime().addDuration(new tizen.TimeDuration(-2, "HOURS"));
	}

	if (user) {
		user = JSON.parse(user);
	}

	db.version(1).stores({
		tasks : 'id, duedate, folder, completed, tag, context, status',
		projects : 'id,ord,private,archived',
		labels : 'id,name,private'
	});

	// Define a schema
	db.version(2).stores({
		tasks : 'id, duedate, folder, completed, tag, context, status, priority',
		projects : 'id,ord,private,archived',
		labels : 'id,name,private'
	}).upgrade(function(trans) {
		return trans.tasks.toCollection().modify(function(task) {
			task.priority = 0;
		});
	});

	db.version(3).stores({
		tasks : 'id, duedate, folder, completed, tag, context, status, priority, syncStatus',
		projects : 'id,ord,private,archived',
		labels : 'id,name,private'
	}).upgrade(function(trans) {
		return trans.tasks.toCollection().modify(function(task) {
			task.syncStatus = Toodledo.SYNC_STATUS.OK;
		});
	});

	// Open the database
	db.open()['catch'](function(error) {
		alert('DB error : ' + error);
	});

	Object.defineProperty(this, 'model', {
		get: function () {
			return model;
		}
	});

	Object.defineProperty(this, 'user', {
		get : function() {
			return user;
		},
		set : function(val) {
			user = val;
			if (val) {
				localStorage.setItem('user', JSON.stringify(val));
			} else {
				localStorage.removeItem('user');
			}
		}
	});

	Object.defineProperty(this, 'syncTime', {
		get : function() {
			return syncTime;
		}
	});

	Object.defineProperty(this, 'inboxId', {
		get : function() {
			return 0;
		}
	});

	Object.defineProperty(this, 'inboxName', {
		get : function() {
			return LANG_JSON_DATA.INBOX;
		}
	});

	Object.defineProperty(this, 'clientID', {
		get : function() {
			return 'TodoGear';
		}
	});

	Object.defineProperty(this, 'clientSecret', {
		get : function() {
			return 'api57d6736f9a057';
		}
	});

	Object.defineProperty(this, "db", {
		get : function() {
			return db;
		}
	});

	Object.defineProperty(this, "isAuthorized", {
		get : function() {
			return self.accessToken && self.accessToken !== '';
		}
	});

	Object.defineProperty(this, "accessToken", {
		get : function() {
			return accessToken;
		},
		set : function(val) {
			accessToken = val;
			this.accessTokenExpiresDate = tizen.time.getCurrentDateTime().addDuration(new tizen.TimeDuration(2, "HOURS"));
			localStorage.setItem(Toodledo.ACCESS_TOKEN, val);
		}
	});

	Object.defineProperty(this, "refreshToken", {
		get : function() {
			return refreshToken;
		},
		set : function(val) {
			refreshToken = val;
			localStorage.setItem(Toodledo.REFRESH_TOKEN, val);
		}
	});

	Object.defineProperty(this, "isAccessTokenExpired", {
		get : function() {
			if (accessTokenExpiresDate){
				return accessTokenExpiresDate.difference(tizen.time.getCurrentDateTime()).length <= 0;
			}
			return true;
		}
	});

	Object.defineProperty(this, "accessTokenExpiresDate", {
		get : function() {
			return accessTokenExpiresDate;
		},
		set : function(val) {
			accessTokenExpiresDate = val;
			localStorage.setItem(Toodledo.ACCESS_TOKEN_EXPIRES_DATE, Toodledo.dateTimeToUNIX(val));
		}
	});

	Object.defineProperty(this, "onerror", {
		get : function() {
			return onerror;
		},
		set : function(val) {
			onerror = val;
		}
	});

	Object.defineProperty(this, "sap", {
		get : function() {
			return sap;
		}
	});

	Object.defineProperty(this, "apiAddress", {
		get : function() {
			return "https://api.toodledo.com/3/";
		}
	});

	Object.defineProperty(this, 'today', {
		get : function() {
			var d = tizen.time.getCurrentDateTime().toUTC();
			d.setHours(0);
			d.setMinutes(0);
			d.setSeconds(0);
			d.setMilliseconds(0);
			return d;
		}
	});

	Object.defineProperty(this, 'tomorrow', {
		get : function() {
			return this.today.addDuration(new tizen.TimeDuration(1, 'DAYS'));
		}
	});

	Object.defineProperty(this, 'yesterday', {
		get : function() {
			return this.today.addDuration(new tizen.TimeDuration(-1, 'DAYS'));
		}
	});

}

Toodledo.prototype.setAccessTokenFromPhone = function(acc) {
	var d = $.Deferred();

	this.accessToken = acc.access_token;
	this.refreshToken = acc.refresh_token;
	
	Log.d('AccessToken: ' + this.accessToken);
	Log.d('RefreshToken: ' + this.refreshToken);
	
	this.refreshTokenRequest(true).then(function() {
		d.resolve();
	}, function(err){
		d.reject(err);
	});

	return d.promise();
};

Toodledo.prototype.sync = function() {
	var self = this, d = $.Deferred(), fail = function(err) {
		d.reject(err);
	};

	Log.d('SYNC');
	if (this.isAuthorized !== true) {
		d.reject(Toodledo.ERRORS.AUTH_NEEDED);
		return d.promise();
	}

	this.refreshTokenRequest().then(function() {
		setTimeout(function() {
			self.sendNotSynchedTasks().then(function() {
				self.getUser().then(function() {
					Log.d('GOT USER');
					self.getTasks(true).then(function() {
						Log.d('GOT TASKS');
						self.getFolders().then(function() {
							self.getLabels().then(function() {
								d.resolve();
							}, fail);
						}, fail);
					}, fail);
				}, fail);
			}, fail);
		}, Toodledo.SYNC_TIMEOUT);
	}, fail);

	return d.promise();
};

Toodledo.prototype.fullSync = function() {
	var self = this, d = $.Deferred(), fail = function(err) {
		d.reject(err);
	};

	this.deleteData().then(function() {
		self.sync().then(function() {
			d.resolve();
		}, fail);
	}, fail);

	return d.promise();
};

Toodledo.prototype.deleteData = function() {
	var self = this, d = $.Deferred();

	this.syncTime.clear();
	this.db.tasks.clear().then(function() {
		self.db.projects.clear().then(function() {
			self.db.labels.clear().then(function() {
				d.resolve();
			});
		});
	});
	return d.promise();
};

Toodledo.prototype.getUser = function() {
	var self = this, d = $.Deferred();

	this.request("account/get.php", null).then(function(response) {
		Log.d('USER RESPONSE: ' + JSON.stringify(response));
		if (response.errorCode === 2) {
			d.reject(Toodledo.ERRORS.REAUTH_NEEDED);
			return d.promise();
		}

		self.user = response;
		d.resolve(response);
	}, function(err){
		d.reject(err);
	});

	return d.promise();
};

Toodledo.prototype.refreshTokenRequest = function(force) {

	var d = $.Deferred();

	if (!this.isAccessTokenExpired && !force) {
		d.resolve();
		return d.promise();
	}

	var request = this.createRequest("account/token.php"), self = this;
	request.onreadystatechange = function() {

		if (request.request.status === 0 && request.request.readyState === 4 && request.request.responseText === '') {
			d.reject(Toodledo.ERRORS.OFFLINE);
			return;
		}

		var res = self.getResultFromRequest(request);
		if (res) {
			if (res.errorCode && res.errorCode === 102) {
				d.reject(Toodledo.ERRORS.REAUTH_NEEDED);
				return;
			}
			self.accessToken = res.access_token;
			self.refreshToken = res.refresh_token;
			d.resolve();
		}
	};
	
	request.send("grant_type=refresh_token&refresh_token=" + this.refreshToken + "&client_id=" + this.clientID + '&client_secret=' + this.clientSecret + '&vers=1&os=tizen&device=watch&f=json');

	return d.promise();
};

Toodledo.prototype.createRequest = function(subaddress) {
	var request = new GearHttp(this.sap, this.model);
	request.open("POST", this.apiAddress + subaddress);
	request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	return request;
};

Toodledo.prototype.request = function(subaddress, args) {
	var request = this.createRequest(subaddress), self = this, d = $.Deferred();
	request.onreadystatechange = function() {		
		if (request.request.status === 0 && request.request.readyState === 4 && request.request.responseText === '') {
			d.reject(Toodledo.ERRORS.OFFLINE);
			return d.promise();
		}

		var res = self.getResultFromRequest(request);
		if (res) {
			d.resolve(res);
		}
	};

	request.send("access_token=" + this.accessToken + (args ? '&' + args : ''));

	return d.promise();
};

Toodledo.prototype.isToday = function(date) {
	var today = this.today, tomorrow = this.tomorrow;
	if (date.equalsTo(today) || (date.laterThan(today) && date.earlierThan(tomorrow))) {
		return true;
	}
	return false;
};

Toodledo.prototype.isTomorrow = function(date) {
	var tomorrow = this.tomorrow, nextTomorrow = tomorrow.addDuration(new tizen.TimeDuration(1, 'DAYS'));
	if (date.equalsTo(tomorrow) || (date.laterThan(tomorrow) && date.earlierThan(nextTomorrow))) {
		return true;
	}
	return false;
};

Toodledo.prototype.parseDate = function(date) {
	return new tizen.TZDate(new Date(date * 1000));
};

Toodledo.prototype.toDisplayDate = function(date) {
	var d = this.parseDate(date), replace = new RegExp('([.,;\\/ ]*' + d.getFullYear() + '\\s?\\D*)', 'g');
	if (d.getSeconds() === 59) {
		return d.toLocaleDateString().replace(replace, '').trim();
	}
	return d.toLocaleDateString().replace(replace, '').trim() + this.toDisplayTime(date);
};

Toodledo.prototype.toDisplayTime = function(date) {
	var d = this.parseDate(date), time = d.toLocaleTimeString();
	if (tizen.time.getTimeFormat().indexOf('ap') > -1) {
		return time.substring(0, time.lastIndexOf(tizen.time.getTimeFormat()[1])) + time.substring(time.lastIndexOf(tizen.time.getTimeFormat()[1]) + 3);
	}
	return time.substring(0, time.lastIndexOf(tizen.time.getTimeFormat()[1]));
};

Toodledo.dateTimeToUNIX = function(tzDate) {
	var firstDate = new tizen.TZDate();

	firstDate = firstDate.toTimezone("GMT+0000");
	firstDate.setDate(1);
	firstDate.setFullYear(1970);
	firstDate.setMonth(0);
	firstDate.setHours(0);
	firstDate.setMinutes(0);
	firstDate.setSeconds(0);
	firstDate.setMilliseconds(0);

	return parseInt(tzDate.difference(firstDate).length / 1000, 0);
};

Toodledo.dateToUNIX = function(tzDate) {
	var firstDate = new tizen.TZDate();

	firstDate.setDate(1);
	firstDate.setFullYear(1970);
	firstDate.setMonth(0);
	firstDate.setHours(0);
	firstDate.setMinutes(0);
	firstDate.setSeconds(0);
	firstDate.setMilliseconds(0);

	tzDate.setHours(12);
	tzDate.setMinutes(0);
	tzDate.setSeconds(0);

	return parseInt(tzDate.difference(firstDate).length / 1000, 0);
};

/**
 * Get data from request. If token is expired, return null
 * @returns parsed JSON. If token is expired, return null
 */
Toodledo.prototype.getResultFromRequest = function(request) {
	var res = request.request.responseText;

	if (request.request.readyState !== 4) {
		return;
	}

	switch (request.request.status) {
	case 429:
		this.onerror(Toodledo.ERRORS.TOO_MANY_REQUESTS);
		return Toodledo.ERRORS.TOO_MANY_REQUESTS;
	case 401:
		res = JSON.parse(request.request.responseText);
		this.onerror(res.errorDesc);
		return res;
	case 400:
		res = JSON.parse(request.request.responseText);
		if (res.errorCode === 102) {
			this.onerror(Toodledo.ERRORS.REAUTH_NEEDED);
			this.sap.sendData(SAP.SERVICE_CHANNEL_ID, SAP.REAUTH_NEEDED);
		} else {
			this.onerror(res.errorDesc);
		}
		return res;
	case 200:
		res = JSON.parse(request.request.responseText);
		if (res.errorDesc) {
			this.onerror(res.errorDesc);
			return;
		}
		return res;
	default:
		res = JSON.parse(request.request.responseText);
		if (request.request.responseText !== '') {
			this.onerror(res);
		} else {
			this.onerror('Unknow network error. Try again later.');
		}
		return res;
	}
};