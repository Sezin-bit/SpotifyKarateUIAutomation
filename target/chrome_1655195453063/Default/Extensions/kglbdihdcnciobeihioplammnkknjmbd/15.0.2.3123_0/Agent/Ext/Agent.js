function Agent() {
    this._logger = new LoggerUtil("Ext.Agent");
    this._logger.info("Agent was initiated");

    this._inspectionMode = null;
    this._inspectionOptions = null;

    ext.dispatcher.addListener("clientRegistered", this);

    // register to Browser events
    this._registerAppEvent('onTabCreated', this._onTabCreated.bind(this));
    this._registerAppEvent('onTabUpdated', this._onTabUpdated.bind(this));
    this._registerAppEvent('onTabClosed', this._onTabClosed.bind(this));

    this._registerAppEvent('onAddressBarNavigation', this._onAddressBarNavigation.bind(this));
    this._registerAppEvent('onTabReplaced', this._onTabReplaced.bind(this));
    this._registerAppEvent('onUserOpenedNewTab', this._onUserOpenedNewTab.bind(this));
    this._registerAppEvent('onReload', this._onReload.bind(this));
    this._registerAppEvent('onBack', this._onBack.bind(this));
    this._registerAppEvent('onForward', this._onForward.bind(this));
    this._registerAppEvent('onUserClosedTab', this._onUserClosedTab.bind(this));

    // register to Spy related events
    this._registerAppEvent('onSpySuspended', this._onSpySuspended.bind(this));
    this._registerAppEvent('onSpyResumed', this._onSpyResumed.bind(this));
    Util.assert(typeof (ext.app.onSpySuspended) === typeof (ext.app.onSpyResumed),
    "Both onSpySuspend && onSpyResumed should exist or not exist. But never a case where only one of them exists.", this._logger);
    
    this._testingToolIdMap = {};
}

Agent.prototype = {
    _logger: null,
    _knownTabs: {},
    _inspectionMode: null,
    _settings: null,
    _eventConfigCache: null,
    _browserRecorder: null,
    _inspectionOptions: null,
    _testingToolIdMap:null,

    onMessage: function (msg, resultCallback) {
        this._logger.trace("onMessage: Started with message ", msg);

        if (!this[msg._msgType]) {
            this._dispatchMessageToAllBrowsers(msg, resultCallback);
            return;
        }

        this[msg._msgType](msg, resultCallback);
    },

    SRVC_SET_CLASS2WITYPE_OBJ: function (msg, resultCallback) {
        resultCallback(msg);
    },

    SRVC_SET_ENUM2STRINGMAP_OBJ: function (msg, resultCallback) {
        resultCallback(msg);
    },
    SRVC_GET_ALL_BROWSERS: function (msg, resultCallback) {
        var browser = window._QTP && window._QTP.WebDriverInfo && window._QTP.WebDriverInfo.WebDriverType;
        if(!browser) {
            var browserTypeVersion = Util.browserApplicationVersion();
            // For the chromium edge
            // to suppport the edge IE Mode
            if(browserTypeVersion.includes("Chromium Edge")) {
                this._SRVC_GET_ALL_BROWSERS_FOR_CHROMIUMEDGE(msg, resultCallback);
                return;
            }
        }
        var resultArr = [];
        var targetBrowsers = this._getTargetBrowsers();
        if (!Util.isNullOrUndefined(msg._data.processId))
        {
            targetBrowsers = targetBrowsers.filter(function (browser) {
                return browser.getTestingToolId() == msg._data.processId;
            });
        }
        targetBrowsers.forEach((function (browser) {
                resultArr.push(browser.getID());

        }).bind(this));

        if (resultArr.length === 1)
            msg._data.WEB_PN_ID = resultArr[0];
        else
            msg._data.WEB_PN_ID = [resultArr];

        resultCallback(msg);
    },
    _SRVC_GET_ALL_BROWSERS_FOR_CHROMIUMEDGE: function (msg, resultCallBack) {
        var resultArr = [];
        var targetBrowsers = this._getTargetBrowsers();
        var callbackIndex = 0;
        if (!Util.isNullOrUndefined(msg._data.processId))
        {
            targetBrowsers = targetBrowsers.filter(function (browser) {
                return browser.getTestingToolId() == msg._data.processId;
            });
        }
        var length = targetBrowsers.length;
        if(length == 0){
            resultCallBack(msg);
            return;
        }
        var successCallback = function(browser, status) {
            var browserId = browser.getID();
            // To support the chromium Edge IE Mode
            // if the status is "unloaded", we will recognize it as IE tab
            // Set the page id to 100, the webPackgae will use the page field
            // to determine is the normal edge tab or IE tab. 
            if(status === "unloaded") {
                browserId['page'] = 100;
            }
            resultArr.push(browserId);
            callbackIndex++;
            if(callbackIndex === length) {
                if(resultArr.length === 1)
                    msg._data.WEB_PN_ID = resultArr[0];
                else
                    msg._data.WEB_PN_ID = [resultArr];
                resultCallBack(msg);
            }
        }
        var failureCallback = function(browser, errorMsg) {

        }
        for(var index = 0; index < length; index++) {
            var browser = targetBrowsers[index];
            browser._associatedTab.getTabState(successCallback.bind(null,browser), failureCallback.bind(null,browser));
        }
    },
    SRVC_INVOKE_METHOD: function (msg, resultCallback) {
        var name = msg._data.AN_METHOD_NAME;
        var func = this.invokeMethods[name];
        if (func) {
            func.call(this, msg, resultCallback);
            return;
        }

        ErrorReporter.ThrowNotImplemented("Browser.invokeMethod: " + name);
    },
    NOTIFY_BROWSER_IS_NOT_VALID: function (msg, resultCallback) {
        var browserTabID = msg._data.WEB_PN_ID.browser;
        this.destroyBrowser(browserTabID);
        resultCallback(msg);
    },
    CMD_BROWSER_CLOSE_ALL_TABS: function (msg, resultCallback) {
        this._logger.trace("CMD_BROWSER_CLOSE_ALL_TABS: Started");
        var closeTabMsg = new Msg("CMD_BROWSER_CLOSE", msg._to, {});
        this._dispatchMessageToAllBrowsers(closeTabMsg, resultCallback);
    },

    SRVC_SET_GLOBAL_VARIABLES: function (msg, resultCallback) {
        this._logger.trace("SRVC_SET_GLOBAL_VARIABLES: Started");

        // Extract Settings
        this._settings = this._readSettingsFromMsg(msg);
        Util.assert(this._settings, "SRVC_SET_GLOBAL_VARIABLES: Received empty settings", this._logger);

        // Handle interesting settings change
        if (this._settings.WebActivityState != null)
            this._handleWebActivityState(this._settings.WebActivityState);

        var newSettingsMsg = new Msg("SRVC_SET_GLOBAL_VARIABLES_INTERNAL", this.getID(), this._settings);

        if (!Util.isNullOrUndefined(msg._data) && !Util.isNullOrUndefined(msg._data.processId)) {
            var browsers = this._getTargetBrowsers().filter(function (browser) {
                return browser.getTestingToolId() === msg._data.processId;
            });
            if (browsers.length === 0)
                return resultCallback(msg);

            this._dispatchMessageToBrowsers(newSettingsMsg, browsers, function () { resultCallback(msg); });
        }
        else {
            // Dispatch to children
            this._dispatchMessageToAllBrowsers(newSettingsMsg, function (/*resMsg*/) {
                resultCallback(msg);
            });
        }
    },


    SRVC_TAKE_SCREENSHOT: function (msg, resultCallback) {
        this._logger.trace("SRVC_TAKE_SCREENSHOT: Started");
        var targetBrowsers = this._getTargetBrowsers();
        if (targetBrowsers.length === 0) {
            this._logger.warn("SRVC_TAKE_SCREENSHOT: No Target browsers to dispatch message to, Returning.");
            resultCallback(msg);
            return;
        }
        else if (targetBrowsers.length === 1) {
            this._logger.trace("SRVC_TAKE_SCREENSHOT will take screenshot on only one browser");
            return targetBrowsers[0].onMessage(msg, resultCallback);
        }
        else {
            return Description.filterAOList(targetBrowsers, { isActive: true }, function (activeBrowsers) {
                if (activeBrowsers.length === 0)
                    this._logger.warn("SRVE_TAKE_SNAPSHOT: No active browser. Use the first one instead.");
                var activeBrowser = activeBrowsers.length === 0 ? targetBrowsers[0] : activeBrowsers[0];
                activeBrowser.onMessage(msg, resultCallback);
            }.bind(this));
        }
    },

    _readSettingsFromMsg: function (msg) {
        this._logger.trace("_readSettingsFromMsg: Started");

        var variables = msg._data, new_settings = {};
        var settingPropName;

        // variables are either {name:"opt1", value: "val1"} or {name:[["opt1", "opt2"]], value:[["val1", "val2"]]}
        if (!Array.isArray(variables.name)) {
            //In LeanFT as a workaround we set the WebActivityState on the settings as runtime setting and maintain its value.
            //Since it is provided as settings we get it as lower case so we fix its name accdording to the usage in the agent.
            settingPropName = variables.name == "webactivitystate" ? "WebActivityState" : variables.name;
            new_settings[settingPropName] = variables.value;
        } else {
            for (var i = 0; i < variables.name[0].length; ++i) {
                settingPropName = variables.name[0][i] == "webactivitystate" ? "WebActivityState" : variables.name[0][i];
                new_settings[settingPropName] = variables.value[0][i];
            }
        }

        return new_settings;
    },

    _handleWebActivityState: function (webActivityState) {
        this._logger.trace("_handleWebActivityState: Started");

        switch (webActivityState) {
            case 0: // Idle
                this._logger.trace("_handleWebActivityState: Idle mode set");
                setIdleMode.call(this);
                break;
            case 1:  // Record
                this._logger.trace("_handleWebActivityState: Record started");
                this._inspectionMode = "record";
                this._inspectionOptions = null;

                if (!this._browserRecorder)
                    this._browserRecorder = new BrowserRecorder(this._knownTabs);
                break;
            case 2: // Run
                this._logger.trace("_handleWebActivityState: Replay started");
                if (ext.app.runStarted)
                    ext.app.runStarted();
                setIdleMode.call(this);
                break;
            default:
                this._logger.error("_handleWebActivityState: setting mode to idle. Unhandled WebActivityState: " + webActivityState);
                setIdleMode.call(this);
        }

        return;

        // Helper functions

        function setIdleMode() {
            this._inspectionMode = null;
            this._inspectionOptions = null;
            this._browserRecorder = null;
        }
    },

    SRVC_SET_EVENT_CONFIGURATION: function (msg, resultCallback) {
        this._logger.trace("SRVC_SET_EVENT_CONFIGURATION: Started");

        // Parse raw data and save to cache
        var config = this._parseEventConfig(msg._data.EN_CONFIG_DATA);
        this._eventConfigCache = config;

        var newMsg = new Msg('SRVC_SET_EVENT_CONFIGURATION_INTERNAL', msg._to, { 'config': config });
        this._dispatchMessageToAllBrowsers(newMsg, function () {
            resultCallback(msg);
        });

    },

    _parseEventConfig: function (xml) {
        this._logger.trace("_parseEventConfig: called.");

        var json = Util.convertXmlStrToJson(xml);
        if (!json) {
            this._logger.error("_parseEventConfig: Faile to convert configuration from XML to JSON! " + msg._data.EN_CONFIG_DATA);
            return null;
        }

        // Convert config from array to map
        var config = {};
        Util.map(json.XML.Object, function (micclassConfig, args) {
            var micclass = micclassConfig._Name.toLowerCase();
            config[micclass] = {};

            Util.map(micclassConfig.Event, function (eventConfig) {
                config[micclass][eventConfig._Name] = {
                    listen: parseInt(eventConfig._Listen),
                    record: parseInt(eventConfig._Record)
                };
                //TODO: some events have sub-config not implement here.
                //<Event Name="onmouseup" Listen="2" Record="1">
                //  <Property Name="button" Value="2" Listen="2" Record="2"/>
                //  <Property Name="button" Value="4" Listen="2" Record="2"/>
                //</Event>
            });
        });

        return config;
    },

    _setInspectionMode: function (msg, resultCallback) {
        this._logger.trace("_setInspectionMode: Called.");

        switch (msg._msgType) {
            case "CMD_SPY_START":
                this._inspectionMode = "spy";
                this._inspectionOptions = msg._data;
                break;
            case "CMD_SPY_END":
                this._inspectionMode = null;
                this._inspectionOptions = null;
                break;
            default:
                this._logger.error("_setInspectionMode called with unknown msg type: " + msg._msgType);
                resultCallback(msg);
                return;
        }

        this._dispatchMessageToAllBrowsers(msg, resultCallback);
    },

    _onAddressBarNavigation: function (tabId, url) {
        this._logger.trace("_setInspectionMode: Called.");

        this._doInRecord(function () {
            this._browserRecorder.onAddressBarNavigation(tabId, url);
        });
    },

    _onSpySuspended: function () {
        this._logger.trace("_onSpySuspended: Called.");
        var msg = new Msg("CMD_SPY_END", this.getID(), {});
        this._setInspectionMode(msg, Util.identity);
    },

    _onSpyResumed: function () {
        this._logger.trace("_onSpyResumed: Called.");
        var msg = new Msg("CMD_SPY_START", this.getID(), {});
        this._setInspectionMode(msg, Util.identity);
    },

    CMD_SPY_START: function (msg, resultCallback) {
        this._logger.trace("CMD_SPY_START: Called.");

        if (ext.app.setInteractionMode)
            ext.app.setInteractionMode("spy");
        else
            this._logger.debug("CMD_SPY_START: Browser doesn't support InteractionMode");

        this._setInspectionMode(msg, resultCallback);
    },
    CMD_SPY_END: function (msg, resultCallback) {
        this._logger.trace("CMD_SPY_END: Called.");

        if (ext.app.setInteractionMode)
            ext.app.setInteractionMode("normal");
        else
            this._logger.debug("CMD_SPY_END: Browser doesn't support InteractionMode");

        this._setInspectionMode(msg, resultCallback);
    },

    CMD_MONITOR_MOUSE_START:function(msg,resultCallback){
        this._logger.trace("CMD_MONITOR_MOUSE_START called");
        this._dispatchMessageToAllBrowsers(msg, resultCallback);
    },
    CMD_MONITOR_MOUSE_END:function(msg,resultCallback){
        this._logger.trace("CMD_MONITOR_MOUSE_END called");
        this._dispatchMessageToAllBrowsers(msg, resultCallback);
    },
    invokeMethods: {
        BROWSER_GET_ACTIVE_TAB_FOR_BROWSER_FRAME_WND: function (msg, resultCallback) {

            // Merges RTID values of result browsers
            function dispatchResult(browserResultArr) {
                var returnMsg = Description.buildReturnMsg(msg._msgType, msg._to, browserResultArr, this._logger);
                delete returnMsg.status;

                resultCallback(returnMsg);
                return;
            }

            this._logger.trace("BROWSER_GET_ACTIVE_TAB_FOR_BROWSER_FRAME_WND: Started");

            Description.filterAOList(this._getTargetBrowsers(), { isActive: true }, function (candidateActiveBrowsersArr) {
                this._logger.trace("BROWSER_GET_ACTIVE_TAB_FOR_BROWSER_FRAME_WND.filterAOList: returned with " + candidateActiveBrowsersArr.length + " candidates");

                if (candidateActiveBrowsersArr.length <= 0) {
                    dispatchResult.call(this, candidateActiveBrowsersArr);
                    return;
                }

                var candidateBrowsersArr = [];
                var normalBrowsersArr = [];
                candidateActiveBrowsersArr.forEach(function (browser) {
                    if (browser._associatedTab && browser._associatedTab._emulatingDevice) {
                        candidateBrowsersArr.push(browser);
                    }
                    else {
                        normalBrowsersArr.push(browser);
                    }
                });
                // only filter the normal browsers with rect
                // the emulated browser has specific rect setting by debugger
                var filterProperties = {};
                if (!!msg._data.rect){
                    filterProperties.rect = msg._data.rect;
                }
                if (!!msg._data.width && !!msg._data.height) {
                    filterProperties.outerwidth = msg._data.width;
                    filterProperties.outerheight = msg._data.height;
                }

                function DoFurtherFilter(candidateNormalBrowsersArr, filterProperties){
                    if (candidateNormalBrowsersArr.length > 0) {
                        candidateBrowsersArr = candidateBrowsersArr.concat(candidateNormalBrowsersArr);
                    }

                    // return the candidates when we have 0 or 1 candidates and filter by rect, or title passed in is empty.
                    // For embedded browser who is filtered by outer width and outer height, continue to filter by title if it is not empty.
                    // Because there may be multiple samed sized windows at different location.
                    //
                    if (candidateBrowsersArr.length <= 1 && (!!filterProperties.rect || !msg._data.title)) {
                        dispatchResult.call(this, candidateBrowsersArr);
                        return;
                    }

                    this._logger.trace("BROWSER_GET_ACTIVE_TAB_FOR_BROWSER_FRAME_WND More than one candidate browser found by rect - let's try to find by name");
                    var browserTitle = msg._data.title.replace(" - Google Chrome", ""); // When title is short it might contain this suffix
                    browserTitle = browserTitle.replace(" - Mozilla Firefox", "");
                    browserTitle = browserTitle.replace(" - Microsoft Edge", "");
                    Description.filterAOList(candidateBrowsersArr, { title: browserTitle }, function (filteredBrowsersArr) {
                        if (filteredBrowsersArr.length === 0) {
                            this._logger.debug("BROWSER_GET_ACTIVE_TAB_FOR_BROWSER_FRAME_WND: No match found trying to see if the URL is the given title");
                            Description.filterAOList(candidateBrowsersArr, { "url no protocol": browserTitle }, dispatchResult.bind(this));
                            return;
                        }
                        dispatchResult(filteredBrowsersArr);
                    }.bind(this));
                }

                Description.filterAOList(normalBrowsersArr, filterProperties, function (candidateNormalBrowsersArr) {
                    if(candidateNormalBrowsersArr.length === 0 && filterProperties.outerwidth && filterProperties.outerheight){
                        //if outerwidth & outerheight mismatch , then turn to innerwidth & innerheight 
                        var filterPropertiesInner = {
                            innerwidth : msg._data["inner width"], 
                            innerheight : msg._data["inner height"]
                        };
                        if(filterPropertiesInner.innerwidth && filterPropertiesInner.innerheight){
                            Description.filterAOList(normalBrowsersArr, filterPropertiesInner, function(candidateNormalBrowsersArr){
                                DoFurtherFilter.call(this, candidateNormalBrowsersArr, filterPropertiesInner);
                            }.bind(this));
                            return;
                        }
                    }
                    DoFurtherFilter.call(this, candidateNormalBrowsersArr, filterProperties);
                }.bind(this));
            }.bind(this));
        },

        CALL_UPDATE_OF_ALL_FRAMES: function (msg, resultCallback) {
            this._logger.trace("CALL_UPDATE_OF_ALL_FRAMES: called");
            resultCallback(msg);
        }

    }, // of invokeMethods
    _mergeValue: function (msg, key, val) {
        if (msg._data[key]) {
            if (Util.isUndefined(msg._data[key].length))
                msg._data[key] = [[msg._data[key]]];
            msg._data[key][0] = msg._data[key][0].concat([val]);
        }
        else
            msg._data[key] = val;
    },

    _getTargetBrowsers: function () {
        var browserArr = [];
        Object.keys(this._knownTabs).forEach(function(tabId){
            var browser = this._knownTabs[tabId];
            if(browser)
                browserArr.push(browser);
        }.bind(this));
        return browserArr;
    },

    _dispatchMessageToAllBrowsers: function (msg, resultCallback) {
        this._logger.trace("_dispatchMessageToAllBrowsers: started");
        var logger = this._logger;

        //filters empty browsers from the array
        var targetBrowsers = this._getTargetBrowsers().filter(Util.identity);
        if (targetBrowsers.length === 0) {
            this._logger.info("_dispatchMessageToAllBrowsers: No Target browsers to dispatch message to, Returning.");
            resultCallback(msg);
            return;
        }

        this._dispatchMessageToBrowsers(msg, targetBrowsers, resultCallback);
    },

    _dispatchMessageToBrowsers:function(msg, browsers, resultCallback){
        this._logger.trace("_dispatchMessageToBrowsers: started");
        var logger = this._logger;
        if (browsers.length === 0) {
            resultCallback(msg);
            return;
        }
        var multiResponses = new MultipleResponses(browsers.length);
        browsers.forEach(function (browser) {
            this._logger.trace("onMessage: Requesting browser ", browser.getID());
            var browserMsg = new Msg(msg._msgType, browser.getID(), msg._data);
            browser.onMessage(browserMsg, multiResponses.callback(function (isDone, resultMsg) {

                mergeMessages(msg, resultMsg);

                if (!isDone)
                    return;

                logger.trace("_dispatchMessageToBrowsers: returned with message: ", msg);
                resultCallback(msg);

            }));
        },
		this);
    },

    UpdateKnownBrowsers: function () {
        this._logger.trace("UpdateKnownBrowsers: Called.");

        var filterKnownTabs = function (tabId) {
            return !this._knownTabs[tabId];
        };

        ext.app.getAllTabs(filterKnownTabs.bind(this), function (tabsArr) {
            this._logger.trace("UpdateKnownBrowsers: getAllTabs returned");
            tabsArr.forEach(function (tab) {
                this._logger.trace("UpdateKnownBrowsers: Creating browser for tabId = " + tab.id);
                this.createBrowser(tab);
            }.bind(this));

        }.bind(this));
    },
    //helper functions
    createBrowser: function (tab, openerTabId) {
        this._logger.info("createBrowser: called for tab Id: " + tab.id);

        if (this._knownTabs[tab.id]) {
            this._logger.info("createBrowser: We have already created browser for tab: " + tab.id);
            return;
        }

        var shouldConnect = ext.dispatcher.shouldConnectExternal();
        if (shouldConnect === "unsupported") {
            shouldConnect = !this.hasOpenedTabs() && !ext.dispatcher.isConnectPerformed;
        }
        
        if (shouldConnect) {
            this._logger.info("createBrowser: First time browser is created going to create the Testing Tools communication channel");
            ext.dispatcher.connect();
        }

        var browser = new Browser(tab);
        browser.onNewTestingToolId(this._onNewTestingToolId.bind(this));
        
        var windowTestingToolId = this._getTestingToolIdByWindowId(tab.windowId);
        if (!Util.isNullOrUndefined(windowTestingToolId))
            browser.setTestingToolId(windowTestingToolId);

        var openerTabtestingToolId = this._getOpenerTabTestingToolId(openerTabId);
        if (!Util.isNullOrUndefined(openerTabtestingToolId))
            browser.setTestingToolId(openerTabtestingToolId);
        
        this._knownTabs[tab.id] = browser;
        browser.onCreated();

        if (!Util.isNullOrUndefined(this._settings)) {
            var newSettingsMsg = new Msg("SRVC_SET_GLOBAL_VARIABLES_INTERNAL", this.getID(), this._settings);
            this._dispatchMessageToBrowsers(newSettingsMsg, [browser], function () {});
        }
    },
    destroyBrowser: function (tabId) {
        this._logger.info("destroyBrowser: called with tab Id: " + tabId);
        if ((!Util.isUndefined(this._knownTabs[tabId])) && (this._knownTabs[tabId] !== null)) {
            this._knownTabs[tabId].destroy();
            delete this._knownTabs[tabId];
        }
    },
    hasOpenedTabs: function () {
        var browserArr = this._getTargetBrowsers();
        return browserArr.length !== 0;
    },
    //event handlers
    onclientRegistered: function (client, registrationInfo, registrationResData) {
        this._logger.info("onclientRegistered: Started for client:\n", client, "\nregistrationInfo=\n", registrationInfo);
        var tabID = client.tabID;

        registrationResData.inspectionMode = this._inspectionMode;
        registrationResData.inspectionOptions = this._inspectionOptions;
        registrationResData.globalVariables = this._settings;
        registrationResData.eventConfig = this._eventConfigCache;
        registrationResData.ignoreBrowserDescription = ext.app.ignoreBrowserDescription ? true : false;

        if (!this._knownTabs[tabID]) {
            this._logger.debug("onclientRegistered: Got registration from unknown tab with id:" + tabID);
            registrationResData.status = "pending";
        }
    },

    _getTestingToolIdByWindowId: function (windowId) {
        var testingToolId = null;
        if (!Util.isNullOrUndefined(windowId))
            testingToolId = this._findTestingtoolIdbyWID(windowId);
        return testingToolId;
    },

    _getOpenerTabTestingToolId:function(openerTabId){
        var testingtoolId;
        if (!Util.isNullOrUndefined(openerTabId))
            testingtoolId = this._knownTabs[openerTabId].getTestingToolId();
        return testingtoolId;
    },

    _onTabCreated: function (tab, openerTabId) {
        this._logger.info("_onTabCreated: called for tab id: " + tab.id);
        this.createBrowser(tab, openerTabId);
    },

    _onTabUpdated: function(tabID, changeInfo) {
        this._logger.info("_onTabUpdated: called for tab id: " + tabID);
        var browser = this._knownTabs[tabID];
        if(browser) {
            browser.onUpdated(changeInfo);
        }
    },

    _onTabClosed: function (tabId) {
        this._logger.info("_onTabClosed: called for tab Id: " + tabId);
        this.destroyBrowser(tabId);
    },

    _onTabReplaced: function (newTabId, oldTabId) {
        this._logger.trace("_onTabReplaced: replacing tab " + oldTabId + " with tab " + newTabId);

        this._doInRecord(function () {
            this._browserRecorder.onTabReplaced(newTabId, oldTabId);
        });
    },

    _onReload: function (tabId) {
        this._logger.trace("_onReload: called for tab id: " + tabId);

        this._doInRecord(function () {
            this._browserRecorder.onReload(tabId);
        });
    },

    _onForward: function (tabId, isFrameNavigation) {
        this._logger.trace("_onReload: called for tab id: " + tabId);

        this._doInRecord(function () {
            this._browserRecorder.onForward(tabId, isFrameNavigation);
        });
    },

    _onBack: function (tabId, isFrameNavigation) {
        this._logger.trace("_onReload: called for tab id: " + tabId);

        this._doInRecord(function () {
            this._browserRecorder.onBack(tabId, isFrameNavigation);
        });
    },

    _onUserOpenedNewTab: function (openerTabId) {
        this._logger.trace("_onUserOpenedNewTab: called for opener tab id: " + openerTabId);

        this._doInRecord(function () {
            this._browserRecorder.onUserOpenedNewTab(openerTabId);
        });
    },

    _onUserClosedTab: function (tabId, removeInfo) {
        this._doInRecord(function () {
            this._browserRecorder.onUserClosedTab(tabId, removeInfo);
        });

        if (!Util.isNullOrUndefined(removeInfo) && !Util.isNullOrUndefined(removeInfo.isWindowClosing) && removeInfo.isWindowClosing && !Util.isNullOrUndefined(removeInfo.windowId)) {
            this._unRegisterTestingToolByWID(removeInfo.windowId);
        }  
    },

    CMD_BROWSER_RUN_ENDED: function (msg, resultCallback) {
        if (!Util.isNullOrUndefined(msg._data) && !Util.isNullOrUndefined(msg._data.processId) && ext.app.runEnded){
            var browsers = this._getTargetBrowsers().filter(function (browser) {
                return browser.getTestingToolId() === msg._data.processId;
            });
            if (browsers.length === 0)
                return resultCallback(msg);

            this._dispatchMessageToBrowsers(msg, browsers, function () { resultCallback(msg); });
        }
        else
        {
            if (ext.app.runEnded)
                ext.app.runEnded();

            resultCallback(msg);
        }
    },

    getID: function () {
        return { browser: -1, page: -1, frame: -1, object: null };
    },

    QUERY_IDS_TO_ATTRS: function (msg, resultCallback) {
        var ids = msg._data.WEB_PN_ID;
        //the WEB_PN_ID can either be [[id1,id2]] or single id or empty(null).
        if (Array.isArray(ids)) {
            ids = ids[0];
        } else if (ids !== null) {
            ids = [ids];
        }

        var prop;
        for (prop in msg._data) {
            if (prop !== "WEB_PN_ID") {
                // normally during JSON2WebInfo conversion,
                // "WEB_ATTR_NAME": ["val1", "val2", "val3"]
                // will become 
                // WEB_ATTR_NAME: WebAttrVal("val1")
                // WEB_ATTR_NAME: WebAttrVal("val2")
                // WEB_ATTR_NAME: WebAttrVal("val3")
                //
                // "WEB_ATTR_NAME": [["val1", "val2", "val3"]]
                // will become
                // WEB_ATTR_NAME: WebAttrVal("val1", "val2", "val3")
                //
                // usually, the second form is what we want when we need to return an array
                // 
                // but because of how we handle properties in _attr_names, if the result is
                // array, we will first get the values from the array to see if we need to
                // convert them to multiple values, which in effect reduces the dimension by one,
                // to compensate this, an extra dimension is necessary
                // please see the implementation of JSON2WebInfo for details.

                msg._data[prop] = [[[]]];
            }
        }
        // ids being null means qtp didn't find any matching object before this message,
        // we still need to initialize the return _data as above
        if (ids === null) {
            msg._data.WEB_PN_ID = [];
            resultCallback(msg);
            return;
        }

        //prepare the an object that holds the requested attributes
        var newData = {};
        for (prop in msg._data) {
            if (prop !== "WEB_PN_ID") {
                newData[prop] = null;
            }
        }

        var multiResponses = new MultipleResponses(ids.length);
        var multiResponsesCallback = multiResponses.callback(function (done, rtnMsg) {
            this._logger.trace("QUERY_IDS_TO_ATTRS: QUERY_ATTR message's callback invoked. All done: " + done);
            for (var prop in newData) {
                var val = rtnMsg._data[prop];
                if (Array.isArray(val)) {
                    // for properties like micclass, we need only the first entry
                    msg._data[prop][0][0].push(val[0]);
                } else {
                    msg._data[prop][0][0].push(val);
                }
            }

            if (!done)
                return;

            this._logger.trace("QUERY_IDS_TO_ATTRS: Finished quering all the runtids going to 'fix' the message rtids");

            if (Array.isArray(msg._data.WEB_PN_ID)) {
                // WEB_PN_ID need to be converted to multiple value, so we should make it one dimension
                msg._data.WEB_PN_ID = msg._data.WEB_PN_ID[0];
            }
            resultCallback(msg);
        }.bind(this));

        for (var i = 0; i < ids.length; i++) {
            var newMsg = new Msg(MSG_TYPES.QUERY, Util.shallowObjectClone(ids[i]), Util.shallowObjectClone(newData));
            ext.dispatcher.sendMessage(newMsg, null, "chrome", multiResponsesCallback);
        }
    },

    EVENT_INTERNAL_RECORD_BROWSER_INFO: function (msg) {
        if (!this._browserRecorder) {
            this._logger.warn("EVENT_INTERNAL_RECORD_BROWSER_INFO: BrowserRecorder is empty");
            return;
        }

        this._browserRecorder.onBrowserInformationReceived(msg._data.WEB_PN_ID[0][0].browser, msg._data);
    },

    _registerAppEvent: function (eventName, callback) {
        if (ext.app[eventName]) {
            ext.app[eventName](callback);
            this._logger.trace("registerAppEvent: Registered for '" + eventName + "' event.");
        }
        else {
            this._logger.info("registerAppEvent: Current Browser doesn't support the '" + eventName + "' event.");
        }
    },

    _doInRecord: function (func) {
        if (this._inspectionMode === "record") {
            Util.assert(this._browserRecorder, "_doInRecord: BrowserRecorder is empty during Recording", this._logger);
            func.call(this);
        }
    },

    _onNewTestingToolId: function (windowId, testingtoolId) {
        this._logger.trace("_onNewTestingToolId called windowId = ", windowId, ", testingtoolId = ", testingtoolId);
        this._registerTestingToolByWID(windowId, testingtoolId);
    },

    _findTestingtoolIdbyWID: function (windowId){
        var testingToolId = null;
        testingToolId = this._testingToolIdMap[windowId];
        
        return testingToolId;
    },

    _registerTestingToolByWID : function (windowId, testingToolId){
        var result = false;
        if (!Util.isNullOrUndefined(windowId) && !Util.isNullOrUndefined(testingToolId)) {
            if(Util.isNullOrUndefined(this._testingToolIdMap[windowId])){
                this._testingToolIdMap[windowId] = testingToolId;
                result = true;
            }
            else {
                if(this._testingToolIdMap[windowId] !== testingToolId)
                    this._logger.warn("registerTestingToolByWID:  one window is register different testingtool id.")
            }
           
        }
        return result;
    },

    _unRegisterTestingToolByWID : function (windowId){
        var result = false;
        if (!Util.isNullOrUndefined(windowId)) {
            delete this._testingToolIdMap[windowId];
            result = true;
        }
        return result;
    }
};