function HistoryTracker() {
    this._logger = new LoggerUtil("HistoryTracker");
    this._listeners = {};
    this._histories = {};
    chrome.webNavigation.onCommitted.addListener(this._navigationEventHandler.bind(this, 'onCommitted'));

    if (chrome.webNavigation.onHistoryStateUpdated) {
        try {
            chrome.webNavigation.onHistoryStateUpdated.addListener(this._navigationEventHandler.bind(this, 'onHistoryStateUpdated'));
        } catch (e) {
            this._logger.warn("HistoryTracker: onHistoryStateUpdated failed to register.");
        }
    } else
        this._logger.info("HistoryTracker: onHistoryStateUpdated API is not available on this Chrome version. It's only supported as of version 22 and above.");

    chrome.webNavigation.onReferenceFragmentUpdated.addListener(this._navigationEventHandler.bind(this, 'onReferenceFragmentUpdated'));
    chrome.webNavigation.onErrorOccurred.addListener(this._onErrorOccurred.bind(this));
    
    if (chrome.tabs.onReplaced)
        chrome.tabs.onReplaced.addListener(this._onTabReplaced.bind(this));
    else
        this._logger.info("HistoryTracker: onReplaced API is not available on this Chrome version. It's only supported as of version 26 and above.");

    this._initInitialUrls();
}

HistoryTracker.prototype = {
    _logger: null,
    _histories: null, // tabId to History map
    _listeners: null,

    _initInitialUrls: function () {
        chrome.windows.getAll({ populate: true }, (function (windowsArr) {
            for (var i = 0; i < windowsArr.length; ++i) {
                for (var j = 0; j < windowsArr[i].tabs.length; ++j) {
                    if (windowsArr[i].type === "normal" || windowsArr[i].type === "app") {
                        var tab = windowsArr[i].tabs[j];
                        this._histories[tab.id] = this._createHistoryObject();
                        this._histories[tab.id].appendNode({ tabId: tab.id, url: tab.url });
                    }
                }
            }

        }).bind(this));
    },

    _createHistoryObject: function () {
        var history = new this.History();
        history.onBack(this._handleBackForwardEvents.bind(this, 'back'));
        history.onForward(this._handleBackForwardEvents.bind(this, 'forward'));
        return history;
    },

    _navigationEventHandler: function (eventName, data) {
        if ((data.frameId === 0) // Top-level Frame (Page) 
            || (data.transitionType === 'manual_subframe') // Manual navigation in a subframe
            || (data.transitionQualifiers && (data.transitionQualifiers.indexOf('forward_back') !== -1)) // Back/Forward on subframe
            || (data.transitionType === 'auto_subframe') // potential back/forward on subframe without transition qualifier within subframe.
            ) {

            this._logger.trace('_navigationEventHandler ', eventName, ' started with: ', data);

            var tabId = data.tabId;
            if (!this._histories[tabId])
                this._histories[tabId] = this._createHistoryObject();

            this._histories[tabId].update(data);
        }
    },

    _onErrorOccurred: function (data) {
        this._logger.trace('_onErrorOccurred: started with: ', data);
    },

    _onTabReplaced: function (tabId, replacedTabId) {
        this._logger.trace('_onTabReplaced: replacing tab id: ', replacedTabId, ' with new tab id: ', tabId);

        var currentNode = this._histories[tabId].currentNode();

        // Save history from old tab
        this._histories[tabId] = this._histories[replacedTabId];
        delete this._histories[replacedTabId];

        // Add new navigation to history
        this._histories[tabId].appendNode(currentNode.data);
    },

    // Callbacks for history
    _handleBackForwardEvents: function (eventName, tabId, isFrameEvent) {
        if (this._listeners[eventName])
            this._listeners[eventName](tabId, isFrameEvent);
    },

    onBack: function (callback) {
        this._listeners.back = callback;
    },

    onForward: function (callback) {
        this._listeners.forward = callback;
    },

    History: function () {
        // C'tor for HistoryTracker.prototype.History.prototype
        this._logger = new LoggerUtil("HistoryTracker.History");
        this._listeners = {};
    },
};

HistoryTracker.prototype.History.prototype = {
    _logger: null,
    _current: null, // of type LinkedNode
    _listeners: null,

    update: function (data) {
        // filter out the subframe
        if (!!this._current && !!data && data.frameId !== 0 && (data.transitionType == 'manual_subframe' || data.transitionType == 'auto_subframe')) {
            return this._updateSubFrame(data);
        } 
        else {
            return this._updatePage(data);
        }
    },

    _updateSubFrame: function (data) {
        if(data.url == "about:blank" && data.transitionType == "auto_subframe")
            return;
        var newFrameNode = new LinkedNode(data, null, null);
        var frameNode = this._current && this._current.getSubFrame(data.frameId);
        if (!frameNode) {
            this._current.setSubFrame(data.frameId, newFrameNode);
            return;
        } else {
            // For subframe navigations we sometimes get 'forward_back' when the user performed a regular navigation
            // Real Back/Forward operations have 'auto_subframe' (and not 'manual_subframe')
            // explicit user action
            if (data.transitionType == 'manual_subframe') {
                frameNode.setNext(newFrameNode);
                this._current.setSubFrame(data.frameId, newFrameNode);
                return;
            }
            else {
                var previousFrameNode = frameNode.getPrevious();
                var nextFrameNode = frameNode.getNext();
                if (previousFrameNode && this._compareUrl(previousFrameNode.data.url, data.url)) {
                    this._dispatchEvent("back", data.tabId, true);
                    this._current.setSubFrame(data.frameId, previousFrameNode);
                    return;
                }
                else if (nextFrameNode && this._compareUrl(nextFrameNode.data.url, data.url)) {
                    this._dispatchEvent("forward", data.tabId, true);
                    this._current.setSubFrame(data.frameId, nextFrameNode);
                    return;
                }
                else {
                    // internal forward or refresh
                    frameNode.setNext(newFrameNode);
                    this._current.setSubFrame(data.frameId, newFrameNode);
                    return;
                }
            }
        }
    },

    _updatePage: function (data) {
        if (this._isAutomaticNavigationRedirect(data)) {
            this._logger.trace("update: client redirect ==> Replacing current history node.");
            this._replaceCurrentNode(data);
            return;
        }

        if (!this._isUserInitiatedBackForward(data)) {
            // Check if navigation is done to the previous URL and that it's not committed due to a form submit event, then it won't be added to the history
            if (this._current && (this._current.data.url === data.url) && (data.transitionType !== 'form_submit')) {
                this._logger.trace("update: Navigating to the same url as the current one. Do nothing.");
                return;
            }

            this._logger.trace("update: Not Back/Forward. Adding a new node to history.");
            this.appendNode(data);
            return;
        }

        // back or forward event

        if (!this._current) {
            this._logger.error('Missing current history entry');
            return;
        }

        var isFrame = (data.frameId !== 0);

        var next = '<empty>';
        if (this._current.getNext()) {
            next = this._current.getNext().data.url;
            if (this._compareUrl(next, data.url)) {
                this._dispatchEvent("forward", data.tabId, isFrame);
                this._current = this._current.getNext();
                return;
            }
        }

        var previous = '<empty>';
        if (this._current.getPrevious()) {
            previous = this._current.getPrevious().data.url;
            //we tacitly addmit that new -launched chrome tab without homepage is a leggal start of history chain
            if (this._compareUrl(previous, data.url) || previous === "chrome://newtab/") {
                this._dispatchEvent("back", data.tabId, isFrame);
                this._current = this._current.getPrevious();
                return;
            }
        }

        this._logger.error('update: Unknown Back/Forward: ' + data.url + '\n' +
            'Previous: ' + previous + '\nNext: ' + next
        );
    },

    _compareUrl: function(url1, url2) {
        if(!url1 || !url2)
            return url1 == url2;
        // sometimes the url might be http://mama.swinfra.net/war/ vs http://mama.swinfra.net/war         
        if(url1.length > url2.length && url1.lastIndexOf('/') == url1.length -1)
            return url1 == (url2 + "/");
        if(url1.length < url2.length && url2.lastIndexOf('/') == url2.length -1)
            return (url1 + "/") == url2;
        
        return url1 == url2;
    },

    _isUserInitiatedBackForward: function (data) {
        if (data.transitionQualifiers.indexOf('forward_back') === -1) {
            return false;
        }

        if (data.frameId === 0)
            return true;

        return false;
    },

    _isAutomaticNavigationRedirect: function (data) {
        if (!data.transitionQualifiers)
            return false;
        //filter conditions user trigger redirect on popurse
        if (data.transitionQualifiers.indexOf('client_redirect') === -1 || data.transitionQualifiers.indexOf('forward_back') !== -1 || data.transitionQualifiers.indexOf('from_address_bar') !== -1)
            return false;
        //#10410, click picture link can give this transitionQualifiers
        if (data.transitionQualifiers.indexOf('client_redirect') !== -1 && data.transitionQualifiers.indexOf('server_redirect') !== -1)
            return false;

        return true;
    },

    _isPotientialForwordNavigationInSubFrame: function (currentNode, data) {
        if (!currentNode || (!data))
            return false;
        if (data.frameId === 0 || data.transitionType !== 'auto_subframe')
            return false;
        var nextNode = currentNode.getNext();
        if (!!nextNode && nextNode.data.frameId === data.frameId)
            return true;

        if (currentNode.data.frameId === data.frameId)
            return true;
        return false;
    },

    currentNode: function () {
        return this._current;
    },

    appendNode: function (data) {
        this._current = new LinkedNode(data, this._current, null);
    },

    onBack: function (callback) {
        this._listeners.back = callback;
    },

    onForward: function (callback) {
        this._listeners.forward = callback;
    },

    //#region Privates
    _replaceCurrentNode: function (data) {
        if (this._current)
            this._current = new LinkedNode(data, this._current.getPrevious(), this._current.getNext());
        else
            this._current = new LinkedNode(data, null, null);
    },

    _dispatchEvent: function (eventName, tabId, isFrameEvent) {
        if (this._listeners[eventName])
            this._listeners[eventName](tabId, isFrameEvent);
    },
    //#endregion 
};

function LinkedNode(data, prev, next) {
    this.data = data;
    this.setPrevious(prev);
    this.setNext(next);
    this._subFrameNodes = {};
}

LinkedNode.prototype = {
    data: null,
    _previous: null,
    _next: null,
    _subFrameNodes: null,

    getSubFrame: function (frameId) {
        return this._subFrameNodes[frameId];
    },

    setSubFrame: function (frameId, node) {
        this._subFrameNodes[frameId] = node;
    },

    getNext: function () {
        return this._next;
    },

    setNext: function (node) {
        if (this._next)
            this._next._previous = null;

        this._next = node;
        if (node)
            node._previous = this;
    },

    getPrevious: function () {
        return this._previous;
    },

    setPrevious: function (node) {
        if (this._previous)
            this._previous._next = null;

        this._previous = node;
        if (node)
            node._next = this;
    },
};
