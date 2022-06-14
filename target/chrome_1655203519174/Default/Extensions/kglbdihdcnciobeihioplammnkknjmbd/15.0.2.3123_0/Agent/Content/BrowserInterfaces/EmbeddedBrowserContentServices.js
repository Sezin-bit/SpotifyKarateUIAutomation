/*
 *  This file is used for EmbeddedBrowser components
 */

var BrowserServices = {
    createComChannel: function (logger) {
        if (logger)
            logger.trace("BrowserServices.createComChannel: started for EmbeddedBrowser");

        return new MessageChannelComChannel("content");
    },

    getLoadTime: function (logger) {
        if (logger)
            logger.warn("BrowserServices.getLoadTime: started for EmbeddedBrowser - Currently Unsupported, returning 0");
        return 0;
    },

    isSpecialUninjectablePage: function (logger) {
        return false;
    },

    getZoomLevel: function() {
        // TODO: embedded browsers are using mouseover event for spy
        return 1;
    },

    isAboutBlankFrameInjectable: true,
    shouldOverrideDispatchEvent: true,
    isRunningInPageContext: true,
    coordinatesAreRelativeToPage: true,
    shouldSendWebExtReportWithResponse: true,
    isFrameSupportXSS: true
};
