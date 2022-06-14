var InnerChannelMsgType = {
    REQUEST: "request",
    VOIDREQUEST: "voidRequest",
    RESPONSE: "response"
};

function ExternalComChannel(strategy) {
    this._logger = new LoggerUtil("ComChannels.ExternalComChannel");
    this._listeners = [];
    this._applyStrategy(strategy);
    this._innerChannel = this._createInnerChannel();
}

ExternalComChannel.prototype = {
    _listeners: null,
    _innerChannel: null,
    _logger: null,
    _nextUid: 0,
    _pendingMessages: null,

    shouldConnect: function () {
        return this._innerChannel.shouldConnect ? this._innerChannel.shouldConnect() : "unsupported";
    },
    init: function() {
        this._logger.trace("init: called");
        this._initInnerChannel();
        Object.defineProperty(this, "id", {
            value: -1,
            writable: false
        });

        this._logger.trace("init: completed with channel id " + this.id);
    },

    addListener: function(eventName, listenerFunction) {
        this._logger.trace("addListener: called for event " + eventName);

        if(!this._listeners[eventName]) {
            this._listeners[eventName] = [];
        }

        this._listeners[eventName].push(listenerFunction);
    },

    removeListener: function(eventName, listenerFunction) {
        this._logger.trace("removeListener: called for event " + eventName);

        if(!this._listeners[eventName] || this._listeners[eventName].indexOf(listenerFunction) === -1) {
            this._logger.warn("removeListener: Trying to remove listener that is not registered");
            return;
        }

        this._listeners[eventName] = this._listeners[eventName].filter(function(listener) {
            return listener !== listenerFunction;
        });
    },

    connect: function () {
        this._logger.trace("connect: started");
        var serverURL = this._getConnectionURL();

        this._logger.debug("connect: Going to connect to server:" + serverURL);
        try {
            this._innerChannel.connect(serverURL);
        } catch (e) {
            this._logger.error("connect: exception occurred during connection to " + serverURL + ": Error: " + e + "\nStack:" + e.stack);
        }
    },

    disconnect: function() {
        this._logger.trace("disconnect: called");
        this._innerChannel.disconnect();
    },

    sendMessage: function(msg) {
        this._logger.prettyDebug("sendMessage: ==========> ", msg);
        this._sendMessageInternal(msg, InnerChannelMsgType.REQUEST);
    },

    sendEvent: function(msg) {
        this._logger.prettyDebug("sendEvent: ==========> ", msg);
        this._sendMessageInternal(msg, InnerChannelMsgType.VOIDREQUEST);
    },

    onMessage: function(receivedData) {
        this._logger.trace("onMessage: called for message ", receivedData);

        var channelMessage = null;

        if (typeof receivedData === "object")
            channelMessage = receivedData;
        else
            channelMessage = Util.parseJSON(receivedData, this._logger);

        if(channelMessage === null) {
            this._logger.warn("onMessage: parsed message is null");
            return;
        }
        this._logger.trace("onMessage: channelMessage=", channelMessage);
        this._processIncomingChannelMessage(channelMessage);
    },

    onOpen: function() {
        this._logger.trace("onOpen: called");

        this.onConnectionOpened();
        this._dispatchEvent(ExtChannelEvent.CONNECTED, this);
    },

    onConnectionOpened: function() {
        this._logger.trace("onConnectionOpened: called. sending registration message.");
        this._sendRegistrationMessage();
    },

    onClose: function() {
        this._logger.trace("onClose: called");
        this.onConnectionClose();
        this._dispatchEvent(ExtChannelEvent.DISCONNECTED, this);
    },

    onConnectionClose: function() {
    },

    onError: function (error) {
        this._logger.error("onError: channel error occured. error: " + error);
    },

    transformToChannelMessage: function(request) {
        this._logger.trace("transformToChannelMessage: called");

        if (Util.isNullOrUndefined(request)) {
            return request;
        }

        var requestData = request.data;
        var channelMessage = request;

        channelMessage.data = {
            "data": requestData,
            "format": "WebMessageFormat"
        };

        channelMessage.handlerType = ExtComChannelUtil.getHandlerForMessage(requestData);

        return channelMessage;
    },
    
    getChannelType: function() {
        return "EXTERNAL";
    },

    _initInnerChannel: function() {
        this._logger.trace("_initInnerChannel: called");
        this._innerChannel.addListener(InnerChannelEvent.MESSAGE, this.onMessage.bind(this));
        this._innerChannel.addListener(InnerChannelEvent.OPEN, this.onOpen.bind(this));
        this._innerChannel.addListener(InnerChannelEvent.CLOSE, this.onClose.bind(this));
        this._innerChannel.addListener(InnerChannelEvent.ERROR, this.onError.bind(this));
    },
    _sendMessageInternal: function(msg, type) {
        this._logger.trace("_sendMessageInternal: called for ", msg);


        var request = this._prepareRequest(msg, type);
        var channelMessage = this.transformToChannelMessage(request);
        this._innerChannel.sendMessage(channelMessage);
    },

    _prepareRequest: function(msg, type) {
        return {
            "type": type || InnerChannelMsgType.REQUEST,
            "uid": this._getNewUid(),
            "data": msg
        };
    },

    _prepareResponse: function(msg, requestUid) {
        return {
            "type": InnerChannelMsgType.RESPONSE,
            "uid": requestUid,
            "data": msg
        };
    },

    _processIncomingChannelMessage: function(channelMessage) {
        this._logger.trace("_processIncomingChannelMessage: processing message [#" + channelMessage.uid + "] of type '" + channelMessage.type + "'");

        switch(channelMessage.type) {
            case InnerChannelMsgType.REQUEST:
                this._processRequest(channelMessage);
                break;
            case InnerChannelMsgType.VOIDREQUEST:
                this._processVoidRequest(channelMessage);
                break;
            case InnerChannelMsgType.RESPONSE:
                this._processResponse(channelMessage);
                break;
            default:
                this._logger.error("_processIncomingChannelMessage: unsupported message type [" + channelMessage.type + "] - dropping the message");
        }
    },

    _processRequest: function(channelMessage) {
        this._logger.trace("_processRequest: called");
        var uid = null;

        try {
            uid = channelMessage.uid;
            var innerData = this._extractPayloadFromChannelMessage(channelMessage);
            this._logger.prettyDebug("Receiving Request id=: ", uid, " <========== ", innerData);
            this._dispatchEvent(ExtChannelEvent.MESSAGE,
                innerData,
                null,
                function(resMsg) {
                    this._logger.trace("_processRequest: got response for request ", uid, " - send it");
                    this._logger.prettyDebug("Sending Response id=: ", uid, " ==========> ", resMsg);
                    var responseChannelMessage = this._generateResponseMsg(resMsg,uid);
                    this._innerChannel.sendMessage(responseChannelMessage);
                } .bind(this));
        } catch(e) {
            this._logger.error("_processRequest: ", e);
            channelMessage.type = InnerChannelMsgType.RESPONSE;
            if (innerData) {
                innerData.status = e.message || "ERROR";
            }
            this._logger.trace("_processRequest: send the message back with ERROR status");
            this._logger.prettyDebug("Sending Error Response id=: ", uid, " ==========> ", channelMessage);
            this._innerChannel.sendMessage(channelMessage);
        }
    },

    _processVoidRequest: function(channelMessage) {
        this._logger.trace("_processVoidRequest: called");
        var uid = channelMessage.uid;
        var logger = this._logger;
        this._dispatchEvent(ExtChannelEvent.MESSAGE,
            this._extractPayloadFromChannelMessage(channelMessage),
            null,
            function(resMsg) {
                logger.trace("_processVoidRequest: request ", uid, " completed. Result: ", resMsg);
            });
    },

    _processResponse: function(channelMessage) {
        this._logger.trace("_processResponse: called");
        var innerMsg = this._extractPayloadFromChannelMessage(channelMessage);
        this._dispatchEvent(ExtChannelEvent.RESPONSE, innerMsg);
    },

    _extractPayloadFromChannelMessage: function(channelMessage) {
        this._logger.trace("_extractPayloadFromChannelMessage: called");
        return channelMessage.data.data;
    },

    _dispatchEvent: function(eventName) {
        this._logger.trace("_dispatchEvent: called for event: " + eventName);

        if(!this._listeners[eventName]) {
            this._logger.trace("_dispatchEvent: no listeners found for event: " + eventName);
            return;
        }

        var args = Util.makeArray(arguments);;
        args.splice(0, 1);

        this._listeners[eventName].forEach(function(listener) {
            listener.apply(this, args);
        });
    },

    _getNewUid: function() {
        return ExternalComChannel.prototype._nextUid++;
    },

    toString: function () {
        return "ExternalComChannel";
    },
    _getConnectionURL: function () {
        var defaultDaemonPort = "8822";
        var defaultDaemonAddress = "127.0.0.1";
        var daemonServerPort = ext.app.getSettingValue("UFT_daemonPort") || defaultDaemonPort;
        var daemonServerAddress = ext.app.getSettingValue("UFT_daemonAddress") || defaultDaemonAddress;
        return "ws://" + daemonServerAddress + ":" + daemonServerPort;
    },

    _generateResponseMsg:function(resMsg,uid){
        resMsg.status = resMsg.status ? resMsg.status : "OK";
        var response = this._prepareResponse(resMsg, uid);
        var responseChannelMessage = this.transformToChannelMessage(response);
        return responseChannelMessage;
    },

    _applyStrategy: function (strategy) {
        this._logger.trace("_applyStrategy: called");
        if (!Util.isNullOrUndefined(strategy)) {
            // Apply "override" for methds defined in the strategy object
            for (var prop in strategy) {
                if (typeof strategy[prop] === 'function') {
                    this._logger.debug("_applyStrategy: " + (this[prop] ? "override" : "add") + " method " + prop);
                    this[prop] = strategy[prop];
                }
            }
        }
    },
    
    _createInnerChannel:function(){
      return new WebSocketComChannel();  
    },

    _sendRegistrationMessage: function () {
    }
};