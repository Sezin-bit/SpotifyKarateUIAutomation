// Temporary hardcoded start Record & end Record messages for testing the record functionality on mobile.
// These messages should be removed from here once we'll have replay functionality

window._QTP = window._QTP || {};
window._QTP.defaultObjectIdentificationProperties =
{
    "browser": {
        "assistive": [],
        "baseFilter": [
          "micclass"
        ],
        "mandatory": [
          "micclass"
        ],
        "optionalFilter": [
          "name",
          "title",
          "openurl",
          "opentitle",
          "hasstatusbar",
          "hasmenubar",
          "hastoolbar",
          "openedbytestingtool",
          "number of tabs"
        ],
        "selector": "creationtime"
    },
    "frame": {
        "assistive": [],
        "baseFilter": [
          "micclass"
        ],
        "mandatory": [
          "micclass",
          "name",
          "url without form data"
        ],
        "optionalFilter": [
          "name",
          "title",
          "url"
        ],
        "selector": "index"
    },
    "image": {
        "assistive": [],
        "baseFilter": [
          "html tag",
          "micclass"
        ],
        "mandatory": [
          "alt",
          "html tag",
          "image type",
          "micclass"
        ],
        "optionalFilter": [
          "alt",
          "image type",
          "html id",
          "name",
          "file name",
          "class",
          "visible",
          "width",
          "height"
        ],
        "selector": "index"
    },
    "link": {
        "assistive": [
          "role",
          "acc_name"
        ],
        "baseFilter": [
          "html tag",
          "micclass"
        ],
        "mandatory": [
          "html tag",
          "micclass",
          "text"
        ],
        "optionalFilter": [
          "text",
          "html id",
          "class",
          "name",
          "href",
          "visible",
          "acc_name"
        ],
        "selector": "index"
    },
    "page": {
        "assistive": [],
        "baseFilter": [
          "micclass"
        ],
        "mandatory": [
          "micclass",
          "url without form data"
        ],
        "optionalFilter": [
          "title",
          "url"
        ],
        "selector": "index"
    },
    "viewlink": {
        "assistive": [],
        "baseFilter": [],
        "mandatory": [
          "html tag",
          "innertext",
          "micclass"
        ],
        "optionalFilter": [],
        "selector": "index"
    },
    "webarea": {
        "assistive": [],
        "baseFilter": [
          "html tag",
          "micclass"
        ],
        "mandatory": [
          "alt",
          "html tag",
          "micclass"
        ],
        "optionalFilter": [
          "alt",
          "html id",
          "map name",
          "class",
          "href",
          "coords",
          "visible"
        ],
        "selector": "index"
    },
    "webaudio": {
        "assistive": [
          "html id",
          "src",
          "current source"
        ],
        "baseFilter": [
          "html tag",
          "micclass"
        ],
        "mandatory": [
          "html tag",
          "micclass",
          "sources"
        ],
        "optionalFilter": [
          "html id",
          "src",
          "sources",
          "current source",
          "duration",
          "autoplay",
          "loop",
          "class",
          "visible"
        ],
        "selector": "index"
    },
    "webbutton": {
        "assistive": [
          "role",
          "acc_name"
        ],
        "baseFilter": [
          "html tag",
          "micclass"
        ],
        "mandatory": [
          "html tag",
          "micclass",
          "name",
          "type"
        ],
        "optionalFilter": [
          "name",
          "type",
          "html id",
          "value",
          "class",
          "visible",
          "acc_name"
        ],
        "selector": "index"
    },
    "webcheckbox": {
        "assistive": [
          "role",
          "acc_name"
        ],
        "baseFilter": [
          "html tag",
          "micclass"
        ],
        "mandatory": [
          "html tag",
          "micclass",
          "name",
          "type"
        ],
        "optionalFilter": [
          "name",
          "type",
          "html id",
          "value",
          "class",
          "visible"
        ],
        "selector": "index"
    },
    "webedit": {
        "assistive": [
          "placeholder",
          "acc_name"
        ],
        "baseFilter": [
          "html tag",
          "micclass",
          "type"
        ],
        "mandatory": [
          "html tag",
          "micclass",
          "name",
          "type"
        ],
        "optionalFilter": [
          "name",
          "html id",
          "max length",
          "default value",
          "class",
          "rows",
          "placeholder",
          "acc_name"
        ],
        "selector": "index"
    },
    "webelement": {
        "assistive": [
          "acc_name"
        ],
        "baseFilter": [
          "html tag",
          "micclass"
        ],
        "mandatory": [
          "html tag",
          "innertext",
          "micclass"
        ],
        "optionalFilter": [
          "html id",
          "class",
          "innertext",
          "visible",
          "acc_name"
        ],
        "selector": "index"
    },
    "webfile": {
        "assistive": [],
        "baseFilter": [
          "html tag",
          "micclass"
        ],
        "mandatory": [
          "html tag",
          "micclass",
          "name",
          "type"
        ],
        "optionalFilter": [
          "name",
          "type",
          "html id",
          "class",
          "default value",
          "visible"
        ],
        "selector": "index"
    },
    "weblist": {
        "assistive": [
          "role",
          "acc_name"
        ],
        "baseFilter": [
          "html tag",
          "micclass"
        ],
        "mandatory": [
          "html tag",
          "micclass",
          "name"
        ],
        "optionalFilter": [
          "name",
          "html id",
          "class",
          "default value",
          "items count",
          "visible items",
          "visible",
          "acc_name",
          "first item"
        ],
        "selector": "index"
    },
    "webmenu": {
        "assistive": [
          "html id",
          "role",
          "acc_name"
        ],
        "baseFilter": [
          "html tag",
          "micclass"
        ],
        "mandatory": [
          "html tag",
          "micclass",
          "name"
        ],
        "optionalFilter": [
          "html id",
          "name",
          "class",
          "first item",
          "acc_name"
        ],
        "selector": "index"
    },
    "webnumber": {
        "assistive": [
          "html id"
        ],
        "baseFilter": [
          "html tag",
          "micclass",
          "type"
        ],
        "mandatory": [
          "html tag",
          "micclass",
          "name",
          "type"
        ],
        "optionalFilter": [
          "html id",
          "name",
          "class",
          "default value",
          "min",
          "max",
          "step",
          "visible"
        ],
        "selector": "index"
    },
    "webradiogroup": {
        "assistive": [],
        "baseFilter": [
          "html tag",
          "micclass"
        ],
        "mandatory": [
          "html tag",
          "micclass",
          "name"
        ],
        "optionalFilter": [
          "name",
          "html id",
          "class",
          "items count",
          "visible"
        ],
        "selector": "index"
    },
    "webrange": {
        "assistive": [
          "html id"
        ],
        "baseFilter": [
          "html tag",
          "micclass",
          "type"
        ],
        "mandatory": [
          "html tag",
          "micclass",
          "name",
          "type"
        ],
        "optionalFilter": [
          "html id",
          "name",
          "class",
          "default value",
          "min",
          "max",
          "step",
          "visible"
        ],
        "selector": "index"
    },
    "webtable": {
        "assistive": [
          "role",
          "acc_name"
        ],
        "baseFilter": [
          "html tag",
          "micclass"
        ],
        "mandatory": [
          "html tag",
          "micclass"
        ],
        "optionalFilter": [
          "html id",
          "border"
        ],
        "selector": "index"
    },
    "webtabstrip": {
        "assistive": [
          "html id",
          "role",
          "acc_name"
        ],
        "baseFilter": [
          "html tag",
          "micclass"
        ],
        "mandatory": [
          "html tag",
          "micclass",
          "name"
        ],
        "optionalFilter": [
          "html id",
          "name",
          "class",
          "acc_name",
          "first item"
        ],
        "selector": "index"
    },
    "webtree": {
        "assistive": [
          "html tag",
          "role",
          "acc_name"
        ],
        "baseFilter": [
          "html tag",
          "micclass"
        ],
        "mandatory": [
          "micclass",
          "name"
        ],
        "optionalFilter": [
          "html id",
          "name",
          "class",
          "acc_name",
          "first item"
        ],
        "selector": "index"
    },
    "webvideo": {
        "assistive": [
          "html id",
          "src",
          "current source"
        ],
        "baseFilter": [
          "html tag",
          "micclass"
        ],
        "mandatory": [
          "html tag",
          "micclass",
          "sources"
        ],
        "optionalFilter": [
          "html id",
          "src",
          "sources",
          "current source",
          "duration",
          "autoplay",
          "loop",
          "class",
          "visible"
        ],
        "selector": "index"
    }
};

var defaultEventConfig = {
    "_attr_names": [
      "EN_CONFIG_DATA",
      "WEB_PN_ALWAYS_CONNECT_MOUSE_DOWN_UP"
    ],
    "_data": {
        "EN_CONFIG_DATA": "<XML><Object Name=\"Any Web Object\"><Event Name=\"onclick\" Listen=\"2\" Record=\"2\"/><Event Name=\"oncontextmenu\" Listen=\"2\" Record=\"2\"/><Event Name=\"ondragstart\" Listen=\"2\" Record=\"2\"/><Event Name=\"ondrop\" Listen=\"2\" Record=\"2\"/><Event Name=\"onkeydown\" Listen=\"1\" Record=\"2\"/><Event Name=\"onmouseover\" Listen=\"2\" Record=\"1\"/><Event Name=\"onmouseup\" Listen=\"2\" Record=\"1\"><Property Name=\"button\" Value=\"2\" Listen=\"2\" Record=\"2\"/><Property Name=\"button\" Value=\"4\" Listen=\"2\" Record=\"2\"/></Event><Event Name=\"onsubmit\" Listen=\"1\" Record=\"2\"/></Object><Object Name=\"Image\"><Event Name=\"onclick\" Listen=\"1\" Record=\"2\"/><Event Name=\"onmouseover\" Listen=\"2\" Record=\"6\"/></Object><Object Name=\"Link\"><Event Name=\"onclick\" Listen=\"1\" Record=\"2\"/></Object><Object Name=\"WebArea\"><Event Name=\"onclick\" Listen=\"1\" Record=\"2\"/><Event Name=\"onmouseover\" Listen=\"2\" Record=\"6\"/></Object><Object Name=\"WebButton\"><Event Name=\"onclick\" Listen=\"1\" Record=\"2\"/></Object><Object Name=\"WebCheckBox\"><Event Name=\"onclick\" Listen=\"1\" Record=\"2\"/><Event Name=\"onchange\" Listen=\"1\" Record=\"2\"/></Object><Object Name=\"WebEdit\"><Event Name=\"onblur\" Listen=\"1\" Record=\"2\"/><Event Name=\"oninput\" Listen=\"1\" Record=\"2\"/><Event Name=\"onchange\" Listen=\"1\" Record=\"2\"/><Event Name=\"onfocus\" Listen=\"1\" Record=\"2\"/><Event Name=\"onpropertychange\" Listen=\"0\" Record=\"2\"><Property Name=\"propertyName\" Value=\"value\" Listen=\"1\" Record=\"2\"/></Event><Event Name=\"onsubmit\" Listen=\"1\" Record=\"2\"/></Object><Object Name=\"WebElement\"><Event Name=\"onclick\" Listen=\"1\" Record=\"2\"/></Object><Object Name=\"WebFile\"><Event Name=\"onblur\" Listen=\"1\" Record=\"2\"/><Event Name=\"onfocus\" Listen=\"1\" Record=\"2\"/></Object><Object Name=\"WebList\"><Event Name=\"onblur\" Listen=\"1\" Record=\"2\"/><Event Name=\"onchange\" Listen=\"1\" Record=\"2\"/><Event Name=\"onfocus\" Listen=\"1\" Record=\"2\"/></Object><Object Name=\"WebNumber\"><Event Name=\"onblur\" Listen=\"1\" Record=\"2\"/><Event Name=\"onchange\" Listen=\"1\" Record=\"2\"/><Event Name=\"onfocus\" Listen=\"1\" Record=\"2\"/></Object><Object Name=\"WebRadioGroup\"><Event Name=\"onclick\" Listen=\"1\" Record=\"2\"/><Event Name=\"onchange\" Listen=\"1\" Record=\"2\"/></Object><Object Name=\"WebRange\"><Event Name=\"onchange\" Listen=\"1\" Record=\"2\"/></Object>" +
            "<Object Name=\"WebMenu\"><Event Name=\"onclick\" Listen=\"1\" Record=\"2\"/></Object>" +
            "<Object Name=\"WebTabStrip\"><Event Name=\"onclick\" Listen=\"1\" Record=\"2\"/></Object>" +
            "<Object Name=\"WebTree\"><Event Name=\"onclick\" Listen=\"1\" Record=\"2\"/></Object></XML>",
        "WEB_PN_ALWAYS_CONNECT_MOUSE_DOWN_UP": 1
    },
    "_msgType": "SRVC_SET_EVENT_CONFIGURATION",
    "_to": {
        "browser": -1,
        "frame": -1,
        "object": null,
        "page": -1
    }
};


/**
* PositionRelatedPropertyNames - list of position-related node names
*/
var PositionRelatedPropertyNames = {
    'x': 'horizontal',
    'y': 'vertical',
    'abs_x': 'horizontal',
    'abs_y': 'vertical',
    'width': 'horizontal',
    'height': 'vertical'
};

/**
 * Represents the communication channel for in/out communications from the JS context when being injected by the UFT Mobile
 * @constructor
 */
function MobileCenterComChannel() {
    EventDispatcher.call(this, new LoggerUtil("ComChannels.MobileCenterComChannel"));
    window._hpmcBridge.readyState = false;
    this._mobileCenter = window._hpmcBridge;
    this._responseCallbacks = {};
    this._mobileBrowserId = 1000;
    this.init();

    Util.assert(this._mobileCenter != null, "C'tor: MobileCenterComChannel is undefined", this._logger);

    Object.defineProperty(this, "id", {
        value: "MobileCenterComChannel",
        writable: false
    });

    this._logger.trace("MobileCenterComChannel: ctor completed");
}

Util.inherit(MobileCenterComChannel, EventDispatcher, {
    _mobileCenter: null,

    _responseCallbacks: null,

    _uid: -1,

    _initializeTime: null,

    // *** Public methods ***
    init: function () {
        this._logger.trace("init");
        this._initializeTime = new Date();
        // Register to mobile events
        this._mobileCenter.onStartRecord = this._onStartRecord.bind(this);
        this._mobileCenter.onStopRecord = this._onStopRecord.bind(this);
        this._mobileCenter.onStartReplay = this._onStartReplay.bind(this);
        this._mobileCenter.onStopReplay = this._onStopReplay.bind(this);
        this._mobileCenter.onRequest = this._onRequest.bind(this);
        this._mobileCenter.onFindElement = this._onFindElement.bind(this);
    },

    connect: function () {
        this._logger.trace("connect: called");
        this._mobileCenter.connect(this._onConnect.bind(this));
        this._dispatchEvent(InnerChannelEvent.OPEN);

        // Workaround: Notify MC that our injection is finished by mocking a delay.
        // In the future we need a better solution to detect injection finish.
        Util.setTimeout(function () {
            //this._mobileCenter.notifyInjected(); // Get back when MC is ready for this API.
        }.bind(this), 200);
    },

    disconnect: function () {
        this._logger.trace("disconnect: called");
        // Do nothing
    },

    sendMessage: function (msg) {
        if (msg.type === "response") {

            // convert position-related values in outbound message
            this._onOutgoingMessage(msg);

            this._sendResponse(msg);
        }
        else {
            this.sendEvent(msg);
        }
    },

    sendEvent: function (eventMsg) {

        // convert position-related values in outbound message
        this._onOutgoingMessage(eventMsg);

        var strMsg = JSON.stringify(eventMsg);
        this._logger.info("sendEvent: called msg : " + strMsg);

        this._mobileCenter.sendEvent({ "data": strMsg }, function (err) {
            if (err)
                this._logger.error("sendEvent: error: ", err, " while sending: ", eventMsg);
        }.bind(this));
    },

    // *** Mobile events ***
    _onConnect: function (err) {
        if (err)
            this._logger.error("_onConnect: error connecting");
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

    // eventCallback arguments: (error)
    _onStartRecord: function (eventCallback) {
        this._logger.info("_onStartRecord: called");

        var startRecordMsg = this._createGlobalVariablesMsg({
            WebActivityState: 1,
            objectidentificationproperties: JSON.stringify(window._QTP.defaultObjectIdentificationProperties),
            testingtool: 'hpmc',
            isTouchEnabled: true,
            enablewebrolebasedkit: true
        });

        this._dispatchMsgHelper({ "data": startRecordMsg }, function (ignoreParameter) {
            this._dispatchMsgHelper({ "data": defaultEventConfig }, function () {
                this._logger.info("callback on _onStartRecord");
                // !! For MC Native Browser & OOA Hybrid: Delay for a while to wait the StartRecord is processed in frames.
                // Today we don't sync this message, so when it comes here the StartRecord is not finished yet.
                // MC will deliver the click once it gets this callback.
                if (!this._hasStartedRecord) {
                    this._hasStartedRecord = true;
                    Util.setTimeout(eventCallback, 500);
                }
            }.bind(this), "request");
        }.bind(this), "request");
    },

    _onStopRecord: function (eventCallback) {
        this._logger.info("_onStopRecord: called");
        var stopRecordMsg = this._createGlobalVariablesMsg({ WebActivityState: 0 });
        this._dispatchMsgHelper({ "data": stopRecordMsg }, function (ignoreParameter) { eventCallback(); }, "request");
    },

    _onStartReplay: function (eventCallback) {
        this._logger.info("_onStartReplay: called");

        var startReplayMsg = this._createGlobalVariablesMsg({ isTouchEnabled: true, enablewebrolebasedkit: true });
        this._dispatchMsgHelper({ data: startReplayMsg }, function () { eventCallback() }, 'request');
    },

    _onStopReplay: function (eventCallback) {
        this._logger.info("_onStopReplay: called");
        eventCallback();
    },

    /*
      responseCallback arguments: (error, responseMsg : {result: stringify(msg)})
    */
    _onRequest: function (requestMsg, responseCallback) {
        this._logger.trace("_onRequest: called requestMsgStr : ", requestMsg);
        if (typeof (requestMsg.data) !== "string")
            return;

        var webData = JSON.parse(requestMsg.data);
        if (!webData && !webData.data)
            return;

        var called = false;
        var uftStyleCallback = function (msg) {
            if (!called) {
                responseCallback(null, { result: JSON.stringify(msg) });
            } else {
                this._logger.warn("_onRequest, callback called twice : ", msg);
            }
        };

        // convert position-related values in inbound message
        this._onIncomingMessage(webData);

        this._dispatchMsgHelper(webData, uftStyleCallback, "request");
    },

    // callback arguments: (error, [result:stringify(msg)])
    _onFindElement: function (query, callback) {
        this._logger.trace("onFindElement query =", query);
        if (!query || !query.location)
            return;

        var called = false;
        var uftStyleCallback = function (msg) {
            if (!called) {
                callback(null, [{ result: JSON.stringify(msg) }]);
            } else {
                this._logger.warn("_onRequest, callback called twice : ", msg);
            }
        };

        // convert position-related values in inbound message
        this._onIncomingMessage(query);

        var setObjIdentificationPropertiesMsg = this._createGlobalVariablesMsg({
            objectidentificationproperties: JSON.stringify(window._QTP.defaultObjectIdentificationProperties),
            enablewebrolebasedkit: true
        });

        this._dispatchMsgHelper({ "data": setObjIdentificationPropertiesMsg }, function (ignoreParameter) {
            var defaultPageId = { browser: this._mobileBrowserId, page: 0, frame: -1, object: null };
            
            // findElement options are passed inside the location.
            // we remove them and pass the options separately.
            var options = query.location.options || {};
            delete query.location.options;
            
            var msg = new Msg("QUERY_OBJ_CLIENT_POINT_TO_ID", defaultPageId, { pos: query.location, options: options});
            this._logger.trace("onFindElement msg=", msg);

            this._dispatchMsgHelper({ "data": msg }, uftStyleCallback, "request");

        }.bind(this), "request");

    },

    // *** Private methods ***
    _sendResponse: function (msg) {
        if (Util.isNullOrUndefined(msg.uid)) {
            this._logger.error("_sendResponse cannot get the uid");
            return;
        }
        var responseCallback = this._responseCallbacks[msg.uid];
        if (!responseCallback) {
            this._logger.error("_sendResponse fail to get the responseCallback");
            return;
        }
        responseCallback(msg);

        delete this._responseCallbacks[msg.uid];
    },

    _dispatchMsgHelper: function (msgdata, responseCallback, type) {
        var msg = {
            "uid": -1,
            "type": type,
            "data": msgdata,
        };

        var protectedCallback = ContentUtils.protectCallbackAgainstPrematureNavigation(responseCallback, msg, this._logger, type);
        var callbackId = this._storeResponseCallback(protectedCallback);
        msg.uid = callbackId;

        this._logger.trace("_onDispatchEvent msg=", msg);
        this._dispatchEvent(InnerChannelEvent.MESSAGE, msg);
    },
    _storeResponseCallback: function (responseCallback) {
        this._responseCallbacks[++this._uid] = responseCallback;
        return this._uid;
    },

    /**
    * _isPositionNode() checks if a node name is one of the position-related nodes
    * @param {Object} obj - the object that might contain a position-related node 
    * @param {String} nodeName - name of the node in the message object
    * @returns {Boolean} true if the node represents a position related property, false otherwise
    */
    _isPositionNode: function (obj, nodeName) {

        // it is a position-related node if it's name is in PositionRelatedPropertyNames and it is a numeric node
        var isRectNodeName = PositionRelatedPropertyNames[nodeName];
        var isNumber = (typeof (obj[nodeName]) == "number");

        return (isRectNodeName && isNumber);
    },

    /**
    * _convertInboundPositionValue() converts a position-related value in inbound messages from device units to logical units
    * @param {Object} parentNode - the inbound message parent node that contains the position-related node
    * @param {String} propertyName - name of the property that contains the position-related value
    * @param {String} parentPath - the path to the parent node in the original inbound message (this argument is for debugging/logging)
    */
    _convertInboundPositionValue: function (parentNode, propertyName, parentPath) {

        var oldVal = parentNode[propertyName];
        if (oldVal === Constants.noCoordinate) {
            this._logger.trace("_convertInboundPositionValue: skipping noCoordinate in '" + parentPath + propertyName + "'");
            return;
        }

        parentNode[propertyName] = this._mobileCenter.convertDeviceToLogicalValue(parentNode[propertyName]);

        this._logger.trace("_convertInboundPositionValue: converted '" + parentPath + propertyName + "' from " + oldVal + " to " + parentNode[propertyName]);
    },

    /**
    * _convertOutboundPositionValue() converts a position-related value in outbound messages from logical units to device units
    * @param {Object} parentNode - the outbound message parent node that contains the position-related node
    * @param {String} propertyName - name of the property that contains the position-related value
    * @param {String} parentPath - the path to the parent node in the original outbound message (this argument is for debugging/logging)
    */
    _convertOutboundPositionValue: function (parentNode, propertyName, parentPath) {

        var oldVal = parentNode[propertyName];
        var screenRatioType = this._getScreenRatioType(propertyName);
        parentNode[propertyName] = this._mobileCenter.convertLogicalToDeviceValue(parentNode[propertyName], screenRatioType);

        this._logger.trace("_convertOutboundPositionValue: converted '" + parentPath + propertyName + "' from " + oldVal + " to " + parentNode[propertyName] + " - screen ratio type: " + screenRatioType);
    },

    /**
    * _getScreenRatioType() returns the HP MC expected Screen Ratio Type depending on whether this property holds a value which is horizontal or vertical
    * @param {String} propertyName - name of the property that contains the position-related value
    * @returns {ScreenRatioType} The screen ratio type
    */
    _getScreenRatioType: function (propertyName) {
        switch (PositionRelatedPropertyNames[propertyName]) {
            case 'horizontal':
                return this._mobileCenter.ScreenRatioType.X;
            case 'vertical':
                return this._mobileCenter.ScreenRatioType.Y;
            default:
                this._logger.error("_getScreenRatioType: unknown property name: " + propertyName);
                return null;
        }
    },

    /**
    * _onIncomingMessage() performs common actions on incoming messages
    * @param msg - the incoming message, can be also a FindElement query message
    */
    _onIncomingMessage: function (msg) {

        // 1) convert position-related values
        Util.traverseObject(msg, function (parentNode, nodeName, parentPath) {

            if (this._isPositionNode(parentNode, nodeName))
                this._convertInboundPositionValue(parentNode, nodeName, parentPath);

        }.bind(this));
    },

    /**
    * _onOutgoingMessage() performs common actions on outgoing messages
    * @param msg - the outgoing message 
    */
    _onOutgoingMessage: function (msg) {

        // 1) convert position-related values
        Util.traverseObject(msg, function (parentNode, nodeName, parentPath) {

            if (this._isPositionNode(parentNode, nodeName))
                this._convertOutboundPositionValue(parentNode, nodeName, parentPath);

        }.bind(this));
    }
});

////////////////////////
