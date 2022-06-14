var ImageBehavior = {
    _micclass: ["Image"],
    _attrs: {
        "logical name": function () {
            var src = this._elem.src || "";
            src = src.startsWith("data:image") ? "data:image" : src;
            switch (this._elem.tagName) {
                case "IMG":
                    return this._getNiceName(this._elem.alt) ||
						this._getNiceName(src);
                case "INPUT":
                    return this._getNiceName(this._elem.alt) ||
						this._getNiceName(this._elem.name) ||
						this._getNiceName(src);
                case "AREA":
                    return this._getNiceName(this._elem.alt) ||
						this._getNiceName(this._elem.href);
            }
        },

        "name": function () {
            return this._getNiceName(this._elem.name) || "Image";
        },

        "alt": function () {
            return this._elem.alt || "";
        },

        "src": function () {
            return this._elem.src || "";
        },

        "file name": function () {
            var src = this.GetAttrSync("src");
            if (src.indexOf("data:") === 0)
                return "";
            return src.replace(/.*\//, "");
        },

        "image type": function () {
            return this._getImageTypeName();
        }
    },

    _helpers: {
        _getNiceName: function (name) {
            if (!name) {
                return name;
            }
            var nice_name = name;
            nice_name = nice_name.replace(/.*\\/, "");  // compatability with WIFF
            nice_name = nice_name.replace(/.*\//, "");  // remove directory
            nice_name = nice_name.replace(/\.[^.]*$/, ""); // remove extension
            return nice_name;
        },

        _getImageTypeName: function () {
            if (this._elem.tagName === "INPUT") {
                return "Image Button";
            }
            var isMap = this._elem.isMap;
            var useMap = this._elem.useMap || "";
            if (isMap && useMap.length > 0) {
                return "Client & Server Side ImageMap";
            }
            if (isMap) {
                return "Server Side ImageMap";
            }
            if (useMap.length > 0) {
                return "Client Side ImageMap";
            }
            return "Plain Image";
        },
        isLearnable: Util.alwaysTrue
    },
    _eventHandler: function (recorder, ev) {
        this._logger.trace('Image.eventHandler: Received recordable event on ' + this._elem.tagName + ': ' + ev.type);
        if (ContentUtils.isTouchEnabled())
            return false; // Touch events will be recorded as gestures

        var eventData;
        switch (ev.type) {
            case 'click':
                recorder.sendRecordEvent(this, ev, {
                    event: 'onclick',
                    'event point': { x: ev.offsetX, y: ev.offsetY },
                    'image type': this.GetAttrSync('image type')
                });
                return true;
            default:
                return false;
        }
    },
};