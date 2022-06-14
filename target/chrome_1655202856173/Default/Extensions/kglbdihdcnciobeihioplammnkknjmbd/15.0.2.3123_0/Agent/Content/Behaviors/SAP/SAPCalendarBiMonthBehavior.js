var SAPCalendarBiMonthBehavior = {
    _micclass: ["SAPCalendar"],
    _attrs: {
        "micclass": function () {
            return "SAPCalendar";
        },
        "displayed date": function () {
            return this.getDate();
        },
        "sap value": function () {
            return this.getDate();
        },
        // Return the name in the format: <1st month>-<2nd month>
        "sap attached text": function () {
            return this.getName();
        },
        "sap label": function () {
            return this.getName();
        },
        "logical name": function () {
            return this.getName();
        },
        "sap web component name": function () {
            return SAPUtils.getComponentName(this._elem, this);
        },
        "is bimonth calendar": function () {
            return true;
        },
        "sap web component runtime ID": function () {
            return SAPUtils.getComponentRuntimeID(this._elem, this);;
        },
    },
    _helpers: {
        getDate: function () {
            var vecOfElements = SapConfigurationUtil.filterCollection(document, SAP_SPECIFIER_ENUM.SAP_CRM_CALENDAR_SELECTED_DATE);
            // If vecOfElements.size() < 1 it's because the selected date isn't visible. If vecOfElements.size() > 1, somthing went wrong.
            // Either way, we can't answer the question "what day is it".
            if (vecOfElements.length != 1)
                return "";


            var bstrSapDate = vecOfElements[0].getAttribute("id");
            if (bstrSapDate == null)
                return "";


            // Make the date nice and formatted.
            var bstrFormattedDate = this.reverseDateFromYMD2DMY(bstrSapDate);
            if (bstrFormattedDate == null)
                return "";
            return bstrFormattedDate;
        },

        // Takes a date of the form yyyymmdd (like the htmlId of the day) and transforms it to d/m/yyyy (like it would be on the script) 
        reverseDateFromYMD2DMY: function (bstrSapDate) {
            if (bstrSapDate.length != 8)
                return null;
            return bstrSapDate.substr(6, 2) + "." + bstrSapDate.substr(4, 2) + "." + bstrSapDate.substr(0, 4);
        },

        // Takes a date of the form d/m/yyyy or d.m.yyyy (like it would be on the script) 
        // And transforms it to yyyymmdd (like the htmlId of the day)
        //return digit number
        reverseDateFromDMY2YMD: function (bstrFormattedDate) {
            var iFirst = -1, iSecond = -1;
            iFirst = bstrFormattedDate.indexOf(".");

            if (iFirst == -1 && bstrFormattedDate.indexOf("/") == -1) {
                return null; //none of the delimiters was used - invalid date format
            }

            // If the format of the day is d instead of dd, add 0 to the day.
            if (iFirst < 2) {
                bstrFormattedDate = "0" + bstrFormattedDate;
                iFirst++;
            }

            iSecond = bstrFormattedDate.indexOf(".", iFirst + 1);
            // If the format of the month is m instead of mm, add 0 to the month.
            if (iSecond < 5) {
                bstrFormattedDate = bstrFormattedDate.substr(0, 3) + "0" + bstrFormattedDate.substr(3);
                iSecond++;
            }

            bstrSapDate = bstrFormattedDate.substr(6, 4) + bstrFormattedDate.substr(3, 2) + bstrFormattedDate.substr(0, 2);
            return parseInt(bstrSapDate);//the result should be an 8 digit number
        },

        // Returns the name in the format: <1st month>-<2nd month>
        getName: function () {
            // To ensure we'll allways some value here.
            var text = SAPICWCEditBehavior._helpers.getICWCAttachedText(this._elem);
            if (text != null && text.length == 0) {
                text = SAPCalendarBehavior._helpers.getTitleWithRowNumber(this._elem);
            }
            var vecOfElements = SapConfigurationUtil.filterCollection(document, SAP_SPECIFIER_ENUM.SAP_CRM_CALENDAR_BI_MONTH_HEADER);
            // Combine the two headers to one.
            if (vecOfElements.length == 2) {
                if (vecOfElements[0].innerText != null && vecOfElements[1].innerText != null) {
                    text = vecOfElements[0].innerText + "-" + vecOfElements[1].innerText;
                }
            }
            return text;
        },

        setDate: function (msg, resultCallback) {
            var bstrFormattedDate = msg._data["value"];
            if (bstrFormattedDate == null || bstrFormattedDate.length == 0)
                return;

            var bstrSapDate = this.reverseDateFromDMY2YMD(bstrFormattedDate);
            if (bstrSapDate == null)
                return;

            // Find the WebElement that represents the right day.
            var pDate = document.getElementById(bstrSapDate);
            if (pDate != null) {
                pDate.click();
            }
            return;
        },

    },

    _eventHandler: function (recorder, ev) {
        // If it's the SPAN, we need to go one level up.
        var pTdElement = ev.target;
        if (SapConfigurationUtil.isElementOfSpecifier(ev.target, SAP_SPECIFIER_ENUM.SAP_CRM_CALENDAR_DAY_SPAN))
            pTdElement = ev.target.parentElement;

        // The only "interesting" the user clicked on a specific date.
        if (SapConfigurationUtil.isElementOfSpecifier(pTdElement, SAP_SPECIFIER_ENUM.SAP_CRM_CALENDAR_DAY_TD)) {
            var bstrFormattedDate = this.reverseDateFromYMD2DMY(pTdElement.getAttribute('id'));
            if (bstrFormattedDate == null)
                return false;

            var params = { event: 'on' + ev.type };
            params["value"] = bstrFormattedDate;
            params["sap record calendar"] = true;
            params["is bimonth calendar"] = true;

            recorder.sendRecordEvent(this, ev, params);
            return true;
        }
    },

    _methods: {
        "SET_VALUE": function (msg, resultCallback) {
            this.setDate(msg, resultCallback);
        },
        "SET_DATA": function (msg, resultCallback) {
            this.setDate(msg, resultCallback);
        },
    }
};