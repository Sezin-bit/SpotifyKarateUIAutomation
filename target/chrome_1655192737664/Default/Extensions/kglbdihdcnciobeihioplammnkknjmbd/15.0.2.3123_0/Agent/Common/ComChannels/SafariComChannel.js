// This is used to wrap legacy Safari extension api & new Safari app extension api
var SafariApiWrapper = {
    dispatchMessage: function (name, msg) {
        if (safari.self.tab) {
            safari.self.tab.dispatchMessage(name, msg);
        } else {
            safari.extension.dispatchMessage(name, msg);
        }
    }
};

function SafariComChannel() {
    if (typeof (ext) === "undefined") { // TODO: find a better condition or way to implement this
        this._logger = new LoggerUtil("ComChannels.SafariComChannel.Content");
        this._mode = "content";
        this.id = Math.random();
    }
    else {
        this._logger = new LoggerUtil("ComChannels.SafariComChannel.Extension");
        this._mode = "extension";
        this.id = -1;
    }

    this._logger.info("Created");

    this._listeners = {};

    this._asyncHelper = new AsyncCommunicationHelper({
        timeout: 15*1000
    });
    this._asyncHelper.addListener("MessageTimedOut", this);
}

SafariComChannel.prototype = {
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
                window.addEventListener("unload", this._onContentUnloaded.bind(this), false);
                safari.self.addEventListener("message", this.onMessage.bind(this), false);
                break;
            case "extension":
                safari.application.addEventListener("message", this.onMessage.bind(this), false);
                break;
            default:
                this._logger.error("init: Unsupported context! init failed.");
        }
    },
    _sendMessageHelper: function (msg, destTargetId, type) {
        this._logger.trace("_sendMessageHelper: send to: ", destTargetId, " - message:", msg);

        var proxy = null;
		var target;
        switch (this._mode) {
            case "content":
                target = -1; // extension id is always -1
                proxy = safari.self.tab || safari.extension;
                break;
            case "extension":
                target = destTargetId;
                if (this._knownTargets[target])
                    proxy = this._knownTargets[target].page;
                break;
        }

        if (!proxy) {
            this._logger.error("sendMessage: NO Proxy found. Returning - sending message failed !");
            return;
        }

        var msgToSend = {
            sourceId: this.id,
            targetId: target,
            data: msg
        };

        if (type === "request")
            this._asyncHelper.updateMessageWithNeededInfo(msgToSend);

        this._logger.prettyTrace("sendMessage: Sending the following object:\n", msgToSend);

        if (this.id === -1 || this.id >= 1) // Initialized & Ready for dispatching messaging
            proxy.dispatchMessage(type, msgToSend); // event.target
        else
            this._logger.trace("sendMessage: ComChannel still not ready. Message sending is delayed");

        msgToSend.client = destTargetId;

        if (type === "request") {
            this._asyncHelper.addAsyncMsgToQueue(msgToSend,destTargetId);
        }
    },
    sendMessage: function (msg, destTargetId) {
        this._logger.trace("sendMessage: called");
        this._sendMessageHelper(msg, destTargetId, "request");
    },
    sendEvent: function (msg, destTargetId) {
        this._logger.trace("sendEvent: called");
        this._sendMessageHelper(msg, destTargetId, "event");
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
        //fix the argument array by removing the event name and target and adding the client port
        var args = Util.makeArray(arguments);
        args.splice(0, 2);

        if (typeof (args[args.length - 1]) === "function") {
            var lastElement = args.pop();
            args.push(client);
            args.push(lastElement);
        }
        else {
            args.push(client);
        }

        //The result is meaningful only for "message" event thus the forEach contains only 1 element.
        //Note: There are other event types such as "connect" which listened by multiple handlers.
        if (!this._listeners[eventName]) {
            this._logger.trace("dispatchEvent: no listeners found for event: " + eventName);
            return null;
        }

        var res = null;
        this._listeners[eventName].forEach(function (listener) {
            res = listener.apply(this, args);
        });

        return res;
    },
    onMessage: function (msgEv) {
        if (msgEv.message.targetId !== this.id)
            return;

        this._logger.trace("onMessage: Received a message from: " + msgEv.message.sourceId);

        switch (msgEv.name) {
            case "connect":
                this._onConnect(msgEv.message, msgEv.target);
                break;
            case "connectResponse":
                this._onConnectResponse(msgEv.message);
                break;
            case "disconnect":
                this._onDisconnect(msgEv.message, msgEv.target);
                break;
            case "response":
                this._asyncHelper.setAckMessage(msgEv.message);
                /* falls through */
            case "event":
                this._logger.trace("onMessage: Mesasge of type '" + msgEv.name + "' : sourceId=" + msgEv.message.sourceId + " , targetId=" + msgEv.message.targetId);
                this.dispatchEvent(msgEv.name, this._getClient(msgEv.target, msgEv.message.sourceId), msgEv.message.data);
                break;
            case "request":
                this._logger.trace("onMessage: This is request message");

                this._handleRequest(this._getClient(msgEv.target, msgEv.message.sourceId), msgEv);
                break;
        }
    },
    connect: function () {
        this._logger.trace("connect: called ");
        switch (this._mode) {
            case "extension":
                break;
            case "content":
                if (location.href != "favorites://" && location.href != "about:blank"){
                    var connectMsg = { sourceId: this.id, targetId: -1, _debugInfo: { url: location.href } };
                    this._logger.trace("connect: dispatching connect message: ", connectMsg);
                    SafariApiWrapper.dispatchMessage("connect", connectMsg);

                    this._connectTimerId = Util.setTimeout(this._onConnectTimeout.bind(this), 1000);
                    break;
                }
        }
    },
    disconnect: function () {
        this._logger.trace("disconnect: called ");
        switch (this._mode) {
            case "extension":
                this._logger.error("disconnect: houston we have a problem");
                break;
            case "content":
                var disconnectMsg = { sourceId: this.id, targetId: -1, _debugInfo: { url: location.href } };
                this._logger.trace("disconnect: dispatching Disconnect message: ", disconnectMsg);
                SafariApiWrapper.dispatchMessage("disconnect", disconnectMsg);
                break;
        }
    },

    // Internal functions
    _onConnect: function (message, target) {
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
            var newClientId = this._setTargetId(target);
            this._logger.trace("_onConnect: Newly Connected Target Id: " + newClientId);
            if (Util.isNullOrUndefined(newClientId)) {
                this._logger.trace("_onConnect: did not set target id - ignoring");
                return;
            }

            this._knownTargets[newClientId] = target;

            // TODO - What if there's no internalId on tab/window at this point ? is it possible ?
            var client = { tabID: target._uftInternalId, windowId: target.browserWindow._uftInternalId, id: newClientId };
            this._logger.debug("_onConnect: dispatching 'clientConnected' to ", client);
            this.dispatchEvent('clientConnected', client);

            this._connectionReceivedIds[message.sourceId] = newClientId;
            returnMsg.allocatedId = newClientId;
        }

        this._logger.trace("onMessage: connect: dispatching connection response: ", returnMsg);
        target.page.dispatchMessage("connectResponse", returnMsg);
    },

    _onConnectResponse: function (message) {
        this._logger.trace("_onConnectResponse: Connection Response: ", message);
        Util.assert(!((this.id >= 1) && (this.id !== message.allocatedId)), "onMessage: connectResponse: received id: " + message.allocatedId + " while my id is: " + this.id, this._logger);

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

    _onDisconnect: function (message, target) {
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

        var client = { tabID: target._uftInternalId, windowId: target.browserWindow._uftInternalId, id: clientId };
        this._logger.debug("clientDisconnected: dispatching 'clientConnected' to ", client);
        this.dispatchEvent("clientDisconnected", client);
        this._asyncHelper.onDestinationHasDisconnected(clientId);
    },

    _handleRequest: function (client, msgEv) {
        this._logger.trace("_handleRequest: dispatching a REQUEST message");
        if (!this._listeners.message) {
            return;
        }

        function sendResponse(resMsg) {
            this._logger.trace("sendResponse: Dispatching response to: " + msgEv.message.sourceId);

            if (!resMsg.status)
                resMsg.status = "OK";

            var msg = msgEv.message;
            msg.data = resMsg;
            msg.targetId = msg.sourceId;
            msg.sourceId = this.id;

            var proxy = null;
            if (this._mode === "content") {
                proxy = safari.self.tab || safari.extension;
            }
            else {
                proxy = msgEv.target.page;
            }

            if (!proxy) {
                this._logger.error("onMessage: NO Proxy found");
                return;
            }

            proxy.dispatchMessage("response", msg);
        }

        try {
            this.dispatchEvent('message', client, msgEv.message.data, sendResponse.bind(this));
        }
        catch (e) {
            var resData = msgEv.message.data;
            this._logger.error("_handleRequest: Got Exception:" + e + " Details: " + (e.Details || "No details found in exception") + "\nStack:" + e.stack);
            if (e.message)
                resData.status = e.message;
            else
                resData.status = "ERROR";
            sendResponse.call(this, resData);
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
                    client = { tabID: target._uftInternalId, windowId: target.browserWindow._uftInternalId, id: contentId };
                }
        }

        return client;
    },
    _setTargetId: function (target) {
        if (!target.page) {
            this._logger.info("_setTargetId: target has no page proxy. Ignoring.");
            return;
        }

        // First allocate an ID for the Page's proxy (if it doesn't exist) and store a reference to it so that it won't be cleaned
        if (!target.page._uftSafariComChannelName) {
            target.page._uftSafariComChannelName = ++SafariComChannel.prototype._nextContentContextId;
            this._pageProxies.push(target.page); // TODO Clean the Page Proxy from the container when the Page is dead
        }

        // Now allocate a new ID for the Frame and store a map from the FrameId to the PageId
        var allocatedContextId = ++SafariComChannel.prototype._nextContentContextId;

        return allocatedContextId;
    },

    _onContentUnloaded: function () {
        this._logger.trace("_onContentUnloaded: Called");
        Util.assert(this._mode === "content", "_onContentUnloaded: Called not from Content!", this._logger); // Should be called only from Content!
        this.disconnect();
    }
};
