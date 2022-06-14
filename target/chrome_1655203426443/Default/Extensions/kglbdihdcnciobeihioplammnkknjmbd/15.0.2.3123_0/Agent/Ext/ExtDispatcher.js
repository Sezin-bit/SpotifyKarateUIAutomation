function ExtDispatcher() {
    this._logger = new LoggerUtil("Ext.Dispatcher");
    this._logger.info("ExtDispatcher was created");

    this.isConnectPerformed = false;
    
    this._listeners = {};
    this._responseCallbacks = {};
    
    this._setExternalComChannel();
    
    //inbound chrome COM channel
    this._inboundChromeCOM = ext.app.createComChannel();
    this._inboundChromeCOM.init();
    this._inboundChromeCOM.addListener('event', this.onEvent.bind(this));
    this._inboundChromeCOM.addListener('message', this.onAsyncMessage.bind(this));
    this._inboundChromeCOM.addListener('response', this.onResponseMessage.bind(this));
    this._inboundChromeCOM.addListener('clientConnected', this.onClientConnect.bind(this));
    this._inboundChromeCOM.addListener('clientDisconnected', this.onClientDisconnect.bind(this));
    this._inboundChromeCOM.addListener('MessageTimedOut', this.onRequestTimedout.bind(this));
}

ExtDispatcher.prototype = {
    isConnectPerformed: false,
    _logger: null,
    _externalComChannel: null,
    _inboundChromeCOM: null,
    _knownClients: [],
    _nextMessageID: 0,
    _responseCallbacks: null,
    _listeners: null,
    _currentGlobalErrorHandler: null,

    shouldConnectExternal:function(){
        return this._externalComChannel.shouldConnect();
    },

    connect: function () {
        this._logger.info("connect: Started");
        this.isConnectPerformed = true;
        this._connectExternalComChannel();
        this._logger.info("connect finished: with daemon channel id ", this._externalComChannel.id);
    },

    disconnect: function () {
        this._logger.trace("disconnect: Called");
        this._externalComChannel.disconnect();
        this._inboundChromeCOM.disconnect();
        this.isConnectPerformed = false;
    },
    
    onUnload: function() {
        if (this._externalComChannel) {
            this._externalComChannel.disconnect();
        }
    },

    sendMessage: function (msg, target, forceCOMType, resultCallback) {
        this._logger.trace("sendMessage: Going to send \n ", msg, "\nto:\n", target);
        target = target || msg._to;

        if (this._isLocalTarget(target)) { // if target is 'local' AO
            return this._dispatchMessageLocally(msg, resultCallback);
        }
        else {
            return this._dispatchMessageExternally(msg, target, forceCOMType, resultCallback);
        }
    },
    sendMessageToContent: function(msg, targetId) {
    	return this._inboundChromeCOM.sendMessage(msg, targetId);
    },
    sendEvent: function (msg, target) {
        this._logger.prettyTrace("sendEvent: Going to send \n ", msg, "\nto:\n", target);
        target = target || msg._to;

        if (this._isLocalTarget(target)) {
            return this._dispatchMessageLocally(msg, Util.identity);
        }
        else {
            this._logger.trace("sendEvent: dispatching event to an external context");
            var comChannel = this._getTargetCOMChannel(target);
            this._transformMessageIfNeeded(msg, target);
            comChannel.sendEvent(msg, target.frame);
        }
    },

    getParentDispatcherID: function () {
        return RtIdUtils.GetTestingToolRtId();
    },

    isIdle: function (tabID) {
        this._logger.trace("isIdle: Started for tab=", tabID);
        //idle means that all of our clients have finished their registration communications.
        var ports = this._knownClients[tabID] || [];
        var unattached = ports.filter(function (p) { return !p.attached; });
        unattached.forEach(function (unAttachPort) {
            unAttachPort.idleTimes = unAttachPort.idleTimes || 0;
            if (unAttachPort.idleTimes++ >= 5) {
                this._logger.warn("isIdle: ", tabID, " Tab unattached port reaches the max idle times. Should clean the times and set the attached flag");
                unAttachPort.attached = true;
                delete unAttachPort.idleTimes;
            }
        }.bind(this));
        return unattached.length === 0;
    },

    getNumberOfClients: function (tabID) {
        this._logger.info("getNumberOfClients: started");
        return this._knownClients[tabID].length;
    },

    addListener: function (eventName, listenerObj) {
        this._logger.info("addListener: called");

        switch (eventName) {
            case "Message":
                this._logger.trace("addListener Message for ", listenerObj.id);
                if (!this._listeners[eventName])
                    this._listeners[eventName] = new WebIdContainer();

                this._listeners[eventName].add(listenerObj.id, listenerObj);
                break;
            default:
                if (!this._listeners[eventName])
                    this._listeners[eventName] = [];

                this._listeners[eventName].push(listenerObj);
                break;
        }
    },

    removeListener: function (eventName, listenerObj) {
        this._logger.info("ExtDispatcher.removeListener: called");
        if (!this._listeners[eventName]) {
            this._logger.error("ExtDispatcher.removeListener: Trying to remove listener that is not registered");
            return;
        }

        switch (eventName) {
            case "Message":
                var listener = this._listeners[eventName].remove(listenerObj.id);
                if (!listener) {
                    this._logger.error("removeListener: Removing unknown listener");
                    return;
                }
                break;
            default:
                var listenerIdx = this._listeners[eventName].indexOf(listenerObj);
                if (listenerIdx === -1) {
                    this._logger.error("removeListener: Removing unknown listener");
                    return;
                }

                if (this._inMiddleOfEvent)
                    this._listeners[eventName][listenerIdx].toBeDeleted = true;
                else
                    this._listeners[eventName].splice(listenerIdx, 1);
                break;
        }
    },

    dispatchEvent: function (eventName) {
        this._logger.info("dispatchEvent: called for event: ", eventName);

        if (!this._listeners[eventName]) {
            this._logger.trace("dispatchEvent: no listeners found for event: ", eventName);
            return;
        }

        //fix the argument array by removing the event name and chrome port and adding the client port
        var args = Util.makeArray(arguments);;
        args.splice(0, 1);

        //we use for statement instead of forEach since the listeners array might change thus we need to take care of it.
        var funcName = "on" + eventName;
        var listeners = this._listeners[eventName];
        this._inMiddleOfEvent = true;
        for (var i = 0; i < listeners.length; ++i) {
            if (!listeners[i].toBeDeleted)
                listeners[i][funcName].apply(listeners[i], args);
        }
        delete this._inMiddleOfEvent;

        //removing listeners that were deleted.
        this._listeners[eventName] = this._listeners[eventName].filter(function (listener) {
            return !listener.toBeDeleted;
        });

    },

    //Events
    onClientConnect: function (client) {
        this._logger.info("onClientConnect started for client=", client);

        if (!this._knownClients[client.tabID] || this._knownClients[client.tabID].length === 0) {
            this._logger.info("onClientConnect: First frame registration for this page for tab:", client.tabID);
            this._knownClients[client.tabID] = [];
        }

        this._knownClients[client.tabID].push(client);
        this._logger.info("onClientConnect: Finished");
    },
    onClientDisconnect: function (client) {
        this._logger.info("onClientDisconnect: Removing Client ", client);

        client = this._getClientFromSender(client);
        var tabId = client.tabID;
        var content = this._knownClients[tabId];
        var index = content.indexOf(client);
        if (index === -1) {
            this._logger.error("onClientDisconnect: disconnect on non existint client");
            return;
        }
        content.splice(index, 1);

        //notifying listeners about client's disconnected.
        this.dispatchEvent("clientUnRegistered", client);

        this._logger.info("onClientDisconnect: Finished");
    },

    onMessage: function (msg, sender, resultCallback) {
        this._logger.prettyTrace("onMessage: Received message: \n", msg);
        if(this._isFastRunMessage(msg)) {
            this._logger.info("onMessage: Dispatch message to ext.player");
            if(!Util.isNullOrUndefined(ext.player)) {
                ext.player.onMessage(msg, sender,resultCallback);
                return;
            }
        }
        this._setGlobalErrorHandler(msg, resultCallback);
        try {
            this._onMessageInternal(msg, sender, resultCallback);
        }
        finally {
            this._resetGlobalErrorHandler();
        }
    },

    _onMessageInternal: function (msg, sender, resultCallback) {
        this._logger.trace("_onMessageInternal: Called");
        
        var func = this._messageHandlers[msg._msgType];

        if (func)
            return func.call(this, msg, sender, resultCallback);
        else
            return this._handleDefaultMessageDispatch(msg, resultCallback);
    },

    onAsyncMessage: function (msg, sender, callback) {
        this._logger.trace("onAsyncMessage: started with message:\n", msg);

        //sending Ack to content to notify that we got the message (and not for handling it) since in some cases
        //the registration takes time and the re-send mechanism is initiated.
        var client = this._getClientFromSender(sender);
        this.onMessage(msg, client, callback);
    },

    onEvent: function (msg, sender) {
        this._logger.trace("onEvent: started with message:\n", msg);
        this._onMessageInternal(msg, sender, Util.identity);
    },

    onResponseMessage: function (msg, client) {
        this._logger.prettyTrace("onResponseMessage: Started with the following message:\n", msg);
        if(this._isFastRunMessage(msg)) {
            this._logger.info("onResponseMessage: Dispatch the response to ext.player");
            if(!Util.isNullOrUndefined(ext.player)) {
                ext.player.onResponse(msg);
                return;
            }
        }
        var asyncInfo = msg._extAsyncInfo;
        delete msg._extAsyncInfo;

        if (!asyncInfo) {
            this._logger.debug("onResponseMessage: The message has no async information");
            return;
        }

        if (Util.isNullOrUndefined(asyncInfo.id)) {
            this._logger.debug("onResponseMessage: asyncInfo does not contain a cookie id");
            return;
        }

        if (!this._responseCallbacks[asyncInfo.id]) {
            this._logger.debug("onResponseMessage: No call back info for message with async Cookie =", asyncInfo.id);
            return;
        }

        if (StatusUtil.isUnexpected(msg.status)) {
            this._logger.error("onResponseMessage: Got error message response. Process anyway. Status: ", msg.status, ". Message: ", msg);
        }

        //since the orig message was the one that we set on the extInfo we need to delete it from there.
        delete this._responseCallbacks[asyncInfo.id].origMsg._extAsyncInfo;
        var func = this._responseCallbacks[asyncInfo.id].func;
        this._currentGlobalErrorHandler = this._responseCallbacks[asyncInfo.id].globalErrorHandler;

        try {
            if (msg.delay) {
                delete msg.delay;
                if (ext.app.isNewMsgDelayEnabled)
                    Util.setTimeout(func.bind(null, msg), 120);
                else {
                    func(msg);
                }
            }
            else
                func(msg);
        }
        catch (e) {
            this._logger.error("onResponseMessage: Got Exception:" + e + " when handling message: ", msg, ", Details: " + (e.Details || "") + ". Call global error callback" + "\nStack:" + e.stack);
            if (this._currentGlobalErrorHandler)
                this._currentGlobalErrorHandler(e);
            else
                this._logger.warn("onResponseMessage: global error callback is not set");
        }

        this._resetGlobalErrorHandler();
        //removed the our async information that we have added to the message.
        delete this._responseCallbacks[asyncInfo.id];
    },

    onRequestTimedout: function(requestMsg,clientId){
        this._logger.warn("onRequestTimedout: Destination ", clientId," on message ", requestMsg);

        if(this._isFastRunMessage(requestMsg)) {
            this._logger.warn("onRequestTimedout: Dispatch the response to ext.player");
            if(!Util.isNullOrUndefined(ext.player)) {
                ext.player.onRequestTimedout(requestMsg);
                return;
            }
        }

        requestMsg.status = "TimedOut";
        this.onResponseMessage(requestMsg,clientId);
    },


    //private methods
    _getTargetCOMChannel: function (target, forceCOMType) {
        this._logger.trace("_getTargetCOMChannel: Started for target:", target, " forceCOMType is:", forceCOMType);
        switch (forceCOMType) {
            case "chrome":
                return this._inboundChromeCOM;
            case "daemon":
                return this._externalComChannel;
            case "uft":
                return this._externalComChannel;
            default:
                break;
        }

        if (RtIdUtils.IsRTIDTestingTool(target))
            return this._externalComChannel;

        if (RtIdUtils.IsRTIDDaemon(target))
            return this._externalComChannel;

        if (RtIdUtils.IsRTIDFrame(target) || RtIdUtils.IsRTIDAO(target))
            return this._inboundChromeCOM;

        this._logger.error("_getTargetCOMChannel: no COMChannel has returned for rtid: ", target, ". Error Stack: " + new Error().stack);
    },
    _getClientFromSender: function (sender) {
        this._logger.trace("_getClientFromSender: started");
        var tabArr = this._knownClients[sender.tabID] || [];
        var resClients = tabArr.filter(function (client) { return sender.id === client.id; });
        return resClients[0];
    },

    _isLocalTarget: function (target) {
        if (!RtIdUtils.IsRuntimeId(target))
            return false;


        if (RtIdUtils.IsRTIDAgent(target) ||
            RtIdUtils.IsRTIDBrowser(target) ||
            RtIdUtils.IsRTIDPage(target))
            return true;

        return false;
    },

    _messageHandlers: {
        "REGISTER_FRAME": function (msg, sender, resultCallback) {
            //sends the registration msg to all known content frames in the same tab.
            this._logger.info("_messageHandlers.REGISTER_FRAME: Got Registration for tab:", sender.tabID, ", sender id:", sender.id);

            //compose the registration data object.
            var registrationInfo = msg._data;
            registrationInfo.frameID = sender.id;
            var registrationResData = {};

            //notifies the listeners that new dispatcher was registered.
            this.dispatchEvent("clientRegistered", sender, registrationInfo, registrationResData);

            //in case there is no registration result data we should ignore it and let content retry.
            if (Object.keys(registrationResData).length === 0) {
                this._logger.warn("_messageHandlers.REGISTER_FRAME: Got error during registration of + " + JSON.stringify(sender) + " going to ignore it.");
                return;
            }
            //sends the reply to the sender.
            registrationResData.tabID = sender.tabID;
            registrationResData.logSettings = LoggerUtilSettings.getLogSettings();
            registrationResData.devicePixelRatio = window.devicePixelRatio || 1;
            msg._data = registrationResData;
            resultCallback(msg);
        },
        "Frame Attached": function (msg, sender, resultCallback) {
            this._logger.trace("_messageHandlers['Frame Attached']: Got 'Frame Attached' for frameID: ", msg._data.frameID);
            sender.attached = true;
            resultCallback(msg);
        },
        "EVENT_INSPECT_ELEMENT": function (msg, sender, resultCallback) {
            this._logger.trace("_messageHandlers.EVENT_INSPECT_ELEMENT: started");
            var inspectMsg = new Msg("EVENT_INSPECT_ELEMENT", msg._data.WEB_PN_ID[0]);
            this.sendEvent(inspectMsg, this.getParentDispatcherID());
            resultCallback(msg);
        },
        "EVENT_INSPECT_CANCEL": function (msg, sender, resultCallback) {
            this._logger.trace("_messageHandlers.EVENT_INSPECT_CANCEL: started");
            var inspectMsg = new Msg("EVENT_INSPECT_CANCEL", this.getParentDispatcherID(), {});
            this.sendEvent(inspectMsg, this.getParentDispatcherID());
            resultCallback(msg);
        },
        "WEBEXT_REPORT_LINE": function (msg, sender,resultCallback) {
            this._logger.trace("_messageHandlers.WEBEXT_REPORT_LINE: started");
            this.sendEvent(msg, this.getParentDispatcherID());
            resultCallback(msg);
        },
        "SRVC_BATCH_QUERYATTR": function (msg, sender, resultCallback) {
            var objIds = Array.isArray(msg._data.WEB_PN_ID) ? msg._data.WEB_PN_ID[0] : [msg._data.WEB_PN_ID];
            if (objIds) {
                this._logger.trace("_messageHandlers.SRVC_BATCH_QUERYATTR: Fixing browser id for SRVC_BATCH_QUERYATTR message to be ", objIds[0].browser);
                msg._to.browser = objIds[0].browser; // Fix message
            }
            else {
                this._logger.error("_messageHandlers.SRVC_BATCH_QUERYATTR: Received SRVC_BATCH_QUERYATTR with no data");
                return;
            }

            this._handleDefaultMessageDispatch(msg, resultCallback);
        }
    },

    _handleDefaultMessageDispatch: function (msg, resultCallback) {
        this._UftToChromeRtid(msg);
        this._logger.trace("_handleMessageDispatch: sending direct message to ", msg._to);

        if (this._isLocalTarget(msg._to)) { // Dispatch to Agent, Browser or Page
            this._dispatchMessageLocally(msg, (function (result) {
                this._logger.prettyTrace("_handleMessageDispatch: received response from Local AO: [ASYNC] \n", result);
                this._ChromeToUftRtid(result);
                resultCallback(result);
            }).bind(this));
        }
        else { // Dispatch to Frame or AO or anything else that resides in the Content
            this._logger.prettyTrace("_handleMessageDispatch: sending message to content:\n", msg);

            ext.dispatcher.sendMessage(msg, null, "chrome", (function (result) {
                this._logger.prettyTrace("_handleMessageDispatch: received message from content: [ASYNC]\n", result);
                this._ChromeToUftRtid(result);
                resultCallback(result);
            }).bind(this));
        }
    },

    _dispatchMessageLocally: function (msg, returnResult) {
        this._logger.trace("_dispatchMessageLocally: dispatching ", returnResult ? "Async " : "Sync", " message to locally, content: ", msg);

        var targetAO = RtIdUtils.IsRTIDAgent(msg._to) ? ext.agent : this._listeners.Message.find(msg._to); // if Agent don't look in container
        if (!targetAO) {
            this._logger.error("_dispatchMessageLocally: unable to find target AO in container for: ", msg._to);
            msg.status = "ERROR";
            returnResult(msg);
            return;
        }

        msg = targetAO.onMessage(msg, returnResult);

        return msg;
    },

    _dispatchMessageExternally: function (msg, target, forceCOMType, resultCallback) {
        this._logger.trace("_dispatchMessageExternally: dispatching message to an external context");
        var comChannel = this._getTargetCOMChannel(target, forceCOMType);

        if (resultCallback) {
            if (!Util.isUndefined(msg._extAsyncInfo))
                this._logger.error("sendMessage: There is already asyncCookie on this message please handle it");
            msg._extAsyncInfo = { id: ++ExtDispatcher.prototype._nextMessageID };
            this._responseCallbacks[msg._extAsyncInfo.id] = { func: resultCallback, origMsg: msg, globalErrorHandler: this._currentGlobalErrorHandler };
        }

        this._transformMessageIfNeeded(msg, target);
        return comChannel.sendMessage(msg, target.frame);
    },

    _getAllClients: function () {
        var clients = [];
        this._knownClients.forEach(function (clientsInTab) {
            clients = clients.concat(clientsInTab);
        });
        return clients;
    },

    _connectExternalComChannel: function () {
        this._logger.trace("_connectToDaemonComChannel: called");
        this._externalComChannel.connect();
    },

    _setExternalComChannel: function () {
        this._logger.trace("_setExternalComChannel: called");
        this._externalComChannel = ext.app.createExternalComChannel();
        this._externalComChannel.init();
        this._externalComChannel.addListener('message', this.onMessage.bind(this));
        this._externalComChannel.addListener('response', this.onResponseMessage.bind(this));
    },


    _transformMessageIfNeeded: function (msg, target) {
        target = target || msg._to;
        if (this._getTargetCOMChannel(target) === this._externalComChannel) {
            this._logger.trace("_transformMessageIfNeeded: transforming message with target: ", target);
            this._ChromeToUftRtid(msg);
        }
    },

    _UftToChromeRtid: function (msg) {
        var aoContainer = this._listeners.Message;
        var logger = this._logger;

        var shouldBeChanged = function (rtid) {
            return rtid && rtid.object && rtid.frame === -1;
        };

        var changeRtid = function (rtid) {
            if (!shouldBeChanged(rtid))
                return;

            var pageObjId = { "browser": rtid.browser, "page": rtid.page, "frame": -1, "object": null };
            var pageAO = aoContainer.find(pageObjId);
            if (!pageAO) {
                logger.error("_UftToChromeRtid::changeRtid: Page ", pageObjId, " doesn't exist in container");
                return;
            }

            logger.trace("_UftToChromeRtid.changeRtid: changing from rtid ", rtid);
            rtid.frame = pageAO._contentID;
            logger.trace("_UftToChromeRtid.changeRtid: changed to rtid ", rtid);
        };

        if (!msg)
            return;

        // Fix the _to
        changeRtid(msg._to);

        // Fix the WEB_PN_ID value(s) in Data
        if (msg._data && msg._data.WEB_PN_ID) {
            var objIds = Array.isArray(msg._data.WEB_PN_ID) ? msg._data.WEB_PN_ID : [msg._data.WEB_PN_ID];
            objIds = Array.isArray(objIds[0]) ? objIds[0] : objIds; // Sometimes its an array inside an array [[]]
            objIds.forEach(function (id) {
                changeRtid(id);
            });
        }

    },

    _ChromeToUftRtid: function (msg) {
        var aoContainer = this._listeners.Message;
        var logger = this._logger;

        if (!msg)
            return;

        // Revert the _to
        revertRtid(msg._to);

        // Events that are sent to UFT require the WEB_PN_ID of the object which has sent that event to be in the "to" value
        if (RtIdUtils.IsRTIDTestingTool(msg._to)) {
            var toVal = Array.isArray(msg._data.WEB_PN_ID) ? msg._data.WEB_PN_ID[0] : msg._data.WEB_PN_ID;
            msg._to = Array.isArray(toVal) ? toVal[0] : toVal;
            Util.assert(RtIdUtils.IsRuntimeId(msg._to), "_ChromeToUftRtid: failed to change the 'to' part of message: " + JSON.stringify(msg), this._logger);
        }

        if (msg._data) {            
            // Revert the WEB_PN_ID value(s) in Data
            if (msg._data.WEB_PN_ID) {
                var objIds = Array.isArray(msg._data.WEB_PN_ID) ? msg._data.WEB_PN_ID : [msg._data.WEB_PN_ID];
                objIds.forEach(function (id) {
                    revertRtid(id);
                });
            }

            // Revert the ancestor value in Data
            if (msg._data.ancestor)
                revertRtid(msg._data.ancestor);
        }

        return;
        // Helper functions
        // Since our Page lives both in the extension side and content side it/they have seperate RTIDs
        // The following functions translate the page's content-side RTID to the normal RTID expected by UFT
        function shouldRevert(rtid) {
            if (rtid && rtid.object) {
                var pageObjId = { "browser": rtid.browser, "page": rtid.page, "frame": -1, "object": null };
                var pageAO = aoContainer.find(pageObjId);
                if (!pageAO) {
                    logger.error("_ChromeToUftRtid::changeshouldRevertRtid: Page ", pageObjId, " doesn't exist in container");
                    return;
                }

                return (pageAO._contentID === rtid.frame);
            }
            return false;
        };

        function revertRtid(rtid) {
            if (!shouldRevert(rtid))
                return;

            logger.trace("_ChromeToUftRtid.revertRtid: reverting the rtid.frame of ", rtid);
            rtid.frame = -1;
            logger.trace("_ChromeToUftRtid.revertRtid: rtid reverted to  ", rtid);
        };
    },

    _resetGlobalErrorHandler: function () {
        this._currentGlobalErrorHandler = null;
    },

    _setGlobalErrorHandler: function (msg, resultCallback) {
        this._currentGlobalErrorHandler = function (origMsg, error) {
            origMsg.status = "ERROR";
            origMsg.details = error ? error.message : null;
            resultCallback(origMsg);
        }.bind(this, msg);
    },
    
    _isFastRunMessage: function(msg) {
        return (!Util.isNullOrUndefined(msg) && msg.version === 1);
    }
};