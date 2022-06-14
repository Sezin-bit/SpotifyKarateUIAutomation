// © Copyright 1992-2017 Hewlett Packard Enterprise Development LP

/**
 * BrowserContentHelper is to be used during recording. It's supposed to help in adding the Browser properties which are calculated from the Content.
 */
function BrowserContentHelper(frameAo) {
    this._logger = new LoggerUtil("Content.BrowserContentHelper");
    this._frameAo = frameAo;
}

BrowserContentHelper.prototype = {
    _logger: null,
    _frameAo: null,

    _attrs: {
        micclass: function () {
            return ["Browser"];
        },
        abs_x: function () {
            // This logic is duplicated also in Browser.js
            // Make sure you fix it there as well if this code is ever touched
            return this._frameAo.GetAttrSync('window_rect').left;
        },
        abs_y: function () {
            // This logic is duplicated also in Browser.js
            // Make sure you fix it there as well if this code is ever touched
            return this._frameAo.GetAttrSync('window_rect').top;
        }
    },

    _attrsFromFrame: {
        title: "title",
        url: "url",
        "logical name": "logical name",
        name: "title", // Note that the name is mapped to the frame's title property
        height: "height",
        width: "width"
    },

    getID: function () {
        var frameRtid = this._frameAo.getID();
        return { browser: frameRtid.browser, page: -1, frame: -1, object: null };
    },

    GetAttrSync: function (property) {
        this._logger.trace("GetAttrSync: query property " + property);
        var func = this._attrs[property];

        if (func)
            return func.call(this);

        if (this._attrsFromFrame[property])
            return this._frameAo.GetAttrSync(this._attrsFromFrame[property]);

        this._logger.trace("GetAttrSync: returning partial value for Browser property: " + property);
        return AttrPartialValueUtil.WrapValue(property, null, null);
    },

    QueryAttributesSync: function (attrsObj) {
        this._logger.trace("QueryAttributesSync: called for attributes: ", attrsObj);
        var attrsObjRes = {};
        var attrList = Object.keys(attrsObj);
        attrList.forEach(function (attr) {
            attrsObjRes[attr] = this.GetAttrSync(attr);
        }, this);

        return attrsObjRes;
    }
};
