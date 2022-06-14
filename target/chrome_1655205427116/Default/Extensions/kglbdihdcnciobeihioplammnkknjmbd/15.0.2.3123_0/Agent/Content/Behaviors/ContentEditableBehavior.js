var ContentEditableBehavior = {
    _micclass: ["WebEdit"],
    _attrs: {
        "value": function () {
            //TODO: SetUseSpecialChars(true);
            if (this._elem.innerHTML) {
                return this._elem.innerHTML.replace("\n", "\r\n");
            } else {
                return "";
            }
        },
        "name": function () {
            return this._elem.getAttribute("name") || "";
        },
        "kind": function () {
            return "other";
        },
        "readonly": function () {
            return 0;
        },
        "disabled": function () {
            return 0;
        },
        "type": function () {
            return "";
        },
        "max length": function () {
            var maxLength = parseInt(this._elem.getAttribute("maxlength"));
            return maxLength || -1;
        },
        "data": function () {
            if (this._elem.innerHTML) {
                return this._elem.innerHTML.replace("\n", "\r\n");
            } else {
                return "";
            }
        }
    },
    _methods: {
        "SET_VALUE": function (msg, resultCallback) {
            this._logger.trace("ContentEditableBehavior: on command SET_VALUE");
            if (Util.isNullOrUndefined(msg._data.value)) {
                ErrorReporter.ThrowInvalidArg();
            }
            this._elem.innerHTML = msg._data.value;
            this._fireEvent(this._elem, "input", {});
            resultCallback(msg);
        },
        "SET_VALUE_EX": function (msg, resultCallback) {
            this._logger.trace("ContentEditableBehavior: on command SET_VALUE_EX");
            var msgMakeVisible = new Msg(MSG_TYPES.SRVC_MAKE_OBJ_VISIBLE,
                                         Util.shallowObjectClone(this._parentID),
                                         {"disable browser popup": msg._data["disable browser popup"]});
            this.SRVC_MAKE_OBJ_VISIBLE(msgMakeVisible, function () {
                this._fireEvent(this._elem, "focus");
                this.InvokeMethod("SET_VALUE", msg, resultCallback);
            }.bind(this));
        },
        "SET_DATA": function (msg, resultCallback) {
            this._logger.trace("ContentEditableBehavior: on command SET_DATA");
            msg._data.value = msg._data.data;
            this.InvokeMethod("SET_VALUE", msg, resultCallback);
        }
    },
    _helpers: {
        isLearnable: Util.alwaysTrue
    },

    _eventHandler: function (recorder, ev) {
        this._logger.trace('ContentEditable.eventHandler: Received recordable event: ' + ev.type);

        switch (ev.type) {
            case 'click': return true;
            case 'focus':
                this._elem._beforeChangeTxtValue = this._elem.textContent || "";
                return true;
            case 'blur':
                if (this._elem.textContent !== this._elem._beforeChangeTxtValue) {
                    recorder.sendRecordEvent(this, ev, {
                        event: 'onchange',
                        value: this._elem.textContent,
                        type: this._elem.type,
                        force_record: true,
                    });
                }
                return true;
        }
    },
};