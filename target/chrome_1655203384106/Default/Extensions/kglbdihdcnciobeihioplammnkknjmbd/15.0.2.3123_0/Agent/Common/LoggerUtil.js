if (typeof log4javascript === "undefined" && typeof require === "function") {
    // Ensure log4javascript is available. This is necessary for Firefox add-on.
    var log4javascript = require("./ThirdParty/log4javascript_uncompressed.js").log4javascript;
}

var isLog4JsLite = log4javascript.edition === "log4javascript_lite";
if ( isLog4JsLite ) {
 
    var Layout = function() {};
	Layout.prototype = {};
    log4javascript.Layout = Layout;
    log4javascript.PatternLayout = Layout;
	log4javascript.NullLayout = Layout;

    function BrowserConsoleAppender(){
		this.layout = new LazyFormatLayout();
		this.append = function(loggingEvent){
            var Level = log4javascript.Level;
            var formattedMesage = this.layout.format(loggingEvent);
            if (window.console.debug && Level.DEBUG.isGreaterOrEqual(loggingEvent.level)) {
				window.console.debug(formattedMesage);
			} else if (window.console.info && Level.INFO.equals(loggingEvent.level)) {
				window.console.info(formattedMesage);
			} else if (window.console.warn && Level.WARN.equals(loggingEvent.level)) {
				window.console.warn(formattedMesage);
			} else if (window.console.error && loggingEvent.level.isGreaterOrEqual(Level.ERROR)) {
				window.console.error(formattedMesage);
			} else {
				window.console.log(formattedMesage);
			}
		}
        this.setLayout = function(layout) {
            this.layout = layout;
        };
        this.setThreshold = function(threshold) {
            this.threshold = threshold;
        };
	}
    log4javascript.Appender = BrowserConsoleAppender;
    log4javascript.BrowserConsoleAppender = BrowserConsoleAppender;
    
    log4javascript.getRootLogger = log4javascript.getDefaultLogger;
    var originalGetLogger = log4javascript.getLogger;
    log4javascript.getLogger = function( catName ){
        var logger = originalGetLogger();
        logger.name = catName;
        logger.addAppender = function (appender) { };
        logger.setLevel(log4javascript.Level[LoggerUtilSettings.DEFAULT_LOG_LEVEL]);
        return logger;
    };
}
 
function LocalStroageAppender() { }
LocalStroageAppender.prototype = new log4javascript.Appender();
LocalStroageAppender.prototype.layout = new log4javascript.NullLayout();
LocalStroageAppender.prototype.threshold = log4javascript.Level.DEBUG;

LocalStroageAppender.prototype.append = function(loggingEvent) {
	var appender = this;

	var getFormattedMessage = function() {
		var layout = appender.getLayout();
		var formattedMessage = layout.format(loggingEvent);
		if (layout.ignoresThrowable() && loggingEvent.exception) {
			formattedMessage += loggingEvent.getThrowableStrRep();
		}
		return formattedMessage;
	};
	window.localStorage.setItem((new Date()).toTimeString(), getFormattedMessage());
};

LocalStroageAppender.prototype.toString = function() {
	return "LocalStroageAppender";
};

////////////////////////// WebSocket Appender
function WebSocketAppender() {
    this._buffer = [];
    this.enabled = true;
    this.logWebSocket = null;
}
WebSocketAppender.prototype = new log4javascript.Appender();
WebSocketAppender.prototype.layout = new log4javascript.NullLayout();
WebSocketAppender.prototype.threshold = log4javascript.Level.DEBUG;
WebSocketAppender.prototype.append = function (loggingEvent) {
    if (!this.enabled)
        return;

    var appender = this;

    var getFormattedMessage = function() {
        var layout = appender.getLayout();
        var formattedMessage = layout.format(loggingEvent);
        if (layout.ignoresThrowable() && loggingEvent.exception) {
            formattedMessage += loggingEvent.getThrowableStrRep();
        }
        return (new Date()).getTime() + " # " + formattedMessage;
    };


    if (!this.logWebSocket) {
        // Buffer to be used when Websocket is connected
        this._buffer.push(getFormattedMessage());
        return;
    }

    switch (this.logWebSocket.readyState)
    {
        case this.logWebSocket.CONNECTING:
            // Buffer to be used when Websocket is connected
            this._buffer.push(getFormattedMessage());
            break;
        case this.logWebSocket.OPEN:
            this.logWebSocket.send(getFormattedMessage());
            break;
        case this.logWebSocket.CLOSING:
        case this.logWebSocket.CLOSED:
            // Sometimes the onclose event is not fired
            // This is a workaround for those cases.
            this.shutDown();
            break;
    }   
};

WebSocketAppender.prototype.connect = function (port) {
    this.logWebSocket = new WebSocket("ws://127.0.0.1:" + port);
    this.logWebSocket.onopen = this.onOpen.bind(this);
    this.logWebSocket.onclose = this.onClose.bind(this);
    this.logWebSocket.onerror = this.onError.bind(this);
};

WebSocketAppender.prototype.onOpen = function () {
    this.enabled = true;
    this._buffer.forEach(function (logMsg) {
        this.logWebSocket.send(logMsg);
    }, this);
    delete this._buffer;
};

WebSocketAppender.prototype.onClose = function () {
    this.shutDown();
};

WebSocketAppender.prototype.onError = function () {
    Util.safeConsoleError("WebSocketAppender.onError: There was an error in WebSocket Appender");
    this.shutDown();
};

WebSocketAppender.prototype.shutDown = function () {
    if (this.logWebSocket)
        this.logWebSocket.close();
    delete this._buffer;
    this.enabled = false;
};

WebSocketAppender.prototype.toString = function () {
    return "WebSocketAppender";
};

var WebSocketAppenderInstance = new WebSocketAppender();
WebSocketAppenderInstance.setThreshold(log4javascript.Level.ALL);
WebSocketAppenderInstance.setLayout(new log4javascript.PatternLayout("%d{HH:mm:ss} %c [%-5p] - %m"));


//////////////////////////////////////////////////////////////////////////////////
//creates a global appender for browser console to be shared among all loggers
function LazyFormatLayout() {
    this.JSONspaces = 0; // Passed to JSON.stringify
}

LazyFormatLayout.prototype = new log4javascript.Layout();
LazyFormatLayout.prototype.format = function (loggingEvent) {
    var time = loggingEvent.timeStamp.toTimeString().split(/\s/)[0];

    var head = time + ' ' + loggingEvent.logger.name + ' [' + loggingEvent.level.name + '] - ';
    var body = loggingEvent.messages.map(function (arg) {
        try {
            switch (typeof (arg)) {
                case 'function':
                    return arg();
                case 'object':
                    return JSON.stringify(arg, null, this.JSONspaces);
            }
        }
        catch (e) {
            return '<<error while logging: ' + (e.message || e.description) + " at: " + e.stack + '>>';
        }
        return arg;

    }, this).join('');
    var result = head + body;

    if (loggingEvent.exception) {
        var ex = loggingEvent.exception;
        result += ' ==> Exception: ' + (ex.message || ex.description) + "\n" + ex.stack;
    }

    if (result.length > 0x4000)
        Util.safeConsoleWarn('Logging long message which may not show up at: ', Error().stack);
    return result;
};

LazyFormatLayout.prototype.ignoresThrowable = function () { return false; };
LazyFormatLayout.prototype.toString = function () { return "LazyFormatLayout"; };

var BrowserAppender = new log4javascript.BrowserConsoleAppender();
BrowserAppender.setThreshold(log4javascript.Level.ALL);
var lazyFormatLayout = new LazyFormatLayout();
BrowserAppender.setLayout(lazyFormatLayout);
//////////////////////////////////////////////////////////////////////////
/// Factory method for Loggers                                         ///
///                                                                    ///
/// Parameters:                                                        ///
///             catName - The name of the logger category to be used   ///
///                       in the logger utility.                       ///
//////////////////////////////////////////////////////////////////////////
function LoggerUtil(catName) {
    var log;
    try {
        log = log4javascript.getLogger(catName);

        //gets the log level for the category

        var catLogLevel = LoggerUtilSettings.getCategoryLogLevel(catName);
        if (catLogLevel) {
            log.setLevel(log4javascript.Level[catLogLevel]);
        }

        log.prettyTrace = function () {
            lazyFormatLayout.JSONspaces = 2;
            log.log(log4javascript.Level.TRACE, arguments);
            lazyFormatLayout.JSONspaces = 0;
        };

        log.prettyDebug = function () {
            lazyFormatLayout.JSONspaces = 2;
            log.log(log4javascript.Level.DEBUG, arguments);
            lazyFormatLayout.JSONspaces = 0;
        };
	
		if (!isLog4JsLite){	
            log.addAppender(BrowserAppender);
            if (WebSocketAppenderInstance.enabled)
            log.addAppender(WebSocketAppenderInstance);
		}
    }
    catch (e) {
        Util.safeConsoleError("QTP Agent: Got Exception " + e + "\nStack:" + e.stack);
    }
    // Note: overriding the type of the logger
    return log;
}

LoggerUtilSettings = {
    _settings: null,
    DEFAULT_LOG_LEVEL: "WARN",

    init: function () {
        LoggerUtilSettings._settings = {};
        var rootLogger = log4javascript.getRootLogger();
        rootLogger.setLevel(log4javascript.Level[LoggerUtilSettings.DEFAULT_LOG_LEVEL]);
    },
    setSettings: function (newSettings) {
        LoggerUtilSettings._settings = newSettings;
        var defaultLogLevel = LoggerUtilSettings._settings["log:defaultLevel"] || LoggerUtilSettings.DEFAULT_LOG_LEVEL;
        var rootLogger = log4javascript.getRootLogger();
        rootLogger.setLevel(log4javascript.Level[defaultLogLevel]);

        //gets all the categories in the settings and set each category level
        var categoriesSettings = Object.keys(newSettings).filter(function (k) {
            return k.match(/^log:cat/);
        });
        categoriesSettings.forEach(function (catSetting) {
            //gets the category name
            var logLevel = newSettings[catSetting];
            var tokens = catSetting.split(":");
            var catName = tokens.pop();
            var log = log4javascript.getLogger(catName);
            log.setLevel(log4javascript.Level[logLevel]);
        });

        if (newSettings.remoteLogging && newSettings.remoteLogging.enabled) {
            WebSocketAppenderInstance.connect(newSettings.remoteLogging.port);
        }
        else {
            WebSocketAppenderInstance.shutDown();
        }
    },
    getCategoryLogLevel: function (catName) {
        //Checks if the global settings object was set.
        if (!LoggerUtilSettings._settings)
            return null;

        //gets the log level for the category
        var catLogLevel = LoggerUtilSettings._settings["log:cat:" + catName];
        if (!catLogLevel) {
            return null;
        }

        return catLogLevel;
    },
    getLogSettings: function () {
        var logSettings = {};
        //gets all the categories in the settings and set each category level
        var logSettingsNames = Object.keys(LoggerUtilSettings._settings).filter(function (k) {
            return k.match(/^log:/);
        });

        logSettingsNames.forEach(function (logSetting) {
            logSettings[logSetting] = LoggerUtilSettings._settings[logSetting];
        });

        logSettings.remoteLogging = LoggerUtilSettings._settings.remoteLogging;

        return logSettings;
    },

    getAvailableLevels: function () {
        return Object.keys(log4javascript.Level);
    },

    getEmptyLogger: function () {
		function nop() { }
        return {
            trace: nop,
            prettyTrace: nop,
            debug: nop,
            prettyDebug: nop,
            warn: nop,
            info: nop,
            error: nop
        };
    }
};

if (typeof exports !== "undefined") {
    // Ensure LoggerUtil is exported when exports exist. This is necessary for LoggerUtil to be 
    // available in Firefox add-on.
    exports.LoggerUtil = LoggerUtil;
    exports.LoggerUtilSettings = LoggerUtilSettings;
}
