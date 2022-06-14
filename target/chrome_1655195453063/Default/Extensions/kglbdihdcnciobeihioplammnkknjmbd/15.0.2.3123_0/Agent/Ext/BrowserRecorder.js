function BrowserRecorder(knownTabs){
    this._logger = new LoggerUtil("Ext.BrowserRecorder");
    this._logger.info("BrowserRecorder was initiated");

    this._knownTabs = knownTabs;
    this._tabsReplacedMap = {};
    this._eventData = {};
    this._destroyedTabs = [];
    this._lastRemoveInfo = null;
}

BrowserRecorder.prototype = {
    _logger: null,
    _knownTabs: null,
    _destroyedTabs: [],
    _tabsReplacedMap: null,
    _eventData: null,
    _lastRemoveInfo: null,

    onTabReplaced: function (newTabId, oldTabId) {
        this._logger.trace("onTabReplaced: replacing tab id: " + oldTabId + " with tab id: " + newTabId);
        this._tabsReplacedMap[oldTabId] = newTabId;
    },

    onAddressBarNavigation: function (tabId, url) {
        this._logger.trace("onAddressBarNavigation: started with tab id: " + tabId + " and url: " + url);

        this._onEventReceived(tabId, 'navigate', url);
    },

    onReload: function (tabId) {
        this._logger.trace("onReload: started with tab id: " + tabId);

        this._onEventReceived(tabId, 'Refresh');
    },

    onBack: function (tabId, isFrameNavigation) {
        this._logger.trace("onBack: started with tab id: " + tabId);

        this._onEventReceived(tabId, 'Back');

        if (isFrameNavigation)
            this._askBrowserForData(tabId);
    },

    onForward: function (tabId, isFrameNavigation) {
        this._logger.trace("onForward: started with tab id: " + tabId);

        this._onEventReceived(tabId, 'Forward');

        if (isFrameNavigation)
            this._askBrowserForData(tabId);
    },

    onUserOpenedNewTab: function(openerTabId) {
        this._logger.trace("onUserOpenedNewTab: started with tab id: " + openerTabId);

        var tabId = this._getUpdatedTabId(openerTabId);
        this._onEventReceived(tabId, 'OpenNewTab');

        this._askBrowserForData(tabId);
    },

    onUserClosedTab: function(closedTabId, removeInfo) {
        this._logger.trace("onUserClosedTab: started with tab id: " + closedTabId);

        var tabId = this._getUpdatedTabId(closedTabId);
        var browserToBeClosed = this._knownTabs[tabId];
        this._destroyedTabs[tabId] = browserToBeClosed;

        // removeInfo.isWindowClosing is true when user close the browser window by 'X' or 'ALT+F4'.
        // We will record 'CloseAllTabs' on first tab closed and ignore following ones.
        if (this._lastRemoveInfo && this._lastRemoveInfo.isWindowClosing
            && removeInfo && this._lastRemoveInfo.windowId === removeInfo.windowId) {
            this._logger.trace("onUserClosedTab: tab is closed by window close, so skipping record since CloseAllTabs was recorded.");
        } else {
            var eventName = (removeInfo && removeInfo.isWindowClosing) ? "CloseAllTabs" : "Close";
            this._onEventReceived(tabId, eventName);
        }

        this._lastRemoveInfo = removeInfo;
    },

    onBrowserInformationReceived: function (tabId, browserInfo) {
        this._logger.trace("onBrowserInformationReceived: started with tab id: " + tabId);

        tabId = this._getUpdatedTabId(tabId);

        if (!this._eventData[tabId])
            this._eventData[tabId] = {};

        this._eventData[tabId].data = browserInfo;

        this._dispatchRecordEvent(tabId);
    },

    _askBrowserForData: function (tabId) {
        var browser = this._knownTabs[tabId];
        var recordMsg = new Msg('EVENT_INTERNAL_SEND_BROWSER_INFO', browser.getID(), {});
        browser.onMessage(recordMsg);
    },

    _onEventReceived: function(tabId, eventName, url) {
        this._logger.trace("_onEventReceived: started with tab id: " + tabId + ", event name: " + eventName + " and url: " + url);

        tabId = this._getUpdatedTabId(tabId);

        if (!this._eventData[tabId])
            this._eventData[tabId] = {};

        this._eventData[tabId].name = eventName;
        this._eventData[tabId].url = url;

        this._dispatchRecordEvent(tabId);

        Util.setTimeout(function () {
            if (!this._eventData[tabId])
                return;

            this._logger.warn("_onEventReceived: clearing event data of: " + this._eventData[tabId].name + " - tab id: " + tabId);
            this._eventData[tabId].name = null;
        }.bind(this), 10000);
    },

    _getUpdatedTabId: function(tabId) {
        if (this._tabsReplacedMap[tabId]) {
            var newTabId = this._tabsReplacedMap[tabId];
            this._logger.trace("_getUpdatedTabId: tab id: " + tabId + " was replaced with tab id: " + newTabId);
            return newTabId;
        }

        return tabId;
    },

    _createRecordData: function (ao) {
        this._logger.trace("_createRecordData: started");
        var micclass = Util.getMicClass(ao);

        var objDesc = Description.createEmptyRecordDescription(ao);

        var description = SpecialObject.CreateDescription(objDesc);
        
        var recordData = {
            WEB_PN_ID: [[ao.getID()]],
            micclass: [[micclass]],
            'recorded description': [[description]],
            'event id': [[]],
        };

        return recordData;
    },

    _dispatchRecordEvent: function (tabId) {
        this._logger.trace("_dispatchRecordEvent: Called for tabId: " + tabId);
        if (Util.isNullOrUndefined(this._eventData[tabId]) || Util.isNullOrUndefined(this._eventData[tabId].name))
            return;

        var browser = this._knownTabs[tabId];
        if (!browser)
            browser = this._destroyedTabs[tabId];

        Util.assert(browser, "_dispatchRecordEvent: Browser is undefined", this._logger);

        var data = this._eventData[tabId].data;

        if (Util.isNullOrUndefined(data)) {
            if (browser.GetAttrSync('openurl').length > 0) // the browser initialized.. the data should come from the browser any second now.
                return;
            else {
                // the browser is not initialized. so there's no content. let's create an empty description.
                this._logger.trace("_dispatchRecordEvent: Creating an empty record description for uninitialized browser: " + tabId);
                data = this._createRecordData(browser);
            }
        }

        this._logger.prettyDebug("_dispatchRecordEvent: Recording Navigation: ", this._eventData[tabId]);
     
        var eventName = this._eventData[tabId].name;
        var url = this._eventData[tabId].url;
        delete this._eventData[tabId];
        
        var eventId = SpecialObject.CreateEventId({clientX : 0, clientY: 0, type: eventName}, browser.getID());
        data['event id'][0][0] = eventId;
        data.event = eventName;
        data.text = eventName;
        data.url = url;

        var recordMsg = new Msg('EVENT_RECORD', browser.getID(), data);
        browser.onMessage(recordMsg);
    }
};