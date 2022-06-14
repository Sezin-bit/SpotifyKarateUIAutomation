// © Copyright 1992-2017 Hewlett Packard Enterprise Development LP

var ContentUtils = {
    findFrameElemByID: function (id, doc, logger) {
        logger = logger || ContentUtils.getEmptyLogger();

        logger.trace("findFrameElemByID: called to find frame with id ", id);
        Util.assert(doc, "findFrameElemByID: received empty document !", logger);
        var childs = this.findIframeConsiderXPath(doc, 'IFRAME,FRAME', logger);

        for (var i = 0; i < childs.length; ++i) {
            if (!ContentUtils.isInjectableFrame(childs[i], logger)) {
                var contentDoc = childs[i].contentDocument;
                if (!contentDoc) {
                    logger.warn("findFrameElemByID: unable to receive content document of uninjectable frame");
                    continue;
                }

                var foundChild = ContentUtils.findFrameElemByID(id, contentDoc, logger);
                if (foundChild) {
                    return foundChild;
                }
            } else {
                if (childs[i].__QTP__OBJ && RtIdUtils.IsRTIDEqual(childs[i].__QTP__OBJ.comID, id)) {
                    logger.debug("findFrameElemByID: frame found");
                    return childs[i];
                }
                if (!childs[i].__QTP__OBJ) {
                    logger.warn("findFrameElemByID: frame doesn't have __QTP__OBJ");
                }
            }
        }

        logger.warn("findFrameElemByID: couldn't find frame with id ", id, " - returning NULL");
        return null;
    },

    addLogicalNamesToIdentificationResult: function (parentId, resultCallback) {
        return function (res) {
            res._data.logicalNames = res._data.WEB_PN_ID.map(function (id) {
                var elem = content.rtidManager.GetElementFromID(id.object);
                var ao = content.kitsManager.createAO(elem, parentId);
                return ao.GetAttrSync("logical name");
            });
            resultCallback(res);
        };
    },

    isInjectableFrame: function (frameElement, logger) {
        logger = logger || ContentUtils.getEmptyLogger();
        logger.debug("isInjectableFrame: called");

        if (!frameElement.contentWindow) { // We are in Chrome version < 25 - no contentWindow
            logger.debug("isInjectableFrame: chrome < 25. Result  -> " + !!frameElement.__QTP__OBJ);
            return !Util.isNullOrUndefined(frameElement.__QTP__OBJ); // If __QTP__OBJ is defined - the frame is injectable
        }

        // We are in Chrome version > 25 - use common logic
        return ContentUtils.isInjectable(frameElement.contentWindow, logger);
    },

    isInjectable: function (win, logger) {
        logger = logger || ContentUtils.getEmptyLogger();
        logger.trace("isInjectable: called");

        if (BrowserServices.isSpecialUninjectablePage(logger)) {
            logger.debug("isInjectable: BrowserServices says -> false");
            return false;
        }

        if (win === win.parent) { // We should be injected in top level documents (page)
            logger.debug("isInjectable: at page -> true");
            return true;
        }

        try {
            if (!win.frameElement) { // This is XSS restriction so we should be injected
                logger.debug("isInjectable: XSS -> true");
                return true;
            }
        }
        catch (err) {
            logger.debug("isInjectable: XSS -> true");
            return true;
        }

        if (win.frameElement.tagName === "OBJECT") {
            logger.info("isInjectable: This is not a frame, this is an object element (unsupported) -> false");
            return false;
        }

        var src = win.frameElement.src;
        if (src == null) {
            // you can get here if you do the following code: delete document.getElementById("myIframe").src
            logger.error("isInjectable: frameElement.src is undefined -> false");
            return false;
        }

        //check src is not about:blank or if browser supports inject in about:blank doesn't need to check
        if (BrowserServices.isAboutBlankFrameInjectable) {
            logger.debug("isInjectable: -> true (isAboutBlankFrameInjectable); src:" + win.frameElement.src);
            return true;
        }

        if (src === "") {
            logger.debug("isInjectable: -> true (source is an empty string)");
            return true;
        }

        if (src.match(/^about:/) || src.match(/^javascript:/)) {
            logger.debug("isInjectable: -> false (" + src + ")");
            return false;
        }

        logger.debug("isInjectable: -> true");
        return true;
    },

    getEmptyLogger: function () {
        return {
            trace: function (msg) {
                //console.log(msg);
            },
            prettyTrace: function (msg) {
                //console.log(msg);
            },
            debug: function (msg) {
                //console.log(msg);
            },
            prettyDebug: function (msg) {
                //console.log(msg);
            },
            warn: function (msg) {
                //console.warn(msg);
            },
            info: function (msg) {
                //console.info(msg);
            },
            error: function (msg) {
                //console.error(msg);
            }
        };
    },
    isHTMLElement: function (elem, logger) {
        if (Util.isNullOrUndefined(elem)) {
            return false;
        }

        if (!(elem instanceof HTMLElement)) {
            return false;
        }

        return true;
    },
    getElementClientRect: function (elem, logger) {
        logger = logger || ContentUtils.getEmptyLogger();
        logger.trace("getElementClientRect: called");

        if (!ContentUtils.isHTMLElement(elem)) {
            logger.error("getElementClientRect: Received invalid element. returning.");
            return null;
        }

        var rect = elem.getBoundingClientRect();
        return {
            top: Math.floor(rect.top),
            left: Math.floor(rect.left),
            right: Math.floor(rect.right),
            bottom: Math.floor(rect.bottom)
        };
    },

    /**
    * getCenterPoint()
    * @param {Object} elem - HTML element
    * @returns {x: Number, y: Number} the point at the center of 'elem'.
    */
    getCenterPoint: function (elem) {
        var rect = elem.getBoundingClientRect();
        return {
            x: Math.floor(rect.left + (rect.width / 2)),
            y: Math.floor(rect.top + (rect.height / 2))
        };
    },

    ElementBorder: function (elem) {
        this.overlay = document.createElement('div');
        Util.extend(this.overlay.style, {
            backgroundColor: 'transparent',
            border: '4px solid #FD00FF',
            borderRadius: 0,
            boxSizing: 'content-box',
            display: 'none',
            margin: '0px',
            padding: '0px',
            position: 'fixed',
            zIndex: '999999999'
        });

        // Make sure that the tooltip is aligned left to right even if the page is in rtl.
        this.overlay.dir = 'ltr';

        document.body.appendChild(this.overlay);

        if (elem)
            this.wrap(elem);
    },

    highlightElement: function (elem, resultCallback, msg) {
        var border = new this.ElementBorder(elem);

        var count = 0;
        // Flash three times (3*on + 3*off)
        function drawRect() {
            if (++count > 6) {
                border.remove();
                resultCallback(msg);
                return;
            }

            if (count % 2)
                border.show();
            else
                border.hide();

            Util.setTimeout(drawRect, 150);
        }
        drawRect();
    },

    highlightElements: function (elems, resultCallback, msg) {
        var borders = [];
        elems.forEach(function (elem) {
            var border = new this.ElementBorder(elem);
            border.show();
            borders.push(border);
        }, this);

        Util.setTimeout(function () {
            borders.forEach(function (border) {
                border.remove();
            });
            resultCallback(msg);
        }, 3000);
    },

    overrideJSDialogs: function () {
        var wasAccepted = {
            alert: function () { return true; },
            prompt: function (result) { return result !== null; },
            confirm: function (result) { return result; }
        };

        Object.keys(wasAccepted).forEach(function (name) {
            var orig = window[name];
            window[name] = function (msg, optional) {
                var result = orig.call(this, msg, optional); // 'this' is probably the window but allow it to vary

                var data = {
                    type: name,
                    accepted: wasAccepted[name](result)
                };

                if (typeof (result) === 'string' && result)
                    data.text = result; // add non-empty strings

                window.dispatchEvent(new CustomEvent('DialogHandled', { detail: data }));
                return result;
            };
            window[name].toString = function () { return orig.toString(); }; // mask the overriding for cosmetic reasons
        });
    },

    runOnDocSync: function (func, args, logger) {
        args = args || [];
        logger = logger || ContentUtils.getEmptyLogger();

        if (BrowserServices.isRunningInPageContext) {
            logger.trace("runOnDocSync: already in page context");
            return func.apply(null, args);
        }

        var script = '(' + func.toString() + ')(' + args.map(JSON.stringify).join(',') + ')';

        logger.trace("runOnDocSync: Started: " + script);

        var ev = document.createEvent('Events');
        ev.initEvent('_QTP_Run_Script_With_Attr', true, false);
        window.document.documentElement.setAttribute("_QTP_Script", script);

        //set the result variable on the window (will be remove at the end of the script)
        window.document.documentElement.setAttribute("_QTP_Result", JSON.stringify({ res: null, ex: null }));
        window.dispatchEvent(ev);
        var res = JSON.parse(window.document.documentElement.getAttribute("_QTP_Result"));

        //removing the result from the window object.
        window.document.documentElement.removeAttribute("_QTP_Result");
        window.document.documentElement.removeAttribute("_QTP_Script");

        if (res.ex)
            logger.error("runOnDocSync: got exception: " + res.ex);

        return res.res;
    },

    isTouchEnabled: (function initializeIsTouchEnabled() {
        // The following code runs once (at creation) to detect touches
        var sawTouchEvents = false; // Captured by detectTouchEvents and by isTouchEnabled
        window.addEventListener('touchstart', function detectTouchEvents(e) {
            sawTouchEvents = true;
            window.removeEventListener('touchstart', detectTouchEvents, true); // no need to see any more events
        }, true);

        /*chrome version 50.0+, out extension have a bug:
           chrome.debugger.sendCommand({ tabId: tabId }, "Page.setTouchEmulationEnabled", { enabled: true });

           chrome report an error:
           Unchecked runtime.lastError while running debugger.sendCommand: {"code":-32601,"message":"'Page.setTouchEmulationEnabled' wasn't found"}
Page.setTouchEmulationEnabled
           so chrome just appears like emulator, but still trigger mouseover event, so we treat this case as  touch disabled.*/
        var sawMouseOver = false;
        window.addEventListener('mouseover', function detectMouseOver() {
            sawMouseOver = true;
            window.removeEventListener('mouseover', detectMouseOver, true);
        }, true);

        //For replaying, if no touch events observed, then use touch listener to judge
        var hasTouchListener = "ontouchstart" in document && "ontouchcancel" in window;

        // This is the function that will be used as ContentUtils.isTouchEnabled
        return function () {
            return content.settings.isTouchEnabled && !sawMouseOver // From global variables (setting emulation mode or Mobile)
                || sawTouchEvents  // Actually saw touch events
                || hasTouchListener; //
        };
    })(),

    isWebRoleBasedKitEnabled: function () {
        return content.settings.enablewebrolebasedkit || BrowserServices.isWebRoleBasedKitEnabled;
    },

    getDisabledWebKits:function(){
        var str = content.settings.disablewebkits;
        return str ? str.split(";") : [];
    },

    /* getTargetElem() method returns the interesting target element from the given element. For example, if the parameter passed to the function
     *                 is a label element, it returns the element it points to.
     * @param {HTMLElement} elem - The element
     * @returns {HTMLElement} the interesting target element
     */
    getTargetElem: function (elem) {
        if (elem.tagName === 'LABEL' && elem.control)
            return elem.control;

        return elem;
    },

    /**
    * Control.lables with a fallback for browsers that don't support this functionality
    * @param {element} control - the element to examine
    * @returns {Object} - the group of all labels that point to the control
    **/
    getLabelsFromControl: function (control) {
        // First time this is run we replace the function with the one that's relevant for this browser
        var input = document.createElement('input');
        if (input.labels) {// has native support
            ContentUtils.getLabelsFromControl = function (elem) { return elem.labels; };
        }
        else {
            // see https://html.spec.whatwg.org/multipage/forms.html#category-label
            var labelable = Util.objectFromArray(["BUTTON", "INPUT", "KEYGEN", "METER", "OUTPUT", "PROGRESS", "SELECT", "TEXTAREA"], true);

            ContentUtils.getLabelsFromControl = function (elem) {
                if (!labelable[elem.tagName])
                    return []; // No need to check

                var labels;
                if (elem.id) {
                    var allLabels = [];
                    var shadowRoot = ShadowDomUtil.getParentShadowRoot(elem);
                    if (!!shadowRoot)
                        allLabels = Util.makeArray(shadowRoot.querySelectorAll('label'))
                    else
                        allLabels = Util.makeArray(document.querySelectorAll('label'));

                    if (allLabels) // filter and not as part of the query so it works with elem.id === 44
                        labels = allLabels.filter(function (e) { return e.htmlFor === elem.id; });
                }

                if (elem.parentElement && elem.parentElement.tagName === 'LABEL') {
                    // add container if it's not already included
                    if (!labels || labels.length == 0)
                        labels = [elem.parentElement];
                    else {
                        if (labels.indexOf(elem.parentElement) === -1)
                            labels = labels.concat(elem.parentElement); // the order may be different than in supporting browsers
                    }
                }

                return labels || [];
            };
        }

        // now that the correct function is in place, call it
        return ContentUtils.getLabelsFromControl(control);
    },

    getAccNameFromControl: function (control) {
        var id = control.getAttribute('aria-labelledby');
        if (id) //  aria-labelledby can be space terminated, take the first one which should be most specific (https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Techniques/Using_the_aria-labelledby_attribute)
            id = id.split(' ')[0];
        var elemById;
        if (!!id) {
            var shadowRoot = ShadowDomUtil.getParentShadowRoot(control);
            if (!!shadowRoot)
                elemById = shadowRoot.getElementById(id);
            else
                elemById = document.getElementById(id);
        }

        var text = elemById && Util.cleanSpecialChars(elemById.textContent);
        if (text)
            return text;

        text = Util.cleanSpecialChars(control.getAttribute('aria-label'));
        if (text)
            return text;

        return "";
    },

    _noFormSubmitFireEvent: function(target) {
        var needRemoveId = false;
        if(!target.id)
        {
            needRemoveId = true;
            target.id = "UFT_NO_FORM_SUBMIT_FIREEVENT_ID";
        }

        var scriptContent = "var submitEvent;\
                             var submitTarget = document.getElementById(\"";
        scriptContent += target.id;
        scriptContent += "\");\
                          var data = {key: String.fromCharCode(13)};\
                          ContentUtils.fireEvent(submitTarget, \"keydown\", data, _logger);";

        content.domSubscriber.startNamespace();
        content.domSubscriber.addScript(scriptContent);
        content.domSubscriber.endNamespace();

        if(needRemoveId)
        {
            target.removeAttribute('id');
            needRemoveId = false;
        }
    },

    fireEvent: function (target, event, data, logger, relatedTarget) {
        logger = logger || ContentUtils.getEmptyLogger();
        logger.trace("fireEvent: fire event ", event, " with data ", data);

        switch (event) {
            case "focus":
                target.focus();
                break;
            case "blur":
                target.blur();
                break;
            case "submit":
                if (!target.form && "FORM" !== target.tagName) {
                    logger.trace("Simulate an \"Enter\" key when there is no form parent");
                    this._noFormSubmitFireEvent(target);
                    return;
                }
                var submitTarget = target;
                if ("FORM" !== target.tagName)
                    submitTarget = target.form;
                var submitEvent = this._createEvent(event, submitTarget, data, logger, relatedTarget);
                var result = submitTarget.dispatchEvent(submitEvent);
                if (result)
                    submitTarget.submit();

                return;
            case "click":
                if (!content.settings.replayonlyclick) {
                    if (ContentUtils.isTouchEnabled()) {
                        var point = this.pointRelativeToElem(target, this._positionFromData(data));
                        var sim = new SimulateGesture();
                        var startCancelled = !sim.addTouch(target, point);
                        var endCancelled = !sim.removeTouches();
                        if (startCancelled || endCancelled) {
                            logger.debug("fireEvent: touch event was cancelled. returning.");
                            return;
                        }
                    }
                    this.fireEvent(target, "focus", data);
                    this.fireEvent(target, "mousedown", data);
                    this.fireEvent(target, "mouseup", data);
                }
                // we don't return here, so after firing the above events,
                // "click" event will continue to be handled by statments below
        }

        var evt = this._createEvent(event, target, data, logger, relatedTarget);
        if (evt) {
            logger.trace("fireEvent: dispatch event " + evt.type + " on element " + target);
            target.dispatchEvent(evt);
        }
        else
            logger.warn("fireEvent: no event was created for " + event);
    },

    _createEvent: function (event, target, data, logger, relatedTarget) {
        var type = this._getEventType(event);
        if (!type) {
            logger.error("_createEvent: unknown event " + event);
            return null;
        }
        var evt = document.createEvent(type);
        switch (type) {
            case "HTMLEvents":
            case "MutationEvents":
            case "UIEvents":
                evt.initEvent(event, true, true);
                return evt;
            case "MouseEvents":
                var button = this._getButton(data["event button"]);
                var point = ContentUtils.pointRelativeToElem(target, this._positionFromData(data));
                relatedTarget = relatedTarget ? relatedTarget : document.body; // some events require a related-target (e.g. when moving between elements), give the body
                evt.initMouseEvent(event, true, true, null, null, null, null, point.x, point.y, false, false, false, false, button, relatedTarget);
                return evt;
            case "KeyboardEvent":
                var key = data.key;
                if (key && typeof evt.initKeyboardEvent === "function") {
                    var keyCode = key.charCodeAt(0);

                    // Different arguments list needed for different browsers
                    if (evt.locale === "") {
                        //Microsoft IE and Edge need "locale"
                        evt.initKeyboardEvent(event, true, true, document.defaultView, key, 0, data.modifiers || "", data.repeat || 0, /*locale=*/"");
                    }
                    else { //Others follow W3C
                        evt.initKeyboardEvent(event, true, true, document.defaultView, key, key, 0, data.modifiers || "", data.repeat || 0);
                    }

                    //only IOS 7.1 will throw an error for Object.defineProperty of "keyCode" and "which"
                    //exception is 'TypeError: Attempting to change value of a readonly property
                    //in this case "keyCode" and "which" will be zero
                    try {
                        delete evt.keyCode;
                        Object.defineProperty(evt, "keyCode", { value: keyCode, writable: true, enumerable: true, configurable: true });
                        delete evt.which;
                        Object.defineProperty(evt, "which", { value: keyCode, writable: true, enumerable: true, configurable: true });
                    }
                    catch (e) {
                        logger.warn("_createEvent: define 'keyCode' and 'which' property in keyboardEvent fails exception = " + e);
                    }
                }
                else
                {
                    evt = document.createEvent("Events");
                    evt.initEvent(event, true, true);
                    evt.which = keyCode;
                    evt.keyCode = keyCode;
                }
                return evt;
        }
        return null;
    },

    _positionFromData: function (data) {
        if (data.pos)
            return data.pos;

        var pt = { x: Constants.noCoordinate, y: Constants.noCoordinate };
        if ('x' in data)
            pt.x = data.x;
        if ('y' in data)
            pt.y = data.y;
        return pt;
    },

    pointRelativeToElem: function (elem, pos) {
        var rect = elem.getBoundingClientRect();
        // pos is relative to _elem (or center if not specified)
        var x = (pos.x !== Constants.noCoordinate) ? pos.x : rect.width / 2;
        var y = (pos.y !== Constants.noCoordinate) ? pos.y : rect.height / 2;

        return {
            x: rect.left + x,
            y: rect.top + y
        };
    },

    _getButton: function (uftValue) {
        // convert back from quirksmode button to W3C
        switch (uftValue) {
            case 2:
                return 1; //W3C middle button
            case 1:
                return 2; //W3C right button
        }
        return 0; //W3C Left Button
    },

    _getEventType: function (eventName) {
        switch (eventName) {
            case "domfocusin":
            case "domfocusout":
            case "domactivate":
                return "UIEvents";
            case "click":
            case "dblclick":
            case "mouseenter":
            case "mouseleave":
            case "mousedown":
            case "mouseup":
            case "mouseover":
            case "mousemove":
            case "mouseout":
            case "contextmenu":
            case "pointerover":
            case "pointerout":
                return "MouseEvents";
            case "domsubtreemodified":
            case "domnodeinserted":
            case "domnoderemoved":
            case "domnoderemovedfromdocument":
            case "domnodeinsertedintodocument":
            case "domattrmodified":
            case "domcharacterdatamodified":
                return "MutationEvents";
            case "load":
            case "unload":
            case "abort":
            case "error":
            case "select":
            case "change":
            case "submit":
            case "reset":
            case "focus":
            case "blur":
            case "resize":
            case "scroll":
            case "input":
                return "HTMLEvents";
            case "keydown":
            case "keypress":
            case "keyup":
                return "KeyboardEvent";
        }
    },

    /**
    * Evaluate expression in document
    * @param {string|function} exp - if string, evaluates it in document. if function - stringifies it and evaluates.
    * @returns {undefined}
    */
    evalInDocument: function (exp, doc) {
        doc = doc || document;
        var scriptText = typeof (exp) === 'function' ? Util.functionStringify(exp) : exp;

        var node = doc.getElementsByTagName("head")[0] || doc.documentElement;
        var script = doc.createElement("script");
        script.type = "text/javascript";
        script.setAttribute('nonce', 'UftNonceMagicAllowInlineScript');

        script.appendChild(doc.createTextNode(scriptText));
        node.appendChild(script, node.firstChild);
        node.removeChild(script);
    },

    protectCallbackAgainstPrematureNavigation: function (callback, msg, logger, name) {
        var wasCalled = false;

        function callbackProtector() {
            if (logger)
                logger.warn('protectCallbackAgainstPrematureNavigation: Before unload or unload recieved with uncalled callback: ', name);

            if (!wasCalled) {
                wasCalled = true;
                callback(msg);
            }
        }

        window.addEventListener('beforeunload', callbackProtector, true);
        window.addEventListener('unload', callbackProtector, true);

        return function (message) {
            if (!wasCalled) {
                window.removeEventListener('beforeunload', callbackProtector, true);
                window.removeEventListener('unload', callbackProtector, true);
                callback(message);
            }
            else if (logger)
                logger.error('protectCallbackAgainstPrematureNavigation: callback was called after page unload: ' + name);
        };
    },

    createCrossOriginCustomEvent: function (eventType, eventDetail) {

        // Check if this browser has a specific implementation and use it if so
        if (BrowserServices.createCrossOriginCustomEvent)
            return BrowserServices.createCrossOriginCustomEvent(eventType, eventDetail);

        var event;
        // use default implementation
        if (CustomEvent)
            event = new CustomEvent(eventType, eventDetail);

        else {
            //for old support.
            event = document.createEvent('CustomEvent');

            if (!eventDetail)
                eventDetail = {};

            var bubbles = eventDetail.bubbles || false;
            var cancelable = eventDetail.cancelable || false;
            event.initCustomEvent(eventType, bubbles, cancelable, eventDetail.detail);
        }

        return event;
    },

    /**
	 * Remove script tags with content, then get visible textContent
	 * @param {node} elem - column node of a table
	 */
    getVisibleTextContent: function (elem) {
        // clone the element
        var dupElem = elem.cloneNode(true);

        // get all script tags, then remove them.
        var scripts = Util.makeArray(dupElem.getElementsByTagName('script'));
        scripts.forEach(function (script) {
            script.parentElement.removeChild(script);
        });

        // clean text
        var visibleText = Util.cleanTextProperty(dupElem.textContent);
        return visibleText.trim();
    },

    getMobileWindowRect: function (platform) {
        var screenWidth;
        var screenHeight;
        switch (platform) {
            case "ios":
                screenWidth = screen.availWidth;
                screenHeight = screen.availHeight - 44 /*Height of address bar*/;
                break;
            case "android":
            case "wp":
                screenWidth = window.innerWidth;
                screenHeight = window.innerHeight;
                break;
            default:
                return null;
        }

        return {
            top: window.screenY,
            left: window.screenX,
            right: (window.screenX + screenWidth),
            bottom: (window.screenY + screenHeight)
        };
    },

    getEventAdapter: function (ev) {
        var cloneObj = {};
        for (var key in ev) {
            cloneObj[key] = ev[key];
        }
        cloneObj.__proto__ = ev.__proto__;
        return cloneObj;
    },

    findIframeConsiderXPath:function(root, selector, logger){
        var arr = this.querySelectorAll(root, selector, logger);
        root = root || document;
        var iter = root.evaluate("//iframe | //frame", root, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        //use array return from xpath first
        var ret = [];
        for(var i=0; i<iter.snapshotLength; ++i){
            var cur = iter.snapshotItem(i);
            ret.push(cur);
        }
        for(var i=0; i<arr.length; ++i){
            if(ret.indexOf(arr[i])<0)
                ret.push(arr[i]);
        }
        return ret;
    },
    querySelectorAll: function (root, selector, logger) {
        logger = logger || ContentUtils.getEmptyLogger();
        root = root || document;
        targetElements = [];

        targetElements = Util.makeArray(root.querySelectorAll(selector));
        var shadowRoots = ShadowDomUtil.findAllShadowRoots(root, logger);
        targetElements = Util.arrayReduce(shadowRoots, function (targetAOs, childElem) {
            return targetAOs.concat(Util.makeArray(childElem.querySelectorAll(selector)));
        }.bind(this), targetElements);
        return targetElements;
    },

    getElementById: function (root, Id, logger) {
        logger = logger || ContentUtils.getEmptyLogger();
        root = root || document;
        var element = root.getElementById(Id);

        if (!element) {
            var shadowRoots = ShadowDomUtil.findAllShadowRoots(root, logger);
            shadowRoots.some(function (childElem) {
                var targetElem = childElem.getElementById(Id);
                if (!!targetElem) {
                    element = targetElem;
                    return true;
                }
            });

            if (!element) {
                logger.error("getElementById: can not find element with id ", Id);
                return null;
            }
            return element;
        }
        return element;
    },

    getElementsByName: function (root, name, logger) {
        logger = logger || ContentUtils.getEmptyLogger();
        root = root || document;

        name = Util.formatString("[name = '{0}']", name);
        return this.querySelectorAll(root, name, logger);
    }
};

ContentUtils.ElementBorder.prototype = {
    overlay: null,
    elem: null,
    show: function () {
        this.overlay.style.display = 'block';
    },
    hide: function () {
        this.overlay.style.display = 'none';
    },
    // Returns whether the wrapped element was changed
    wrap: function (elem) {
        if (this.elem === elem)
            return false;

        this.elem = elem;
        var border = 4;
        function pixels(n) { return n + 'px'; }

        var rect;
        if (elem.tagName.toLowerCase() === "html") { // Highlight on Browser or Page
            rect = {
                top: 0,
                left: 0,
                width: document.body.clientWidth,
                height: document.body.clientHeight
            };
        } else if (elem.tagName.toLowerCase() === "area") {
            var ao = content.kitsManager.createAO(elem, 0 /*fake parent id*/);
            rect = ao.GetAttrSync("rect");
            rect.width = rect.right - rect.left;
            rect.height = rect.bottom - rect.top;
        } else {
            if (elem.tagName.toLowerCase() === "option") {
                elem = elem.parentElement;
            }

            rect = elem.getBoundingClientRect();

            // In Safari for <OPTION> & <AREA> elements return an empty rectangle.
            // In this case we draw the rectangle around their parents
            // Note that height & width == 0 is also wrong
            if (!(rect.width || rect.height))
                rect = elem.parentElement.getBoundingClientRect();
        }

        var top, left,
        width = rect.width - (border * 2),
        height = rect.height - (border * 2);
        if (elem === window.frameElement) {
            top = 0, left = 0;
            var borderWidth = parseInt(getComputedStyle(elem).borderWidth.match(/(\d+)px/)[1], 10);
            if (typeof borderWidth === 'number') {
                width -= borderWidth * 2,
                height -= borderWidth * 2;
            }
        }
        else {
            top = rect.top;
            left = rect.left;
        }

        width = (width > 0) ? width : 1;
        height = (height > 0) ? height : 1;

        Util.extend(this.overlay.style, {

            top: pixels(top),
            left: pixels(left),
            // Width and height should not make the object bigger (which would add scroll bars for page)
            width: pixels(width),
            height: pixels(height)
        });
        // Setting the border resets the borderStyle
        this.overlay.style.borderStyle = 'solid';
        this.show();
        return true;
    },

    run: function (f) {
        return f(this.overlay);
    },
    remove: function () {
        if (this.overlay) {
            document.body.removeChild(this.overlay);
            this.elem = null;
            this.overlay = null;
        }
    }
}; // of ContentUtils.ElementBorder.prototype
