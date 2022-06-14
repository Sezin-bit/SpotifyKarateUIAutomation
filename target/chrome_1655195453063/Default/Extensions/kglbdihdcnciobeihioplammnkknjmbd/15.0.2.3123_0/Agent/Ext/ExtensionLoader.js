// Initialize the Global Context of the Extension
var ext = null;

// Initialize the Extensions objects
(function () {
    // Make sure this code doesn't run in an IFrame
    if ((typeof (window) !== 'undefined') && (window !== window.top))
        return;

    var logger = new LoggerUtil("BackGroundExt");
    if (ext) {
        logger.warn("Initializing extension more than once");
        return;
    }
    ext = {};

    function getCurrentApi() {
        if (typeof window !== "undefined") {
            if (window.chrome && window.chrome.extension && typeof InstallTrigger !== 'undefined')
                return FirefoxWebExtensionsAPI;

            // NW.js also have window.chrome.extension, move WebDriverBrowserAPI before ChromeAPI
            if (window._QTP && window._QTP.WebDriverInfo)
                return WebDriverBrowserAPI;

            if (window.chrome && window.chrome.extension) // chrome.extension is available only when running as a Chrome Extension
                return ChromeAPI;

            if (window.safari && window.safari.extension) // safari.extension is available only when running as a Safari Extension
                return SafariAPI;
        }

        if (typeof (FirefoxAPI) !== 'undefined') // Firefox API is only defined when running as a Firefox Addon
            return FirefoxAPI;

        if (typeof (MobileCenterBrowserAPI) !== "undefined") // UFT Mobile API is only defined when injected into a hybrid application by the UFT Mobile
            return MobileCenterBrowserAPI;

        if (typeof (WebDriverBrowserAPI) !== "undefined") // WebDriver API is only defined when injected into a target application launched by the WebDriver
            return WebDriverBrowserAPI;

        if (typeof (JavaFXBrowserAPI) !== "undefined") // JavaFXBrowser API is only defined when injected into a JavaFX WebView
            return JavaFXBrowserAPI;
        if (typeof (LFTEmbeddedBrowserAPI) !== "undefined") // WebDriver API is only defined when the agent is constructed for ChromeBrowserControl.
            return LFTEmbeddedBrowserAPI;

    }

    var currentApi = getCurrentApi();
    var logSettingsObject = currentApi ? currentApi.prototype.getLogSettingsObject() : {};

    LoggerUtilSettings.setSettings(logSettingsObject);
    ext.bgLogger = logger;
    ext.bgLogger.trace("BackGround Was Loaded");

    ext.app = (function () {
        try {
            if (currentApi) {
                ext.bgLogger.info("API found: " + currentApi.name);
                return new currentApi();
            }

            ext.bgLogger.error("initApi(): No Browser API!");
            return null;
        } catch (e) {
            ext.bgLogger.error("error when create app, e = " + e);
        }
    })();

    if(typeof ExtPlayer !== 'undefined') {
        ext.player = new ExtPlayer();
    }        
    ext.dispatcher = new ExtDispatcher();
    ext.agent = new Agent();


    //The extension might be loaded after the first tabs are opened and we will
    //miss the onCreate event on them this is why we want to get all the open tabs
    ext.agent.UpdateKnownBrowsers();

    ext.onUnload = function () {
        ext.dispatcher.onUnload();
    };

    if (typeof exports !== "undefined") {
        exports.ext = ext;
    }
})();
