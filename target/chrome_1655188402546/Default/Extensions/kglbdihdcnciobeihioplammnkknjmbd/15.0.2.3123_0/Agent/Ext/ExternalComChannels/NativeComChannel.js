function NPComChannel(nativeType) {
    this._listeners = {};
    Util.assert(nativeType === "external", "Native Comm Channel can only run as External comm channel", this._logger);

    this._logger = new LoggerUtil("ComChannels.NPComChannel.External");
    this._comChannel = Util.getAgentNPObj().getQTPComChannel(0);

    this._logger.info("NPComChannel created");
}

//members
NPComChannel.prototype = {
    _comChannel: null,
    _parentComChannelId: -1,
    _logger: null,
    _listeners: null,
    // id : defined as property with Object.defineProperty

    init: function () {
        this._logger.info("init: started");
    },

    connect: function () {
        this._logger.info("connect: called");

        this._comChannel.init(this);

        Object.defineProperty(this, "id", {
            value: this._comChannel.getComChannelID(),
            writable: false
        });

        Util.getAgentNPObj().setAttribute("comID", this.id);

        this._logger.info("finished: with channel id " + this.id);
    },

    _sendMessageHelper: function (msg) {
        var jsonMsg = JSON.stringify(msg);
        var handlerType = ExtComChannelUtil.getHandlerForMessage(msg);
        this._logger.info("_sendMessageHelper: started on " + jsonMsg + ", handler type: " + handlerType);
        return this._comChannel.sendMessage(jsonMsg, handlerType);
    },

    sendMessage: function (msg) {
        this._logger.info("sendMessage: called");
        var resultMsgStr = this._sendMessageHelper(msg);

        this._logger.trace("sendMessage: result message is " + resultMsgStr);
        var resMsg = Util.parseJSON(resultMsgStr, this._logger);

        return resMsg;
    },

    sendEvent: function (msg) {
        this._logger.info("sendEvent: called");
        this._sendMessageHelper(msg);
    },

    addListener: function (eventName, listenerFunction) {
        this._logger.info("addListener called.");
        this._listeners[eventName] = listenerFunction;
    },

    removeListener: function (eventName /*, listenerFunction */) {
        this._logger.info("removeListener called.");
        this._listeners[eventName] = null;
    },

    onMessage: function (msgStr) {
        this._logger.trace("onMessage: Started with " + msgStr);
        var msg = Util.parseJSON(msgStr, this._logger);
        if (msg === null) {
            return null;
        }

        var asyncMessageLock = this._lockAsync(msg);
        var result = asyncMessageLock;
        try {
            this._listeners.message(msg, null, function (asyncMessageLock, resMsg) {
                this._unlockAsync(asyncMessageLock, resMsg);
            }.bind(this, asyncMessageLock));
        }
        catch (e) {
            this._logger.error("onMessage: Got Exception:" + e + " Details: " + (e.Details || "") + "\n Stack:" + e.stack);
            result = msg;
            if (e.message)
                result.status = e.message;
            else
                result.status = "ERROR";

            this._unlockAsync(asyncMessageLock, result);
        }
        var sResult = JSON.stringify(result);
        this._logger.trace("onMessage: Finished with the following result message:" + sResult);
        return sResult;
    },

    disconnect: function () {
        this._logger.info("disconnect: called");
        this._comChannel.disconnect();
    },

    _lockAsync: function (msg) {
        this._logger.trace("LockAsync: Called for ", msg);
        var val = null;
        if (!msg.testing) {
            val = SpecialObject.CreateAsyncRequest(Util.getAgentNPObj().getAsyncBridge().registerNewAsyncRequest());
            this._logger.trace("LockAsync: returning cookie ", val.cookie);
        }
        return val;
    },

    _unlockAsync: function (lock, msgResult) {
        this._logger.trace("UnlockAsync: Called");
        if (lock) {
            this._logger.trace("UnlockAsync: Called for cookie ", lock.cookie, " with response: ", msgResult);

            if (!msgResult.status) {
                msgResult.status = "OK";
            }
            Util.getAgentNPObj().getAsyncBridge().setResponse(lock.cookie, JSON.stringify(msgResult));
            return true;
        }

        return false;
    }
};