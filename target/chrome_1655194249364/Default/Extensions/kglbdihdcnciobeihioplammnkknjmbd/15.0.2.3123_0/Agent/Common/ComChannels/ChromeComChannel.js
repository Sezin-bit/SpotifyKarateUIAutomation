/*function DummyComChannels() {

}

DummyComChannels.prototype = {
    //members
    id: -1,

    //methods
    init: function () { },
    sendMessage: function (msg) { },
    sendEvent: function (msg) { },
    addListener: function (listenerFunction) { },
    removeListener: function (listenerFunction) { },
    onMessage: function (msgStr) { }
}
*/

function ChromeComChannel() {
    if (typeof(ext) === "undefined") { // TODO: find a better condition or way to implement this
        this._logger = new LoggerUtil("ComChannels.ChromeComChannel.Content");
        this._runInContext = "content";
        window.addEventListener("unload", this._onContentUnloaded.bind(this), false);
    }
    else {
        this._logger = new LoggerUtil("ComChannels.ChromeComChannel.Extension");
        this._runInContext = "extension";
    }

    this._logger.info("Created");
    this._listeners = {};

    this._asyncHelper = new AsyncCommunicationHelper({
        timeout: 15*1000
    });
    this._asyncHelper.addListener("MessageTimedOut", this);

    this.id = new Date().getTime(); // TODO: THIS IS NOT A GUID !!! FIX !!

    if(chrome.runtime && chrome.runtime.connect){
        this._logger.info("ctor: using the chrome.runtime object as chrome's messaging service");
        this._chromeMessagingService = chrome.runtime;
    }
    else{
        this._logger.info("ctor: using the chrome.extension object as chrome's messaging service");
        this._chromeMessagingService = chrome.extension;
    }
}

ChromeComChannel.prototype = {
    //members
    id: -1,
    _logger: null,
    _parentPort: null,
    _listeners: null,
    _knownPorts: [],
    _asyncHelper: null,
    _nextPortId: 0,
    _runInContext: null,
    _chromeMessagingService: null,
    _active: true,

    //methods
    init: function () {
        this._logger.trace("init called");
        if (!this._active) {
            this._logger.trace("sendMessage: communication channel is NOT active - returning.");
            return;
        }

        switch (this._runInContext) {
            case "content":
                Object.defineProperty(this, "_isConnected", { value: false });
                break;
            case "extension":
                this._chromeMessagingService.onConnect.addListener(this._onContentConnected.bind(this));
                break;
            default:
                this._logger.error("init: Unsupported context! init failed.");
        }
    },

    _sendMessageHelper: function (msgToSend, destinationId) {
        this._logger.trace("_sendMessageHelper: send to: ", destinationId);
        if (!this._active) {
            this._logger.trace("_sendMessageHelper: communication channel is NOT active - returning.");
            return;
        }

        var destPort;
        switch (this._runInContext) {
            case "content":
                destPort = this._parentPort;
                break;
            case "extension":
                destPort = this._knownPorts[destinationId];
                break;
            default:
                this._logger.error("_sendMessageHelper: Unsupported context!!!!");
                return;
        }

        if (!destPort) {
            this._logger.error("_sendMessageHelper - destination port does not exist ", destinationId);
            throw new Error("TargetObjectNotFound");
        }
        
        this._logger.debug("_sendMessageHelper: Going to send to:", destPort.uftFrameId);
        this._logger.prettyTrace("_sendMessageHelper: Sending the following object:\n", msgToSend);

        destPort.postMessage(msgToSend);
        msgToSend.portName = destPort.uftFrameId;
    },
    sendMessage: function (msg, destinationId) {
        this._logger.trace("sendMessage: called");

        var msgToSend = {
            type: "request",
            data: msg
        };

        this._asyncHelper.updateMessageWithNeededInfo(msgToSend);
        this._sendMessageHelper(msgToSend, destinationId);
        this._asyncHelper.addAsyncMsgToQueue(msgToSend,destinationId);
    },
    sendEvent: function (msg, destinationId) {
        this._logger.trace("sendEvent: called");

        var msgToSend = {
            type: "event",
            data: msg
        };

        this._sendMessageHelper(msgToSend, destinationId);
    },
    addListener: function (eventName, listenerFunction) {
        this._logger.info("addListener: called");
        if (!this._listeners[eventName])
            this._listeners[eventName] = [];

        this._listeners[eventName].push(listenerFunction);
    },
    removeListener: function (eventName, listenerFunction) {
        this._logger.info("removeListener: called");
        if (!this._listeners[eventName]) {
            this._logger.error("removeListener: Trying to remove listener that is not registered");
            return;
        }
        this._listeners[eventName] = this._listeners[eventName].filter(function (listener) {
            return listener !== listenerFunction;
        });
    },
    dispatchEvent: function (eventName, portName) {
        this._logger.trace("dispatchEvent: called for event " + eventName + " - port.uftFrameId = " + portName);
        var clientPort = this._getClientFromPort(this._knownPorts[portName]);
        //fix the argument array by removing the event name and chrome port and adding the client port
        var args = Util.makeArray(arguments);
        args.splice(0, 2);

        if (typeof (args[args.length - 1]) === "function") {
            var lastElement = args.pop();
            args.push(clientPort);
            args.push(lastElement);
        }
        else {
            args.push(clientPort);
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
    onMessage: function (port, msg) {
        this._logger.trace("onMessage: From:", port.uftFrameId, " - Started with ", msg);

        if (this._active === false) {
            this._logger.trace("onMessage: communication channel is NOT active - returning.");
            return;
        }

        switch (msg.type) {
            case "response":
                this._logger.trace("onMessage: This is response message");
                this._asyncHelper.setAckMessage(msg);
                this.dispatchEvent('response', port.uftFrameId, msg.data);
                break;
            case "request":
                this._handleRequestMsg(port, msg);
                break;
            case "event":
                this._logger.trace("onMessage: This is an event");
                this.dispatchEvent('event', port.uftFrameId, msg.data);
                break;
            case "connectResponse":
                this._handleConnectResponse(port, msg);
                break;
        }
    },
    connect: function () {
        this._logger.trace("connect: called ");

        if (!this._active) {
            this._logger.trace("connect: communication channel is NOT active - returning.");
            return;
        }

        switch (this._runInContext) {
            case "content":
                if (this._parentPort) {
                    this._logger.trace("connect: Parent port exists - clean listeners and delete it -> 1. a timeout has passed OR 2. connection failed");
                    this._parentPort.disconnect();
                }
                this._parentPort = this._chromeMessagingService.connect();
                this._parentPort.onMessage.addListener(this.onMessage.bind(this, this._parentPort));
                this._parentPort.onDisconnect.addListener(this._onContentPortDisconnected.bind(this));
                break;
            case "extension":
                break;
            default:
                this._logger.error("connect: Unsupported context! connect() failed.");
        }
    },
    _handleConnectResponse: function (port, msg) {
        this._logger.trace("_handleConnectResponse: called with: ", msg);

        if (msg.data.status !== "OK") {
            this._logger.info("_handleConnectResponse: unsupported content - disconnecting");
            this.disconnect();
            return;
        }

        this._isConnected = true;
        this.dispatchEvent('connected', port.uftFrameId);
    },
    disconnect: function () {
        if (this._parentPort) {
            this._logger.trace("disconnect: disconnecting from port");
            this._active = false;
            this._parentPort.disconnect();
        }
    },

    _isSupportedClient: function (port) {
        return port.sender.tab && !Util.startsWith(port.sender.tab.url,"devtools://");
    },

    // Internal functions
    _onContentConnected: function (port) {
        this._logger.info("_onContentConnected: called ");
        if (!this._isSupportedClient(port)) {
            this._logger.info("_onContentConnected: received connection from unsupported client - ignoring & disconnecting port");
            port.postMessage({ type: "connectResponse", data: { status: "connection refused" } });
            return;
        }

        // First send ack to content
        port.postMessage({ type: "connectResponse", data: { status: "OK" } });

        // Handle the new port (give it ID and register to events)
        port.uftFrameId = ++ChromeComChannel.prototype._nextPortId;
        this._logger.info("_onContentConnected: port.uftFrameId is " + port.uftFrameId);
        port.onMessage.addListener(this.onMessage.bind(this, port));
        port.onDisconnect.addListener(this._onDisconnect.bind(this, port));
        this._knownPorts[port.uftFrameId] = port;

        // Inform the listeners that there's a new client connected
        this.dispatchEvent('clientConnected', port.uftFrameId);
    },
    onMessageTimedOut: function (timedOutMsg) {
        this.dispatchEvent("MessageTimedOut", timedOutMsg.portName, timedOutMsg.data);
    },
    _onDisconnect: function (port) {
        this._logger.trace("_onDisconnect: Got disconnection from ", port.uftFrameId);
        this._asyncHelper.onDestinationHasDisconnected(port.uftFrameId);
        
        if (this._listeners.clientDisconnected) {
            this.dispatchEvent('clientDisconnected', port.uftFrameId);
        }

        delete this._knownPorts[port.uftFrameId];
    },
    _onContentPortDisconnected: function () {
        // This function is called in Content scripts when the Extension disconnects the port
        this._logger.info("_onContentPortDisconnected: Port Disconnected in " + window.location.href);
        if (!this._isConnected && this._active) {
            this._logger.warn("_onContentPortDisconnected: Never connected -> Error in connection.");
            this.dispatchEvent('connectError', this._parentPort.uftFrameId, "timeout");
        }
    },
    _getClientFromPort: function (port) {
        var client = {};
        if (port) {
            client = { tabID: port.sender.tab.id, windowId: port.sender.tab.windowId, id: port.uftFrameId };
        }
        return client;
    },
    _handleRequestMsg: function (port, msg) {
        this._logger.trace("_handleRequestMsg: dispatching a REQUEST message");
        if (!this._listeners.message) {
            return;
        }

        var sendResponse = function (resMsgData) {
            if (!resMsgData.status) {
                resMsgData.status = "OK";
            }
            //sends back the result message.
            msg.type = "response";
            msg.data = resMsgData;
            port.postMessage(msg);
        };

        var resData = msg.data;
        try {
            resData = this.dispatchEvent('message', port.uftFrameId, msg.data, sendResponse.bind(this));
        }
        catch (e) {
            resData.status = e.message || "ERROR";
            this._logger.warn("_handleRequestMsg: Got Exception:" + e + " Details: " + (e.Details || "") + " - CallStack: " + e.stack);
            sendResponse(resData);
        }
    },
    _onContentUnloaded: function () {
        this._logger.trace("_onContentUnloaded: Called");
        this.disconnect();
    },
};