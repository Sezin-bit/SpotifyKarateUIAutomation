
function WebDriverServerComChannel() {
    EventDispatcher.call(this, new LoggerUtil("ComChannels.WebDriverServerComChannel"));
    this._logger.trace("WebDriverServerComChannel: ctor completed");
    this.WEB_PN_ID = {};
}

function WebDriverAgent() {
    this._logger = new LoggerUtil("ComChannels.WebDriverAgent");
    this._browserId = window._QTP.WebDriverInfo.WebDriverId.id;

    /**
     * onMessage called in order to pass message to the agent.
     */
    this.onMessage = null;
    /**
     * getCachedMsg can be called to get cached message(s) in agent.
     */
    this.getCachedMsg = null;

    /**
     * registerEventCallback can be called with a callback function to register an event callback,
     * which will be filled by next event from agent.
    */
    this.registerEventCallback = null;

    this.getBrowserId = function() {
        return this._browserId;
    };

    this.getBrowserEventCreationMsg = function() {
        var browserInfo = {
            hwnd: 0,
            version: Util.browserApplicationVersion(this._logger),
            WEB_PN_ID: { browser: this._browserId, page: -1, frame: -1, object: null }
        };
        var msg = new Msg("EVENT_BROWSER_CREATE", ext.dispatcher.getParentDispatcherID(), browserInfo);
        return msg;
    };

    this.disconnect = function() {
        this.onMessage = null;
        this.getCachedMsg = null;
        this.registerEventCallback = null;
    };
}

Util.inherit(WebDriverServerComChannel, EventDispatcher, {
    _webDriverAgent : null,
    _webDriverBrowserId: -1,
    _responseCallbacks: {},
    _eventCallback: null,
    _messageCache: {},

    _PositionRelatedPropertyNames : {
        //'x': 'horizontal',
        //'y': 'vertical',
        'abs_x': 'horizontal',
        'abs_y': 'vertical',
        'width': 'horizontal',
        'height': 'vertical',
        'view_x':'horizontal',
        'view_y':'vertical'
    },
   
    connect: function () {
        this._logger.debug("connect: trying to connect to WebDriverServer; ", window._QTP);
        window._QTP = window._QTP || {};
        this._webDriverAgent = window._QTP.WebDriverAgent = new WebDriverAgent();
        this._webDriverAgent.onMessage = this._receiveMessage.bind(this);
        this._webDriverAgent.getCachedMsg = this._getCachedMsg.bind(this);
        this._webDriverAgent.registerEventCallback = this._registerEventCallback.bind(this);
    },

    disconnect: function () {
        this._logger.debug("disconnect: close connection to WebDriverServer");
        if (this._webDriverAgent) {
            this._webDriverAgent.disconnect();
            delete window._QTP.WebDriverAgent;
            delete this._webDriverAgent;
        }
    },

    sendMessage: function (msg) {
        if (msg.type === "response") {
            this._sendResponse(msg);
        }
        else {
            this._sendEvent(msg);
        }
    },

    _sendEvent: function (msg){
        this._logger.trace("WebDriverServerComChannel: _sendEvent called");
        var msgStr = JSON.stringify(msg);
        if (this._eventCallback) {
            this._logger.trace("WebDrvierServerComChannel: _sendEvent call AsyncCallback. msg=" + msgStr);
            this._addMessageToCache(msg.uid, msgStr);
            this._eventCallback(this._getCachedMsg());
            delete this._eventCallback;
        }
        else {
            this._logger.trace("WebDriverServerComChannel: _sendEvent add message to cache. msg =" + msgStr);
            this._addMessageToCache(msg.uid, msgStr);
        }

    },
    _receiveMessage: function (msg, callback) {
        this._logger.debug("WebDriverServerComChannel.receiveMessage() -> ");

        if (!!callback) {
            this._responseCallbacks[msg.uid] = callback;
        }
        this._dispatchEvent(InnerChannelEvent.MESSAGE, msg);
        return true;
    },
    
    _registerEventCallback:function(callback) {
        this._eventCallback = callback;
    },

    _sendResponse: function (msg) {

        this._onOutgoingMessage(msg);

        var msgStr = JSON.stringify(msg);

        if (this._responseCallbacks[msg.uid]) {
            this._responseCallbacks[msg.uid](msgStr);
            delete this._responseCallbacks[msg.uid];
        }
        else {
            this._addMessageToCache(msg.uid, msgStr);
        }
    },
    
    /**
   * _onOutgoingMessage() performs common actions on outgoing messages
   * @param msg - the outgoing message 
   */
    _onOutgoingMessage: function (msg) {
        if (!window._QTP.WebDriverInfo || window._QTP.WebDriverInfo.WebDriverType !== "Mobile")
            return;

        var message = msg.data.data;
        if (message._to.page!==-1) {
            // 1) convert position-related values
            Util.traverseObject(msg, function (parentNode, nodeName, parentPath) {

                if (this._isPositionNode(parentNode, nodeName))
                    this._convertOutboundPositionValue(parentNode, nodeName, parentPath);

            }.bind(this));
        }
    },

    /**
  * _isPositionNode() checks if a node name is one of the position-related nodes
  * @param {Object} obj - the object that might contain a position-related node 
  * @param {String} nodeName - name of the node in the message object
  * @returns {Boolean} true if the node represents a position related property, false otherwise
  */
    _isPositionNode: function (obj, nodeName) {

        // it is a position-related node if it's name is in PositionRelatedPropertyNames and it is a numeric node
        var isRectNodeName = this._PositionRelatedPropertyNames[nodeName];
        var isNumber = (typeof (obj[nodeName]) == "number");

        return (isRectNodeName && isNumber);
    },

    _convertOutboundPositionValue: function (parentNode, propertyName, parentPath) {

        var oldVal = parentNode[propertyName];
        switch (this._PositionRelatedPropertyNames[propertyName]) {
            case "horizontal":
                parentNode[propertyName] = Math.floor(oldVal * window.outerWidth / window.innerWidth);
                break;
            case "vertical":
                parentNode[propertyName] = Math.floor(oldVal * window.outerHeight / window.innerHeight);
                break;
        }
    },


    _getCachedMsg: function(uid) {
        if (uid) {
            var reMsg = this._messageCache[uid];
            delete this._messageCache[uid];
            return reMsg;
        } else {
            var reMsgs = this._messageCache;
            this._messageCache = {};
            return reMsgs;
        }
    },

    _addMessageToCache: function ( uid, msgStr ) {
       this._messageCache[uid] = msgStr;
    }

});
