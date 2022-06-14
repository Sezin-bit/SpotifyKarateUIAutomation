var SAPImageCheckBoxBehavior = {
    _micclass: ["SAPCheckBox", "WebElement", "StdObject"],
    _attrs: {
        "micclass": function () {
            return "SAPCheckBox";
        },

        "checked": function () {
            var checkedState = 0;
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPSP_IMAGECHECKBOX_CHECKED))
                checkedState = 1;
            return checkedState;
        },

        "value": function () {
            return this.GetAttrSync("part_value");
        },

        "part_value": function () {
            var value = "OFF";
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPSP_IMAGECHECKBOX_CHECKED))
                value = "ON";
            return value;
        },

        "disabled": function () {
            return 0;
        },

        "data": function () {
            this.GetAttrSync("part_value");
        }

    }

}


var SAPICWCCheckBoxBehavior = {
    _micclass: ["SAPCheckBox", "WebElement", "StdObject"],
    _attrs: {
        "micclass": function () {
            return "SAPCheckBox";
        },

        "checked": function () {
            var checkedState = 0;
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPSP_CHECKBOX_ICWC_CHECKED))
                checkedState = 1;
            return checkedState;
        },

        "value": function () {
            return this.GetAttrSync("part_value");
        },

        "part_value": function () {
            var value = "OFF";
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPSP_CHECKBOX_ICWC_CHECKED))
                value = "ON";
            return value;
        }


    }

}

var SAPCRMCheckBoxBehavior = {
    _micclass: ["SAPCheckBox", "WebElement", "StdObject"],
    _attrs: {
        "micclass": function () {
            return "SAPCheckBox";
        },

        "checked": function () {
            return SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_CHECKBOX_CHECKED, 1) != null ? 1 : 0;
        },

        "part_value": function () {
            var value = "OFF";
            if (SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_CHECKBOX_CHECKED, 1) != null)
                value = "ON";
            return value;
        },

        "disabled": function () {
            return (SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_CHECKBOX_DISABLED, 1) != null ? 1 : 0);
        },

        "type": function () {
            //In some cases the type of the checkbox is missing ?????
            return "checkbox";
        }

    }
}

var SAPWDATriStateCheckBoxBehavior = {
    _micclass: ["SAPCheckBox", "WebElement", "StdObject"],
    _attrs: {
        "wda object": function () { //PN_SAP_IS_WDA
            return true;
        },

        "checked": function () {
            return this.GetStatus();
        },

        "value": function () {
            return this.GetAttrSync("part_value");
        },

        "part_value": function () {
            var status = this.GetStatus();
            return this.TranslateStatus(status);
        },

        "type": function () {
            return "checkbox"
        }

    },
    _helpers: {
        isLearnable: Util.alwaysTrue,
        GetStatus: function () {
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_TRISTATE_CHECKBOX_UNCHECKED)
            || SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_TRISTATE_CHECKBOX_UNCHECKED_NWA))
                return 2;
            else if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_TRISTATE_CHECKBOX_INDETERMINATE)
                || SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_TRISTATE_CHECKBOX_INDETERMINATE_NWA)) {
                var img = this.GetInnerImageElement();
                if (img) {
                    if (SapConfigurationUtil.isElementOfSpecifier(img, SAP_SPECIFIER_ENUM.SAP_WDA_TRISTATE_CHECKBOX_CHECKED_IMG))
                        return 0;
                    else if (SapConfigurationUtil.isElementOfSpecifier(img, SAP_SPECIFIER_ENUM.SAP_WDA_TRISTATE_CHECKBOX_UNCHECKED_IMG))
                        return 2;
                }
                return 1;
            }
            else
                return 0;
        },
        TranslateStatus: function (status) {
            if (status == 2)
                return "OFF";
            else if (status == 1)
                return "INDETERMINATE";
            else
                return "ON";
        },
        GetInnerImageElement() {
            //For some TriStateCheckBox in saptable, the input's "value" will not change. But the img classname will change by the 
            //click event. So Check the img classname to get the right status.
            var id = this._elem.id;
            if (id) {
                return document.getElementById(id + "-img");
            }
            return null;
        }

    },
    _handlerFunc: function (recorder, ev) {
        switch (ev.type) {
            case 'click':
                var state = this.GetStatus();
                var status = this.TranslateStatus(state + 1);
                if (status == "INDETERMINATE")
                    status = "DIMMED";//record as dimmed
                recorder.sendRecordEvent(this, ev, {
                    event: 'onclick',
                    part_value: status,
                });
                return true;
        }
    },

    _eventHandler: function (recorder, ev) {
        this._logger.trace('SAPCheckBox.eventHandler: Received recordable event on ' + this._elem.tagName + ': ' + ev.type);
        return SAPWDATriStateCheckBoxBehavior._handlerFunc.call(this, recorder, ev);
    }
}





var SAPCheckBoxBehavior = {
    _micclass: ["SAPCheckBox", "WebElement", "StdObject"],
    _attrs: {
        "micclass": function () {
            return "SAPCheckBox";
        },

        "logical name": function () {
            if (!SAPUtils.isSapTableChild(this)) {
                return this.GetAttrSync('sap attached text');
            }
            else
                return CheckBoxBehavior._attrs["logical name"].call(this);
        },

        "sap attached text": function () {
            return this._GetAttachedText();
        },

        "sap label": function () {
            return SAPUtils.getLabelOrAttachedText(this, false);
        },

        "checked": function () {
            var elem = this._elem;
            if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_CHECKBOX_ICWC_CHECKED))
                return 1;
            if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_CHECKBOX_ICWC_UNCHECKED))
                return 0;

            //SetLogonCheckboxContainer()
            if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_LOGONCHECKBOXCONTAINER)) {//Logon checkbox case.
                return SapConfigurationUtil.getElementOfCollection(elem, SAP_SPECIFIER_ENUM.SAPSP_IMAGECHECKBOX_CHECKED) != null ? 1 : 0;
            }

            var pRadioButtonContainer = SapConfigurationUtil.getElementOfCollection(elem, SAP_SPECIFIER_ENUM.SAP_WDA_TABLE);//In a table
            if (!pRadioButtonContainer)
                pRadioButtonContainer = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAPSP_CONTAINER_RADIOBUTTON_EP7);
            else {
                var pCellElement = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_NWBC_DIVDRAW_TABLE_CELL, 2);
                if (pCellElement == null)
                    pCellElement = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_WDA_TABLE_CELL, 7);
                pRadioButtonContainer = pCellElement;
            }

            if (pRadioButtonContainer != null) {
                if (SapConfigurationUtil.getElementOfCollection(pRadioButtonContainer, SAP_SPECIFIER_ENUM.SAPSP_IMAGECHECKBOX_CHECKED) != null)
                    return 1;

                return 0;
            }

            return CheckBoxBehavior._attrs["checked"].call(this);
        },

        "value": function () {
            return SAPCheckBoxBehavior._attrs["part_value"].call(this);
        },

        "part_value": function () {
            if (this._elem.parentElement) {
                if (SapConfigurationUtil.getElementOfCollection(this._elem.parentElement, SAP_SPECIFIER_ENUM.SAPSP_IMAGECHECKBOX_CHECKED))
                    return "ON";
                else if (SapConfigurationUtil.getElementOfCollection(this._elem.parentElement, SAP_SPECIFIER_ENUM.SAPWD_CHECKBOX_IMG_A1S))
                    return "OFF";
            }
            return null;
        },
        
        "disabled": function () {
            if (this._elem.disabled == undefined)
                return null;//return null in IE web obj, Consistent with the behavior of Internet Explorer
            return this._elem.disabled ? 1 : 0;
        },

    },
    _helpers: {
        isLearnable: Util.alwaysTrue,
        
        _GetAttachedText: function () {
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_CHECKBOX_SPAN)) {
                var text = this._elem.innerText;
                if (!!text)
                    return text;
            }
            return SAPUtils.getLabelOrAttachedText(this, false);
        }
    },

    _methods: {
        "SET_DATA": function (msg, resultCallback) {
            this._logger.trace("SAPCheckBoxBehavior: on command SET_DATA");
            var value = msg._data.data;
            console.log(this.GetAttrSync('q : ' + this.GetAttrSync("part_value")));
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
            console.log(this.GetAttrSync('q : ' + this.GetAttrSync("part_value")));
            var value = msg._data.value;
            if (typeof value === "string")
                value = value.toUpperCase();

            var LogonCheckbox = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAPSP_CHECKBOX_MAIN);
            if (LogonCheckbox && SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_LOGONCHECKBOXCONTAINER))
                this._elem = LogonCheckbox;

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

    _handlerFunc: function (recorder, ev) {
        switch (ev.type) {
            case 'click':
                recorder.sendRecordEvent(this, ev, {
                    event: 'onclick',
                    part_value: this.GetAttrSync("checked") ? 'OFF' : 'ON',
                });
                return true;
        }
    },

    _eventHandler: function (recorder, ev) {
        this._logger.trace('SAPCheckBox.eventHandler: Received recordable event on ' + this._elem.tagName + ': ' + ev.type);
        return SAPCheckBoxBehavior._handlerFunc.call(this, recorder, ev);
    }
};

