function SafariAPI() {
    this._logger = new LoggerUtil("SafariAPI");
    this._logger.trace("SafariAPI started.");

    this._interactionMode = "normal";


    this._popoverInstance = safari.extension.createPopover("uftNotificationPopover", safari.extension.baseURI + "Agent/Resources/Safari/popover.html", 430, 112);
    safari.application.addEventListener("command", this._toolbarCommandHandler.bind(this), false);
}

SafariAPI.prototype = {
    _knownTabs: [],
    _knownWindows: [],
    _nextId: 0,
    _logger: null,
    _interactionMode: "",
    _popoverInstance: null,
    _spySuspendedListener: null,
    _spyResumedListener: null,

    // Callback with param: Tab
    onTabCreated: function (callbackFunction) {
        safari.application.addEventListener("open", function (ev) {
            if (!(ev.target instanceof SafariBrowserTab))
                return;

            var tab = ev.target;

            this._updateUnknownTab(tab);
            this._updateUnknownWindow(tab.browserWindow);

            var safariTab = new SafariTab(tab);

            callbackFunction(safariTab);

            this._logger.trace("Tab Opened with id: " + tab._uftInternalId + ", with Window: " + tab.browserWindow._uftInternalId);

        }.bind(this), true);
    },

    // Callback with param id
    onTabClosed: function (callbackFunction) {
        safari.application.addEventListener("close", function (ev) {
            if (!(ev.target instanceof SafariBrowserTab))
                return;

            var tab = ev.target;
            var tabId = tab._uftInternalId;
            this._logger.trace("Tab closed: " + tabId);

            if (!tabId) {
                console.error("Tab ID for closed tab is not defined");
                return;
            }

            callbackFunction(tabId);

            this._knownTabs[tabId] = null;
        }.bind(this), true);
    },

    // Callback with param: Tabs Array
    getAllTabs: function (tabIdFilter, callbackFunction) {
        var tabsArr = [];
        safari.application.browserWindows.forEach(function (wnd) {
            this._updateUnknownWindow(wnd);
            wnd.tabs.forEach(function (tab) {
                this._updateUnknownTab(tab);

                if (!tabIdFilter || tabIdFilter(tab._uftInternalId)) {
                    tabsArr.push(new SafariTab(tab));
                }
            }.bind(this));
        }.bind(this));

        callbackFunction(tabsArr);
    },
    // Callback with no params
    deleteCookies: function (finishedCallback) {
        // TODO implement this !!
        ErrorReporter.ThrowNotImplemented("SafariAPI.deleteCookies");
    },


    clearCache: function (finishedCallback) {
        // TODO implement this !!
        ErrorReporter.ThrowNotImplemented("SafariAPI.clearCache");
    },
    createComChannel: function () {
        return new SafariComChannel();
    },

    createExternalComChannel: function () {
        var lftChannel = new WebSocketComChannel();
        lftChannel.connect = lftChannel.connect.bind(lftChannel,"ws://127.0.0.1:8824");
        var strategy = {
            _createInnerChannel: function(){
                return new GroupedComChannel(lftChannel, new WebSocketComChannel());
            },
            _sendRegistrationMessage: RemoteComChannelStrategy.prototype._sendRegistrationMessage
        }
        return new ExternalComChannel(strategy);
    },

    _updateUnknownWindow: function (wnd) {
        if (wnd._uftInternalId) {
            return;
        }

        var windowId = ++this._nextId;
        wnd._uftInternalId = windowId;
        this._knownWindows[windowId] = wnd;

        this._updateToolbarItems();
    },

    _updateUnknownTab: function (tab) {
        if (tab._uftInternalId) {
            return;
        }

        var tabId = ++this._nextId;
        tab._uftInternalId = tabId;
        this._knownTabs[tabId] = tab;
    },

    getSettingValue: function (key) {
        return safari.extension.settings[key];
    },

    getLogSettingsObject: function () {
        var logSettingsObject = {};
        logSettingsObject["log:defaultLevel"] = SafariAPI.prototype.getSettingValue("UFT_logLevel");
        try {
            var exceptionsString = SafariAPI.prototype.getSettingValue("UFT_logExceptions");
            if (exceptionsString && exceptionsString.length > 0) {
                var exceptions = JSON.parse(exceptionsString);
                var availableLevels = LoggerUtilSettings.getAvailableLevels();
                Object.keys(exceptions).forEach(function (key) {
                    if (availableLevels.indexOf(exceptions[key]) > -1) {
                        logSettingsObject["log:cat:" + key] = exceptions[key];
                    }
                    else {
                        console.warn("getLogSettingsObject: skip invalid log exception setting: " + key + "=" + exceptions[key]);
                    }
                });
            }

            logSettingsObject.remoteLogging = SafariAPI.prototype._getRemoteLogging();
        }
        catch (e) {
            console.error("Failed to load logging exceptions: " + e + "\nStack:" + e.stack);
        }

        return logSettingsObject;
    },

    setInteractionMode: function (mode) {
        this._logger.trace("setInteractionMode: started for mode: " + mode);
        this._interactionMode = mode;

        switch (mode) {
            case "spy":
                // Display Popover
                if (SafariAPI.prototype.getSettingValue("UFT_popover_alwaysshow")) {
                    this._showPopover(true);
                }
                break;
            case "normal":
                /* falls through */
            default:
                // Hide Popover
                this._showPopover(false);
        }

        this._updateToolbarItems();
    },

    getInteractionMode: function () {
        this._logger.trace("getInteractionMode: returning: " + this._interactionMode);
        return this._interactionMode;
    },
    onSpySuspended: function (listener) {
        Util.assert(!this._spySuspendedListener, "Overwriting existing spySuspended listener", this.logger);
        this._spySuspendedListener = listener;
    },
    onSpyResumed: function (listener) {
        Util.assert(!this._spyResumedListener, "Overwriting existing spyResumed listener", this.logger);
        this._spyResumedListener = listener;
    },
    _toolbarCommandHandler: function (event) {
        this._logger.trace("_toolbarCommandHandler: Received command: " + event.command);

        switch (event.command) {
            case "spy-suspend":
                // Pause Spy !
                this.setInteractionMode(event.command);
                if (this._spySuspendedListener)
                    this._spySuspendedListener.call();
                break;
            case "spy":
                // Resume Spy
                this.setInteractionMode(event.command);
                if (this._spyResumedListener)
                    this._spyResumedListener.call();
                break;
        }
    },

    _getRemoteLogging: function () {
        var remoteLoggingData = { "enabled": false };
        var isRemoteLoggingEnabled = SafariAPI.prototype.getSettingValue("UFT_remoteLogging");
        if (!isRemoteLoggingEnabled) // if it doesn't exist or it's not set (false) return
            return remoteLoggingData;

        var daemonPortStr = SafariAPI.prototype.getSettingValue("UFT_daemonPort");
        if (!daemonPortStr)
            return remoteLoggingData;

        var daemonPort = parseInt(daemonPortStr);
        if (!daemonPort)
            return remoteLoggingData;

        remoteLoggingData.port = daemonPort + 1; // Remote Logging Port is the Daemon Port + 1
        remoteLoggingData.enabled = true;

        return remoteLoggingData;
    },

    _getToolbarItems: function () {
        return safari.extension.toolbarItems.filter(function (item) {
            return item.identifier === "uftExtToolbarItem";
        });
    },

    _showPopover: function (visible) {
        this._logger.trace("_showPopover: called with visible=" + visible);
        if (visible) {
            // Find toolbar item of Active Window
            var activeToolbarItemsList = this._getToolbarItems().filter(function (item) {
                return item.browserWindow === safari.application.activeBrowserWindow;
            });

            Util.assert(activeToolbarItemsList.length === 1, "Can't find active toolbar item", this._logger);

            var activeToolbarItem = activeToolbarItemsList[0];
            activeToolbarItem.popover = this._popoverInstance;
            activeToolbarItem.showPopover();
        }
        else {
            this._getToolbarItems().some(function (toolbarItem) {
                // Hide Popover
                if (toolbarItem.popover) {
                    toolbarItem.popover.hide();
                    toolbarItem.popover = null;
                    return true;
                }
                return false;
            });
        }
    },

    _updateToolbarItems: function () {
        this._logger.trace("_updateToolbarItems: called for interaction mode: " + this._interactionMode);

        var command, newIconName, toolTip;

        switch (this._interactionMode) {
            case "spy":
                newIconName = "SPY_16.png";
                command = "spy-suspend";
                toolTip = "Pause UFT Spy";
                break;
            case "spy-suspend":
                command = "spy";
                newIconName = "pause_16.png";
                toolTip = "Resume UFT Spy";
                break;
            default:
                this._logger.warn("_updateToolbarItems: called with unknown interaction mode: " + this._interactionMode);
                /* falls through */
            case "normal":
                newIconName = "qtp_grey_16.png";
                command = this._interactionMode;
                toolTip = "Micro Focus UFT Agent";
                break;
        }

        this._setAllToolbarItems(command, toolTip, safari.extension.baseURI + 'Agent/Resources/' + newIconName);
    },

    _setAllToolbarItems: function (command, toolTip, image) {
        this._logger.trace("_setAllToolbarItems: called command = " + command);

        this._getToolbarItems().forEach(function (toolbarItem) {
            toolbarItem.command = command;
            toolbarItem.image = image;
            toolbarItem.toolTip = toolTip;
        });
    }
};

///////////////////////////////

function SafariTab(tab) {
    this._logger = new LoggerUtil("SafariTab");
    this._logger.trace("SafariTab created.");
    this.id = tab._uftInternalId;
    this.windowId = tab.browserWindow._uftInternalId;
    this._tab = tab;

    //connects to events on the tab.
    tab.addEventListener("beforeNavigate", this.onNavigationStarted.bind(this), false);
    tab.addEventListener("navigate", this.onNavigationCompleted.bind(this), false);
}

SafariTab.prototype = {
    _logger: null,
    id: -1,
    windowId: -1,
    _tab: null,
    _inNavigation: false,

    getTabProperty:function(attrName, successCallback, failCallback){
        failCallback("NotImplemented");
    },

    // successCallback with ReadyState2Status
    // failCallback with error string
    getState: function (successCallback, failCallback) {
        var currentState = ReadyState2Status.loading;
        if (!this._inNavigation)
            currentState = ReadyState2Status.complete;
        successCallback(currentState);
    },

    // successCallback with number of tabs (int)
    // failCallback with error string
    getNumberOfTabs: function (successCallback, failCallback) {

        var _tabsLength = function () {
            return this._tab.browserWindow.tabs.length;
        };

        this._apiCall(_tabsLength.bind(this), successCallback, failCallback);
    },

    // successCallback with is Tab active in window (boolean)
    // failCallback with error string
    isActive: function (successCallback, failCallback) {

        var _isActive = function () {
            return this._tab.browserWindow.activeTab._uftInternalId === this._tab._uftInternalId;
        };

        this._apiCall(_isActive.bind(this), successCallback, failCallback);
    },

    // failCallback with error string
    navigate: function (url, headers, successCallback, failCallback) {
        var _navigate = function () {
            this._tab.url = url;
        };

        this._apiCall(_navigate.bind(this), successCallback, failCallback);
    },

    // successCallback with no params
    // failCallback with error string	
    select: function (successCallback, failCallback) {
        var activate = function () {
            this._tab.browserWindow.activate();
            this._tab.activate();
        };

        this._apiCall(activate.bind(this), successCallback, failCallback);
    },

    createNewTab: function () {
        this._tab.browserWindow.openTab();
    },

    // failCallback with error string	
    close: function (successCallback, failCallback) {
        this._apiCall(this._tab.close.bind(this._tab), successCallback, failCallback);
    },

    getWindowRect: function (successCallback, failCallback) {
        // we return this error in order to go to the fallback and ask the page (and then the frame) for the window size
        failCallback("unsupported");
    },

    captureTabVisibleArea: function (format, successCallback, failCallback) {
        this._tab.visibleContentsAsDataURL(function (imageDataUrl) {
            if (format !== "jpeg") {
                return successCallback(imageDataUrl);
            }

            var img = document.createElement("img");
            img.onload = function() {
                var canvas = document.createElement("canvas");
                canvas.width = Math.floor(img.width);
                canvas.height = Math.floor(img.height);

                var context = canvas.getContext("2d");
                context.drawImage(img, 0, 0);

                // 0.92 is a default quality value but Safari cannot be functional without this parameter.
                return successCallback(canvas.toDataURL("image/jpeg", 0.92));
            };
            img.src = imageDataUrl;
        });
    },

    onNavigationStarted: function (ev) {
        function removeFragments(url) {
            return url.split('#')[0];
        }

        this._logger.trace("onNavigationStarted: Started for tab:" + this.id);
        var urlSrc = this._tab.url ? this._tab.url.toString() : "";
        var urlTgt = ev.url ? ev.url.toString() : "";

        if (urlSrc === urlTgt) // this is mainly for when refreshing a page (if the URLs including hash's are the same)
        {
            this._inNavigation = true;
            return;
        }

        if (removeFragments(urlSrc) === removeFragments(urlTgt))
            return; // Do nothing if we're navigating between two fragments on the same page

        this._inNavigation = true;
    },
    onNavigationCompleted: function (ev) {
        this._logger.trace("onNavigationCompleted: Started for tab:" + this.id);
        this._inNavigation = false;
    },
    takeScreenshot: function (rect,format, successCallback, failCallback) {
    	this.captureTabVisibleArea(format, function(dataURI) {
            successCallback(dataURI.replace(/^data:image\/(png|jpeg);base64,/, ''));
        }, failCallback);
    },
    reload: function (successCallback, failCallback) {
        this._logger.trace("reload: called - returning unsupported");
        // we return this error in order to go to the fallback and ask the page (and then the frame)
        failCallback("unsupported");
    },

    isInjectable: function (successCallback, failCallback) {
        this._apiCall(Util.isInjectableUrl.bind(this, this._tab.url), successCallback, failCallback);
    },

    _apiCall: function (func, successCallback, failCallback, errorStr) {
        var result;
        try {
            result = func();
        }
        catch (ex) {
            this._logger.error("_apiCall: exception: " + ex.message + "\nStack:" + ex.stack);
            if (failCallback)
                failCallback(errorStr ? errorStr : "error");
            return;
        }

        if (successCallback)
            successCallback(result);
    }
};