/*
 *  To track the changes to the Extensions in each Chrome version, visit:
 *  http://code.google.com/chrome/extensions/whats_new.html
 */

var BrowserServices = {
    createComChannel: function (logger) {
        if (logger)
            logger.trace("BrowserServices.createComChannel: started for CHROME");

        return new ChromeComChannel();
    },

    getLoadTime: function (logger) {
        if (logger)
            logger.trace("BrowserServices.getLoadTime: started for CHROME");

        var loadTimes = chrome.loadTimes();
        return loadTimes.finishLoadTime - loadTimes.startLoadTime;
    },

    isSpecialUninjectablePage: function (logger) {
        if (typeof chrome !== "undefined" && chrome && chrome.embeddedSearch && chrome.embeddedSearch.newTabPage) {
            if (logger)
                logger.info("BrowserServices.isSpecialUninjectablePage: chrome's empty new tab page detected - define as uninjectable");
            return true;
        }

        var protocol = location.protocol;
        if (protocol === "chrome-extension:" || protocol === "chrome:" || protocol === "edge:") {
            logger.info("BrowserServices.isSpecialUninjectablePage: chrome, edge or chrome extension. return true.");
            return true;
        }

        return false;
    },

    getZoomLevel: function() {
        return window.devicePixelRatio;
    },

    getOuterHeight: function() {
        return Math.floor(window.outerHeight * BrowserServices.devicePixelRatio);
    },
    
    getOuterWidth: function() {
        return Math.floor(window.outerWidth * BrowserServices.devicePixelRatio);
    },

    getWindowRect: function() {
        return {
            top: Math.floor(window.screenY * BrowserServices.devicePixelRatio),
            left: Math.floor(window.screenX * BrowserServices.devicePixelRatio),
            right: Math.floor((window.screenX + window.outerWidth || window.innerWidth) * BrowserServices.devicePixelRatio),
            bottom: Math.floor((window.screenY + window.outerHeight || window.innerHeight) * BrowserServices.devicePixelRatio)
        };
    },

    isDialogHandlingSupported: true,
    shouldOverrideDispatchEvent: true,
    isAboutBlankFrameInjectable: true,
    isFrameSupportXSS: true,
    devicePixelRatio: 1
};
