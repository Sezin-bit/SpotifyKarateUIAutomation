function WebDriverBrowserAPI() {
    this._logger = new LoggerUtil("WebDriverBrowserAPI");
    this._logger.info("WebDriverBrowserAPI started. WebDriverInfo:", JSON.stringify(window._QTP.WebDriverInfo));
    this._clientTabId = window._QTP.WebDriverInfo && window._QTP.WebDriverInfo.WebDriverId ? window._QTP.WebDriverInfo.WebDriverId : webViewId;
    this._settings = window._QTP.WebDriverInfo && window._QTP.WebDriverInfo.settings ? window._QTP.WebDriverInfo.settings : {};
}

Util.inherit(WebDriverBrowserAPI, EmbeddedBrowserAPI, {

    createExternalComChannel: function () {
        return new ExternalComChannel(WebDriverServerComChannelStrategy.prototype);
    },

    getSettingValue: function (key) {
        return this._settings[key];
    },

    createTab: function (browserTab) {
        this._logger.trace("createTab: started");
        return new WebDriverBrowserTab(browserTab);
    },

});

////////////////////////////////////////////////////

function WebDriverBrowserTab(tab) {
    this._logger = new LoggerUtil("WebDriverBrowserTab");
    this._logger.trace("WebDriverBrowserTab created.");
    this.id = tab.id;
    this.windowId = tab.windowId;
    this.browserSessionId = window._QTP.WebDriverInfo && window._QTP.WebDriverInfo.browserSessionId ? window._QTP.WebDriverInfo.browserSessionId : undefined;
    this._logger.trace("session ID:" + this.browserSessionId + " WebDriverInfo:" + window._QTP.WebDriverInfo);
}

Util.inherit(WebDriverBrowserTab, EmbeddedBrowserTab, {

    isActive: function (successCallback, failCallback) {
        this._logger.trace("WebDriverBrowserTab.isActive: started");
        successCallback(true);
    },

    close: function (successCallback, failCallback) {
        this._logger.trace("WebDriverBrowserTab.close: started");
        successCallback(true);
    },

    reload: function (successCallback, failCallback) {
        this._logger.trace("WebDriverBrowserTab.reload: started");
        successCallback(true);
    },
    
    getState: function(successCallback, failCallback) {
        this._logger.trace("WebDriverBrowserTab.getState: ", document.readyState);
        successCallback(ReadyState2Status[document.readyState]);
    },
    
    isInjectable: function (successCallback, failCallback) {
        // For web-driver tab, web-driver host is taking charge of the injection.
        //
        successCallback(false);
    }


});