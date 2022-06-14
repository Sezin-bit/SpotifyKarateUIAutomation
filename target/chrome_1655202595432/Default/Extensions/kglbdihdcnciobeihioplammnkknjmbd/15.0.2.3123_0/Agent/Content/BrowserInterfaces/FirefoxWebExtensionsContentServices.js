/* This file must be included AFTER ChromeContentServices.js */

BrowserServices.createCrossOriginCustomEvent = function (eventType, eventDetail) {
    var clonedDetail = cloneInto(eventDetail, document.defaultView);
    var event = new CustomEvent(eventType, clonedDetail);
    return event;
};

BrowserServices.executeOnLoad = function() {
    BrowserServices.registerDialogHandler();

    // Inject a piece of JS code into top page, which will monitor iFrame's load event, and
    // override iFrame's content by 'document.write', in order to have our agent code being
    // injected into about:blank iFrame. This is a trick of Firefox but it works.
    // This helps us to identify RichTextAreas in web 2.0 toolkits, like Dojo, AspAjax, GWT.
    // If we draft iFrame's content by just document.body.appendChild, the agent is not injected,
    // but once we use 'document.write', the agent is injected, trick it is.
    if (this._executed)
        return;
    this._executed = true;

	// Inject content to blank iframe by setting "match_about_blank" flag to true
	// "match_about_blank" is supported in firefox from version 52
	// Please refer to https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_scripts
	// So does not need to invoke document.write()
	var versionNum = parseInt(Util.browserApplicationVersion().split(' ')[2]);
	if(isNaN(versionNum) || versionNum < 52) {
		ContentUtils.evalInDocument(overrideiFrameOnLoadHelper);		
	}
    return;

    function overrideiFrameOnLoadHelper() {
        document.addEventListener('load', function (e) {
            var src = e.srcElement || e.target;
            var doc = src.contentDocument;
            if (src && src.tagName == "IFRAME" && doc.URL === "about:blank") {
                if (doc.head && doc.body && doc.head.childElementCount === 0 && doc.body.childElementCount === 0) {
                    doc.open();
                    doc.write('<html><body></body></html>');
                    doc.close();
                }
            }
        }, true);
    }
};

BrowserServices.runStarted = function() {
    BrowserServices.rewriteDialogFunctions();
};

BrowserServices.runEnded = function() {
    BrowserServices.recoverDialogFunctions();
};

BrowserServices.rewriteDialogFunctions = function() {
    ContentUtils.evalInDocument(_helper);
    return;

    function _helper() {
        if (window.originalAlert) {
            return;
        }
        window.originalAlert = window.alert;
        window.originalConfirm = window.confirm;
        window.originalPrompt = window.prompt;

        // We cannot use variables defined in BrowserServices here, because this function will run in web pages,
        // where BrowserServices is not available
        var attrDialogExists = '__UFT__DIALOG__EXISTS';
        var attrDialogText = '__UFT__DIALOG__TEXT';
        window.alert = function(message) {
            try {
                window.top.document.body.setAttribute(attrDialogExists, 'true');
                window.top.document.body.setAttribute(attrDialogText, message);
            } catch (e) {
                // Use DOM attributes of top window to share variables between JS in web pages and content scripts
                window.top.postMessage({
                    attrDialogExists: 'true',
                    attrDialogText: message
                }, '*');
            }
            return window.originalAlert(message);
        };
        window.confirm = function(message) {
            try {
                window.top.document.body.setAttribute(attrDialogExists, 'true');
                window.top.document.body.setAttribute(attrDialogText, message);
            } catch (e) {
                window.top.postMessage({
                    attrDialogExists: 'true',
                    attrDialogText: message
                }, '*');
            }
            return window.originalConfirm(message);
        };
        window.prompt = function(text, defaultText) {
            try {
                window.top.document.body.setAttribute(attrDialogExists, 'true');
                window.top.document.body.setAttribute(attrDialogText, text);
            } catch (e) {
                window.top.postMessage({
                    attrDialogExists: 'true',
                    attrDialogText: text
                }, '*');
            }
            return window.originalPrompt(text, defaultText);
        };

        window.__UFT__DIALOG__MESSAGE__HANDLER = function(message) {
            var dialogExists = message.data.attrDialogExists;
            var dialogText = message.data.attrDialogText;
            if (window !== window.top
                || dialogExists === undefined
                || dialogText === undefined) {
                return;
            }
            document.body.setAttribute(attrDialogExists, dialogExists);
            document.body.setAttribute(attrDialogText, dialogText);
        };
        window.addEventListener('message', window.__UFT__DIALOG__MESSAGE__HANDLER, true);

        document.body.setAttribute(attrDialogExists, 'false');
        document.body.setAttribute(attrDialogText, '');
    }
};

BrowserServices.recoverDialogFunctions = function() {
    ContentUtils.evalInDocument(_helper);
    return;

    function _helper() {
        if (!window.originalAlert) {
            return;
        }
        window.alert = window.originalAlert;
        window.confirm = window.originalConfirm;
        window.prompt = window.originalPrompt;
        window.originalAlert = undefined;
        window.originalConfirm = undefined;
        window.originalPrompt = undefined;

        if (window.__UFT__DIALOG__MESSAGE__HANDLER) {
            window.removeEventListener('message', window.__UFT__DIALOG__MESSAGE__HANDLER, true);
            window.__UFT__DIALOG__MESSAGE__HANDLER = undefined;
        }

        var attrDialogExists = '__UFT__DIALOG__EXISTS';
        var attrDialogText = '__UFT__DIALOG__TEXT';
        document.body.removeAttribute(attrDialogExists);
        document.body.removeAttribute(attrDialogText);
    }
};

BrowserServices.registerDialogHandler = function() {
    browser.runtime.onMessage.addListener(function(request, sender, callback) {
        try {
            if (request.type === 'handleDialog') {
                BrowserServices.handleDialog(callback);            
            } else if (request.type === 'dialogExists') {
                BrowserServices.getDialogExists(callback);
            } else if (request.type === 'getDialogText') {
                BrowserServices.getDialogText(callback);
            }
        } catch (e) {
            callback({
                status: 'ERROR',
                message: e.message
            });
        }
    });
};

BrowserServices.handleDialog = function(callback) {
    if (document.body.getAttribute(BrowserServices.ATTR_DIALOG_EXISTS) === 'false') {
        callback({ status: 'IllegalOperation', message: 'No dialog' });
        return;
    }
    callback({ status: 'OK' });

    document.body.setAttribute(BrowserServices.ATTR_DIALOG_EXISTS, 'false');
    document.body.setAttribute(BrowserServices.ATTR_DIALOG_TEXT, '');
};

BrowserServices.getDialogExists = function(callback) {
    callback({ 
        status: 'OK', 
        dialogExists : document.body.getAttribute(BrowserServices.ATTR_DIALOG_EXISTS) === 'true'
    });
};

BrowserServices.getDialogText = function(callback) {
    if (document.body.getAttribute(BrowserServices.ATTR_DIALOG_EXISTS) === 'false') {
        callback({ status: 'IllegalOperation', message: 'No dialog' });
        return;
    }
    callback({ 
        status: 'OK', 
        dialogText: document.body.getAttribute(BrowserServices.ATTR_DIALOG_TEXT)
    });
};

BrowserServices.getOuterHeight = function() {
    var zoomLevel = BrowserServices.getZoomLevel && BrowserServices.getZoomLevel() || 1;
    return Math.floor(window.outerHeight * zoomLevel);
};

BrowserServices.getOuterWidth = function() {
    var zoomLevel = BrowserServices.getZoomLevel && BrowserServices.getZoomLevel() || 1;
    return Math.floor(window.outerWidth * zoomLevel);
};

BrowserServices.getWindowRect = function() {
    return {
        top: Math.floor(window.screenY * BrowserServices.devicePixelRatio),
        left: Math.floor(window.screenX * BrowserServices.devicePixelRatio),
        right: Math.floor((window.screenX + window.outerWidth || window.innerWidth) * BrowserServices.devicePixelRatio),
        bottom: Math.floor((window.screenY + window.outerHeight || window.innerHeight) * BrowserServices.devicePixelRatio),
        extAPISupported: true
    };
}

BrowserServices.ATTR_DIALOG_EXISTS = '__UFT__DIALOG__EXISTS';
BrowserServices.ATTR_DIALOG_TEXT = '__UFT__DIALOG__TEXT';
BrowserServices._executed = false;