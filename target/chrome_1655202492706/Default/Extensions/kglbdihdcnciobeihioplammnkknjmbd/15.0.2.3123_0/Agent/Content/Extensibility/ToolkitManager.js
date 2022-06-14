function ToolkitManager() {
    this._logger = new LoggerUtil("WebExt.ToolkitManager");
    this._toolkits = [];
}

ToolkitManager.prototype = {

    loadToolkits: function (toolkits) {
        this._logger.trace("loadToolkits: started");
        toolkits.forEach(function (item, index) {
            var toolkitIndex = index + 1;
            this._loadToolkit(item, toolkitIndex);
        }, this);
    },

    _loadToolkit: function (toolkitInfo, index) {
        this._logger.trace("_loadToolkit: name = " + toolkitInfo.name + "; index = " + index);
        if (this._getToolkitIndexByName(toolkitInfo.name) === -1) {
            this._logger.trace("_loadToolkit: " + toolkitInfo.name + " does not exists. Add it to the list");
            var kit = new Toolkit(toolkitInfo, index);
            this._addToolkit(kit);
        }
    },

    getTagList: function () {
        this._logger.trace("getTagList:started");
        var tagList = [];
        this._toolkits.forEach(function (toolkit) {
            var elementTagList = toolkit.getTagList();
            elementTagList.forEach(function (tag) {
                if (tagList.indexOf(tag) === -1) {
                    tagList.push(tag);
                }
            });
        });
        return tagList;
    },

    createControl: function (element, skipTypes, rootElem, micclass) {
        this._logger.trace("createControl: started");
        var controlObj = null;
        Util.arrayFindIndex(this._toolkits, function (toolkit) {
             controlObj = toolkit.createControl(element, skipTypes, rootElem || {}, micclass);
             return controlObj !==null;
        });
         return controlObj;
    },

    _addToolkit: function (toolkit) {
        for (var i = 0; i < this._toolkits.length; i++) {
            if (this._toolkits[i].priority > toolkit.priority) {
                break;
            }
        }
        this._logger.trace("_addToolkit: insert at " + i);
        this._toolkits.splice(i, 0, toolkit);
    },

    _getToolkitIndexByName: function (toolkitName) {
        return Util.arrayFindIndex(this._toolkits, function (toolkit) {
            return toolkit.toolkitName.toUpperCase() === toolkitName.toUpperCase();
        });
    }
};