var Cu = Cu || require("chrome").Cu;
var ctypes = Cu.import("resource://gre/modules/ctypes.jsm", null).ctypes;
var self = require("sdk/self");
Cu.import("resource://gre/modules/AddonManager.jsm");

function FirefoxJSCtypesComChannel() {
    EventDispatcher.call(this, new LoggerUtil("ComChannels.FirefoxJSCtypesComChannel"));
    this._logger.trace("FirefoxJSCtypesComChannel: ctor completed");
}

Util.inherit(FirefoxJSCtypesComChannel, EventDispatcher, {
    _messageQueue: [],

    _jsctypes: null,

    // *** Public methods ***
    supportReconnect: function () {
        return false;
    },

    getComChannelID: function () {
        this._logger.trace("getComChannelID: called");
        return "FirefoxJSCtypesComChannel";
    },

    _connectJsCtypes: function (path) {
        this._jsctypes = {};

        var lib = ctypes.open(path);
        this._jsctypes.lib = lib;

        var connect = lib.declare("Connect", ctypes.winapi_abi, ctypes.int32_t, ctypes.voidptr_t);
        this._jsctypes.dispatchMessage = lib.declare("dispatchMessage", ctypes.winapi_abi, ctypes.int32_t, ctypes.char.ptr);
        this._jsctypes.Disconnect = lib.declare("Disconnect", ctypes.winapi_abi, ctypes.int32_t);

        var onMessageCallbackFuncType = ctypes.FunctionType(ctypes.default_abi, ctypes.void_t, [ctypes.char.ptr]).ptr;

        this._jsctypes.onMessageCallback = this._onNativeMessage.bind(this);

        this._jsctypes.onMessageCallbackFunction = onMessageCallbackFuncType(this._jsctypes.onMessageCallback, this);
        connect(this._jsctypes.onMessageCallbackFunction);

        // process any cached message in the message pool.
        this._messageQueue.forEach(function (msg) {
            this._logger.warn("[_connectJsCtypes] send pending message: ", msg);
            this.sendMessage(msg);
        }.bind(this));
    },

    _onAddonInfoReady: function (addon) {
        var uri = addon.getResourceURI("./resources/agent/data/HP.UFT.JSCtypesLib.dll");
        this._connectJsCtypes(uri.path.substr(1));
    },

    connect: function () {
        this._logger.trace("connect: trying to connect to js-ctypes library");

        if (this._jsctypes) {
            this._logger.trace("connect: already connected. returning.");
            return;
        }

        try {
            //AddonManager.getAddonByID(self.id, this._onAddonInfoReady.bind(this));
            this._connectJsCtypes("HP.UFT.JSCtypesLib.dll");
            this._dispatchEvent(InnerChannelEvent.OPEN);
        } catch (e) {
            this._jsctypes = null;
            this._logger.error("failed to connect to js-ctypes library, error: " + e + "\nStack:" + e.stack);
            throw e;
        }
    },


    disconnect: function () {
        this._logger.trace("disconnect: close connection to js-ctypes library");

        if (this._jsctypes) {
            this._jsctypes.Disconnect();
            this._jsctypes.lib.close();
            this._jsctypes = null;
        }
    },

    sendMessage: function (msg) {
        if (this._jsctypes) {
            this._jsctypes.dispatchMessage(JSON.stringify(msg));
            this._logger.debug("message is posted to js-ctypes");
        }
        else {
            this._logger.warn("js-ctypes library is closed or not initialized, message not sent but pushed to queue instead!");
            this._messageQueue.push(msg);
        }
    },

    _onNativeMessage: function (message) {
        var str = message.readString();
        this._dispatchEvent("message", str);
    }
});
