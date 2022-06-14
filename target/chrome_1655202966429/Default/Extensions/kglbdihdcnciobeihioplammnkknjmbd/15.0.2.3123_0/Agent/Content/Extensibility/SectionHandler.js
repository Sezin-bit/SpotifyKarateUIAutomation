function SectionHandlersFactory() {
}

SectionHandlersFactory.prototype = {
    getSectionHandler: function (type) {
        var sectionType = type || "javascript";
        var handler = null;
        switch (sectionType) {
            case "boolean":
                handler = new BoolSectionHandler();
                break;
            case "javascript":
            case "jscript":
                handler = new JScriptSectionHandler();
                break;
        }
        return handler;
    }

};

function SectionHandlerBase() {
    this._sectionInfo = null;
    this._control = null;
    this._toolkit = null;
    this._valid = false;
}

SectionHandlerBase.prototype = {
    CONST_RESULT_TYPE_UNDEFINED:"UNDEFINED",
    CONST_RESULT_TYPE_BOOL: "BOOL",
    CONST_RESULT_TYPE_OBJECT: "OBJECT",


    initialize: function (sectionInfo, control, toolkit) {
        this._sectionInfo = sectionInfo;
        this._control = control;
        this._toolkit = toolkit;
        this._valid = this._initSectionHanlder(sectionInfo, control, toolkit);
        return this._valid;
    },

    _initSectionHanlder: function (/*sectionInfo, control, toolkit*/) {
        return true;
    },

    terminate: function () {
    },

    execute: function (element, args) {
        var result = {"type": this.CONST_RESULT_TYPE_UNDEFINED, "result" :null};
        if (this._valid) {
           this._executeSection(element, args, result);
        }
        return result;
    },

    _executeSection: function (/*element, args*/) {
    },

    getControlSettings: function (name) {
        var settingValue = null;
        if (!Util.isNullOrUndefined(this._control)) {
            settingValue = this._control.getSettingVar(name);
        }
        return settingValue;
    },

    getToolkitSettings: function (name) {
        var settingValue = null;
        if (!Util.isNullOrUndefined(this._toolkit)) {
            settingValue = this._toolkit.getSettingVar(name);
        }
        return settingValue;
    }
};

function JScriptSectionHandler() {
    SectionHandlerBase.call(this);
    this._jsFileName = "";
    this._function = "";
    this._toolkitCommonFileName = "";
    this._qtpCommonFileName = "common.js";
    this._functionWrapperClassName = "";
    this._functionWrapper = null;
}

JScriptSectionHandler.prototype = new SectionHandlerBase();
JScriptSectionHandler.prototype.constructor = JScriptSectionHandler;

JScriptSectionHandler.prototype._functionWrapperList=[];

JScriptSectionHandler.prototype._initSectionHanlder = function (sectionInfo, control, toolkit) {
    var getFileName = function (filename) {
        if(typeof(filename) === "string"){
            var splashIndex = filename.lastIndexOf("\\");
            splashIndex = (splashIndex !== -1) ? splashIndex + 1 : 0;
            return filename.slice(splashIndex);
        }
        return filename;
    };
    var result = false;
    if (Util.isNullOrUndefined(toolkit)) {
        return result;
    }
    while (true) {
        this._jsFileName = sectionInfo._file_name;
        if (!Util.isNullOrUndefined(this._jsFileName)) break;
        this._jsFileName = this.getControlSettings("default_imp_file");
        if (!Util.isNullOrUndefined(this._jsFileName)) break;
        this._jsFileName = this.getToolkitSettings("default_imp_file");
        if (!Util.isNullOrUndefined(this._jsFileName)) break;
        return result;
    }

    this._jsFileName = getFileName(this._jsFileName);

    if (Util.isNullOrUndefined(sectionInfo._function)) {
        return result;
    }
    else {
        this._function = sectionInfo._function;
    }
    this._toolkitCommonFileName = getFileName(this.getToolkitSettings("common_file"));
    result = true;
    return result;
};

JScriptSectionHandler.prototype._executeSection = function (element, args,result) {
    if (!this._functionWrapperClassName.length) {
        this._functionWrapperClassName = this._jsFileName.replace(".js", "");
        this._functionWrapperClassName += "FunctionWrapper";
        var index = this._getFunctionWrapperIndex(this._functionWrapperClassName);

        if (index !== -1) {
            this._functionWrapper = this._functionWrapperList[index];
        }
        else {
            var script = this._getFunctionScript();
            if (Util.isNullOrUndefined(script)) {                
                return;
            }
            this._functionWrapper = new FunctionWrapper(this._functionWrapperClassName, script);
            this._functionWrapperList.push(this._functionWrapper);
        }
    }

    var shouldUseXpath = false;
    if(this._toolkit.toolkitName == "SALESFORCE LIGHTNING") // Xpath is probably needed to locate elem for TO SFL in page.
        shouldUseXpath = true;

    var ret = PageProxy.invokeOnPage(this._functionWrapperClassName, element, this._functionWrapper._functionBody, this._function, args, shouldUseXpath);
	if (!Util.isNullOrUndefined(ret))
	{
		if (ret.status === PageAgent.INVOKE_STATUS_PASS)
		{
		    result.type = this.CONST_RESULT_TYPE_OBJECT;
			result.result = ret.data;
		} else{
			result.type = this.CONST_RESULT_TYPE_UNDEFINED;
			if (ret.data.type === PageAgent.INVOKE_ERROR_METHOD_NOT_FOUND){
				result.result = {"ErrorType": "MethodNotFound"};
			} else {
				result.result={"ErrorType": "Error", "ErrorDescription": ret.data.error};
			}
		}
	}
};

JScriptSectionHandler.prototype.terminate = function () {
};

JScriptSectionHandler.prototype._getFunctionWrapperIndex = function (functionName) {
    return Util.arrayFindIndex(this._functionWrapperList, function (functionWrapper) {
        return functionWrapper._functionName === functionName;
    });
};

JScriptSectionHandler.prototype._getFunctionScript = function () {

    var script = this._toolkit.getJscript(this._qtpCommonFileName) || "";

    if (!Util.isNullOrUndefined(this._toolkitCommonFileName)) {
        script += this._toolkit.getJscript(this._toolkitCommonFileName) || "";
    }
    script += this._toolkit.getJscript(this._jsFileName) || "";
    return script;
};


function FunctionWrapper(functionName, functionBody) {
    this._functionName = functionName;
    this._functionBody = functionBody;
}

function BoolSectionHandler() {
    SectionHandlerBase.call(this);
    this._value = false;
}

BoolSectionHandler.prototype = new SectionHandlerBase();
BoolSectionHandler.prototype.constructor = BoolSectionHandler;

BoolSectionHandler.prototype._initSectionHanlder = function (sectionInfo/*, control, toolkit*/) {
    if (!Util.isNullOrUndefined(sectionInfo._value)) {
        var value = sectionInfo._value.toString().toLowerCase();
        switch (value) {
            case "true":
                this._value = true;
                this._valid = true;
                break;
            case "false":
                this._value = false;
                this._valid = true;
                break;
            default:
                break;
        }
    }
    return this._valid;
};

BoolSectionHandler.prototype._executeSection = function (/*element, args*/) {
    var ret = {};
    ret.type = this.CONST_RESULT_TYPE_BOOL;
    ret.result = this._value;
    return ret;
};


BoolSectionHandler.prototype.terminate = function () {
};

