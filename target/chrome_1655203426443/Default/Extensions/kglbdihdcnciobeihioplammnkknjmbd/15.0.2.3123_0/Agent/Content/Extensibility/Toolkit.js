function Toolkit(kitInfo, index) {
    this._logger = new LoggerUtil("WebExt.Toolkit");

    this.toolkitindex = index;
    this.toolkitName = kitInfo.name.toUpperCase();

    this.priority = kitInfo.description.Controls._priority || this.CONST_PRIORITY_ATTR_DEF_VALUE;
    this.scriptEnv = this._setScriptingEnviroment();
    this.jsFunctionsManager = new JSFunctionsManager(kitInfo.jsFunctions, kitInfo.jsScripts);

    this._settings = [];
    if (!Util.isNullOrUndefined(kitInfo.description.Controls.Settings)) {
        this._settings = this._settings.concat(kitInfo.description.Controls.Settings.Variable);
    }

    this._commonIdentificationInfo = kitInfo.description.Controls.CommonIdentification || null;
    this._commonIdentificationFunctionHandler = this.CONST_UNINITIALIZE;

    this._toolkitStatusNode = kitInfo.description.Controls.ToolkitStateQuery || null;
    this._toolkitStatusFunctionHandler = this.CONST_UNINITIALIZE;

    this._controlByMicClass = Object.create(null);
    this._controls = this._initControlList(kitInfo.description.Controls.Control);
    this._controlListByTags = null;
}

Toolkit.prototype = {
    CONST_PRIORITY_ATTR_DEF_VALUE: 100,
    CONST_UNINITIALIZE: "UNINITIALIZE",

    _setScriptingEnviroment: function () {
        this._logger.trace("_setScriptingEnviroment: started");
        var scriptEnv = {};
        var browserInfo = Util.browserApplicationVersion().split(' ');
        scriptEnv.name = browserInfo[0];
        scriptEnv.version = browserInfo[1];
        return scriptEnv;
    },

    _initControlList: function (controlObjects) {
        this._logger.trace("_initControlList: started");
        var controls = [];
        var ctrl = null;
        var controlList = [];
        controlList = controlList.concat(controlObjects);
        controlList.forEach(function (item, index) {
            ctrl = new Control(item, index + 1, this);
            controls.push(ctrl);
            this._controlByMicClass[ctrl.controlType] = ctrl;
        }, this);
        return controls;
    },

    getTagList: function () {
        this._logger.trace("getTagList:started");
        if (Util.isNullOrUndefined(this._controlListByTags)) {
            this._controlListByTags = [];
            this._controls.forEach(function (control) {
                var controltags = control.initIdentificationTags();
                this.registerControlByTagList(control, controltags);
            }, this);
        }
        var tagList = [];
        if (!Util.isNullOrUndefined(this._controlListByTags)) {
            this._controlListByTags.forEach(function (item) {
                tagList.push(item.tagName);
            });
        }
        return tagList;
    },

    registerControlByTagList: function (control, tagList) {
        tagList.forEach(function (tag) {
            this.registerControlByTagName(control, tag._name);
        }, this);
    },

    registerControlByTagName: function (control, tagName) {
        var tn = tagName.toString().toLowerCase();
        var index = this._getControlListIndexByTagName(tn);
        if (index === -1) {
            var tagWithControl = {
                tagName: tn,
                controls: [control]
            };
            this._controlListByTags.push(tagWithControl);
        }
        else {
            this._controlListByTags[index].controls.push(control);
        }
    },

    _getControlListIndexByTagName: function (tagName) {
        if (Util.isNullOrUndefined(this._controlListByTags)) return -1;
        return Util.arrayFindIndex(this._controlListByTags, function (control) {
            return tagName === control.tagName;
        });
    },

    getControlByMicClass: function (micclass) {
        if(!micclass)
            return null;

        // micclass is a regular expression object when it is provided by descriptive programming.
        // e.g. SAPUIButton("micclass:=SAPUIButton", "Attr:=Value"...)
        if (micclass.isRegExp && micclass.regExQuery) {
            var targetMicClass = micclass.regExQuery.toUpperCase();
            var micclasses = Object.keys(this._controlByMicClass);
            micclass = Util.arrayFind(micclasses, function (item) {
                return item.toUpperCase() === targetMicClass;
            });
            if (micclass) {
                this._logger.trace("Found control by regular expression, micclass=", micclass);
            }
        }
        return this._controlByMicClass[micclass];
    },

    createControl: function (element, skipTypes, rootElem, micclass) {
        var control = null;
        // When micclass is provided, get the related control from cache.
        if (micclass){
            control = this.getControlByMicClass(micclass);
            if (control != null){
                if (skipTypes.indexOf(control.controlType) === -1) {
                    return control.getControlByIdentification(element, rootElem || {});
                }
            }
            return null;
        }

        // When micclass is not provided, loop through all possible controls.
        var controlList = this._getCandidateControlList(element);
        Util.arrayFindIndex(controlList, function (item) {
            if (skipTypes.indexOf(item.controlType) === -1) {
                control = item.getControlByIdentification(element, rootElem || {});
            }
            return !Util.isNullOrUndefined(control);
        });
        return control;
    },

    _getCandidateControlList: function (element) {
        var controlList = [];
        var index = this._getControlListIndexByTagName(element.tagName.toLowerCase());
        if (index !== -1) {
            controlList = this._controlListByTags[index].controls;
        }

        index = this._getControlListIndexByTagName("default");
        if (index !== -1) {
            controlList = controlList.concat(this._controlListByTags[index].controls);
        }
        return controlList;
    },

    getControlByCommonIdentification: function (element) {
        var control = null;
        if (!Util.isNullOrUndefined(this._commonIdentificationInfo)) {
            var controlClassName = this._callCommonIdentificationHandler(this._commonIdentificationInfo, element);
            if (!Util.isNullOrUndefined(controlClassName) && typeof (controlClassName) === "string" && controlClassName.length) {
                control = this._getControlByControlName(controlClassName);
            }
        }
        return control;
    },

    _callCommonIdentificationHandler: function (commonIdentificationInfo, element) {
        var controlClassName = null;
        if (this._commonIdentificationFunctionHandler === this.CONST_UNINITIALIZE) {
            this._commonIdentificationFunctionHandler = this._getHandler(commonIdentificationInfo);
        }
        if (!Util.isNullOrUndefined(this._commonIdentificationFunctionHandler)) {
            var ret = this._commonIdentificationFunctionHandler.execute(element, []);
            if (!Util.isNullOrUndefined(ret.type) && ret.type === "OBJECT" && typeof (ret.result) === "string") {
                controlClassName = ret.result;
            }
        }
        return controlClassName;
    },

    _getControlByControlName: function (controlName) {
        var control = Util.arrayFind(this._controls, function (control) {
            return control.controlType === controlName;
        });
        return control || null;
    },

    getSettingVar: function (name) {
        var setting = Util.arrayFind(this._settings, function (setting) {
            return setting._name === name;
        });
        return Util.isNullOrUndefined(setting) ? null : setting._value;
    },

    getJscript: function (jsFileName) {
        return this.jsFunctionsManager.getJSScript(jsFileName);
    },

    _getHandler: function (handlerInfo) {
        var handler = SectionHandlersFactory.prototype.getSectionHandler(handlerInfo._type);
        if (!Util.isNullOrUndefined(handler)) {
            if (!handler.initialize(handlerInfo, null, this)) handler = null;
        }
        return handler;
    }
};

function JSFunctionsManager(jsFunctionFileNames, jsFunctionsScripts) {
    this._jsFunctionFileNames = jsFunctionFileNames;
    this._jsFunctionScripts = jsFunctionsScripts;
}

JSFunctionsManager.prototype = {

    getJSScript: function (jsFileName) {
        var jsfunctionscript = "";
        var index = this._getIndex(jsFileName);
        if (index !== -1) {
            jsfunctionscript = this._jsFunctionScripts[index];
        }
        return jsfunctionscript;
    },

    _getIndex: function (jsFileName) {
        return Util.arrayFindIndex(this._jsFunctionFileNames, function (item) {
            return item === jsFileName;
        });
    }
};