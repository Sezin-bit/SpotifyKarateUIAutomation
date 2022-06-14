var BrowserServices = {
    createComChannel: function (logger) {
        if (logger)
            logger.trace("BrowserServices.createComChannel: started for SAFARI");

        return new SafariComChannel();
    },
    
    getLoadTime: function (logger) {
        if (logger)
            logger.warn("BrowserServices.getLoadTime: started for Safari - Currently Unsupported, returning 0");
        return 0;
    },

    isSpecialUninjectablePage: function (/*logger*/) {
        return false;
    },

    getZoomLevel: function() {
        // TODO: window.devicePixelRatio?
        return 1;
    },
    
    isAboutBlankFrameInjectable: false,
    isFrameSupportXSS:true,
};

// This exists because in Safari when you go BACK and FORWARD in the browser
// the content scripts are not re-injected into the page
window.addEventListener("unload", Util.identity, false);
