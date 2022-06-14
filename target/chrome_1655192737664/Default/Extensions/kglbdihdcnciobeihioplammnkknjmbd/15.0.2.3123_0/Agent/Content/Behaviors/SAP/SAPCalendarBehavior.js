var SAPCalendarBehavior = {
    _micclass: ["SAPCalendar"],
    _attrs: {
        "micclass": function () {
            return "SAPCalendar";
        },
        "displayed date": function () {
            return SAPEditBehavior._attrs["value"].call(this);
        },
        "sap attached text": function () {
            return this.getTitleText(this._elem);
        },
        "sap label": function () {
            return this.getTitleText(this._elem);
        },
    },
    _helpers: {
        getTitleText: function (m_pElement) {
            var text = SAPICWCEditBehavior._helpers.getICWCAttachedText(m_pElement);
            if (text.length == 0) {
                text = SAPCalendarBehavior._helpers.getTitleWithRowNumber(m_pElement);
            }
            return text;
        },
        getTitleWithRowNumber: function (m_pElement) {
            var title = SAPUtils.getICWCTableColumnName(m_pElement);
            if (title != null) {
                var row = SAPUtils.getRowNumber(m_pElement);
                if (row != null)
                    return title + ":" + row;
            }
            return "";
        },
        replay_set: function (msg, resultCallback) {
            var value = msg._data.value;
            if (Util.isNullOrUndefined(msg._data.value)) {
                ErrorReporter.ThrowInvalidArg();
            }

            this._fireEvent(this._elem, "focus");
            EditBehavior._methods["SET_VALUE"].call(this, msg, resultCallback);
            this._fireEvent(this._elem, "change");
            this._fireEvent(this._elem, "blur");
            return;
        },
    },

    _eventHandler: function (recorder, ev) {
        this._logger.trace('SAPCalendar._eventHandler: Received recordable event: ' + ev.type);
        if (ev.type == "dblclick" || ev.type == "mousedown" ||ev.type == "mouseup" )
            return null;

        var params = { event: 'on' + ev.type };
        //In ICWC we don't record opening the calendar pop-up 
        //we only record the date from the edit box 
        //CWIConfigurationObject& config = CSapCustomObject::Instance()->GetConfigObj();
        if (SapConfigurationUtil.isElementOfSpecifier(ev.target, SAP_SPECIFIER_ENUM.SAP_ICWC_CALENDAR) ||
            SAPUtils.isCalendarByParent(ev.target)) {
            //get the value of the edit field in order to check after blur on the edit field, that
            //the value changed, and only in this case record.	
            var editCal = SAPCalendar.getInputPart(ev.target);
            if (editCal == null)
                editCal = ev.target;
            // get the select value
            params["value"] = editCal.value;
            recorder.sendRecordEvent(this, ev, params);
            return true;
        }

        var pChildElement = ev.target.firstElementChild;
        // Don't record on date selection of arrows (anything in the pop-up calendar)
        if (SapConfigurationUtil.isElementOfSpecifier(ev.target, SAP_SPECIFIER_ENUM.SAP_ICWC_POPUP_DATE_SELECTION)
            || SapConfigurationUtil.isElementOfSpecifier(ev.target, SAP_SPECIFIER_ENUM.SAP_ICWC_POPUP_DATE_ARR)
            || (SapConfigurationUtil.isElementOfSpecifier(ev.target, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_TD)
                && SapConfigurationUtil.isElementOfSpecifier(pChildElement, SAP_SPECIFIER_ENUM.SAP_WDA_DATE_IN_POPUP)))
            return;

        if (SapConfigurationUtil.isElementOfSpecifier(ev.target, SAP_SPECIFIER_ENUM.SAPSP_ICWC_EDITBOX) && SAPCalendar.isCalendar(ev.target))
            params["sap record calendar"] = true;

        SAPEditBehavior._eventHandler.call(this, recorder, ev);
        return true;
    },

    _methods: {
        "SET_VALUE": function (msg, resultCallback) {
            this.replay_set(msg, resultCallback);
        },
        "SET_DATA": function (msg, resultCallback) {
            this.replay_set(msg, resultCallback);
        },
    }
};


var SAPCRMCalendarBehavior = {
    _micclass: ["SAPCalendar"],

    _eventHandler: function (recorder, ev) {
        this._logger.trace('SAPCalendar._eventHandler: Received recordable event: ' + ev.type);
        if (ev.type == "dblclick")
            return null;

        var params = { event: 'on' + ev.type };
        //In CRM we don't record opening the calendar pop-up 
        //we only record the date from the edit box 
        //	CWIConfigurationObject& config = CSapCustomObject::Instance()->GetConfigObj();
        var bIsICWCCalendar = (ev.target.tagName.toUpperCase() == "IMG" &&
            (SapConfigurationUtil.isElementOfSpecifier(ev.target, SAP_SPECIFIER_ENUM.SAP_ICWC_CALENDAR_HELP_DATE) ||
                SapConfigurationUtil.getContainerElement(ev.target, SAP_SPECIFIER_ENUM.SAP_CRM_CALENDAR_TESTMODE)));

        //Recording on CRM image part
        if (bIsICWCCalendar) {
            //get the value of the edit field in order to check after blur on the edit field, that
            //the value changed, and only in this case record.	
            var editCal = this.getCRMInputPart(ev.target);
            params["value"] = editCal.getAttribute("value") ? editCal.getAttribute("value") : editCal.value;
            recorder.sendRecordEvent(this, ev, params);
            return true;
        }

        var bIsICWCEdit = SapConfigurationUtil.isElementOfSpecifier(ev.target, SAP_SPECIFIER_ENUM.SAPSP_ICWC_EDITBOX);
        if (SapConfigurationUtil.getContainerElement(ev.target, SAP_SPECIFIER_ENUM.SAP_CRM_CALENDAR_TESTMODE)
            && ((ev.target.tagName.toUpperCase() == "INPUT") || (bIsICWCEdit && SAPCalendar.isCalendar(ev.target)))
        )
            params["sap record calendar"] = true;

        // Don't record on date selection in the CRM pop-up calendar
        if (SapConfigurationUtil.getContainerElement(ev.target, SAP_SPECIFIER_ENUM.SAP_CRM_CALENDAR_CONTAINER))
            return;

        SAPEditBehavior._eventHandler.call(this, recorder, ev);
        return true;
    },

    _helpers: {
        getCRMInputPart(elem) {
            var testmode = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_CALENDAR_TESTMODE);
            // There's a chance that the evil people in SAP didn't do the testmode stuff correctly. If that's the case, we'll get the input part the old fashioned way 
            if (!!testmode)
                return SapConfigurationUtil.getElementOfCollection(testmode, SAP_SPECIFIER_ENUM.SAP_CRM_INPUT_MAIN);
            else
                return SAPCalendar.getInputPart(elem);
        }
    }
};
