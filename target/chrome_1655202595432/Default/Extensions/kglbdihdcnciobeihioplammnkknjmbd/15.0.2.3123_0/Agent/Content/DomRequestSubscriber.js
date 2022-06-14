// Code which manages all the requests that should be executed in the DOM context.
var HTMLConsoleAppender = {
    append: function (level, logFunction, logMsg) {
        var logFunc =  console[logFunction] || console.log;
        if(logFunc)
            logFunc.call(console, logMsg);
    }
};

var HTMLWebSocketsAppender = {
    _threshold: 0,
    _logWebSocket: null,
    _enabled: true,
    _buffer: "",
    port: 0,
    _onOpen: function () {
        //console.log("HTMLLoggerUsingWebSockets: opened");
        this.enabled = true;
        this._logWebSocket.send(this._buffer);
        delete this._buffer;
    },
    _onClose: function () {
        //console.log("HTMLLoggerUsingWebSockets: closed");
        delete this._buffer;
        this.enabled = false;
    },
    _onError: function () {
        //console.error("HTMLLoggerUsingWebSockets: ERROR");
        delete this._buffer;
        this.enabled = false;
    },
    _connect: function () {
        this._logWebSocket = new WebSocket("ws://127.0.0.1:" + this.port);
        this._logWebSocket.onopen = this._onOpen.bind(this);
        this._logWebSocket.onclose = this._onClose.bind(this);
        this._logWebSocket.onerror = this._onError.bind(this);
    },
    _getFormattedMessage: function (logMsg, level) {
        var formattedMessage = (new Date()).getTime() + " # " + (new Date()) + " [" + level + "] - " + logMsg;
        return formattedMessage;
    },
    append: function (level, sLevel, logMsg) {
        if (!this._enabled)
            return;

        if (!this._logWebSocket)
            this._connect();

        switch (this._logWebSocket.readyState) {
            case this._logWebSocket.CONNECTING:
                // Buffer to be used when Websocket is connected
                this._buffer += this._getFormattedMessage(logMsg, sLevel) + "\n";
                break;
            case this._logWebSocket.OPEN:
                this._logWebSocket.send(this._getFormattedMessage(logMsg, sLevel));
                break;
            case this._logWebSocket.CLOSING:
            case this._logWebSocket.CLOSED:
                // Sometimes the onclose event is not fired
                // This is a workaround for those cases.
                delete this._buffer;
                this.enabled = false;
                break;
        }
    }
};

var HTMLLogger = {
    _threshold: 40000, //WARN
    _appenderList: [],
    _initialized: false,
    trace: function (msg) {
        this._log(10000, "log", msg);
    },
    prettyTrace: function(msg) {
        this._log(10000, "log", msg);
    },
    debug: function (msg) {
        this._log(20000, "log", msg);
    },
    prettyDebug: function (msg) {
        this._log(20000, "log", msg);
    },
    info: function (msg) {
        this._log(30000, "log", msg);
    },
    warn: function (msg) {
        this._log(40000, "warn", msg);
    },
    error: function (msg) {
        this._log(50000, "error", msg);
    },
    fatal: function (msg) {
        this._log(60000, "error", msg);
    },
    _addAppender: function (appender) {
        if (!appender)
            return;

        this._appenderList.push(appender);
    },
    _init: function () {
        this._appenderList = [];
        this._addAppender(HTMLConsoleAppender);
        if (this.remoteLogging && this.remoteLogging.enabled) {
            HTMLWebSocketsAppender.port = this.remoteLogging.port;
            this._addAppender(HTMLWebSocketsAppender);
        }
        this._initialized = true;
    },
    _log: function (level, logFunction, logMsg) {
        if (level < this._threshold)
            return;

        if (!this._initialized)
            this._init();

        this._appenderList.forEach(function (appender) {
            appender.append(level, logFunction, logMsg);
        });
    }
};

function DomRequestSubscriber() {
    this.handlers = "";
    this._htmlLogger = HTMLLogger; //default
}

DomRequestSubscriber.prototype = {
    _namespaceScript: "",
    _htmlLogger: null,

    addDOMSideEventHandler: function (eventName, func, contextObj, contextObjName) {
        contextObjName = contextObjName || "contextObj";
        this.handlers += "window.addEventListener('" + eventName + "', (function(" + contextObjName + ") { return " + func.toString() + ";})(" + JSON.stringify(contextObj) + "));";
    },

    addMessageHandler: function (func, contextObj, contextObjName) {
        this.addDOMSideEventHandler("message", func, contextObj, contextObjName);
    },

    injectHandlers: function () {
        ContentUtils.evalInDocument(this.handlers);
        this.handlers = "";
    },
  
    startNamespace: function () {
        this._namespaceScript = "( function(){";
        this.addUtilityObject("Util", Util);
        this.addUtilityObject("SpecialObject", SpecialObject);
        this.addUtilityObject("HTMLConsoleAppender", HTMLConsoleAppender);
        this.addUtilityObject("HTMLWebSocketsAppender", HTMLWebSocketsAppender);
        this.addUtilityObject("_logger", this._htmlLogger);
        this.addUtilityObject("RtIdUtils", RtIdUtils);
        this.addUtilityObject("ContentUtils", ContentUtils);
        this.addUtilityObject("BrowserServices", BrowserServices);
    },
    addUtilityObject: function (name, obj, eventHandlers) {
        var objData = JSON.stringify(obj);
        this._namespaceScript += "var " + name + "=" + objData;
        this._namespaceScript = this._namespaceScript.substring(0, this._namespaceScript.length - 1);
        if (objData !== "{}")
            this._namespaceScript += ",";
        this._addFunctionsFromObj(obj);
        this._namespaceScript = this._namespaceScript.substring(0, this._namespaceScript.length - 1);
        this._namespaceScript += "};";
        var eventHandlersToInject = eventHandlers || {};
        if (obj.onMessageFromContent) {
            eventHandlersToInject.message = "onMessageFromContent";
        }
        this.addObjectEventHandlers(name, eventHandlersToInject);
    },
    addObjectEventHandlers: function (objName, eventHandlers) {
        var eventsToListen = Object.keys(eventHandlers);
        eventsToListen.forEach((function (eventName) {
            this._namespaceScript += "window.addEventListener('" + eventName + "'," + objName + "." + eventHandlers[eventName] + ".bind(" + objName + "),false);";
        }).bind(this));
    },
    addFunction: function (func) {
        this._namespaceScript += func.toString() + ";";
    },
    addScript: function (script) {
        this._namespaceScript += script;
    },
    endNamespace: function () {
        this._namespaceScript += "})();";
        ContentUtils.evalInDocument(this._namespaceScript);
    },
    initHTMLLogger: function (logSettings) {
        this._htmlLogger = HTMLLogger;
        var defaultLoggingLevel = logSettings["log:defaultLevel"] || LoggerUtilSettings.DEFAULT_LOG_LEVEL;
        this._htmlLogger._threshold = log4javascript.Level[defaultLoggingLevel].level;
        this._htmlLogger.remoteLogging = logSettings.remoteLogging;
    },
    _addFunctionsFromObj: function (obj) {
        for (var key in obj) {
            if (typeof (obj[key]) === "function")
                this._namespaceScript += key + ":" + obj[key].toString() + ",";
        }
    },
};
