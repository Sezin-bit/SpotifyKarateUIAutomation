function DotObjJSProxy(obj, parentId) {
    this._logger = new LoggerUtil("Content.DotObjJSProxy");
    this._obj = obj;
    this._id = Util.shallowObjectClone(parentId);
    this._id.object = content.rtidManager.GetIDForElement(this);
    window.addEventListener("_DOT_OBJ_RESULT", this.ResultMsgHandler.bind(this));
}

DotObjJSProxy.prototype = {
    _logger: null,
    _obj: null,
    _id: null,
    type: "NPObjDispWrapper",
    _nextId: 0,
    _callbackMap: {},

    onMessage: function (msg, resultCallback) {
        this._logger.trace("onMessage: Started with message ", msg);

        if (!this[msg._msgType]) {
            this._logger.error("onMessage: Unsupported message type: ", msg._msgType);
            msg.status = "ERROR";
            resultCallback(msg);
            return;
        }

        this[msg._msgType](msg, resultCallback);
    },
    getID: function () {
        return Util.shallowObjectClone(this._id);
    },
    DOT_OBJ_BUILD_INFO: function (msg, resultCallback) {
        this._logger.trace("DOT_OBJ_BUILD_INFO: started");
        var requestMsg = new Msg("DOT_OBJ_BUILD_INFO", {}, {
            objToOperate: this._obj
        });
        var logger = this._logger;
        this._dispatchToHandlerInPage(requestMsg, function (resMsg) {
            logger.trace("DOT_OBJ_BUILD_INFO: received result");
            var resObj = resMsg._data.result;
            var resultName = Object.keys(resObj) || [];
            var resultVal = [];
            resultName.forEach(function (key) {
                resultVal.push(resObj[key]);
            });

            msg._data.name = [resultName];
            msg._data.value = [resultVal];
            msg.status = resMsg.status;
            resultCallback(msg);
        });
    },
    DOT_OBJ_GET_PROPERTY: function (msg, resultCallback) {
        this._logger.trace("DOT_OBJ_GET_PROPERTY: started for property: " + msg._data.name);
        var requestMsg = new Msg("DOT_OBJ_GET_PROPERTY", {}, {
            propName: msg._data.name,
            objToOperate: this._obj
        });

        this._dispatchToHandlerInPageAndHandleResponse(requestMsg, msg, resultCallback);
    },
    DOT_OBJ_PUT_PROPERTY: function (msg, resultCallback) {
        this._logger.trace("PutProperty: Started for property:" + msg._data.name + " value:" + msg._data.data);

        var arg = this._unwrapDotObjIfNeeded(msg._data.data);

        var requestMsg = new Msg("DOT_OBJ_PUT_PROPERTY", {}, {
            propName: msg._data.name,
            objToOperate: this._obj,
            valToPut: arg
        });

        this._dispatchToHandlerInPageAndHandleResponse(requestMsg, msg, resultCallback);
    },
    DOT_OBJ_CALL_METHOD: function (msg, resultCallback) {
        if (msg._data.name === "NativePropertyBatchQuery")
            this._nativeBatchQuery(msg, resultCallback);
        else {
            this._logger.trace("CallMethod: Started for: " + msg._data.name);
            var args = Array.isArray(msg._data.data) ? msg._data.data : [msg._data.data];
            args = args.map(function (arg) {
                return this._unwrapDotObjIfNeeded(arg);
            }, this);

            var requestMsg = new Msg("DOT_OBJ_CALL_METHOD", {}, {
                methodName: msg._data.name,
                objToOperate: this._obj,
                args: args
            });

            this._dispatchToHandlerInPageAndHandleResponse(requestMsg, msg, resultCallback);
        }
    },
    _dispatchToHandlerInPage: function (requestMsg, resultCallback) {
        this._logger.trace("_dispatchToHandlerInPage: started");

        // Store callback
        var callbackId = ++DotObjJSProxy.prototype._nextId;
        this._callbackMap[callbackId] = resultCallback;
        requestMsg.dotObjAsyncId = callbackId;

        //fire the event
        var ev = ContentUtils.createCrossOriginCustomEvent("_QTP_Dot_Object", { "detail": requestMsg });
        window.dispatchEvent(ev);
    },

    /*
    * Dispatches the requestMsg and merges the result with the originalMsg's value parameter
    */
    _dispatchToHandlerInPageAndHandleResponse: function (requestMsg, originalMsg, resultCallback) {
        this._logger.trace("_dispatchToHandlerInPageAndHandleResponse: started");
        requestMsg._data.manageReturnValueIfNeeded = true;
        this._dispatchToHandlerInPage(requestMsg, function (originalMsg, resMsg) {
            this._logger.trace("_dispatchToHandlerInPageAndHandleResponse: returned");

            var result = resMsg._data.result;
            if (typeof (result) === "object") {
                var proxy = new DotObjJSProxy(result, this.getID());
                result = SpecialObject.CreateDotObj(proxy.getID());
            }

            originalMsg.status = resMsg.status;
            originalMsg._data.value = result;
            resultCallback(originalMsg);
        }.bind(this, originalMsg));
    },

    _unwrapDotObjIfNeeded: function (arg) {
        this._logger.trace("_unwrapDotObjIfNeeded: started");
        if (RtIdUtils.IsRuntimeId(arg)) {
            var dotObjProxy = content.rtidManager.GetElementFromID(arg.object);
            Util.assert(dotObjProxy instanceof DotObjJSProxy, "_unwrapDotObjIfNeeded: trying to unwrap an object which is not a dotObj proxy", this._logger);
            return dotObjProxy.getWrappedObject();
        }

        return arg;
    },

    getWrappedObject: function () {
        return this._obj;
    },

    ResultMsgHandler: function (resEvent) {
        //console.log("ResultMsgHandler: Started for: ");
        var resMsg = resEvent.detail;

        if (resMsg._msgType !== "DOT_OBJ_RESULT") {
            this._logger.error("ResultMsgHandler: Received unknown message type: " + resMsg._msgType);
            return true;
        }

        //removes the properties from the document element that were used in the process
        var callback = this._callbackMap[resMsg.dotObjAsyncId];
        delete this._callbackMap[resMsg.dotObjAsyncId];

        if (callback)
            callback(resMsg);
    },
    _nativeBatchQuery: function (msg, resultCallback) {
        var args = msg._data.data[0];
        var requestMsg = new Msg(msg._data.name, {}, {
            objToOperate: this._obj,
            args: args
        });
        this._dispatchToHandlerInPage(requestMsg, function (resultMsg) {
            msg._data.value = [[]];
            msg._data.value[0] = resultMsg._data.result.map(function (value) {
                var dotObjectPropertyValue = value;
                if (typeof (value) === "object") {
                    var proxy = new DotObjJSProxy(value, this.getID());
                    dotObjectPropertyValue = SpecialObject.CreateDotObj(proxy.getID());
                }
                return dotObjectPropertyValue;
            }, this);
            msg.status = "OK";
            resultCallback(msg);
        }.bind(this));
    }
};

var DotObjUtil = {
    _logger: null,
    _callbacks: {},
    _nextUID: -1,
    _nextAsyncID: 0,
    WrapElement: function (element, parentId, resCallback) {
        var markObjRequest = SpecialObject.CreateElementRequest(this._getElementUID(), ++this._nextAsyncID);

        //adds the attribute on the requested element
        element.setAttribute("uft-uid", markObjRequest.objUID);
        //sends the HTML dot object management the request.
        this.sendToDotObjectManager(markObjRequest, function (dotObjManagerCookie) {
            var proxy = new DotObjJSProxy(dotObjManagerCookie, parentId);
            resCallback(SpecialObject.CreateDotObj(proxy.getID()));
        });
    },
    WrapDocument: function (element, parentId, resCallback) {
        var markObjRequest = SpecialObject.CreateDocumentRequest(++this._nextAsyncID);

        this.sendToDotObjectManager(markObjRequest, function (dotObjManagerCookie) {
            var proxy = new DotObjJSProxy(dotObjManagerCookie, parentId);
            resCallback(SpecialObject.CreateDotObj(proxy.getID()));
        });
    },
    InstallDotObjectSupport: function () {
        this._logger = new LoggerUtil("Content.DotObjUtil");
        this._logger.info("InstallDotObjectSupport: Started going to install the Dot Object manager into HTML context");
        window.addEventListener("UFT_DOT_OBJ_MARK_RESULT", this.onDotObjectMarkResult.bind(this), false);

        if (BrowserServices.isRunningInPageContext) {
            DotObjectManagerInHTMLContext.setLogger(new LoggerUtil("DotObjectManagerInHTMLContext"));
            window.addEventListener("_QTP_Dot_Object", DotObjectManagerInHTMLContext.onMessageFromDotObjectInstance.bind(DotObjectManagerInHTMLContext), false);
            window.addEventListener("UFT_DOT_OBJ_ADD_TO_MANAGED_OBJ", DotObjectManagerInHTMLContext.onAddObjectToManage.bind(DotObjectManagerInHTMLContext), false);
        } else {
            content.domSubscriber.startNamespace();
            content.domSubscriber.addUtilityObject("CrossContextCfgUtil", CrossContextCfgUtil);
            content.domSubscriber.addUtilityObject("ShadowDomUtil", ShadowDomUtil);
            content.domSubscriber.addUtilityObject("DotObjectManagerInHTMLContext", DotObjectManagerInHTMLContext, {
                "_QTP_Dot_Object": "onMessageFromDotObjectInstance",
                "UFT_DOT_OBJ_ADD_TO_MANAGED_OBJ": "onAddObjectToManage"
            });
            content.domSubscriber.addScript("DotObjectManagerInHTMLContext.setLogger(_logger);");
            content.domSubscriber.endNamespace();
        }
    },
    sendToDotObjectManager: function (dataToSend, resultCallback) {
        this._logger.trace("sendToDotObjectManager: Goint to send the following info to the mager:", dataToSend);
        this._callbacks[dataToSend.dotUtilObjAsyncID] = resultCallback;
        var markEvent = ContentUtils.createCrossOriginCustomEvent("UFT_DOT_OBJ_ADD_TO_MANAGED_OBJ", { detail: dataToSend });
        window.dispatchEvent(markEvent);
    },
    onDotObjectMarkResult: function (eventObj) {
        var markResultDetails = eventObj.detail;
        this._logger.trace("onDotObjectMarkResult: Got the following mark result from the manager:", markResultDetails);
        if (!this._callbacks[markResultDetails.dotUtilObjAsyncID]) {
            this._logger.error("onDotObjectMarkResult: Got result without any request!!!");
            return;
        }
        var callback = this._callbacks[markResultDetails.dotUtilObjAsyncID];
        delete this._callbacks[markResultDetails.dotUtilObjAsyncID];
        delete markResultDetails.dotUtilObjAsyncID;
        callback(markResultDetails);
    },
    _getElementUID: function () {
        return "UFT_" + (new Date()).UTC + (++this._nextUID);
    }
};

var DotObjectManagerInHTMLContext = {
    _managedObjs: [],
    _nextToken: 0,
    _logger: null,

    setLogger: function (logger) {
        this._logger = logger;
    },

    NativePropertyBatchQuery: function (msg, obj) {
        var props = msg._data.args;
        var res = props.map(function (prop) {
            var propValue = this._getDomPropertyValue(obj, prop);

            if ((typeof (propValue) === "object") || Util.isLegacyObject(propValue)) {
                return this._addObjectToBeManaged(SpecialObject.CreateReferenceRequest(propValue));
            }
            else
                return propValue;
        }, this);
        msg._data.manageReturnValueIfNeeded = false;
        return res;
    },
    _getDomPropertyValue: function (obj, prop) {
        var propValue = obj[this.getCaseInsensitiveName(prop, obj)];
        //if propValue is null change to string as no need to return object.
        if (propValue === null)
            propValue = "";
        return propValue;
    },
    onMessageFromDotObjectInstance: function (msgEvent) {
        this._logger.trace("onMessageFromDotObjectInstance: Started");
        //gets the message from the event.
        var msg = msgEvent.detail;
        if (!this[msg._msgType]) {
            this._logger.error("onMessageFromDotObjectInstance: Goi Unknown type of message:" + msg._msgType);
            return;
        }

        var resMsg = {
            _msgType: "DOT_OBJ_RESULT",
            _to: Util.shallowObjectClone(msg._to),
            _data: msg._data
        };

        try {
            this._logger.trace("onMessageFromDotObjectInstance: Handling the following request:", msg);
            var obj = this._obtainObjectToOperateOn(msg);
            var resultVal = this[msg._msgType](msg, obj);

            // check if request requires to wrap the return value if it's an object
            // for BUILD_INFO the result is an Object that doesn't need wrapping
            var needToManage = msg._data.manageReturnValueIfNeeded;

            if (needToManage && ((typeof (resultVal) === "object") || Util.isLegacyObject(resultVal))) {
                this._logger.debug("DotObjJSProxy.DotObjectHandler: The return value is an object lets add it to managed objects");
                resultVal = this._addObjectToBeManaged(SpecialObject.CreateReferenceRequest(resultVal));
            }
            resMsg._data.result = resultVal;
        }
        catch (e) {
            this._logger.error("DotObjJSProxy.DotObjectHandler: There was an exception - exception message: " + e.message + "\nStack:" + e.stack);
            resMsg.status = this._getStatusFromException(e);
            resMsg.ex = e.message;
        }

        //posts back the result 
        resMsg.dotObjAsyncId = msg.dotObjAsyncId;
        //var ev = document.createEvent("CustomEvent");
        //ev.initCustomEvent("_DOT_OBJ_RESULT", false, false, resMsg);
        var ev = new CustomEvent("_DOT_OBJ_RESULT", { "detail": resMsg });
        window.dispatchEvent(ev);
        return false;
    },
    onAddObjectToManage: function (msgEvent) {
        var objToManageDetails = msgEvent.detail;
        this._logger.trace("onAddObjectToManage: Got the following object to mark:", objToManageDetails);

        Util.assert(objToManageDetails.specialObj, "onAddObjectToManage: Got Mark event on non special obj!", this._logger);
        var res = this._addObjectToBeManaged(objToManageDetails);
        var resultEvent = objToManageDetails.resultEventName || "UFT_DOT_OBJ_MARK_RESULT";
        this._logger.trace("onAddObjectToManage: Going to send the following result: ", res, " using the evnet ", resultEvent);
        //var ev = document.createEvent("CustomEvent");
        //ev.initCustomEvent(resultEvent, false, false, res);
        var ev = new CustomEvent(resultEvent, { "detail": res });
        window.dispatchEvent(ev);
    },
    getObjectToManage: function (objToManageDetails) {
        this._logger.trace("getObjectToManage: Started for object type:" + objToManageDetails.type);
        switch (objToManageDetails.type) {
            case "DotObjMarkerElementRequest":
                var elements = Util.makeArray(document.querySelectorAll("[uft-uid*=\"" + objToManageDetails.objUID + "\"]"));
                if (elements.length === 0) {
                    var shadowRoots = ShadowDomUtil.findAllShadowRoots(document, this._logger);
                    elements = Util.arrayReduce(shadowRoots, function (targetAOs, childElem) {
                        return targetAOs.concat(Util.makeArray(childElem.querySelectorAll("[uft-uid*=\"" + objToManageDetails.objUID + "\"]")));
                    }.bind(this), []);

                    if (elements.length === 0) {
                        this._logger.error("onAddObjectToManage: Failed find element to manage");
                        return null;
                    }

                }
                if (elements.length > 1)
                    this._logger.warn("getObjectToManage: there are more than one element with UID:" + objToManageDetails.objUID + " Their number is:" + elements.length);
                var element = elements[0];
                element.removeAttribute("uft-uid");
                return element;
            case "DotObjMarkerDocumentRequest":
                return document;
            case "DotObjMarkerReferenceRequest":
                return objToManageDetails.objRef;
            default:
                this._logger.error("getObjectToManage: Unsupported type of object to manage");
                return null;
        }
    },
    getCaseInsensitiveName: function (name, obj) {
        if (name in obj)
            return name;
        var uc = name.toUpperCase();
        for (var p in obj) {
            if (uc === p.toUpperCase())
                return p;
        }
        return name; // If no case insensitive match return original name (for setting)
    },
    handleCallMethod: function (obj, methodName, args) {
        if (Array.isArray(obj)) {
            switch (methodName) {
                case "item":
                    if (typeof (args[0]) === "number")
                        return obj[args[0]];
                    break;
            }
        }

        if (!(methodName in obj))
            throw new Error("MethodNotFound");

        // If the arg array contains managed objects, should use them.
        args = args.map(function (arg) {
            return this._getManagedObjectIfPresent(arg);
        }, this);

        return obj[methodName].apply(obj, args);
    },
    DOT_OBJ_BUILD_INFO: function (msg, obj) {
        var res = {};
        for (var prop in obj) {
            try {
                if (Util.isLegacyObject(obj[prop]))
                    continue;

                var type = typeof (obj[prop]);
                if (obj[prop] === null) {
                    type = "string";
                }

                res[prop] = type;
            }
            catch (ex) { this._logger.warn("Faile on property:" + prop + " The error is:" + ex); }
        }

        // Every object has a toString function
        res.toString = "function";
        if (Array.isArray(obj))
            res.item = "function";

        return res;
    },
    DOT_OBJ_GET_PROPERTY: function (msg, obj) {
        return this._getDomPropertyValue(obj, msg._data.propName);
    },
    DOT_OBJ_PUT_PROPERTY: function (msg, obj) {
        this._logger.trace("DotObjectHandler: Got message for DOT_OBJ_PUT_PROPERTY");
        obj[this.getCaseInsensitiveName(msg._data.propName, obj)] = msg._data.valToPut;
        delete msg._data.valToPut; // allow _data to be stringified (e.g. in case the value is a DOM element).
    },
    DOT_OBJ_CALL_METHOD: function (msg, obj) {
        this._logger.trace("DotObjectHandler: Got message for DOT_OBJ_CALL_METHOD");
        var methodName = this.getCaseInsensitiveName(msg._data.methodName, obj);
        return this.handleCallMethod(obj, methodName, msg._data.args);
    },
    _obtainObjectToOperateOn: function (msg) {
        var dotObjManagerToken = msg._data.objToOperate;
        Util.assert(dotObjManagerToken.specialObj, "DotObjectManagerInHTMLContext._obtainObjectToOperateOn: Got object token which is not supported", this._logger);
        delete msg._data.objToOperate;
        return this._managedObjs[dotObjManagerToken.cookie];
    },
    _addObjectToBeManaged: function (objToManageDetails) {
        var objToManage = this.getObjectToManage(objToManageDetails);

        var res = SpecialObject.CreateDotObjInHTML(++this._nextToken, objToManageDetails.dotUtilObjAsyncID);
        this._logger.trace("DotObjectManagerInHTMLContext.onAddObjectToManage: Adding the object and returning the following info:", res);
        this._managedObjs[res.cookie] = objToManage;
        return res;
    },
    _getManagedObjectIfPresent: function (objToManageDetails) {
        if (objToManageDetails instanceof Object) {
            if (objToManageDetails.specialObj === true
                && objToManageDetails.hasOwnProperty("cookie")
                && objToManageDetails.hasOwnProperty("type")) {
                return this._managedObjs[objToManageDetails.cookie];
            }
        }
        return objToManageDetails;
    },
    _getStatusFromException: function (e) {
        if (e.message === "MethodNotFound")
            return e.message;

        return "ERROR";
    }

};