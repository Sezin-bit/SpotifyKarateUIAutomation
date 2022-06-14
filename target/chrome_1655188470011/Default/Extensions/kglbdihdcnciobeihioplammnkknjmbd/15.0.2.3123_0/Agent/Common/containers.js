// © Copyright 1992-2017 Hewlett Packard Enterprise Development LP

function WebIdContainer() {
    this._logger = new LoggerUtil("Common.WebIdContainer");
    this._logger.info("WebIdContainer was created");
    
    this._container = [];
}

WebIdContainer.prototype = {
    _logger: null,
    _container: null,

    add: function (idToAdd, objectWithId) {
        this._logger.trace("WebIdContainer.add: Called");

        if (!this._validateId(idToAdd)) {
            this._logger.error("WebIdContainer.add: Id NOT valid, unable to add to container."); // TODO - Throw exception ?
            return;
        }

        if (!objectWithId) {
            this._logger.error("WebIdContainer.add: object is invalid"); // TODO - Throw exception ?
            return;
        }

        try {
            var idArray = this._getArrayRepresentationOfId(idToAdd);
            this._createObjectPath(this._container, idArray); // create arrays for [browserId][pageId][frameId][agentObjId]

            var lastLevelArray = this._getObjectContainerByPath(this._container, idArray);
            lastLevelArray[idArray.length - 1] = objectWithId;
        }
        catch (e) {
            this._logger.error("WebIdContainer.add: Failed." + "\nStack:" + e.stack); // TODO - Throw exception ?
            throw e;
        }

    },

    remove: function (idToRemove) {
        this._logger.trace("WebIdContainer.remove: Called on ", idToRemove);

        try {
            return this._getObject(idToRemove, true);
        }
        catch (e) {
            this._logger.error("WebIdContainer.remove: Failed on ", idToRemove, "\nStack:", e.stack);
            throw e;
        }

    },

    find: function (idToFind) {
        this._logger.trace("WebIdContainer.find: Called on ", idToFind);

        try {
            return this._getObject(idToFind, false);
        }
        catch (e) {
            this._logger.error("WebIdContainer.find: Failed on ", idToFind, "\nStack:", e.stack);
            throw e;
        }
    },

    /****************** Privates ****************/

    _createObjectPath: function (containerArr, pathArray) {
        if (pathArray.length === 0)
            return;

        if (!containerArr[pathArray[0]])
            containerArr[pathArray[0]] = [];

        this._createObjectPath(containerArr[pathArray[0]], pathArray.slice(1));
    },

    _getObjectContainerByPath: function (containerArray, pathArray) {
        if (!containerArray[pathArray[0]])
            return null;

        if (pathArray.length === 1) {
            return containerArray;
        }

        return this._getObjectContainerByPath(containerArray[pathArray[0]], pathArray.slice(1));
    },

    _validateId: function (webId) {
        return RtIdUtils.IsRuntimeId(webId);
    },

    _getArrayRepresentationOfId: function (id) {
        var agentObjId = -1;

        if (id.object !== null) {
            agentObjId = id.object.entry;
        }

        return [id.browser, id.page, id.frame, agentObjId];
    },

    _getObject: function (objectId, isRemoveFromContainer) {
        if (!this._validateId(objectId)) {
            this._logger.error("WebIdContainer._getObject: Id NOT valid. _getObject failed.");
            return null;
        }

        var idArray = this._getArrayRepresentationOfId(objectId);
        var lastLevelArray = this._getObjectContainerByPath(this._container, idArray);

        if (!lastLevelArray) {
            this._logger.trace("WebIdContainer._getObject: Id ", objectId, " not found in container.");
            return null;
        }

        var lastIndex = idArray.length - 1;

        var objToBeRemoved = lastLevelArray[lastIndex];

        if (isRemoveFromContainer) // if Object is to be removed from Container - REMOVE IT
            lastLevelArray[lastIndex] = null;

        return objToBeRemoved;
    }

};