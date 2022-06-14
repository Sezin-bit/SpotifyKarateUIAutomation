
function FirefoxWebSocketProxyComChannel() {
    EventDispatcher.call(this, new LoggerUtil("ComChannels.FirefoxWebSocketProxyComChannel"));
    this._logger.trace("FirefoxWebSocketProxyComChannel: ctor completed");

    this._openHandler = this._onOpen.bind(this);
    this._closeHandler = this._onClose.bind(this);
    this._errorHandler = this._onError.bind(this);
    this._messageHandler = this._onMessage.bind(this);
}

Util.inherit(FirefoxWebSocketProxyComChannel, EventDispatcher, {
    _pageWorker: null,

    _openHandler: null,
    _closeHandler: null,
    _errorHandler: null,
    _messageHandler:null,

    supportReconnect: function () {
        return true;
    },

    getComChannelID: function () {
        this._logger.trace("getComChannelID: called");
        return "FirefoxWebSocketProxyComChannel";
    },

    connect: function (serverURL) {
        if (this._pageWorker) {
            this._logger.trace("connect: already connected.returning");
            return;
        }
        this._pageWorker = require("sdk/page-worker").Page({
            contentURL: self.data.url('./Ext/ExternalComChannels/FirefoxWebSocketPageWorker.html'),
            contentScriptFile: [
                self.data.url("./ThirdParty/log4javascript_uncompressed.js"),
                self.data.url("./Common/LoggerUtil.js"),
                self.data.url("./Common/common.js"),
                self.data.url("./Ext/ExternalComChannels/ExtComChannelUtils.js"),
                self.data.url("./Ext/ExternalComChannels/WebSocketComChannel.js"),
                self.data.url("./Ext/ExternalComChannels/FirefoxWebSocketPageWorker.js"),
            ]
        });
        
        this._pageWorker.port.on("new_websocket_exception", (function () {
            this._pageWorker.destroy();
            this._pageWorker = null;
            this._dispatchEvent("error", "connect exception");
        }).bind(this));
        this._pageWorker.port.on("open", this._openHandler);
        this._pageWorker.port.on("error", this._errorHandler);
        this._pageWorker.port.on("message", this._messageHandler);
        this._pageWorker.port.on("close", this._closeHandler);
        this._pageWorker.port.on("send_exception", (function () {
            this._pageWorker.destroy();
            this._pageWorker = null;
        }).bind(this));

        this._pageWorker.port.emit("connect", serverURL);
    },

    disconnect: function () {
        if (this._pageWorker) {
            this._pageWorker.port.removeListener("open", this._openHandler);
            this._pageWorker.port.removeListener("close", this._closeHandler);
            this._pageWorker.port.removeListener("error", this._errorHandler);
            this._pageWorker.port.removeListener("message", this._messageHandler);

            this._pageWorker.port.emit("disconnect");
            this._pageWorker.destroy();
            this._pageWorker = null;
        }
    },
    sendMessage: function (msg) {
        if (!this._pageWorker) {
            this._logger.error("can't sendMessage because _pageWorker is null!");
            return;
        }

        var text = JSON.stringify(msg);
        this._pageWorker.port.emit("send", text);
    },
    _onOpen: function () {
        this._dispatchEvent("open"); 
    },
    _onError: function () {
        this._dispatchEvent("error");
    },
    _onClose: function () {
        this._pageWorker.destroy();
        this._pageWorker = null;
        this._dispatchEvent("close");
    },
    _onMessage: function (msgDetail) {
        msgDetail = JSON.parse(msgDetail);
        try {
            if (msgDetail.type === "message") {
                this._dispatchEvent("message", msgDetail.data);
            } else {
                if (msgDetail.type === "error") {
                    this._dispatchEvent("error", msgDetail);
                } else {
                    this._logger.error("receive unexpected message type:" + msgDetail.type);
                }
            }
        } catch (e) {
            this._logger.error("FirefoxWebSocketProxyComChannel.message: _dispatchEvent:" + msgDetail.type + " error:" + e.message);
        }
    }
});
