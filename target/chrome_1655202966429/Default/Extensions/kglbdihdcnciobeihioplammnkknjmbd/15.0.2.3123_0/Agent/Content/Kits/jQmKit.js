var JQMKit = KitUtil.CreateKit("jQmKit", function () {
    return ContentUtils.runOnDocSync(function () {
        return !!(typeof ($) !== 'undefined' && $.mobile);
    });
});

var JQMUtil = {
    // returns { control: x, label: y } if 'elem' refers either to a JQM control or label (null otherwise) 
    // In JQM, labels have the identifying class names
    matchControl: function (elem, matchingLabelClasses, controlCriteria) {
        // There are two cases for which we should identify a control:
        // * The label doesn't have .control => we will get the LABEL => find the control
        // * The label has .control => we will get the control (due to ContentUtils.getTargetElem) => check according to its labels
        if (elem.tagName === 'LABEL' && this._hasExpectedClass(elem, matchingLabelClasses)) {
            var control = this._getControlFromLabel(elem, controlCriteria);
            if (control) {
                return { control: control, label: elem };
            }
        }
        else if (controlCriteria(elem)) {
            var label = this.getLabelFromControl(elem, matchingLabelClasses);
            if (label) {
                return { control: elem, label: label };
            }
        }
        return null;
    },
    _hasExpectedClass: function (elem, classNames) {
        return classNames.some(function (name) {
            return Util.elemHasClass(elem, name);
        });
    },
    _getControlFromLabel: function (label, controlCriteria) {
        var candidate = label.control || label.nextElementSibling;
        if (candidate && controlCriteria(candidate))
            return candidate;
        return null;
    },
    getLabelFromControl: function (elem, classNames) {
        var labels = ContentUtils.getLabelsFromControl(elem);
        if (labels && labels.length) {
            return Util.makeArray(labels).filter(function (label) {
                return this._hasExpectedClass(label, classNames);
            }, this)[0];
        }

        // If the label isn't correctly connected, check the previous element.
        var prev = elem.previousElementSibling;
        if (prev && prev.tagName === 'LABEL'
            && (!prev.control) // The label doesn't point to another element (if it points to 'elem' then 'elem' has labels)
            && this._hasExpectedClass(prev, classNames))
            return prev;
    },

};

var JQMButton = {
    createAO: function (elem, parentId) {
        if (Util.elemHasClass(elem, 'ui-btn')
            && elem.offsetWidth // visible
            )
            return KitUtil.createAO(elem, parentId, [ButtonBehavior, this._behavior]);

        return null;
    },
    _behavior: {
        name: 'JQMButtonBehavior',
        _eventHandler: function (recorder, ev) {
            this._logger.trace('JQMButton._eventHandler: Received recordable event: ' + ev.type);

            if (ContentUtils.isTouchEnabled()) {
                this._logger.trace('JQMButton._eventHandler: ignoring event in touch mode');
                return true;
            }

            return false; // allow base behaviors to handle it
        },
    }
};

var JQMCheckBox = {
    createAO: function (elem, parentId) {
        var match = JQMUtil.matchControl(elem, this._matchingClasses, this._isCheckBox);
        if (match) {
            var ret = KitUtil.createAO(match.control, parentId, [CheckBoxBehavior, this._behavior]);
            ret._label = match.label;
            return ret;
        }

        return null;
    },
    _matchingClasses: ['ui-checkbox-off', 'ui-checkbox-on'],
    _isCheckBox: function (elem) {
        return elem.tagName === 'INPUT' && elem.type === 'checkbox';
    },

    _behavior: {
        name: 'JQMCheckBoxBehavior',
        _helpers: {
            _getLogicalName: function () {
                return this._label && this._label.textContent;
            },
            _label: null,
        },
        _methods: {
            CALL_EVENT: function (msg, resultCallback) {
                this._logger.trace("JQMCheckBox: on commnad CALL_EVENT");
                var event = msg._data.event;
                event = event.toLowerCase().replace(/^on/, "");
                // Need to channel all events to the label since the element doesn't expect them
                this._fireEvent(this._label, event, msg._data);
                resultCallback(msg);
            },
            "SET_VALUE_EX": function (msg, resultCallback) {
                this._logger.trace("JQMCheckBox: on command SET_VALUE_EX");
                if (this.GetAttrSync("disabled") === 1) {
                    ErrorReporter.ThrowObjectDisabled();
                }

                if (this.GetAttrSync("part_value") !== msg._data.value) {
                    var visibleMsg = new Msg(MSG_TYPES.SRVC_MAKE_OBJ_VISIBLE, Util.shallowObjectClone(this._parentID), { "disable browser popup": msg._data["disable browser popup"] });
                    this.SRVC_MAKE_OBJ_VISIBLE(visibleMsg, function () {
                        // Some WebView or mobile APP need a valid user action to gain focus
                        // element.focus() and window.focus() cannot bring focus. Add a fake
                        // user action here, hoping this won't disturbe AUT and others. 
                        document.body.click(); // Fake user click on page to gain focus.

                        this._elem.click(); // Use native click insteadof fire click event.
                        resultCallback(msg);
                    }.bind(this));
                }
                else {
                    resultCallback(msg);
                }
            }
        },
        _eventHandler: function (recorder, ev) {
            this._logger.trace('JQMCheckBox._eventHandler: Received recordable event: ' + ev.type);

            if (ContentUtils.isTouchEnabled()) {
                this._logger.trace('JQMCheckBox._eventHandler: ignoring event in touch mode');
                return true;
            }

            // note, 'change' isn't fired on JQM check-box
            if (ev.type === 'click') { // Event arrives before the value has changed (reverse values)
                recorder.sendRecordEvent(this, ev, {
                    event: 'onclick',
                    part_value: this._elem.checked ? 'OFF' : 'ON',
                });
                return true;
            }

            return false; // allow base behaviors to handle it
        },
        _gestureHandler: function (recorder, gestureInfo) {
            if (gestureInfo.event === 'tap') {
                recorder.sendRecordEvent(this, null, {
                    event: 'onclick',
                    part_value: this._elem.checked ? 'OFF' : 'ON', // The message gets to us before the change
                    force_record: true
                });
            }
        },
    },
};

var JQMRadioGroup = {
    createAO: function (elem, parentId) {
        var match = JQMUtil.matchControl(elem, this.matchingClasses, this._isRadio);
        if (match) {
            var ao = KitUtil.createAO(match.control, parentId, [RadioGroupBehavior, this._behavior]);
            ao.refreshRadioGroup(ao._elem);

            return ao;
        }
        return null;
    },
    matchingClasses: ['ui-radio-off', 'ui-radio-on'],
    _isRadio: function (elem) {
        return elem.tagName === 'INPUT' && elem.type === 'radio';
    },
    _behavior: {
        name: 'JQMRadioGroup',
        _methods: {
            CALL_EVENT: function (msg, resultCallback) {
                this._logger.trace("JQMRadioGroup: on command CALL_EVENT");
                this.InvokeMethod("SET_ACTIVE_RADIO_BY_VALUE", msg, function (resMsg) {
                    var event = resMsg._data.event;
                    event = event.replace(/^on/, "");
                    var label = JQMUtil.getLabelFromControl(this._elem, JQMRadioGroup.matchingClasses);
                    // Need to channel all events to the label since the element doesn't expect them
                    this._fireEvent(label || this._elem, event, resMsg._data);
                    resultCallback(resMsg);
                }.bind(this));
            },
            "SET_VALUE_EX": function (msg, resultCallback) {
                this._logger.trace("JQMRadioGroup: on command SET_VALUE_EX");
                this._setActiveElemByValue(msg._data.value);
            
                var visibleMsg = new Msg(MSG_TYPES.SRVC_MAKE_OBJ_VISIBLE, Util.shallowObjectClone(this._parentID), { "disable browser popup": msg._data["disable browser popup"] });
                this.SRVC_MAKE_OBJ_VISIBLE(visibleMsg, function () {

                    // Some WebView or mobile APP need a valid user action to gain focus
                    // element.focus() and window.focus() cannot bring focus. Add a fake
                    // user action here, hoping this won't disturbe AUT and others. 
                    document.body.click(); // Fake user click on page to gain focus.

                    this._elem.click(); // Use native click insteadof fire click event.
                    resultCallback(msg);
                }.bind(this));
            }

        },
        _eventHandler: function (recorder, ev) {
            this._logger.trace('JQMRadioGroup._eventHandler: Received recordable event: ' + ev.type);
            if (ev.type === 'click') { // note, 'change' isn't fired on JQM radio-button
                this.refreshRadioGroup();
                recorder.sendRecordEvent(this, ev, {
                    event: 'onclick',
                    value: this._calculateRadioButtonValue(this._triggeringElem || this._elem),
                });
                return true;
            }
        },

        _helpers: {
            _radioButtonInitialValue: function (elem) {
                var label = JQMUtil.getLabelFromControl(elem, JQMRadioGroup.matchingClasses);
                if (label && label.textContent)
                    return label.textContent.trim();

                return elem.value || "";
            },
        },
    },
};

// Register factories (order matters)
JQMKit.registerFactory(JQMCheckBox);
JQMKit.registerFactory(JQMRadioGroup);
JQMKit.registerFactory(JQMButton); // should be last

// Register the kit
KitsManager.prototype.LoadKit(JQMKit);
