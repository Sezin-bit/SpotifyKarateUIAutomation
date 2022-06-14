function FrameCommunicationChannel() {
    this._logger = new LoggerUtil("ComChannel.FrameCommunicationChannel");
    this._logger.info(" created");
    this._listeners = {};
}

FrameCommunicationChannel.prototype = {
    //members
    _logger: null,
    id: null,
    _closestAncestorID: null,
    _parentId: null,
    _listeners: null,

    //methods
    init: function (initInfo) {
        this._logger.info("init: called with: ", initInfo);

        this.id = Util.shallowObjectClone(initInfo.frameID);
        FrameCommunicationChannelInHTMLContext._comID = Util.shallowObjectClone(initInfo.frameID);

        if (BrowserServices.isRunningInPageContext) {
            FrameCommunicationChannelInHTMLContext.setLogger(new LoggerUtil("FrameCommunicationChannelInHTMLContext"));
            window.addEventListener("message", FrameCommunicationChannelInHTMLContext.onMessageFromContent.bind(FrameCommunicationChannelInHTMLContext), false);
        } else {
            content.domSubscriber.startNamespace();
            content.domSubscriber.addUtilityObject("CrossContextCfgUtil", CrossContextCfgUtil);
            content.domSubscriber.addUtilityObject("ShadowDomUtil", ShadowDomUtil);
            content.domSubscriber.addUtilityObject("FrameCommunicationChannelInHTMLContext ", FrameCommunicationChannelInHTMLContext);
            content.domSubscriber.addScript("FrameCommunicationChannelInHTMLContext.setLogger(_logger);");
            content.domSubscriber.endNamespace();
        }

        window.addEventListener('message', this.onMessage.bind(this));

    },
    _sendMessageHelper: function (eventType, msg, destinationId) {
        this._logger.prettyTrace("_sendMessageHelper: send to: ", destinationId, " - message: ", msg);
        var target;
        if (RtIdUtils.IsRTIDEqual(this._closestAncestorID, destinationId))
            target = null;
        else
            target = destinationId;

        var reqMsg = {
            source: "FrameCommunicationChannel",
            msgType: eventType,
            target: target,
            data: msg
        };
        window.postMessage(reqMsg, "*");
    },
    sendMessage: function (msg, destinationId) {
        this._logger.trace("sendMessage: called");
        this._sendMessageHelper("request", msg, destinationId);
    },
    sendEvent: function (msg, destinationId) {
        this._logger.trace("sendEvent: called");
        this._sendMessageHelper("event", msg, destinationId);
    },
    addListener: function (eventName, listenerFunction) {
        this._logger.trace("addListener: called");
        if (!this._listeners[eventName])
            this._listeners[eventName] = [];

        this._listeners[eventName].push(listenerFunction);
    },
    removeListener: function (eventName, listenerFunction) {
        this._logger.trace("addListener: called");
        if (!this._listeners[eventName]) {
            this._logger.error("removeListener: Trying to remove listener that is not registered");
            return;
        }
        this._listeners[eventName] = this._listeners[eventName].filter(function (listener) {
            return listener !== listenerFunction;
        });
    },

    dispatchEvent: function (eventName) {
        this._logger.trace("dispatchEvent: called for event " + eventName);
        //fix the argument array by removing the event name and chrome port and adding the client port
        var args = Util.makeArray(arguments);;
        args.splice(0, 1);

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
    onMessage: function (msgEventObj) {
        var msg = Util.deepObjectClone(msgEventObj.data);
        if (typeof (msg) !== "object")
            return;

        if (msg.source !== "FrameCommunicationChannelInHTMLContext")
            return;

        try {
            switch (msg.msgType) {
                case "contentUnsupoortedACK":
                    this.unSupportedContentHandler();
                    break;
                case "MarkDispatcherInfo":
                    this.putDescendantInfoOnFrameElem(msg);
                    break;
                case "frameBornAck":
                    this.contentDispatcherAttachedEventHandler(msg);
                    break;
                case "request":
                    this.handleRequest(msg);
                    break;
                case "response":
                    this.handleResponse(msg);
                    break;
                case "event":
                    this._logger.trace("onMessage: Got the following 'event': ", msg);
                    this.dispatchEvent("event", msg.data);
                    break;
                default:
                    break;
            }
        }
        catch (ex) {
            this._logger.error("messageHandlerInContent: Got exception " + ex + "\nStack:" + ex.stack);
        }
    },
    handleRequest: function (msg) {
        this._logger.prettyTrace("handleRequest: Received the following message: ", msg);
        var targetTo = msg.data._to;
        if (targetTo.frame !== this.id.frame) {
            this._logger.trace("handleRequest: message is not the target of this frame current =", this.id, " target =", targetTo);
            return;
        }

        var logger = this._logger;
        try {
            this.dispatchEvent("message", msg.data, null /*no sender currently*/, function (res) {
                msg.data = res;
                msg.source = "FrameCommunicationChannel";
                msg.msgType = "response";
                logger.trace("handleRequest: Going to send the following response:", msg);
                window.postMessage(msg, "*");
            });
        }
        catch (e) {
            logger.error("handleRequest: Exception occurred. Send error message back. Exception:" + e + "\nStack:" + e.stack);
            msg.data.status = "ERROR";
            msg.data.details = e ? e.message : null;
            msg.source = "FrameCommunicationChannel";
            msg.msgType = "response";
            window.postMessage(msg, "*");
        }
    },
    handleResponse: function (msg) {
        this._logger.trace("handleResponse: Got the following response: ", msg);
        this.dispatchEvent("response", msg.data);
    },
    connect: function (connectionInfo) {
        this._logger.trace("connect: Started with the following connection info ", connectionInfo);
        this._closestAncestorID = { browser: -1, page: -1, frame: -1, object: null };
        if (!connectionInfo.isPage) {
            var bornMsg = {
                source: "FrameCommunicationChannel",
                msgType: "Notify_Dispatcher_Created",
                data: { comID: Util.shallowObjectClone(this.id) }
            };
            window.postMessage(bornMsg, "*");
        }
        else {
            this.dispatchEvent("connected");
        }
    },
    disconnect: function () {
    },
    contentDispatcherAttachedEventHandler: function (msg) {
        this._logger.info("contentDispatcherAttachedEventHandler: Started");
        this._closestAncestorID = msg.data.closestAncestorID;
        this.dispatchEvent("connected");
    },
    unSupportedContentHandler: function () {
        this._logger.error("unSupportedContentHandler: Unsupported Frame on " + document.location.href);
        this.dispatchEvent("connected");
    },
    putDescendantInfoOnFrameElem: function (msg) {
        this._logger.trace("putDescendantInfoOnFrameElem: Started with the following message:", msg);
        var framePath = msg.data.framePath;
        var frameElem = this.getFrameElemFromPath(document, framePath);
        if (!frameElem) {
            this._logger.error("putDescendantInfoOnFrameElem: Failed to find frame element!!!!!");
            return;
        }

        if (!frameElem.__QTP__OBJ)
            frameElem.__QTP__OBJ = {};

        var qtpObj = frameElem.__QTP__OBJ;
        var comID = msg.data.frameCOMID;
        if ('comID' in qtpObj && qtpObj.comID !== comID) {
            this._logger.info("putDescendantInfoOnFrameElem: frame had another COM ID registered, setting previous value to = ", qtpObj.comID);
            qtpObj.previousComID = qtpObj.comID;
        }
        else if (qtpObj.comID === comID)
            this._logger.info("putDescendantInfoOnFrameElem: frame already had this COM ID registered: ", qtpObj.comID);

        this._logger.debug("putDescendantInfoOnFrameElem: Updating frame element with comID:", comID);
        qtpObj.comID = comID;
    },
    getFrameElemFromPath: function (doc, framePath) {
        Util.assert(framePath.length > 0, "getFrameElemFromPath: FrameElement not found!", this._logger);
        if (framePath.length <= 0)
            return null;

        var child = framePath.pop();        //we get the path in reverse order to use pop.
        var frameElems = ContentUtils.findIframeConsiderXPath(doc, 'IFRAME,FRAME', this._logger);

        if (framePath.length === 0)
            return frameElems[child];
        else
            return this.getFrameElemFromPath(frameElems[child].contentDocument, framePath);
    }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var FrameCommunicationChannelInHTMLContext = {
    _comID: -1,
    _logger: null,
    _keyArray:[],
    _valueArray:[],
    _flushInternalSet: function(){
        this._keyArray = [];
        this._valueArray = [];
    },
    _setToInternalSet: function(keyObject, valueObject){
        if(!this._keyArray) this._keyArray = [];
        if(!this._valueArray) this._valueArray = [];
        
        if(this._keyArray.length !== this._valueArray.length)
            this._flushInternalSet();

        var index = this._keyArray.indexOf(keyObject); 
        if(index == -1){
            this._valueArray.push(valueObject);
            this._keyArray.push(keyObject);
        }
        else{
            this._valueArray[index] = valueObject;
        }
    },
    _getFromInternalSet:function(keyObject){
        if(!this._keyArray || !this._valueArray)
            return null;
        var index = this._keyArray.indexOf(keyObject); 

        return this._valueArray[index];
    }, 
    setLogger: function (logger) {
        this._logger = logger;
    },

    onMessageFromContent: function (msgEventObj) {
        var msg = msgEventObj.data;

        if (typeof (msg) !== "object")
            return;

        if (msg.source !== "FrameCommunicationChannel" && msg.source !== "FrameCommunicationChannelInHTMLContext")
            return;

        try {
            switch (msg.msgType) {
                case "Notify_Dispatcher_Created":
                    this._logger.info("onMessageFromContent: Received Notify_Dispatcher_Created");
                    this.sendBornMessageToParents(msg.data.comID);
                    break;
                case "descendantBorn":
                    this._logger.info("FrameCommunicationChannelInHTMLContext.onMessageFromContent: Received descendantBorn");
                    this.descendantBorn(msgEventObj.source, msg.data);
                    break;
                case "contentUnsupoortedACK":
                    this._logger.error("FrameCommunicationChannelInHTMLContext.onMessageFromContent: Received contentUnsupoortedACK");
                    window.clearTimeout(msg.data.timerID);
                    break;
                case "frameBornAck":
                    window.clearTimeout(msg.data.timerID);
                    this.closestParentWindow = msgEventObj.source;
                    break;
                case "response":
                case "request":
                case "event":
                    this.dispatchMessage(msg);
                    break;
                default:
                    break;
            }
        }
        catch (ex) {
            this._logger.error("FrameCommunicationChannelInHTMLContext.onMessageFromContent: Got Exception ", ex, "\n handling the message:", msg, "\nStack:", ex.stack);
        }
    },
    dispatchMessage: function (msg) {
        //requests should be only from content
        if (msg.source !== "FrameCommunicationChannel")
            return;

        this._logger.trace("dispatchMessage: Got a message the message:\n ", msg, "\n Dispatching it");

        msg.source = "FrameCommunicationChannelInHTMLContext";
        if (msg.target === null) {
            //since the response of the message will be sent to the HTML context of our parent (no source field in the event obj when handling in content)
            //we will change the target in the message to be our id and the parent will find us in the normal way.
            msg.target = this._comID;
            this.closestParentWindow.postMessage(msg, "*");
        }
        else {
            var childID = msg.target;
            //since the response of the message will be sent to the HTML context of our child (no source field in the event obj when handling in content)
            //we will change the target in the message to be -1 to indicate that the response will be sent to us (parent).
            msg.target = null;
            var childFrame = ContentUtils.findFrameElemByID(childID, document, this._logger);
            if (!childFrame) {
                this._logger.error("dispatchMessage: Failed to find child frame !!!");
                return; //TODO : Error handling !!!.
            }

            childFrame.contentWindow.postMessage(msg, "*");
        }
    },
    sendBornMessageToParents: function (comID, retryNum) {
        Util.assert(window.parent !== window, "We are page, how come we're here?", this._logger);
        retryNum = retryNum || 0;

        this._logger.info("sendBornMessageToParents: sending to all ancestors " + (retryNum !== 0 ? (" (Retry num " + retryNum + ")") : ""));

        if (retryNum >= 20) {
            this._logger.error("sendBornMessageToParents: Frame (" + window.location.href + ") Exceeds the number of retries (20) Send back unsupported frame");
            var ackMsg = {
                msgType: "contentUnsupoortedACK",
                source: "FrameCommunicationChannelInHTMLContext",
                data: { timerID: null }
            };
            window.postMessage(ackMsg, "*");
            return;
        }

        var ackTimerId = Util.setTimeout(this.sendBornMessageToParents.bind(this, comID, retryNum + 1), 500);
        var msg = {
            msgType: "descendantBorn",
            source: "FrameCommunicationChannelInHTMLContext",
            data: {
                frameCOMID: comID,
                timerID: ackTimerId
            }
        };

        var win = window;
        var i = 0;
        while (win !== win.parent) {
            win = win.parent;
            ++i;
            msg.data.generation = i; // for debugging
            this._logger.trace("sendBornMessageToParents: sending to ancestors #", i, " The following message ", msg);
            msg.data.frameName = window.name; // serve as iframe's identification if XSS exists in site like lightning salesforce 
            win.postMessage(msg, "*");
        }
    },
    descendantBorn: function (source, childBornInfo) {
        this._logger.trace("descendantBorn: Started");

        //it appears that in case the child is dead after it sent the message the source is undefined.
        if (!source) {
            this._logger.info("FrameCommunicationChannelInHTMLContext.descendantBorn: Got born message from a child that dead.");
            return;
        }

        var descendantId = childBornInfo.frameCOMID;
        // Get the closest injected ancestor
        var win = source;
        var p = win.parent;
        // using window.self rather than window so it can be mocked in unit tests
        while (p !== window && !ContentUtils.isInjectable(p, this._logger)) {
            p = p.parent;
        }

        // This is not the closest injected ancestor, do nothing
        if (p !== window) {
            this._logger.debug("descendantBorn: This is not the closest injected ancsetor, do nothing");
            return;
        }

        this._logger.debug("descendantBorn: This is the closest injected ancsetor");
        // Flatten window path up from win to the global window
        var curr = win;
        var windowPath = [];

        // Set the iframe's map to help identify which iframe it is.
        if (childBornInfo.frameName && typeof Map !== 'undefined') {
            this._setToInternalSet(win, childBornInfo.frameName);
        }

        while (curr !== window) {
            windowPath.push(curr);
            curr = curr.parent;
        }

      
        // Get the frame element's path of the source window by going down the chain (we have access since there's no XSS)
        var frameSearchRes = this.getFrameElemFromWindowPath(window, windowPath);
        var frameElemPath = frameSearchRes.path;
        var frameElem = frameSearchRes.elem;

        if (!frameElem) {
            this._logger.error("descendantBorn: Recursive frame finding function failed");
            var unsupportedAckMsg = {
                msgType: "contentUnsupoortedACK",
                source: "FrameCommunicationChannelInHTMLContext",
                data: { timerID: childBornInfo.timerID }
            };
            source.postMessage(unsupportedAckMsg, "*");
            return;
        }
        //found the element lets put the property on it.
        if (!frameElem.__QTP__OBJ)
            frameElem.__QTP__OBJ = {};

        var qtpObj = frameElem.__QTP__OBJ;
        var comID = descendantId;
        if ('comID' in qtpObj && qtpObj.comID !== comID) {
            this._logger.info("descendantBorn: frame had another COM ID registered, previous value = ", qtpObj.comID);
            qtpObj.previousComID = qtpObj.comID;
        }
        else if (qtpObj.comID === comID)
            this._logger.info("descendantBorn: frame already had this COM ID registered: ", qtpObj.comID);

        this._logger.info("descendantBorn: Updating frame element with comID:", descendantId);
        qtpObj.comID = descendantId;

        //asks the content dispatcher to do the same since we will need this property to be visilbe on both 
        //content and HTML context.
        this._logger.debug("descendantBorn: Going to ask the content context to mark this frame");
        var markMsg = {
            msgType: "MarkDispatcherInfo",
            source: "FrameCommunicationChannelInHTMLContext",
            data: { framePath: frameElemPath, frameCOMID: descendantId }
        };
        window.postMessage(markMsg, "*");

        //sends the reply to the sender
        var ackMsg = {
            msgType: "frameBornAck",
            source: "FrameCommunicationChannelInHTMLContext",
            data: { closestAncestorID: this._comID, timerID: childBornInfo.timerID }
        };
        source.postMessage(ackMsg, "*");
    },
    getFrameElemFromWindowPath: function (parent, path) {
        if (path.length === 0) {
            Util.assert(false, "getFrameElemFromWindowPath: FrameElement not found!", this._logger);
            return {};
        }

        var child = path.pop();
        var parentDoc = parent.document;

        var frameElems = ContentUtils.findIframeConsiderXPath(parentDoc, 'IFRAME,FRAME', this._logger);

        for (var i = 0; i < frameElems.length; ++i) {
            if (frameElems[i].contentWindow === child) {
                if (path.length === 0)
                    return { path: [i], elem: frameElems[i] };

                var res = this.getFrameElemFromWindowPath(child, path);
                return {
                    path: res.path ? res.path.concat([i]) : null,       //return reverse path inorder to perform pop easyly
                    elem: res.elem
                };
            }
        }
        // Sagi: this is a temporary solution
        // only if we cannot find the frame by contentWindow, we try to find the frame by name
        for (var i = 0; i < frameElems.length; ++i) {
            if ( this._getFromInternalSet(child) === frameElems[i].name) {
                if (path.length === 0)
                    return { path: [i], elem: frameElems[i] };
                
                var res = this.getFrameElemFromWindowPath(child, path);
                return {
                    path: res.path ? res.path.concat([i]) : null,       //return reverse path inorder to perform pop easyly
                    elem: res.elem
                };
            }
        }
        return {};
    }
};