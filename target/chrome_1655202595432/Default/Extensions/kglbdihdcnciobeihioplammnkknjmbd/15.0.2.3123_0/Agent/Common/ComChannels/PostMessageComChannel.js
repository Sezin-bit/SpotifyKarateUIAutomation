function PostMessageComChannel(context) {
    switch (context) {
        case "extension":
            this._logger = new LoggerUtil("ComChannels.PostMessageComChannel.Extension");
            this._mode = "extension";
            this.id = -1;
            PostMessageComChannel.prototype._ext = this;
            break;
        case "content":
            this._logger = new LoggerUtil("ComChannels.PostMessageComChannel.Content");
            this._mode = "content";
            this.id = Math.random();
            PostMessageComChannel.prototype._content = this;
            break;
        default:
            throw new Error("PostMessageComChannel initialized with an Unknown Context");
    }

    this._logger.info("Ctor: Created id:" + this.id);

    this._listeners = {};

    this._asyncHelper = new AsyncCommunicationHelper({
        timeout: 15 * 1000
    });
    this._asyncHelper.addListener("MessageTimedOut", this);
}

PostMessageComChannel.prototype = {
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
    _connectTimerId: null,

    //methods
    init: function () {
        this._logger.trace("init called");

        switch (this._mode) {
            case "content":
                if (PostMessageComChannel.prototype._ext == null)
                    window.addEventListener("unload", this._onContentUnloaded.bind(this), false);

                /* falls through */
            case "extension":
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

        var windowProxy = null;
        var targetId;
        var shouldUseSyncDispatching = false;
        switch (this._mode) {
            case "content":
                targetId = -1; // extension id is always -1
                windowProxy = window.top;
                if (PostMessageComChannel.prototype._ext) // if ._ext exists, then the extension is in the same context as us (content)
                    shouldUseSyncDispatching = true;
                break;
            case "extension":
                if (this._knownTargets[msg.targetId])
                    windowProxy = this._knownTargets[msg.targetId];

                // Make sure the id we're dispatching to is the id of the page in this context
                if (PostMessageComChannel.prototype._content && PostMessageComChannel.prototype._content.id === msg.targetId)
                    shouldUseSyncDispatching = true;
                break;
        }

        if (!windowProxy) {
            this._logger.error("sendMessage: NO Proxy found. Returning - sending message failed !");
            return;
        }

        if (msg.type === "request")
            this._asyncHelper.updateMessageWithNeededInfo(msg);

        if (shouldUseSyncDispatching) {
            this._sendMessageInThisContext(windowProxy, msg);
            return;
        }

        this._logger.prettyTrace("sendMessage: Sending the following object:\n", msg);

        if (this.id === -1 || this.id >= 1) // Initialized & Ready for dispatching messaging
            windowProxy.postMessage(msg, '*');
        else
            this._logger.trace("sendMessage: ComChannel still not ready. Message sending is delayed");

        if (msg.type === "request")
            this._asyncHelper.addAsyncMsgToQueue(msg);
    },

    _sendMessageInThisContext: function (proxy, msgToSend) {
        this._logger.trace("_sendMessageInThisContext: sending message locally");

        var otherMessageChannel = this._mode === "extension" ? PostMessageComChannel.prototype._content : PostMessageComChannel.prototype._ext;

        if (msgToSend.type === "request")
            this._asyncHelper.addAsyncMsgToQueue(msgToSend);

        otherMessageChannel._onMessage({
            data: msgToSend,
            source: proxy
        });
    },

    _envelopeMsg: function (msgData, client, type, msgEv) {
        this._logger.trace("_envelopeMsg: called");
        var targetId = this._mode === "content" ? -1 : client;
        var theMsg = msgEv || {};
        theMsg.sourceId = this.id;
        theMsg.data = msgData;
        theMsg.targetId = targetId;
        theMsg.client = client;
        theMsg.type = type;
        theMsg.comChannelId = "_PostMessageComChannel_";

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
        this._logger.trace("addListener: called");
        if (!this._listeners[eventName])
            this._listeners[eventName] = [];

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
        if (!msgData || (msgData.comChannelId !== "_PostMessageComChannel_"))
            return;

        var sourceWindow = msgEv.source;
        if (msgData.targetId !== this.id)
            return;

        if (!sourceWindow) {
            this._logger.error("_onMessage: Received a message without a source window \n" + new Error().stack);
            return;
        }

        this._logger.trace("_onMessage: Received a message from: " + msgData.sourceId);

        switch (msgData.type) {
            case "connect":
                this._onConnect(msgData, sourceWindow);
                break;
            case "connectResponse":
                this._onConnectResponse(msgData);
                break;
            case "disconnect":
                this._onDisconnect(msgData, sourceWindow);
                break;
            case "response":
                this._asyncHelper.setAckMessage(msgData);
                /* falls through */
            case "event":
                this._logger.trace("_onMessage: Mesasge of type '" + msgData.type + "' : sourceId=" + msgData.sourceId + " , targetId=" + msgData.targetId);
                this.dispatchEvent(msgData.type, this._getClient(sourceWindow, msgData.sourceId), msgData.data);
                break;
            case "request":
                this._logger.trace("_onMessage: This is request message");

                this._handleRequest(this._getClient(sourceWindow, msgData.sourceId), msgEv);
                break;
        }
    },
    connect: function () {
        this._logger.trace("connect: called ");
        switch (this._mode) {
            case "extension":
                break;
            case "content":
                var connectMsg = { sourceId: this.id, targetId: -1, _debugInfo: { url: location.href }, type: "connect", comChannelId: "_PostMessageComChannel_" };
                this._logger.trace("connect: dispatching connect message: ", connectMsg);
                window.top.postMessage(connectMsg, '*');
                this._connectTimerId = Util.setTimeout(this._onConnectTimeout.bind(this), 1000);
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
                var disconnectMsg = { type: 'disconnect', sourceId: this.id, targetId: -1, _debugInfo: { url: location.href }, comChannelId: "_PostMessageComChannel_" };
                this._logger.trace("disconnect: dispatching Disconnect message: ", disconnectMsg);
                window.top.postMessage(disconnectMsg, '*');
                break;
        }
    },

    // Internal functions
    _onConnect: function (message, sourceWindow) {
        this._logger.trace("_onConnect: called with request: ", message);

        var returnMsg = { targetId: message.sourceId, sourceId: this.id };

        if (this._connectionReceivedIds[message.sourceId]) {
            this._logger.info("_onConnect: Received two connection requests from the same content: " + message.sourceId + " which was already given the value: " + this._connectionReceivedIds[message.sourceId]);
            returnMsg.allocatedId = this._connectionReceivedIds[message.sourceId];
        }
        else if (message.sourceId >= 1) {
            this._logger.info("_onConnect: Received a connection request from an already intialized frame: " + message.sourceId);
            returnMsg.allocatedId = message.sourceId;
        }
        else {
            var newClientId = this._setTargetId(sourceWindow);
            this._logger.trace("_onConnect: Newly Connected Target Id: " + newClientId);
            if (Util.isNullOrUndefined(newClientId)) {
                this._logger.trace("_onConnect: did not set target id - ignoring");
                return;
            }

            this._knownTargets[newClientId] = sourceWindow;

            var client = this._getClient(sourceWindow, newClientId);
            this._logger.debug("_onConnect: dispatching 'clientConnected' to ", client);
            this.dispatchEvent('clientConnected', client);

            this._connectionReceivedIds[message.sourceId] = newClientId;
            returnMsg.allocatedId = newClientId;
        }

        returnMsg.type = 'connectResponse';
        returnMsg.comChannelId = "_PostMessageComChannel_";

        this._logger.trace("_onMessage: connect: dispatching connection response: ", returnMsg);

        sourceWindow.postMessage(returnMsg, '*');
    },

    _onConnectResponse: function (message) {
        this._logger.trace("_onConnectResponse: Connection Response: ", message);
        Util.assert(!((this.id >= 1) && (this.id !== message.allocatedId)), "_onMessage: connectResponse: received id: " + message.allocatedId + " while my id is: " + this.id, this._logger);

        window.clearTimeout(this._connectTimerId);
        this._connectTimerId = null;

        this.id = message.allocatedId;

        this.dispatchEvent("connected", this.id);
    },

    _onConnectTimeout: function () {
        this._logger.trace("_onConnectTimeout: called");

        window.clearTimeout(this._connectTimerId);
        this._connectTimerId = null;

        this.dispatchEvent("connectError", this.id, "timeout");
    },

    _onDisconnect: function (message, sourceWindow) {
        this._logger.trace("_onDisconnect: Received Disconnection From: ", message);

        var clientId = message.sourceId;
        Util.assert(clientId >= 0, "_onDisconnect: Error while trying to disconnect - received an invalid sourceId: " + clientId, this._logger); // Source ID can't be an ID of the Extension and Content Id is always >= 0

        if (clientId < 1) {
            // If frame sent a disconnection before it finished registration, it will send the temp id as the source id (reproduced in Gmail.com of August, 2013)
            // In this case we'll do the mapping manually
            this._logger.info("_onDisconnect: Received a disconnection request from a Frame that didn't initialize yet: " + clientId + " - overriding the id with: " + this._connectionReceivedIds[clientId]);
            clientId = this._connectionReceivedIds[clientId];
        }

        //cleanup the known clients.
        delete this._knownTargets[clientId];

        var client = this._getClient(sourceWindow, clientId);
        this._logger.debug("clientDisconnected: dispatching 'clientDisconnected' to ", client);
        this.dispatchEvent("clientDisconnected", client);
    },

    _handleRequest: function (client, msgEv) {
        this._logger.trace("_handleRequest: dispatching a REQUEST message");
        if (!this._listeners.message) {
            return;
        }

        try {
            this.dispatchEvent('message', client, msgEv.data.data, sendResponse.bind(this));
        }
        catch (e) {
            var resData = msgEv.data.data;
            this._logger.error("_handleRequest: Got Exception:", e, " Details: ", (e.Details || "No details found in exception"), "\nStack:", e.stack, "\nfor message: ", msgEv.data);
            if (e.message)
                resData.status = e.message;
            else
                resData.status = "ERROR";

            sendResponse.call(this, resData);
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

    _setTargetId: function (sourceWindow) {
        // Now allocate a new ID for the Frame and store a map from the FrameId to the PageId
        var allocatedContextId = ++PostMessageComChannel.prototype._nextContentContextId;
        return allocatedContextId;
    },

    _onContentUnloaded: function () {
        this._logger.trace("_onContentUnloaded: Called");
        Util.assert(this._mode === "content", "_onContentUnloaded: Called not from Content!", this._logger); // Should be called only from Content!
        this.disconnect();
    },

    setClientTabId: function (clientTabId) {
        this._logger.trace("setClientTabId: settings: ", clientTabId);
        this._clientTabId = clientTabId;
    }
};