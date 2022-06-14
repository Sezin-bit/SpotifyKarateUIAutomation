// © Copyright 1992-2017 Hewlett Packard Enterprise Development LP
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function ContentDispatcher() {
    this._logger = new LoggerUtil("Content.Dispatcher");
    this._logger.info("ctor: created with registration data");

    this._listeners = {};
    this._responseCallbacks = {};

    this._chromeChannel = BrowserServices.createComChannel(this._logger);
    this._chromeChannel.addListener('event', this.onEvent.bind(this));
    this._chromeChannel.addListener('message', this.onMessage.bind(this));
    this._chromeChannel.addListener('MessageTimedOut', this.onMessageTimedOut.bind(this));
    this._chromeChannel.addListener('response', this.onResponseMessage.bind(this));
    this._chromeChannel.addListener('connected', this.onComChannelConnected.bind(this));
    this._chromeChannel.addListener('connectError', this.onComChannelConnectionFailed.bind(this));

    //FrameCommunication Channel
    this._frameComChannel = new FrameCommunicationChannel();
    this._frameComChannel.addListener('event', this.onEvent.bind(this));
    this._frameComChannel.addListener('message', this.onMessage.bind(this));
    this._frameComChannel.addListener('response', this.onResponseMessage.bind(this));
    this._frameComChannel.addListener('connected', this.onFrameCOMChannelConnected.bind(this));
}

ContentDispatcher.prototype = {
    //members
    _chromeChannel: null,
    _responseCallbacks: null,
    _frameComChannel: null,
    _listeners: null,
    _nextMessageID: 0,
    _initData: {},
    _currentGlobalErrorHandler: null,
    //methods
    init: function () {

    },
    connect: function (initData) {
        this._logger.info("connect: going to connect to extension");
        this._chromeChannel.init();
        this._initData = initData;
        this._chromeChannel.connect();
    },
    sendMessage: function (msg, target, forceCOMType, responseCallback) {
        this._logger.trace("sendMessage: Going to send \n ", msg, "\nto:\n", target);
        //adding the tab so we could dispatch to the correct browser ao
        target = target || msg._to;
        if (this._isRTIDInOurContent(target)) {
            this._logger.trace("sendMessage: The target is located locally");
            return this._dispatchMessageLocally(msg, responseCallback);
        }
        else {
            this._logger.trace("sendMessage: The target is external, looking for the right communication channel to it");
            var comChannel = this._getTargetCOMChannel(target, forceCOMType);

            if (!Util.isUndefined(msg._ContentAsyncInfo))
                this._logger.error("sendMessage : there is already asyncID on this message please handle it");

            if (responseCallback) {
                msg._ContentAsyncInfo = { id: ++ContentDispatcher.prototype._nextMessageID };
                this._responseCallbacks[msg._ContentAsyncInfo.id] = { func: responseCallback, origMsg: msg, globalErrorHandler: this._currentGlobalErrorHandler };
            }
            comChannel.sendMessage(msg, target);

            this._logger.trace("sendMessage: Finished");
        }
    },
    sendEvent: function (msg, target) {
        this._logger.trace("sendEvent: Going to send \n ", msg, "\nto:\n", target);
        target = target || msg._to;

        if (this._isRTIDInOurContent(target)) {
            this._logger.trace("sendEvent: The target is located locally");
            return this._dispatchMessageLocally(msg, Util.identity);
        }
        else {
            this._logger.trace("sendEvent: The target is external, looking for the right communication channel to it");
            var comChannel = this._getTargetCOMChannel(target);
            Util.assert(comChannel, "sendEvent: failed to retrieve target communciation channel for: " + target, this._logger);

            comChannel.sendEvent(msg, target);
        }
    },
    getContainingContextID: function () {
        return this._frameComChannel._closestAncestorID;
    },
    getParentDispatcherID: function () {
        return RtIdUtils.GetExtensionRtId();
    },
    onComChannelConnected: function () {
        this._logger.trace("onComChannelConnected: Called");
        this._resetGlobalErrorHandler();
        this._sendFrameRegistrationMessage();
    },
    onComChannelConnectionFailed: function (reason) {
        this._logger.warn("onComChannelConnectionFailed: Called: ", reason);
        switch (reason) {
            case "timeout":
                this._logger.trace("onComChannelConnectionFailed: Timeout - Reconnecting");
                this._chromeChannel.connect();
                break;
            default:
                this._logger.error("onComChannelConnectionFailed: Unknown Connection Failure Reason");
        }
    },
    onMessageTimedOut: function (timedOutMsg) {
        this._logger.warn("onResendTimer:\n", timedOutMsg, "\n Has Timed out!!!");
        // We are going to resend the inner messages only (not response on UFT messages - we don't have any global error handlers for it - verify it is not set)
        this._resetGlobalErrorHandler();
        switch (timedOutMsg._msgType) {
            case MSG_TYPES.REGISTER_FRAME:
                this._registrationRetryNum = this._registrationRetryNum ? ++this._registrationRetryNum : 1;
                if (this._registrationRetryNum >= 60) {
                    this._logger.warn("onMessageTimedOut: The number of retries has exceed going to stop registration");
                    return;
                }
                this.connect(timedOutMsg._data);
                break;
            case "Frame Attached":
                this.sendMessage(timedOutMsg);
                break;
            default:
                this._logger.error("onResendTimer: Unsupported message type:", timedOutMsg._msgType);
                break;
        }
        this._logger.trace("onResendTimer: Finished");
    },

    onMessage: function (msg, sender, resultCallback) {
        this._logger.trace("onMessage: Started with ", msg);
        if(!Util.isNullOrUndefined(msg) && msg.version === 1) {
            if(!Util.isNullOrUndefined(content.player)) {
                content.player.onMessage(msg, sender, resultCallback);
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

    onEvent: function (msg, sender) {
        this._logger.trace("onMessage: Started with ", msg);
        this._onMessageInternal(msg, sender, Util.identity);
    },

    _onMessageInternal: function (msg, sender, resultCallback) {
        this._logger.trace("_onMessageInternal: Started with ", msg);
        switch (msg._msgType) {
            case "SRVC_SET_GLOBAL_VARIABLES_INTERNAL":
                this._setSettings(msg._data);
                /* falls through */
            default:
                this._dispatchMessageLocally(msg, resultCallback);
        }
    },

    onResponseMessage: function (msg/*, client*/) {
        this._logger.prettyTrace("onResponseMessage: Started with the following message:\n", msg);

        var asyncInfo = msg._ContentAsyncInfo;
        delete msg._ContentAsyncInfo;

        if (!asyncInfo) {
            this._logger.debug("onResponseMessage: The message has no async info");
            return;
        }

        if (Util.isNullOrUndefined(asyncInfo.id)) {
            this._logger.error("onResponseMessage: asyncInfo does not contain a cookie id");
            return;
        }

        if (!this._responseCallbacks[asyncInfo.id]) {
            this._logger.error("onResponseMessage: No call back info for message with async Cookie =", asyncInfo.id);
            return;
        }

        //since the orig message was the one that we set on the extInfo we need to delete it from there.
        delete this._responseCallbacks[asyncInfo.id].origMsg._ContentAsyncInfo;

        if (!this._responseCallbacks[asyncInfo.id].func) {
            this._logger.debug("onResponseMessage: No call back for message with async Cookie =", asyncInfo.id);
            return;
        }

        var func = this._responseCallbacks[asyncInfo.id].func;
        this._currentGlobalErrorHandler = this._responseCallbacks[asyncInfo.id].globalErrorHandler;

        try {
            func(msg);
        }
        catch (e) {
            this._logger.error("onResponseMessage: Got exception, Call global error callback - Stack: ", e);
            if (this._currentGlobalErrorHandler)
                this._currentGlobalErrorHandler(e);
            else
                this._logger.warn("onResponseMessage: global error callback is not set");
        }
        this._resetGlobalErrorHandler();
        delete this._responseCallbacks[asyncInfo.id];
    },
    disconnect: function () {
        this._logger.trace("disconnect: Started");

        this._chromeChannel.disconnect();
    },
    addListener: function (eventName, listenerObj) {
        this._logger.info("addListener: called");
        if (!this._listeners[eventName])
            this._listeners[eventName] = [];

        this._listeners[eventName].push(listenerObj);
    },
    removeListener: function (eventName, listenerObj) {
        this._logger.info("removeListener: called");
        if (!this._listeners[eventName]) {
            this._logger.error("removeListener: Trying to remove listener that is not registered");
            return;
        }
        var listenerIdx = this._listeners[eventName].indexOf(listenerObj);
        if (listenerIdx === -1) {
            this._logger.error("removeListener: Removing unknown listener");
            return;
        }
        if (this._inMiddleOfEvent)
            this._listeners[eventName][listenerIdx].toBeDeleted = true;
        else
            this._listeners[eventName].splice(listenerIdx, 1);
    },
    dispatchEvent: function (eventName) {
        if (!this._listeners[eventName]) {
            this._logger.trace("dispatchEvent: no listeners found for event: ", eventName);
            return;
        }

        //fix the argument array by removing the event name and chrome port and adding the client port
        var args = Util.makeArray(arguments);
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
    //private methods
    _getTargetCOMChannel: function (target, forceCOMType) {
        this._logger.trace("_getTargetCOMChannel: Started for target:", target, " forceCOMType is:", forceCOMType);
        switch (forceCOMType) {
            case "chrome":
                return this._chromeChannel;
            case "frame":
                return this._frameComChannel;
            default:
                break;
        }

        if (this._isRTIDInOurContent(target)) {
            this._logger.error("_getTargetCOMChannel: The RTID is in our content no need for COM Channel");
            return null;
        }

        if (RtIdUtils.IsRTIDExtension(target))
            return this._chromeChannel;

        if (RtIdUtils.IsRTIDFrame(target) || RtIdUtils.IsRTIDAO(target))
            return this._frameComChannel;

        if (RtIdUtils.IsRTIDPage(target) || RtIdUtils.IsRTIDBrowser(target) || RtIdUtils.IsRTIDAgent(target))
            return this._chromeChannel;

        this._logger.error("_getTargetCOMChannel: no COMChannel has returned!!!");
    },
    _dispatchMessageLocally: function (msg, resultCallback) {
        var ao = this._getTargetAOAccordingToRTID(msg._to);
        if (!ao) {
            this._logger.error("_dispatchMessageLocally: _getTargetAOAccordingToRTID  didn't find AO in container");
            msg.status = "TargetObjectNotFound";
            if (resultCallback)
                resultCallback(msg);
            return;
        }

        var extAsyncInfo = msg._extAsyncInfo;
        var globalErrorHandler = this._currentGlobalErrorHandler;
        var logger = this._logger;

        ao.onMessage(msg, function (resMsg) {
            if (extAsyncInfo)
                resMsg._extAsyncInfo = extAsyncInfo;

            try {
                if (resultCallback)
                    resultCallback(resMsg);
            }
            catch (e) {
                logger.error("_dispatchMessageLocally: Exception occurred in ao.onMessage's on response - call global error callback. ", e.stack);
                if (globalErrorHandler)
                    globalErrorHandler(e);
                else
                    logger.warn("_dispatchMessageLocally: global error callback is not set");
            }
        });
    },
    _isRTIDInOurContent: function (id) {
        // In our content we handle only Frames and AOs
        if (!RtIdUtils.IsRTIDAO(id) && !RtIdUtils.IsRTIDFrame(id))
            return false;

        var ourFrameID = content.frame.getID();

        if (ourFrameID.frame !== id.frame)
            return false;

        //we check for -1 since we might get request before our runtime ID was set
        if ((id.page !== ourFrameID.page) && (ourFrameID.page !== -1))
            return false;

        if ((id.browser !== ourFrameID.browser) && (ourFrameID.browser !== -1))
            return false;

        return true;
    },
    _getTargetAOAccordingToRTID: function (targetRTID) {
        this._logger.trace("_getTargetAOAccordingToRTID: Started for target RTID:", targetRTID);

        if (!this._isRTIDInOurContent(targetRTID)) {
            this._logger.error("_getTargetAOAccordingToRTID: This RTID is not for us no AO will be returned");
            return null;
        }

        if (targetRTID.object === null) {
            this._logger.trace("_getTargetAOAccordingToRTID: The target is Frame AO");
            return content.frame;
        }
        else {
            this._logger.trace("_getTargetAOAccordingToRTID: The target is regular AO");
            var associatedElement = content.rtidManager.GetElementFromID(targetRTID.object);
            if (associatedElement == null) {
                this._logger.warn("_getTargetAOAccordingToRTID: Ge associated element from rtid failed");
                return null;
            }

            if (associatedElement instanceof DotObjJSProxy) // for DotObj we store the proxy
                return associatedElement;
            else if (associatedElement instanceof Range)
                return content.kitsManager.createVirtualTextAO(associatedElement, content.frame.getID());

            return content.kitsManager.createAO(associatedElement, content.frame.getID());
        }

        return null;
    },
    _setSettings: function (newSettings) {
        this._logger.trace("_setSettings: Started");

        content.settings = content.settings || {};
        for (var p in newSettings) {
            Object.defineProperty(
					content.settings,
					p,
					{
					    value: newSettings[p],
					    writable: false,
					    configurable: true,
					    enumerable: true
					}
			);
        }
        if (typeof(SAPKitFactory) !== "undefined" && SAPKitFactory.updateFrameContents) {
            SAPKitFactory.updateFrameContents();
        }
    },
    _onRegistrationResult: function (msg) {
        this._logger.info("_onRegistrationResult: Started");
        var regResult = msg._data;
        this._logger.debug("_onRegistrationResult: Registration result for tabID is ", regResult.tabID);
        
        if (regResult.status === "pending") {
            this._logger.debug("_onRegistrationResult: registration status is pending, Browser is not ready. Wait.");
            Util.setTimeout(this._sendFrameRegistrationMessage.bind(this), 500);
            return;
        }

        //Sets the logging settings to both logger and HTMLLogger.
        LoggerUtilSettings.setSettings(regResult.logSettings);
        content.domSubscriber.initHTMLLogger(regResult.logSettings);
        //sets the settings that we got for our context.
        this._setSettings(regResult._settings);
        this.dispatchEvent("RegistrationResult", regResult);

        //initialize the frame communication with our Frame's RTID
        this._frameComChannel.init({
            frameID: content.frame.getID()
        });
        this._frameComChannel.connect({
            isPage: this._initData.isPage
        });
    },
    onFrameCOMChannelConnected: function () {
        this._logger.info("onFrameCOMChannelConnected: Started");
        this._resetGlobalErrorHandler();
        DotObjUtil.InstallDotObjectSupport();
        var frameAttachMessage = new Msg("Frame Attached", this.getParentDispatcherID(), { frameID: content.frame.getID() });
        this._logger.info("onFrameCOMChannelConnected: Dispatching Frame Attached Message: ", function () { return JSON.stringify(content.frame.getID()); });
        this.sendMessage(frameAttachMessage);

        if (typeof(PageProxy) !== "undefined") {
            PageProxy.install();
        }
    },

    _resetGlobalErrorHandler: function () {
        this._currentGlobalErrorHandler = null;
    },

    _setGlobalErrorHandler: function (msg, resultCallback) {
        this._currentGlobalErrorHandler = function (origMsg, error) {
            origMsg.status = error ? error.message : "ERROR";
            origMsg.details = error ? error.message : null;
            resultCallback(origMsg);
        }.bind(this, msg);
    },

    _sendFrameRegistrationMessage: function () {
        var registerFrameMsg = new Msg(MSG_TYPES.REGISTER_FRAME, this.getParentDispatcherID(), this._initData);
        this.sendMessage(registerFrameMsg, null, null, this._onRegistrationResult.bind(this));
    },
};
