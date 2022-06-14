function MobileCenterBrowserAPI() {
    this._logger = new LoggerUtil("MobileCenterAPI");
    this._logger.trace("MobileCenterAPI started.");
    this._clientTabId = webViewId;
}

Util.inherit(MobileCenterBrowserAPI, EmbeddedBrowserAPI, {

    createExternalComChannel: function () {
        return new ExternalComChannel(MobileCenterComChannelStrategy.prototype);
    },

    createTab: function (browserTab) {
        this._logger.trace("createTab: started");
        return new MobileCenterBrowserTab(browserTab);
       
    },

    ignoreBrowserDescription:false
});

///////////////////////////////

function MobileCenterBrowserTab(tab) {
    this._logger = new LoggerUtil("MobileCenterBrowserTab");
    this._logger.trace("MobileCenterBrowserTab created.");
    this.id = tab.id;
    this.windowId = tab.windowId;
}  

Util.inherit(MobileCenterBrowserTab, EmbeddedBrowserTab, {

    /**
    * getPageRect() returns the rectangle of the mobile page (the WebView)
    * @param {function} successCallback - called if function succeeds (param: rect) 
    * @param {function} failCallback - called if function fails (param: error) 
    */
    getPageRect: function (successCallback, failCallback) {
        var rect = { left: 0, top: 0, right: window.outerWidth || window.innerWidth, bottom: window.outerHeight || window.innerHeight };

        this._logger.info("[getPageRect] - call back with rect: ", rect);
        successCallback(rect);
    }
});