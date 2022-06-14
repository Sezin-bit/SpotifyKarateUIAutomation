var FrameInHTMLContext = {
    _id: {},
    _logger: null,
    _currentGlobalErrorHandler: null,
    _callbacks: {},
    _nextCallbackID: -1,

    setLogger: function (logger) {
        this._logger = logger;
    },

    onMessageFromContent: function (msgEventObj) {
        var requestMsg = msgEventObj.data;
        if (typeof (requestMsg) !== "object")
            return;

        //this message is from an unknown source then we need to ignore it without any logging
        if (requestMsg.source !== "Frame" && requestMsg.source !== "FrameInHTMLContext")
            return;

        switch (requestMsg.msgType) {
            case "request":
                this.handleRequest(msgEventObj.source, requestMsg);
                break;
            case "response":
                this.handleResponse(requestMsg);
                break;
        }
    },
    RunOnDocEventHandler: function (msgEvent) {
        var msg = msgEvent.detail;

        try {
            var result = this._embedRunScriptHelper(msg._data.script);

            //in case this is an object then lets ask the DotObjectMAnager to add it to the managed objects
            if (Util.isFunction(result) ||
                Util.isLegacyObject(result) ||
                (result && (Util.isObject(result) || Array.isArray(result)))) {
                this._logger.debug("FrameInHTMLContext.RunOnDocEventHandler: The result is object lets notify the .Object manager");
                var request = SpecialObject.CreateReferenceRequest(result);
                this.sendRequestToDotObjectManager(request, function (dotObjToken) {
                    this._logger.trace("FrameInHTMLContext.RunOnDocEventHandler: Going to send back the following result:" + Util.jsonStringify(dotObjToken, this._logger));
                    msg._data.result = dotObjToken;
                    var ev = new CustomEvent("_QTP_RUN_SCRIPT_RESULT", { "detail": msg });
                    //ev = document.createEvent("CustomEvent");
                    //ev.initCustomEvent("_QTP_RUN_SCRIPT_RESULT", false, false, msg);
                    window.dispatchEvent(ev);
                }.bind(this));
                return; //wait for async to return.
            }
            msg._data.result = result;
        } catch (e) {
            msg._data.ex = e;
        }

        this._logger.trace("FrameInHTMLContext.RunOnDocEventHandler: Going to send back the following result:" + Util.jsonStringify(msg._data.result, this._logger));
        var ev = new CustomEvent("_QTP_RUN_SCRIPT_RESULT", { "detail": msg });
        //var ev = document.createEvent("CustomEvent");
        //ev.initCustomEvent("_QTP_RUN_SCRIPT_RESULT", false, false, msg);
        window.dispatchEvent(ev);
    },

    /*
        The event handler for event "_QTP_Run_Script_With_Attr", the script will be taken from _QTP_Script attribute of document element,
        and return information will be found on _QTP_Result attribute of document element.
    */
    RunOnDocWithAttrEventHandler: function () {
        var result = {};
        try {
            var script = window.document.documentElement.getAttribute("_QTP_Script");
            result.res = this._embedRunScriptHelper(script);
        }
        catch (e) {
            result.ex = "[Exception message]:" + e.message + "\n" + e.stack;
        }
        window.document.documentElement.setAttribute("_QTP_Result", JSON.stringify(result));
    },

    /*
        Assigning window._uft_run_script_helper an anoymous function wrapping the script to run.
        and call it, and return the value, and then delete the _uft_run_script_helper.
    */
    _embedRunScriptHelper: function (script) {
        var wrappedScript = Util.functionStringify(theUftRunScriptHelper);
        wrappedScript = Util.safeReplace(wrappedScript, "\"#TheScript#\"", script);
        ContentUtils.evalInDocument(wrappedScript);

        try {
            return window._uft_run_script_helper(Util, ContentUtils, ShadowDomUtil);
        } finally {
            delete window._uft_run_script_helper;
        }

        function theUftRunScriptHelper() {
            // Pass parameters here to capture the objects into closure.
            window._uft_run_script_helper = function (Util,ContentUtils, ShadowDomUtil) {
                var result = "#TheScript#";
                return result;
            };
        }
    },

    onMarkObjectResult: function (eventObj) {
        //this is not our response message.
        var dotObjMarkResult = eventObj.detail;
        this._logger.trace("FrameInHTMLContext.onMarkObjectResult: started for response info: " + Util.jsonStringify(dotObjMarkResult, this._logger));
        if (Util.isUndefined(dotObjMarkResult.dotUtilObjAsyncID))
            return;
        if (!this._callbacks[dotObjMarkResult.dotUtilObjAsyncID]) {
            this._logger.error("FrameInHTMLContext.onMarkObjectResult:: There is a callback id (" + dotObjMarkResult.dotUtilObjAsyncID + ") that has no callback");
            return;
        }

        var handlerID = dotObjMarkResult.dotUtilObjAsyncID;
        delete dotObjMarkResult.dotUtilObjAsyncID;
        try {
            delete dotObjMarkResult.resultEventName;
            this._callbacks[handlerID].handler(dotObjMarkResult);
        }
        catch (e) {
            this._logger.error("FrameInHTMLContext.onMarkObjectResult: Exception occurred when calling the callback." + e);
        }
        finally {
            delete this._callbacks[handlerID];
        }
    },
    handleRequest: function (source, requestMsg) {
        this._logger.debug("FrameInHTMLContext.handleRequest: started for request message: ", requestMsg);
        var msg = requestMsg.data;

        if (!msg._msgType)
            return;

        //checks if we should handle this message.
        if (!this[msg._msgType])
            return;

        this._setGlobalErrorHandler(requestMsg, source);

        try {
            this[msg._msgType](msg, function (resMsg) {
                this._logger.trace("FrameInHTMLContext.handleRequest: the result is:\n", resMsg);
                requestMsg.msgType = "response";
                requestMsg.source = "FrameInHTMLContext";
                requestMsg.data = resMsg;
                this._logger.trace("FrameInHTMLContext.handleRequest: Going to send the following result:\n", requestMsg);
                source.postMessage(requestMsg, "*");
            }.bind(this));
        }
        catch (e) {
            this._logger.error("FrameInHTMLContext.handleRequest: Error occurred:\n" + e);
            this._currentGlobalErrorHandler(e);
        }
        finally {
            this._resetGlobalErrorHandler();
        }
    },
    handleResponse: function (responsetMsg) {
        //this is not our response message.
        if (Util.isUndefined(responsetMsg.frameInHTHMLCallbackID))
            return;

        this._logger.prettyTrace("FrameInHTMLContext.handleResponse: started for response message: ", responsetMsg);

        if (!this._callbacks[responsetMsg.frameInHTHMLCallbackID]) {
            this._logger.error("FrameInHTMLContext.handleResponse: There is a callback id (" + responsetMsg.frameInHTHMLCallbackID + ") that has no callback");
            return;
        }

        // We need to set the global error handler here for a case when the handler will call to sendMessage so
        // we would like to use the original global handler again 
        this._currentGlobalErrorHandler = this._callbacks[responsetMsg.frameInHTHMLCallbackID].globalErrorHandler;

        try {
            this._callbacks[responsetMsg.frameInHTHMLCallbackID].handler(responsetMsg.data);
        }
        catch (e) {
            this._logger.error("FrameInHTMLContext.handleResponse: Exception occurred when calling the callback. Call global error handler. Exception:" + e);
            if (this._currentGlobalErrorHandler)
                this._currentGlobalErrorHandler(e);
            else
                this._logger.warn("FrameInHTMLContext.handleResponse: global error handler not set");
        }
        finally {
            this._resetGlobalErrorHandler();
            delete this._callbacks[responsetMsg.frameInHTHMLCallbackID];
        }
    },
    sendMessage: function (targetWin, msg, callback) {
        this._logger.trace("FrameInHTMLContext.sendMessage: started");

        var request = {
            frameInHTHMLCallbackID: ++this._nextCallbackID,
            msgType: "request",
            source: "FrameInHTMLContext",
            data: msg
        };

        this._callbacks[request.frameInHTHMLCallbackID] = { handler: callback, globalErrorHandler: this._currentGlobalErrorHandler };

        targetWin.postMessage(request, "*");
    },

    sendRequestToDotObjectManager: function (dataToSend, resCallback) {
        this._logger.trace("FrameInHTMLContext.sendRequestToDotObjectManager: Started");
        dataToSend.dotUtilObjAsyncID = ++this._nextCallbackID;
        dataToSend.resultEventName = "UFT_DOT_OBJ_MARK_FOR_RUNSCRIPT_RESULT";
        this._callbacks[dataToSend.dotUtilObjAsyncID] = { handler: resCallback, globalErrorHandler: null };
        var dotObjManagerMarkRequestEvent = new CustomEvent("UFT_DOT_OBJ_ADD_TO_MANAGED_OBJ", { detail: dataToSend });
        //var dotObjManagerMarkRequestEvent = document.createEvent("CustomEvent");
        //dotObjManagerMarkRequestEvent.initCustomEvent("UFT_DOT_OBJ_ADD_TO_MANAGED_OBJ", false, false, dataToSend);
        window.dispatchEvent(dotObjManagerMarkRequestEvent);
    },

    buildLayoutTree: function (msg, callback, win) {
        this._logger.debug("FrameInHTMLContext.buildLayoutTree: started for frame with id:" + Util.jsonStringify(this._id, this._logger));
        var comID = null;   //in case of recursion the window parameter was supplied and comID should be null.
        if (Util.isUndefined(win)) {// first recursion add my COM ID (otherwise we're recursing into uninjectable frames)
            win = window;
            comID = this._id;
        }

        var node = { id: comID, children: [] };
        var excludRtidsArr = msg._data.exclude ? msg._data.exclude : [];
        var includeVisibleFramesOnly = !!msg._data.visibleFramesOnly
    
        var rootElem = win.document;
        var frameElemList = ContentUtils.findIframeConsiderXPath(rootElem, 'IFRAME,FRAME');

        frameElemList = frameElemList.filter(function (frame) {
            return msg._data.isFrameSupportXSS || Util.isFrameXSS(frame, win);
        });
        var framesToProcess = frameElemList.length;

        //stop condition of the recursive calls
        if (framesToProcess === 0) {
            this._logger.trace("FrameInHTMLContext.buildLayoutTree: There are no frames to process returning the a single node");
            msg._data = node;
            callback(msg);
            return;
        }

        var logger = this._logger;

        frameElemList.forEach(function (frameElem, i) {
            function checkIfGotAllResponses() {
                --framesToProcess;
                if (framesToProcess > 0)
                    return;

                logger.debug("FrameInHTMLContext.buildLayoutTree: Finished processing the frames calling our callback");
                msg._data = node;
                callback(msg);

                if (window && window._hpmcBridge) {
                    window._hpmcBridge.readyState = true;
                }
            }

            function isFrameExcluded(excludedRtIdsArr, currentComId, previousComId) {
                return excludedRtIdsArr.some(function (rtid2Exclude) {
                    return RtIdUtils.IsRTIDEqual(currentComId, rtid2Exclude) || RtIdUtils.IsRTIDEqual(previousComId, rtid2Exclude);
                });
            }

            var request = {
                _msgType: msg._msgType,
                _data: msg._data
            };

            logger.debug("FrameInHTMLContext.buildLayoutTree: Procesing frame " + (i + 1) + " out of " + frameElemList.length);

            if (frameElem.__QTP__OBJ && frameElem.__QTP__OBJ.comID) {
                if (isFrameExcluded(excludRtidsArr, frameElem.__QTP__OBJ.comID, frameElem.__QTP__OBJ.previousComID)) {
                    logger.trace("FrameInHTMLContext.buildLayoutTree: adding current frame to tree but excluding subtree, frame id: ",
                        Util.jsonStringify(frameElem.__QTP__OBJ.comID, logger), 
                        " - previous frame id: ", Util.jsonStringify(frameElem.__QTP__OBJ.previousComID, logger));
                    node.children[i] = { id: frameElem.__QTP__OBJ.comID, previousId: frameElem.__QTP__OBJ.previousComID, children: [], isExcluded: true };
                    checkIfGotAllResponses();
                    return;
                }

                // Do not add invisible frame to the layout tree if we have the flag for including visible frames only.
                if (includeVisibleFramesOnly && 'none' === window.getComputedStyle(frameElem, null).getPropertyValue('display')) {
                    logger.trace("FrameInHTMLContext.buildLayoutTree: do nothing to invisible frame, frame id: ", 
                       Util.jsonStringify(frameElem.__QTP__OBJ.comID, logger));
                    checkIfGotAllResponses();
                    return;
                }

                var gotResponse = false;
                var timeoutTriggered = false;

                logger.debug("FrameInHTMLContext.buildLayoutTree: Sending message to: " + Util.jsonStringify(frameElem.__QTP__OBJ.comID));
                this.sendMessage(frameElem.contentWindow, request, function (response) {
                    logger.trace("FrameInHTMLContext.buildLayoutTree: ");
                    gotResponse = true;
                    node.children[i] = response._data;
                    if (!timeoutTriggered) {
                        checkIfGotAllResponses();
                    }
                });

                // sendMessage got no response for some frames, callback anyway after 1 second, to avoid operation hang
                Util.setTimeout(function () {
                    if (!gotResponse) {
                        logger.warn("FrameInHTMLContext.buildLayoutTree: Send message to frame got no response, src=" + frameElem.src);
                        timeoutTriggered = true;
                        node.children[i] = { id: null, children: [] };
                        checkIfGotAllResponses();
                    }
                }, Util.getDynamicTimeoutValue());
            }
            else { // Uninjectable frame, need to handle it ourself
                logger.debug("FrameInHTMLContext.buildLayoutTree: Uninjectable frame, need to handle it ourself: " + frameElem.src);

                if (frameElem.__QTP__OBJ)
                    logger.warn("buildLayoutTree: Got known frame with no COM ID");

                try {
                    //empty frames has no content window, so simple ignore them
                    if (!frameElem.contentWindow) {
                        logger.debug("FrameInHTMLContext.buildLayoutTree: [DEBUG] - Got empty frame, ignoring this frame");
                        node.children[i] = { id: null, children: [] };
                        checkIfGotAllResponses();
                        return;
                    }

                    if (!frameElem.contentWindow.frameElement) {
                        logger.error("FrameInHTMLContext.buildLayoutTree: [ERROR] - XSS");
                        node.children[i] = { id: null, children: [] };
                        checkIfGotAllResponses();
                        return;
                    }
                }
                catch (e) {
                    logger.error("FrameInHTMLContext.buildLayoutTree: [ERROR] - XSS page that we're not injected to: " + frameElem.src);
                    node.children[i] = { id: null, children: [] };
                    checkIfGotAllResponses();
                    return;
                }

                this.buildLayoutTree(request, function (response) {
                    logger.trace("FrameInHTMLContext.buildLayoutTree: Got resoponse " + Util.jsonStringify(response, logger));
                    node.children[i] = response._data;
                    checkIfGotAllResponses();
                }, frameElem.contentWindow);
            }
        }, this);
    },
    FRAME_FROM_POINT: function (msg, callback) {
        var point = msg._data.point;
        this._logger.trace("FRAME_FRON_POINT: Started with point {" + point.x + ", " + point.y + "}");
        var e = null;
        if(msg._data.isUseMouseEventForSpyElement)
            e = window.__uft_mouseover_elem;
        else{
            e = document.elementFromPoint(point.x, point.y);

            if (ShadowDomUtil.isOpenShadowRoot(e)) {
                e = ShadowDomUtil.getElemInShadowRootByPoint(e, point, this._logger);
            }
        }
        if (e === null) {
            this._logger.error("element from point returned null for point {" + point.x + ", " + point.y + "}");
            msg.status = "ERROR";
            callback(msg);
            return;
        }

        this._logger.debug("FRAME_FROM_POINT: Got the following element from point:" + e);
        switch (e.tagName) {
            case "FRAME":
            case "IFRAME":
                //gets the comID of the element that we need to perform recursion to
                var childInfo = this._getChildFrameInfo(e, msg._data.point);
                this._logger.debug("FRAME_FROM_POINT: Child info for frame: comID->" + Util.jsonStringify(childInfo.comID, this._logger)
                    + ", point->" + Util.jsonStringify(childInfo.point, this._logger) + ", elem->" + childInfo.elem);
                //checks that we got a proper result
                if (childInfo.comID === null) {
                    this._logger.debug("FRAME_FROM_POINT: comID is NULL - return");
                    callback(msg);
                    return;
                }

                msg._to = Util.shallowObjectClone(childInfo.comID);
                //correct the point value to be inside the frame
                msg._data.point = childInfo.point;
                this.sendMessage(e.contentWindow, msg, callback);
                return;
            default:
                msg._data.WEB_PN_ID = this._id;
                callback(msg);
                return;
        }
    },
    _getChildFrameInfo: function (f, point) {
        var res = { comID: null, point: point };

        Util.assert(f, "FRAME_FROM_POINT: Abnormal termination of recursion", this._logger);
        if (!f) {
            return res;
        }

        var frameClientRect = f.getBoundingClientRect();
        var style = getComputedStyle(f);
        res.point.y -= (frameClientRect.top + parseInt(style.paddingTop, 10));
        res.point.x -= (frameClientRect.left + parseInt(style.paddingLeft, 10));

        if (f.__QTP__OBJ) {
            res.comID = f.__QTP__OBJ.comID;
            return res;
        }

        //this is inner frame which is not injectable then go into the inner frame
        var innerFrameElem = f.contentWindow.document.elementFromPoint(res.point.x, res.point.y);
        if (!innerFrameElem || (innerFrameElem.tagName !== "IFRAME" && innerFrameElem.tagName !== "FRAME")) {
            this._logger.error("FRAME_FROM_POINT: The lowest frame is not injectable");
            return res;
        }
        return this._getChildFrameInfo(innerFrameElem, res.point);
    },

    _resetGlobalErrorHandler: function () {
        this._currentGlobalErrorHandler = null;
    },

    _setGlobalErrorHandler: function (requestMsg, src) {
        this._currentGlobalErrorHandler = function (origMsg, error) {
            origMsg.status = "ERROR";
            origMsg.details = error ? error.message : null;
            requestMsg.data = origMsg;
            requestMsg.msgType = "response";
            requestMsg.source = "FrameInHTMLContext";
            src.postMessage(requestMsg, "*");
        }.bind(this, requestMsg.data);
    }
};