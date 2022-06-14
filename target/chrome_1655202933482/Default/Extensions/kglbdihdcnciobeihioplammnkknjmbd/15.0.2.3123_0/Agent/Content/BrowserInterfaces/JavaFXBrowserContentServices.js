//Should be included *after* EmbeddedBrowserContentServices
BrowserServices.createComChannel = function (logger) {
    if (logger)
    logger.trace("BrowserServices.createComChannel: started for JavaFXBrowser");

    return new MessageChannelComChannel("content", true); //JavaFX disable AsyncCommunicationHelper for performance issue.
};

BrowserServices.getZoomLevel = function() {
    // TODO check: screen.width/window.innerWidth or window.devicePixelRatio
    return 1;
}