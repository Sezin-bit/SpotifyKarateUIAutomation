// Should be included *after* EmbeddedBrowserContentServices
BrowserServices.isWebRoleBasedKitEnabled = (window._QTP.WebDriverInfo && window._QTP.WebDriverInfo.WebDriverType === "Mobile");

BrowserServices.isEdgeMaximized = function() {
    if (navigator.userAgent.indexOf('Edge') == -1) {
        return false;
    }
    // Edge has 16 magical extra pixels when maximized
    return window.outerWidth - window.screen.availWidth == 16
            && window.outerHeight - window.screen.availHeight == 16;
};
