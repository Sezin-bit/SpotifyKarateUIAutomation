function DialogHandler() {
    this._logger = new LoggerUtil("Ext.Chrome.DialogHandler");
    this._tabs = {};
    chrome.debugger.onEvent.addListener(this._debbuggerEvent.bind(this));
    chrome.debugger.onDetach.addListener(this._debbuggerDetached.bind(this));
}

DialogHandler.prototype = {
    _logger: null,
    _tabs: null,

    addTabs: function (tabs) {
        tabs.forEach(function (id) {
            if (!this._tabs[id])
                this._tabs[id] = new this.Tab(id, this._logger);
                
            this._tabs[id].attach();
        }, this);
    },

    detachAllTabs: function () {
        Object.keys(this._tabs).forEach(function (tabId) {
            this._tabs[tabId].detach();
        },this);
        this._tabs = {};
    },

    detachTab: function(tabId){
        var tab = this._tabs[tabId];
        if(!Util.isNullOrUndefined(tab)){
            tab.detach();
        }
        
        delete this._tabs[tabId];
        return Object.keys(this._tabs).length === 0;
    },

    _debbuggerEvent: function (id, method, args) {
        switch (method) {
            case 'Page.javascriptDialogOpening':
                this._tabs[id.tabId].setMessage(args.message);
                break;
            case 'Page.javascriptDialogClosed':
                this._tabs[id.tabId].setMessage(null);
                break;
        }
    },

    _debbuggerDetached: function(id, reason) {
        if (this._tabs[id.tabId]) {
            this._logger.warn("Debugger was detached from tab " + id.tabId + ": " + reason);
            this._tabs[id.tabId].disconnected();
        }
    },

    _noHandler: function (id, callback) {
        this._logger.error("Trying to handle a dialog on unknown tab - " + id);
        callback("No dialog-handler for tab: " + id);
    },

    handle: function(id, accept, text, succeeded, failed) {
        if (this._tabs[id])
            this._tabs[id].handle(accept, text, succeeded, failed);
        else
            this._noHandler(id, failed);
    },

    exists: function(id, succeeded, failed) {
        if (this._tabs[id])
            this._tabs[id].exists(succeeded, failed);
        else
            this._noHandler(id, failed);
    },

    text: function(id, succeeded, failed) {
        if (this._tabs[id])
            this._tabs[id].text(succeeded, failed);
        else
            this._noHandler(id, failed);
    },

    emulateDevice: function(id) {
        if (this._tabs[id])
            this._tabs[id].emulateDevice();
    },

    Tab: function (tabId, logger) {
        this._id = { tabId: parseInt(tabId, 10) };
        this._logger = logger;
    },
};

DialogHandler.prototype.Tab.prototype = {
    _id: null,
    _logger: null,
    _message: null,
    _attached: false,
    _emulatingDevice: false,

    attach: function () {
        if (!this._attached)
            this._attachAndDo(null);
    },
    
    _attachAndDo: function (callback) {
        if (this._attached) {
            this._logger.warn("Trying to attach to a tab which is already attached, id=" + this._id.tabId);
            return;
        }

        chrome.debugger.attach(this._id, "1.0", function () {
            if (this._warnIfError("attach failed to attach debugger")) {
                return;
            }

            this._attached = true;

            // Get Page.javascriptDialogOpening and Closed events
            chrome.debugger.sendCommand(this._id, "Page.enable", {}, function () {
                this._warnIfError("attach 'Page.enable' failed");

                if (callback)
                    callback();

            }.bind(this));

        }.bind(this));
    },

    detach: function () {    
        // Do not detach emulated tab            
        if (this._attached && !this._emulatingDevice) {
            chrome.debugger.detach(this._id, function () {
                if (!this._warnIfError("detach failed"))
                    this._attached = false;
            }.bind(this));
        }
    },

    disconnected: function () {
        this._attached = false;
    },

    emulateDevice: function () {
        this._emulatingDevice = true;
        //If the chrome tab was already open and attached(for ex: run the test once and not close the chrome tab)
        //Rerun the test the dialog handler will not work, the reason is that the tab was attached so the dialog handler attach will failed.
        //To fix this, if emulator run succeed, assume the tab was already attached.
        this._attached = true;
    },

    handle: function (accept, text, succeeded, failed) {
        if (!this._attached) {
            this._logger.info("handleDialog, trying to re-attach debugger");
            //this._attachAndDo(function () { this._handle(accept, text, succeeded, failed) }.bind(this));
            this._attachAndDo(this._handle.bind(this, accept, text, succeeded, failed));
        }
        else
            this._handle(accept, text, succeeded, failed);
    },

    // the actual handling of the dialog without trying to re-attach to the debugger, in order to avoid endless recursion if fail to re-attach
    _handle: function (accept, text, succeeded, failed) {
        var params = { accept: accept, promptText: text };
        chrome.debugger.sendCommand(this._id, "Page.handleJavaScriptDialog", params, function () {
            if (chrome.runtime.lastError) 
                failed(chrome.runtime.lastError.message, "IllegalOperation");
            else
                succeeded();
        });
    },

    text: function (succeeded, failed) {
        if (this._message !== null)
            succeeded(this._message);
        else
            failed("No known open dialog", "IllegalOperation");
    },

    exists: function (callback) {
        if (!this._attached)
            this._logger.warn("Not connected to debugger on tabId " + this._id.tabId + ": Possible false negative");
        callback(this._message !== null);
    },

    setMessage: function(message) {
        this._message = message;
    },

    _warnIfError: function (msg) {
        if (chrome.runtime.lastError) {
            this._logger.warn('DialogHandler.' + msg + ': ' + chrome.runtime.lastError.message);
            return true;
        }
        return false;
    }
};