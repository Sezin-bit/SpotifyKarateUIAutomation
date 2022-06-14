LoggerUtilSettings.init();


// Initialize the Global Context of the Content
var content = null;

// Initialize the Contents objects
(function initContent() {
    var url = window.location ? window.location.href : "";
    var logger = new LoggerUtil("ContentLoader");

    if (content) {
        logger.warn("initContent: Already initialized, url=" + url);
        return;
    }

    if (BrowserServices.executeOnLoad) {
       if (isDomReady()) {
            BrowserServices.executeOnLoad();
       } else {
            doOnDomReady(BrowserServices.executeOnLoad);
       }
    }

    if (!ContentUtils.isInjectable(window, logger)) {
        var iFrameId = "Unknown Id";
        try { iFrameId = window.frameElement ? window.frameElement.id : ""; } catch (e) { }
        logger.info("initContent: skip loading content for not injactable for url " + url + " - Frame Id: " + iFrameId);
        return;
    }

    logger.info("initContent: loading content. For " + ((window.parent === window) ? "Page" : "Frame") + " , on " + url);

    content = {};

    // We create the Frame before anything else since that it intiializes the recorder (which registers for events)
    logger.trace("initContent: creating Frame");
    content.frame = new Frame();

    if (isDomReady()) {
        initFrame();
    }
    else {
        logger.info("initContent: document is not ready. Waiting for DOMContentLoaded event.");
        doOnDomReady(initFrame);
    }
    return;

    ///////////////////////////// Helper Functions ////////////////////////////
    function isDomReady() {
        return document && document.body && (document.body.style.display !== "none" || document.readyState === "complete");
    }

    function initFrame() {
        logger.info("initContent: prerequisites for initialization seem OK. Continue with initialization.");

        //creates the DOM agent for injecting handlers at the DOM level
        content.domSubscriber = new DomRequestSubscriber();

        //creates the frame AO that will handle this content.
        content.kitsManager = new KitsManager();

        if(typeof ContentPlayer !== 'undefined') {
            content.player = new ContentPlayer();
            content.player.init();
        }

        content.dispatcher = new ContentDispatcher();
        content.dispatcher.init();

        content.rtidManager = new ObjectRTIDManager();

        // Last thing we do is initialize the frame.
        content.frame.init();
    }

    function doOnDomReady(func) {
        var isFinished = false;
        var interval = 500;
        var count = 0;
        var intervalId = Util.setInterval(executeOnDomReadyHelper, interval);
        document.addEventListener("DOMContentLoaded", function () {
            executeOnDomReadyHelper(true);
        });
        return;

        function executeOnDomReadyHelper(forceExecute) {
            if (isFinished)
                return

            // when triggered by DOMContentLoaded event, execute it directly.
            // Otherwise, execute it when DOM is ready or exceed 10 seconds.
            if (forceExecute || isDomReady() || ++count * interval > 10 * 1000) {
                Util.clearInterval(intervalId);
                isFinished = true;
                func();
            }
        }
    }
})();
