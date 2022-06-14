
/*
 *  To track the changes to the Extensions in each Chrome version, visit:
 *  http://code.google.com/chrome/extensions/whats_new.html
 */

var ChromeAPIUtil = {
    getLastError: function() {
        if (typeof(chrome) === "undefined")
            return undefined;
        
        if(chrome && chrome.runtime && chrome.runtime.lastError)
            return chrome.runtime.lastError;

        if(chrome && chrome.extension && chrome.extension.lastError)
            return chrome.extension.lastError;

        return undefined;
    }
};

function ChromeAPI() {
    this._logger = new LoggerUtil("ChromeAPI");
    this._logger.trace("ChromeAPI created.");

    this._init(true);
}

ChromeAPI.prototype = {
    _logger: null,
    _listeners: null,
    _knownTabs: null,
    _pendingNavigations: null, // Information about navigations we may want to record (tabId => {url, committed})
    _historyTracker: null,
    _dialogHandler: null,
    _duringRun: false,
    _tabActivationSynchronizer: null,

    _init: function (withDialogHandler) {
        this._listeners = {};
        this._knownTabs = {};

        this._pendingNavigations = {};
        this._tabActivationSynchronizer = new TabActivationSynchronizer();

        chrome.tabs.onCreated.addListener(this._onTabCreated.bind(this));
        chrome.tabs.onRemoved.addListener(this._onTabClosed.bind(this));
        chrome.tabs.onUpdated.addListener(this._onTabUpdated.bind(this));

        chrome.windows.onCreated.addListener(this._onWindowCreated.bind(this));
        chrome.windows.onRemoved.addListener(this._onWindowRemoved.bind(this));

        if (chrome.tabs.onReplaced) { // supported since chrome 26
            chrome.tabs.onReplaced.addListener(this._onTabReplacedByAnother.bind(this));
        }
        chrome.webNavigation.onBeforeNavigate.addListener(this._onBeforeNavigate.bind(this));
        chrome.webNavigation.onCommitted.addListener(this._onNavigationCommited.bind(this));

        if (chrome.webRequest) { // supported since Chrome 17
            chrome.webRequest.onHeadersReceived.addListener(this._onHeadersReceived.bind(this),
                { urls: ["http://*/*", "https://*/*"] },
                ["blocking", "responseHeaders"]);
        }

        this._historyTracker = new HistoryTracker();
        this._historyTracker.onBack(this._onBack.bind(this));
        this._historyTracker.onForward(this._onForward.bind(this));

        if (withDialogHandler) {
            this._dialogHandler = new DialogHandler();
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

    onTabUpdated: function(callbackFunction) {
        this._listeners["tab updated"] = callbackFunction;
    },

    onUserClosedTab: function (callbackFunction) {
        this._listeners["user closed tab"] = callbackFunction;
    },

    getAllTabs: function (tabIdFilter, callbackFunction) {
        //gets all the known chrome windows and for each one of them
        //gets its known tabs and create Browser AO from it.
        chrome.windows.getAll({ populate: true }, (function (windowsArr) {
            var tabsArr = [];
            for (var i = 0; i < windowsArr.length; ++i) {
                for (var j = 0; j < windowsArr[i].tabs.length; ++j) {
                    // Ignore the developer tools window
                    if (windowsArr[i].type === "normal" || windowsArr[i].type === "app" || this._isNormalPopupDialog(windowsArr[i])) {
                        // Adds the tab in one of 2 cases:
                        // 1- No filter function passed
                        // 2- Tab passed the filter
                        if (!tabIdFilter || tabIdFilter(windowsArr[i].tabs[j].id)) {
                            tabsArr.push(this.createTab(windowsArr[i].tabs[j]));
                        }
                    }
                }
            }
            callbackFunction(tabsArr);
        }).bind(this));
    },
    deleteCookies: function (domain, finishedCallback) {

        if (!domain)
            domain = "";

        chrome.cookies.getAll({}, function (cookies) {
            cookies.forEach(function (cookie) {
                if (cookie.domain.indexOf(domain) === -1)
                    return;

                // Extrapolate the URL from the cookie
                var url = cookie.secure ? "https://" : "http://";
                if (cookie.domain.charAt(0) === ".")
                    url += "www";

                url += cookie.domain + cookie.path;

                chrome.cookies.remove({ url: url, name: cookie.name });
            });

            if (finishedCallback)
                finishedCallback();
        });
    },

    clearCache: function (finishedCallback) {
        var timePeriod = { "since": 0 };
        var dataToRemove = { "cache": true, "appcache": true };
        if (chrome.browsingData) {
            // since Chrome 19
            chrome.browsingData.remove(timePeriod, dataToRemove, finishedCallback);
        } else if (chrome.experimental && chrome.experimental.clear && chrome.experimental.clear.browsingData) {
            // old API
            chrome.experimental.clear.browsingData(timePeriod, dataToRemove, finishedCallback);
        } else {
            this._logger.error("Clear cache is not supportted since the Chrome version is too old.");
            ErrorReporter.ThrowGeneralError();
        }
    },

    createTab: function (browserTab) {
        this._logger.trace("createTab: started for Chrome tab id: " + browserTab.id);
        var tab;
        InitChromeBackwardCompatibility(browserTab);
        tab = new ChromeTab(this._tabActivationSynchronizer);

        tab.id = browserTab.id;
        tab.windowId = browserTab.windowId;
        
        this._knownTabs[tab.id] = tab;
        if (this._duringRun)
            this._addTabsToHandler([tab.id]);

        return tab;
    },

    //Update the emulation status on app. The dialog handler will detach debugger when end replay which we did not expect to happen for emulated browser.
    //The real emulation was done in Chrome tab.
    updateEmulationStatu: function (chromeTab, emulationSettings, successCallback, failedCallback) {
        var successFunc = function() {
            this._dialogHandler.emulateDevice(chromeTab.id);
            successCallback();
        }

        chromeTab.emulateDevice(emulationSettings, successFunc.bind(this), failedCallback);
	},

    createComChannel: function () {
        return new ChromeComChannel();
    },

    createExternalComChannel: function () {
        if (!Util.isNullOrUndefined(Util.getAgentNPObj())) {
            this._logger.info("Create native NPAPI communication channel for legacy extension!");
            return new NPComChannel();
        }

        return new ExternalComChannel({
            _createInnerChannel: function(){
                return new GroupedComChannel(new WebSocketComChannel(), new NativeMessagingComChannel());
            }
        });
    },

    runStarted: function () {
        this._duringRun = true;
        this._addTabsToHandler(Object.keys(this._knownTabs));
    },

    runEnded: function () {
        if (this._dialogHandler) {
            this._dialogHandler.detachAllTabs();
        }
        this._duringRun = false;
    },

    browserRunEnded: function(tab){
        if (this._dialogHandler)
            this._duringRun = this._dialogHandler.detachTab(tab.id);
        else
            this._duringRun = false;

        tab.detach();
    },

    getSettingValue: function (key) {
        if (key === "UFT_daemonPort") {
            return window.localStorage[key] || "8824";
        }
        return window.localStorage[key];
    },

    getLogSettingsObject: function () {
        return window.localStorage;
    },

    _addTabsToHandler: function (tabs) {
        if (this._dialogHandler) {
            this._dialogHandler.addTabs(tabs);
        }
        tabs.forEach(function (id) {
            if (this._knownTabs[id])
                this._knownTabs[id].attach();
        }, this);
    },

    _onWindowCreated: function (win) {
        this._logger.info("_onWindowCreated: newWindow", win && win.id);
        if (!chrome.tabs.query) {
            this._logger.info("_onWindowCreated: chrome.tabs.query is not supported");
            return;
        }
        chrome.tabs.query({ "windowId": win.id }, function (tabs) {
            var lastError = ChromeAPIUtil.getLastError();
            if (lastError) {
                this._logger.warn("_onWindowCreated: error while query tabs with window id [", win.id, "], error: ", lastError);
                return;
            }
            if (Util.isNullOrUndefined(tabs) || tabs.length <= 0) {
                this._logger.debug("_onWindowCreated: get empty tabs with window id [", win.id, "], tabs: ", tabs);
                return;
            }
            tabs.forEach(function (tab) {
                if (this._knownTabs[tab.id]) {
                    this._knownTabs[tab.id].windowId = tab.windowId;
                }
            }.bind(this));
        }.bind(this));
    },

    _onWindowRemoved: function (windowId) {
        this._logger.info("_onWindowRemoved: windowId", windowId);
    },
    
    _onTabCreated: function (chromeTab) {
        this._logger.info("_onTabCreated tab:", chromeTab.id, " on window", chromeTab.windowId);
        this._dispatchTabCreate(chromeTab);
    },

    _onTabUpdated: function (tabId, changeInfo, chromeTab) {
        if (this._duringRun && changeInfo.url) {
            // Since we cannot attach to chrome:// URLs, we try to attach for every navigation
            this._addTabsToHandler([tabId]);
        }
        if(this._listeners["tab updated"]) {
            this._listeners["tab updated"](tabId, changeInfo);
        }
    },

    _dispatchTabCreate: function (chromeTab) {
        chrome.windows.get(chromeTab.windowId, { populate: true }, (function (win) {
            if (chrome.extension.lastError) {
                this._logger.error("_dispatchTabCreate: error while getting window id [" + chromeTab.windowId + "]: " + chrome.extension.lastError);
                return;
            }

            if (!win) {
                this._logger.info("_dispatchTabCreate: received window id " + chromeTab.windowId);
                return;
            }

            if (win.type === "normal" || win.type === "app" || this._isNormalPopupDialog(win)) {
                this._dispatchUserOpenedNewTab(chromeTab);
                var browserTab = this.createTab(chromeTab);
                if (this._listeners["tab created"])
                    this._listeners["tab created"](browserTab, chromeTab.openerTabId);

                this._recordPendingNavigation(browserTab.id, 'tabCreated');
            }
        }.bind(this)));
    },
    _dispatchUserOpenedNewTab: function (chromeTab) {
        this._logger.trace("_dispatchUserOpenedNewTab: called with Tab info: ", chromeTab);
        if (((chromeTab.pendingUrl || chromeTab.url).indexOf("chrome://") !== 0 &&  // This tab wasn't opened by the user
            (chromeTab.pendingUrl || chromeTab.url).indexOf("edge://") !== 0) ||
            Util.isNullOrUndefined(chromeTab.openerTabId)) // Tab wasn't opened from another tab, we have nothing to record on
            return; // Do nothing.
        this._notifyNewTabOpened(chromeTab);
    },
    _notifyNewTabOpened: function (chromeTab, openerTabId) {
        if (openerTabId) {
            chromeTab.openerTabId = openerTabId;
        }
        if (this._listeners["user opened new tab"])
            this._listeners["user opened new tab"](chromeTab.openerTabId);
    },
    _dispatchTabClosedByUser: function (tabId, removeInfo) {
        if (this._listeners["user closed tab"])
            this._listeners["user closed tab"](tabId, removeInfo);
    },
    _dispatchTabClosed: function (tabId, removeInfo) {
         if (this._listeners["tab closed"])
            this._listeners["tab closed"](tabId);

        delete this._knownTabs[tabId];
        delete this._pendingNavigations[tabId];
    },
    _onTabClosed: function (tabId, removeInfo) {
        if (!Util.isNullOrUndefined(removeInfo) && Util.isNullOrUndefined(removeInfo.windowId))
            removeInfo.windowId = this._knownTabs[tabId].windowId;

        this._dispatchTabClosedByUser(tabId, removeInfo);
        this._dispatchTabClosed(tabId, removeInfo);
    },
    onTabReplaced: function (callbackFunction) {
        if (this._listeners["tab replaced"])
            this._logger.warn("onTabReplaced: overriding an existing listener");
        this._listeners["tab replaced"] = callbackFunction;
    },
    _onTabReplacedByAnother: function (newTabID, oldTabID) {
        this._logger.info("_onTabReplacedByAnother: tab with id " + oldTabID + " is replaced with tab id " + newTabID);

        if (this._listeners["tab replaced"])
            this._listeners["tab replaced"](newTabID, oldTabID);

        //calls the remove function of the listeners
        if (this._listeners["tab closed"])
            this._listeners["tab closed"](oldTabID, {});

        //this event usually means that a prediction tab has replaced an original tab so we need to update the windowId of the tab since it was updated.
        chrome.tabs.get(newTabID, (function (tab) {
            if (this._knownTabs[tab.id]) {
                this._logger.info("_onTabReplacedByAnother: Going to update tab with id=" + tab.id + " with old window id:" + this._knownTabs[tab.id].windowId + " to id=" + tab.windowId);
                this._knownTabs[newTabID].windowId = tab.windowId;

                this._recordPendingNavigation(tab.id, 'TabReplaced');
            }
            else {
                this._logger.info("_onTabReplacedByAnother: This is a new tab going to notify about tab creation");
                this._dispatchTabCreate(tab);
            }
        }).bind(this));

    },
    _onBeforeNavigate: function (args) {
        if (args.frameId !== 0)
            return; // sub-frame

        this._logger.trace('webNavigation.BeforeNavigate - tab ' + args.tabId + ' navigating to: ' + args.url);
        this._pendingNavigations[args.tabId] = { url: args.url, committed: false };
    },
    _onNavigationCommited: function (args) {
        if (args.frameId !== 0)
            return; // sub-frame

        var tabId = args.tabId;

        if (args.transitionQualifiers) {
            if (args.transitionQualifiers.indexOf('from_address_bar') !== -1 &&
                // Forward/Back reuses the original qualifiers so we may get a false positive here
                args.transitionQualifiers.indexOf('forward_back') === -1) {
                return this._onNavigationCommitedFromAddressBar(tabId);
            }
            else if ((args.transitionQualifiers.length === 0) && (args.transitionType === "reload")) {
                return this._dispatchReloadEvent(tabId);
            }
        }
    },

    _onNavigationCommitedFromAddressBar: function (tabId) {
        this._logger.trace('_onNavigationCommitedFromAddressBar: called with tabId: ' + tabId);

        if (!this._pendingNavigations[tabId]) {
            this._logger.warn('Got Committed on unknown tab: ' + tabId);
            return;
        }

        if (this._knownTabs[tabId]) {
            if (tabId == 2 && this._pendingNavigations[tabId].url == "about:newtab") { // Handle second tab's url of webextension specially.
                // The first time _onBeforeNavigate is called, _pendingNavigations[2].url is "about:newtab" which will be recorded as Navigate wrong.
                // Only when _onBeforeNavigate is called secondly, the acutal url we navigate to will be gotten. So here wait for it to be changed right.
                Util.setTimeout(function () {
                    this._dispatchAddressBarNavigationCommittedEvent(tabId, 'Committed');
                }.bind(this), 200);
                return;
            }

            this._dispatchAddressBarNavigationCommittedEvent(tabId, 'Committed');
        }
        else {
            this._logger.trace('webNavigation.Committed on unknown tab: ' + tabId);
            this._pendingNavigations[tabId].committed = true;
        }
    },

    // Record a navigation if there is a pending navigation to record
    _recordPendingNavigation: function (tabId, txt) {
        if (this._pendingNavigations[tabId] && this._pendingNavigations[tabId].committed)
            this._dispatchAddressBarNavigationCommittedEvent(tabId, txt);
    },

    _isNormalPopupDialog: function (win) {
        if (win.type === "popup" && !Util.isNullOrUndefined(win.tabs)) {
            //check the first tab of the window url contians "chrome-devtool", only devtool contians this prefix.
            if (win.tabs[0].url.indexOf("chrome-devtools://") === -1)
                return true;
        }
        return false;
    },

    _dispatchAddressBarNavigationCommittedEvent: function (tabId, txt) {
        Util.assert(this._pendingNavigations[tabId] && this._pendingNavigations[tabId].url, "_dispatchAddressBarNavigationCommittedEvent: No pending navigation for tab Id: " + tabId + "(" + txt + ")", this._logger);
        this._logger.trace("_dispatchAddressBarNavigationCommittedEvent: started '" + txt + "' Recording: " + tabId + " (" + this._knownTabs[tabId].windowId + ") Navigate: " + this._pendingNavigations[tabId].url);

        try {
            var url = this._pendingNavigations[tabId].url;
            delete this._pendingNavigations[tabId];

            if (this._listeners["addressbar navigation"])
                this._listeners["addressbar navigation"](tabId, url);
        }
        catch (e) {
            this._logger.error("_dispatchAddressBarNavigationCommittedEvent: Got Exception:" + e + " Details: " + (e.Details || "No details found in exception") + "\nStack:" + e.stack);
        }
    },

    onAddressBarNavigation: function (callbackFunction) {
        if (this._listeners["addressbar navigation"])
            this._logger.warn("onAddressBarNavigation: overriding an existing listener");
        this._listeners["addressbar navigation"] = callbackFunction;
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

    handleDialog: function (tabId, accept, text, success, failure) {
        this._logger.trace("handleDialog called");
        this._dialogHandler.handle(tabId, accept, text, success, failure);
    },

    dialogExists: function (tabId, succeeded, failed) {
        this._logger.trace("dialogExists called");
        this._dialogHandler.exists(tabId, succeeded, failed);
    },

    getDialogText: function (tabId, succeeded, failed) {
        this._logger.trace("getDialogText called");
        this._dialogHandler.text(tabId, succeeded, failed);
    },

    _dispatchEventWithTabId: function (eventName, tabId, isFrameEvent) {
        this._logger.trace("_dispatchEventWithTabId: called for: " + eventName);
        try {
            if (this._listeners[eventName])
                this._listeners[eventName](tabId, isFrameEvent);
        }
        catch (e) {
            this._logger.error("_dispatchEventWithTabId: (" + eventName + ") Got Exception:" + e + " Details: " + (e.Details || "No details found in exception") + "\nStack:" + e.stack);
        }
    },

    _dispatchReloadEvent: function (tabId) {
        this._dispatchEventWithTabId('reload', tabId);
    },

    _onBack: function (tabId, isFrameEvent) {
        this._dispatchEventWithTabId('back', tabId, isFrameEvent);
    },

    _onForward: function (tabId, isFrameEvent) {
        this._dispatchEventWithTabId('forward', tabId, isFrameEvent);
    },

    /*
      web request's onHeadersReceived listener, hack the content security policy to append 'nonce' attribute
      with specific value, so the <script> node (we injected to page) with same nonce attribute are allowed to execute.
      REF: https://w3c.github.io/webappsec/specs/content-security-policy/#script-src-nonce-usage
    */
    _onHeadersReceived: function (e) {
        this._logger.trace("_onHeadersReceived - start");
        var replaced;
        e.responseHeaders.forEach(function (head) {
            if (isCspHeader(head.name.toUpperCase())) {
                var cspList = head.value && head.value.split(';');
                if (Util.isNullOrUndefined(cspList)) {
                    return;
                }
                for (var i = 0; i < cspList.length; i++) {
                    var csp = cspList[i];
                    if (Util.isNullOrUndefined(csp) || !csp.trim().startsWith("script-src")) {
                        continue;
                    }
                    // Mozilla Firefox will merge multi 'nonce-XXX' and it cause the script eval/append failure, so just ignore it here
                    if (Util.browserApplicationVersion(this._logger).startsWith("Mozilla Firefox") && csp.indexOf('nonce-') >= 0) {
                        continue;
                    }
                    // append "nonce-UftNonceMagicAllowInlineScript" to whitelist our injected script later, if there is no 'unsafe-inline'
                    // or there is any existing nonce.
                    // 'nonce' will make 'unsafe-inline' being ignored, and with 'unsafe-inline' soley our inline script is good to run.
                    if (csp.indexOf("unsafe-inline") < 0 || csp.indexOf('nonce-') >= 0 ||
                        csp.indexOf("chrome-extension: 'unsafe-inline'") >= 0) { // To solve CSP issue of developer.salesforce.com which contains chrome-extension: 'unsafe-inline' instead of unsafe-inline
                        this._logger.trace("original csp value:" + csp);
                        csp = csp.replace('script-src', "script-src 'nonce-UftNonceMagicAllowInlineScript'");
                        this._logger.trace("replaced csp value:" + csp);
                        cspList[i] = csp;
                        replaced = true;
                    }
                }
                if (replaced) {
                    this._logger.trace("original header value:" + head.value);
                    head.value = cspList.join(';');
                    this._logger.trace("replaced header value:" + head.value);
                }
            }
        }.bind(this));

        this._logger.trace("_onHeadersReceived - end");
        if (replaced) {
            // Return the new HTTP response headers
            return {
                responseHeaders: e.responseHeaders
            };
        }

        function isCspHeader(headerName) {
            return (headerName == 'CONTENT-SECURITY-POLICY') || (headerName == 'X-WEBKIT-CSP');
        }
    },

    supportActiveScreen: true
};

///////////////////////////////

function ChromeTab(tabActivationSynchronizer) {
    this._logger = new LoggerUtil("ChromeTab");
    this._logger.trace("ChromeTab created.");
    this._fullScreenNextWindowState = "fullscreen";
    this._tabActivationSynchronizer = tabActivationSynchronizer;
}

ChromeTab.prototype = {
    id: -1,
    windowId: -1,
    window: null,
    isEmulatingDevice: false,
    isEmulatedDeviceTouchEnabled: false,
    _logger: null,
    _fullScreenNextWindowState: null,
    _tabActivationSynchronizer: null,
    _attached: false,

    getTabProperty:function(attrName, successCallback, failCallback){
        var logger = this._logger;
        logger.trace("ChromeTab.getTabProperty started for tab id " , this.id);
        chrome.tabs.get(this.id, (function (callback, errCallback, tab) {
            try {
                if (!Util.isUndefined(chrome.extension.lastError)) {
                    logger.warn("getTabProperty: trying to get name of unknown tab: " , this.id);
                    errCallback("tab doesnt exist");
                    return;
                }
                switch(attrName){
                    case "logical name":
                        var logicalName = tab.title ? tab.title : "";
                        logger.trace("Tab.getTabProperty finished with logical name:" , logicalName);
                        callback(logicalName);
                        break;

                    case "name":
                    case "title":
                        var val = tab.title || tab.url;
                        if(val){
                            logger.trace("Tab.getTabProperty finished with title or url:" , val);
                            callback(val);
                        } else {
                            errCallback("tab title and url is empty!");
                        }
                        break;
                    
                    case "url":
                        var url = tab.url ? tab.url.replace(/\/$/, "") : "";
                        logger.trace("Tab.getTabProperty finished with url: ", url);
                        callback(url);
                        break;

                    default:
                        logger.error("Tab.getTabProperty don't support query attrName:" , attrName);
                        errCallback("not supported property");
                        break;
                }//end switch
            }
            catch (e) {
                logger.error("Tab.getTabProperty: error occured - invoke error callback. Error: ", e, "\nStack:" , e.stack);
                errCallback("ERROR");
            }
        }).bind(this, successCallback, failCallback));
    },
    getState: function (successCallback, failCallback) {
        var logger = this._logger;
        logger.trace("ChromeTab.getState started for tab id " + this.id);
        chrome.tabs.get(this.id, (function (callback, errCallback, tab) {
            try {
                if (!Util.isNullOrUndefined(chrome.extension.lastError)) {
                    logger.warn("getState: trying to get state of unknown tab: " + this.id);
                    var errorMsg = "tab doesnt exist";
                    errCallback(errorMsg);
                    return;
                }

                logger.trace("Tab.getState finished with status=" + tab.status);
                if (tab.status === "complete") {
                    callback(ReadyState2Status.complete);
                }
                else {
                    callback(ReadyState2Status.loading);
                }
            }
            catch (e) {
                logger.error("Tab.getState: error occured - invoke error callback. Error: " + e + "\nStack:" + e.stack);
                errCallback("ERROR");
            }
        }).bind(this, successCallback, failCallback));
    },

    // Get the original chrome tab status
    //https://developer.chrome.com/docs/extensions/reference/tabs/#type-TabStatus
    getTabState: function (successCallback, failCallback) {
        var logger = this._logger;
        logger.trace("ChromeTab.getTabState started for tab id " + this.id);
        chrome.tabs.get(this.id, (function (callback, errCallback, tab) {
            try {
                if (!Util.isNullOrUndefined(chrome.extension.lastError)) {
                    logger.warn("getTabState: trying to get state of unknown tab: " + this.id);
                    var errorMsg = "tab doesnt exist";
                    errCallback(errorMsg);
                    return;
                }

                logger.trace("Tab.getTabState finished with status=" + tab.status);
                callback(tab.status);
            }
            catch (e) {
                logger.error("Tab.getTabState: error occured - invoke error callback. Error: " + e + "\nStack:" + e.stack);
                errCallback("ERROR");
            }
        }).bind(this, successCallback, failCallback));
    },

    getNumberOfTabs: function (successCallback, failCallback) {
        this._logger.trace("ChromeTab.getNumberOfTabs started");
        chrome.windows.getAll({ "populate": true }, (function (callback, errCallback, windows) {
            try {
                if (!Util.isNullOrUndefined(chrome.extension.lastError)) {
                    this._logger.error("ChromeTab.getNumberOfTabs: chrome.windows.getAll failed.");
                    errCallback(chrome.extension.lastError);
                    return;
                }
                this._logger.trace("getNumberOfTabs: received chrome.windows.getAll response");
                var currentWindowId = this.windowId;
                var windowFound = false;
                windows.forEach(function (win) {
                    if (win.id === currentWindowId) {
                        windowFound = true;
                        callback(win.tabs.length);
                    }
                });
                if (!windowFound) {
                    this._logger.warn("ChromeTab.getNumberOfTabs: window not found, call back with 0.");
                    callback(0);
                }
            }
            catch (e) {
                this._logger.error("getNumberOfTabs: error occured - invoke error callback. Error: " + e + "\nStack:" + e.stack);
                errCallback("ERROR");
            }
        }).bind(this, successCallback, failCallback));
    },

    isActive: function (successCallback, failCallback) {
        this._logger.trace("ChromeTab.isActive started for window:" + this.windowId + " and tab:" + this.id);
        chrome.tabs.query({ 'active': true, 'windowId': this.windowId }, (function (callback, errCallback, tabArr) {
            this._logger.trace("ChromeTab.isActive response for window:" + this.windowId + " and tab:" + this.id);
            try {
                if (!Util.isNullOrUndefined(chrome.extension.lastError)) {
                    this._logger.error("ChromeTab.isActive : chrome.tabs.query failed. with error: " + chrome.extension.lastError);
                    errCallback(chrome.extension.lastError);
                    return;
                }
                if (tabArr.length !== 1) {
                    this._logger.error("ChromeTab.isActive : chrome.tabs.query failed, tabArr length is " + tabArr.length);
                    errCallback("received active tabs number which is not 1");
                    return;
                }

                var activeTab = tabArr[0]; // there is ONLY ONE selected tab per window
                successCallback(activeTab.id === this.id);
            }
            catch (e) {
                this._logger.error("ChromeTab.isActive: error occured - invoke error callback. Error: " + e + "\nStack:" + e.stack);
                errCallback("ERROR");
            }
        }).bind(this, successCallback, failCallback));
    },

    navigate: function (url, headers, successCallback, failCallback) {
        // headers: a:b
        if (typeof (headers) === "string" && headers.length > 0 && headers.indexOf(':') > 0) {
            var updateRequestHeader = function (request) {
                var index = headers.indexOf(':');
                var headerKey = headers.slice(0, index);
                var headerVal = headers.slice(index + 1);
                request.requestHeaders.push({
                    name: headerKey,
                    value: headerVal
                });
                return {
                    requestHeaders: request.requestHeaders
                };
            };
            // change the headers before send headers
            chrome.webRequest.onBeforeSendHeaders.addListener(updateRequestHeader, {
                    urls: ["http://*/*", "https://*/*"]
                },
                ['blocking', 'requestHeaders']
            );
            // remove the listeners after navigation completed
            var removeUpdateRequestHeaderListener = function () {
                chrome.webRequest.onBeforeSendHeaders.removeListener(updateRequestHeader);
                chrome.webNavigation.onCompleted.removeListener(removeUpdateRequestHeaderListener);
            }
            chrome.webNavigation.onCompleted.addListener(removeUpdateRequestHeaderListener);
        }

        chrome.tabs.update(this.id, { url: url, active: true }, (function (callback, errCallback, tab) {
            try {
                if (!Util.isNullOrUndefined(chrome.extension.lastError)) {
                    this._logger.error("ChromeTab.navigate : chrome.tabs.update failed, message = ", chrome.extension.lastError.message);
                    if (errCallback) {
                        if (chrome.extension.lastError.message.startsWith("Illegal URL:")) {
                            errCallback("Illegal URL");
                        }
                        else {
                            errCallback("tab doesnt exist");
                        }
                    }
                    return;
                }
                else {
                    callback();
                }
            }
            catch (e) {
                this._logger.error("ChromeTab.navigate: error occured - invoke error callback. Error: " + e + "\nStack:" + e.stack);
                errCallback("ERROR");
            }
        }).bind(this, successCallback, failCallback));
    },

    select: function (successCallback, failCallback) {
        this._logger.trace("ChromeTab.select started");
        chrome.windows.update(this.windowId, {focused:true}); //bring window to front
        this.selectTab(successCallback, failCallback);
    },

    selectTab:function(successCallback,failCallback){
        this._logger.trace("ChromeTab.selectTab started");
        this._tabActivationSynchronizer.synchronize(this._activate.bind(this), successCallback, failCallback);
    },

    _activate: function (successCallback, failCallback) {
        chrome.tabs.update(this.id, { active: true }, this.getCheckErrorChromeApiCallbac(successCallback, failCallback));
    },

    fullScreen: function (successCallback, failCallback, fullScreenMode) {
        var nextWindowState = this._fullScreenNextWindowState;
        this._getWindow(this.windowId, { populate: true }, function (win) {
            if (chrome.extension.lastError) {
                this._logger.error("fullScreen: error while retrieving window id: " + this.windowId + " : " + chrome.extension.lastError);
                failCallback(chrome.extension.lastError);
                return;
            }

            var previousWindowState = win.state;

            if(fullScreenMode===0 && win.state!=="fullscreen" || 
               fullScreenMode===1 && win.state==="fullscreen"){
                successCallback();
                return;
            }

            if(fullScreenMode == 0 && nextWindowState === "fullscreen")
            {
                nextWindowState = "normal";
            }
            else if(fullScreenMode == 1)
            {
                nextWindowState = "fullscreen";
            }

            chrome.windows.update(this.windowId, { state: nextWindowState }, function () {
                if (chrome.extension.lastError) {
                    this._logger.error("fullScreen: error while settings browser to fullscreen: " + chrome.extension.lastError);
                    failCallback(chrome.extension.lastError);
                    return;
                }
                this._fullScreenNextWindowState = previousWindowState;
                successCallback();
            }.bind(this));
        }.bind(this));
    },

    minimize: function (successCallback, failCallback) {
        this._updateWindow({ state: "minimized" }, successCallback, failCallback);
    },

    restore: function (successCallback, failCallback) {
        this._updateWindow({ state: "normal" }, successCallback, failCallback);
    },

    maximize: function (successCallback, failCallback) {
        this._updateWindow({ state: "maximized" }, successCallback, failCallback);
    },

    createNewTab: function () {
        this._logger.trace("ChromeTab.select started");
        chrome.tabs.create({ active: true });
    },

    close: function (successCallback, failCallback) {
        this._logger.trace("ChromeTab.close started for tab " + this.id);

        chrome.tabs.get(this.id, function (tabData) {
            try {
                if (!Util.isNullOrUndefined(chrome.extension.lastError)) {
                    this._logger.error("ChromeTab.close failed for tab " + this.id);
                    failCallback("tab doesnt exist");
                    return;
                }

                var tabId = this.id;
                Util.setTimeout(function () {
                    chrome.tabs.remove(tabId, Util.identity);
                }, 0);

                // Workaround. The successCallback should be called from the remove's callback
                // but the callback is not being called when there is only one tab (and browser closes)
                // So as a workaround we will call the callback immediately after calling the remove method
                this._logger.trace("ChromeTab.close succeeded for tab: " + this.id);
                successCallback();
            }
            catch (e) {
                this._logger.error("ChromeTab.close: error occured - invoke error callback. Error: " + e + "\nStack:" + e.stack);
                failCallback("ERROR");
            }
        }.bind(this));
    },

    closeWindow: function (successCallback, failCallback) {
        this._logger.trace("closeWindow started for tab ", this.id);

        chrome.tabs.get(this.id, function (tabData) {
            try {
                if (!Util.isNullOrUndefined(chrome.extension.lastError)) {
                    this._logger.error("closeWindow failed for tab ", this.id);
                    failCallback("tab doesnt exist");
                    return;
                }

                var windowId = this.windowId;
                Util.setTimeout(function () {
                    chrome.windows.remove(windowId, Util.identity);
                }, 0);

                // Workaround. The successCallback should be called from the remove's callback
                // but the callback is not being called when window is closed.
                // So as a workaround we will call the callback immediately after calling the remove method
                this._logger.trace("closeWindow succeeded for tab: ", this.id);
                successCallback();
            }
            catch (e) {
                this._logger.error("closeWindow: error occured - invoke error callback. Error: ", e);
                failCallback("ERROR");
            }
        }.bind(this));
    },

    getWindowRect: function (successCallback, failCallback) {
        this._logger.trace("ChromeTab.getWindowRect called for tab: " + this.id);
        this._getWindow(this.windowId, null, function (wnd) {
            try {
                if (!Util.isNullOrUndefined(chrome.extension.lastError)) {
                    this._logger.error("ChromeTab.getWindowRect : chrome.windows.get on window=", this.windowId, " and tab id", this.id, " failed. with error: ", chrome.extension.lastError);
                    failCallback(chrome.extension.lastError);
                    return;
                }

                var rect = { top: Math.floor(wnd.top * window.devicePixelRatio), left: Math.floor(wnd.left * window.devicePixelRatio), right: Math.floor((wnd.left + wnd.width) * window.devicePixelRatio), bottom: Math.floor((wnd.top + wnd.height) * window.devicePixelRatio) };
                this._logger.trace("ChromeTab.getWindowRect succeeded - returning result: ", rect);
                successCallback(rect);
            }
            catch (e) {
                this._logger.error("ChromeTab.getWindowRect: error occured - invoke error callback. Error: " + e + "\nStack:" + e.stack);
                failCallback("ERROR");
            }
        }.bind(this));
    },

    captureTabVisibleArea: function (format,successCallback, failCallback) {
        chrome.tabs.captureVisibleTab(this.windowId, { format: format}, (function (dataURI) {
            try {
                if (!Util.isNullOrUndefined(chrome.extension.lastError)) {
                    this._logger.error("ChromeTab.captureTabVisibleArea failed for tab #", this.id);
                    chrome.tabs.get(this.id, function (tab) {
                        if (!!tab) {
                            failCallback("failed to capture snapshot");
                        } else {
                            failCallback("tab doesnt exist")
                        }
                    });
                    return;
                }

                successCallback(dataURI);
            }
            catch (e) {
                this._logger.error("captureTabVisibleArea: Got exception ", e);
                failCallback("ERROR");
            }
        }).bind(this));
    },

    reload: function (successCallback, failCallback) {
        chrome.tabs.reload(this.id, null, function (res) {
            try {
                if (!Util.isNullOrUndefined(chrome.extension.lastError)) {
                    this._logger.error("ChromeTab.reload failed for tab " + this.id);
                    failCallback("refresh tab failed");
                    return;
                }

                successCallback();
            }
            catch (e) {
                this._logger.error("reload: Got exception " + e);
                failCallback("ERROR");
            }
        }.bind(this));
    },

    isInjectable: function (successCallback, failCallback) {
        chrome.tabs.get(this.id, function (tabData) {
            try {
                if (!Util.isNullOrUndefined(chrome.extension.lastError)) {
                    this._logger.error("isInjectable: failed for tab ", this.id);
                    this._logger.error("isInjectable: lasterror: ", chrome.extension.lastError);
                    failCallback("tab doesnt exist");
                    return;
                }

                var url = tabData.url;

                if (!Util.isInjectableUrl(url)) {
                    this._logger.debug("isInjectable: Non injectable url:  " + url);
                    successCallback(false);
                    return;
                }

                successCallback(true);
            }
            catch (e) {
                this._logger.error("isInjectable: Got Exception:" + e + " Details: " + (e.Details || "No details found in exception") + "\nStack:" + e.stack);
                failCallback(e.toString());
            }
        }.bind(this));
    },

    resize: function (width, height, successCallback, failCallback) {
        this._logger.trace("resize: Started on window " + this.windowId + " To Width=" + width + " Height= " + height);
        chrome.windows.update(this.windowId, { width: width, height: height }, function () {
            if (!Util.isNullOrUndefined(chrome.extension.lastError)) {
                failCallback(chrome.extension.lastError);
                return;
	                }
			successCallback();
		});
    },

    setBrowserResolution: function (width, height, left, top, successCallback, failCallback) {
        this._logger.trace("setBrowserResolution: Started on window " , this.windowId , " To Width=" , width , " Height= " , height, " Left = ", left, " Top = ", top);
        chrome.windows.update(this.windowId, { width: width, height: height, left: left || 0, top: top || 0 }, this.getCheckErrorChromeApiCallbac(successCallback, failCallback));
    },

    attach: function () {
        this._attached = true;
    },

    detach: function(){
        this._attached = false;
    },

    // Return true if this tab is emulating device
    emulateDevice: function (emulationSettings,successCallback, failCallback) {
        this._logger.trace("emulateDevice: started");
        var selectedDevice = Util.parseJSON(emulationSettings);
        if (!selectedDevice) {
            this._logger.error("emulateDevice: received emulation settings are " + emulationSettings);
            if (failCallback) {
                failCallback("Select device invalid");
            }
            return;
        }

        // Should we check validity of selectedDevice data?
	    this._attachAndDo(function () {
            var chromeVersion = Util.getChromeVersion();
            var useNewInstruction = chromeVersion.major > 60 ;
	        chrome.debugger.sendCommand({ tabId: this.id }, "Network.setUserAgentOverride", { userAgent: selectedDevice.userAgent }, function (response) {
	            this._logger.trace('emulateDevice: Set userAgent: ', selectedDevice.userAgent);
	            if (!responseErrorChecking(response, this._logger)) {
	                return;
	            }

	            // set up device metrics
	            chrome.debugger.sendCommand({
	                tabId: this.id
	            },useNewInstruction ? "Emulation.setDeviceMetricsOverride" : "Page.setDeviceMetricsOverride" , {
	                width: selectedDevice.width,
	                height: selectedDevice.height,
	                deviceScaleFactor: selectedDevice.deviceScaleFactor,
	                mobile: selectedDevice.mobile,
	                fitWindow: false, // Force to false to make emulator in the top left corner instead of in page center
	            }, function (response) {
	                this._logger.trace('emulateDevice: Set DeviceMetrics' );
	                if (!responseErrorChecking(response, this._logger)) {
	                    return;
	                }

	                var tabId = this.id;
	                this.isEmulatedDeviceTouchEnabled = false;
	                if (selectedDevice.touch) {
                        chrome.debugger.sendCommand({ tabId: tabId },useNewInstruction ? "Emulation.setTouchEmulationEnabled" : "Page.setTouchEmulationEnabled", { enabled: true });
	                    chrome.debugger.sendCommand({ tabId: tabId },useNewInstruction ? "Emulation.setEmitTouchEventsForMouse" :"Page.setEmitTouchEventsForMouse", { enabled: true });
	                    this.isEmulatedDeviceTouchEnabled = true;
                    }
	                chrome.tabs.get(tabId, function (tabData) {
	                    chrome.debugger.sendCommand({ tabId: tabId },  "Page.navigate", { url: tabData.url });
	                });

	                this.isEmulatingDevice = true;
	                if (successCallback) {
	                    successCallback();
	                }
	                this._logger.trace("emulateDevice: exited");
	            }.bind(this));
	        }.bind(this));

	    }.bind(this));
	    return;

        ///Helper function
	    function responseErrorChecking(response,logger) {
	        if (!response) {
	            if (chrome.runtime.lastError) {
	                logger.error("emulateDevice: Received an error in chrome runtime: " + chrome.runtime.lastError.message);
	                if (failCallback) {
	                    failCallback(chrome.runtime.lastError.message);
	                }
	            }
	            else {
	                logger.error("emulateDevice: Received an error in chrome runtime. ");
	                if (failCallback) {
	                    failCallback("ERROR");
	                }
	            }
	            return false;
	        }
	        if (response && response.error) {
	            logger.error("emulateDevice: Received an error in response: " + response.error);
	            if (failCallback) {
	                failCallback(response.error);
	            }
	            return false;
	        }

	        return true;
	    };
	},

    _attachAndDo: function (callback) {
        // Attach debugger only on recording since dialogHandler has already attached debugger when replaying
        if (this._attached) {
            //To avoid in some case the debugger was detached(maybe cancled by user) but the flag was not cleared
            //If the current debugger flag is set to true, detach it anyway.
            chrome.debugger.detach({ tabId: this.id }, function () {
                if (chrome.runtime.lastError) {
                    this._logger.warn('Chrome tab detach failed.' + ': ' + chrome.runtime.lastError.message);
                }
                this._attached = false;
                attachDebuggerAndDo.call(this);
            }.bind(this));
        }
        else
        {
            attachDebuggerAndDo.call(this);
        }

        return;

        function attachDebuggerAndDo() {
            //Attch the debugger
            chrome.debugger.attach({ tabId: this.id }, "1.1", function () {
                if (chrome.runtime.lastError) {
                    this._logger.error('Chrome tab attach failed.' + ': ' + chrome.runtime.lastError.message);
                    return;
                }
                this._attached = true;
                //Do call back function
                var tabID = this.id;
                chrome.debugger.sendCommand({ tabId: tabID}, "Network.enable", {}, function (response) {
                    chrome.debugger.sendCommand({ tabId: tabID }, "Page.enable", {}, function (response) {
                        callback();
                    });
                });
            }.bind(this));
        };
    },

    getCheckErrorChromeApiCallbac: function(successCallback, failCallback) {
        var _this = this;
        return function () {
            var error = chrome.runtime.lastError || chrome.extension.lastError;
            if (error) {
                _this._logger.warn("_chromeApiCall - error.  error:", error);
                // keep same this as the callback
                failCallback(error);
                return;
            }
            // keep same this as the callback
            successCallback.apply(this, arguments);
        };
    },

    takeScreenshot: function (rect, format, successCallback, failCallback) {
        var maxRetryCount = 20;
        var timeoutBetweenRetries = 100;
        var retryCount = 0;
        var _this = this;

        function takeScreenshootWithRetry(innerSuccessCallback, innerFailCallback) {

            var retryOrFailCallback = failOrRetry.bind(this, innerSuccessCallback, innerFailCallback);

            _this._logger.warn("takeScreenshot: activating tab=", _this.id, " retry:", retryCount);
            _this._activate(function () {
                _this._logger.warn("takeScreenshot: tab activated. tab=", _this.id, " format = ", format);
                chrome.tabs.captureVisibleTab(_this.windowId, { format: format }, _this.getCheckErrorChromeApiCallbac(function (dataUri) {
                    // Another tab may be activated in the middle of capture resulting in capture of the wrong tab
                    chrome.tabs.get(_this.id, _this.getCheckErrorChromeApiCallbac(function (tabData) {
                        if (!tabData.active) {
                            _this._logger.warn("takeScreenshot: capture visible tab succeedded but tab is no longer active capture may be of another tab", _this.id);
                            retryOrFailCallback(new Error("Tab is not active anymore"));
                            return;
                        }

                        _this._logger.debug("takeScreenshot: capture visible tab suceedded. tab=", _this.id);
                        var base64 = dataUri.replace(/^data:image\/(png|jpeg);base64,/, '');
                        innerSuccessCallback(base64);
                    }, retryOrFailCallback));
                }, retryOrFailCallback));
            }, retryOrFailCallback);
        }

        function failOrRetry(innerSuccessCallback, innerFailCallback, error) {
            _this._logger.debug("takeScreenshot: capture visible tab for tab:", _this.id, " failed retry ", retryCount, " of ", maxRetryCount, ". error is: " + error.message);
            retryCount++;
            if (retryCount < maxRetryCount) {
                Util.setTimeout(function () {
                    _this._logger.debug("takeScreenshot: attempting retry ", retryCount, " of ", maxRetryCount, " for tab:", _this.id);
                    takeScreenshootWithRetry.call(this, innerSuccessCallback, innerFailCallback)
                }, timeoutBetweenRetries);
                return;
            }
            _this._logger.error("takeScreenshot: capture visible tab for tab:", _this.id, " failed and retry count reached max");
            innerFailCallback(error.message || error);
        };

        this._logger.trace("takeScreenshot: Starting for tab=", _this.id);
        this._tabActivationSynchronizer.synchronize(takeScreenshootWithRetry, successCallback, failCallback);
    },

    _getWindow: function (windowID, filterObj, callback) {
        chrome.windows.get(windowID, filterObj, callback);
    },

    _updateWindow: function (updateObj, successCallback, failCallback) {
        chrome.windows.update(this.windowId, updateObj, function () {
            if (chrome.extension.lastError) {
                this._logger.error(updateObj.state + ": error while settings browser to " + updateObj.state + ": " + chrome.extension.lastError);
                failCallback(chrome.extension.lastError);
                return;
            }
            successCallback();
        });
    }
};

//////////////////////////////////////////////////////////////////////////

function TabActivationSynchronizer() {
    this._queue = [];
    this._logger = new LoggerUtil("TabActivationSynchronizer");
    this._nextId = 0;
}

TabActivationSynchronizer.prototype = {
    _queue: null,
    _logger: null,
    _nextId: 0,
    synchronize: function (action, callback, errorcallback) {
        var entry = { action: action, callback: callback, errorcallback: errorcallback, id: this._nextId++ };
        this._queue.push(entry);
        if (this._queue.length === 1) {
            this._logger.debug("synchronize - first entry executing immediatly. id=", entry.id);
            this._doActionInQueue();
        }
    },

    _doActionInQueue: function () {
        if (this._queue.length === 0) {
            this._logger.debug("_doActionInQueue - no entry in queue");
            return;
        }

        var _this = this;
        var headEntry = _this._queue[0];
        this._logger.trace("_doActionInQueue - found entry in queue executing. id=", headEntry.id);
        try {
            headEntry.action(function () {
                _this._logger.trace("_doActionInQueue - actoin ended with success. id=", headEntry.id);
                _this._actionEnded(headEntry.callback, this, arguments)
            }, function () {
                _this._logger.trace("_doActionInQueue - actoin ended with failure. id=", headEntry.id);
                _this._actionEnded(headEntry.errorcallback, this, arguments)
            });

        } catch (exception) {
            _this._logger.error("_doActionInQueue - Exception in action. id=", headEntry.id, " error:", exception.message);
            _this._actionEnded(headEntry.errorcallback, this, [exception])
        }
    },

    _actionEnded: function (cb, cbThis, params) {
        try {
            this._logger.trace("_actionEnded - Calling callback");
            cb.apply(cbThis, params);
            this._logger.trace("_actionEnded - Callback ended");
        } catch (error) {
            this._logger.warn("_actionEnded - error in callback", error.message);
        }

        this._queue = this._queue.splice(1);
        if (this._queue.length > 0) {
            this._logger.debug("_actionEnded - Setting deque for next aciont");
            this._doActionInQueue()
        } else {
            this._logger.debug("_actionEnded - No action queued");
        }
    }
};

//////////////////////////////////////////////////////////////////////////

function ChromeTabBackwardCompatibility() { }

ChromeTabBackwardCompatibility.prototype = {
    isActiveBeforeChrome16: function (successCallback, failCallback) {
        this._logger.trace("Chrome15Tab.isActive started");
        chrome.tabs.getSelected(this.windowId, (function (callback, errCallback, activeTab) {
            if (!Util.isNullOrUndefined(chrome.extension.lastError)) {
                this._logger.error("Chrome15Tab.isActive : chrome.tabs.getSelected failed.");
                errCallback(chrome.extension.lastError);
                return;
            }
            successCallback(activeTab.id === this.id);
        }).bind(this, successCallback, failCallback));
    },
    getWindowBeforeChrome16: function (windowID, filterObj, callback) {
        chrome.windows.get(windowID, callback);
    }
};


function InitChromeBackwardCompatibility(chromeTab) {
    if (!chrome.tabs.query) {
        // chrome.tabs.query was added in Chrome 16 instead of chrome.tabs.getSelected
        console.info("Chrome Init: chrome.tabs.query missing, using isActiveBeforeChrome16 instead of isActive");
        ChromeTab.prototype.isActive = ChromeTabBackwardCompatibility.prototype.isActiveBeforeChrome16;
    }

    //the number of arguments when calling get on window has changed from 2 to 3 in chrome 16 so
    //we need to understand which function to use
    try {
        chrome.windows.get(chromeTab.windowId, null, function () { });
    }
    catch (err) {
        console.info("Chrome Init: chrome.windows.get is expecting 2 arguments (instead of 3), using getWindowBeforeChrome16 instead of getWindow");
        ChromeTab.prototype._getWindow = ChromeTabBackwardCompatibility.prototype.getWindowBeforeChrome16;
    }
}
