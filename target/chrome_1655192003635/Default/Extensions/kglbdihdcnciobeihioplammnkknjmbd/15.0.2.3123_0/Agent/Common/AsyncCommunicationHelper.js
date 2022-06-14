function AsyncCommunicationHelper(options)
{
    this._logger = new LoggerUtil("Common.AsyncCommunicationHelper");
    this._initializeOptions(options);
    this._logger.info("c'tor: Created with the following options:",this._options);
    this._listeners = {};
    this._pendingAckForAsynMsgs = [];
    this._timerID = -1;
}

AsyncCommunicationHelper.prototype = {
    //members
    _logger: null,
    _pendingAckForAsynMsgs: [],
    _timerID: -1,
    _nextMessageID: 0,
    _listeners: null,
    _options: null,
    //public methods
    updateMessageWithNeededInfo: function (msg) {
        if (!Util.isUndefined(msg._ComAsyncInfo))
            this._logger.error("updateMessageWithNeededInfo: there is already asyncID on this message please handle it");

        msg._ComAsyncInfo = { id: ++AsyncCommunicationHelper.prototype._nextMessageID };
    },
    addAsyncMsgToQueue: function (msg,destinationChannelId) {
        this._logger.trace("addAsyncMsgToQueue: Started");
        this._pendingAckForAsynMsgs.push({ 
            msg: msg, 
            sendTime: new Date(),
            destinationChannel: destinationChannelId
        });

        if (this._timerID === -1) {
            //No Resend timer was set, going to set one now.
            this._timerID = Util.setInterval(this.onResendTimer.bind(this), this._options.timeout);
        }
        this._logger.trace("addAsyncMsgToQueue: Finished");
    },
    onAckForAsyncMsg: function (msg) {
        this._logger.trace("onAckForAsyncMsg: Started for message id:" + msg._ComAsyncInfo.id);
        this.removeMessageFromAsyncQueue(msg);
        this._logger.trace("onAckForAsyncMsg: Finished");
    },
    removeMessageFromAsyncQueue: function (msg) {
        this._logger.trace("removeMessageFromAsyncQueue: Started");
        var foundMsg = this._pendingAckForAsynMsgs.filter(function (queuedMsg) {
            if (!queuedMsg.msg._ComAsyncInfo || !msg._ComAsyncInfo)
                return false;

            return queuedMsg.msg._ComAsyncInfo.id === msg._ComAsyncInfo.id;
        });
        if (foundMsg.length !== 1) {
            this._logger.error("removeMessageFromAsyncQueue: Async message not queued or there is too manay of them length=", foundMsg.length, "\nCurrent Message:", msg, "\nAsync Queue:", this._pendingAckForAsynMsgs);
            return;
        }
        //removes the message from the pending array
        var elementIndex = this._pendingAckForAsynMsgs.indexOf(foundMsg[0]);
        this._pendingAckForAsynMsgs.splice(elementIndex, 1);
        if (this._pendingAckForAsynMsgs.length === 0) {
            Util.clearInterval(this._timerID);
            this._timerID = -1;
        }
        delete msg._ComAsyncInfo;
        this._logger.trace("removeMessageFromAsyncQueue: End");
    },
    addListener: function (eventName, listenerObj) {
        this._logger.info("addListener: called");
        if (!this._listeners[eventName])
            this._listeners[eventName] = [];

        this._listeners[eventName].push(listenerObj);
    },
    removeListener: function (eventName, listenerObj) {
        this._logger.info("removeListener: called");
        if (!this._listeners[eventName]) {
            this._logger.error("removeListener: Trying to remove listener that is not registered");
            return;
        }
        var listenerIdx = this._listeners[eventName].indexOf(listenerObj);
        if (listenerIdx === -1) {
            this._logger.error("removeListener: Removing unknown listener");
            return;
        }
        if (this._inMiddleOfEvent)
            this._listeners[eventName][listenerIdx].toBeDeleted = true;
        else
            this._listeners[eventName].splice(listenerIdx, 1);
    },
    dispatchEvent: function (eventName) {
        //fix the argument array by removing the event name and chrome port and adding the client port
        var args = Util.makeArray(arguments);
        args.splice(0, 1);

        //we use for statement instead of forEach since the listeners array might change thus we need to take care of it.
        var funcName = "on" + eventName;
        var listeners = this._listeners[eventName];
        this._inMiddleOfEvent = true;
        for (var i = 0; i < listeners.length; ++i) {
            if (!listeners[i].toBeDeleted)
                listeners[i][funcName].apply(listeners[i], args);
        }
        delete this._inMiddleOfEvent;

        //removing listeners that were deleted.
        this._listeners[eventName] = this._listeners[eventName].filter(function (listener) {
            return !listener.toBeDeleted;
        });

    },
    setAckMessage: function (msg) {
        if (msg._ComAsyncInfo && msg._ComAsyncInfo.id) {
            this._logger.trace("setAckMessage: Started for message id:" + msg._ComAsyncInfo.id);
            this.removeMessageFromAsyncQueue(msg);
            this._logger.trace("setAckMessage: Finished");
        }
    },
    //event handlers
    onResendTimer: function () {
        this._logger.trace("onResendTimer: Started");
        var timedoutMessages = this._pendingAckForAsynMsgs.filter(function (waitingForAckMsg) {
            var timespanInMS = (new Date()).getTime() - waitingForAckMsg.sendTime.getTime();

            //handle the duration of message specially
            var duration = waitingForAckMsg.msg.data._data.duration;
            if (!duration) {
                duration = 0;
            }
            return timespanInMS >= this._options.timeout + duration;
        }, this);
        this.notifyTimedOutMessages(timedoutMessages);
        this._logger.trace("onResendTimer: Finished");
    },
    onDestinationHasDisconnected: function(destinationId){
        this._logger.info("onDestinationHasDisconnected:", destinationId ," Has disconnected");
        var pendingMessages = this._pendingAckForAsynMsgs.filter(function(pendingMessgaeInfo){
            return pendingMessgaeInfo.destinationChannel != null && pendingMessgaeInfo.destinationChannel === destinationId;
        },this);

        if (pendingMessages.length > 0) {
            this._logger.debug("onDestinationHasDisconnected: rejecting pending messages. #of messages:", pendingMessages.length);
            this.notifyTimedOutMessages(pendingMessages);
        }

        this._logger.trace("onDestinationHasDisconnected: finished");
    },

    notifyTimedOutMessages: function(timedoutMessages){
        timedoutMessages.forEach(function (timedOutMessage) {
            this.removeMessageFromAsyncQueue(timedOutMessage.msg);
            this.dispatchEvent("MessageTimedOut", timedOutMessage.msg);
        }, this);
    },

    getPendingMsgs:function(targetId){
        var pendingMessages = this._pendingAckForAsynMsgs.filter(function (waitingForAckMsg) {
            return waitingForAckMsg.msg.targetId === targetId;
        });
        return pendingMessages.map(function(waitingForAckMsg){return waitingForAckMsg.msg;});
    },

    _initializeOptions: function(options){
        options = options || {};
        this._options = {
            timeout: options.timeout || 2*1000
        };
    }
};
