var CheckBoxBehavior = {
    _micclass: ["WebCheckBox", "HtmlToggle"],
    _attrs: {
        "logical name": function () {
            var res = this._getLogicalName();
            if (res)
                return res;

            var text = this.GetAttrSync("acc_name");
            if (text)
                return text;

            text = this.GetAttrSync("name");
            if (text)
                return text;

            text = this.GetAttrSync("innertext");
            if (text) 
                return text;

            // since checkboxes are usually entered like the following (the text is next to the element)
            // <input type="checkbox" name="vehicle" value="Car"> I have a car
            var nextSibling = this._elem.nextSibling;
            if (nextSibling && nextSibling.nodeType === 3)
                return nextSibling.textContent;

            return "";
        },
    
        "part_value": function () {
            return this._elem.checked ? "ON" : "OFF";
        },

        "data": function () {
            return this.GetAttrSync("part_value");
        },

        "value": function () {
            return this._elem.value || "ON";
        },

        "checked": function () {
            return this._elem.checked ? 1 : 0;
        }
    },
    _methods: {
        "SET_DATA": function (msg, resultCallback) {
            this._logger.trace("CheckBoxBehavior: on command SET_DATA");
            var value = msg._data.data;
            if (typeof value === "string")
                value = value.toUpperCase();
            if (this.GetAttrSync("part_value") !== value) {
                this._fireEvent(this._elem, "click", {});
            }
            resultCallback(msg);
        },
        "SET_VALUE_EX": function (msg, resultCallback) {
            if (this.GetAttrSync("disabled") === 1) {
                ErrorReporter.ThrowObjectDisabled();
            }

            var value = msg._data.value;
            if (typeof value === "string")
                value = value.toUpperCase();
            if (this.GetAttrSync("part_value") !== value) {
                var visibleMsg = new Msg(MSG_TYPES.SRVC_MAKE_OBJ_VISIBLE, Util.shallowObjectClone(this._parentID), { "disable browser popup": msg._data["disable browser popup"] });
                this.SRVC_MAKE_OBJ_VISIBLE(visibleMsg, function () {
                    this._fireEvent(this._elem, "click", {});
                    resultCallback(msg);
                }.bind(this));
            }
            else {
                resultCallback(msg);
            }
        }
    },
    _eventHandler: function (recorder, ev) {
        this._logger.trace('CheckBox.eventHandler: Received recordable event: ' + ev.type);

        if (ContentUtils.isTouchEnabled())
            return CheckBoxBehavior._eventHandlerTouchEnabled.call(this, recorder, ev);

        if (ev.type === 'click') {
            // for checkbox with clickable label as below
            // <label>
            //      <input type="checkbox">My checkbox
            // </label>
            // to avoid redundant recorded script, we only record the event triggerd by checkbox itself
            if (this._elem === ev.target) { 
                recorder.sendRecordEvent(this, ev, {
                    event: 'onclick',
                    part_value: this._elem.checked ? 'ON' : 'OFF',
                });
            }
            return true;
        }
    },
    _eventHandlerTouchEnabled: function (recorder, ev) {
        this._logger.trace('CheckBox._eventHandlerTouchEnabled: Received recordable event: ' + ev.type);
        switch (ev.type) {
            case 'click':
                recorder.sendRecordEvent(this, ev, {
                    event: 'onclick',
                    part_value: this._elem.checked ? 'ON' : 'OFF',
                    force_record: true
                });
                return true;
        }
    },

    _gestureHandler: function (recorder, gestureInfo) {
        this._logger.trace('CheckBox._gestureHandler: Received gesture: ' + gestureInfo.event);
        return gestureInfo.event === "tap"; // Do not record Tap gestures
    },

    _helpers: {
        _getLogicalName: function() { /* overrideable */ }, 
        isLearnable: Util.alwaysTrue,
    }
};