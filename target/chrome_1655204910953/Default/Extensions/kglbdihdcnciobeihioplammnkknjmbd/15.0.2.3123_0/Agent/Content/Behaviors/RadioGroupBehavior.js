var RadioGroupBehavior = {
    _micclass: ["WebRadioGroup", "HtmlToggle"],
    _attrs: {
        "checked": function () {
            return this._radios[this._activeRadioIndex].checked ? 1 : 0;
        },

        "value": function () {
            return this._calculateRadioButtonValue(this._elem);
        },

        "all items": function () {
            return this._radios.map(function (elem) {
                return this._radioButtonInitialValue(elem) || "on"; // IE & FF return "on" as default value
            }, this).join(";");
        },

        "selected item index": function () {
            // slected item index is 1' based
            return this._activeRadioIndex + 1;
        },

        "items count": function () {
            return this._radios.length;
        },

        "data": function () {
            return this.GetAttrSync("value");
        }
    },

    _methods: {
        "SET_ACTIVE_RADIO_BY_VALUE": function (msg, resultCallback) {
            this._logger.trace("RadioGroupBehavior: on command SET_ACTIVE_RADIO_BY_VALUE");
            var val = msg._data.value;
            if (!val) {
                resultCallback(msg);
                return;
            }

            this._setActiveElemByValue(val);

            resultCallback(msg);
        },

        "CALL_EVENT": function (msg, resultCallback) {
            this._logger.trace("RadioGroupBehavior: on command CALL_EVENT");
            this.InvokeMethod("SET_ACTIVE_RADIO_BY_VALUE", msg, function (resMsg) {
                var event = resMsg._data.event;
                event = event.replace(/^on/, "");
                this._fireEvent(this._elem, event, resMsg._data);
                resultCallback(resMsg);
            }.bind(this));
        },

        "MAKE_VISIBLE": function (msg, resultCallback) {
            this._logger.trace("RadioGroupBehavior: on command MAKE_VISIBLE");
            this.InvokeMethod("SET_ACTIVE_RADIO_BY_VALUE", msg, function (/*resMsg*/) {
                CommonBehavior._methods.MAKE_VISIBLE.call(this, msg, resultCallback);
            }.bind(this));
        },

        "SET_ACTIVE_RADIO_BY_ELEMENT": function () {
            this._logger.trace("RadioGroupBehavior: on command SET_ACTIVE_RADIO_BY_ELEMENT");
            ErrorReporter.ThrowNotImplemented("SET_ACTIVE_RADIO_BY_ELEMENT");
        },

        "SET_DATA": function (msg, resultCallback) {
            this._logger.trace("RadioGroupBehavior: on command SET_DATA");
            msg._data.value = msg._data.data;
            this.InvokeMethod("SET_ACTIVE_RADIO_BY_VALUE", msg, resultCallback);
        },
        "SET_VALUE_EX": function (msg, resultCallback) {
            this._logger.trace("RadioGroupBehavior: on command SET_VALUE");
            this._setActiveElemByValue(msg._data.value);

            var visibleMsg = new Msg(MSG_TYPES.SRVC_MAKE_OBJ_VISIBLE, Util.shallowObjectClone(this._parentID), { "disable browser popup": msg._data["disable browser popup"] });
            this.SRVC_MAKE_OBJ_VISIBLE(visibleMsg, function () {
                this._fireEvent(this._elem, "click", {});
                resultCallback(msg);
            }.bind(this));
        }
    },
    _handlerFunc: function(recorder, ev) {
        switch (ev.type) {
            case 'click':
                // For some AUTs (like http://54.93.115.80:3000/#/cart), click on radio button will cause two click event, one on radio button, one on span
                // Do nothing if click does not happen on radio button
                if (ev.target.tagName.toLowerCase() !== 'input') {
                    return true;
                }

                this.refreshRadioGroup();
                recorder.sendRecordEvent(this, ev, {
                    event: 'onclick',
                    value: this.GetAttrSync('value'),
                });
                return true;
        }
    },
    _eventHandler: function (recorder, ev) {
        this._logger.trace('RadioGroup.eventHandler: Received recordable event: ' + ev.type);
        if (ContentUtils.isTouchEnabled())
            return RadioGroupBehavior._eventHandlerTouchEnabled.call(this, recorder, ev);

        return RadioGroupBehavior._handlerFunc.call(this, recorder, ev);
    },
    _eventHandlerTouchEnabled: function (recorder, ev) {
        this._logger.trace('RadioGroup._eventHandlerTouchEnabled: Received recordable event: ' + ev.type);
        return RadioGroupBehavior._handlerFunc.call(this, recorder, ev);
    },

    _gestureHandler: function (recorder, gestureInfo) {
        this._logger.trace('RadioGroupBehavior._gestureHandler: Received gesture: ' + gestureInfo.event);
        return gestureInfo.event === "tap"; // Do not record Tap gestures, since we are recording Click
    },

    _helpers: {
        isLearnable: Util.alwaysTrue,
        refreshRadioGroup: function (triggeringElem) {
            this._logger.trace('RadioGroupBehavior.refreshRadioGroup: started');
            if (triggeringElem)
                this._triggeringElem = triggeringElem;

            var allRadiosInGroup = [];
            if (this._elem.name !== "") {
                var radioGroupName = this._elem.name;
                var allRadios = [];
                var shadowRoot = ShadowDomUtil.getParentShadowRoot(this._elem, this._logger);
                if (!!shadowRoot)
                    allRadios = Util.makeArray(shadowRoot.querySelectorAll("input[type=radio]"));
                else
                    allRadios = Util.makeArray(document.querySelectorAll("input[type=radio]"));


                allRadiosInGroup = allRadios.filter(function (elem) {
                    // We can't filter using the querySelectorAll since that the name can contain chars that aren't allowed to be used in querySelectorAll
                    return elem.name === radioGroupName;
                });
            } else {
                // Consider radios with no name as separate groups
                allRadiosInGroup = [this._elem];
            }

            this._radios = allRadiosInGroup;

            this._activeRadioIndex = Util.arrayFindIndex(this._radios, function (radio) {
                return radio.checked;
            }.bind(this));

            // There is no radio selected in the group. So using #0
            if (this._activeRadioIndex === -1)
                this._activeRadioIndex = 0;

            this._elem = this._radios[this._activeRadioIndex];
        },
        _radioButtonInitialValue: function (elem) { // Get value of radio button without regards to other buttons (may be overridden)
            var labelText = "";
            if (content.settings.uselabelforradiobuttonvalue) {
                var labels = ContentUtils.getLabelsFromControl(elem);
                if (labels && labels.length) {
                    var label = labels[0];
                    labelText = label.textContent.trim();
                }
            }

            return labelText || elem.value || "";
        },
        // Compute the value of the radio-button in the context of the entire radio-group
        _calculateRadioButtonValue: function (radioElem) {
            this._logger.trace('RadioGroupBehavior._calculateRadioButtonValue: started');
            var val = this._radioButtonInitialValue(radioElem);

            var radioElemIndex = -1;
            var not_unique = this._radios.filter(function (elem, i) {
                if (elem === radioElem)
                    radioElemIndex = i;

                return this._radioButtonInitialValue(elem) === val;
            }, this).length > 1;

            if (radioElemIndex === -1) {
                this._logger.error('RadioGroupBehavior._calculateRadioButtonValue: could not find radio element in radio array');
                return val;
            }

            if (val === "" || val === "on" || not_unique) {
                return "#" + radioElemIndex;
            }

            return val;
        },

        _setActiveElemByValue: function (val) {
            var elem;
            var activeRadioIndex = -1;
            var matches = val.match(/^#(\d+)$/);
            if (matches) {
                var index = parseInt(matches[1], 10);
                if (index >= 0 && index < this._radios.length) {
                    elem = this._radios[index];
                    activeRadioIndex = index;
                }
            } else {
                var valUpperCase = val.toUpperCase();

                // Try to find by label first, if not found fallback to find by value.
                // There are AUTs, label is different from value.
                //
                // http://www.w3schools.com/jquerymobile/tryit.asp?filename=tryjqmob_forms_radio
                // https://code.angularjs.org/1.4.8/docs/api/ng/input/input%5Bradio%5D
                //
                this._radios.some(function (radio, index) {
                    var radioValUpperCase = this._radioButtonInitialValue(radio).toUpperCase();
                    if (radioValUpperCase === valUpperCase) {
                        elem = radio;
                        activeRadioIndex = index;
                        return true;
                    }
                    return false;
                }.bind(this));
            }

            if (activeRadioIndex == -1) {
                ErrorReporter.ThrowItemNotFound();
            }

            if (this.GetAttrSync("disabled")) {
                ErrorReporter.ThrowObjectDisabled();
            }

            this._elem = elem;
            this._activeRadioIndex = activeRadioIndex;
        }
    }
};
