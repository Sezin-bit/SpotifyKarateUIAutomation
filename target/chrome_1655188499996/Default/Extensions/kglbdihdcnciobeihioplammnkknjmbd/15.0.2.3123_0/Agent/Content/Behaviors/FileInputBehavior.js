var FileInputBehavior = {
    _micclass: ["WebFile", "WebEdit", "WebButton", "StdObject"],
    _attrs: {
        "name": function () {
            return this._elem.name || "WebFile";
        },
        "readonly": function () {
            return this._elem.readOnly ? 1 : 0;
        },
        "width in characters": function () {
            return this._elem.size;
        },
        "value": function () {
            return this._getFilesText();
        },
        "required": function () {
            return this._elem.required || false;
        }
    },
    _helpers: {
        isLearnable: Util.alwaysTrue,
        _getFilesText: function () {
            var files = [];
            for (var i = 0; i < this._elem.files.length; ++i) {
                files.push(this._elem.files[i]);
            }
            var filesText = files.map(function (file) { return file.name; }).join(", ");
            return filesText;
        }
    },
    _eventHandler: function (recorder, ev) {
        this._logger.trace('WebFile.eventHandler: Received recordable event on ' + this._elem.tagName + ': ' + ev.type);
        switch (ev.type) {
            case 'click':
                recorder.sendRecordEvent(this, ev, { event: 'onfocus' });
                this._elem._beforeChangeFilesValue = this._getFilesText();
                return true;
            case 'focus':
                return true;
            case 'change':
                var filesText = this._getFilesText();
                if (filesText !== this._elem._beforeChangeFilesValue) {
                    recorder.sendRecordEvent(this, ev, {
                        event: 'onchange',
                        value: filesText,
                        type: this._elem.type,
                        force_record: true,
                    });
                }
                return true;
            case 'blur':
                return true;
            default:
                return false;
        }
    }
};