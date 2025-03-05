/*global LANG_JSON_DATA*/
/*jshint unused: false*/

var VIEW = {
    TODAY: 0,
    NEXT_WEEK: 1,
    PROJECTS: 2,
    LABELS: 3,
    STATUSES : 4,
    PRIORITY : 5,
    toString: function(val) {
        switch (val) {
            case "NEXT_WEEK":
                return LANG_JSON_DATA.NEXT_7_DAYS;
            case "PROJECTS":
                return LANG_JSON_DATA.PROJECTS;
            case "LABELS":
                return LANG_JSON_DATA.LABELS;
            case "STATUSES":
            	return LANG_JSON_DATA.STATUS;
            case 'PRIORITY':
            	return LANG_JSON_DATA.PRIORITY;
            default:
                return LANG_JSON_DATA.TODAY;
        }
    }
};
