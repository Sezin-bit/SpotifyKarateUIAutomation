function NativeMessagingComChannel() {
    EventDispatcher.call(this, new LoggerUtil("ComChannels.NativeMessagingComChannel"));
    this._nativeMessagingHost = "com.hp.uft.nativemessaginghost";
    this._logger.trace("NativeMessagingComChannel: ctor completed");
}

Util.inherit(NativeMessagingComChannel, EventDispatcher, {
    _port: null,
    _nativeMessagingHost: null,

    // *** Public methods ***
    supportReconnect: function () {
        return false;
    },

    init: function () {
        this._logger.trace("init");
    },

    getComChannelID: function () {
        this._logger.trace("getComChannelID: called");
        return "ChromeNativeMessagingComChannel";
    },

    connect: function (nativeMessagingHost) {
        this._logger.trace("connect: trying to connect to native messaging host " + this._nativeMessagingHost);

        if (this._port) {
            this._logger.trace("connect: already connected. returning.");
            return;
        }

        try {
            this._port = chrome.runtime.connectNative(this._nativeMessagingHost);
            this._dispatchEvent(InnerChannelEvent.OPEN);
            this._port.onMessage.addListener(this._onNativeMessage.bind(this));
            this._port.onDisconnect.addListener(this._onDisconnected.bind(this));
        } catch (e) {
            this._logger.trace("failed to connect to native messaging host " + nativeMessagingHost + ", error: " + e + "\nStack:" + e.stack);
            throw e;
        }
    },



    disconnect: function () {
        this._logger.trace("disconnect: close connection to native messaging host '" + this._nativeMessagingHost + "'");

        if (this._port) {
            this._port.disconnect();
            this._port = null;
        }
    },

    sendMessage: function (msg) {
        if (this._isConnectionOpen()) {
            this._port.postMessage(msg);
            this._logger.debug("message is posted to native messaging host");
        }
        else {
            this._logger.warn("native messaging port is closed or not initialized, message not sent!");
        }
    },

    // *** Private methods ***

    _onDisconnected: function () {
        this._logger.trace("disconnected.");
        this._port = null;
    },
    
    _messageQueue: [],

    _onNativeMessage: function (message) {
        if (message.head) {
            this._messageQueue.push(message);
            if (message.head.total === message.head.index + 1) {
                var msg = "";
                this._messageQueue.forEach(function (m) {
                    msg += m.data;
                });

                this._messageQueue = [];
                this._dispatchEvent(InnerChannelEvent.MESSAGE, msg);
            }
        }
        else {
            var str = JSON.stringify(message);
            this._dispatchEvent(InnerChannelEvent.MESSAGE, str);
        }
    },

    _isConnectionOpen: function () {
        if (Util.isNullOrUndefined(this._port))
            return false;
        return true;
    },

    _isConnectionClosed: function () {
        if (Util.isNullOrUndefined(this._port))
            return true;
        return false;
    }
});