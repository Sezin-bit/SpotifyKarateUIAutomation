if (typeof require === "function") {
    var FFBrowserUtil = require("./BrowserUtil.js").FFBrowserUtil;
    var FirefoxBrowserEventListeners = require("./FirefoxBrowserEventListeners.js").FirefoxBrowserEventListeners;
    var getLogSettingsObject = require("./FFLoggerUtil").getLogSettingsObject;

    // to get DOM window, for Firefox addon code. 
    if (typeof window === "undefined") {
        var WindowUtils = require("sdk/window/utils");
        if (typeof WindowUtils === "object") {
            // Ensure that window object is available. This is necessary for log4javascript, xml2json
            // to be available in Firefox add-on.
            var NSIDomWindow = WindowUtils.getMostRecentBrowserWindow();
            var xulWindow = WindowUtils.getXULWindow(NSIDomWindow);
            window = WindowUtils.getDOMWindow(xulWindow);
        }
    }
}

function FirefoxAPI() {
    this._logger = new LoggerUtil("FirefoxAPI");
    this._logger.trace("FirefoxAPI created");
    this._listeners = {};

    this._registerBrowserEventHandler("tab created", this._onTabCreated.bind(this));
    this._registerBrowserEventHandler("tab closed", this._onTabClosed.bind(this));
    this._registerBrowserEventHandler("tab back", this._onTabBack.bind(this));
    this._registerBrowserEventHandler("tab forward", this._onTabForward.bind(this));
    this._registerBrowserEventHandler("tab refresh", this._onTabRefresh.bind(this));
    this._registerBrowserEventHandler("tab navigation", this._onTabNavigation.bind(this));

    this._browserEventListener = new FirefoxBrowserEventListeners(this);
}

FirefoxAPI.prototype = {
    _logger: null,

    _listeners: null,

    _browserEventListener: null,

    _browserEventHandlers: {},

    _registerBrowserEventHandler: function (eventName, eventHandler) {
        this._browserEventHandlers[eventName] = eventHandler;
    },

    onBrowserEvent: function (browserEvent) {
        this._logger.trace("onBrowserEvent comes msg=", browserEvent);
        var browserEventType = browserEvent.browserEventType;
        if (this._browserEventHandlers[browserEventType]) {
            this._browserEventHandlers[browserEventType](browserEvent.browserEventData);
        }
    },

    onTabCreated: function (callbackFunction) {
        this._listeners["tab created"] = callbackFunction;
    },


    onUserOpenedNewTab: function (callbackFunction) {
        this._listeners["user opened new tab"] = callbackFunction;
    },

    onTabClosed: function (callbackFunction) {
        this._listeners["tab closed"] = callbackFunction;
    },

    onUserClosedTab: function (callbackFunction) {
        this._listeners["user closed tab"] = callbackFunction;

    },

    onReload: function (callbackFunction) {
        if (this._listeners.reload)
            this._logger.warn("onReload: overriding an existing listener");

        this._listeners.reload = callbackFunction;
    },

    onBack: function (callbackFunction) {
        this._listeners.back = callbackFunction;
    },

    onForward: function (callbackFunction) {
        this._listeners.forward = callbackFunction;
    },

    onAddressBarNavigation: function (callbackFunction) {
        if (this._listeners["addressbar navigation"])
            this._logger.warn("onAddressBarNavigation: overriding an existing listener");
        this._listeners["addressbar navigation"] = callbackFunction;
    },

    createComChannel: function () {
        return new FirefoxAddonComChannel();
    },

    createExternalComChannel: function () {
        return new ExternalComChannel({
            _createInnerChannel: function () {
                return new GroupedComChannel(new FirefoxWebSocketProxyComChannel(), new FirefoxJSCtypesComChannel());
            }
        });
    },

    getSettingValue: function (key) {
        if (key === "UFT_daemonPort") {
            var defaultPort = 8824;
            var keyPort = "LeanFTServerPort";
            var port = this.getSDKPreferenceValue(keyPort);
            if (!port) {
                // if the port configuration doesn't exist, set it to default value.
                this.setSDKPreferenceValue(keyPort, defaultPort);
                port = defaultPort;
            }

            return port;
        }
    },

    getLogSettingsObject: function () {
        return getLogSettingsObject();
    },

    _defaultErrorHandler: function (functionName) {
        this._logger.error("FirefoxAPI." + functionName + " failed");
        ErrorReport.ThrowGeneralError();
    },

    getAllTabs: function (tabIdFilter, callbackFunction) {
        this._logger.trace("FirefoxAPI.getAllTabs start");
        var failCallback = function () {
            this._logger.error("FirefoxAPI.getAllTabs failed");
            callbackFunction([]);
        }.bind(this);

        var successCallback = function (data) {
            this._logger.trace("getAllTabs return " + data);
            if (!Util.isNullOrUndefined(data) && Array.isArray(data)) {
                var browserTabs = data;
                var tabsArr = [];
                browserTabs.forEach(function (browserTab) {
                    if (!tabIdFilter || tabIdFilter(browserTab.id)) {
                        tabsArr.push(this.createTab(browserTab));
                    }
                }.bind(this));
                callbackFunction(tabsArr);
            }
            else {
                failCallback();
            }
        }.bind(this);


        FFBrowserUtil.executeCommand("getAllTabs", null, successCallback, failCallback);
    },



    createTab: function (browserTab) {
        this._logger.trace("createTab: started for id " + browserTab.id);
        var tab = new FirefoxTab();
        tab.id = browserTab.id;
        tab.windowId = browserTab.windowId;
        tab.hwnd = browserTab.hwnd || 0;
        return tab;
    },

    _onTabCreated: function (firefoxTab) {
        this._logger.trace("_onTabCreated called");

        var recordedNewTab = firefoxTab.openerTabId !== -1 && firefoxTab.url === "about:newtab";
        if (recordedNewTab && this._listeners["user opened new tab"])
            this._listeners["user opened new tab"](firefoxTab.openerTabId);
        if (this._listeners["tab created"]) {
            var browserTab = this.createTab(firefoxTab);
            this._listeners["tab created"](browserTab, firefoxTab.openerTabId);
        }

    },

    _onTabClosed: function (tabCloseEvent) {
        this._logger.trace("_onTabClosed called");
        if (this._listeners["user closed tab"] && typeof tabCloseEvent.removeInfo !== "undefined")
            this._listeners["user closed tab"](tabCloseEvent.tabId, tabCloseEvent.removeInfo);

        if (this._listeners["tab closed"])
            this._listeners["tab closed"](tabCloseEvent.tabId);
    },

    _onTabBack: function (tabBackEvent) {
        this._logger.trace("_onTabBack called");
        if (this._listeners["back"])
            this._listeners["back"](tabBackEvent.tabId, tabBackEvent.isURLChanged);
    },

    _onTabForward: function (tabForwardEvent) {
        this._logger.trace("_onTabForward called");
        if (this._listeners["forward"])
            this._listeners["forward"](tabForwardEvent.tabId, tabForwardEvent.isURLChanged);
    },

    _onTabRefresh: function (tabRefreshEvent) {
        this._logger.trace("_onTabRefresh called");
        if (this._listeners["reload"])
            this._listeners["reload"](tabRefreshEvent.tabId);
    },

    _onTabNavigation: function (tabNavigationEvent) {
        this._logger.trace("_onTabNavigation called");
        if (this._listeners["addressbar navigation"])
            this._listeners["addressbar navigation"](tabNavigationEvent.tabId, tabNavigationEvent.url);
    },
    deleteCookies: function (domain, finishedCallback) {
        this._logger.trace("FirefoxAPI.deleteCookies start");
        FFBrowserUtil.executeCommand("deleteCookies", domain, finishedCallback, this._defaultErrorHandler.bind(this, "deleteCookies"));
    },

    clearCache: function (resultCallback) {
        this._logger.trace("FirefoxAPI.clearCache called");
        FFBrowserUtil.executeCommand("clearCache", null, resultCallback, this._defaultErrorHandler.bind(this, "clearCache"));
    },

    handleDialog: function (tabId, accept, text, successCallback, failCallback) {
        this._logger.trace("FirefoxAPI.handleDialog called");
        FFBrowserUtil.executeCommand("handleDialog", [tabId, accept, text], successCallback, failCallback.bind(this, "Fail to handle dialog for tab " + tabId));
    },

    dialogExists: function (tabId, successCallback, failCallback) {
        this._logger.trace("FirefoxAPI.dialogExists called");
        var successFunctionCall = function (data) {
            if (!Util.isNullOrUndefined(data))
                successCallback(data);
            else
                failCallback.apply(this, ["Fail to check dialog exists status for tab " + tabId]);
        };

        FFBrowserUtil.executeCommand("dialogExists", tabId, successFunctionCall, failCallback.bind(this, "Fail to check dialog exists status for tab " + tabId));
    },

    getDialogText: function (tabId, successCallback, failCallback) {
        this._logger.trace("FirefoxAPI.getDialogText called");
        var successFunctionCall = function (data) {
            if (!Util.isNullOrUndefined(data))
                successCallback(data);
            else
                failCallback.apply(this, ["Fail to get text in dialog in tab " + tabId]);
        };
        FFBrowserUtil.executeCommand("getDialogText", tabId, successFunctionCall, failCallback.bind(this, "Fail to get text in dialog in tab " + tabId));
    },
    isNewMsgDelayEnabled: true,
    getSDKPreferenceValue: function (name) {
        var preferenceService = require("sdk/preferences/service");
        var preferencesName = "extensions." + require("sdk/self").id + ".sdk." + name;
        if (preferenceService.has(preferencesName)) {
            return preferenceService.get(preferencesName);
        }
        //default, return undefined
    },
    setSDKPreferenceValue: function (name, value) {
        var preferenceService = require("sdk/preferences/service");
        var preferencesName = "extensions." + require("sdk/self").id + ".sdk." + name;
        preferenceService.set(preferencesName, value);
    },

    supportActiveScreen: true
};

function FirefoxTab() {
    this._logger = new LoggerUtil("FirefoxTab");
    this._logger.trace("FirefoxTab created");
}

FirefoxTab.prototype = {
    _logger: null,

    id: -1,
    windowId: -1,

    hwnd: 0,

    // Sometimes before loading page, tab's URL is about:blank at first, in the mean time page state is complete,
    // then Firefox will begin to load page. Use this flag to know if it's the first about:blank in current tab.
    _skipCheckUrl: false,

    getTabProperty:function(attrName, successCallback, failCallback){
        failCallback("NotImplemented");
    },

    getTopLevelHwnd: function () {
        return this.hwnd || 0;
    },

    getState: function (successCallback, failCallback) {
        this._logger.trace("FirefoxTab.getState started for tab with id:" + this.id);
        var successfulCallbackWrapper = function (data) {
            if (!Util.isNullOrUndefined(data)) {
                var state = ReadyState2Status[data];
                this._logger.trace("FirefoxTab.getState result:" + state);

                if (state !== ReadyState2Status.complete || this._skipCheckUrl){
                    successCallback(state);
                    return;
                }

                this._skipCheckUrl = true;
                FFBrowserUtil.executeCommand("getTabUrl", this.id,
                function (url) {
                    this._logger.trace("getState: getTabUrl, url = ", url);
                    if (url === "about:blank" ) {
                        failCallback("url is about:blank");
                    } else {
                        successCallback(state);
                    }
                }.bind(this));
            }
            else {
                failCallback.apply(this, ["Fail to get tab state"]);
            }
        };

        FFBrowserUtil.executeCommand("getState", this.id, successfulCallbackWrapper.bind(this), failCallback.bind(this, "Fail to get tab state"));
    },

    getNumberOfTabs: function (successCallback, failCallback) {
        this._logger.trace("FirefoxTab.getNumberOfTabs started ");
        FFBrowserUtil.executeCommand("getNumberOfTabs", this.id,
        function (data) {
            successCallback(data);
        }, function () {
            this._logger.error("FirefoxTab.getNumberOfTabs failed ");
            failCallback("Fail to get tab number");
        }.bind(this)
       );
    },

    isActive: function (successCallback, failCallback) {
        this._logger.trace("FirefoxTab.isActive started for tab with id:" + this.id);
        FFBrowserUtil.executeCommand("isActive", this.id,
        function (data) {
            successCallback(data);
        }, function () {
            this._logger.error("FirefoxTab.isActive failed for tab " + this.id);
            failCallback("Fail to get tab active state");
        }.bind(this)
        );
    },

    resize: function (width, height, successCallback, failCallback) {
        this._logger.trace("FirefoxTab.resize: Started on window " + this.windowId + " To Width=" + width + " Height= " + height);
        try {
            FFBrowserUtil.resize({
                id: this.id,
                width: width,
                height: height
            });
        }
        catch (e) {
            this._logger.error("FirefoxTab.resize: got exception for tab id " + this.id + " - Error: " + e + "\n Stack: " + e.stack);
            failCallback(e);
            return;
        }

        successCallback();
    },

    setBrowserResolution: function (width, height, left, top, successCallback, failCallback) {
        this._logger.trace("FirefoxAPI.setBrowserResolution called with width = ", width, ", height = ", height, " left = ", left, " top = ", top);
        try {
            FFBrowserUtil.setBrowserResolution({
                id: this.id,
                width: width,
                height: height,
                left: left,
                top: top
            });

            successCallback();
        }
        catch (e) {
            this._logger.error("FirefoxAPI.setBrowserResolution: got exception. Error :" + e + "\n Stack: " + e.stack);
            failCallback(e);
        }
    },


    navigate: function (url, headers, successCallback, failCallback) {
        this._logger.trace("FirefoxTab.navigate started for tab with id:" + this.id);
        FFBrowserUtil.executeCommand("navigate", [this.id, url],
            successCallback, function () {
                this._logger.error("FirefoxTab.navigate failed for tab " + this.id);
                failCallback("Fail to navigate tab");
            }.bind(this)
        );
    },

    select: function (successCallback, failCallback) {
        this._logger.trace("FirefoxTab.select started for tab with id:" + this.id);
        FFBrowserUtil.executeCommand("select", this.id, successCallback, function () {
            this._logger.error("FirefoxTab.select failed for tab " + this.id);
            failCallback("Fail to activate tab");
        }.bind(this));
    },

    fullScreen: function (successCallback, failCallback) {
        this._logger.trace("FirefoxAPI.fullScreen called");
        FFBrowserUtil.executeCommand("fullScreen", this.id, successCallback, function () {
            this._logger.error("FirefoxTab.fullScreen failed for tab " + this.id);
            failCallback("fullScreen failed");
        }.bind(this));
    },

    goHome: function (successCallback, failCallback) {
        this._logger.trace("Firefox.goHome called");
        FFBrowserUtil.executeCommand("goHome", this.id, successCallback, function () {
            this._logger.error("FirefoxTab.goHome failed for tab " + this.id);
            failCallback("goHome failed");
        }.bind(this));
    },

    createNewTab: function () {
        this._logger.trace("FirefoxTab.createNewTab started");
        FFBrowserUtil.executeCommand("createNewTab", this.id,
            function () {
                this._logger.trace("FirefoxTab.createNewTab success");
            }.bind(this),
            function () {
                this._logger.error("FirefoxTab.createNewTab failed");
            }.bind(this)
        );
    },

    close: function (successCallback, failCallback) {
        this._logger.trace("FirefoxTab.close started for tab with id:" + this.id);
        this._logger.trace("first to call getNumberOfTabs to check whether error happens when retrieve tabs and window in firefox");

        function closeCallback() {
            this._logger.trace("resultCallback first then call close");
            successCallback();
            FFBrowserUtil.executeCommand("close", this.id);
        }

        function errorCallback() {
            this._logger.error("FirefoxAPI.close failed");
            failCallback();
        }
        FFBrowserUtil.executeCommand("getNumberOfTabs", this.id, closeCallback.bind(this), errorCallback.bind(this));
    },

    closeWindow: function (resultCallback) {
        //if closeAllTabs first, the resultCallback will never send back to uft. As agent is not alive.
        //so first to make sure the tab and window in the firefox extension side have no error
        //then call resultCallback
        //close all tabs at last.
        this._logger.trace("FirefoxAPI.closeAllTabs called");
        this._logger.trace("first to call getNumberOfTabs to check whether error happens when retrieve tabs and window in firefox");

        var tabId = this.id;

        function successCallback() {
            this._logger.trace("resultCallback first then call closeAllTabs");
            resultCallback();
            FFBrowserUtil.executeCommand("closeAllTabs", tabId);
        }

        function errorCallback() {
            this._logger.error("FirefoxAPI.closeAllTabs failed");
            ErrorReporter.ThrowGeneralError();
        }

        FFBrowserUtil.executeCommand("getNumberOfTabs", tabId, successCallback.bind(this), errorCallback.bind(this));
    },

    getWindowRect: function (successCallback, failCallback) {
        this._logger.warn("FirefoxTab.getWindowRect unsupported");
        failCallback("unsupported");
    },

    captureTabVisibleArea: function (format, successCallback, failCallback, rect) {
        this._logger.trace("FirefoxTab.captureTabVisibleArea started for tab with id:" + this.id);
        FFBrowserUtil.executeCommand("captureTabVisibleArea", [this.id, rect, format], successCallback, failCallback);
    },
	
	takeScreenshot: function (rect, format, successCallback, failCallback) {
	    this.select(function () {
	            this.captureTabVisibleArea(format, function (dataUri) {
	            var base64 = dataUri.replace(/^data:image\/(png|jpeg);base64,/, '');
	            successCallback(base64);
	        }, function(errMsg) {
				this._logger.error("takeScreenshot: capture visible tab failed: " + errMsg);
				failCallback(errMsg);
			}.bind(this), rect);
        }.bind(this), failCallback);
    },
	
    reload: function (successCallback, failCallback) {
        this._logger.trace("FirefoxTab.reload started for tab with id: " + this.id);
        FFBrowserUtil.executeCommand("reload", this.id,
            successCallback, function () {
                this._logger.error("FirefoxTab.reload failed for tab " + this.id);
                failCallback("Fail to reload tab");
            }.bind(this)
        );
    },

    isInjectable: function (successCallback, failCallback) {
        this._logger.trace("FirefoxTab.isInjectable started for tab with id:" + this.id);
        FFBrowserUtil.executeCommand("getTabUrl", this.id,
            function (url) {
                var isInjectable = Util.isInjectableUrl(url);
                this._logger.debug("isInjectable: " + isInjectable + " for url " + url);
                successCallback(isInjectable);
            }.bind(this),
            function () {
                this._logger.error("FirefoxTab.isInjectable failed for tab " + this.id);
                failCallback("Fail to get URL on tab " + this.id);
            }.bind(this)
        );
    }
};