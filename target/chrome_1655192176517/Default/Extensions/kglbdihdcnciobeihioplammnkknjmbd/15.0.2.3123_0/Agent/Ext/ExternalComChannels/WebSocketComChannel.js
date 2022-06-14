function WebSocketComChannel() {
    this._logger = new LoggerUtil("ComChannels.WebSocketComChannel");
    this._connection = null;
    this._listeners = [];
    this._waitingMessages = [];
    this._timerId = -1;
    this._serverUrl = null;

    if (Util.isNullOrUndefined(WebSocketComChannel.prototype.WEBSOCKET_OBJECT_NAME)) {
        this._logger.error("WebSocketComChannel: browser does not support WebSocket");
        ErrorReporter.ThrowGeneralError();
    }
    
    this._logger.trace("WebSocketComChannel: ctor completed");
}

WebSocketComChannel.prototype = {
    _logger: null,
    _connection: null,
    _listeners: null,
    _waitingMessages: null,
    _timerId: -1,
    _serverUrl: null,

    // *** Public methods ***
    supportReconnect: function () {
        return true;
    },

    init: function() {
        this._logger.trace("init");
    },

    getComChannelID: function() {
        this._logger.trace("getComChannelID: called");
        return "WebSocketComChannel";
    },

    connect: function(serverUrl) {
        this._logger.trace("connect: trying to connect to web socket server " + serverUrl);

        try {
            this._serverUrl = serverUrl;
            this._connection = new window[this.WEBSOCKET_OBJECT_NAME](serverUrl);
            this._connection.onopen = this._wsOnOpen.bind(this);
            this._connection.onclose = this._wsOnClose.bind(this);
            this._connection.onmessage = this._wsOnMessage.bind(this);
            this._connection.onerror = this._wsOnError.bind(this);
        } catch(e) {
            this._logger.trace("failed to connect to web socket server " + serverUrl + ", error: " + e + "\nStack:" + e.stack);
            this._clearWaitingMessagesList();
            this._serverUrl = null;
            throw e;
        }
    },

    disconnect: function() {
        this._logger.trace("disconnect: close connection to web socket server " + this._getServerInfo());

        if(!this._isConnectionClosed()) {
            this._connection.close();
            this._clearWaitingMessagesList();
        }

        if(this._connection) {
            this._connection.onopen = null;
            this._connection.onclose = null;
            this._connection.onmessage = null;
            this._connection.onerror = null;
            this._connection = null;
        }

        this._serverUrl = null;
    },

    sendMessage: function(msg) {
        var strMsg = JSON.stringify(msg);
        this._logger.trace("sendMessage: called for " + this._getServerInfo() + ", msg: " + strMsg);

        if(this._shouldAddToWaitingList()) {
            this._addMessageToWaitingList(strMsg);
            this._turnOnWatingTimer();
        } else {
            this._send(strMsg);
        }
    },

    addListener: function(eventName, listenerFunction) {
        this._logger.trace("addListener: called for event '" + eventName + "'");
        if(!this._listeners[eventName])
            this._listeners[eventName] = [];

        this._listeners[eventName].push(listenerFunction);
    },

    removeListener: function(eventName, listenerFunction) {
        this._logger.trace("removeListener: called for event '" + eventName + "'");

        if(!this._listeners[eventName] || this._listeners[eventName].indexOf(listenerFunction) === -1) {
            this._logger.warn("removeListener: Trying to remove listener that is not registered");
            return;
        }

        this._listeners[eventName] = this._listeners[eventName].filter(function(listener) {
            return listener !== listenerFunction;
        });
    },

    removeAllListeners: function() {
        this._logger.info("removeAllListeners: called for ", this.getComChannelID());
        this._listeners = [];
    },

    // *** Private methods ***

    _shouldAddToWaitingList: function() {
        this._logger.trace("_shouldAddToWaitingList: called");
        var result = !this._connection || this._connection.readyState === this._connection.CONNECTING;
        this._logger.debug("_shouldAddToWaitingList: returns " + result + ". Connection state: " + (this._connection ? this._connection.readyState : "not available"));
        return result;
    },

    _addMessageToWaitingList: function(msg) {
        this._logger.trace("_addMessageToWaitingList: connection is not opened yet - add message to the waiting list");
        var waitingEnvelope = {
            msg: msg,
            time: new Date()
        };
        this._waitingMessages.push(waitingEnvelope);
    },

    _turnOnWatingTimer: function() {
        var WAITING_CHECK_INTERVAL_MILISECONDS = 5000;
        if(this._timerId === -1) {
            this._logger.trace("_turnOnWatingTimer: turn on the timer");
            this._timerId = Util.setInterval(this._onWaitingTimer.bind(this), WAITING_CHECK_INTERVAL_MILISECONDS);
        }
    },

    _turnOffWatingTimer: function() {
        if(this._timerId !== -1) {
            this._logger.trace("_turnOffWatingTimer: turn off the timer");
            Util.clearInterval(this._timerId);
            this._timerId = -1;
        }
    },

    _onWaitingTimer: function() {
        this._logger.trace("_onWaitingTimer: started. Review waiting times of the messages in waiting list [" + this._waitingMessages.length + "]");

        var timedoutMessages = this._getTimedoutMessages();
        this._removeMessagesFromWaitingList(timedoutMessages);

        if(this._waitingMessages.length === 0) {
            this._turnOffWatingTimer();
        }

        this._logger.trace("_onWaitingTimer: finished");
    },

    _getTimedoutMessages: function() {
        this._logger.trace("_getTimedoutMessages: called");
        var MAX_WAITING_SECONDS = 30;
        return this._waitingMessages.filter(function(envelope) {
            var timespanInMS = (new Date()).getTime() - envelope.time.getTime();
            var diff = new Date(timespanInMS);
            return diff.getUTCSeconds() > MAX_WAITING_SECONDS;
        });
    },

    _removeMessagesFromWaitingList: function(messages) {
        this._logger.trace("_removeMessagesFromWaitingList: called to remove ", messages.length," message(s)");
        messages.forEach(function(envelope) {
            this._logger.warn("_removeMessagesFromWaitingList: remove waiting message ", envelope, " from the waiting list");
            var index = this._waitingMessages.indexOf(envelope);
            if(index !== -1) {
                this._waitingMessages.splice(index, 1);
            }
        }, this);

    },

    _send: function(strMsg) {
        this._logger.trace("_send: Inner Send message called for web socket server ", this._getServerInfo.bind(this), ", msg: ", strMsg);

        if(!this._isConnectionOpen()) {
            this._logger.error("Cannot send message to the web socket server " + this._getServerInfo() + " due to the invalid connection state: " + this._connection.readyState);
            ErrorReporter.ThrowGeneralError();
        }

        this._connection.send(strMsg);
    },

    _wsOnOpen: function(event) {
        this._logger.trace("_wsOnOpen: Connection to web socket server ", this._getServerInfo.bind(this), " has been opened", event);
        this._turnOffWatingTimer();
        this._dispatchEvent(InnerChannelEvent.OPEN);
        this._processWaitingMessages();
    },

    _wsOnClose: function(event) {
        this._logger.trace("_wsOnClose: Connection to web socket server ", this._getServerInfo.bind(this), " has been closed. ", event);
        this._clearWaitingMessagesList();
        this._dispatchEvent(InnerChannelEvent.CLOSE);
    },

    _wsOnError: function(error) {
        this._logger.warn("_wsOnError: Error occured: ", error, " for server ",  this._getServerInfo.bind(this));
        this._dispatchEvent(InnerChannelEvent.ERROR, error);
    },

    _wsOnMessage: function(event) {
        this._logger.trace("_wsOnMessage: Message received from the server ", this._getServerInfo.bind(this), ": ", event);
        if(event.type === "message") {
            this._dispatchEvent(InnerChannelEvent.MESSAGE, event.data);
        }
        else if(event.type === "error") {
            this._dispatchEvent(InnerChannelEvent.ERROR, event);
        }
        else {
            this._logger.warn("_wsOnMessage: Unexpected message type: " + event.type);
        }
    },

    _getServerInfo: function() {
        return "[Url: " + this._serverUrl + "]";
    },

    _isConnectionOpen: function() {
        if(Util.isNullOrUndefined(this._connection))
            return false;
        return this._connection.readyState === this._connection.OPEN;
    },

    _isConnectionClosed: function() {
        if(Util.isNullOrUndefined(this._connection))
            return true;
        if(this._connection.readyState === this._connection.CLOSED)
            return true;
        return false;
    },

    _dispatchEvent: function(eventName) {
        this._logger.trace("_dispatchEvent: called for event: " + eventName);

        if(!this._listeners[eventName]) {
            this._logger.info("_dispatchEvent: no listeners found for event: " + eventName);
            return;
        }

        var args = Util.makeArray(arguments);;
        args.splice(0, 1);

        this._listeners[eventName].forEach(function(listener) {
            listener.apply(listener, args);
        });
    },

    _processWaitingMessages: function() {
        this._sendWaitingMessages();
        this._clearWaitingMessagesList();
    },

    _sendWaitingMessages: function() {
        this._logger.trace("_sendWaitingMessages: called for " + this._waitingMessages.length + " waiting messages");
        this._waitingMessages.forEach(function(envelope) {
            this._send(envelope.msg);
        } .bind(this));
    },

    _clearWaitingMessagesList: function() {
        this._logger.trace("_clearWaitingMessagesList: called. Remove " + this._waitingMessages.length + " waiting messages");
        this._waitingMessages = [];
        this._turnOffWatingTimer();
    },

    _getWebSocketObjectName: function () {
        if ("WebSocket" in window)
            return "WebSocket";

        if ("MozWebSocket" in window)
            return "MozWebSocket";

        return null;
    }
};

Object.defineProperty(WebSocketComChannel.prototype, "WEBSOCKET_OBJECT_NAME", {
    value: WebSocketComChannel.prototype._getWebSocketObjectName(),
    configurable: true,
    writable: false
});