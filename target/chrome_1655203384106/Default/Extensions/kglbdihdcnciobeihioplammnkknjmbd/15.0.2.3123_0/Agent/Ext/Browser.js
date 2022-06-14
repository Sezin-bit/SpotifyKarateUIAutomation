function Browser(tab) {
    this._logger = new LoggerUtil("Ext.Browser");
    this._logger.info("Browser was created for tab " + tab.id);
    this._associatedTab = tab;
    this._creationTime = new Date();
    this._browserSessionId = tab.browserSessionId || (this._creationTime.getTime() + Math.random()).toString();
    this._recordTransactionQueue = [];
    Object.defineProperty(this, "id", {
        value: this.getID(),
        writable: false
    });

    //registers for events
    ext.dispatcher.addListener("Message", this);
    ext.dispatcher.addListener("clientRegistered", this);
    if(!Util.isNullOrUndefined(ext.player)) {
        ext.player.addBrowser(this);
    }
}

Browser.prototype = {
    _associatedTab: null,
    _creationTime: null,
	_browserSessionId: null,
    _logger: null,
    _settings: null,
    _pageId: null,
    _page: null,
    _openData: null,
    _recordTransactionQueue: [],
    _openedbytestingtool: false,
    _testingToolId:null,
    _listeners:{},
    //methods
    onCreated: function () {
        //creates the communication channel we do not do this from 
        //constructor since communication channel creation will cause communication back 
        //to browser AO for querying of values.
        this._logger.info("init: Started");
        this._page = new Page(this._associatedTab, Util.shallowObjectClone(this.id));
        this._pageId = this._page.getID();
        var browserInfo = {
            hwnd: 0,
            version: this.getVersion(),
            browserSessionId: this.getBrowserSessionId(),
            WEB_PN_ID: this.getID()
        };
        if (!Util.isNullOrUndefined(this._testingToolId))
            browserInfo["processId"] = this._testingToolId;
        var msg = new Msg("EVENT_BROWSER_CREATE", ext.dispatcher.getParentDispatcherID(), browserInfo);
        ext.dispatcher.sendEvent(msg);
    },

    onUpdated: function(changeInfo) {
        //placeholder
        this._logger.trace("onUpdated: " + changeInfo);
    },
    destroy: function () {

        var browserInfo = {
            hwnd: 0,
            WEB_PN_ID: this.getID()
        };

        // Send Destroy notification to page
        var destroyPageMsg = new Msg("EVENT_BROWSER_DESTROY", Util.shallowObjectClone(this._pageId), browserInfo);
        ext.dispatcher.sendEvent(destroyPageMsg);

        if (!Util.isNullOrUndefined(this._testingToolId))
            browserInfo["processId"] = this._testingToolId;

        // Destroys the communication channel
        var notificationMsg = new Msg("EVENT_BROWSER_DESTROY", ext.dispatcher.getParentDispatcherID(), browserInfo);
        
        ext.dispatcher.sendEvent(notificationMsg);

        ext.dispatcher.removeListener("clientRegistered", this);
        ext.dispatcher.removeListener("Message", this);
        if(!Util.isNullOrUndefined(ext.player)) {
            ext.player.removeBrowser(this);
        }
    },

    getTestingToolId: function (){
        return this._testingToolId;        
    },

    setTestingToolId: function (testingToolId) {
        this._testingToolId = testingToolId;
    },

    onNewTestingToolId:function(callback){
        this._listeners["new testingtool id"] = callback;
    },
    
    onMessage: function (msg, resultCallback) {
        if (typeof SAPPortalConnectorExt != "undefined" && SAPPortalConnectorExt != null && SAPPortalConnectorExt.Merge != null && SAPPortalConnectorExt.RollBack != null && msg._data != null) {
            if (msg._data["SAPPortal Change"] == 1) {
                SAPPortalConnectorExt.Merge.call(this);
            } else if (msg._data["SAPPortal Change"] == 0) {
                SAPPortalConnectorExt.RollBack.call(this);
            }
        }

        this._logger.trace("onMessage Started with\n", msg);
        if (!this[msg._msgType]) {
            this._logger.error("onMessage Unhandled msg: ", msg._msgType);
            ErrorReporter.ThrowNotImplemented("Browser." + msg._msgType);
        }

        this[msg._msgType](msg, resultCallback);
    },

    QUERY_ATTR: function (msg, resultCallback) {
        this._logger.trace("QUERY_ATTR: Started");
        var contentQueryMsg = new Msg(MSG_TYPES.QUERY, null, {});
        var valNameMapping = {};

        var numOfResponses = Object.keys(msg._data).length;
        if (numOfResponses === 0) {
            this._logger.error("QUERY_ATTR: called on 0 attributes");
            resultCallback(msg);
            return;
        }

        var multiResponses = new MultipleResponses(numOfResponses);
        for (var valName in msg._data) {
            this.GetAttr(valName, msg, valNameMapping, multiResponses.callback((function (keyName, isDone, attrVal) {

                if (attrVal && attrVal.askPage) {
                    contentQueryMsg = addToContentQueryMessage.call(this, contentQueryMsg, valNameMapping, keyName, msg._data[keyName]);
                }

                this._logger.debug("QUERY_ATTR:" + keyName + "=" + attrVal);
                msg._data[keyName] = attrVal;

                if (isDone) {
                    // we received all responses queried, let's try to send reply or query the page for the rest of the properties               
                    if (Object.keys(contentQueryMsg._data).length > 0) {
                        this._logger.trace("QUERY_ATTR: Need to ask content for the rest of requested properties");
                        queryAttrFromPage.call(this, msg, contentQueryMsg, valNameMapping, resultCallback);
                        return;
                    }

                    this._logger.trace("QUERY_ATTR: finished");
                    resultCallback(msg);
                }

            }).bind(this, valName)));
        }

        return;

        /// Helper Functions
        function addToContentQueryMessage(contentQueryMsg, valNameMappingObj, attrName, attrVal) {
            this._logger.trace("addToContentQueryMessage: Started for attribute: " + attrName);
            var requestedAttr = attrName;
            for (var mappedAttr in valNameMappingObj) {
                if (valNameMappingObj[mappedAttr] === attrName) {
                    this._logger.trace("addToContentQueryMessage: Found name mapping from: " + attrName + " to: " + mappedAttr);
                    requestedAttr = mappedAttr;
                    break;
                }
            }
            contentQueryMsg._data[requestedAttr] = attrVal;
            return contentQueryMsg;
        }

        // Called when QUERY_ATTR needs to Query Attributes value from the Page
        function queryAttrFromPage(msg, contentQueryMsg, valNameMappingObj, resultCallback) {

            //check if we need to send query to content if so 
            //then query the content and merge the results.
            var logger = this._logger;
            this._logger.trace("queryAttrFromPage: Called. Need to query the content sending mesage to content");

            // If need title from page, we add url as need at same time. so that we can get title and url together. 
            if (contentQueryMsg._data.hasOwnProperty("title") && !contentQueryMsg._data.hasOwnProperty("url")) {
                contentQueryMsg._data.url = null; // add url into list
                contentQueryMsg._extra = "url"; //flag up the addtional property
            }

            this.DispatchMsgToPage(contentQueryMsg, function (resMsg) {
                logger.trace("queryAttrFromPage: Got the following response ", resMsg);

                // If request both title and url, and get empty title, then replace it using url.
                if (contentQueryMsg._data.hasOwnProperty("title") && contentQueryMsg._data.hasOwnProperty("url"))
                    if (!resMsg._data.title)
                        resMsg._data.title = resMsg._data.url;

                // If flaged before, We need handle extra property
                if (contentQueryMsg._extra) {
                    delete resMsg._data[contentQueryMsg._extra]; //delete extra property added before
                    delete contentQueryMsg._data.url; // add url into list
                    delete contentQueryMsg._extra; // no extra property any more
                }

                mergeMessages(msg, resMsg, valNameMappingObj);
                resultCallback(msg);
            });
        }

    },
    _attrs: {
        micclass: function () {
            return [["Browser", "Container"]];
        },
        "wasted time": function () {
            return 0;
        },
        hwnd: function () {
            return this._associatedTab.hwnd || 0;
        },
        top_level_hwnd: function () {
            if (this._associatedTab.getTopLevelHwnd)
                return this._associatedTab.getTopLevelHwnd();
        },
        version: function () {
            return this.getVersion();
        },
        "application version": function () {
            return this._attrs.version.call(this);
        },
        "creationtime": function () {
            return SpecialObject.CreateTime(this._creationTime);
        },
        openedbytestingtool: function () {
            return this._openedbytestingtool;
        },
        browserid: function () {
            return this.getID();
        },
        openurl: function () {
            return this._openData ? this._openData.url : "";
        },
        opentitle: function () {
            return this._openData ? this._openData.title : "";
        },
        "page hwnd": function () {
            return null;
        },
        browsersessionid: function() {
            return this.getBrowserSessionId();
        }
    },
    GetAttrSync: function (property) {
        this._logger.trace("GetAttrSync: query property " + property);
        var func = this._attrs[property];

        if (func)
            return func.call(this);

        this._logger.error("GetAttrSync: attribute " + property + " is unsupported");
        return null;
    },
    _getBrowserProperty:function(attrName, msg, resultCallback){
        function successCallback(attrValue){
            resultCallback(attrValue);
        }
        function failCallback(){
            resultCallback({ askPage: true });
        }
        this._associatedTab.getTabProperty(attrName, successCallback, failCallback);
    },
    GetAttr: function (property, msg, valNameMapping, resultCallback) {
        this._logger.trace("GetAttr: query property " + property);
        var val;
        var logger = this._logger;

        var lcProperty = property.toLowerCase();

        // Sync properties
        var syncAttrFunc = this._attrs[lcProperty];
        if (syncAttrFunc) {
            resultCallback(syncAttrFunc.call(this));
            return;
        }

        switch (lcProperty) {
            case "state":
            case "state_ignoring_frames":
                this._getBrowserState(lcProperty, resultCallback);
                return;
            case "frame from point":
                this.DispatchMsgToPage(msg, (function (resMsg) {
                    val = resMsg._data["frame from point"];
                    //checks if we got a runtime id back
                    if (val && val.browser)
                        val = this.mergeWithBrowserRTID(val);
                    resultCallback(val);
                }).bind(this));
                return;
            case "name":
                valNameMapping.title = "name";//fall through
            case "title":
            case "url":
            case "logical name":
                this._getBrowserProperty(lcProperty, msg, resultCallback);
                break;

            case "url no protocol":
                //This attribute is used by the filtering of the tabs by URL to get the current pointed TAB since the request is sent withouth the protocl
                var urlRequestMsg = new Msg(MSG_TYPES.QUERY, this.getID(), { url: null });
                this.QUERY_ATTR(urlRequestMsg, function (resMsg) {
                    if (resMsg._data.url) {
                        var urlTokens = resMsg._data.url.split("://"); //removes the protocol of the url
                        resultCallback(urlTokens.length === 1 ? urlTokens[0] : urlTokens[1]);
                    }
                    else {
                        return resultCallback("");
                    }
                });
                break;

            case "number of tabs":
                // this call needs to be waited for async request of the tab status        
                logger.trace("number of tabs: started");
                this._associatedTab.getNumberOfTabs(resultCallback, function (errMsg) {
                    logger.error("Browser.GetAttr['number of tabs']: failed: ", errMsg);
                    resultCallback(0);
                });
                return;

            case "abs_x":
            case "x":
                // This logic is duplicated also in BrowserContentHelper.js
                // Make sure you fix it there as well if this code is ever touched
                var queryRectX = new Msg("QUERY_ATTR", this.getID(), { rect: null });
                this.QUERY_ATTR(queryRectX, function (resMsg) {
                    resultCallback(resMsg._data.rect.left);
                });
                break;

            case "abs_y":
            case "y":
                // This logic is duplicated also in BrowserContentHelper.js
                // Make sure you fix it there as well if this code is ever touched
                var queryRectY = new Msg("QUERY_ATTR", this.getID(), { rect: null });
                this.QUERY_ATTR(queryRectY, function (resMsg) {
                    resultCallback(resMsg._data.rect.top);
                });
                break;

            case "rect":
                this.getBrowserRect(resultCallback);
                return;
            case "width":
                this.getBrowserRect(function (browserRect) {
                    resultCallback(browserRect.right - browserRect.left);
                });
                return;
            case "height":
                this.getBrowserRect(function (browserRect) {
                    resultCallback(browserRect.bottom - browserRect.top);
                });
                return;
            case "outerwidth":
            case "outerheight":
            case "innerwidth":
            case "innerheight":
                resultCallback({ askPage: true });
                return;
            case "isactive":
            case "visible":
                this.isActive(resultCallback);
                break;
            case "elementinterface":
                ErrorReporter.ThrowNotImplemented();
                break;
            case "tab screen capture":
                this._captureScreenShot(resultCallback);
                break;
            case "windowid":
                resultCallback(this._associatedTab.windowId);
                break;
            case 'frame from hwnd':
            case 'all_qtp_slv_cookies':
                resultCallback({ askPage: true });
                break;
            default:
                this._logger.debug("GetAttr called for an unknown property: " + property);
                if (resultCallback)
                    resultCallback();
        }
    },
    _getBrowserState: function (propName, resCallback) {
        var logger = this._logger;
        logger.trace("_getBrowserState: started");
        this._associatedTab.getState(getStateSuccessCallback.bind(this), getStateErrorCallback.bind(this));
        return;

        /** Helper callback functions **/
        function getPageState() {
            logger.trace("_getBrowserState.getPageState: Called");
            var contentQueryMsg = new Msg(MSG_TYPES.QUERY, null, Util.objectFromArray([propName], null));

            var resMsg = this.DispatchMsgToPage(contentQueryMsg, function (resMsg) {
                var status = resMsg._data[propName];
                logger.trace("_getBrowserState.getPageState: Result: " + status);
                resCallback(status);
            });
        }

        function getStateSuccessCallback(status) {
            logger.trace("_getBrowserState.getStateSuccessCallback: received callback with status " + status);
            var reqData =  { AN_METHOD_NAME: "BROWSER_DIALOG_EXISTS", value: null };
            var reqMsg = new Msg(MSG_TYPES.SRVC_INVOKE_METHOD, this.getID(), reqData);
            ext.dispatcher.sendMessage(reqMsg, null, null, function(msg){
                if(msg._data.value === true){
                    logger.trace("dialog exists, state: result: ", status);
                    resCallback(status);
                    return;
                }

                if (status !== ReadyState2Status.complete) {
                    logger.trace("state: result: " + status);
                    resCallback(status);
                    return;
                }

                if (!this._associatedTab.isInjectable) {
                    logger.debug("_getBrowserState.getStateSuccessCallback: Tab doesn't support isInjectable API, dispatch to page");
                    getPageState.call(this);
                    return;
                }

                this._associatedTab.isInjectable(function (result) {
                    logger.debug("_getBrowserState.getStateSuccessCallback: is Tab Injectable? " + result);
                    if (result)
                        getPageState.call(this);
                    else
                        resCallback(ReadyState2Status.complete);
                } .bind(this), getPageState.bind(this));

            }.bind(this));
        }

        function getStateErrorCallback(errorMsg) {
            logger.warn("_getBrowserState.getStateErrorCallback: trying to get state of unknown tab: " + this._associatedTab.id);
            this.handleError(errorMsg);
            var failedStatus = ReadyState2Status.unintialized;
            logger.trace("_getBrowserState: Sending failure result : " + failedStatus);
            resCallback(failedStatus);
        }
    },
    getBrowserRect: function (resultCallback) {
        this._logger.trace("getBrowserRect: Started");

        this._associatedTab.getWindowRect(resultCallback, function (errorMsg) {
            this._logger.warn("failed to get window rect via API, try ask content.", errorMsg);

            // In case it is WebDriver embedded browser, e.g. CEF, NWJS, Electron, we take the inner tab rect as browser rect.
            // This will correct the screen shots, because WebDriver only take snapshot for inner area.
            // 
            var webDriverType = window._QTP && window._QTP.WebDriverInfo && window._QTP.WebDriverInfo.WebDriverType;
            var isEmbdeddedDriver = !!webDriverType && (webDriverType == "ChromeRemoteDebug" || webDriverType == "NWjs");
            var rectName = isEmbdeddedDriver ? "screen_rect" : "window_rect";

            var queryData = {};
            queryData[rectName] = null;
                
            var msgToPage = new Msg(MSG_TYPES.QUERY, null, queryData);
            this.DispatchMsgToPage(msgToPage, function (resMsg) {
                resultCallback(resMsg._data[rectName]);
            });

        }.bind(this));
    },
    getVersion: function () {
        return Util.browserApplicationVersion(this._logger);
    },
    getBrowserSessionId: function() {
        return this._browserSessionId;
    },

    SRVC_SET_TESTINGTOOLID: function (msg, resultCallback) {
        this._logger.trace("SET_TESTINGTOOL_ID: called");
        if (Util.isNullOrUndefined(msg._data) || Util.isNullOrUndefined(msg._data.processId))
            return resultCallback(msg);

        var testingToolProcessId = msg._data.processId;
        this._testingToolId = testingToolProcessId;
        if (!Util.isNullOrUndefined(this._listeners["new testingtool id"]))
            this._listeners["new testingtool id"](this._associatedTab.windowId, testingToolProcessId);
        resultCallback(msg);
    },

    SRVC_SET_GLOBAL_VARIABLES: function (msg, resultCallback) {
        this._logger.trace("SRVC_SET_GLOBAL_VARIABLES: Started");

        // Forward message to agent
        var agentMsg = new Msg(msg._msgType, RtIdUtils.GetAgentRtid(), msg._data);
        ext.dispatcher.sendMessage(agentMsg, null, null, Util.identity);

        resultCallback(msg);
    },

    SRVC_SET_GLOBAL_VARIABLES_INTERNAL: function (msg, resultCallback) {
        this._logger.trace("SRVC_SET_GLOBAL_VARIABLES_INTERNAL: Started");
        var new_settings = msg._data;
        

        this._settings = this._settings || {};
        for (var prop in new_settings) {
            Object.defineProperty(
				this._settings,
				prop,
				{
				    value: new_settings[prop],
				    writable: false,
				    configurable: true,
				    enumerable: true
				}
			);
        }

        if (Util.isNullOrUndefined(this._pageId)) {
            resultCallback(msg);
            return;
        }

        var newMsg = new Msg(msg._msgType, Util.shallowObjectClone(this._pageId), new_settings);
        this.DispatchMsgToPage(newMsg, function () {
            resultCallback(msg);
        });
    },

    SRVC_SET_EMULATOR_DEVICE: function (msg, resultCallback) {
        this._logger.trace("SRVC_SET_EMULATOR_DEVICE: Started");
        if (msg._data.EMULATORDEVICE) {
            var emulationSettings = msg._data.EMULATORDEVICE;
            if (ext.app.updateEmulationStatu) {
                ext.app.updateEmulationStatu(this._associatedTab, emulationSettings, emulatorTabSuccessCallback.bind(this), emulatorTabErrorCallback.bind(this));
                return;
            }
            else {
                this._logger.warn("InvokeMethod: unknown method updateEmulationStatu");
                ErrorReporter.ThrowMethodNotFound();
            }
        }
        this._logger.error("The input parameter do not inlculde valid EMULATORDEVICE field.");
        emulatorTabErrorCallback.call(this, "Emulator device invalid");
        return;

        function emulatorTabSuccessCallback() {
            this._logger.trace("SRVC_SET_EMULATOR_DEVICE: received successful response");
            var setGlobalMsg = new Msg('SRVC_SET_GLOBAL_VARIABLES_INTERNAL', msg._to, {
                isTouchEnabled: this._associatedTab.isEmulatedDeviceTouchEnabled
            }, msg._tab);
            this.SRVC_SET_GLOBAL_VARIABLES_INTERNAL(setGlobalMsg, function () {
                resultCallback(msg)
            });
        }; // for SetTabEmulatorSuccessCallback

        function emulatorTabErrorCallback(errorMsg) {
            this.handleError(errorMsg);
            this._logger.error("SRVC_SET_EMULATOR_DEVICE: set emulator device failed");
            msg.status = "ERROR";
            resultCallback(msg);
        }; // for SetTabEmulatorErrorCallback
    },

    SRVC_HIGHLIGHT_OBJECT: function (msg, resultCallback) {
        this._logger.trace("SRVC_HIGHLIGHT_OBJECT: Called");
        resultCallback(msg);
        this.DispatchMsgToPage(msg, function () { /*resultCallback(msg);*/ });
    },
    
    SRVC_HIGHLIGHT_MATCHES: function (msg, resultCallback) {
        this._logger.trace("SRVC_HIGHLIGHT_MATCHES: Called");
        if (Util.isNullOrUndefined(msg._data.WEB_PN_ID) || msg._data.WEB_PN_ID.length < 1) {
            this._logger.warn("SRVC_HIGHLIGHT_MATCHES: no element");
            return resultCallback(msg);
        }
        this.DispatchMsgToPage(msg, resultCallback);
    },
    
    SRVC_GET_OBJ_DESCRIPTION: function (msg, resultCallback) {
        this._logger.trace("Browser: SRVC_GET_OBJ_DESCRIPTION msg=", msg);

        var oldMsgType = msg._msgType;
        msg._msgType = "SRVC_GET_BROWSER_DESCRIPTION_INTERNAL";
        this.DispatchMsgToPage(msg, function(resMsg) {
            resMsg._msgType = oldMsgType;
            this._fixDescription(resMsg._data.objDescription.description, function() {
                resultCallback(resMsg);
            });
        }.bind(this));
    },

    SRVC_SET_BROWSER_RESOLUTION: function (msg, resultCallback) {
        this._logger.trace("SRVC_SET_BROWSER_RESOLUTION caled. msg = ", JSON.stringify(msg));
        if (!this._associatedTab.setBrowserResolution)
            return this._featureNotImplemented('setBrowserResolution', msg, resultCallBack);

        this._associatedTab.setBrowserResolution(msg._data.width, msg._data.height, msg._data.left, msg._data.top, function () { 
            resultCallback(msg);
        }, function (error) {
            this._logger.error("SRVC_SET_BROWSER_RESOLUTION: got error. err = ", error);
            msg.status = "ERROR";
            resultCallback(msg);
        }.bind(this));
    },

   _mergeValue: function (msg, key, val) {
        if (msg._data[key]) {
            if (Util.isUndefined(msg._data[key].length))
                msg._data[key] = [[msg._data[key]]];
            msg._data[key][0] = msg._data[key][0].concat([val]);
        }
        else
            msg._data[key] = val;
    },
    QUERY_DIRECT_CHILD_DESC_TO_ID: function (msg, resultCallback) {
        this._logger.trace("QUERY_DIRECT_CHILD_DESC_TO_ID called on ", msg);

        // Only one direct child - Page !
        this.matchPageDescToId(msg, resultCallback);
    },
    QUERY_REPOSITORY_DESC2ID_DIRECT: function (msg, resultCallback) {
        this._logger.trace("QUERY_REPOSITORY_DESC2ID_DIRECT: Strted");

        // Only one direct child - Page !
        this.matchPageDescToId(msg, resultCallback);
    },
    QUERY_REPOSITORY_DESC2ID: function (msg, resultCallback) {
        this._logger.trace("QUERY_REPOSITORY_DESC2ID: Started");
        var pageMsg = new Msg(msg._msgType, null, msg._data);
        this.DispatchMsgToPage(pageMsg, (function (resultMsg) {
            this._logger.trace("QUERY_REPOSITORY_DESC2ID received async result");
            //copy result WEB_PN_ID from the page
            msg._data.WEB_PN_ID = [this.getPageId()].concat(resultMsg._data.WEB_PN_ID);
            msg.status = resultMsg.status;
            resultCallback(msg);
        }).bind(this));
    },
    QUERY_OBJ_POINT_TO_ID: function (msg, resultCallback) {
        var pageMsg = new Msg(msg._msgType, null, msg._data);
        this.DispatchMsgToPage(pageMsg, resultCallback);
    },
    QUERY_OBJ_CLIENT_POINT_TO_ID: function (msg, resultCallback) {
        var pageMsg = new Msg(msg._msgType, null, msg._data);
        this.DispatchMsgToPage(pageMsg, resultCallback);
    },
    warnUnimplemented: function (name) {
        this._logger.warn("Called unimplemented " + name);
    },
    SRVC_LOAD_KIT: function (msg, resultCallback) {
        var progid = msg._data.progid;
        this._logger.trace("SRVC_LOAD_KIT: started on " + progid);

        switch (progid) {
            case "Mercury.WebKit":
                return resultCallback(msg);
            case "Mercury.WebExtKit":
                return this.DispatchMsgToPage(msg, resultCallback);
            default:
                this.warnUnimplemented("Browser.SRVC_LOAD_KIT: " + progid);
                return resultCallback(msg);
        }
    },

    SRVC_LOAD_EXT_TOOLKIT: function (msg, resultCallback) {
        this._logger.trace("SRVC_LOAD_EXT_TOOLKIT: Started");
        var self = this;

        if (!Util.isNullOrUndefined(msg._data.name) && !Util.isNullOrUndefined(msg._data.TOOLKIT)) {
            this.DispatchMsgToPage(msg, returnResult);
        }
        else {
            returnResult(msg);
        }

        return;

        // helper functions	
        function returnResult(resMsg) {
            // The message might be too big - no need to return all the received data.
            resMsg._data = {};
            self._logger.trace("SRVC_LOAD_EXT_TOOLKIT: returning result: ", resMsg);
            resultCallback(resMsg);
        }
    },

    _createDialogErrorCallback: function (msg, callback, name) {
        return function (errorMessage, errorCode) {
            msg.status = errorCode || "ERROR";
            this._logger.warn(name + " Failed: " + errorMessage);
            callback(msg);
        } .bind(this);
    },

    _featureNotImplemented: function (name, msg, callback) {
        this._logger.debug("Browser doesn't support " + name);
        msg.status = "NotImplemented";
        callback(msg);
    },

    SRVC_SET_EVENT_CONFIGURATION: function (msg, resultCallback) {
        this._logger.trace("SRVC_SET_EVENT_CONFIGURATION: Started");

        // When a new tab open, UFT send this message to Browser here not Agent.
        // If receive this message directly here, forward message to agent for further handling
        var agentMsg = new Msg(msg._msgType, RtIdUtils.GetAgentRtid(), msg._data);
        ext.dispatcher.sendMessage(agentMsg, null, null, Util.identity);

        resultCallback(msg);
    },

    SRVC_SET_EVENT_CONFIGURATION_INTERNAL: function (msg, resultCallback) {
        this._logger.trace("SRVC_SET_EVENT_CONFIGURATION_INTERNAL: Started");
        this.DispatchMsgToPage(msg, resultCallback);
    },

    invokeMethods: {
        ZERO_WASTED_TIME: Util.identityWithCallback,
        BROWSER_DISABLE_KIT: Util.identityWithCallback,
        BROWSER_ENABLE_KIT: Util.identityWithCallback,
        
        SET_OPENEDBYQT_FLAG: function (msg, resultCallback) {
            this._openedbytestingtool = true;
            resultCallback(msg);
        },

        BROWSER_HANDLE_DIALOG: function (msg, callback) {
            if (!ext.app.handleDialog)
                return this._featureNotImplemented('handleDialog', msg, callback);

            var accept = msg._data.name;
            var text = msg._data.value;
            ext.app.handleDialog(this._associatedTab.id, accept, text, function (res) {
                callback(msg);
            }, this._createDialogErrorCallback(msg, callback, "BROWSER_HANDLE_DIALOG"));
        },

        BROWSER_DIALOG_EXISTS: function (msg, callback) {
            if (!ext.app.dialogExists)
                return this._featureNotImplemented('dialogExists', msg, callback);

            ext.app.dialogExists(this._associatedTab.id, function (result) {
                msg._data.value = result;
                callback(msg);
            }, this._createDialogErrorCallback(msg, callback, "BROWSER_DIALOG_EXISTS"));
        },

        BROWSER_GET_DIALOG_TEXT: function (msg, callback) {
            if (!ext.app.getDialogText)
                return this._featureNotImplemented('getDialogText', msg, callback);

            ext.app.getDialogText(this._associatedTab.id, function (result) {
                msg._data.text = result;
                callback(msg);
            }, this._createDialogErrorCallback(msg, callback, "BROWSER_GET_DIALOG_TEXT"));
        },

        BROWSER_IS_SIBLING_TAB_METHOD_NAME: function (msg, resultCallback) {
            this._logger.trace("BROWSER_IS_SIBLING_TAB_METHOD_NAME: called");
            Util.assert(RtIdUtils.IsRTIDBrowser(msg._data.WEB_PN_ID), "BROWSER_IS_SIBLING_TAB_METHOD_NAME contains no other browser data", this._logger);
            var queryWinIdMsg = new Msg("QUERY_ATTR", msg._data.WEB_PN_ID, { windowId: null });
            var self = this;
            ext.dispatcher.sendMessage(queryWinIdMsg, msg._to, null, function (result) {
                var isSibling = (result._data.windowId === self._associatedTab.windowId);
                msg._data.value = isSibling;
                resultCallback(msg);
            });
        },
        BROWSER_RESIZE: function (msg, resultCallBack) {
            this._logger.trace("BROWSER_RESIZE: Started");
            if (!this._associatedTab.resize)
                return this._featureNotImplemented('resize', msg, resultCallBack);

            this._associatedTab.resize(msg._data.width, msg._data.height, function () {
                resultCallBack(msg);
            }, this.handleError.bind(this));
        },
        SCROLL_WHOLE_FRAME: function (msg, resultCallback) {
            this._logger.trace("CMD_BROWSER_FORWARD: Called");
            this.DispatchMsgToPage(msg, resultCallback);
        },

    },
    isActive: function (callback) {
        this._logger.trace("isActive: Started");
        var isActiveErrorCallback = function (asyncCookie, errMsg) {
            this._logger.error("Browser.isActive: this._associatedTab.isActive failed.");
            callback(false);
        };

        this._associatedTab.isActive(callback,
                                    isActiveErrorCallback.bind(this));
    },
    SRVC_INVOKE_METHOD: function (msg, resultCallback) {
        var name = msg._data.AN_METHOD_NAME;
        var func = this.invokeMethods[name];
        if (!func)
            ErrorReporter.ThrowNotImplemented("Browser.invokeMethod: " + name);

        func.call(this, msg, resultCallback);
    },
    SRVC_TAKE_SCREENSHOT: function (msg, callback) {
        this._logger.trace("SRVC_TAKE_SCREENSHOT: Started");

        if (this._associatedTab.takeScreenshot) {
            var rect = (msg._data && msg._data.rect) ? msg._data.rect : null;
            var imageFormat = (msg._data && msg._data.type && msg._data.type === "jpeg") ? "jpeg" : "png";
            this._associatedTab.takeScreenshot(rect, imageFormat, function (image) {
                msg._data.type = imageFormat;
                msg._data.data = image;
                callback(msg);
            }.bind(this),
            function (error) {
                this._logger.error("SRVC_TAKE_SCREENSHOT: failed: " + error);
                msg.status = "ERROR";
                callback(msg);
            }.bind(this));
        }
        else {
            msg.status = "ERROR";
            callback(msg);
        }
    },
    SRVC_MAKE_OBJ_VISIBLE: function (msg, callbackResult) {

        this._logger.trace("SRVC_MAKE_OBJ_VISIBL: Started");

        var selectTabSuccessCallback = function () {
            this._logger.trace("SRVC_MAKE_OBJ_VISIBLE: received successful response");
            callbackResult(msg);
        }; // for selectTabSuccessCallback

        var selectTabErrorCallback = function (errorMsg) {
            this.handleError(errorMsg);
            this._logger.error("SRVC_MAKE_OBJ_VISIBLE: select failed");
            callbackResult(msg);
        }; // for selectTabErrorCallback

        if (!Util.isNullOrUndefined(msg._data) && msg._data["disable browser popup"] === true && typeof this._associatedTab.selectTab === "function")
            this._associatedTab.selectTab(selectTabSuccessCallback.bind(this),selectTabErrorCallback.bind(this));
        else
            this._associatedTab.select(selectTabSuccessCallback.bind(this), selectTabErrorCallback.bind(this));
     },
    _dispatchMsgToPageWhenLoadingComplete: function (resultCallback) {

        var executeAccordingToPageStatus = function (loadingCallback, completeCallback) {
            var msg = new Msg("QUERY_ATTR", this.getPageId(), { "state": "" });
            this.DispatchMsgToPage(Util.shallowObjectClone(msg), function (msg) {
                if (msg._data.state === ReadyState2Status.complete) {
                    if (completeCallback) {
                        completeCallback();
                    }
                }
                else {
                    if (loadingCallback) {
                        loadingCallback();
                    }
                }
            });

        } .bind(this);

        //if page is not complete, setInterval to query page state.
        //when page is complete, clear the interval and call resultCallback which is the real action to page.
        var times = 0;
        var pageLoadingCallback = function () {
            var timerId = Util.setInterval(function () {
                if (times++ < 10) {
                    executeAccordingToPageStatus(null, function () {
                        Util.clearInterval(timerId);
                        resultCallback();
                    });
                }
                else {
                    Util.clearInterval(timerId);
                    resultCallback();
                }
            }, 500);
        };
        //first query the state after 2 seconds for some cases like a link is click and page is redirect to another url.
        //If query immediately, the old page will ask the message.
        Util.setTimeout(function () { executeAccordingToPageStatus(pageLoadingCallback, resultCallback); }, 2000);
    },

    CMD_BROWSER_RUN_ENDED: function(msg,resultCallback){
        if (ext.app.browserRunEnded)
            ext.app.browserRunEnded(this._associatedTab);
        resultCallback(msg);
    },

    CMD_BROWSER_BACK: function (msg, resultCallback) {
        this._logger.trace("CMD_BROWSER_BACK: Called");
        var executed = false;
        this._dispatchMsgToPageWhenLoadingComplete(function () {
            if (!executed) {
                executed = true;
                this.DispatchMsgToPage(msg, resultCallback);
            }
        } .bind(this));

    },
    CMD_BROWSER_FORWARD: function (msg, resultCallback) {
        this._logger.trace("CMD_BROWSER_FORWARD: Called");
        var executed = false;
        this._dispatchMsgToPageWhenLoadingComplete(function () {
            if (!executed) {
                executed = true;
                this.DispatchMsgToPage(msg, resultCallback);
            }
        } .bind(this));
    },
    CMD_BROWSER_NAVIGATE: function (msg, resultCallback) {
        var logger = this._logger;
        logger.trace("CMD_BROWSER_NAVIGATE: started");

        var url = msg._data.url;
        logger.trace("Navigate: Got url " + url);
        if (!url.match(/^\w+:\/\//) && !url.match(/^about:/) && !url.match(/^javascript:/)) {
            logger.trace("Navigate: URL with no protocol, default to http");
            url = "http://" + url;
        }

        var errorCallback = function (errorMsg) {

            switch (errorMsg) {
                case "unsupported":
                    // Fallback for unsupported navigation - do it in the content
                    logger.trace("CMD_BROWSER_NAVIGATE received unsupported error, dispatching to Content as Fallback");
                    msg._data.url = url;
                    this.DispatchMsgToPage(msg, resultCallback);
                    break;
                case "Illegal URL":
                    msg.status = "IllegalOperation";
                    resultCallback(msg);
                    break;
                default:
                    this.handleError(errorMsg);
                    msg.status = "ERROR";
                    resultCallback(msg);
                    break;
            }

        };

        var headers = msg._data.headers;

        this._associatedTab.navigate(url, headers, resultCallback.bind(this, msg), errorCallback.bind(this));
    },
    CMD_BROWSER_REFRESH: function (msg, resultCallBack) {
        this._logger.trace("CMD_BROWSER_REFRESH: Called");

        var successCallback = function () {
            resultCallBack(msg);
        };

        var errorCallback = function (errorMsg) {
            // Error Callback
            switch (errorMsg) {
                case "unsupported":
                    this.DispatchMsgToPage(msg, resultCallBack);
                    return;
                default:
                    this.handleError(errorMsg);
            }
            resultCallBack(msg);
        };

        this._associatedTab.reload(successCallback, errorCallback.bind(this));
    },
    CMD_BROWSER_OPEN_NEW_TAB: function (msg, resultCallBack) {
        this._associatedTab.createNewTab();
        resultCallBack(msg);
    },
    CMD_BROWSER_CLOSE: function (msg, resultCallBack) {
        this._logger.trace("Closing tab " + this._associatedTab.id);

        var browserCloseSuccessCallback = function () {
            resultCallBack(msg);
        };

        var browserCloseErrorCallback = function (errorMsg) {
            // Error Callback
            switch (errorMsg) {
                case "unsupported":
                    break;
                default:
                    this.handleError(errorMsg);
                    break;
            }
            resultCallBack(msg);
        };

        this._associatedTab.close(browserCloseSuccessCallback.bind(this), browserCloseErrorCallback.bind(this));
    },
    CMD_BROWSER_CLOSE_ALL_TABS: function (msg, resultCallback) {
        this._logger.trace("CMD_BROWSER_CLOSE_ALL_TABS: Started and dispatch the request to agent");

        if (typeof this._associatedTab.closeWindow === "function") {
            this._associatedTab.closeWindow(function () {
                    resultCallback(msg);
                }, function (errorMsg) {
                    this.handleError(errorMsg);
                    resultCallback(msg);
                }.bind(this)
            );
        }
        else {
            msg._to = RtIdUtils.GetAgentRtid();
            ext.dispatcher.sendMessage(msg, msg._to, null, resultCallback);
        }
    },

    CMD_BROWSER_FULLSCREEN: function (msg, resultCallback) {
        this._logger.trace("CMD_BROWSER_FULLSCREEN called");

        if (!this._associatedTab.fullScreen) {
            this._logger.error("CMD_BROWSER_FULLSCREEN: not implemented");
            msg.status = "NotImplemented";
            resultCallback(msg);
            return;
        }

        this._associatedTab.fullScreen(function () {
            resultCallback(msg);
        },
            function () {
                this.handleError(error);
                msg.status = "ERROR";
                resultCallback(msg);
            } .bind(this), 
            msg._data.index
        );
    },

    CMD_BROWSER_MINIMIZE: function (msg, resultCallback) {
        this._logger.trace("CMD_BROWSER_MINIMIZE called");

        if (!this._associatedTab.minimize) {
            this._logger.error("CMD_BROWSER_MINIMIZE: not implemented");
            msg.status = "NotImplemented";
            resultCallback(msg);
            return;
        }

        this._associatedTab.minimize(function () {
            resultCallback(msg);
        },
            function () {
                this.handleError(error);
                msg.status = "ERROR";
                resultCallback(msg);
            }.bind(this)
        );
    },

    CMD_BROWSER_RESTORE: function (msg, resultCallback) {
        this._logger.trace("CMD_BROWSER_RESTORE called");

        if (!this._associatedTab.restore) {
            this._logger.error("CMD_BROWSER_RESTORE: not implemented");
            msg.status = "NotImplemented";
            resultCallback(msg);
            return;
        }

        this._associatedTab.restore(function () {
            resultCallback(msg);
        },
            function () {
                this.handleError(error);
                msg.status = "ERROR";
                resultCallback(msg);
            }.bind(this)
        );
    },

    CMD_BROWSER_MAXIMIZE: function (msg, resultCallback) {
        this._logger.trace("CMD_BROWSER_MAXIMIZE called");

        if (!this._associatedTab.maximize) {
            this._logger.error("CMD_BROWSER_MAXIMIZE: not implemented");
            msg.status = "NotImplemented";
            resultCallback(msg);
            return;
        }

        this._associatedTab.maximize(function () {
            resultCallback(msg);
        },
            function () {
                this.handleError(error);
                msg.status = "ERROR";
                resultCallback(msg);
            }.bind(this)
        );
    },

    CMD_BROWSER_HOME: function (msg, resultCallback) {
        this._logger.trace("CMD_BROWSER_HOME: called");

        if (!this._associatedTab.goHome) {
            this._logger.error("CMD_BROWSER_HOME: not implemented");
            msg.status = "NotImplemented";
            resultCallback(msg);
            return;
        }

        this._associatedTab.goHome(function () {
            resultCallback(msg);
        },
            function () {
                this.handleError(error);
                msg.status = "ERROR";
                resultCallback(msg);
            } .bind(this)
        );
    },

    CMD_BROWSER_DELETE_COOKIES: function (msg, resultCallBack) {
        var domain;
        if (msg._data)
            domain = msg._data.text;

        this._logger.trace("Removing cookies" + (domain ? (" for: " + domain) : ""));

        ext.app.deleteCookies(domain, function () {
            this._logger.trace("Removing cookies finished successfully");
            resultCallBack(msg);
        } .bind(this));
    },
    CMD_BROWSER_CLEAR_CACHE: function (msg, resultCallBack) {
        this._logger.trace("Clearing cache");

        ext.app.clearCache(function () {
            this._logger.trace("Clearing cache finished successfully");
            resultCallBack(msg);
        } .bind(this));
    },
    CMD_SPY_START: function (msg, resultCallback) {
        this._logger.trace("CMD_SPY_START: Started");

        this.DispatchMsgToPage(msg, resultCallback);
    },
    CMD_SPY_END: function (msg, resultCallback) {
        this._logger.trace("CMD_SPY_END: Started");

        this.DispatchMsgToPage(msg, resultCallback);
    },

    CMD_MONITOR_MOUSE_START:function(msg,resultCallback){
        this._logger.trace("CMD_MONITOR_MOUSE_START: Started");

        this.DispatchMsgToPage(msg, resultCallback);
    },

    CMD_MONITOR_MOUSE_END:function(msg,resultCallback){
        this._logger.trace("CMD_MONITOR_MOUSE_START: Started");

        this.DispatchMsgToPage(msg, resultCallback);
    },

    SRVC_BATCH_QUERYATTR: function (msg, resCallback) {
        this._logger.trace("SRVC_BATCH_QUERYATTR: Started");
        //the WEB_PN_ID can either be [[id1,id2]] or single id.
        var objIds = Array.isArray(msg._data.WEB_PN_ID) ? msg._data.WEB_PN_ID[0] : [msg._data.WEB_PN_ID];
        var resMsg = new Msg(msg._msgType, msg._to, {});
        var attrNames = msg._data.name;
        delete msg._data.name;
        attrNames = Array.isArray(attrNames) ? attrNames[0] : [attrNames];  //makes sure that the attribute names are in single array.
        this._logger.debug("SRVC_BATCH_QUERYATTR: Going to batch query for the following fields" + attrNames);

        //gather messages for objects in one frame to avoid many inter-process communication
        //each element in the array will be object with the indices of the ids that were gathered together, and the messages
        //for the objects.
        var batchInfo = [];
        objIds.forEach(function (id, idIndex) {
            if (!batchInfo[id.frame])
                batchInfo[id.frame] = { indices: [], msgs: [] };

            batchInfo[id.frame].indices.push(idIndex);
            var tmpMsg = new Msg(MSG_TYPES.QUERY, id, {});
            var indexInData = 1;
            attrNames.forEach((function (attrName) {
                /* Creates an Internal Batch Query message for each of the different AO's
                In case of attribute/style, the keys are received inside the 'data' field and are formed
                from pairs: <Attr Name Index, Key Name> . see the following example:
                
                "data" : 
                [
                [ 0, "attrKey1", 1, "attrKey2", 2, "background-color", 3, "color" ]
                ]

                And should be transformed to:
                "attribute": ["attrKey1", "attrKey2"]

                */
                switch (attrName) {
                    case "attribute":
                    case "style":
                        if (!this._data[attrName])
                            this._data[attrName] = [];

                        var keyNames = Array.isArray(msg._data.data) ? msg._data.data[0][indexInData] : msg._data.data;

                        this._data[attrName].push(keyNames);
                        indexInData += 2;
                        break;
                    case "data":
                        return;
                    default:
                        this._data[attrName] = null;
                }
            }),
			tmpMsg);

            batchInfo[id.frame].msgs.push(tmpMsg);
        }, this);

        if (batchInfo[-1]) {
            batchInfo.push(batchInfo[-1]); // so it's captured by forEach
            if (batchInfo[-1].msgs[0]._to.object !== null)
                this._logger.error("SRVC_BATCH_QUERYATTR: There are messages for page with no content ID");
        }
        // get digits of IDs length
        var ndigits = ("" + objIds.length).length;
        //send message to frame which contains all other msgs
        if (batchInfo.length < 1) {
            this._logger.error("SRVC_BATCH_QUERYATTR: there are no Objects to query ???!?!?");
            resCallback(msg);
            return;
        }
        var numOfResponses = batchInfo.filter(Util.identity).length;
        var waitForAllMessages = new MultipleResponses(numOfResponses);
        batchInfo.forEach(function (info) {
            var tmpMsg = new Msg("INTERNAL_BATCH_QUERYATTR", Util.shallowObjectClone(info.msgs[0]._to), {});
            tmpMsg._to.object = null;
            tmpMsg._data.msgs = info.msgs;
            tmpMsg._data.indices = info.indices;
            this._logger.trace("SRVC_BATCH_QUERYATTR: Going to send the following msg:", tmpMsg);
            var logger = this._logger;
            ext.dispatcher.sendMessage(tmpMsg, null, "chrome", waitForAllMessages.callback(function (isDone, frameResMsg) {
                frameResMsg._data.msgs.forEach(function (objResMsg, index) {
                    //merge back the result into the result message.
                    var objIDIndex = tmpMsg._data.indices[index];
                    // NOTE: the index key should be padded with leading zeros to maintain the relative numeric order in _data map
                    var key = Util.padLeft(objIDIndex, ndigits);
                    resMsg._data[key] = [[]];
                    attrNames.forEach((function (attrName, attrIndex) {
                        var val = objResMsg._data[attrName];
                        if (val !== null && !Util.isUndefined(val)) {
                            var attrValue = null;
                            if (Array.isArray(val)) {
                                // Since we get here on each element in the array we pop from the head of the array the
                                // next value
                                attrValue = val[0];
                                objResMsg._data[attrName] = objResMsg._data[attrName].slice(1);
                            }
                            else {
                                attrValue = val;
                            }
                            if (typeof (attrValue) === "boolean" || typeof (attrValue) === "number")
                                resMsg._data[key][0][attrIndex] = attrValue;
                            else
                                resMsg._data[key][0][attrIndex] = attrValue.toString();
                        }
                        else
                            resMsg._data[key][0][attrIndex] = "VT_EMPTY";
                    }));
                }, frameResMsg);

                //check if there are messages that we are still waiting on.
                if (!isDone)
                    return;

                logger.debug("SRVC_BATCH_QUERYATTR: Thats it finished waiting lets wrap it up");
                resCallback(resMsg);
            }));
        }, this);
    },
    QUERY_DESC_TO_ID: function (msg, resultCallback) {
        this._logger.trace("QUERY_DESC_TO_ID called on:\n", msg);

        // We create this message since that matchPageDescToId removes all the received data from the request msg and result
        this.matchPageDescToId(msg, function (resMsg) {
            if (resMsg._data.WEB_PN_ID.length === 0) {
                this._logger.trace("QUERY_DESC_TO_ID: No direct child (Page) found - look for the object under the Page.");
                this.DispatchMsgToPage(msg, resultCallback); // the original message is dispatched 
            }
            else {
                resultCallback(resMsg);
            }
        } .bind(this));
    },
    matchPageDescToId: function (msg, resultCallback) {
        this._logger.trace("matchPageDescToId called on:\n", msg);

        if (msg._data === null)
            msg._data = {};

        var matchDescMsg = new Msg("MATCH_DESC_TO_ID", null, msg._data);
        this.DispatchMsgToPage(matchDescMsg, (function (resultMsg) {
            this._logger.trace("matchPageDescToId received async result");
            var result = new Msg(msg._msgType, msg._to);
            result._data = resultMsg._data;
            resultCallback(result);
        }).bind(this));
    },
    CMD_BROWSER_EMBED_SCRIPT: function (msg, resultCallback) {
        this._logger.trace("CMD_BROWSER_EMBED_SCRIPT: Started");
        this.DispatchMsgToPage(msg, resultCallback);
    },
    getID: function () {
        return { browser: this._associatedTab.id, page: -1, frame: -1, object: null };
    },
    DispatchMsgToPage: function (msg, resultCallback) {
        this._logger.trace("DispatchMsgToPage: Started with message:\n", msg, "\nDispatching to page: ", this.getPageId());

        var oldTarget = msg._to;
        msg._to = this.getPageId();
        var logger = this._logger;
        ext.dispatcher.sendMessage(msg, null, "chrome", function (resMsg) {
            logger.trace("DispatchMsgToPage: Async Result message:\n", resMsg);
            resMsg._to = oldTarget;
            resultCallback(resMsg);
        });
    },
    getPageId: function () {
        return Util.shallowObjectClone(this._pageId);
    },
    mergeWithBrowserRTID: function (runtimeID) {
        runtimeID.browser = this.getID().browser;
        return runtimeID;
    },
    handleError: function (error) {
        this._logger.trace("handleError: called with error=" + error);
        switch (error) {
            case "tab doesnt exist":
                // Currently we have a situation in Chrome where sometimes two onCreated events are sent instead of one when opening a tab in certain cases.
                var notifyMSg = new Msg("NOTIFY_BROWSER_IS_NOT_VALID", RtIdUtils.GetAgentRtid(), {
                    WEB_PN_ID: this.getID()
                });
                ext.dispatcher.sendMessage(notifyMSg, null, null, Util.identity);
                break;
            default:
                this._logger.error("handleError: unsupported error = ", error);
                break;
        }
    },
    _captureScreenShot: function (resultCallback) {
        this._logger.trace("captureScreenShot: Started");
        var me = this;
        this._associatedTab.captureTabVisibleArea("png",function (dataURI) {
            //the value returned is in the format of <meta data>,<data> and we are interested only in the actual
            //data this is why we are going to extract only the data.
            var resValue = dataURI.split(",");

            resultCallback(SpecialObject.CreateBase64(resValue[1]));
        },
        function(err){
            me.handleError(err);
            resultCallback();
        });
    },

    _initOpenData: function (registrationData) {

        this._logger.trace("initOpenData: Called");
        if (this._openData) {
            // We already have the openData info - return
            return;
        }

        this._openData = { title: registrationData.title, url: registrationData.url };
        this._logger.trace("initOpenData: Initialize _openData with ", this._openData);
    },
    //events
    onclientRegistered: function (client, registrationData, registrationResData) {
        this._logger.info("onNewContentConnected: Called");

        if (this._associatedTab.id !== client.tabID)    //this client is not part of our tab, ignore it.
            return;

        if (registrationData.isPage) {
            this._logger.info("onclientRegistered: Got registration from page");
            this._initOpenData(registrationData); // initializes openData
        }

        registrationResData._settings = this._settings;
    },

    _calculatePartialProperties: function (properties, callback) {
        this._logger.trace("_calculatePartialProperties: Called");

        var partialAttrKeysArr = Object.keys(properties).filter(function (attr) {
            return AttrPartialValueUtil.IsPartialValue(properties[attr]);
        }, this);

        if (partialAttrKeysArr.length === 0) {
            // There are no attributes to calculate. Return.
            callback(properties);
            return;
        }

        var attrObj = Util.objectFromArray(partialAttrKeysArr, null);

        var queryAttrMsg = new Msg(MSG_TYPES.QUERY, this.getID(), attrObj);
        this.QUERY_ATTR(queryAttrMsg, function (resMsg) {
            Util.extend(properties, resMsg._data);
            callback(properties);
        });
    },

    _calculateBrowserAttributes: function (msg, callback) {
        this._logger.trace("_calculateBrowserAttributes: Called");
        if (ext.app.ignoreBrowserDescription) {
            this._logger.debug("_calculateBrowserAttributes: No need to calculate Browser attributes since that it seems we're in a Container not a Browser. Continue.");
            callback(msg);
            return;
        }

        var recordedDescArr = msg._data["recorded description"][0];
        var browserIndex = Util.arrayFindIndex(recordedDescArr, function (specialObj) {
            var description = specialObj.description;
            return description.properties.micclass === "Browser";
        }, this);

        Util.assert(browserIndex >= 0, "_calculateBrowserAttributes: Could not find browser description in recorded description", this._logger);

        var description = recordedDescArr[browserIndex].description;

        var me = this;
        var captureScreenNeeded = !!me._settings && !me._settings.DisableSnapshotChromeFF;

        this._fixDescription(description, function () {
            // Capture screen shot when it is supported, and snapshot is enabled, and it is not browser operation.
            if (!!ext.app.supportActiveScreen && recordedDescArr.length > 1 && captureScreenNeeded) {
                me.GetAttr("tab screen capture", null, null, function (res) {
                    description["tab screen capture"] = res;
                    callback(msg);
                });
            } else {
                callback(msg);
            }
        });
    },
    
    _fixDescription: function(description, callback) {
        this._calculatePartialProperties(description.properties, function (resProperties) {
            description.properties = resProperties;

            // Now calculate partial properties of smart identification
            this._calculatePartialProperties(description['smart identification properties'], function (resSmartIdProps) {
                description['smart identification properties'] = resSmartIdProps;

                // Add creation time to selector => Always !
                var creationTimeName = 'creationtime';
                var creationTimeVal = this.GetAttrSync(creationTimeName);
                description.selector = { name: creationTimeName, value: creationTimeVal };

                // Finished, return !
                callback();
            } .bind(this));
        } .bind(this));
    },

    EVENT_RECORD: function (msg) {
        this._logger.trace("EVENT_RECORD: Called");

        this._recordTransactionQueue = [];

        this._calculateBrowserAttributes(msg, function (resMsg) {
            resMsg._to = ext.dispatcher.getParentDispatcherID();
            ext.dispatcher.sendEvent(resMsg);
        } .bind(this));
    },

    EVENT_INTERNAL_RECORD_QUEUE: function (msg) {
        this._logger.trace("EVENT_INTERNAL_RECORD_QUEUE: Called");

        this._recordTransactionQueue.push(msg);
    },

    EVENT_INTERNAL_RECORD_DISPATCH_QUEUE: function (msg) {
        this._logger.trace("EVENT_INTERNAL_RECORD_QUEUE: Called");

        // We capture the queue and pass it to the callback since that during processing of the Queue, by the _calculateBrowserAttributes
        // EVENT_INTERNAL_RECORD_QUEUE_CLEAR might be received which clears the Queue.
        var transactionQueue = this._recordTransactionQueue;
        transactionQueue.push(msg);
        this._recordTransactionQueue = [];

        this._calculateBrowserAttributes(transactionQueue[0], dispatchEventAndHandleNext.bind(this, transactionQueue, 0));
        return;

        /***** Helper Function ****/
        function dispatchEventAndHandleNext(eventQueue, eventIndex, eventMsg) {
            eventMsg._msgType = "EVENT_RECORD";
            eventMsg._to = ext.dispatcher.getParentDispatcherID();
            ext.dispatcher.sendEvent(eventMsg);

            if (eventIndex === eventQueue.length - 1)
                return; // No more events in queue to handle

            this._calculateBrowserAttributes(transactionQueue[eventIndex + 1], dispatchEventAndHandleNext.bind(this, transactionQueue, eventIndex + 1));
        }
    },

    EVENT_INTERNAL_RECORD_QUEUE_CLEAR: function (msg) {
        this._logger.trace("EVENT_INTERNAL_RECORD_QUEUE_CLEAR: Called");
        this._recordTransactionQueue = [];
    },

    EVENT_INTERNAL_SEND_BROWSER_INFO: function (msg) {
        this._logger.trace("EVENT_INTERNAL_SEND_BROWSER_INFO: called");

        msg._to = this.getPageId();
        ext.dispatcher.sendEvent(msg);
    }
};
