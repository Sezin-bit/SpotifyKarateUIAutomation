function FirefoxComChannelBase() {
}

FirefoxComChannelBase.prototype = {

    // TODO@EASTON: Check whether inherit from EventDispatcher, reuse AddListener/RemoveListener etc.
    //members
    id: -1,
    _logger: null,
    _listeners: {},
    _asyncHelper: null,

    //methods
    init: function () {
        throw Error("override me");
    },

    _sendMessageImpl: function (msg, msgType) {
        // Per each context.
        throw Error("not implemented");
    },
    _sendMessageHelper: function (msgToSend, destinationId) {
        this._logger.trace("_sendMessageHelper");
        msgToSend.targetId = destinationId;

        this._sendMessageImpl(msgToSend, "message");
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
        this._logger.info("addListener: called");
        if (!this._listeners[eventName]) {
            this._logger.error("removeListener: Trying to remove listener that is not registered");
            return;
        }
        this._listeners[eventName] = this._listeners[eventName].filter(function (listener) {
            return listener !== listenerFunction;
        });
    },
    dispatchEvent: function (eventName, client) {
        this._logger.trace("dispatchEvent: called for event " + eventName);
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
            this._logger.warn("dispatchEvent: no listeners found for event: " + eventName);
            return null;
        }

        var res = null;
        this._listeners[eventName].forEach(function (listener) {
            res = listener.apply(this, args);
        });

        return res;
    },
    onMessage: function (msg) {
        this._logger.trace("onMessage:  Started with ", msg);

        switch (msg.type) {
            case "response":
                this._logger.info("onMessage: This is response message");
                this._asyncHelper.setAckMessage(msg);
                this._logger.trace("onMessage send response msg.data=", msg.data);
                this.dispatchEvent('response', msg.target, msg.data);
                break;
            case "request":
                this._handleRequestMsg(msg.target, msg);
                break;
            case "event":
                this._logger.trace("onMessage: This is an event");
                this.dispatchEvent('event', msg.target, msg.data);
                break;
        }
    },
    onMessageTimedOut: function (timedOutMsg) {
        this._logger.warn("onMessageTimedOut: the following message has timed out !!!:", timedOutMsg.data);
        this.dispatchEvent("MessageTimedOut", timedOutMsg.target, timedOutMsg.data);
    },
    _handleRequestMsg: function (client, msg) {
        this._logger.trace("_handleRequestMsg: dispatching a REQUEST message");

        var sendResponse = function (resMsgData) {
            if (!resMsgData.status) {
                resMsgData.status = "OK";
            }
            //sends back the result message.
            msg.type = "response";
            msg.data = resMsgData;
            this._sendMessageImpl(msg);
        };

        var resData = msg.data;
        try {
            resData = this.dispatchEvent('message', client, msg.data, sendResponse.bind(this));
        }
        catch (e) {
            this._logger.error("_handleRequestMsg: Got Exception:" + e + " Details: " + (e.Details || "") + " - CallStack: " + e.stack);
            resData.status = e.message || "ERROR";
            sendResponse.call(this, resData);
        }
    }
};

 
// The channel lives in content script.
function FirefoxContentComChannel() {
    this._logger = new LoggerUtil("ComChannels.FirefoxContentComChannel.content");
    this.id = Math.random();


    this._asyncHelper = new AsyncCommunicationHelper(),

    this._asyncHelper.addListener("MessageTimedOut", this);
}

Util.inherit(FirefoxContentComChannel, FirefoxComChannelBase, {
    init: function () {
        self.port.on("message", this.onMessage.bind(this));
        self.port.on("connectResponse", this._onConnectResponse.bind(this));
    },
    _sendMessageImpl: function (msg, msgType) {
        msgType = msgType || "message";
        self.port.emit(msgType, msg);
    },

    connect: function () {
        this._logger.trace("connect: called ");
        
        if (this.id >= 1) {
            this._logger.warn("connect: I might be connected since my id > 0, is: " + this.id);
        } 
        
        var connectMsg = { sourceId: this.id, targetId: 1, _debugInfo: { url: location.href } };
        this._logger.trace("connect: dispatching connect message: ", connectMsg);
        this._sendMessageImpl(connectMsg, "connect");
    },
    disconnect: function () {
        this._logger.trace("disconnect: called ");

        var disconnectMsg = { sourceId: this.id, targetId: 1, _debugInfo: { url: location.href } };
        this._logger.error("disconnect: dispatching Disconnect message: ", disconnectMsg);
        this._sendMessageImpl(disconnectMsg, "disconnect");
    },
    _onConnectResponse: function (msg) {
        this._logger.trace("_onConnectResponse: Connection Response: ", msg);
        if (msg.allocatedId >= 1 && this.id !== msg.allocatedId) {
            this.id = msg.allocatedId;
            this.dispatchEvent("connected", msg.target, msg);
        }
        else {
            this._logger.warn("_onConnectResponse: get wrong allocatedId=", msg.allocatedId, " my id: ", this.id);
        }
    }
});