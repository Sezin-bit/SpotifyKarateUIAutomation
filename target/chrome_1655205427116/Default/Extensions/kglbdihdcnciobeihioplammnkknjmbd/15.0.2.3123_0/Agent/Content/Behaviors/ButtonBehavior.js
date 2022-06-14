var ButtonBehavior = {
    _micclass: ["WebButton", "StdObject"],
    _attrs: {
        "name": function () {
            if (this._elem.tagName === "INPUT") {
                if (this._elem.value) {
                    return this._elem.value;
                }
                // only supply the default value when "value" is NA, to make it compatible with old IE
                if (!this._elem.hasAttribute("value")) {
                    switch (this._elem.type) {
                        case "submit":
                            return "Submit Query";
                        case "reset":
                            return "Reset";
                    }
                }
                if (this._elem.name) {
                    return this._elem.name;
                }
            } else {
                return this._elem.textContent || this._elem.name;
            }
        },

        "value": function () {
            return this._elem.value || this._elem.textContent;
        },

        "disabled": function () {
            return this._elem.disabled ? 1 : 0;
        },

        "type": function () {
            return this._elem.type || '';
        }
    },
    _helpers: {
        isLearnable: Util.alwaysTrue,
    },

    _handlerFunc: function(recorder, ev) {
        if (ev.type === 'click') {
            recorder.sendRecordEvent(this, ev, {
                event: 'onclick',
                'event point': { x: ev.clientX, y: ev.clientY },
            });   
            return true;
        }
    },

    _eventHandler: function (recorder, ev) {
        this._logger.trace('Button.eventHandler: Received recordable event on ' + this._elem.tagName + ': ' + ev.type);
        if (ContentUtils.isTouchEnabled())
            return ButtonBehavior._eventHandlerTouchEnabled.call(this, recorder, ev);

        return ButtonBehavior._handlerFunc.call(this, recorder, ev);
    },

    _eventHandlerTouchEnabled: function (recorder, ev) {
        this._logger.trace('Button._eventHandlerTouchEnabled: Received recordable event: ' + ev.type);
        return ButtonBehavior._handlerFunc.call(this, recorder, ev);
    },

    _gestureHandler: function (recorder, gestureInfo) {
        this._logger.trace('Button._gestureHandler: Received gesture: ' + gestureInfo.event);
        if (this._elem.disabled) {
            this._logger.trace('Button._gestureHandler: element is disabled, ignore');
            return true;
        }
        return gestureInfo.event === "tap"; // Do not record Tap gestures, since we are recording Click
    }
};