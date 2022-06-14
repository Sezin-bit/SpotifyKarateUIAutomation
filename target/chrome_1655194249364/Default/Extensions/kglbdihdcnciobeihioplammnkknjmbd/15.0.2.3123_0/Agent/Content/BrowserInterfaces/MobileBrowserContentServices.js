// Should be included *after* EmbeddedBrowserContentServices
BrowserServices.isWebRoleBasedKitEnabled = true; // Only needed since Mobile doesn't send onStartReplay/onStartRecord when the app is being launched directly (remove after it's fixed)
BrowserServices.isFrameSupportXSS = true;

BrowserServices.getWindowRect = function() {
    return ContentUtils.getMobileWindowRect(window.hpmcAgent);
};

BrowserServices.getZoomLevel = function() {
    switch (window.hpmcAgent) {
        case "ios":
            var screenOrientedWidth = screen.width;
            if (Math.abs(window.orientation) == 90) {
                screenOrientedWidth = screen.height;
            }
            return screenOrientedWidth / window.innerWidth;
        case "android":
            return 1;
        default:
            return 1;
    }
}