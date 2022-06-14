var PageProxy = {

    _activeAO: null,

    setActiveAO: function (ao) {
        this._activeAO = ao;
    },

    install: function () {
        this._logger = new LoggerUtil("Content.PageProxy");

        window.addEventListener("_UFT_TOOLKIT_RESULT", this.onMessageFromPage.bind(this), false);

        content.domSubscriber.startNamespace();
        content.domSubscriber.addUtilityObject("CrossContextCfgUtil", CrossContextCfgUtil);
        content.domSubscriber.addUtilityObject("ShadowDomUtil", ShadowDomUtil);
        content.domSubscriber.addUtilityObject("_QTPUtil", new QTPUtil());
        content.domSubscriber.addUtilityObject("PageAgent", PageAgent, { "_UFT_INVOKE_REQUEST": "onInvokeRequest" });
        content.domSubscriber.addScript("PageAgent._logger = _logger;");
        content.domSubscriber.addFunction(ScriptWrapper);
        content.domSubscriber.addScript("window._uftext = {PageAgent: PageAgent, _QTPUtil: _QTPUtil};");
        content.domSubscriber.endNamespace();
    },

    onMessageFromPage: function (eventObj) {
        // detail: {op: "operation", data: {...} }
        var detail = Util.deepObjectClone(eventObj.detail);
        var data = detail.data;
        switch (detail.op) {
            case "Report":
                if (!Util.isNullOrUndefined(this._activeAO))
                    this._activeAO.report(data.status, data.method, this._wrapParameters(data.parameters), data.details, data.eventType);

                break;
            case "Record":
                data = detail.data;
                data.parameters = this._wrapParameters(data.parameters);
                if (!Util.isNullOrUndefined(data.WEB_PN_ID)) {
                    var frameId = Util.shallowObjectClone(data.WEB_PN_ID);
                    frameId.object = null;
                    var msg = new Msg("WEBEXT_RECORD_EVENT", frameId, data);
                    content.dispatcher.sendMessage(msg);
                }
                break;
            case "AnswerAsyncCall":
                var cookie = data.cookie;
                var result = data.data;

                var ret;
                if (result && result.errorMessage) {
                    // ERROR
                    ret = {
                        status: "fail",
                        data: {
                            ErrorType: "Error",
                            ErrorDescription: result.errorMessage
                        }
                    };
                } else {
                    ret = { status: "pass", data: result };
                }

                this.answerAsyncCall(cookie, ret);
                break;
            default:
                this._logger.warn("Unsupported Operation: " + detail.op);
                break;
        }
    },

    _wrapParameters: function (parameters) {
        // In WebJsonParser, it will layout the parameters which is of type array in plain view.
        // e.g. ["p1", "p2"] result in -> ["param":"p1", "param":"p2"]
        // wrap it with another array and it will be layout correct as one array attribute value.
        // now result to ["param":["p1", "p2"]].
        return [parameters];
    },

    // Parameters:
    // @elem, the element serves as _elem 
    // @script: the composed JS script that contains the method to invoke and all required functions.
    // @methodName: the name of the method to be invoked
    // @args: the arguments to be used for the method
    // @shouldUseXpath: flag to mark whether to use xpath to locate elem in page or not
    invokeOnPage: function (key, elem, script, methodName, args, shouldUseXpath) {
        var detail = {};
        detail.elemDOMId = elem.id;
        detail.key = key;
        detail.elemId = PageAgent.flagElement(elem);
        detail.script = script;
        detail.methodName = methodName;
        detail.args = args;
        detail.WEB_PN_ID = (Util.isNullOrUndefined(this._activeAO)) ? null : this._activeAO.getID();
        if(shouldUseXpath)
            detail.elemXpath = _QTP.AutoXpathRecorder(elem);

        var event = ContentUtils.createCrossOriginCustomEvent("_UFT_INVOKE_REQUEST", { detail: detail });

        window.dispatchEvent(event);

        var result = PageAgent.getResult(this._logger);

        PageAgent.unFlagElement(elem);

        return result;
    },

    _asyncCallbacks: {},

    addAsyncCall: function (cookie, func) {
        this._logger.info("addAsyncCall: adding callback with cookie :" + cookie);
        this._asyncCallbacks[cookie] = func;
    },

    answerAsyncCall: function (cookie, result) {
        if (this._asyncCallbacks[cookie]) {
            this._asyncCallbacks[cookie](result);
            delete this._asyncCallbacks[cookie];
        } else {
            this._logger.warn("answerAsyncCall: Not find call back associate with cookie ", cookie, " result: ",result);
        }
    }
};

var PageAgent = {
    _logger: null,

    _scriptwrappers: {},

    _activeScriptWrapper: null,

    registerScriptWrapper: function (key, scriptWrapper) {
        this._scriptwrappers[key] = scriptWrapper;
    },

    // Called when specificied event is received.
    // @eventObj: the event object, of type CustomEvent
    onInvokeRequest: function (eventObj) {

        var detail = eventObj.detail;

        var key = detail.key;

        var scriptWrapper = this._scriptwrappers[key];

        if (!scriptWrapper) {
            this._logger.info("create a new script wrapper.");
            this.evalCustomizedScriptWrapperInDom(key, detail.script);
            scriptWrapper = this._scriptwrappers[key];
        }

        if (!scriptWrapper) {
            this._logger.error("onInvokeRequest: failed to evaluate script with key: " + key);
            return;
        }

        var elemId = detail.elemId;
        var elem = this.getElement(elemId);
        if(elem == null){
            elem = document.getElementById(detail.elemDOMId);

            // Use xpath to find elem for TO SFL in case native APIs may be changed by AUT like Aura.
            if(elem == null && detail.elemXpath){
                elem = document.evaluate(detail.elemXpath, document).iterateNext();
                this._logger.info("use xpath" + detail.elemXpath + " to find elem");
            }
        }
        var aoId = detail.WEB_PN_ID;

        var res = scriptWrapper.invoke(elem, detail.methodName, detail.args, aoId);

        // set result in documentElement's attribute, for Content script to query;
        this.setResult(res);

        this._logger.info("invoke result: " + res);
    },

    wrap: function (obj) {
        // Encode special objects: HTMLElement, document, window
        var result = { special: true };

        if (obj instanceof HTMLElement) {
            result.type = "element";
            result.id = this.flagElement(obj);
        } else if (obj instanceof Window) {
            result.type = "window";
        } else if (obj instanceof Document) {
            result.type = "document";
        } else if (typeof window.Event == "function" && obj instanceof window.Event) {
            // For example, SAP Ariba override window.Event to be an object. Object cannot call instanceof.
            result.type = "event";
            result.data = this.wrapEvent(obj);
        } else {
            result = obj;
        }

        return result;
    },

    unwrap: function (obj) {
        var result = obj;
        // restore special objects: Window/Document/HTMLElement
        if (obj !== null && obj !== undefined && obj.special) {
            switch (obj.type) {
                case "document":
                    result = window.document;
                    break;
                case "window":
                    result = window;
                    break;
                case "element":
                    result = this.getElement(obj.id);
                    break;
                case "event":
                    result = this.unwrapEvent(obj.data);
                    break;
                default:
                    break;
            }
        } else {
            result = obj;
        }

        return result;
    },

    _getNextId: function () {
        var attr = document.documentElement.getAttribute("___nextUFTID");
        if (attr === null || attr === undefined) {
            attr = 1;
        }
        else {
            attr = 1 + parseInt(attr, 10);
        }

        document.documentElement.setAttribute("___nextUFTID", attr);

        return attr;
    },

    keyCustomAttribute: "_UFT_CUSTOM_ID",

    flagElement: function (elem) {
        var attribute = elem.getAttribute(this.keyCustomAttribute);
        if (attribute === null || attribute === undefined) {
            attribute = this._getNextId();
            elem.setAttribute(this.keyCustomAttribute, attribute);
        }

        return attribute;
    },

    unFlagElement: function (elem) {
        elem.removeAttribute(this.keyCustomAttribute);
    },

    getElement: function (id) {
        var elements = ContentUtils.querySelectorAll(document, "[" + this.keyCustomAttribute + "=\"" + id + "\"]");
        if (elements.length === 0) {
            this._logger.error("Failed to find element with custom id " + id);
            return null;
        }
        else if (elements.length > 1)
            this._logger.warn("more than one element matches the custom attribute id of " + id);
        var element = elements[0];

        return element;
    },

    _customResultAttributeKey: "__UFT__SYNC__RES",

    setResult: function (obj) {
        document.documentElement.setAttribute(this._customResultAttributeKey, Util.jsonStringify(obj, _logger));
    },

    getResult: function (logger) {
        var jsonStr = document.documentElement.getAttribute(this._customResultAttributeKey);
        
        if (!jsonStr) {
            if (logger)
                logger.error("getResult, failed to get result JSON string from document element's attribute.");
            return;
        }

        var jsonObj = JSON.parse(jsonStr);
        if (jsonObj.status === PageAgent.INVOKE_STATUS_PASS) {
            jsonObj.data = this.unwrap(jsonObj.data);
        }

        return jsonObj;
    },

    // Convert an event object to JSON string. 
    // Note: we cannot stringify event object by default because of DOM elements
    //  so we go through each attribute and wrap DOM related objects.
    //
    wrapEvent: function (eventObj) {
        var obj = {};
        for (var key in eventObj) {
            obj[key] = this.wrap(eventObj[key]);
        }

        obj.eventPrototype = eventObj.constructor.name;

        var jsonStr = Util.jsonStringify(obj, _logger);
        return jsonStr;
    },

    // Restore the event obj from JSON string
    // Note: refer to wrapEvent to see how we handle the DOM objects.
    unwrapEvent: function (eventStr) {
        var o = JSON.parse(eventStr);
        for (var key in o) {
            o[key] = this.unwrap(o[key]);
        }

        return o;
    },

    INVOKE_STATUS_PASS: "passed",
    INVOKE_STATUS_FAIL: "failed",
    INVOKE_ERROR_METHOD_NOT_FOUND: "MethodNotFound",
    INOVKE_ERROR_GENERAL: "GeneralERROR",

    /**
     * Wrap the user script in Script wrapper and execute it in Page context
     * which will register the script wrapper into PageAgent for future usage.
     * Steps:
     *   1. extract all potential function names from the passed in script string.
     *   2. generate methods to evaluate and store functions into _methods
     *   3. replace script string into the script wrapper
    */
    evalCustomizedScriptWrapperInDom: function (key, script) {
        var registerMethodHelper = function () {
            if (typeof (METHODNAME) === "function") {
                this._methods["METHODNAME"] = METHODNAME;
            }
        };
        var methodNameProcessor = "";
        var methodNames = this._extractMethodNames(script);
        this._logger.info("Methods extracted: " + methodNames.join(";"));
        methodNames.forEach(function (methodName) {
            var specialized = Util.safeReplace(registerMethodHelper.toString(), /METHODNAME/g, methodName);
            methodNameProcessor += "(" + specialized + ").apply(this);\n";
        });

        var str = ScriptWrapper.toString();

        str = str.replace("#KEYPLACEHOLDER", key);
        str = Util.safeReplace(str, "//#METHODSPLACEHOLDER",  methodNameProcessor);
        str = Util.safeReplace(str, "//#USERSCRIPTSPLACEHOLDER", script);

        str = "( new " + str + "());";

        ContentUtils.evalInDocument(str);
    },

    /**
    * Parse the script and get the collection of names of all global functions.
    * Note: Here we utilize a new iFrame:
    *   1. have a clean window object, get all global properties (variables + functions)
    *   2. run the script
    *   3. get all global properties again
    *   4. intersect to get the added ones, and then filter out only the functions.    * 
    */
    _extractMethodNames: function (script) {
        var f = document.createElement('iframe');
        document.body.appendChild(f);

        var oldMethods = {};
        var oldProperties = Object.getOwnPropertyNames(f.contentWindow);
        oldProperties.forEach(function(name) {
            if (typeof(f.contentWindow[name]) === "function") {
                oldMethods[name] = f.contentWindow[name];
            }
        });
        
        ContentUtils.evalInDocument(script, f.contentDocument);

        var newProperties = Object.getOwnPropertyNames(f.contentWindow);

        var candidates = newProperties.filter(function(name) {
            return typeof(f.contentWindow[name]) === "function" && f.contentWindow[name] != oldMethods[name];
        });

        document.body.removeChild(f);

        return candidates;
    }
};

/**
 * Help function to be customized to serve as wrapper of executing user functions based on user script.
 * This should not be used in ext. or content script, but only in page context.
*/
function ScriptWrapper() {
    this.key = "#KEYPLACEHOLDER";

    // Place the variales here so user script can access them.
    var _elem = null;
    var _QTPUtil = _uftext._QTPUtil;

    //#USERSCRIPTSPLACEHOLDER

    this._methods = {};

    //#METHODSPLACEHOLDER
    
    // Prevent _elem & _QTPUtil from disappearing during uglify.
    if (_elem || _QTPUtil) {
        this.dummy = "dummy";
    }

    _uftext.PageAgent.registerScriptWrapper(this.key, this);

    this.invoke = function (elem, methodName, args, aoId) {
        // restore _elem which is being used by toolkit script.
        // !!!Important!!!
        _elem = elem;

        this._elem = elem;
        this._aoId = aoId;


        var result;
        var pageAgent = _uftext.PageAgent;

        pageAgent._activeScriptWrapper = this;

        var m = this._methods[methodName];
        try {
            if ((typeof m) !== "function") {
                throw { message: methodName + " is not a function" };
            }
            if (window[methodName] === m) {
                throw { message: methodName + " is a window function" };
            }
        } catch (e) {
            return { status: pageAgent.INVOKE_STATUS_FAIL, data: { type: pageAgent.INVOKE_ERROR_METHOD_NOT_FOUND, error: e.message } };
        }

        if (m !== null && m !== undefined) {
            try {
                var ret = m.apply(null, args);
                result = { status: pageAgent.INVOKE_STATUS_PASS, data: pageAgent.wrap(ret) };
            } catch (e) {
                pageAgent._logger.error("error in executing code, e=" + e);
                result = { status: pageAgent.INVOKE_STATUS_FAIL, data: { type: pageAgent.INOVKE_ERROR_GENERAL, error: e.message } };
            }
        }

        return result;
    };
}