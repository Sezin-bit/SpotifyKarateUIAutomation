function GroupedComChannel() {
    this._logger = new LoggerUtil("ComChannels.GroupedComChannel");

    this._wrappedChannels = [];
    var argsLength = arguments.length;
    for (var i = 0; i < argsLength; i++) {
        var channel = arguments[i];
        var wrappedChannel = {
            channel: channel,
            status: InnerChannelStatus.CLOSED,//closed, connecting, open
            canSendMessage: function () {
                return this.status === InnerChannelStatus.OPEN || this.status === InnerChannelStatus.CONNECTING;
            },
            connectErrorHandler: null//stored to remove once connected
        };
        wrappedChannel.connectErrorHandler = this._onChannelConnectError.bind(this, wrappedChannel);

        channel.addListener(InnerChannelEvent.OPEN, this._onChannelOpen.bind(this, wrappedChannel));
        channel.addListener(InnerChannelEvent.ERROR, wrappedChannel.connectErrorHandler);
        channel.addListener(InnerChannelEvent.CLOSE, this._onChannelClose.bind(this, wrappedChannel));
        this._wrappedChannels.push(wrappedChannel);
    }

    this._nextUid = 1;
    this._responseCallbacks = {};
}


GroupedComChannel.prototype = {
    _logger: null,
    _wrappedChannels: null,
    _responseCallbacks: null,
    _nextUid: null,
    _externalErrorListener: null, //saving external error listener, to be delegated to a channel once it connects.
    _externalOnOpenListener: null, //will be called once all channels are connected.

    // *** Public methods ***
    shouldConnect: function () {
        return this._wrappedChannels.some(function (wrappedChannel) {
            return wrappedChannel.status === InnerChannelStatus.CLOSED;
        });
    },


    init: function () {
        this._logger.trace("init");
        this._wrappedChannels.forEach(function (wrappedChannel) {
            wrappedChannel.channel.init();
        });
    },

    getComChannelID: function () {
        this._logger.trace("getComChannelID: called");
        return "GroupedComChannel";
    },

    connect: function (serverUrl) {
        this._logger.trace("connect: trying to connect to server: ", serverUrl, " on all channels");

        this._wrappedChannels.forEach(function (wrappedChannel) {
            if (wrappedChannel.status === InnerChannelStatus.CLOSED) {
                wrappedChannel.status = InnerChannelStatus.CONNECTING;
                wrappedChannel.channel.connect(serverUrl);
            }
        });
    },

    disconnect: function () {
        this._logger.trace("disconnect: close connection on all channels");

        this._wrappedChannels.forEach(function (wrappedChannel) {
            if (wrappedChannel.channel.supportReconnect()){
                wrappedChannel.channel.disconnect();
                wrappedChannel.status = InnerChannelStatus.CLOSED;
                wrappedChannel.connectErrorHandler = this._onChannelConnectError.bind(this, wrappedChannel);
            }
        },this);
    },

    sendMessage: function (msg) {
        this._logger.trace("sendMessage: called with: ", msg);

        switch (msg.type) {
            case "response":
                var responseCallback = this._responseCallbacks[msg.uid];
                if (!responseCallback) {
                    this._logger.error("sendMessage: unable to find callback for uid ", msg.uid, " in message: ", msg);
                    return;
                }

                this._logger.debug("send response to a specific channel");
                delete this._responseCallbacks[msg.uid];
                responseCallback(msg);
                return;
            case "request":
                this._logger.error("sendMessage: received unexpected Request message: ", msg);
                /* falls through */
            default:
                this._logger.debug("sendMessage: send message to all channels with uid: ", msg.uid);

                this._wrappedChannels.forEach(function (wrappedChannel) {
                    if (wrappedChannel.canSendMessage())
                        wrappedChannel.channel.sendMessage(msg);
                });
        }
    },

    addListener: function (eventName, listenerFunction) {
        this._logger.trace("addListener: called for event '", eventName, "'");

        switch(eventName) {
            case InnerChannelEvent.MESSAGE:
                this._wrappedChannels.forEach(function(wrappedChannel) {
                    wrappedChannel.channel.addListener(eventName,
                        this._onMessage.bind(this, wrappedChannel.channel, listenerFunction));
                }, this);
                break;
            case InnerChannelEvent.ERROR:
                this._externalErrorListener = listenerFunction;
                this._wrappedChannels.forEach(function(wrappedChannel) {
                    //if the channel is not connected yet, don't pass errors to the external com channel
                    if (wrappedChannel.status === InnerChannelStatus.OPEN) {
                        wrappedChannel.channel.addListener(eventName, listenerFunction);
                    }
                }, this);
                break;
            case InnerChannelEvent.OPEN:
                //store the listener function, call once all channels are connected.
                this._externalOnOpenListener = listenerFunction;
                break;
            default:
                this._wrappedChannels.forEach(function(wrappedChannel) {
                    wrappedChannel.channel.addListener(eventName, listenerFunction);
                }, this);
        }
    },

    removeListener: function (eventName, listenerFunction) {
        this._logger.trace("removeListener: called for event '" + eventName + "'");

        if(eventName === InnerChannelEvent.MESSAGE) {
            this._logger.error("removeListener: called with 'message' event");
            return;
        }

        this._wrappedChannels.forEach(function(wrappedChannel) {
            wrappedChannel.channel.removeListener(eventName, listenerFunction);
        }, this);
    },

    removeAllListeners: function() {
        this._logger.info("removeAllListeners: called for ", this.getComChannelID());
        this._wrappedChannels.forEach(function(wrappedChannel) {
            wrappedChannel.channel.removeAllListeners();
        }, this);
    },

    // *** Private methods ***
    _getNextUid: function () {
        return this._nextUid++;
    },

    _onMessage: function (channel, onMessageFunc, message) {
        this._logger.debug("_onMessage: ", message);
        var receivedMessage = typeof message === 'string' ? Util.parseJSON(message, this._logger) : message;
        var origUid = receivedMessage.uid;
        var modifiedUid = this._getNextUid();
        receivedMessage.uid = modifiedUid;
        if (receivedMessage.type === 'request') {
            this._responseCallbacks[modifiedUid] = this._responseCallback.bind(this, channel, origUid);
        }
        return onMessageFunc(receivedMessage);
    },

    _responseCallback: function (channel, origUid, message) {
        message.uid = origUid;
        channel.sendMessage(message);
    },

    _onChannelClose: function (wrappedChannel) {
        wrappedChannel.status = InnerChannelStatus.CLOSED;
    },

    _onChannelOpen: function(wrappedChannel) {
        this._logger.info("_onChannelOpen: channel id: ", wrappedChannel.channel.getComChannelID(), " connected");

        wrappedChannel.status = InnerChannelStatus.OPEN;

        //channel connected replace the error handler of the channel with the stored external com channel handler.
        if (wrappedChannel.connectErrorHandler == null) {
            this._logger.error("_onChannelOpen: Unexpected - channel id ", wrappedChannel.channel.getComChannelID(), " doesn't have an attached error handler");
        }
        else {
            wrappedChannel.channel.removeListener(InnerChannelEvent.ERROR, wrappedChannel.connectErrorHandler);
            delete wrappedChannel.connectErrorHandler;
        }

        if (this._externalErrorListener) {
            //in case that error listener is registered more than once
            wrappedChannel.channel.removeListener(InnerChannelEvent.ERROR, this._externalErrorListener);
            wrappedChannel.channel.addListener(InnerChannelEvent.ERROR, this._externalErrorListener);
        }

        this._callExternalOpenEvent();
    },

    _onChannelConnectError: function(wrappedChannel, event) {
        wrappedChannel.status = InnerChannelStatus.CLOSED;
        if (this._wrappedChannels.length > 1) {
            this._logger.info("_onChannelConnectError: channel id: ", wrappedChannel.channel.getComChannelID(), " failed to connect and will be removed from the group");

            var index = this._wrappedChannels.indexOf(wrappedChannel);
            if(index < 0) {
                this._logger.error("_onChannelConnectError: received error on a channel not in _wrappedChannels");
                return;
            }

            this._callExternalOpenEvent(); //check if all channels are open, inform external com channel.
        } else {
            //connection to the only/last channel failed! need to send error to external com channel.
            this._logger.error("_onChannelConnectError: channel id: ", wrappedChannel.channel.getComChannelID(), " failed to connect and it is the only channel in the group. Notifying the external com channel");

            if(this._externalErrorListener) {
                this._externalErrorListener(event);
            }
        }
    },

    //calls this._externalOnOpenListener if all channels are connected
    _callExternalOpenEvent: function () {
        var connectingChannels = this._wrappedChannels.filter(function (wrappedChannel) {
            return wrappedChannel.status === InnerChannelStatus.CONNECTING;
        });
        if (connectingChannels.length > 0)
            return;

        //all channels are connected.
        //add the _externalOnOpenListener to all channels, so that removeListener will work
        this._wrappedChannels.forEach(function (wrappedChannel) {
            if (wrappedChannel.status === InnerChannelStatus.OPEN)
                //in case that open listener is registered more than once
                wrappedChannel.channel.removeListener(InnerChannelEvent.OPEN, this._externalOnOpenListener);
                wrappedChannel.channel.addListener(InnerChannelEvent.OPEN, this._externalOnOpenListener);
        }, this);

        //inform the external com channel all channels are open!
        this._externalOnOpenListener.apply(this._externalOnOpenListener);
    },
};

