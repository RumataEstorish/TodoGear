/*global ActionMenu, Utils, tau, $, openUserClick, closeViewMenu, openTagsClick, fillNotebooks, openNotesFullList*/
/*jshint unused: false*/
/*jslint laxbreak: true*/

function ViewMenu(page, menuName, menuItems) {
	ActionMenu.call(this, page, menuName, menuItems);
}

ViewMenu.prototype = Object.create(ActionMenu.prototype);
ViewMenu.prototype.constructor = ViewMenu;

ViewMenu.prototype.show = function() {

	ActionMenu.prototype.showMenuItem.call(this, 'todayViewMenu');
	ActionMenu.prototype.showMenuItem.call(this, 'nextSevenDaysViewMenu');
	ActionMenu.prototype.showMenuItem.call(this, 'projectsViewMenu');
	ActionMenu.prototype.showMenuItem.call(this, 'labelsViewMenu');
	ActionMenu.prototype.showMenuItem.call(this, 'statusViewMenu');
	
	switch (Utils.getActivePage()) {
	case "todayPage":
		ActionMenu.prototype.hideMenuItem.call(this, 'todayViewMenu');
		break;
	case "nextSevenDaysPage":
		ActionMenu.prototype.hideMenuItem.call(this, 'nextSevenDaysViewMenu');
		break;
	case "projectsPage":
		ActionMenu.prototype.hideMenuItem.call(this, 'projectsViewMenu');
		break;
	case "labelsPage":
		ActionMenu.prototype.hideMenuItem.call(this, 'labelsViewMenu');
		break;
	case 'statusesPage':
		ActionMenu.prototype.hideMenuItem.call(this, 'statusViewMenu');
		break;
	}
	ActionMenu.prototype.show.call(this);
};
