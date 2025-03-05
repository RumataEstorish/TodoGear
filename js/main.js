/*global Log, VIEW, SwipeList, ViewMenu, tau, $, GearHttp, Utils, Input, KeyboardModes, SAP, Toodledo, ToastMessage, ActionMenu, LANG_JSON_DATA, EditTaskData, ContextMenu, createScroller*/
/*jshint unused: false*/
/*jslint laxbreak: true*/
/*jshint loopfunc: true */

var sap = null;
var model = null;
var client = null;
var toastMessage = null;
var currentView = VIEW.TODAY;
var selectedTask = null;
var editTaskData = null;

var selectedProject = null;
var selectedLabel = null;
var selectedStatus = null;
var selectedPriority = null;

var mainMenu = null; 
var taskMenu = null;
var viewMenu = null;


/**
 * Converts date to display
 * 
 * @param due - task.due.date
 */
function dateToDisplay(due){
	if (!due){
		return '';
	}
	if (client.isToday(due)){
		return LANG_JSON_DATA.TODAY;
	}
	if (client.isTomorrow(due)){
		return LANG_JSON_DATA.TOMORROW;
	}
		
	return due.toLocaleDateString();
}

function settingsViewClick() {
    tau.changePage("#settingsPage");
}

function openMainMenuClick() {
    mainMenu.show();
}

function openViewMenuClick() {
    viewMenu.show();
}

function pickStatus(){
	tau.changePage('#statusPickPage');
}

function setStatus(status){
	editTaskData.status = status;
	$('#taskStatus span').html(parseStatus(status));
	tau.changePage('#taskEditPage');
}

function editTaskContent() {
    var input = new Input(model);

    input.open(editTaskData.title, LANG_JSON_DATA.ENTER_TASK_CONTENT, KeyboardModes.SINGLE_LINE, function(txt) {
        editTaskData.title = txt;
        $("#taskContent span").html(txt);
        tau.changePage("#taskEditPage");
    }, function() {
        tau.changePage("#taskEditPage");
    }, function(e) {
        if (e === "Please, install TypeGear from store. It's free.") {
            alert(LANG_JSON_DATA.NO_TYPEGEAR);
        } else {
            alert(e);
        }
        tau.changePage("#taskEditPage");
    });
}

function editTaskConfirm() {
    if (!editTaskData.title || editTaskData.title === "") {
        toastMessage.show(LANG_JSON_DATA.EMPTY_CONTENT);
        return;
    }
    if (selectedTask) {
        client.updateTask(editTaskData).then(selectViewBack, handleToodledoError);
    } else {
    	showLoad(LANG_JSON_DATA.CREATING_TASK + "...");
        client.createTask(editTaskData).then(selectViewBack, handleToodledoError);
    }
}

function createTask() {
    $("#taskEditPage h2").html(LANG_JSON_DATA.CREATE_TASK);
    $('#taskContent span').html('');
    $("#taskProject span").html(parseProjectName(client.inboxName));
    $("#taskDate span").html('');
    $('#taskStatus span').html(parseStatus(0));
    $('#taskContext span').html(LANG_JSON_DATA.EMPTY_LABEL);
    selectedTask = null;
    editTaskData = new EditTaskData(null, "", client.inboxId, null, 0);
    setTimeout(editTaskContent, 100);
    confirmDate('TODAY');
}

function editTaskClick() {
    $("#taskEditPage h2").html(LANG_JSON_DATA.EDIT);

    client.getTaskById(selectedTask).then(function(task) {
        $("#taskContent span").html(task.title);
        if (task.duedate){
        	$("#taskDate span").html(dateToDisplay(client.parseDate(task.duedate)));
        }
        else{
        	$('#taskDate span').html('');
        }
        client.getFolderById(task.folder).then(function(project) {
            $("#taskProject span").html(parseProjectName(project.name));
        }, handleToodledoError);
        
        client.getLabelById(task.context).then(function(label){
        	$('#taskContext span').html(label.name);
        }, handleToodledoError);
        $('#taskStatus span').html(parseStatus(task.status));

        editTaskData = new EditTaskData(task.id, task.title, task.folder, task.duedate ? client.parseDate(task.duedate) : null, task.context);
        editTaskData.status = task.status;
        tau.changePage("#taskEditPage");
    }, handleToodledoError);
}


function pickDate() {
    $("#dateInput").one("change", function() {
        $("#taskDate span").html(dateToDisplay($("#dateInput").val()));
        editTaskData.dueDate = $("#dateInput").val();
        tau.changePage("#taskEditPage");
    });
    $("#dateInput").trigger("click");
}

function getDateFromPage(val) {
    var date = tizen.time.getCurrentDateTime();
    switch (val) {
        case "TODAY":
            return date;
        case "TOMORROW":
            return date.addDuration(new tizen.TimeDuration(1, "DAYS"));
        case "NEXT_WEEK":
            return date.addDuration(new tizen.TimeDuration(7 - date.getDay(), "DAYS"));
        case "REMOVE":
            return 0;
    }
}

function confirmDate(val) {
    var date = getDateFromPage(val);
    $("#taskDate span").html(dateToDisplay(date));
    editTaskData.dueDate = date;
    tau.changePage("#taskEditPage");
}

function pickDatePostpone() {
    $("#dateInput").one("change", function() {
        client.getTaskById(selectedTask).then(function(task) {
            client.getFolderById(task.folder).then(function(project) {
                editTaskData = new EditTaskData(task.id, task.title, task.folder, $("#dateInput").val(), task.context);
                client.updateTask(editTaskData).then(selectView, function(err) {
					alert(err);
				}, handleToodledoError);
            }, handleToodledoError);
        }, handleToodledoError);

    });
    $("#dateInput").trigger("click");
}

function postponeDate(val) {
    var date = getDateFromPage(val);
    client.getTaskById(selectedTask).then(function(task) {
        client.getFolderById(task.folder).then(function(project) {
            editTaskData = new EditTaskData(task.id, task.title, task.folder, date, task.context);
            client.updateTask(editTaskData).then(selectViewBack, handleToodledoError);
        }, handleToodledoError);
    }, handleToodledoError);
}

function confirmProject(id) {
    editTaskData.newProjectId = id;
    client.getFolderById(id).then(function(project) {
        $("#taskProject span").html(parseProjectName(project.name));
        tau.changePage("#taskEditPage");
    }, handleToodledoError);
}

function confirmLabel(id){
	if (id === 0){
		$('#taskContext span').html(LANG_JSON_DATA.EMPTY_LABEL);
		editTaskData.contextId = 0;
	}
	else{
		client.getLabelById(id).then(function(label){
			$('#taskContext span').html(label.name);
			editTaskData.contextId = label.id;
		}, handleToodledoError);
	}
	tau.changePage('#taskEditPage');
}

function pickContext(){
	var i = 0, list = $('#contextPickPage ul');
	list.empty();
	client.getLabels().then(function(labels){	
		for (i = 0; i<labels.length; i++){
			list.append('<li id="' + labels[i].id + '" onclick="confirmLabel(this.id)">' + labels[i].name + '</li>');
		}
		tau.changePage('#contextPickPage');		
	}, handleToodledoError);
}

function pickTaskProject() {
    var i =0, list = $("#pickProjectsPage ul"),
    onprojects = function(projects) {
    
        if (projects){
        	for (i = 0; i < projects.length; i++) {
        		var project = null;
        		if (editTaskData.projectId === projects[i].id) {
        			project = $('<li onclick="confirmProject(\'' + projects[i].id + '\')">' + parseProjectName(projects[i].name) + '</li>');
        			project.css("padding-left", (projects[i].indent - 1) * 20 + "px"); 
        		} else {
        			project = $('<li onclick="confirmProject(\'' + projects[i].id + '\')">' + parseProjectName(projects[i].name) + '</li>');
        			project.css("padding-left", (projects[i].indent - 1) * 20 + "px");
        		}
            list.append(project);
        	}
        }
        tau.changePage("#pickProjectsPage");
    };
    if (selectedTask !== null) {
        client.getTaskById(selectedTask).then(function(task) {
            editTaskData.newProjectId = task.folder;
         
            client.getFolders().then(onprojects, handleToodledoError);
        }, handleToodledoError);
    } else {
        client.getFolders().then(onprojects, handleToodledoError);
    }
}

function pickTaskDate() {
    tau.changePage("#dueDatePage");
}

function parseProjectName(name) {
	if (!name){
		return '';
	}
    return name !== client.inboxName ? name : LANG_JSON_DATA.INBOX;
}

function showLoad(message, hideSquareSync) {
    /*
	 * $("#smallProcessingDescription").html(message);
	 * tau.changePage("#smallProcessingPage");
	 */
		if (tau.support.shape.circle){
			tau.changePage('#tasksPage');
			$('#taskProcessing').show();
		}
		else{
			if (!hideSquareSync){
				$("#smallProcessingDescription").html(message);
				tau.changePage("#smallProcessingPage");
			}
		}
}

function receive(channelId, data) {
    switch (channelId) {
        case SAP.SERVICE_CHANNEL_ID:
        	if (data){
        		switch(data){
        		case SAP.REAUTH_NEEDED:
        		case SAP.NO_RESPONSE:
        			alert(LANG_JSON_DATA.REAUTH_NEEDED);
        			syncClick();
        			break;
        		case SAP.AUTH_NEEDED:
        			client.refreshToken = '';
                    client.accessToken = '';
                    client.deleteData();
                    if (!confirm(LANG_JSON_DATA.CONNECT_TOODLEDO)){
                    	exitApp();
                    	return;
                    }
                    syncClick();
                    return;
                default:
                	var r = JSON.parse(data);
        			if (client.accessToken !== r.access_token) {
        				sap.connectOnDeviceNotConnected = false;
        				client.setAccessTokenFromPhone(r).then(function(){
        					Log.d(client.accessToken + ' - ' + client.refreshToken);
        					syncClick();	
        				}, handleToodledoError);
        			}
                	break;
        		}
        	}
            break;
    }
}

function checkTask(id) {
    client.checkTask(id).then(selectViewBack, handleToodledoError);
}

/*
 * function deleteTaskClick() { if
 * (!confirm(LANG_JSON_DATA.DELETE_TASK_CONFIRM)) { return; }
 * client.deleteTask(selectedTask).then(selectView, handleToodledoError); }
 */ 

function taskContextMenuClick(sender) {
	client.getTaskById(sender.prop('id')).then(function(task){
		alert(task.title);
	}, handleToodledoError);
}

function taskContextMenuHold(sender) {
    selectedTask = sender.prop("id");
    taskMenu.show();
}

function parseStatus(status){
	switch(status){
	case 0:
		return LANG_JSON_DATA.STATUS_NONE;
	case 1: 
		return LANG_JSON_DATA.STATUS_NEXT_ACTION;
	case 2: 
		return LANG_JSON_DATA.STATUS_ACTIVE;
	case 3:
		return LANG_JSON_DATA.STATUS_PLANNING;
	case 4:
		return LANG_JSON_DATA.STATUS_DELEGATED;
	case 5:
		return LANG_JSON_DATA.STATUS_WAITING;
	case 6:
		return LANG_JSON_DATA.STATUS_HOLD;
	case 7:
		return LANG_JSON_DATA.STATUS_POSTPONED;
	case 8:
		return LANG_JSON_DATA.STATUS_SOMEDAY;
	case 9:
		return LANG_JSON_DATA.STATUS_CANCELED;
	case 10:
		return LANG_JSON_DATA.STATUS_REFERENCE;
	default:
		return '';
	}
}

function parsePriority(priority){
	switch (priority){
	case 0:
		return LANG_JSON_DATA.PRIORITY_LOW;
	case 1:
		return LANG_JSON_DATA.PRIORITY_MEDIUM;
	case 2:
		return LANG_JSON_DATA.PRIORITY_HIGH;
	case 3:
		return LANG_JSON_DATA.PRIORITY_TOP;
	default:
		return LANG_JSON_DATA.PRIORITY_NEGATIVE;
	}
}

function fillTasks(tasks, overdue) {
    var i = 0,
        list = $("#tasksPage ul"),
        item = null,
        appendProject = function(id, projectId) {   	
            client.getFolderById(projectId).then(function(project) {
            	try{
            		if (!project){
            			return;
            		}
            		var item = $("#" + id);
               
            		if (item.hasClass("li-has-multiline")) {
            			if (item.hasClass('li-has-2line-sub')){
            				item.addClass('li-has-3line-sub');
            			}
            			else{
            				item.addClass("li-has-2line-sub");
            			}
            		} else {
            			item.addClass("li-has-multiline");
            		}
                
                item.append('<span class="ui-li-sub-text li-text-sub">' + parseProjectName(project.name) + '</span>');
            	createScroller({
            		target : document.getElementById("tasksPage")
            	});
            	}
            	catch(e){
            		Log(e);
            	}
            }, handleToodledoError);
        };

    list.empty();
    if (!tasks || !list) {
        return;
    }
    if (overdue) {
    	if (currentView === VIEW.TODAY || currentView === VIEW.NEXT_WEEK){
    		overdue.sort(Utils.dynamicSort('day_order'));
    	}
    	else{
    		overdue.sort(Utils.dynamicSort('item_order'));
    	}
        for (i = 0; i < overdue.length; i++) {
        	if (overdue[i].status === 0){
        		item = $('<li class="li-has-multiline" id="' + overdue[i].id + '"><label>' + overdue[i].title + '<span style="color: red" class="ui-li-sub-text li-text-sub">' + client.toDisplayDate(overdue[i].duedate) + '</span></label></li>');
        	}
        	else{
        		item = $('<li class="li-has-multiline li-has-2line-sub" id="' + overdue[i].id + '"><label>' + overdue[i].title + '<span style="color: red" class="ui-li-sub-text li-text-sub">' + client.toDisplayDate(overdue[i].duedate) + '</span><span class="ui-li-sub-text li-text-sub">' + parseStatus(overdue[i].status) + '</label></li>');
        	}
            new ContextMenu(item, taskContextMenuClick, taskContextMenuHold);
            list.append(item);
            if (overdue[i].folder) {
                (appendProject)(overdue[i].id, overdue[i].folder);
            }
            else{
    			item = $("#" + overdue[i].id);
    			item.append('<span class="ui-li-sub-text li-text-sub">' + LANG_JSON_DATA.INBOX + '</span>');
            }
        }
    }

    if (tasks) {
    	if (currentView === VIEW.TODAY || currentView === VIEW.NEXT_WEEK){
    		tasks.sort(Utils.dynamicSort('day_order'));
    	}
    	else{
    		tasks.sort(Utils.dynamicSort('item_order'));
    	}
        for (i = 0; i < tasks.length; i++) {
        	if (tasks[i].duedate){
        		if (!tasks[i].duetime){
        			if (currentView === VIEW.TODAY){
        				item = $('<li id="' + tasks[i].id + '"><label>' + tasks[i].title + '</label></li>');
        			}
        			else{
                        item = $('<li class="li-has-multiline" id="' + tasks[i].id + '"><label>' + tasks[i].title + '<span class="ui-li-sub-text li-text-sub">' + dateToDisplay(client.parseDate(tasks[i].duedate)) + '</span></label></li>');        				
        			}
        		}
        		else{
        			item = $('<li class="li-has-multiline" id="' + tasks[i].id + '"><label>' + tasks[i].title + '<span class="ui-li-sub-text li-text-sub">' + dateToDisplay(client.parseDate(tasks[i].duedate)) +'</span></label></li>');
        		}
        	}
        	else{
        		item = $('<li id="' + tasks[i].id + '"><label>' + tasks[i].title + '</label></li>');
        	}
        	if (tasks[i].status !== 0 && currentView !== VIEW.STATUSES){
        		if (item.hasClass('li-has-multiline')){
        			item.addClass('li-has-2line-sub');
        		}
        		else{
        			item.addClass('li-has-multiline');
        		}
        		item.append('<span class="ui-li-sub-text li-text-sub">' + parseStatus(tasks[i].status) + '</span>');
        	}
        	
        	new ContextMenu(item, taskContextMenuClick, taskContextMenuHold);
            list.append(item);

            if (currentView !== VIEW.PROJECTS) {
                if (tasks[i].folder) {
                    (appendProject)(tasks[i].id, tasks[i].folder);
                }
                else{
        			item = $("#" + tasks[i].id);
        			item.append('<span class="ui-li-sub-text li-text-sub">' + LANG_JSON_DATA.INBOX + '</span>');
                }
            }
        }
    }
   
    if (Utils.getActivePage() !== "tasksPage"){
    	tau.changePage("#tasksPage");
    }
    
    $('#taskProcessing').hide();
	createScroller({
		target : document.getElementById("tasksPage")
	});
}

function openProject(id) {
    selectedProject = id;
    client.getTasksByProjectId(id).then(function(tasks) {
        client.getFolderById(id).then(function(project) {
            $("#tasksPage h2").html(parseProjectName(project.name));
        }, handleToodledoError);
        fillTasks(tasks);
    }, handleToodledoError);
}

function openLabel(id) {
    selectedLabel = id;
    client.getTasksByLabelId(id).then(function(tasks) {
        client.getLabelById(id).then(function(label) {
            $("#tasksPage h2").html(label.name);
        }, handleToodledoError);
        fillTasks(tasks);
    }, handleToodledoError);
}

function openStatus(id){
	selectedStatus = id;
	client.getTasksByStatus(id).then(function(tasks){
		$('#tasksPage h2').html(parseStatus(id));
		fillTasks(tasks);
	}, handleToodledoError);
}

function openPriority(id){
	selectedPriority = id;
	client.getTasksByPriority(id).then(function(tasks){
		$('#tasksPage h2').html(parsePriority(id));
		fillTasks(tasks);
	}, handleToodledoError);
}

function onprojects(projects) {
    var i = 0,
        list = $("#projectsPage ul");

    list.empty();
    if (projects) {
        for (i = 0; i < projects.length; i++) {
            var project = $('<li class="li-has-multiline" id="' + projects[i].id + '" onclick="openProject(this.id)"><a href="#">' + parseProjectName(projects[i].name) + '</a></li>');
            project.css("padding-left", (projects[i].indent - 1) * 20 + "px");
            list.append(project);
        }
        client.getTasksCountByFolders(projects).then(function(res){
        	for (i = 0; i<res.length; i++){
        		$('#projectsPage #' + res[i].project.id + ' a').append('<span class="ui-li-sub-text li-text-sub">' + LANG_JSON_DATA.TASKS + ': ' + res[i].count + '</span>');
        	}
        }, handleToodledoError);
    }
    if (selectedProject === null) {
    	if (Utils.getActivePage() !== "projectsPage"){
    		tau.changePage("#projectsPage");
    	}
    } else {
        openProject(selectedProject);
    }
}

function onlabels(labels) {
    var i = 0,
        list = $("#labelsPage ul");

    list.empty();
    if (labels) {
        for (i = 0; i < labels.length; i++) {
            list.append('<li class="li-has-multiline" id="' + labels[i].id + '" onclick="openLabel(this.id)"><a href="#">' + labels[i].name + '</a></li>');
        }
        
        client.getTasksCountByLabels(labels).then(function(res){
        	for (i = 0; i<res.length; i++){
        		$('#labelsPage #' + res[i].label.id + ' a').append('<span class="ui-li-sub-text li-text-sub">' + LANG_JSON_DATA.TASKS + ': ' + res[i].count + '</span>');
        	}
        }, handleToodledoError);
    }
    if (selectedLabel === null) {
    	if (Utils.getActivePage() !== "labelsPage"){
    		tau.changePage("#labelsPage");
    	}
    } else {
        openLabel(selectedLabel);
    }
}

function ontoday(tasks) {
    $("#tasksPage h2").html(LANG_JSON_DATA.TODAY);
    fillTasks(tasks.tasks, tasks.overdue);
}

function onnexttasks(tasks) {
    $("#tasksPage h2").html(LANG_JSON_DATA.NEXT_7_DAYS);
    fillTasks(tasks.tasks, tasks.overdue);
}

function fullSyncClick(){
	fullSync();	
}

function handleToodledoError(err){
	switch(err){
	case Toodledo.ERRORS.AUTH_NEEDED:
		if (!confirm(LANG_JSON_DATA.CONNECT_TOODLEDO)){
    		exitApp();
    		return;
    	}
		Log.d('Not authorized - handleToodledoError');
		sap.connectOnDeviceNotConnected = true;
    	sap.sendData(SAP.SERVICE_CHANNEL_ID, SAP.AUTH_NEEDED).then(function(){
    		sap.connectOnDeviceNotConnected = false;
    	});
		break;
	case Toodledo.ERRORS.REAUTH_NEEDED:
		alert(LANG_JSON_DATA.REAUTH_NEEDED);
		sap.sendData(SAP.SERVICE_CHANNEL_ID, SAP.REAUTH_NEEDED);	
		break;
	case Toodledo.ERRORS.TOO_MANY_REQUESTS:
		alert(LANG_JSON_DATA.TOO_MANY_REQUESTS);
		exitApp();
		break;
	case Toodledo.ERRORS.OFFLINE:
		selectView();
		break;
	default:
		if (err){
			alert(err);
		}
		break;
	}
}

function syncClick(){
	showLoad(LANG_JSON_DATA.SYNCHRONIZATION, client.user);
    client.sync().then(selectView, handleToodledoError);
}

function fullSync() {
    showLoad(LANG_JSON_DATA.SYNCHRONIZATION);
    client.fullSync().then(selectView, handleToodledoError);
}

function selectView() {

	var d = $.Deferred();
	
    switch (currentView) {
        case VIEW.TODAY:
            selectedProject = null;
            selectedLabel = null;
            selectedStatus = null;
            client.getTodayTasks().then(function(tasks){
            	ontoday(tasks);
            	d.resolve();
            }, handleToodledoError);
            break;
        case VIEW.NEXT_WEEK:
            selectedProject = null;
            selectedLabel = null;
            selectedStatus = null;
            client.getNextTasks().then(function(tasks){
            	onnexttasks(tasks);
            	d.resolve();
            }, handleToodledoError);
            break;
        case VIEW.PROJECTS:
            client.getFolders().then(function(folders){
            	onprojects(folders);
            	d.resolve();
            }, handleToodledoError);
            break;
        case VIEW.LABELS:
        	selectedLabel = null;
            client.getLabels().then(function(context){
            	onlabels(context);
            	d.resolve();
            }, handleToodledoError);
            break;
        case VIEW.PRIORITY: 
        	selectedPriority = null;
        	client.getTasksCountByPriority().then(function(count){
        		count.forEach(function(c){
        			$('#priorityPage li').eq(4 - (c.priority + 1)).find('span').eq(0).html(LANG_JSON_DATA.TASKS + ': ' + c.count);
        		});
        	}, handleToodledoError);
        	tau.changePage('#priorityPage');
        	d.resolve();
        	break;
        case VIEW.STATUSES:
        	selectedStatus = null;
        	for (var i = 0; i<=10; i++){
        		(function(id){
        			client.getTasksCountByStatus(id).then(function(count){
        				$('#statusesPage li').eq(id).find('span').eq(0).html(LANG_JSON_DATA.TASKS + ': ' + count);
        			}, handleToodledoError);
        		}
        		)(i);
        	}
        	tau.changePage('#statusesPage');
        	d.resolve();
        	break;
    }
    return d.promise();
}

/**
 * Switch view back on action
 */
function selectViewBack(){
    	switch(currentView){
    	case VIEW.TODAY:
    	case VIEW.NEXT_WEEK:
    		selectView();
    		break;
    	case VIEW.PROJECTS:
    		openProject(selectedProject);
    		break;
    	case VIEW.LABELS:
    		openLabel(selectedLabel);
    		break;
    	case VIEW.STATUSES:
    		openStatus(selectedStatus);
    		break;
    	case VIEW.PRIORITY:
    		openPriority(selectedPriority);
    		break;
    	}
}

function translateUI() {
	
    $("#projectsPage h2").html(LANG_JSON_DATA.PROJECTS);
    $("#labelsPage h2").html(LANG_JSON_DATA.LABELS);

    $("#swipeComplete").html(LANG_JSON_DATA.COMPLETE);
    $("#swipeSchedule").html(LANG_JSON_DATA.SCHEDULE);

    $('#chooseStartupPage h2').html(LANG_JSON_DATA.START_PAGE);
    
    $("#startupPageLabel").prepend(LANG_JSON_DATA.START_PAGE);
    $("#settingsPage h2").html(LANG_JSON_DATA.SETTINGS);
    $("#todayStartup").prepend(LANG_JSON_DATA.TODAY);
    $("#nextWeekStartup").prepend(LANG_JSON_DATA.NEXT_7_DAYS);
    $("#projectsStartup").prepend(LANG_JSON_DATA.PROJECTS);
    $("#labelsStartup").prepend(LANG_JSON_DATA.LABELS);
    $("#okButton").html(LANG_JSON_DATA.OK);


    $("#taskContent label").prepend(LANG_JSON_DATA.CONTENT);
    $("#taskProject label").prepend(LANG_JSON_DATA.PROJECT);
    $("#taskDate label").prepend(LANG_JSON_DATA.DUE_DATE);
    $('#taskStatus label').prepend(LANG_JSON_DATA.STATUS);
    $('#taskContext label').prepend(LANG_JSON_DATA.LABEL);
    
    $('#statusPickPage h2').html(LANG_JSON_DATA.STATUS);
    $('#statusPickPage #statusNone').html(LANG_JSON_DATA.STATUS_NONE);
    $('#statusPickPage #statusNextAction').html(LANG_JSON_DATA.STATUS_NEXT_ACTION);
    $('#statusPickPage #statusActive').html(LANG_JSON_DATA.STATUS_ACTIVE);
    $('#statusPickPage #statusPlanning').html(LANG_JSON_DATA.STATUS_PLANNING);
    $('#statusPickPage #statusDelegated').html(LANG_JSON_DATA.STATUS_DELEGATED);
    $('#statusPickPage #statusWaiting').html(LANG_JSON_DATA.STATUS_WAITING);
    $('#statusPickPage #statusHold').html(LANG_JSON_DATA.STATUS_HOLD);
    $('#statusPickPage #statusPostponed').html(LANG_JSON_DATA.STATUS_POSTPONED);
    $('#statusPickPage #statusSomeday').html(LANG_JSON_DATA.STATUS_SOMEDAY);
    $('#statusPickPage #statusCanceled').html(LANG_JSON_DATA.STATUS_CANCELED);
    $('#statusPickPage #statusReference').html(LANG_JSON_DATA.STATUS_REFERENCE);
    
    $('#priorityPage h2').html(LANG_JSON_DATA.PRIORITY);
    $('#priorityPage #priorityNegative a').prepend(LANG_JSON_DATA.PRIORITY_NEGATIVE);
    $('#priorityPage #priorityLow a').prepend(LANG_JSON_DATA.PRIORITY_LOW);
    $('#priorityPage #priorityMedium a').prepend(LANG_JSON_DATA.PRIORITY_MEDIUM);
    $('#priorityPage #priorityHigh a').prepend(LANG_JSON_DATA.PRIORITY_HIGH);
    $('#priorityPage #priorityTop a').prepend(LANG_JSON_DATA.PRIORITY_TOP);
    
    $('#statusesPage h2').html(LANG_JSON_DATA.STATUS);
    $('#statusesPage #statusNone a').prepend(LANG_JSON_DATA.STATUS_NONE);
    $('#statusesPage #statusNextAction a').prepend(LANG_JSON_DATA.STATUS_NEXT_ACTION);
    $('#statusesPage #statusActive a').prepend(LANG_JSON_DATA.STATUS_ACTIVE);
    $('#statusesPage #statusPlanning a').prepend(LANG_JSON_DATA.STATUS_PLANNING);
    $('#statusesPage #statusDelegated a').prepend(LANG_JSON_DATA.STATUS_DELEGATED);
    $('#statusesPage #statusWaiting a').prepend(LANG_JSON_DATA.STATUS_WAITING);
    $('#statusesPage #statusHold a').prepend(LANG_JSON_DATA.STATUS_HOLD);
    $('#statusesPage #statusPostponed a').prepend(LANG_JSON_DATA.STATUS_POSTPONED);
    $('#statusesPage #statusSomeday a').prepend(LANG_JSON_DATA.STATUS_SOMEDAY);
    $('#statusesPage #statusCanceled a').prepend(LANG_JSON_DATA.STATUS_CANCELED);
    $('#statusesPage #statusReference a').prepend(LANG_JSON_DATA.STATUS_REFERENCE);
    
    $('#contextPickPage h2').html(LANG_JSON_DATA.LABEL);
    
    
    $("#todayDate").html(LANG_JSON_DATA.TODAY);
    $("#tomorrowDate").html(LANG_JSON_DATA.TOMORROW);
    $("#nextWeekDate").html(LANG_JSON_DATA.NEXT_WEEK);
    $("#pickDate").html(LANG_JSON_DATA.PICK);
    $("#removeDate").html(LANG_JSON_DATA.DELETE);

    $("#postponePage h2").html(LANG_JSON_DATA.POSTPONE);
    $("#todayPostpone").html(LANG_JSON_DATA.TODAY);
    $("#tomorrowPostpone").html(LANG_JSON_DATA.TOMORROW);
    $("#nextWeekPostpone").html(LANG_JSON_DATA.NEXT_WEEK);
    $("#pickDatePostpone").html(LANG_JSON_DATA.PICK);
    $("#removeDatePostpone").html(LANG_JSON_DATA.DELETE);

}

function exitApp() {
    sap.close();
    tizen.application.getCurrentApplication().exit();
}

function changeStartupDate() {
    tau.changePage("#chooseStartupPage");
}

function changeStartupClick(val) {
    localStorage.setItem("defaultView", val);
    tau.changePage("#settingsPage");
}

$(window).on('load', function() {
	
	Log.DEBUG = false;
	
    var swipeList = new SwipeList('#tasksPage', 
    		function(evt){ checkTask(evt.target.id);},
    		function(evt){selectedTask = evt.target.id; tau.changePage("#postponePage");}),
        defaultView = localStorage.getItem("defaultView");   
    
    $('#pickProjectsPage').on('pagebeforehide', function(){
    	$('#pickProjectsPage ul').empty();
    });
    
    toastMessage = new ToastMessage("#popupToast", "#popupToastContent");
    
    mainMenu = new ActionMenu('mainMenuPage', 'mainMenu', [
                                                           {name : 'createTaskMenu', title : LANG_JSON_DATA.CREATE_TASK, image : '/images/add.png', onclick: createTask},
                                                           {name : 'viewMenu', title : LANG_JSON_DATA.VIEW, image : '/images/view.png', onclick : openViewMenuClick},
                                                           {name : 'settingsMenu', title : LANG_JSON_DATA.SETTINGS, image : '/images/settings.png', onclick : settingsViewClick },
                                                           {name : 'syncMenu', title : LANG_JSON_DATA.SYNC, image : 'images/sync.png', onclick : syncClick},
                                                           {name : 'fullSyncSquare', title : LANG_JSON_DATA.FULL_SYNC, image : 'images/full_sync.png', onclick : fullSyncClick}
                                       ]);
    
    taskMenu = new ActionMenu('taskMenuPage', 'taskMenu', [
                                                           {name : 'checkTaskMenu', title : LANG_JSON_DATA.COMPLETE, image : '/images/check.png', onclick : function(){checkTask(selectedTask);}},
                                                           {name : 'postponeTaskMenu', title : LANG_JSON_DATA.POSTPONE, image : '/images/postpone.png', onclick : function(){tau.changePage("#postponePage");}},
                                                           {name : 'editTaskMenu', title : LANG_JSON_DATA.EDIT, image : '/images/edit.png', onclick : editTaskClick}
                                                           // {name :
															// 'deleteTaskMenu',
															// title :
															// LANG_JSON_DATA.REMOVE,
															// image :
															// '/images/delete.png',
															// onclick :
															// deleteTaskClick}
                                                           ]);
    
  
    viewMenu = new ViewMenu('viewMenuPage', 'viewMenu', [
                                                         {name : 'todayViewMenu', title : LANG_JSON_DATA.TODAY, image : '/images/today.png', onclick : function(){ currentView = VIEW.TODAY; selectView();
                                                         }, },
                                                         {name : 'nextSevenDaysViewMenu', title : LANG_JSON_DATA.NEXT_7_DAYS, image : '/images/next.png', onclick : function() {currentView = VIEW.NEXT_WEEK;  selectView();
                                                          }, },
                                                         {name : 'statusViewMenu', title : LANG_JSON_DATA.STATUS, image : '/images/status.png', onclick : function(){ currentView = VIEW.STATUSES; selectView(); selectedStatus = null;}},
                                                         {name : 'projectsViewMenu', title : LANG_JSON_DATA.PROJECTS, image : '/images/projects.png', onclick : function() { currentView = VIEW.PROJECTS; selectView(); selectedProject = null;}},
                                                         {name : 'labelsViewMenu', title : LANG_JSON_DATA.LABELS, image : '/images/tag.png', onclick : function() { currentView = VIEW.LABELS; selectView(); selectedLabel = null;}},
                                                         {name : 'priorityViewMenu', title : LANG_JSON_DATA.PRIORITY, image : '/images/priority.png', onclick : function(){currentView = VIEW.PRIORITY; selectView(); selectedPriority = null;}}
                                                         ]); 
    
    
    showLoad(LANG_JSON_DATA.SYNCHRONIZATION);
    translateUI();

    if (!defaultView) {
        defaultView = "TODAY";
    }
    currentView = VIEW[defaultView];


    $("#tasksPage").on("pagebeforeshow", function() {
        // currentView = VIEW.TODAY;
    });

    $('#projectsPage').on('pagebeforeshow', function(){
    	currentView = VIEW.PROJECTS;
    });
    $('#labelsPage').on('pagebeforeshow', function(){
    	currentView = VIEW.LABELS;
    });
    $('#priorityPage').on('pagebeforeshow', function(){
    	currentView = VIEW.PRIORITY;
    });
    $('#statusesPage').on('pagebeforeshow', function(){
    	currentView = VIEW.STATUSES;
    });


    $("#settingsPage").on("pagebeforeshow", function() {
        $("#startupPageLabel span").html(VIEW.toString(localStorage.getItem("defaultView")));
    });

    try {
        tizen.systeminfo.getPropertyValue("BUILD", function(res) {
            model = res.model;

			sap = new SAP("TodoGear", receive);

			client = new Toodledo(sap, model);
			client.onerror = handleToodledoError;

			if (client.isAuthorized!==true){
				sap.connectOnDeviceNotConnected = true;
			}

			sap.connect().always(function(){
				selectView().then(function(){
					syncClick();
				});
			});
        });
    } catch (ignore) {}
    

    
    $("#chooseStartupPage").on("pagebeforeshow", function() {
        var defaultView = localStorage.getItem("defaultView");
        switch (defaultView) {
            case "NEXT_WEEK":
                $("#nextWeekStartup input").prop("checked", true);
                break;
            case "PROJECTS":
                $("#projectsStartup input").prop("checked", true);
                break;
            case "LABELS":
                $("#labelsStartup input").prop("checked", true);
                break;
            default:
                $("#todayStartup input").prop("checked", true);
                break;
        }
    });

    // add eventListener for tizenhwkey
    document.addEventListener('tizenhwkey', function(e) {
        if (viewMenu.isOpened === true) {
            viewMenu.close();
            return;
        }
        if (mainMenu.isOpened === true) {
            mainMenu.close();
            return;
        }
        if (taskMenu.isOpened === true) {
            taskMenu.close();
            return;
        }
        if (e.keyName === "back") {
            switch (Utils.getActivePage()) {
                case "projectsPage":
                case "labelsPage":
                case 'statusesPage':
                case 'priorityPage':
                	if (VIEW[defaultView] === currentView){
                		exitApp();
                	}
                	currentView = VIEW[defaultView];
                	selectView();
                    break;
                case 'postponePage':
                	tau.changePage('#tasksPage');
                	break;
                case "pickProjectsPage":
                case "dueDatePage":
                case 'statusPickPage':
                case 'contextPickPage':
                    tau.changePage("#taskEditPage");
                    break;
                case "tasksPage":
                	if (VIEW[defaultView] === currentView){
                        exitApp();
                    }
                	
                	if (selectedLabel !== null || selectedProject !== null || 
                			selectedStatus !== null || selectedPriority !== null){
                		selectedLabel = null;
                		selectedProject = null;
                		selectedStatus = null;
                		selectedPriority = null;
                		selectView();
                		break;
                	}

                	currentView = VIEW[defaultView];
                    selectView();
                    break;
                case "taskEditPage":
                    selectView();
                    break;
                case "settingsPage":
                    selectView();
                    break;
                case "chooseStartupPage":
                    tau.changePage("#settingsPage");
                    break;
                case "smallProcessingPage":
                    exitApp();
                    break;
            }
        }
    });
});