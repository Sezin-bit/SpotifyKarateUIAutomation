/**
 * Represents the Recorder
 * @constructor
 * @param {Object} frame - The frame object this recorder belongs to
 */
function Recorder(frame) {
    this._logger = new LoggerUtil('Content.Recorder');
    this._logger.info('Recorder was created');

    this.frame = frame;

    // Initialize Touch Event Support
    var gestureDetector = new GestureDetector();
    gestureDetector.addListener(this._recordGesture.bind(this));

    // Initialize Event Handling Support
    this.recordingEvents = ['click', 'input', 'change', 'focus', 'blur', 'keydown', 'keyup', 'submit', 'mouseup', 'mouseover', 'mouseout', 'dragstart', 'drop', 'dragend', 'contextmenu', 'play', 'pause', 'ended',
        /* Web Ext Events*/ 'mousedown', 'dblclick', 'keypress', 'textInput', 'select', 'reset'];

    var handler = this._handlerFunc.bind(this);

    if (this.frame.isPage) {
        AddEventListners.apply(this);
    } else {
        // postpone addEventListeners when is iframe, to wait for iframe loaded
        Util.setTimeout(AddEventListners.bind(this));
    }

    function AddEventListners() {
        this.recordingEvents.forEach(function (e) {
            window.addEventListener(e, handler, true);
        });

        //mouseenter can't be send out when use window.addEventListener.
        this.recordingEventsOnDocument = ['mouseenter'];
        this.recordingEventsOnDocument.forEach(function (e) {
            document.addEventListener(e, handler, true);
        });

        // we use 'beforeunload' since it's a cancellable event, non-cancellable events like 'unload' and 'pagehidden' are not fired
        // and 'hashchange' for websites which only cause a change of the hashtag without any unloading or navigation
        ['beforeunload', 'hashchange'].forEach(function (eventName) {
            window.addEventListener(eventName, this.sendBrowserRecordInfo.bind(this));
        }, this);
    }
}

Recorder.prototype = {
    _logger: null,
    frame: null,
    isRecording: null,
    recordingEvents: null,
    _stopPropagation: false,
    _waitForWebDriverMessagePullTimeout: 500,
    _handlerFunc: function (ev) {
        if (!this.isRecording)
            return;

        if(ev.AlreadyHandledByUFT) {
            this._logger.trace('_handlerFunc: got event already be handled. Event type: ' + ev.type);
            return;
        }

        if (!ev.target) {
            this._logger.warn('_handlerFunc: got event without target. Event type: ' + ev.type);
            return;
        }

        if (ev.target === window || ev.target === document) {
            this._logger.trace('_handlerFunc: got event on the Window object or Document Object. Ignoring. Event type: ' + ev.type);
            return;
        }

        //In shadow dom case, we need an adapter for event to retarget the event host
        var eventAdapter;
        if (ShadowDomUtil.isOpenShadowRoot(ev.target)) {
            eventAdapter = ContentUtils.getEventAdapter(ev);
            //eventAdapter.target = ev.composedPath()[0];
            eventAdapter.target = (ev.composedPath && ev.composedPath()[0]) || ev.target;
            this._addListenerToShadowRoots(eventAdapter.target, this._handlerFunc.bind(this));
        }

        eventAdapter = eventAdapter || ev;
        this._logger.trace('_handlerFunc: got event of type: ', ev.type, " for target: ", eventAdapter.target.tagName);
        this._updateAoInfo(eventAdapter.target ,eventAdapter.type);
        this._stopPropagation = false;

        this._aoInfo.aoArray.some(function (ao) {
            ao.ReceiveEvent(this, eventAdapter);
            return this._stopPropagation;
        }, this);
    },


    // some event can not bubble up from shadowRoot we need in addition
    _addListenerToShadowRoots: function (elem, handler) {

        var wrapperShadowRoot = ShadowDomUtil.getParentShadowRoot(elem, this._logger);
        if (!!wrapperShadowRoot && !wrapperShadowRoot.registerEventHandler) {
            // we listen the events we need to record, which can not buble up from shadowRoot
            ['change', 'play', 'pause', 'ended', 'submit'].forEach(function (eventName) {
                elem.addEventListener(eventName, handler, true);
            });
            //we set a flag here to mark that we' ve listened to this shadowRoot
            elem.registerShadowDomEventHandler = 1;
        }

    },

    _recordGesture: function (elem, info) {
        if (!this.isRecording)
            return;

        this._updateAoInfo(elem);

        this._stopPropagation = false;
        this._aoInfo.aoArray.some(function (ao) {
            ao.ReceiveGesture(this, info, elem);
            return this._stopPropagation;
        }, this);
    },

    _updateAoInfo: function (elem, eventName) {
        var previousAoInfo = this._aoInfo;

        if (previousAoInfo && previousAoInfo.element === elem)
            return;

        this._aoInfo = {
            aoArray: content.kitsManager.createRecordAOArray(elem, this.frame.id, eventName),
            element: elem
        };

        if (previousAoInfo) {
            previousAoInfo.aoArray.forEach(function (ao) {
                ao.ReceiveEventEnded(this);
            }, this);
        }

        this._aoInfo.aoArray.forEach(function (ao) {
            ao.ReceiveEventStarted(this);
        }, this);
    },

    _EVENT_CONFIG_ENUM: { // constant configuration
        TYPES: {
            // Enumeration of listening type 
            EVT_NEVER: 0,
            EVT_ANYCASE: 1,			// connect only if handle exists for this event
            EVT_HANDLER: 2,			// connect only if handle exists for this event
            EVT_BEHAVIOR: 4,			// connect if there is a behavior for the element
            EVT_BEHAVIOR_OR_HANDLER: 6,// connect if handle exists or their is a behavior for the element
            // Enumeration of recording type
            EVS_DELETE: 0,					// delete the event
            EVS_DISABLE: 1,					// disable the event
            EVS_ENABLE: 2,					// record event
            EVS_ON_NEXT_EVENT: 4,			// flag for next event recording
            EVS_ENABLE_ON_NEXT_EVENT: 6,	// record the event if another event will happen on the object
            // Enumeration of event record decisions
            ERD_IGNORE: 0,  // should ignore the event
            ERD_RECORD: 1,  // should record the event
            ERD_CONTINUE: 2 // can not determine
            // TODO: Enumeration of event level
            // ECL_NOTASSIGNED: -1, ECL_CURRENT: 0, ECL_CUSTOM: 1, ECL_DEFAULT: 2, ECL_MEDIUM: 3, ECL_HIGH: 4, ECL_FROMFILE: 5
        },

        // There are some events not controlled by config, should let them go.
        // Set the mask true bellow, if configuration not care.
        RESERVED_EVENTS: Util.objectFromArray(['ondragend', 'onkeyup', 'onselect', 'ontextInput'], true)
    },

    _eventConfig: { // Default event config at BASIC level, if fail to update from UFT, use this copy.
        "any web object": { "onclick": { "listen": 2, "record": 2 }, "oncontextmenu": { "listen": 2, "record": 2 }, "ondragstart": { "listen": 2, "record": 2 }, "ondrop": { "listen": 2, "record": 2 }, "onkeydown": { "listen": 1, "record": 2 }, "onmouseover": { "listen": 2, "record": 1 }, "onmouseup": { "listen": 2, "record": 1 } },
        "image": { "onclick": { "listen": 1, "record": 2 }, "onmouseover": { "listen": 2, "record": 6 } },
        "link": { "onclick": { "listen": 1, "record": 2 } },
        "webarea": { "onclick": { "listen": 1, "record": 2 }, "onmouseover": { "listen": 2, "record": 6 } },
        "webbutton": { "onclick": { "listen": 1, "record": 2 } }, "webcheckbox": { "onclick": { "listen": 1, "record": 2 } },
        "webedit": { "onblur": { "listen": 1, "record": 2 }, "onchange": { "listen": 1, "record": 2 }, "onfocus": { "listen": 1, "record": 2 }, "onpropertychange": { "listen": 0, "record": 2 }, "onsubmit": { "listen": 1, "record": 2 } },
        "webfile": { "onblur": { "listen": 1, "record": 2 }, "onfocus": { "listen": 1, "record": 2 } }, "weblist": { "onblur": { "listen": 1, "record": 2 }, "onchange": { "listen": 1, "record": 2 }, "onfocus": { "listen": 1, "record": 2 } },
        "webnumber": { "onblur": { "listen": 1, "record": 2 }, "onchange": { "listen": 1, "record": 2 }, "onfocus": { "listen": 1, "record": 2 } },
        "webradiogroup": { "onclick": { "listen": 1, "record": 2 } },
        "webtab": { "onclick": { "listen": 1, "record": 2 } },
        "webtree": { "onmousedown": { "listen": 1, "record": 2 }, "onclick": { "listen": 1, "record": 2 } },
        "webmenu": { "onclick": { "listen": 1, "record": 2 } },
        "webrange": { "onchange": { "listen": 1, "record": 2 } }
    },

    /*
    * Event Configuration Setter
    * @param {Object} config - The config object contains new config need to update.
    * @returns {Undefined}
    */
    updateEventConfig: function (config) {
        this._logger.trace('updateEventConfig() set event configuration with: ' + config);
        if (config) {
            this._eventConfig = config;
        }
    },

    /*
    * TagsToBreakInterestingAOLoop Configuration Setter
    * @param {String} tagsToBreakInterestingAOLoop - The string for tagsToBreakInterestingAOLoop. e.g. "UL;TABLE"
    * @returns {Undefined}
    */
    updateTagsToBreakInterestingAOLoop: function(tagsToBreakInterestingAOLoop){
        this._logger.trace("updateTagsToBreakInterestingAOLoop set with " + tagsToBreakInterestingAOLoop);
        var tags = [];
        if(tagsToBreakInterestingAOLoop)
            tags = tagsToBreakInterestingAOLoop.split(";");
        content.kitsManager.updateTagsToBreakInterestingAOLoop(tags);
    },

    /*
    * WaitForWebDriverMessagePullTimeout Configuration Setter
    * @param {String} msgPullTimeout - The timeout value for WebDriverMessagePulling.
    * @returns {Undefined}
    */
    updateWaitForWebDriverMessagePullTimeout: function(msgPullTimeout) {
        this._logger.trace("updateWaitForWebDriverMessagePullTimeout set with " + msgPullTimeout);
        if(typeof(msgPullTimeout) == "number") {
            this._waitForWebDriverMessagePullTimeout = msgPullTimeout;
            this._logger.info("_waitForWebDriverMessagePullTimeout is updated to" + this._waitForWebDriverMessagePullTimeout);
        }
    },

    /*
    * Filter event by user configuration, prevent further handling.
    * @param {Object} ao - The agent object which the event has occured on
    * @param {Object} ev - The actual DOM Event as received by the event listener
    * @returns {Boolean} filtered - True if allowed, should record. 
                                    False if not allow by config.
    */
    isEventAllowedByConfig: function (ao, ev) {
        this._logger.trace('isEventAllowedByConfig() got event of type: ' + ev.type);

        var isAllowed = false;
        var micclasses = ao._micclass;
        var handlerName = 'on' + ev.type;

        var _checkEach = function (micclass) {
            // When press enter on edit in form, a WebEdit.Submit should be recorded
            // But we don't have a WebForm Test Object, so when receive submit event on form element, check if submit is enabled on WebEdit
            if (micclass.toLowerCase() === "form" && handlerName === "onsubmit") {
                micclass = "WebEdit";
            }

            micclass = micclass.toLowerCase();

            // If no config for current micclass, then look for next
            if (!this._eventConfig[micclass])
                return true;
            var micclassConfig = this._eventConfig[micclass];

            //If current micclass have no config for this event, then continue to look for it in next micclass.
            if (!micclassConfig[handlerName])
                return true;
            var handlerConfig = micclassConfig[handlerName];

            //Go detail check, if succeed, break loop, otherwise go to next micclass
            switch (this._makeRecordDecision(handlerConfig, ao._hasDOMHandler(handlerName))) {
                case this._EVENT_CONFIG_ENUM.TYPES.ERD_RECORD:
                    isAllowed = true;
                    return false;
                case this._EVENT_CONFIG_ENUM.TYPES.ERD_IGNORE:
                    return false;
                case this._EVENT_CONFIG_ENUM.TYPES.ERD_CONTINUE:
                    return true;
            }
            return true;
        };

        // Custom config can use HTML tag, check by tag name first
        if (_checkEach.call(this, ao.GetAttrSync("html tag"))) {
            // Then check by micclass
            micclasses.every(_checkEach, this);
        }

        // Allow reserved events, if configuration not care
        if (this._EVENT_CONFIG_ENUM.RESERVED_EVENTS[handlerName])
            return true;

        return isAllowed;
    },

    /*
    * Make decision on current event using combination of listening and recording type, tell outside record or not.
    * @param {Object} handlerConfig - Object contains the listening type and recording type.
    * @param {Object} ao - Object contains event target object.
    * @returns {Boolean} False if need to check in next micclass, True if checked and should stop.
    */
    _makeRecordDecision: function (handlerConfig, hasDOMHandler) {

        var t = this._EVENT_CONFIG_ENUM.TYPES;

        // Check listening type first
        switch (handlerConfig.listen) {
            case t.EVT_NEVER:
            case t.EVT_BEHAVIOR: //Chrome doesn't have 'behavior' like IE
                return t.ERD_IGNORE;
            case t.EVT_HANDLER:
            case t.EVT_BEHAVIOR_OR_HANDLER:
                if (!hasDOMHandler) { // No handler, ignore.
                    return t.ERD_IGNORE;
                }
                break;
            case t.EVT_ANYCASE:
                break; // Go to subsequent check
            default:
                this._logger.warn('_makeRecordDecision: Unknown listening type:' + handlerConfig.listen);
                break;
        }

        // Check recording type second
        switch (handlerConfig.record) {
            case t.EVS_DISABLE: // Disabled, no need record.
            case t.EVS_DELETE: // Treat it as DISABLE.
                return t.ERD_IGNORE;
            case t.EVS_ON_NEXT_EVENT:
            case t.EVS_ENABLE_ON_NEXT_EVENT:
                //TODO: Treat ENABLE_ON_NEXT_EVENT as ENABLE, but little difference need to be handled, not implement yet here.
            case t.EVS_ENABLE:
                return t.ERD_RECORD;// allow to record
            default:
                this._logger.warn('_makeRecordDecision: Unknown recording type:' + handlerConfig.record);
                return t.ERD_CONTINUE; // Look for config in next micclass
        }
    },

    startRecord: function () {
        if (this.isRecording)
            return;

        this._logger.info("startRecord: starting recording");
        this.isRecording = true;
        this._startMonitoringSynthesizedEvents();

        this.sendBrowserRecordInfo();
    },

    stopRecord: function () {
        if (!this.isRecording)
            return;

        this._logger.info("stopRecord: stopping recording");
        this.isRecording = false;
        this._stopMonitoringSynthesizedEvents();
    },

    /**
    * Sends a Record event to the Frame object which contains the AO that the event occurred on.
    * @param {Object} ao - The agent object which the event has occured on
    * @param {Object} event - The actual DOM Event as received by the event listener (can be null)
    * @param {Object} params - Extra data that should be added to the recorded event message (e.g. point, text .. etc.)
    */
    sendRecordEvent: function (ao, event, params) {
        this._logger.trace("sendRecordEvent: called: ", params);
        this._sendRecordEventHelper('EVENT_RECORD', ao, event, params);

        // for webdriver only
        // Some click event trigger the navigation/redirect, we need to first stop it and wait WebdriverHost to pull the recrod message
        // For mousedown and other events, it is risky to preventDefault and dispatchEvent again.
        var webDriverType = window._QTP && window._QTP.WebDriverInfo && window._QTP.WebDriverInfo.WebDriverType;
        if(webDriverType && (webDriverType == "ChromeRemoteDebug" || webDriverType == "Edge" || webDriverType == "NWjs") && !event.AlreadyHandledByUFT && this._waitForWebDriverMessagePullTimeout > 0 && event.type == "click") {
            var new_event = new event.constructor(event.type, event);
            event.stopPropagation();
            event.preventDefault();
            var t = event.target;
            setTimeout( function() {
                new_event.AlreadyHandledByUFT = true;
                t.dispatchEvent(new_event);
            }, this._waitForWebDriverMessagePullTimeout);
        }
    },

    /**
    * Sends a Record event to be queued as part of a transaction. We queue events in cases which recording of one event depends on the future arrival
    * of another event using the sendRecordEventWithQueue() method (for example Drag is not recorded without receiving a Drop event). The event queue is cleared either 
    * when an event is sent using the sendRecordEventWithQueue() in which all events in the Queue are sent to the testing tool,
    * or when discardQueuedRecordEvents() which clears the event queue,
    * or when an event is sent using sendRecordEvent() which causes all events stored in the event queue to be discarded.
    * @param {Object} ao - The agent object which the event has occured on
    * @param {Object} event - The actual DOM Event as received by the event listener
    * @param {Object} params - Extra data that should be added to the recorded event message (e.g. point, text .. etc.)
    */
    queueRecordEvent: function (ao, event, params) {
        this._logger.trace("queueRecordEvent: called");
        this._sendRecordEventHelper('EVENT_INTERNAL_RECORD_QUEUE', ao, event, params);
    },

    /**
    * Sends a Record event to be sent as part of a recording event transaction. Events that are sent with this method, instruct the transaction queue to dispatch all
    * previously queued recording events - which were sent using the queueRecordEvent() method - along with this event as the last event. This also causes the transaction
    * Queue to be cleared after dispatching all events in it.
    * @param {Object} ao - The agent object which the event has occured on
    * @param {Object} event - The actual DOM Event as received by the event listener
    * @param {Object} params - Extra data that should be added to the recorded event message (e.g. point, text .. etc.)
    */
    sendRecordEventWithQueue: function (ao, event, params) {
        this._logger.trace("sendRecordEventWithQueue: called");
        this._sendRecordEventHelper('EVENT_INTERNAL_RECORD_DISPATCH_QUEUE', ao, event, params);
    },

    /**
    * Sends an event indicating that a transaction was aborted, and all previously queued events should be discarded.
    */
    discardQueuedRecordEvents: function () {
        this._logger.trace("discardQueuedRecordEvents: called");
        var msg = new Msg('EVENT_INTERNAL_RECORD_QUEUE_CLEAR', this.frame.getID(), {});
        content.dispatcher.sendEvent(msg);
    },

    /**
    * Stops current event propagation to other AOs.
    */
    stopCurrentPropagation: function () {
        this._stopPropagation = true;
    },

    _createObjectDescription: function (ao, micclass) {
        var objIdentificationProps = this.frame.getObjIdentificationProps(micclass);
        if (this._shouldAddPositionInfo(micclass)) {
            objIdentificationProps.additionalInfo = ["abs_x", "abs_y", "height", "width", "view_x", "view_y"];
        }
        return Description.createRecordDescription(ao, objIdentificationProps);
    },

    _shouldAddPositionInfo: function (micclass) {
        if (Util.isContainerMicclass(micclass))
            return false;

        // Sprinter & HPMC need position info, and UI Coverage feature out of UFT need position info as well.
        return true;
    },

    _createRecordData: function (ao, event, params) {
        this._logger.trace("_createRecordData: started");
        var micclass = Util.getMicClass(ao);
        var description = this._createObjectDescription(ao, micclass);

        this._logger.trace('_createRecordData: AO Data: ', description.description);

        var recordData = {
            WEB_PN_ID: [[ao.getID()]],
            micclass: [[micclass]],
            'recorded description': [[description]]
        };

        if (!Util.isNullOrUndefined(event)) {
            var eventID = SpecialObject.CreateEventId(event, ao.getID());
            recordData["event id"] = [[eventID]];
        }
        Util.extend(recordData, params);

        return recordData;
    },

    _sendRecordEventHelper: function (msgType, ao, event, params) {
        var forceRecord = params && params.force_record;
        if (!forceRecord && this._isSynthesizedEvent()) {
            // The reason this code is found here and not in the handlerFunc() is because
            // it's too expensive to do this check in the handler func for every event
            // so we do it just on those events we would wish to record
            this._logger.info("sendRecordEvent: ignoring synthesized event");
            return;
        }

        var recordData = this._createRecordData(ao, event, params);
        var msg = new Msg(msgType, this.frame.getID(), recordData);
        content.dispatcher.sendEvent(msg);
    },

    sendRecordExtEvent: function (ao, methodName, params) {
        var recordData = this._createRecordData(ao);
        var msg = new Msg('EVENT_RECORD', this.frame.getID(), recordData);

        msg._data.WEBEXT_PN_METHOD_NAME = methodName;
        msg._data.WEBEXT_PN_PARAMETERS = params;

        content.dispatcher.sendEvent(msg);
    },

    sendBrowserRecordInfo: function () {
        if (!this.isRecording)
            return;

        var micclass = Util.getMicClass(this.frame);
        if (micclass !== "Page")
            return;

        var browserContentHelper = new BrowserContentHelper(this.frame);

        this._logger.trace("_sendBrowserRecordInfo: creating message to dispatch");

        var recordData = this._createRecordData(browserContentHelper, { type: "", clientX: 0, clientY: 0 });
        recordData.pageDescription = this._createObjectDescription(this.frame, micclass);

        var msg = new Msg('EVENT_INTERNAL_RECORD_BROWSER_INFO', RtIdUtils.GetAgentRtid(), recordData);

        content.dispatcher.sendEvent(msg);
    },

    _startMonitoringSynthesizedEvents: function () {
        if (!BrowserServices.shouldOverrideDispatchEvent)
            return;

        this._logger.debug("_startMonitoringSynthesizedEvents: Going to override CreateEvent function");
        if (BrowserServices.isRunningInPageContext)
            this._wrapEventDispatchers();
        else
            ContentUtils.evalInDocument(this._wrapEventDispatchers);
    },

    _stopMonitoringSynthesizedEvents: function () {
        if (!BrowserServices.shouldOverrideDispatchEvent)
            return;

        this._logger.debug("_stopMonitoringSynthesizedEvents: Going to restore CreateEvent function");
        if (BrowserServices.isRunningInPageContext)
            this._unwrapEventDispatchers();
        else
            ContentUtils.evalInDocument(this._unwrapEventDispatchers);
    },

    /**
    * _wrapEventDispatchers() this function runs in the context of the HTML page and is responsible in wrapping functions that dispatch events so that when the user scripts
    *                       dispatch a synthesized (manually created) event we can ignore it during recording.
    * @return {undefined}
    */
    _wrapEventDispatchers: function () {
        if (!window._QTP)
            window._QTP = (typeof _QTP !== "undefined") ?  _QTP : {};

        if (Array.isArray(window._QTP.EventDispatchers))
            return;

        window._QTP.EventDispatchers = [];
        window._QTP.synthesizedEventsCount = window._QTP.synthesizedEventsCount || 0;

        wrap(HTMLElement.prototype, 'dispatchEvent');
        wrap(HTMLElement.prototype, 'click');
        wrap(document, 'dispatchEvent');
        wrap(window, 'dispatchEvent');
        return;

        // Internal functions
        function wrap(obj, funcName) {
            var orig = obj[funcName];
            obj[funcName] = function () {
                // We can't call Util.makeArray() here, because Util is not available when execute in document context
                var argsArray = new Array(arguments.length);
                for (var i = 0; i < arguments.length; i++) {
                    argsArray[i] = arguments[i];
                }
                return dispatcherHelper.call(this, orig, argsArray);
            };

            window._QTP.EventDispatchers.push({ obj: obj, name: funcName, orig: orig });
        }

        function dispatcherHelper(origFunc, args) {
            var result;

            window._QTP.synthesizedEventsCount++;
            try {
                result = origFunc.apply(this, args);
            }
            finally {
                window._QTP.synthesizedEventsCount--;
            }

            return result;
        }
    },

    /**
    * _unwrapEventDispatchers() this function runs in the context of the HTML page and is responsible in uwrapping the event dispatching functions so that when the user scripts
    *                       dispatches a synthesized (manually created) event we can ignore it during recording.
    * @return {undefined}
    */
    _unwrapEventDispatchers: function () {
        if (!window._QTP)
            return;

        // Restore original function

        if (Array.isArray(window._QTP.EventDispatchers)) {
            window._QTP.EventDispatchers.forEach(function (wrappedData) {
                wrappedData.obj[wrappedData.name] = wrappedData.orig;
            }, this);
        }

        // Clear temporary objects
        delete window._QTP.EventDispatchers;
        window._QTP.synthesizedEventsCount = 0;
    },

    /**
    * isSynthesizedEvent() checks if we're in a synthesized event handling
    * @return {boolean} - true if event was synthesized, false otherwise
    */
    _isSynthesizedEvent: function () {
        if (!BrowserServices.shouldOverrideDispatchEvent)
            return false;

        return ContentUtils.runOnDocSync(function () {
            return window._QTP && window._QTP.synthesizedEventsCount;
        });
    },
};