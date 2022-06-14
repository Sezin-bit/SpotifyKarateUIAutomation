function MessageChannelComChannel(context, disableAsyncHelper) {

    // Some browsers (Android < 4.4) do not support the MessageChannel object.
    // So this is a fallback to an alternative communication channel method
    if (typeof (MessageChannel) === "undefined") {
        return new PostMessageComChannel(context);
    }

    switch (context) {
        case "extension":
            this._logger = new LoggerUtil("ComChannels.MessageChannelComChannel.Extension");
            this._mode = "extension";
            this.id = -1;
            MessageChannelComChannel.prototype._ext = this;
            break;
        case "content":
            this._logger = new LoggerUtil("ComChannels.MessageChannelComChannel.Content");
            this._mode = "content";
            this.id = Math.random();
            MessageChannelComChannel.prototype._content = this;
            break;
        default:
            throw new Error("MessageChannelComChannel initialized with an Unknown Context");
    }

    this._logger.info("Ctor: Created id:" + this.id);

    this._listeners = {};

    if(!disableAsyncHelper){
        this._asyncHelper = new AsyncCommunicationHelper({
            timeout: 15 * 1000
        });
        this._asyncHelper.addListener("MessageTimedOut", this);
    }
}

MessageChannelComChannel.prototype = {
    //members
    id: -1,
    _listeners: null,
    _knownTargets: [],
    _asyncHelper: null,
    _nextContentContextId: 0,
    _connectionReceivedIds: {},
    _mode: null,
    _logger: null,
    _pageProxies: [],
    _messageChannel: null,
    _clientTabId: null,

    //methods
    init: function () {
        this._logger.trace("init called");

        switch (this._mode) {
            case "content":
                this._logger.trace("init started listening for Content messages");
                this._messageChannel = new MessageChannel();
                this._messageChannel.port1.onmessage = this._onMessage.bind(this);
                this._messageChannel.port1.start();
                break;
            case "extension":
                this._logger.trace("init started listening for Extension messages");
                window.addEventListener("message", this._onMessage.bind(this), false);
                break;
            default:
                this._logger.error("init: Unsupported context! init failed.");
        }
    },
    // The msg should at least containing following data: 'type', 'sourceId', 'targetId', 'client', 'data'
    // example: {type:"request", sourceId:-1, targetId:100, client:{browser:-2, page:-2...}, data:{...}}
    // example: {type:"response", sourceId:100, targetId:-1, client:{browser:-2, page:-2...}, data:{...}}
    _sendMessageHelper: function (msg) {
        this._logger.trace("sendMessage: send to: ", msg.targetId, " - message:", msg);

        var proxy = null;
        var shouldUseSyncDispatching = false;
        switch (this._mode) {
            case "content":
                proxy = this._messageChannel.port1;
                if (MessageChannelComChannel.prototype._ext) // if ._ext exists, then the extension is in the same context as us (content)
                    shouldUseSyncDispatching = true;
                break;
            case "extension":
                if (this._knownTargets[msg.targetId])
                    proxy = this._knownTargets[msg.targetId];

                // Make sure the id we're dispatching to is the id of the page in this context
                if (MessageChannelComChannel.prototype._content && MessageChannelComChannel.prototype._content.id === msg.targetId)
                    shouldUseSyncDispatching = true;
                break;
        }

        if (!proxy) {
            this._logger.error("sendMessage: No Proxy found. Returning - sending message failed !");
            return;
        }

        this._updateMessageWithNeededInfo(msg);

        if (shouldUseSyncDispatching) {
            this._sendMessageInThisContext(proxy, msg);
            return;
        }

        if (this.id === -1 || this.id >= 1) // Initialized & Ready for dispatching messaging
            this._doPostMessage(proxy, msg);
        else
            this._logger.trace("sendMessage: ComChannel still not ready. Message sending is delayed");

        this._addRequestAsyncMsgToQueue(msg);
    },
    _sendMessageInThisContext: function (proxy, msgToSend) {
        this._logger.trace("_sendMessageInThisContext: sending message locally");

        var otherMessageChannel = this._mode === "extension" ? MessageChannelComChannel.prototype._content : MessageChannelComChannel.prototype._ext;

        this._addRequestAsyncMsgToQueue(msgToSend);

        otherMessageChannel._onMessage({
            data: msgToSend,
            srcElement: proxy
        });
    },
    _envelopeMsg: function(msgData, client, type, msgEv) {
        this._logger.trace("_envelopeMsg: called");
        var targetId =  this._mode === "content" ? -1 : client;
        var theMsg = msgEv || {};
        theMsg.sourceId = this.id;
        theMsg.data = msgData;
        theMsg.targetId = targetId;
        theMsg.client = client;
        theMsg.type = type;
        
        return theMsg;
    },
    sendMessage: function (msg, destTargetId) {
        this._logger.trace("sendMessage: called");
        var msgToSend = this._envelopeMsg(msg, destTargetId, "request");
        this._sendMessageHelper(msgToSend);
    },
    sendEvent: function (msg, destTargetId) {
        this._logger.trace("sendEvent: called");
        var msgToSend = this._envelopeMsg(msg, destTargetId, "event");
        this._sendMessageHelper(msgToSend);
    },
    addListener: function (eventName, listenerFunction) {
        this._logger.trace("addListener: called for event: " + eventName);
        if (!this._listeners[eventName])
            this._listeners[eventName] = [];

        if (this._listeners[eventName].indexOf(listenerFunction) === -1)
            this._listeners[eventName].push(listenerFunction);
    },
    removeListener: function (eventName, listenerFunction) {
        this._logger.trace("removeListener: called");
        if (!this._listeners[eventName]) {
            this._logger.trace("removeListener: Trying to remove listener that is not registered");
            return;
        }
        this._listeners[eventName] = this._listeners[eventName].filter(function (listener) {
            return listener !== listenerFunction;
        });
    },
    dispatchEvent: function (eventName, client) {
        this._logger.trace("dispatchEvent: called for event " + eventName);
        // Get  the unnamed parameters to the function
        var args = Util.makeArray(arguments).slice(2);

        if (typeof (args[args.length - 1]) === "function")
            args.splice(args.length - 1, 0, client); // add client before last argument in case the last argument is a callback function
        else
            args.push(client);

        if (this._listeners[eventName]) {
            this._listeners[eventName].forEach(function (listener) {
                listener.apply(this, args);
            });
        }
    },

    _onMessage: function (msgEv) {
        var msgData = msgEv.data;
        if ((!msgData.targetId) || (msgData.targetId !== this.id)) {
            return;
        }

        this._logger.trace("_onMessage: Received a message from: ", msgData.sourceId, " - the msg: ", msgData);

        switch (msgData.type) {
            case "connect":
                this._onConnect(msgData, msgEv.ports[0]);
                break;
            case "connectResponse":
                this._onConnectResponse(msgData);
                break;
            case "disconnect":
                this._onDisconnect(msgData, msgEv.srcElement);
                break;
            case "response":
                    this._setAckMessage(msgData);
                /* falls through */
            case "event":
                this._logger.trace("_onMessage: This is response message: sourceId=" + msgData.sourceId + " , targetId=" + msgData.targetId);
                this.dispatchEvent(msgData.type, this._getClient(msgEv.srcElement, msgData.sourceId), msgData.data);
                break;
            case "request":
                this._logger.trace("_onMessage: This is request message");
                this._handleRequest(this._getClient(msgEv.srcElement, msgData.sourceId), msgEv);
                break;
            default:
                this._logger.trace("_onMessage: unhandled message format: " + msgData.type);
        }
    },
    connect: function () {
        this._logger.trace("connect: called");
        switch (this._mode) {
            case "extension":
                break;
            case "content":
                var connectMsg = { type: "connect", sourceId: this.id, targetId: -1, _debugInfo: { url: location.href } };
                this._logger.trace("connect: dispatching connect message: ", connectMsg);
                window.top.postMessage(connectMsg, '*', [this._messageChannel.port2]);
                break;
        }
    },
    disconnect: function () {
        this._logger.trace("disconnect: called ");
        switch (this._mode) {
            case "extension":
                this._logger.error("disconnect: houston we have a problem");
                break;
            case "content":
                var disconnectMsg = { type: "disconnect", sourceId: this.id, targetId: -1, _debugInfo: { url: location.href } };
                this._logger.trace("disconnect: dispatching Disconnect message: ", disconnectMsg);
                this._doPostMessage(this._messageChannel.port1, disconnectMsg);
                break;
        }
    },

    // Internal functions
    _onConnect: function (message, port) {
        this._logger.trace("_onConnect: called with request: ", message);

        var returnMsg = { type: "connectResponse", targetId: message.sourceId, sourceId: this.id };

        if (this._connectionReceivedIds[message.sourceId]) {
            this._logger.info("_onConnect: Received two connection requests from the same content: " + message.sourceId + " which was already given the value: " + this._connectionReceivedIds[message.sourceId]);
            returnMsg.allocatedId = this._connectionReceivedIds[message.sourceId];
        }
        else if (message.sourceId >= 1) {
            this._logger.info("_onConnect: Received a connection request from an already intialized frame: " + message.sourceId);
            returnMsg.allocatedId = message.sourceId;
            this._knownTargets[message.sourceId].onmessage = null;//clear the old port
            this._knownTargets[message.sourceId] = port; //save the new port
            this._knownTargets[message.sourceId].onmessage = this._onMessage.bind(this);
        }
        else {
            var newClientId = this._setTargetId(port);
            this._logger.trace("_onConnect: Newly Connected Target Id: " + newClientId);
            port.onmessage = this._onMessage.bind(this);

            this._knownTargets[newClientId] = port;

            var client = this._getClient(port, newClientId);
            this._logger.debug("_onConnect: dispatching 'clientConnected' to ", client);
            this.dispatchEvent('clientConnected', client);

            this._connectionReceivedIds[message.sourceId] = newClientId;
            returnMsg.allocatedId = newClientId;
        }

        this._logger.trace("_onConnect: dispatching connection response: ", returnMsg);
        this._doPostMessage(port, returnMsg);
    },

    _onConnectResponse: function (message) {
        this._logger.trace("_onConnectResponse: Connection Response: ", message);
        Util.assert((this.id < 1) || (this.id === message.allocatedId), "_onMessage: connectResponse: received id: " + message.allocatedId + " while my id is: " + this.id, this._logger);

        this.id = message.allocatedId;

        this.dispatchEvent("connected", this.id);
    },

    _onDisconnect: function (message, target) {
        this._logger.trace("_onDisconnect: Received Disconnection From: ", message);

        var clientId = message.sourceId;
        Util.assert(clientId >= 0, "_onDisconnect: Error while trying to disconnect - received an invalid sourceId: " + clientId, this._logger); // Source ID can't be an ID of the Extension and Content Id is always >= 0

        if (clientId < 1) {
            // If frame sent a disconnection before it finished registration, it will send the temp id as the source id (reproduced in Gmail.com of August, 2013)
            // In this case we'll do the mapping manually
            this._logger.info("_onDisconnect: Received a disconnection request from a Frame that didn't initialize yet: " + clientId + " - overriding the id with: " + this._connectionReceivedIds[clientId]);
            clientId = this._connectionReceivedIds[clientId];
            if (!clientId) 
                return;
        }

        //cleanup the known clients.
        delete this._knownTargets[clientId];
        delete this._connectionReceivedIds[clientId];

        var client = { tabID: this._clientTabId.id, windowId: this._clientTabId.windowId, id: clientId };
        this._logger.debug("clientDisconnected: dispatching 'clientDisconnected' to ", client);
        this.dispatchEvent("clientDisconnected", client);
    },

    _handleRequest: function (client, msgEv) {
        this._logger.trace("_handleRequest: dispatching a REQUEST message");
        if (!this._listeners.message) {
            return;
        }

        var msgData = msgEv.data.data;
        try {
            this.dispatchEvent('message', client, msgData, sendResponse.bind(this));
        }
        catch (e) {
            this._logger.error("_handleRequest: Got Exception:" + e + " Details: " + (e.Details || "No details found in exception") + "\nStack:" + e.stack);
            if (e.message)
                msgData.status = e.message;
            else
                msgData.status = "ERROR";
            sendResponse.call(this, msgData);
        }

        return;

        /** Helper function **/
        function sendResponse(resMsg) {
            var msg = msgEv.data;
            this._logger.trace("sendResponse: Dispatching response to: " + msg.sourceId);

            if (!resMsg.status)
                resMsg.status = "OK";

            var msgToSend = this._envelopeMsg(resMsg, msg.sourceId, "response", msg);
            this._sendMessageHelper(msgToSend);
        }
    },

    onMessageTimedOut: function (timedOutMsg) {
        this._logger.warn("onMessageTimedOut: the following message has timed out !!!:", timedOutMsg.data);
        this.dispatchEvent("MessageTimedOut", timedOutMsg.client, timedOutMsg.data);
    },

    _getClient: function (target, contentId) {
        var client = {};
        switch (this._mode) {
            case "content":
                break;
            case "extension":
                if (target) {
                    if (!this._clientTabId) {
                        this._logger.error("_getClient: no clientTabId is set");
                        return;
                    }

                    client = { tabID: this._clientTabId.id, windowId: this._clientTabId.windowId, id: contentId }; // webView is defined in EmbeddedBrowserInterface
                }
        }

        return client;
    },
    _setTargetId: function (target) {
        // Now allocate a new ID for the Frame and store a map from the FrameId to the PageId
        var allocatedContextId = ++MessageChannelComChannel.prototype._nextContentContextId;
        return allocatedContextId;
    },

    _onContentUnloaded: function () {
        this._logger.trace("_onContentUnloaded: Called");
        Util.assert(this._mode === "content", "_onContentUnloaded: Called not from Content!", this._logger); // Should be called only from Content!
        this.disconnect();
    },

    _doPostMessage: function (port, msg) {
        port.postMessage(msg);
    },

    setClientTabId: function (clientTabId) {
        this._clientTabId = clientTabId;
    },
    _updateMessageWithNeededInfo:function(msg){
        if (this._asyncHelper && msg.type === "request")
            this._asyncHelper.updateMessageWithNeededInfo(msg);
    },
    _addRequestAsyncMsgToQueue:function(msg){
        if (this._asyncHelper && msg.type === "request")
            this._asyncHelper.addAsyncMsgToQueue(msg);
    },
    _setAckMessage:function(msg){
        if(this._asyncHelper)
            this._asyncHelper.setAckMessage(msg);
    },
};