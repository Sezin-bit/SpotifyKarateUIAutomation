function Control(controlInfo, index, toolkit) {
    this._logger = new LoggerUtil("WebExt.Control");
    this.controlIndex = index;
    this.controlType = controlInfo._TestObjectClass;

    this._toolkit = toolkit;
    this._controlInfo = controlInfo;
    this._identificationConditions = null;
    this._methodList = this._initMethodList(controlInfo);


    this._settings = [];
    if (!Util.isNullOrUndefined(controlInfo.Settings) && !Util.isNullOrUndefined(controlInfo.Settings.Variable)) {
        this._settings = this._settings.concat(controlInfo.Settings.Variable);
    }

    this._identificationHanlder = this.CONST_UNINITIALIZE;
    this._propertyHandler = this.CONST_UNINITIALIZE;
    this._innerElementHandler = this.CONST_UNINITIALIZE;
    this._listenToEventsHandler = this.CONST_UNINITIALIZE;

    this._learnFilterHandler = this.CONST_UNINITIALIZE;
    this._learnControl = this._getControlLearnType();
    this._learnChildren = this._getChildrenLearnType();
}

Control.prototype = {

    CONST_DEFAULT_TAG_VALUE: "default",

    CONST_UNINITIALIZE: "UNINITIALIZE",


    _identificationType: {
        "IdentifyIfPropMatch": 0,
        "CallIDFuncIfPropMatch": 1,
        "SkipIfPropMatch": 2
    },

    _identificationMode: {
        Identified: 0,
        CallIndentificationFunction: 1,
        Skip: 2
    },

    _initMethodList: function (controlInfo) {
        var methodList = [];
        try {
            if (!Util.isNullOrUndefined(controlInfo.Run.Methods.Method)) {
                methodList = methodList.concat(controlInfo.Run.Methods.Method);
            }
        }
        catch (error) {
        }
        return methodList;
    },

    initIdentificationTags: function () {
        var tagList = [];
        var browserEntry = this._getBrowserSpecificEntry(this._toolkit.scriptEnv);
        if (!Util.isNullOrUndefined(browserEntry)) {
            if (!Util.isNullOrUndefined(browserEntry.HTMLTags)) {
                tagList = tagList.concat(browserEntry.HTMLTags.Tag);
            }
            else {
                tagList.push({ "_name": this.CONST_DEFAULT_TAG_VALUE });
            }
        }
        return tagList;
    },

    _getBrowserSpecificEntry: function (scriptEnv) {
        var browserEntry = null;
        var min_version = parseFloat(scriptEnv.version);
        var max_version = NaN;

        var checkBrowserMinVersionInRange = function (currentVersion, minVersion, maxVersion) {
            var result = false;
            if (isNaN(minVersion) || isNaN(currentVersion) || currentVersion < minVersion) {
                result = false;
            }
            else if (isNaN(maxVersion)) {
                result = true;
            }
            else {
                result = currentVersion < maxVersion;
            }
            return result;
        };

        var browsers;
        try {
            browsers = this._controlInfo.Identification.Browser;
        }
        catch (exception) {
            this._logger.info("_getBrowserSpecificEntry: fail to get Identification.Browser");
            browsers = null;
        }

        if (Util.isNullOrUndefined(browsers)) {
            this._logger.info("_getBrowserSpecficEntry: Identification.Browser not exist. get the identification node.");
            return this._controlInfo.Identification;
        }

        var browserList = [];
        browserList = browserList.concat(browsers);
        browserList.forEach(function (browser) {
            if (browser._name === "*" && Util.isNullOrUndefined(browserEntry)) {
                browserEntry = browser;
            }
            else if (browser._name.toLowerCase() === scriptEnv.name.toLowerCase()) {
                if (Util.isNullOrUndefined(browser._min_version)) {
                    if (Util.isNullOrUndefined(browserEntry) || browserEntry._name === "*") {
                        browserEntry = browser;
                    }
                }
                else {
                    if (checkBrowserMinVersionInRange(parseFloat(browser._min_version), min_version, max_version)) {
                        browserEntry = browser;
                        max_version = parseFloat(browser._min_version);
                    }
                }
            }
        });

        return browserEntry;
    },

    getControlByIdentification: function (element, rootElem) {
        var idMode = this.getIdentificationModeForElement(element);
        if (idMode === this._identificationMode.Identified)
            return this;
        if (idMode === this._identificationMode.Skip)
            return null;
        return this._getControlByIdentificationHandler(element, rootElem);
    },

    getIdentificationModeForElement: function (element) {
        this._initializeIdentificationConditionsSection();
        if (Util.isNullOrUndefined(this._identificationConditions)) return this._identificationMode.Skip;
        if (!Util.isNullOrUndefined(this._identificationConditions[this._identificationType.IdentifyIfPropMatch])) {
            if (this._identificationConditions[this._identificationType.IdentifyIfPropMatch].evaluate(element))
                return this._identificationMode.Identified;
        }
        if (!Util.isNullOrUndefined(this._identificationConditions[this._identificationType.CallIDFuncIfPropMatch])) {
            if (!this._identificationConditions[this._identificationType.CallIDFuncIfPropMatch].evaluate(element))
                return this._identificationMode.Skip;
        }
        if (!Util.isNullOrUndefined(this._identificationConditions[this._identificationType.SkipIfPropMatch])) {
            if (this._identificationConditions[this._identificationType.SkipIfPropMatch].evaluate(element))
                return this._identificationMode.Skip;
        }
        return this._identificationMode.CallIndentificationFunction;
    },

    _initializeIdentificationConditionsSection: function () {
        if (Util.isNullOrUndefined(this._identificationConditions)) {
            this._identificationConditions = new Array(3);
            var conditions = this._getBrowserSpecificConditions(this._toolkit.scriptEnv);
            if (!Util.isNullOrUndefined(conditions)) {
                var conditionsList = [];
                conditionsList = conditionsList.concat(conditions);
                conditionsList.forEach(function (item) {
                    this._conditionsExpressParse(item);
                }, this);
            }
            else {
                this._logger.info("no condition found in the control");
            }
        }
    },

    _conditionsExpressParse: function (conditions) {
        if (!Util.isNullOrUndefined(conditions._type)) {
            var index = this._identificationConditionTypeStrToIndex(conditions._type);
            if (index < 0) {
                this._logger.error("identification type is not correct");
                return;
            }
            if (Util.isNullOrUndefined(this._identificationConditions[index])) {
                var conditionExp = new ConditionsExpress(conditions);
                if (conditionExp.isValid()) {
                    this._identificationConditions[index] = conditionExp;
                }
            }
            else {
                this._logger.error("condition express for the condition type exist already");
            }
        }
    },

    _identificationConditionTypeStrToIndex: function (conditionType) {
        var conditionIndex = this._identificationType[conditionType];
        return Util.isNullOrUndefined(conditionIndex) ? -1 : conditionIndex;
    },

    _getBrowserSpecificConditions: function (scriptEnv) {
        var conditionsEntry = null;
        var browserEntry = this._getBrowserSpecificEntry(scriptEnv);
        if (browserEntry && !Util.isNullOrUndefined(browserEntry.Conditions)) {
            conditionsEntry = browserEntry.Conditions;
        }
        return conditionsEntry;
    },

    _getControlByIdentificationHandler: function (element, rootElem) {
        var control = null;
        if (!Util.isNullOrUndefined(this._toolkit._commonIdentificationInfo)) {
            control = this._toolkit.getControlByCommonIdentification(element);
        }
        else {
            if (this._callControlIdentificationHandler(element, rootElem))
                control = this;
        }
        return control;
    },

    _callControlIdentificationHandler: function (element, rootElement) {
        var result = false;
        if (typeof (this._identificationHanlder) === "string" && this._identificationHanlder === this.CONST_UNINITIALIZE) {
            this._identificationHanlder = this._getHandler(this._controlInfo.Identification);
        }
        if (Util.isNullOrUndefined(this._identificationHanlder)) {
            return false;
        }
        var ret = this._identificationHanlder.execute(element, []);
        if (!Util.isNullOrUndefined(ret.type) && ret.type !== "UNDEFINED" && !Util.isNullOrUndefined(ret.result)) {
            if (typeof (ret.result) === "boolean")
                result = ret.result;
            else if (typeof (ret.result) === "number")
                result = (parseInt(ret.result,10) !== 0);
            else if (typeof (ret.result) === "object") {
                rootElement._elem = ret.result;
                result = true;
            }
        }
        return result;
    },

    getInternalElement: function (element) {
        var innerElement = null;

        if (!this.isRootElement(element)) {
            this._logger.error("getInternalElement: the element is not the control supported");
            return null;
        }

        if (typeof (this._innerElementHandler) === "string" && this._innerElementHandler === this.CONST_UNINITIALIZE) {
            this._initializeInnerElementHandler();
        }

        if (Util.isNullOrUndefined(this._innerElementHandler)) {
            return innerElement;
        }
        var ret = this._innerElementHandler.execute(element, []);
        if (!Util.isNullOrUndefined(ret.type) && ret.type === "OBJECT") {
            innerElement = ret.result;
        }
        return innerElement;
    },

    _initializeInnerElementHandler: function () {
        var handlerInfo = {};
        handlerInfo._function = this.getSettingVar("func_to_get_base_elem");
        handlerInfo._file_name = this.getSettingVar("file_for_func_to_get_base_elem");
        this._innerElementHandler = this._getHandler(handlerInfo);
    },

    isRootElement: function (element) {
        var idMode = this.getIdentificationModeForElement(element);
        if (idMode === this._identificationMode.Identified)
            return true;

        if (idMode === this._identificationMode.Skip)
            return false;

        return this._callControlIdentificationHandler(element, {});
    },


    getSettingVar: function (name) {
        var setting = Util.arrayFind(this._settings, function (item) {
            return item._name === name;
        });
        return Util.isNullOrUndefined(setting) ? null : setting._value;
    },

    _getHandler: function (handlerInfo) {
        var handler = SectionHandlersFactory.prototype.getSectionHandler(handlerInfo._type);
        if (!Util.isNullOrUndefined(handler)) {
            if (!handler.initialize(handlerInfo, this, this._toolkit)) handler = null;
        }
        return handler;
    },

    getExtProperty: function (element, property) {
        var propertyValue = null;
        if (typeof (this._propertyHandler) === "string" && this._propertyHandler === this.CONST_UNINITIALIZE) {
            this._initializePropertyHandler();
        }
        if (Util.isNullOrUndefined(this._propertyHandler)) {
            return propertyValue;
        }
        var ret = this._propertyHandler.execute(element, [property]);
        if (!Util.isNullOrUndefined(ret.type) && ret.type !== "UNDEFINED") {
            propertyValue = ret.result;
        }
        return propertyValue;
    },

    _initializePropertyHandler: function () {
        var handlerInfo = {};

        if (!Util.isNullOrUndefined(this._controlInfo.Run) && !Util.isNullOrUndefined(this._controlInfo.Run.Properties)) {
            handlerInfo = this._controlInfo.Run.Properties;
        }
        else {
            handlerInfo._function = "get_property_value";
            handlerInfo._file_name = this.getSettingVar("file_for_func_to_get_base_elem");
        }
        this._propertyHandler = this._getHandler(handlerInfo);
    },

    invokeExtMethod: function (element, methodName, args) {
        var methodIndex = Util.arrayFindIndex(this._methodList, function (method) {
            return method._name === methodName;
        });

        if (methodIndex === -1) {
            methodIndex = Util.arrayFindIndex(this._methodList, function (method) {
                return method._name.toLowerCase() === methodName.toLowerCase();
            });
        }

        var handlerInfo = {};
        if (methodIndex === -1) {
            handlerInfo._function = methodName;
            handlerInfo._file_name = this.getSettingVar("file_for_func_to_get_base_elem");
        }
        else {
            handlerInfo = this._methodList[methodIndex];
        }

        var methodHandler = this._getHandler(handlerInfo);

        var ret;
        if (!Util.isNullOrUndefined(methodHandler)) {
            ret = methodHandler.execute(element, args);
        }

        var result = {};
        if (ret && !Util.isNullOrUndefined(ret.type) && ret.type !== "UNDEFINED") {
            result.status = "pass";
        }
        else {
            result.status = "fail";
        }

        if (!Util.isNullOrUndefined(ret.result)) {
            result.data = ret.result;
        }

        return result;
    },

    isObjSpyable: function () {
        try {
            var controlSpyable = this._controlInfo.Filter.Spy._is_control_spyable;
            if (!Util.isNullOrUndefined(controlSpyable) && (controlSpyable.toLowerCase() === "no"))
                return false;
        }
        catch (error) {
            this._logger.warn("isObjSpyable: return true by default, error: " + error);
        }
        return true;
    },

    UseDefaultEventHandling: function () {
        try {
            var value = this._controlInfo.Record.EventListening._use_default_event_handling;
            if (value && (value.toUpperCase() === "FALSE" || value === "0"))
                return false;
        } 
        catch (error) {
            this._logger.warn("UseDefaultEventHandling: return true by default, error: " + error);
        }
        return true;
    },

    UseDefaultEventHandlingForChildren: function () {
        try {
            var value = this._controlInfo.Record.EventListening._use_default_event_handling_for_children;
            if (value && (value.toUpperCase() === "FALSE" || value === "0"))
                return false;
        }
        catch (error) {
            this._logger.warn("UseDefaultEventHandlingForChildren: return true by default, error: " + error);
        }
        return true;
    },

    _getControlLearnType: function () {
        // the default is yes
        var learnControl = ControlLearnType.Yes;
        try {
            if (!Util.isNullOrUndefined(this._controlInfo.Filter.Learn._learn_control)) {
                switch (this._controlInfo.Filter.Learn._learn_control) {
                    case "Yes":
                        learnControl = ControlLearnType.Yes;
                        break;
                    case "No":
                        learnControl = ControlLearnType.No;
                        break;
                    case "IfChildren":
                        learnControl = ControlLearnType.IfChildren;
                        break;
                }
            }
        }
        catch (exception) {
            this._logger.info("_getControlLearnType: fail to get Filter.Learn.learn_control");
        }
        return learnControl;
    },

    _getChildrenLearnType: function () {
        // the default is yes
        var learnChildren = ChildrenLearnType.Yes;
        try {
            if (!Util.isNullOrUndefined(this._controlInfo.Filter.Learn._learn_children)) {
                switch (this._controlInfo.Filter.Learn._learn_children) {
                    case "Yes":
                        learnChildren = ChildrenLearnType.Yes;
                        break;
                    case "No":
                        learnChildren = ChildrenLearnType.No;
                        break;
                    case "CallFilterFunc":
                        learnChildren = ChildrenLearnType.LetMeSupply;
                        break;
                }
            }
        }
        catch (exception) {
            this._logger.info("_getChildrenLearnType: fail to get Filter.Learn.learn_children");
        }
        return learnChildren;
    },

    // When learn_children is CallFilterFunc, use this method to get children for learn
    getChildrenForLearn: function (element) {
        var result = null;
        if (typeof (this._learnFilterHandler) === "string" && this._learnFilterHandler === this.CONST_UNINITIALIZE) {
            this._learnFilterHandler = this._getHandler(this._controlInfo.Filter.Learn);
        }
        if (!Util.isNullOrUndefined(this._learnFilterHandler)) {
            var ret = this._learnFilterHandler.execute(element, []);
            if (!Util.isNullOrUndefined(ret.type) && ret.type === "OBJECT") {
                result = ret.result;
            }
        }
        return result;
    },

    RegisterExtEventHandler: function (element) {
        this._callListenToEventsHandler(element);
    },

    _callListenToEventsHandler: function (element) {
        if (this._listenToEventsHandler === this.CONST_UNINITIALIZE) {
            var handlerInfo;
            if (this._controlInfo.Record && this._controlInfo.Record.EventListening) {
                handlerInfo = this._controlInfo.Record.EventListening;
            }
            else {
                handlerInfo = { "_function": "ListenToEvents" };
            }

            this._listenToEventsHandler = this._getHandler(handlerInfo);
        }
        if (this._listenToEventsHandler) {
            this._listenToEventsHandler.execute(element, []);
        }
    },

    isContainer: function () {
        // try to get IsContainer attribute from XML document.
        return this._controlInfo && this._controlInfo._IsContainer === "true";
    }
};
