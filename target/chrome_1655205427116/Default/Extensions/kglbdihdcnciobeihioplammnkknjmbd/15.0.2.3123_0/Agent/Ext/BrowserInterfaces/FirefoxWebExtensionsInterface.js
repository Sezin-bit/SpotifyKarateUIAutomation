/* This file must be included AFTER ChromeInterface.js */

function FirefoxWebExtensionsAPI() {
    this._logger = new LoggerUtil("FirefoxWebExtensionsAPI");
    this._logger.trace("FirefoxWebExtensionsAPI created.");

    this._init(false);
}

Util.inherit(FirefoxWebExtensionsAPI, ChromeAPI, {
    _tabsLastUrlChangeInfo: {},

    // For Firefox 45 (ESR) Tab is in the form of of 
    // { "tab": { "id":number, "windowId:number",... }}
    // For firefox 53 the tab param is like in chrome
    // { "id":number, "windowId:number",... }
    _onTabCreated: function (firefoxTab) {
    	var tab = firefoxTab.tab || firefoxTab;
        this._logger.info("_onTabCreated tab:", tab.id, " on window", tab.windowId);
        this._dispatchTabCreate(tab);
    },

    _onTabClosed: function (tabId, removeInfo) {
        ChromeAPI.prototype._onTabClosed.call(this, tabId, removeInfo);
        delete this._tabsLastUrlChangeInfo[tabId];
    },

    _onTabUpdated: function (tabId, changeInfo, chromeTab) {
        ChromeAPI.prototype._onTabUpdated.call(this, tabId, changeInfo, chromeTab);
        
        // Store specified changeInfo regarding URL.
        if ("url" in changeInfo) {
            this._tabsLastUrlChangeInfo[chromeTab.id] = changeInfo;
        }
    },

    _dispatchUserOpenedNewTab: function (chromeTab) {
        // Firefox does not support openerTabId property, use id of the first tab in current window
        var self = this;
        chrome.tabs.query({ index: 0, currentWindow: true }, function(tabs) {
            if (tabs.length === 0
                || tabs[0].id === chromeTab.id) {   // This is a new window
                return;
            }

            if (chromeTab.url === "about:newtab") {
                self._notifyNewTabOpened(chromeTab, tabs[0].id);
                return;
            }

            // The second tab's url after a new Firefox window started, will always be about:blank
            // (even if it's opened by New Tab Button), but it will navigate to about:newtab first.
            Util.setTimeout(function () {
                var lastUrlChangeInfo = self._tabsLastUrlChangeInfo[chromeTab.id];
                if (lastUrlChangeInfo && lastUrlChangeInfo.url === "about:newtab") {
                    self._notifyNewTabOpened(chromeTab, tabs[0].id);
                }
            }, 500);
        });
    },

    handleDialog: function (tabId, accept, text, succeeded, failed) {
        this._logger.trace("handleDialog called");
        browser.tabs.sendMessage(tabId, {
            type: 'handleDialog',
            accept: accept,
            text: text
        }).then(function(response) {
            failed('', 'NotImplemented');   // Return NotImplemented, let package to handle
        }).catch(function(error) {
            failed(error, "Error");
        });
    },

    dialogExists: function (tabId, succeeded, failed) {
        this._logger.trace("dialogExists called");
        browser.tabs.sendMessage(tabId, {
            type: 'dialogExists'
        }).then(function(response) {
            succeeded(response.dialogExists);
        }).catch(function(error) {
            failed(error, "Error");
        });
    },

    getDialogText: function (tabId, succeeded, failed) {
        this._logger.trace("getDialogText called");
        browser.tabs.sendMessage(tabId, {
            type: 'getDialogText'
        }).then(function(response) {
            if (response.status === 'OK') {
                succeeded(response.dialogText);    
            } else {
                failed(response.message, response.status);
            }            
        }).catch(function(error) {
            failed(error, "Error");
        });
    },

    clearCache: function (finishedCallback) {
        var timePeriod = { "since": 0 };
        var dataToRemove = { "cache": true };
        if (browser.browsingData) {
            // since Firefox 53
            browser.browsingData.remove(timePeriod, dataToRemove).then(finishedCallback);
        } else {
            this._logger.error("Clear cache is not supportted since the Firefox version does not support browsingData API.");
            ErrorReporter.ThrowGeneralError();
        }
    }
});

