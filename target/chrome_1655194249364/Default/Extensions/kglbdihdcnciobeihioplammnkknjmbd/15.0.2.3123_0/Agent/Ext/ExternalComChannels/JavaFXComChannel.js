function JavaFXComChannel() {
    EventDispatcher.call(this, new LoggerUtil("ComChannels.JavaFXComChannel"));
    this._logger.trace("JavaFXComChannel: ctor completed");

    window._UFTJSAgentIf = {};
    window._UFTJSAgentIf.onStartRecord = this._onStartRecord.bind(this);
    window._UFTJSAgentIf.onStopRecord = this._onStopRecord.bind(this);
    window._UFTJSAgentIf.onBeforeUnload = function(){};
}

Util.inherit(JavaFXComChannel, EventDispatcher, {

    connect: function () {
        this._logger.debug("connect: trying to connect to JavaFXWebView; ");
        window._UFTJSAgentIf.onMessage = this._receiveMessage.bind(this);
    },

    disconnect: function () {
        this._logger.debug("disconnect: close connection to JavaFXWebView");
        // do nothing
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
        this._logger.trace("JavaFXComChannel: _sendEvent called", msg);
        var msgStr = JSON.stringify(msg);
        window._hpJavaBridge.sendEvent(msgStr);
    },
    _receiveMessage: function (msgStr, uid) {
        this._logger.debug("JavaFXComChannel.receiveMessage() -> ", msgStr);
        var msg = JSON.parse(msgStr);
        this._onIncomingMessage(msg);
        this._dispatchMsgHelper(msg, uid);
        return true;
    },
    
    _sendResponse: function (msg) {
        this._logger.debug("JavaFXComChannel._sendResponse() -> ", msg);
        if (msg.data && msg.data.data && msg.data.data.isInternalAgentMSG) {
            delete msg.data.data.isInternalAgentMSG;
            return;
        }

        var msgStr = JSON.stringify(msg);
        if(typeof msg.uid !=="undefined")
            window._hpJavaBridge.sendResponse(msgStr, msg.uid);
        else
            window._hpJavaBridge.sendResponse(msgStr);
    },

    _dispatchMsgHelper: function (msgdata, uid) {
        var msg = {
            "type": "request",
            "data": msgdata
        };

        if (typeof uid !== "undefined") {
            msg.uid = uid;
        }

        this._logger.trace("_onDispatchEvent msg="+JSON.stringify(msg));
        this._dispatchEvent(InnerChannelEvent.MESSAGE, msg);
    },

    _onIncomingMessage: function (msg) {
        if (msg.data._msgType !== "QUERY_OBJ_POINT_TO_ID" && msg.data._msgType !== "QUERY_ATTR")
            return;
        this._logger.trace("_onIncomingMessage: convert screen pos to page pos");
       
        // 1) convert position-related values
        Util.traverseObject(msg, function (parentNode, nodeName, parentPath) {
            if (msg.data._msgType === "QUERY_OBJ_POINT_TO_ID" && nodeName === "pos" ||
                msg.data._msgType === "QUERY_ATTR" && nodeName === "text obj from point") {
                var pos = parentNode[nodeName];
                var windowRect = window._hpJavaBridge.webViewScreenRect();
                pos.x -= windowRect.left;
                pos.y -= windowRect.top;
            }
        });
        if(msg.data._msgType === "QUERY_OBJ_POINT_TO_ID")
            msg.data._msgType = "QUERY_OBJ_CLIENT_POINT_TO_ID";
    },

    _onStartRecord: function () {
        var startRecordMsg = this._createGlobalVariablesMsg({
            WebActivityState: 1,
        });
        startRecordMsg.isInternalAgentMSG = true;

        this._dispatchMsgHelper({ "data": startRecordMsg });
    },

    _onStopRecord: function () {
        var stopRecordMsg = this._createGlobalVariablesMsg({ WebActivityState: 0 });
        stopRecordMsg.isInternalAgentMSG = true;
        this._dispatchMsgHelper({ "data": stopRecordMsg });
    },

    _createGlobalVariablesMsg: function (data) {
        var names = [];
        var values = [];
        Object.keys(data).forEach(function (key) {
            names.push(key);
            values.push(data[key]);
        });

        return new Msg('SRVC_SET_GLOBAL_VARIABLES', RtIdUtils.GetAgentRtid(), { name: [names], value: [values] });
    },
    
});