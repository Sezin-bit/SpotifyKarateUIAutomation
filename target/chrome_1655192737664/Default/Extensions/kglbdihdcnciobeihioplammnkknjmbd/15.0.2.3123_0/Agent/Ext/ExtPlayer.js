function ExtPlayer() {
    //this._logger = new LoggerUtil("Ext.Player");
    //this._logger.info("ExtPlayer was created");
    this._knownClients = {};
    this._responseCallback = {};
}

ExtPlayer.prototype = {
    _logger: null,
    _knownClients: null,
    _nextMessageID: 0,
    _responseCallback: null,
    addBrowser: function (browserObj) {
        //this._logger.info("Add browser: \n", browserObj);
        var id = this._getBrowserId(browserObj);
        if (id === -1) {
            return false;
        }
        this._knownClients[id] = browserObj;
    },
    removeBrowser: function (browserObj) {
        //this._logger.info("Remove browser: \n", browserObj);
        var id = this._getBrowserId(browserObj);
        if (id === -1) {
            return false;
        }
        delete this._knownClients[id];
    },
    getBrowser: function(browserId) {
        return this._knownClients[browserId];
    },

    onMessage: function (msg, sender, resultCallback) {
        //this._logger.prettyTrace("onMessage: Received message: \n", msg);
        var browserObj = this.getBrowser(msg["testObject"]["runtimeId"]);
        var targetObj = PlayerUtil.getTargetTestObject(msg["testObject"]);
        if(PlayerTestObjectUtil.isBrowser(targetObj)){
            //this._logger.info("onMessage: Target object is browser, handle request internally");
            this._handleRequestInteranlly(msg, sender, resultCallback);
            return;
        }
        var successCallback = function(result) {
            if (PlayerTestObjectUtil.isPage(targetObj)) {
                //this._logger.info("onMessage: Target object is page, handle request internally");
                this._handleRequestInteranlly(msg, sender, resultCallback);
            } else {
                //this._logger.info("onMessage: Send message to content");
                this.sendMessageToContent(msg, sender, resultCallback);
            }    
        };

        var failureCallback = function(result) {
            //this._logger.error("onMessage: Fail with result: ", result);
            PlayerStateHandler.setErrorCode(msg, result.error);
            resultCallback(msg);
        };

        this.checkEachTestObjectExist(browserObj, msg["testObject"], successCallback.bind(this), failureCallback.bind(this));
    },

    onResponse: function (msg) {
        var asyncInfo = msg._playerAsyncInfo;
        delete msg._playerAsyncInfo;
        //this._logger.info("onResponse: Received message: \n", msg);
        if (!asyncInfo) {
            //this._logger.info("onResponse: has no async information");
            return;
        }
        if (Util.isNullOrUndefined(asyncInfo.id)) {
            //this._logger.info("onResponse: asyncInfo has no id");
            return;
        }
        if (!this._responseCallback[asyncInfo.id]) {
            //this._logger.warn("onResponse: no callback with cookie = ", asyncInfo.id);
            return;
        }
        
        var browserObj = this.getBrowser(msg["testObject"]["runtimeId"]);
        if(Util.isNullOrUndefined(browserObj)){
            var func = this._responseCallback[asyncInfo.id].func;
            func(msg);
            delete this._responseCallback[asyncInfo.id];
            return;
        }
        browserObj._page._cached_screen_rect_for_web_fast_run = null;
        if(Util.isNullOrUndefined(msg.testObject["Description properties"]["smart identification"]))
        {
            var func = this._responseCallback[asyncInfo.id].func;
            func(msg);
            delete this._responseCallback[asyncInfo.id];
            return;
        }
        // fix the browser properties
        browserObj._calculatePartialProperties(msg.testObject["Description properties"]["smart identification"], function (resProperties) {
            msg.testObject["Description properties"]["smart identification"] = resProperties;
            var func = this._responseCallback[asyncInfo.id].func;
            func(msg);
            delete this._responseCallback[asyncInfo.id];
        }.bind(this));
    },

    onRequestTimedout: function(requestMsg) {
        PlayerStateHandler.setErrorCode(requestMsg, PLAYER_STATE_TYPES.TIMED_OUT);
        this.onResponse(requestMsg);
    },

    _handleRequestInteranlly: function (msg, sender, resultCallback) {
        //this._logger.error("_handleRequestInteranlly: TODO!!!:\n", msg);
        var browserObj = this.getBrowser(msg["testObject"]["runtimeId"]);
        if(Util.isNullOrUndefined(browserObj)){
            //TODO
            // can't find browser object, handle this error
            return;
        }
        var targetObj = PlayerUtil.getTargetTestObject(msg["testObject"]);
        if(PlayerTestObjectUtil.isPage(targetObj)){
            browserObj._page.onMessageForPlayer(msg, resultCallback);
        } else if(PlayerTestObjectUtil.isBrowser(targetObj)) {
            // shouldn't get into here
            // Because all the method on Browser object is handled in normal mode
            // not in the fastRun mode
            // TODO
            // shoudl handle this error
            return;
        }
    },

    sendMessageToContent: function (msg, sender, resultCallback) {
        //this._logger.info("sendMessageToContent: Called");
        var testObj = msg.testObject;
        var commId = this._extractTargetIdFromTO(testObj);
        if (commId === false) {
            //this._logger.warn("sendMessageToContent: Error getting commId, return");
            PlayerStateHandler.setErrorCode(msg, PLAYER_STATE_TYPES.METHOD_NOT_IMPL);
            resultCallback(msg);
            return;
        }
        else if (commId === -1) {
            //this._logger.info("sendMessageToContent: Content not registered, retry");
            PlayerStateHandler.setErrorCode(msg, PLAYER_STATE_TYPES.RETRY);
            resultCallback(msg);
            return;
        }

        if (Util.isNullOrUndefined(msg._playerAsyncInfo)) {
            //this._logger.info("sendMessageToContent: Setting player async info");
            msg._playerAsyncInfo = { id: ++ExtPlayer.prototype._nextMessageID };
        }
        this._responseCallback[msg._playerAsyncInfo.id] = { func: resultCallback };

        try {
            var browserObj = this.getBrowser(testObj.runtimeId);
            if(Util.isNullOrUndefined(browserObj)){
                //this._logger.info("sendMessageToContent: Browser is null, send message to content");
                ext.dispatcher.sendMessageToContent(msg, commId);
                return;
            }
            this._handleTestObjectPosition(browserObj, msg.testObject, function(){
                var page = browserObj._page;
                this._handleTestObjectPosition(page, msg.testObject["child"], function(){
                    var position = msg.testObject["child"]["Description properties"]["additionalInfo"];
                    var rect = {};
                    rect.top = position["abs_y"];
                    rect.left = position["abs_x"];
                    rect.right = rect.left + position["width"];
                    rect.bottom = rect.top + position["height"];
                    page._cached_screen_rect_for_web_fast_run = rect;
                    //this._logger.info("sendMessageToContent: After handle test object position, send message to content");
                    ext.dispatcher.sendMessageToContent(msg, commId);
                }.bind(this));
            }.bind(this));
        } catch (e) {
            // If message sent to a disconnected content, exception will be thrown.
            // Return ERROR_RETRY to retry.
            //this._logger.warn("sendMessageToContent: Got exception: ", e);
            delete this._responseCallback[msg._playerAsyncInfo.id];
            PlayerStateHandler.setErrorCode(msg, PLAYER_STATE_TYPES.RETRY);
            resultCallback(msg);
        }
    },

    _handleTestObjectPosition: function(handler, testObject, resultCallback) {
        if(PlayerTestObjectUtil.hasPositionInfo(testObject))
            resultCallback();
        else{
            var positionQueryMsg = new Msg("QUERY_ATTR", handler.getID(), {abs_x: null, abs_y: null, height: null, width: null});
            handler.QUERY_ATTR(positionQueryMsg, function(positionResponseMsg){
                if(Util.isNullOrUndefined(testObject["Description properties"]["additionalInfo"]))
                    testObject["Description properties"]["additionalInfo"] = {};
                Util.extend(testObject["Description properties"]["additionalInfo"], positionResponseMsg._data);
                resultCallback();
            });
        }
    },

    _isBrowserObject: function (obj) {
        if (!obj.id || !RtIdUtils.IsRuntimeId(obj.id)) {
            return false;
        }
        return RtIdUtils.IsRTIDBrowser(obj.id);
    },
    _getBrowserId: function (obj) {
        if (!this._isBrowserObject(obj)) {
            return -1;
        }
        return obj.id.browser;
    },
    _extractTargetIdFromTO: function (obj) {
        //this._logger.info("_extractTargetIdFromTO: Called");
        var browserObj = this._knownClients[obj.runtimeId];
        if (Util.isNullOrUndefined(browserObj)) {
            //this._logger.info("_extractTargetIdFromTO: browserObj is null or undefined, return -1");
            return false;
        }
        var targetObj = PlayerUtil.getTargetTestObject(obj);
        if (PlayerTestObjectUtil.isBrowser(targetObj)) {
            //this._logger.info("_extractTargetIdFromTO: targetObj not Browser, return -1");
            return false;
        }
        if (PlayerTestObjectUtil.isPage(targetObj) || PlayerUtil.isTargetTestObjectInPage(obj)) {
            //this._logger.info("_extractTargetIdFromTO: targetObj is Page or in page, return content ID: ", browserObj._page._contentID);
            return browserObj._page._contentID;
        } else if (PlayerUtil.isTargetTestObjectInFrame(obj)) {
            //this._logger.info("_extractTargetIdFromTO: targetObj in frame, return -1");
            return false;
        }
    },
    checkEachTestObjectExist: function(browserObj, testObj, successCallback, failureCallback) {       
        var micclass = PlayerTestObjectUtil.getMicClass(testObj);
        var retValue = {"micclass": micclass};
        if(micclass !== "Browser" && micclass !== "Page" && micclass !== "Frame"){
            PlayerStateHandler.setErrorCode(retValue, PLAYER_STATE_TYPES.OK);
            successCallback(retValue); 
            return;
        }
        this._checkTestObjectExist(browserObj, testObj, function(currentTO, result){
            if(result.status !== "OK") {
                failureCallback(result);
                return;
            }
            if(Util.isNullOrUndefined(currentTO["child"])) {
                successCallback(result);
                return;
            }
            this.checkEachTestObjectExist(browserObj, currentTO["child"], successCallback, failureCallback);
        }.bind(this));
    },
    _checkTestObjectExist: function(browserObj, testObj, callback) {
        var micclass = PlayerTestObjectUtil.getMicClass(testObj);
        var retValue ={"micclass": micclass};
        if(micclass === "Browser") {
            PlayerStateHandler.setErrorCode(retValue, PLAYER_STATE_TYPES.OK);
            callback(testObj, retValue);
        } else if(micclass === "Page") {
            this._checkPageExist(browserObj, testObj, callback);
        } else {
            PlayerStateHandler.setErrorCode(retValue, PLAYER_STATE_TYPES.OK); 
            callback(testObj, retValue);
        }
    },
    _checkPageExist: function(browerObj, pageTestObj, callback) {
        var pageDesc = pageTestObj["Description properties"]["mandatory"];
        var matchDescMsg = new Msg("MATCH_DESC_TO_ID", null, pageDesc);
        browerObj.DispatchMsgToPage(matchDescMsg, (function (resultMsg) {
            var retValue = {"micclass": "Page"};
            if(Util.isNullOrUndefined(resultMsg._data.WEB_PN_ID)) {
                PlayerStateHandler.setErrorCode(retValue, PLAYER_STATE_TYPES.OBJECT_NOT_FOUND);
                callback(pageTestObj, retValue);
                return; 
            }

            var length = resultMsg._data.WEB_PN_ID.length;
            if(length <= 0 ) {
                PlayerStateHandler.setErrorCode(retValue, PLAYER_STATE_TYPES.OBJECT_NOT_FOUND);
            }else if(length === 1) {
                PlayerStateHandler.setErrorCode(retValue, PLAYER_STATE_TYPES.OK);
            } else{
                PlayerStateHandler.setErrorCode(retValue, PLAYER_STATE_TYPES.OBJECT_NOT_UNIQUE);
            }
            callback(pageTestObj, retValue);
            
        }));
    },

};
