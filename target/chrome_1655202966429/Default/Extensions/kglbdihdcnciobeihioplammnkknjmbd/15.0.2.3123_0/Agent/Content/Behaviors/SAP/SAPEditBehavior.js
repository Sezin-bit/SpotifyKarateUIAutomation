var SAPCRMSearchFormEditBehavior = {
    _attrs: {
        "sap attached text": function () {
            // TODO: CSapCustomObject::Instance()->ShouldUseTooltip()
            return this._elem.title;
        }
    }
};

var SAPICWCTextAreaBehavior = {
    _attrs: {
        "sap attached text": function () {
            return this.getICWCTitle();
        }
    },
    _helpers: {
        getICWCTitle: function () {
            var container = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_ICWC_APP_CONTAINER);
            if (container != null) {
                var title = SapConfigurationUtil.getElementOfCollection(container, SAP_SPECIFIER_ENUM.SAP_ICWC_APP_TITLE);
                if (title != null) {
                    return Util.cleanTextProperty(title.innerText);
                }
            }
            return "";
        }
    }
};

var SAPCRMTextAreaBehavior = {
    _helpers: {
        getICWCTitle: function () {
            var container = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_TEXTAREA_CONTAINER);
            if (container != null) {
                var title = SapConfigurationUtil.getElementOfCollection(container, SAP_SPECIFIER_ENUM.SAP_CRM_TEXTVIEW_TESTMODE);
                if (title != null) {
                    return Util.cleanTextProperty(title.innerText);
                }
            }
            return "";
        }
    }
};

var SAPICWCEditBehavior = {
    _attrs: {
        "sap attached text": function () {
            return Util.cleanTextProperty(this.getICWCAttachedText(this._elem) || this._elem.title || this.getSAPAttachedTextWithinNearestAncestor(this._elem, 5));
        }
    },
    _helpers: {
        getICWCAttachedText: function (elem) {
            if (!elem || !elem.id)
                return "";
    
            var Label_group;
            if (document != null)
                Label_group = document.getElementsByTagName("LABEL");
    
            if (Label_group == null)
                return "";
    
            for (var i = 0; i < Label_group.length; i++) {
                var label = Label_group[i];
                var target = label.htmlFor;
                if (!target || target.length == 0) {
                    target = label.getAttribute("f");
                    if (elem.id.indexOf("input#") == 0) {
                        target = "input#" + target;
                    }
                }
                if (elem.name == target || elem.id == target) {
                    return label.innerText.trim(); // There may be more than one label per element so don't take an empty one.
                }
            }
            return "";
        },
        getSAPAttachedTextWithinNearestAncestor: function(elem, depth) {
            var Label_group = null;
            if (document != null)
                Label_group = document.getElementsByTagName("LABEL");
    
            if (Label_group == null || Label_group.length == 0)
                return "";

            var parents = [];
            for (var i = 0; i < depth && (elem = elem.parentElement) != null; i++) {
                parents.push(elem);
            }

            for (var i = 0; i < Label_group.length; i++) {
                var label = Label_group[i];
                for (var j = 0; j < depth && (label = label.parentElement) != null; j++) {
                    if (parents.indexOf(label) >= 0) {
                        return label.innerText;
                    }
                }
            }

            return "";
        }
    }
};


var SAPEditBehavior = {
    _micclass: ["SAPEdit", "WebEdit", "StdObject"],

    _attrs: {
        "logical name": function () {
            return this.GetAttrSync("sap attached text");
        },

        "sap attached text": function () {
            return SAPUtils.getLabelOrAttachedText(this);
        },

        "name": function () {
            return this._elem.name ||
                // Get correct micClass for derived classes (e.g. WebRange)
                Util.getMicClass(this);
        },

        "value": function () {
            return this._elem.value || "";
        },

        "default value": function () {
            //TODO: SetUseSpecialChars(true)
            return this._elem.defaultValue;
        },

        "cols": function () {
            return this._elem.size || this._elem.cols;
        },

        "width in characters": function () {
            return this.GetAttrSync("cols");
        },

        "rows": function () {
            return this._elem.rows || 0;
        },

        "kind": function () {
            if (this._elem.tagName === "INPUT") {
                return "singleline";
            } else if (this._elem.tagName === "TEXTAREA") {
                return "multiline";
            }
        },

        "type": function () {
            // Input's type could be set to any value, for example <input type="abc" />,
            // in this case, getAttribute() will return "abc", we use element.type instead
            // Input type list: http://www.w3schools.com/html/html_form_input_types.asp
            var inputTypes = ['text', 'password', 'submit', 'radio', 'checkbox', 'button', // old types
                'color', 'date', 'datetime', 'datetime-local', 'email', 'month', 'number', 'range', 'search', 'tel', 'time', 'url', 'week']; // html5 added types

            var type = this._elem.getAttribute('type');
            if (type == null || inputTypes.indexOf(type) == -1) {
                type = this._elem.type;
            }
            return type;
        },

        "disabled": function () {
            return this._elem.disabled ? 1 : 0;
        },

        "readonly": function () {
            return this._elem.readOnly ? 1 : 0;
        },

        "max length": function () {
            // The computed value is different on various browsers when max length attribute is not specified
            // or set to 0x-1. Process the edge case here to align it cross browsers. Facts:
            //   Input, Chrome: 0x80000, Firefox: -1, Edge: 0x7fffffff, IE: -1
            //   Text Area, Chrome: -1, Firefox: -1, Edge: 0x7fffffff, IE: 0x7fffffff
            var maxLength = this._elem.maxLength;
            if (this._elem.tagName === "INPUT")
                return (maxLength == -1 || maxLength == 0x7fffffff) ? 0x80000 : maxLength;
            if (this._elem.tagName === "TEXTAREA")
                return (maxLength == 0x80000 || maxLength == 0x7fffffff) ? -1 : maxLength;

            return maxLength;
        },

        "data": function () {
            return this.GetAttrSync("value");
        },

        "innertext": function () {
            return this._elem.tagName === "TEXTAREA" ? Util.cleanTextProperty(this.GetAttrSync("value")) : "";
        },

        "placeholder": function () {
            return this._elem.placeholder || "";
        },

        "pattern": function () {
            return this._elem.pattern || "";
        },

        "required": function () {
            return this._elem.required || this._elem.getAttribute("aria-required") || false;
        },
        "is nwbc lookup edit": function () {
            return SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPSP_NWBC_LOOKUP_EDIT);
        },
        "sap searchbutton id": function () {
            var searchButton = SAPUtils.findSearchButton(this, SAPUtils.isSapTableChild(this));
            if (searchButton)
                return searchButton.getID();
        }
    },

    _methods: {
        "SET_VALUE": function (msg, resultCallback) {
            this._logger.trace("SAPEditBehavior: on command SET_VALUE");
            if (Util.isNullOrUndefined(msg._data.value)) {
                ErrorReporter.ThrowInvalidArg();
            }
            var value = msg._data.value;
            var performCommit = msg._data.perform_commit;
            Util.assert(typeof (value) === "string");

            if (typeof value === "string") {
                //set the string without the last character
                var newText = msg._data.value;
                this._elem.value = newText.substring(0, newText.length - 1);

                //charAt will return "" when out of range like string "";
                var lastKey = msg._data.value.charAt(msg._data.value.length - 1);

                //fire keyboard event for the last character;
                this._fireEvent(this._elem, "keydown", { key: lastKey });
                this._fireEvent(this._elem, "keypress", { key: lastKey });
                this._elem.value = msg._data.value;
                this._fireEvent(this._elem, "input", { key: lastKey });
                this._fireEvent(this._elem, "keyup", { key: lastKey });
            } else {
                this._elem.value = value;
                this._fireEvent(this._elem, "input", {});
            }

            if (performCommit) {
                this._fireEvent(this._elem, "change");
                this._fireEvent(this._elem, "blur");
            }

            resultCallback(msg);
        },
        "SET_VALUE_EX": function (msg, resultCallback) {
            // The extended version will do more before perform set operation:
            // 1. check valid state: Disabled/Readonly/Max Length
            // 2. Make the DOM object visible and put focus on it
            // 
            var isDisabled = this.GetAttrSync("disabled");
            var isReadonly = this.GetAttrSync("readonly");
            if (isDisabled || isReadonly) {
                ErrorReporter.ThrowObjectDisabled();
            }

            var maxLength = this.GetAttrSync("max length");
            if (Util.isNullOrUndefined(maxLength))
                maxLength = -1;
            var text = msg._data.value || "";
            if (-1 != maxLength && text.length > maxLength) {
                ErrorReporter.ThrowInvalidArg();
            }

            var msgMakeVisible = new Msg(MSG_TYPES.SRVC_MAKE_OBJ_VISIBLE, Util.shallowObjectClone(this._parentID), { "disable browser popup": msg._data["disable browser popup"] });
            this.SRVC_MAKE_OBJ_VISIBLE(msgMakeVisible, function () {
                this._fireEvent(this._elem, "focus");
                this.InvokeMethod("SET_VALUE", msg, resultCallback);
            }.bind(this));
        },
        "SET_DATA": function (msg, resultCallback) {
            this._logger.trace("SAPEditBehavior: on command SET_DATA");
            msg._data.value = msg._data.data;
            this.InvokeMethod("SET_VALUE", msg, resultCallback);
        },
        "SAP_GET_EDIT_ACTIVIATION_STATUS": function (msg, resultCallback) {
            this._logger.trace("SAPEditBehavior: on command SAP_GET_EDIT_ACTIVIATION_STATUS");
            msg._data["sap edit need activation"] = this._elem.tagName == "INPUT" && 
                SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_EDITBOX); // Only ICWC edit box needs activation.
            resultCallback(msg);
        }
    },

    _eventHandler: function (recorder, ev) {
        this._logger.trace('SAPEdit._eventHandler: Received recordable event: ' + ev.type);

        switch (ev.type) {
            case 'click': return true;
            case 'propertychange':
            case 'mousedown':
            case 'focus':
            case 'keydown':
                if (!this._elem._recordInfo) {
                    this._elem._recordInfo = {
                        initialValue: this._elem.value,
                        latestValue: this._elem.value
                    };
                    return this._sendSetRecordEvent(recorder, ev, this._elem._recordInfo);
                }
                break;
            case 'keyup':
            case 'input':
            case 'textInput':
                if (!this._elem._recordInfo)
                    return false;

                // Send set record when it is 'Enter' keyup on input,
                // this will handle the case that AUT listen to 'Enter' keyup event to trigger navigation.
                var isEnterKeyup = ev.type === "keyup" && ev.which === 13;
                if (isEnterKeyup && this._elem.tagName === "INPUT") {
                    if (this._elem.value != this._elem._recordInfo.initialValue) // value didn't change, no need to record
                        return this._sendSetRecordEvent(recorder, ev, this._elem._recordInfo);
                }

                this._elem._recordInfo.latestValue = this._elem.value;
                return true;

            case 'blur':
                if (this._elem._recordInfo == null)
                    return false;

                //blur will delete the _recordInfo;
                var recordInfo = this._elem._recordInfo;
                delete this._elem._recordInfo;
                //update the latestValue as the elem.value;
                recordInfo.latestValue = this._elem.value;

                if (recordInfo.latestValue === recordInfo.initialValue) // value didn't change, no need to record
                    return false;

                res = this._sendSetRecordEvent(recorder, ev, recordInfo);
                return res;
        }
    },

    _gestureHandler: function (recorder, gestureInfo) {
        this._logger.trace('SAPEdit._gestureHandler: Received gesture: ' + gestureInfo.event);
        return gestureInfo.event === "tap"; // Do not record Tap gestures
    },


    _eventTargetStarted: function (recorder) {
        if (!ContentUtils.isTouchEnabled())  // Do nothing if not touch enabled
            return false;

        if (this._elem._recordInfo) // Check whether initial record information is already found
            return true;

        this._elem._recordInfo = {
            initialValue: this._elem.value,
            latestValue: this._elem.value
        };

        return true;
    },

    _eventTargetEnded: function (recorder) {
        if (!ContentUtils.isTouchEnabled()) // Do nothing if not touch enabled
            return false;

        var recordInfo = this._elem._recordInfo;
        if (!recordInfo) // No record info found - don't record anything
            return false;

        delete this._elem._recordInfo;

        if (recordInfo.latestValue === recordInfo.initialValue) // value didn't change, no need to record
            return false;

        recorder.sendRecordEvent(this, null, {
            event: 'onchange',
            value: recordInfo.latestValue,
            type: this._elem.type,
            force_record: true,
        });

        return true;
    },

    _helpers: {
        isLearnable: Util.alwaysTrue,

        _sendSetRecordEvent: function (recorder, ev, recordInfo) {
            //var recordInfo = this._elem._recordInfo;
            if (!recordInfo) // If wasn't treated by 'change' event
                return false;

            recorder.sendRecordEvent(this, ev, {
                event: 'on' + ev.type,
                value: recordInfo.latestValue,
                type: this._elem.type,
                "sap is password": this._elem.type == "password",
                force_record: true,
                "event key": ev.key,
            });
            return true;
        },
    }

};

