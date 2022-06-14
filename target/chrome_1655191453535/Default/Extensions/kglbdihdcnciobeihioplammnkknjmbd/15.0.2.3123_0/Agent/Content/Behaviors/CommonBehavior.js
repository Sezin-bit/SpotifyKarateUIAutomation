var CommonBehavior = {
    _micclass: ["WebElement", "Any Web Object"],
    _attrs: {
        "logical name": function () {
            return this.GetAttrSync("acc_name") || this.GetAttrSync("name") || this.GetAttrSync("html id") || this.GetAttrSync("innertext");
        },
        "html tag": function () {
            return this._elem.tagName;
        },
        "tags tree": function () {
            var arr = [];
            this._getTagsTree(arr, this._elem, 0);
            // the returned value should be
            // _data {
            //   WEB_PN_TAGS_TREE: WebAttrVal("table 0", "tbody 1", ...)
            // }
            // normally in JSONUtils, 1d array will be converted to multiple values
            // 2d array will be converted to a single WebAttrVal
            // but for properties appeared in _attr_names, JSONUtils will try first
            // to convert to data to multiple values, thus reduces array demision by one,
            // 3d array is needed.
            return [[arr]];
        },
        rect: function () {
            var zoomLevel = typeof(BrowserServices) !== "undefined" && BrowserServices.getZoomLevel && BrowserServices.getZoomLevel() || 1;
            var client_rect = this._elem.getBoundingClientRect();
            return {
                left: Math.floor(client_rect.left * zoomLevel),
                top: Math.floor(client_rect.top * zoomLevel),
                right: Math.floor(client_rect.right * zoomLevel),
                bottom: Math.floor(client_rect.bottom * zoomLevel)
            };
        },
        pos: function () {
            var rect = this.GetAttrSync("rect");
            return { x: rect.left, y: rect.top };
        },
        x: function () {
            var rect = this.GetAttrSync("rect");
            return rect.left;
        },
        y: function () {
            var rect = this.GetAttrSync("rect");
            return rect.top;
        },
        width: function () {
            var zoomLevel = typeof(BrowserServices) !== "undefined" && BrowserServices.getZoomLevel && BrowserServices.getZoomLevel() || 1;
            if(!Util.isUndefined(this._elem.tagName) && (this._elem.tagName === "svg" || this._elem.tagName === "path" || this._elem.tagName === 'rect'))
                return Math.round(this._elem.getBoundingClientRect().width * zoomLevel);
            return Math.round(this._elem.offsetWidth * zoomLevel);
        },
        height: function () {
            var zoomLevel = typeof(BrowserServices) !== "undefined" && BrowserServices.getZoomLevel && BrowserServices.getZoomLevel() || 1;
            if(!Util.isUndefined(this._elem.tagName) && (this._elem.tagName === "svg" || this._elem.tagName === "path" || this._elem.tagName === 'rect'))
                return Math.round(this._elem.getBoundingClientRect().height * zoomLevel);
            return Math.round(this._elem.offsetHeight * zoomLevel);
        },
        view_x: function (msg, resultCallback) {
            var frameReqMsg = new Msg(MSG_TYPES.QUERY, Util.shallowObjectClone(this._parentID), { view_x: null });
            content.dispatcher.sendMessage(frameReqMsg, null, null, function (resMsg) {
                var frm_x = resMsg._data.view_x;
                this.GetAttr("x", msg, function (obj_x) {
                    //return the original target of the message.
                    msg._to.object = this.getID().object;
                    resultCallback(obj_x + frm_x);
                }.bind(this));
            }.bind(this));
        },
        view_y: function (msg, resultCallback) {
            var frameReqMsg = new Msg(MSG_TYPES.QUERY, Util.shallowObjectClone(this._parentID), { view_y: null });
            content.dispatcher.sendMessage(frameReqMsg, null, null, function (resMsg) {
                var frm_y = resMsg._data.view_y;
                this.GetAttr("y", msg, function (obj_y) {
                    //return the original target of the message.
                    msg._to.object = this.getID().object;
                    resultCallback(obj_y + frm_y);
                }.bind(this));
            }.bind(this));
        },
        parent: function () {
            var elem = this._elem;
            var ao;
            while (true) {
                elem = elem.parentElement;
                if (!elem) {
                    break;
                }
                ao = content.kitsManager.createAO(elem, this._parentID);
                if (ao) {
                    return ao.getID();
                }
            }
            return Util.shallowObjectClone(this._parentID);
        },
        abs_x: function (msg, resultCallback) {
            this.GetAttr("screen_rect", msg, function (result) {
                resultCallback(Math.round(result.left));
            });
        },
        abs_y: function (msg, resultCallback) {
            this.GetAttr("screen_rect", msg, function (result) {
                resultCallback(Math.round(result.top));
            });
        },
        screen_rect: function (msg, resultCallback) {
            var frameReqMsg = new Msg(MSG_TYPES.QUERY, Util.shallowObjectClone(this._parentID), { rect: null });
            content.dispatcher.sendMessage(frameReqMsg, null, null, function (resMsg) {
                var frm_rect = resMsg._data.rect;
                var frm_abs_x = frm_rect.left;
                var frm_abs_y = frm_rect.top;
                var ao = this._outerAO ? this._outerAO : this;
                ao.GetAttr("rect", msg, function (rect) {
                    rect.left += frm_abs_x;
                    rect.top += frm_abs_y;
                    rect.right += frm_abs_x;
                    rect.bottom += frm_abs_y;
                    //return the original target of the message.
                    msg._to.object = this.getID().object;
                    resultCallback(rect);
                }.bind(this));
            }.bind(this));
        },
        class: function () {
            if(this._elem.tagName === "svg" || this._elem.tagName === "path" || this._elem.tagName === "rect")
                return this._elem.getAttribute("class");
            return this._elem.className;
        },
        class_name: function () {
            return this.GetAttrSync("class");
        },
        innertext: function () {
            return Util.cleanTextProperty(this._elem.textContent);
        },
        inner_text: function () {
            return this.GetAttrSync("innertext");
        },
        outertext: function () {
            return Util.cleanTextProperty(this._elem.outerText || this.GetAttrSync("innertext"));
        },
        outer_text: function () {
            return this.GetAttrSync("outertext");
        },
        innerhtml: function () {
            return this._elem.innerHTML;
        },
        inner_html: function () {
            return this.GetAttrSync("innerhtml");
        },
        outerhtml: function () {
            return this._elem.outerHTML;
        },
        outer_html: function () {
            return this.GetAttrSync("outerhtml");
        },
        "html id": function () {
            return this._elem.id;
        },
        title: function () {
            return this._elem.title;
        },
        version: function () {
            return Util.browserApplicationVersion();
        },
        visible: function () {
            var rect = this._elem.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0)
                return false;

            var style = getComputedStyle(this._elem, null);
            return style.display !== "none" && style.visibility !== "hidden";
        },
        focus: function () {
            return this._elem.ownerDocument.activeElement === this._elem;
        },
        focused: function () {
            return this.GetAttrSync("focus");
        },
        attribute: function (msg) {
            return this._getAttributes(this._elem, msg);
        },
        "all attributes": function () {
            var res = [];
            Util.makeArray(this._elem.attributes).forEach(function (attr) {
                if (attr.name != '_uft_ext_events_hooked') {
                    res.push(attr.name);
                    res.push(attr.value);
                }
            });
            return res.join(";;");
        },
        "all styles": function () {
            var style = window.getComputedStyle(this._elem, null);
            var res = [];
            Util.makeArray(style).forEach(function (styleName) {
                res.push(styleName);
                res.push(style.getPropertyValue(styleName));
            });
            return res.join(";;");
        },
        style: function (msg) {
            return this._getCSSValues(this._elem, msg);
        },
        value: function () {
            return this._elem.value;
        },
        xpath: function () {
            return _QTP.AutoXpathRecorder(this._elem);//scope object is sandbox or window. don't narrow down it to window.
        },
        _xpath: function () {
            return _QTP.AutoXpathRecorder(this._elem);
        },
        css: function() {
            return _QTP.CSSGenerator(this._elem);
        },
        disabled: function () {
            return this._elem.disabled ? 1 : 0;
        },
        type: function () {
            return this._elem.type;
        },
        name: function () {
            return this._elem.name;
        },
        text: function () {
            if (content.settings.useinnertextfortextcollection) {
				return this._elem.textContent.replace(/\xA0/g, " ");
			}
			return ContentUtils.getVisibleTextContent(this._elem);
        },
        "acc_name": function () {
            return ContentUtils.getAccNameFromControl(this._elem);
        },
        elementinterface: function (msg, resultCallback) {
            return DotObjUtil.WrapElement(this._elem, this.getID(), resultCallback);
        },
        is_container: function () {
            return false;
        },
        ancestor: function () {
            for (var parent = this.getParent() ; parent; parent = parent.getParent()) {
                if (parent.GetAttrSync('is_container'))
                    return parent.getID();
            }
        },
        source_index: function () {
            var allElems = Util.makeArray(document.getElementsByTagName('*'));
            var ret = allElems.indexOf(this._elem);
            if (ret >= 0)
                return ret;
            // return undefined
        },
        "all text items": function () {
            var arr = Util.getTextNodesValue(this._elem);
            return arr.join(";");
        },
        role: function () {
            return this._elem.getAttribute('role') || '';
        }
    },

    // These methods no longer seem to be relevant
    // ID_TO_DESC
    // CONTAINS_POINT
    _methods: {
        WEB_GETFORMA: function (msg, resultCallback) {
            this._logger.trace("CommonBehavior: on commnad WEB_GETFORMA");

            // data field is null for this message type
            msg._data = msg._data || {};
            // form's browser, page and frame will be the same as its child element,
            // we only need to override the object part
            msg._data.WEB_PN_ID = msg._to;

            if (this._elem.form) {
                var form_ao = content.kitsManager.createAO(this._elem.form, this._parentID);
                msg._data.WEB_PN_ID.object = form_ao.getID().object;
            } else {
                msg._data.WEB_PN_ID = null;
            }

            resultCallback(msg);
        },

        MAKE_VISIBLE: function (msg, resultCallback) {
            this._logger.trace("CommonBehavior: on command MAKE_VISIBLE");
            var elem = this._elem;
			var data = msg._data;
			var container = elem;
			var elem_rect = this.GetAttrSync("rect");
			var scroll_to_center = data.WEB_PN_SCROLL_TO_CENTER;
            var pt = data.pos?  { x: data.pos.x, y: data.pos.y } : { x: 0, y: 0};

            while (true) { // scroll all parent containers when necessary in current frame to reveal this._elem
                container = container.parentNode;
                if (!container) {
                    break;
                }
                if (container.tagName !== "DIV") {
                    continue;
                }
                var con_rect = content.kitsManager.createAO(container, this._parentID).GetAttrSync("rect");
                if (Util.isRectEmpty(con_rect)) {
                    continue;  //no need to scroll those zero-size containers
                }
                var need_to_scroll = scroll_to_center || !Util.isVisible(elem_rect, con_rect);
                if (need_to_scroll) {
                    if (scroll_to_center) {
                        container.scrollLeft += elem_rect.left - Util.getCenterPoint(con_rect).x + pt.x;
                        container.scrollTop += elem_rect.top - Util.getCenterPoint(con_rect).y + pt.y;
                    } else {
                        container.scrollLeft += elem_rect.left - con_rect.left + pt.x;
                        container.scrollTop += elem_rect.top - con_rect.top + pt.y;
                    }
                    elem_rect = this.GetAttrSync("rect");
                }
            }

            var zoomLevel = typeof(BrowserServices) !== "undefined" && BrowserServices.getZoomLevel && BrowserServices.getZoomLevel() || 1;
            // scroll frame window if necessary
            var frame_rect = { left: 0, top: 0, right: window.innerWidth * zoomLevel, bottom: window.innerHeight * zoomLevel };

            // we scroll the window scroll bar in two situations:
            // 1. The exposure of element is too minimal to invoke some event;
            // 2. While capture the snapshot of specific element, we need to guarrantee the entire element is visible

            var containerRectHeight = frame_rect.bottom - frame_rect.top;
            var containerRectWidth = frame_rect.right - frame_rect.left;

            var elemRectHeight = elem_rect.bottom - elem_rect.top;
            var elemRectWidth = elem_rect.right - elem_rect.left;

            var needToScroll = !Util.isVisible(elem_rect, frame_rect) || (!Util.isRectFullyInRect(elem_rect, frame_rect) && (containerRectHeight >= elemRectHeight && containerRectWidth >= elemRectWidth));

            if (scroll_to_center || needToScroll) {
                if (scroll_to_center) {
                    var elemRectCenterPoint = Util.getCenterPoint(elem_rect);
                    var frameRectCenterXPoint = Util.getCenterPoint(frame_rect);
                    var offsetX = (elemRectCenterPoint.x - frameRectCenterXPoint.x) / zoomLevel;
                    var offsetY = (elemRectCenterPoint.y - frameRectCenterXPoint.y) / zoomLevel;
                    window.scrollTo(offsetX + pt.x + window.scrollX, offsetY + pt.y + window.scrollY);
                }
                else {
                    window.scrollTo(elem_rect.left / zoomLevel + pt.x + window.scrollX, elem_rect.top / zoomLevel + pt.y + window.scrollY);
                }
            }

            // we are done in this level, dispatch the message to the parent frame of this frame
            var req_data = {
                pos: { x: (data.pos ? pt.x + elem_rect.left : elem_rect.left), y: (data.pos ? pt.y + elem_rect.top : elem_rect.top) },
                WEB_PN_SCROLL_TO_CENTER: data.WEB_PN_SCROLL_TO_CENTER,
                "disable browser popup": msg._data["disable browser popup"]
            };

            //sends the request to our frame to make sure it is visible.
            var reqMsg = new Msg(MSG_TYPES.SRVC_MAKE_OBJ_VISIBLE, Util.shallowObjectClone(this._parentID), req_data);
            content.dispatcher.sendMessage(reqMsg, null, null, function (/*resMsg*/) {
                this._logger.trace("CommonBehavior: MAKE_VISIBLE: on callback from parent's SRVC_MAKE_OBJ_VISIBLE. Get 'screen_rect' attribute");
                this.GetAttr("screen_rect", msg, function (rect) {
                    this._logger.trace("CommonBehavior: MAKE_VISIBLE: on callback from 'screen_rect' attribute. Value: ", rect);
                    msg._data.rect = rect;
                    msg._data.pos = { x: rect.left + pt.x, y: rect.top + pt.y };
                    msg._data.rectInDocument = this.GetAttrSync("rect");

                    // Remove plugin
                    // The package checks if this value is equal to 0 (NULL) and if it is - it assumes it's
                    // a failure. -1 on the other hand is "success" (note: HWND is unsigned)
                    msg._data.hwnd = -1;

                    resultCallback(msg);
                }.bind(this));
            }.bind(this));
        },
        GET_SCREEN_RECT: function (msg, resultCallback) {
            this._logger.trace("CommonBehavior: on commnad GET_SCREEN_RECT");
            this.GetAttr("screen_rect", msg, function (result) {
                msg._data.rect = result;
                resultCallback(msg);
            });
        },

        CONTAINS_TEXT: function (msg, resultCallback) {
            this._logger.trace("CommonBehavior: on commnad CONTAINS_TEXT");
            var str = msg._data;
            var regex = new RegExp(str);
            var result;
            if (regex.test(this.GetAttrSync("text"))) {
                result = true;
            } else {
                result = this.GetAttrSync("text").indexOf(str) !== -1;
            }

            // Don't return the result as it was this was in SYNC manner
            //resultCallback(result);
            resultCallback(msg);
        },

        CALL_EVENT: function (msg, resultCallback) {
            this._logger.trace("CommonBehavior: on commnad CALL_EVENT");
            var event = msg._data.event;
            event = event.toLowerCase().replace(/^on/, "");
            this._fireEvent(this._elem, event, msg._data);
            resultCallback(msg);
        },

        WEB_CLICK_EX: function (msg, resultCallback) {
            if (this.GetAttrSync("disabled") === 1) {
                ErrorReporter.ThrowObjectDisabled();
            }

            // We don't want to wait for the response, but return immediately
            msg.delay = true;
            var clickMsg = Util.deepObjectClone(msg);
            var wrappedCallback = ContentUtils.protectCallbackAgainstPrematureNavigation(resultCallback, msg, this._logger, 'WEB_CLICK_EX');
            wrappedCallback(msg);

            var msgMakeVisible = new Msg(MSG_TYPES.SRVC_MAKE_OBJ_VISIBLE, Util.shallowObjectClone(this._parentID), { "disable browser popup": msg._data["disable browser popup"] });
            this.SRVC_MAKE_OBJ_VISIBLE(msgMakeVisible, function () {
                this._fireEvent(this._elem, "click", clickMsg._data);
            }.bind(this));
        },

        HIGHLIGHT_OBJECT: function (msg, resultCallback) {
            this._logger.trace("CommonBehavior: on command HIGHLIGHT_OBJECT");
            ContentUtils.highlightElement(this._elem, resultCallback, msg);
        },

        HIGHLIGHT_MATCHES: function (msg, resultCallback) {
            this._logger.trace("CommonBehavior: on command HIGHLIGHT_OBJECT");
            var elems = msg._data.WEB_PN_ID.map(function(id){ return content.rtidManager.GetElementFromID(id.object); });
            ContentUtils.highlightElements(elems, resultCallback, msg);
        },

        TOUCH_SWIPE: function (msg, callback) {
            this._logger.trace("CommonBehavior: Swipe(", msg._data, ")");

            var delta = computeDelta(msg._data.direction, msg._data.distance);
            var interval = 50;
            var steps = Math.max(Math.floor(msg._data.duration / interval), 1);
            // Do the callback first so UFT doesn't hang if the browser does something between setTimeouts
            this._warnIfNoTouch(msg);

            this._pan(msg._data.pos, delta, interval, steps, msg, callback);

            return; // Helpers
            function computeDelta(direction, distance) {
                switch (direction) {
                    case 0: // left
                        return { x: -distance, y: 0 };
                    case 1: // right
                        return { x: distance, y: 0 };
                    case 2: // up
                        return { x: 0, y: -distance };
                    case 3: // down
                        return { x: 0, y: distance };
                }
                throw Error("Unexpeced direction: " + direction);
            }
        },

        TOUCH_LONG_TAP: function (msg, callback) {
            this._logger.trace("CommonBehavior: LongTap(", msg._data, ")");

            var point = this._pointRelativeToElem(msg._data.pos);
            var duration = msg._data.duration;
            var element = this._elem;

            // Do the callback first so UFT doesn't hang if the browser does something between setTimeouts
            this._warnIfNoTouch(msg);

            var wrappedCallback = ContentUtils.protectCallbackAgainstPrematureNavigation(callback, msg, this._logger, 'LongTap');
            var sim = new SimulateGesture();
            sim.addTouch(element, point);
            Util.setTimeout(function () {
                sim.removeTouches();
                wrappedCallback(msg);
            }, duration);
        },

        TOUCH_PINCH: function (msg, callback) {
            this._logger.trace("CommonBehavior: Pinch(", msg._data, ")");

            var scale = msg._data.scale;
            var duration = msg._data.duration;
            var point = this._pointRelativeToElem(msg._data.pos);
            var element = this._elem;

            var interval = 50; // Between moves and start/end
            var totalSteps = Math.max(Math.floor(duration / interval) - 2, 1); // -2 for start and end
            // Total time may be a little off if very short duration is specified

            // Do the callback first so UFT doesn't hang if the browser does something between setTimeouts
            this._warnIfNoTouch(msg);
            var wrappedCallback = ContentUtils.protectCallbackAgainstPrematureNavigation(callback, msg, this._logger, 'Pinch');

            var rect = element.getBoundingClientRect();

            // From measurement the fingers in a typical pinch starts about 100 pixels apart
            // If we assume the distance is the same on the x/y axes then each finger is ~35 pixels away from the center on each axis
            // sqrt(35^2 * 2)*2 is closest to 100
            var defaultDelta = 35;

            // Ensure the points begin in the element's rectangle
            var deltaX = Math.min(defaultDelta, Math.abs(point.x - rect.left), Math.abs(rect.right - point.x));
            var deltaY = Math.min(defaultDelta, Math.abs(point.y - rect.top), Math.abs(rect.bottom - point.y));

            var first = {  x: point.x - deltaX, y: point.y - deltaY };
            var second = { x: point.x + deltaY, y: point.y + deltaY };

            var pinch = new SimulateGesture();
            pinch.addTouch(element, first);
            Util.setTimeout(function () {
                pinch.addTouch(element, second);
                Util.setTimeout(moveTouch, interval, 0);
            }, interval);

            return;
            //Helper function
            function moveTouch(step) {
                // 1- because first and second already include one delta
                var ratio = (1 - scale) * step / totalSteps;
                var positions = [
                    {
                        x: first.x + (deltaX * ratio),
                        y: first.y + (deltaY * ratio),
                    },
                    {
                        x: second.x - (deltaX * ratio),
                        y: second.y - (deltaY * ratio),
                    },
                ];

                pinch.move(positions);

                if (step === totalSteps) {
                    Util.setTimeout(function () {
                        pinch.removeTouches();
                        wrappedCallback(msg);
                    }, interval);
                }
                else {
                    Util.setTimeout(moveTouch, interval, step + 1);
                }
            }
        },

        WEB_DOUBLE_CLICK: function (msg, callback) {
            this._logger.trace("CommonBehavior: DoubleClick(", msg._data, ")");

            var duration = msg._data.duration;

            var wrappedCallback = ContentUtils.protectCallbackAgainstPrematureNavigation(callback, msg, this._logger, 'DblClick');

            this._fireEvent(this._elem, 'click', msg._data);
            Util.setTimeout(function (self) {
                self._fireEvent(self._elem, 'click', msg._data);
                self._fireEvent(self._elem, 'dblclick', msg._data);
                wrappedCallback(msg);
            }, duration, this);
        },

        WEB_HOVER_TAP: function (msg, callback) {
            if (ContentUtils.isTouchEnabled()) {
                this._logger.trace("CommonBehavior: Tapping for HoverTap(", msg._data, ")");
                this._fireEvent(this._elem, 'click', msg._data);
            }
            else {
                this._logger.trace("CommonBehavior: Hovering for HoverTap(", msg._data, ")");
                ['mouseover', 'mouseenter', 'mousemove'].forEach(function (event) {
                    this._fireEvent(this._elem, event, msg._data);
                }, this);
            }
            callback(msg);
        },

        TOUCH_PAN: function (msg, callback) {
            this._logger.trace("CommonBehavior: Pan(", msg._data, ")");
            var interval = 50;
            var steps = Math.max(Math.floor(msg._data.duration / interval), 1);

            // Do the callback first so UFT doesn't hang if the browser does something between setTimeouts
            this._warnIfNoTouch(msg);
            this._pan(msg._data.pos, msg._data.distance, interval, steps, msg, callback);
        },

        IS_MOUSE_REPLAY_REQUIRED: function (msg, resultCallback) {
            this._logger.trace("CommonBehavior: on commnad IS_MOUSE_REPLAY_REQUIRED");
            //resultCallback(false);
            resultCallback(msg);
        }
    },
    _eventHandler: function (recorder, ev) {
        this._logger.trace('Common.eventHandler: Received recordable event on ' + this._elem.tagName + ': ' + ev.type);

        // In order to prevent double recording in touch enabled devices
        if (ContentUtils.isTouchEnabled())
            return false;

        var data = null;
        switch (ev.type) {
            case 'click':
                data = { event: 'onclick' };
                break;
            case 'dblclick':
                data = { event: 'ondblclick' };
                break;
            case 'mouseup':
                    data = {
                        event: 'onmouseup',
                        'event button': this._quirkyButton(ev.button)
                    };
                break;
            case 'mousedown':
                data = {
                    event: 'onmousedown',
                    'event button': this._quirkyButton(ev.button)
                };
                break;
            case 'mouseover':
                data = { event: 'onmouseover' };
                break;
            case 'mouseout':
                data = { event: 'onmouseout' };
                break;
            case 'contextmenu':
                data = { event: 'oncontextmenu' };
                break;
            case 'dragstart':
                recorder.queueRecordEvent(this, ev, {
                    event: 'ondragstart',
                    'event point': { x: ev.clientX, y: ev.clientY },
                });
                return true;
            case 'dragend':
                recorder.discardQueuedRecordEvents();
                return true;
            case 'drop':
                recorder.sendRecordEventWithQueue(this, ev, {
                    event: 'ondrop',
                    'event point': { x: ev.clientX, y: ev.clientY },
                });
                return true;
        }

        if (data) {
            recorder.sendRecordEvent(this, ev, Util.extend(data, {
                'event point': { x: ev.clientX, y: ev.clientY },
            }));
            return true;
        }
    },
    _gestureHandler: function (recorder, gestureInfo) {
        this._logger.trace('Common._gestureHandler: Received gesture: ' + gestureInfo.event);
        if( gestureInfo.event === 'tap') {
            recorder.sendRecordEvent(this, null, {
                event: 'onclick',
                'event point': { x: gestureInfo.clientX, y: gestureInfo.clientY },
            });
            return true;
        }

        recorder.sendRecordEvent(this, null, gestureInfo);
        return true;
    }
};