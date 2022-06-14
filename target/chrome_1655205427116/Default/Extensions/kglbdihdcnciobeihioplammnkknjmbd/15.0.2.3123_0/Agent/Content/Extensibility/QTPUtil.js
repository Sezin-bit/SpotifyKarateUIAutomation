function QTPUtil() {

}

QTPUtil.prototype = {


    Alert: function (s) {
        alert(s);
    },

// Dispatch event back to Extension's content script.
// @op: the name of the operation, e.g. "Report", "RegisterForEvent" etc.  serves for _QTPUtil.
// @data: the detailed data associated with the operation.
    _dispatchEvent: function (op, data) {
        var detail = {};
        detail.op = op;
        detail.data = data;

        var event = document.createEvent("CustomEvent");
        event.initCustomEvent("_UFT_TOOLKIT_RESULT", true, true, detail);

        var result = window.dispatchEvent(event);

        _logger.debug("QTPUtil._dispatchEvent: dispatch event to page, result: " + result);
    },

    isHandlerRegistered: function (element, aoId, eventName) {
        if (Util.isNullOrUndefined(element._QTPExtHandlerRegArray))
            return false;

        var index = Util.arrayFindIndex(element._QTPExtHandlerRegArray, function (item) {
            return RtIdUtils.IsRTIDEqual(item.WEB_PN_ID, aoId);
        });

        var exist = false;
        if (index !== -1 && element._QTPExtHandlerRegArray[index].eventTypes.indexOf(eventName) !== -1) {
            exist = true;
        }

        return exist;
    },





    AddHandlerRegisteredInfo: function (element, aoId, eventName) {
        element._QTPExtHandlerRegArray = element._QTPExtHandlerRegArray || [];
        var index = Util.arrayFindIndex(element._QTPExtHandlerRegArray, function (item) {
            return RtIdUtils.IsRTIDEqual(item.WEB_PN_ID, aoId);
        });

        if (index === -1) {
            element._QTPExtHandlerRegArray.push({ "WEB_PN_ID": aoId, "eventTypes": [] });
            index = 0;
        }

        element._QTPExtHandlerRegArray[index].eventTypes.push(eventName);

        var eventTypes = element._QTPExtHandlerRegArray[index].eventTypes;
        element.setAttribute("_uft_ext_events_hooked", JSON.stringify({ "events": eventTypes }));
    },




     RegisterForGesture: function (element, gestureName, handler, handlerParam) {
        _logger.trace("QTPUtil.RegisterForGesture: started");


     
        gestureName = gestureName.toLowerCase();
        _logger.debug("QTPUtil.RegisterForGesture: gesture name: " + gestureName);

        if (!PageAgent._activeScriptWrapper._aoId) {
            return;
        }

        var script = PageAgent._activeScriptWrapper;
        var elem =   PageAgent._activeScriptWrapper._elem;
        var aoId =   PageAgent._activeScriptWrapper._aoId;

        var eventHandler = function (e) {
            var params = [handlerParam, e];
            script.invoke(elem, handler, params, aoId);
        };




        var eventType = this._gestureToCustomEventMapper(gestureName);
        if (!eventType){
            _logger.warn("cant add event listener for the following gesture :" + gestureName);
           return;
        }

       this._updateGestureRegisterInfo(element,eventType,eventHandler) ;

        _logger.trace("QTPUtil.RegisterForGesture: add EventListener to element for the custom event - " + eventType);

        element.addEventListener(eventType,eventHandler);
    },


    _updateGestureRegisterInfo : function (element,eventType,eventHandler) {
        element._QTPExtGestureHandlerRegArray = element._QTPExtGestureHandlerRegArray || [];

        if ( element._QTPExtGestureHandlerRegArray[eventType]){
            element.removeEventListener(eventType, element._QTPExtGestureHandlerRegArray[eventType]);
        }

        element._QTPExtGestureHandlerRegArray[eventType] = eventHandler;

    },




    _gestureToCustomEventMapper: function (gesture) {
       if (!gesture){
           return "";
       }

        return "UFT_GESTURE_" + gesture.toUpperCase();

    },

    RegisterForEvent: function (element, eventName, handler, handlerParam) {
        _logger.trace("QTPUtil.RegisterForEvent: started");
        eventName = eventName.toLowerCase();

        if (!PageAgent._activeScriptWrapper._aoId) {
            return;
        }

        var eventType = (eventName.length > 2 && eventName.substr(0, 2) === "on") ? eventName.slice(2) : eventName;
        if (this.isHandlerRegistered(element, PageAgent._activeScriptWrapper._aoId, eventName)) {
            return;
        }

        _logger.debug("QTPUtil.RegisterForEvent: event name: " + eventName);

        var script = PageAgent._activeScriptWrapper;
        var elem = PageAgent._activeScriptWrapper._elem;
        var aoId = PageAgent._activeScriptWrapper._aoId;

        var eventHandler = function (e) {
            var params = [handlerParam, e];
            script.invoke(elem, handler, params, aoId);
        }.bind(this);

        element.addEventListener(eventType, eventHandler, true);

        this.AddHandlerRegisteredInfo(element, aoId, eventName);
    },

    Record: function (methodName, parameters, delay) {
        if (Util.isNullOrUndefined(PageAgent._activeScriptWrapper._aoId)) {
            _logger.warn("Record data is not sent because there is no valid active ao ID.");
            return;
        }

        var recordData = {};
        recordData.methodName = methodName;
        recordData.parameters = parameters;
        recordData.delay = delay;
        recordData.WEB_PN_ID = PageAgent._activeScriptWrapper._aoId;
        this._dispatchEvent("Record", recordData);
    },

    _report: function (status, method, parameters, details, eventType) {
        var reportData = {};
        reportData.status = status;
        reportData.method = method;
        reportData.parameters = parameters;
        reportData.details = details;
        reportData.eventType = eventType;

        this._dispatchEvent("Report", reportData);
    },

    Report: function (status, method, parameters, details) {
        this._report(status, method, parameters, details, "Replay");
    },

    ReportEvent: function (status, method, parameters, details) {
        this._report(status, method, parameters, details, "User");
    },

    LogLine: function (text, severity, id, category) {
        /*
         var LogSeverity_Success = 0;
         var LogSeverity_Information = 1;
         var LogSeverity_Warning = 2;
         var LogSeverity_Failure = 3;
         var LogSeverity_Error = 4;
         */

        switch (severity) {
            case 4:
            case 3:
                _logger.error(text);
                break;
            case 2:
                _logger.warn(text);
                break;
            case 1:
                _logger.info(text);
                break;
            case 0:
                _logger.debug(text);
                break;
            default:
                _logger.error(text);
                break;
        }
    },

    Wait: function (milliseconds) {
        var start = new Date().getTime(), expire = start + milliseconds;
        while (new Date().getTime() < expire) {
        }
    },
    GetBrowserType: function () {
        var browserTypeVersion = Util.browserApplicationVersion();
        return browserTypeVersion.slice(0, browserTypeVersion.lastIndexOf(" "));
    },
    GetBrowserVersion: function () {
        var broswerTypeVersion = Util.browserApplicationVersion();
        return broswerTypeVersion.slice(broswerTypeVersion.lastIndexOf(" ") + 1);
    },
    IsFirefoxLegacyAgent: function () {
        return false;
    },

    ResolveAsyncCall: function (cookie, value) {
        var param = {
            cookie: cookie,
            data: value
        };
        this._dispatchEvent("AnswerAsyncCall", param);
    },

    RejectAsyncCall: function (cookie, error, line, file) {
        var param = {
            cookie: cookie,
            data: {
                errorMessage: error,
                errorLine: line,
                errorFile: file
            }
        };
        this._dispatchEvent("AnswerAsyncCall", param);
    }
}
;