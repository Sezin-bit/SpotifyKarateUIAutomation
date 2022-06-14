function JavaFXBrowserAPI() {
    this._logger = new LoggerUtil("JavaFXBrowserAPI");
    this._logger.trace("JavaFXBrowserAPI started.");
    var bridgeId = { id: window._hpJavaBridge.id, windowId: 1 };
    this._clientTabId = window._hpJavaBridge.id ? bridgeId : webViewId;
}

Util.inherit(JavaFXBrowserAPI, EmbeddedBrowserAPI, {

    createExternalComChannel: function () {
        return new ExternalComChannel(JavaFXComChannelStrategy.prototype);
    },
    createComChannel: function () {
        var comChannel = new MessageChannelComChannel("extension", true); //JavaFX disable  AsyncCommunicationHelper for performance issues
        comChannel.setClientTabId(this._clientTabId);
        return comChannel;
    },

    getSettingValue: function (key) {
        /* AVOID WARNING MESSAGE in base class, warning message may cause exception during injection */
    },

    createTab: function (browserTab) {
        this._logger.trace("createTab JavaFX: started");
        return new JavaFXBrowserTab(browserTab);
    },

    ignoreBrowserDescription: true

});


function JavaFXBrowserTab(tab) {
    this._logger = new LoggerUtil("JavaFXBrowserTab");
    this._logger.trace("JavaFXBrowserTab created.");
    this.id = tab.id;
    this.windowId = tab.windowId;
}

Util.inherit(JavaFXBrowserTab, EmbeddedBrowserTab, {

    /**
    * getPageRect() returns the screen rectangle of the JavaFxpage (the WebView)
    * @param {function} successCallback - called if function succeeds (param: rect) 
    * @param {function} failCallback - called if function fails (param: error) 
    */
    getPageRect: function (successCallback, failCallback) {
        var winRect = window._hpJavaBridge.webViewScreenRect();
        var rect = Util.shallowObjectClone(winRect);
        successCallback(rect);
    }
});

