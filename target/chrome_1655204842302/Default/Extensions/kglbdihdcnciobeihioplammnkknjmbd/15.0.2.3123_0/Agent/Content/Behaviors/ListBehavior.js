var ListBehavior = {
    _micclass: ["WebList", "StdObject"],
    _attrs: {
        "name": function () {
            return this._elem.name || "select";
        },

        "select type": function () {
            return this._elem.multiple ? "Extended Selection" : (this._elem.size > 1 ? "Single Selection" : "ComboBox Select");
        },

        "multiple value": function () {
            return this.GetAttrSync("selection");
        },

        "selection": function () {
            return this._getOptionTextWithPred(this._selectedPred);
        },

        "value": function () {
            return this.GetAttrSync("selection");
        },

        "default value": function () {
            return this._getOptionTextWithPred(function (option) {
                return option.defaultSelected;
            });
        },

        "all items": function () {
            return Util.makeArray(this._elem.options).map(
                function (e) { return e.text; }
            ).join(';');
        },

        "items count": function () {
            return this._elem.options.length;
        },

        "selected item index": function () {
            if (this._elem.multiple) {
                var indexes = [];
                for (var i = 0; i < this._elem.options.length; i++) {
                    if (this._elem.options[i].selected) {
                        indexes.push(i);
                    }
                }
                return indexes.join(";");
            } else {
                var val = this._elem.selectedIndex;
                return (val != null && val !== -1) ? val.toString() : "";
            }
        },

        "selected items count": function () {
            if (this._elem.multiple) 
                return Util.makeArray(this._elem.options).filter(this._selectedPred).length;
            else
            {
                var selectedIndex = this._elem.selectedIndex;
                return (selectedIndex != null && selectedIndex !== -1) ? 1 : 0;
            }
        },

        "visible items": function () {
            var elem = this._elem;
            var threshold;

            if (elem.size > 0) {
                threshold = elem.size;

                var javaFXPattern = /JavaFX\/([\d.]*)/i;   //JavaFX/7.0  JavaFX/8.0
                var matchResult = javaFXPattern.exec(navigator.userAgent);
                if (matchResult) {
                    var versionNumber = parseFloat(matchResult[1]);
                    if (versionNumber <= 8.0) {
                        if (elem.size < 4) {
                            //javafx 7.0 & 8.0 have a bug, for single select elem.size in [2,3] it display 4 items.
                            //for multiple select, it display 4 items at least despite that elem.size may be less than 4.
                            threshold = (!elem.multiple && elem.size == 1) ? 1 : 4;
                        }
                    }
                }
                
            } else { // size not set
                // If the multiple attribute is present, then the size attribute's default value is 4. 
                // If the multiple attribute is absent, then the size attribute's default value is 1. 
                // For more information, see: https://www.w3.org/wiki/HTML/Elements/select
                threshold = elem.multiple ? 4 : 1;
            }
            return Math.min(elem.length, threshold);
        },

        "multiple": function () {
            return this._elem.multiple;
        },

        "hwnd": function () {

        },

        "data": function () {
            return this.GetAttrSync("value");
        },

        "innertext": function () {
            var all_items = this.GetAttrSync("all items");
            all_items = all_items.replace(/;/g, " ");
            all_items = " " + all_items;
            all_items = all_items.replace(/\xA0/g, " ");
            all_items = all_items.replace(/\r|\n/g, "");
            return all_items;
        }
    },

    _methods: {
        "ITEM_TO_NUM": function (msg, resultCallback) {
            this._logger.trace("ListBehavior: on command ITEM_TO_NUM");
            var item = msg._data.AN_ITEM_TEXT;
            for (var i = 0; i < this._elem.options.length; ++i) {
                if (this._elem.options[i].value === item) {
                    msg._data.item_index = i;
                    resultCallback(msg);
                    return;
                }
            }
            ErrorReporter.ThrowItemNotFound();
        },

        "NUM_TO_ITEM": function (msg, resultCallback) {
            this._logger.trace("ListBehavior: on command NUM_TO_ITEM");
            var index = msg._data.item_index;
            if (index < 0 || index >= this._elem.options.length) {
                ErrorReporter.ThrowItemNotFound();
            }
            msg._data.AN_ITEM_TEXT = this._elem.options[index].text;
            resultCallback(msg);
        },

        "LIST_SELECT": function (msg, resultCallback) {
            this._logger.trace("ListBehavior: on command LIST_SELECT");
            var rtn = this._getOptionItemToSelect(msg._data.value, true);
            this._elem.selectedIndex = rtn.index;
            resultCallback(msg);
        },

        "LIST_EXTEND_SELECT": function (msg, resultCallback) {
            this._logger.trace("ListBehavior: on command LIST_EXTEND_SELECT");
            var rtn = this._getOptionItemToSelect(msg._data.value, true);
            rtn.option.selected = true;
            resultCallback(msg);
        },

        "LIST_DESELECT": function (msg, resultCallback) {
            this._logger.trace("ListBehavior: on command LIST_DESELECT");
            var rtn = this._getOptionItemToSelect(msg._data.value, true);
            rtn.option.selected = false;
            resultCallback(msg);
        },
        
        "LIST_SELECT_EX": function (msg, resultCallback) {
            this._logger.trace("ListBehavior: on command LIST_SELECT_EX");
            this._listOperationEx(msg, "LIST_SELECT", resultCallback);
        },

        "LIST_EXTEND_SELECT_EX": function (msg, resultCallback) {
            this._logger.trace("ListBehavior: on command LIST_EXTEND_SELECT_EX");
            this._listOperationEx(msg, "LIST_EXTEND_SELECT", resultCallback);
        },

        "LIST_DESELECT_EX": function (msg, resultCallback) {
            this._logger.trace("ListBehavior: on command LIST_DESELECT_EX");
            this._listOperationEx(msg, "LIST_DESELECT", resultCallback);
        },

        "SET_DATA": function (data, resultCallback) {
            // Throw an exception - method seems not to be in use 
            // (it doesn't work in the current state)
            ErrorReporter.ThrowNotImplemented("AO->ListBehavior._methods.SET_DATA");

            this._logger.trace("ListBehavior: on command SET_DATA");
            data = data.data;
            var matches = data.match(/^#(\d+)$/);
            if (matches) {
                data.value = parseInt(matches[1], 10);
            } else {
                data.value = data;
            }
            this.InvokeMethod("LIST_SELECT", data, resultCallback);
        }
    },
    _eventHandler: function (recorder, ev) {
        this._logger.trace('List.eventHandler: Received recordable event: ' + ev.type);
        switch (ev.type) {
            case 'click':
                return true;
            case "mousedown":
                if (ev.target === this._elem)  // Don't update selection when clicking on an OPTION element
                    this._updatePreviousSelection();

                return false; // No recording, only saving previous selection
            case 'change':
                var selection = this._elem.multiple ? // when multiple, the package expects 'value' to be an array
                    [this._getOptionsWithPred(this._selectedPred)] :
                    this.GetAttrSync('selection');

                recorder.sendRecordEvent(this, ev, {
                    event: 'onchange',
                    value: selection,
                    previous_selection: [this._elem.previousSelection],
                });
                this._updatePreviousSelection();
                return true;
        }
    },
    _gestureHandler: function (recorder, gestureInfo) {
        this._logger.trace('ListBehavior._gestureHandler: Received gesture: ' + gestureInfo.event);
        return gestureInfo.event === "tap"; // Do not record Tap gestures
    },
    _helpers: {
        _listOperationEx: function(msg, opMethod, resultCallback) {
            var msgMakeVisible = new Msg(MSG_TYPES.SRVC_MAKE_OBJ_VISIBLE, Util.shallowObjectClone(this._parentID), { "disable browser popup": msg._data["disable browser popup"] });
            this.SRVC_MAKE_OBJ_VISIBLE(msgMakeVisible, function () {
                this._fireEvent(this._elem, "focus");
                this.InvokeMethod(opMethod, msg, function(resMsg) {
                    this._fireEvent(this._elem, 'change');
                    this._fireEvent(this._elem, 'blur');
                    resultCallback(resMsg);
                }.bind(this));
            }.bind(this));
        },
        _getOptionItemToSelect: function (item, throwOnNotFound) {
            var rtnVal = {};
            if (typeof (item) === "number") {
                if (item >= 0 && item < this._elem.options.length) {
                    rtnVal.index = item;
                    rtnVal.option = this._elem.options[item];
                }
            } else {
                for (var i = 0; i < this._elem.options.length; ++i) {
                    // replace &nbsp; with white space and then compare
                    if (this._elem.options[i].text.replace(/\u00a0/g, ' ') === item.replace(/\u00a0/g, ' ')) {
                        rtnVal.index = i;
                        rtnVal.option = this._elem.options[i];
                        break;
                    }
                }
            }
            if (rtnVal.index === undefined && throwOnNotFound) {
                ErrorReporter.ThrowItemNotFound();
            }
            return rtnVal;
        },
        _getUniqueValue: function (opt, i) {
            if (!opt) // for empty strings return the index
                return '#' + i;

            var matches =  Util.makeArray(this._elem.options).filter(function (curr) {
                return opt === curr.text;
            });
        
        if (matches.length === 1) {
            return opt;
        }
        
        // for duplicate values, return the index
        return '#' + i;
        },
        _getOptionsWithPred: function (pred) {
            var arr = [];
            var options = Util.makeArray(this._elem.options);
            options.forEach(function (option, i) {
                if (pred(option)) {
                    arr.push(this._getUniqueValue(option.text, i));
                }
            }, this);
            return arr;
        },
        _getOptionTextWithPred: function (pred) {
            return this._getOptionsWithPred(pred).join(';');
        },
        _selectedPred: function(e) { return e.selected; },
        _updatePreviousSelection: function () {
            this._elem.previousSelection = this._getOptionsWithPred(this._selectedPred);
        },
        isLearnable: Util.alwaysTrue,
        UseEventConfiguration: function (event) {
            return event.type !== "mousedown";
        }
    }
};