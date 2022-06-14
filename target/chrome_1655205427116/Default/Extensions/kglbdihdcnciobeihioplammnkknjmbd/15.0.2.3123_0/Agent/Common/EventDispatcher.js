// © Copyright 1992-2017 Hewlett Packard Enterprise Development LP

function EventDispatcher(logger) {
    this._logger = logger || new LoggerUtil("Common.EventDispatcher");
    this._listeners = {};
}

EventDispatcher.prototype = {
    _listeners: null,

    addListener: function(eventName, listenerFunction) {
        this._logger.trace("addListener: called for event " + eventName);

        if(!this._listeners[eventName]) {
            this._listeners[eventName] = [];
        }

        this._listeners[eventName].push(listenerFunction);
    },

    removeListener: function (eventName, listenerFunction) {
        this._logger.trace("removeListener: called for event " + eventName);

        if (!this._listeners[eventName] || this._listeners[eventName].indexOf(listenerFunction) === -1) {
            this._logger.warn("removeListener: Trying to remove listener that is not registered");
            return;
        }

        this._listeners[eventName] = this._listeners[eventName].filter(function (listener) {
            return listener !== listenerFunction;
        });
    },

    removeAllListeners: function() {
        this._logger.info("removeAllListeners: called");
        this._listeners = [];
    },

    _dispatchEvent: function (eventName) {
        this._logger.trace("_dispatchEvent: called for event: " + eventName);

        if (!this._listeners[eventName]) {
            this._logger.info("_dispatchEvent: no listeners found for event: " + eventName);
            return;
        }

        var args = Util.makeArray(arguments).slice(1); // remove first param
        this._listeners[eventName].forEach(function (listener) {
            listener.apply(listener, args);
        });
    }
};

if (typeof exports !== "undefined") {
    // Ensure RtIdUtils is exported if exports exist. This is necessary for RtIdUtils to be available
    // in Firefox add-on.
    exports.EventDispatcher = EventDispatcher;
}