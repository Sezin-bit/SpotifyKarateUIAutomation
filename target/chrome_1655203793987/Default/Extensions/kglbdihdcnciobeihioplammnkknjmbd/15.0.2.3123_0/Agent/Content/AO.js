function AO(element, parentID) {
    this._elem = element;
    this._id = null;
    this._attrs = {
        micclass: function () {
            return this._micclass;
        }
    };
    this._methods = {};
    this._behaviors = [];
    this._micclass = [];
    this._parentID = Util.shallowObjectClone(parentID);
    this._logger = WebKit._logger;
    this._logger.trace(function() { return "AO: new ao created for element " + element.tagName; });
}

AO.prototype = {
    _parentID: null,
    _elem: null,
    _id: null,
    _attrs: null,
    _methods: null,
    _behaviors: null,
    _micclass: null,
    _logger: null,
    _outerAO: null,

    mergeBehavior: function (behavior) {
        var self = this;
        this._logger.trace(function() { return "mergeBehavior: merging behavior to AO " + self._elem.tagName; });

        if (behavior._micclass)
            this._micclass = behavior._micclass.concat(this._micclass);

        this._behaviors.push(behavior);

        // Eagerly merge in overrides and helper methods
        var funcs = behavior._helpers;
        for (var f in funcs) {
            this[f] = funcs[f];
        }
    },
    isLearnable: Util.alwaysFalse,
    _lazyInit: function (subObj, name) {
        if (name in this[subObj])
            return; // already initialized

        for (var i = this._behaviors.length - 1; i >= 0; --i) { // take last override
            var b = this._behaviors[i];
            if (b[subObj] && name in b[subObj]) {
                this[subObj][name] = b[subObj][name];
                break;
            }
        }
    },

    _isAttrAsync: function (attrName) {
        switch (attrName) {
            case "screen_rect":
            case "abs_x":
            case "abs_y":
            case "view_x":
            case "view_y":
            case "elementinterface":
                return true;
            default:
                return false;
        }
    },

    _getAttrPartialValue: function (property/*, msg*/) {
        Util.assert(this._isAttrAsync(property), "_getAttrPartialValue: called for sync attribute: " + property, this._logger);
        var val = null;
        switch (property) {
            case "abs_x":
            case "view_x":
                val = this.GetAttrSync("rect").left;
                break;
            case "abs_y":
            case "view_y":
                val = this.GetAttrSync("rect").top;
                break;
            default:
                this._logger.error("_getAttrPartialValue: unhandled attribute: " + property);
                return null;
        }

        return AttrPartialValueUtil.WrapValue(property, val);
    },

    GetAttr: function (property, msg, resultCallback) {
        this._logger.trace("GetAttr: query property ", property);
        var attrInfo = Description.getAttributeInfo(property);
        var propertyName = attrInfo.name;
        if (attrInfo.data) {
            msg = msg || new Msg(MSG_TYPES.QUERY, this.getID(), {});
            msg._data[propertyName] = attrInfo.data;
        }

        this._lazyInit("_attrs", propertyName);
        if (!this._attrs[propertyName]) {
            this._logger.debug("GetAttr: unknown attribute ", propertyName); // not a warning since BATCH_QUERY makes a matrix of RTID and the union of properties to fetch
            resultCallback(null);
            return;
        }

        if (this._isAttrAsync(propertyName)) {
            this._attrs[propertyName].call(this, msg, function (result) {
                resultCallback(Util.cleanSpecialChars(result));
            });
        }
        else {
            var val = this._attrs[propertyName].call(this, msg);
            //only "value" property of WebEdit don't remove line-feed. 
            val = propertyName === "value" && Util.getMicClass(this) === "WebEdit" ? val : Util.cleanSpecialChars(val);
            resultCallback(val);
        }
    },
    _hasDOMHandler: function (name) {
        return Util.findAncestor(this._elem, function (e) {
            // if the 'onclick' handler is present but empty (e.g. <div onclick />) getAttribute will return "" which is falsy but should be recorded
            return !Util.isNullOrUndefined(e.getAttribute(name));
        });
    },

    _quirkyButton: function (button) {
        // Convert to quirksmode buttons http://www.quirksmode.org/js/events_properties.html#button
        return [1, 4, 2][button];
    },

    ReceiveEvent: function (recorder, ev) {
        if (!this.UseEventConfiguration(ev) || recorder.isEventAllowedByConfig(this, ev)) {
            var eventAttached = Util.isExtEventRegistered(ev.target, ev.type);
            if (!eventAttached) {
                this._behaviors.slice().reverse().some(function (behavior) {
                    return behavior._eventHandler && behavior._eventHandler.call(this.getRecordAO(), recorder, ev);
                }, this);
            }
		}
    },

    _warnIfNoTouch: function (msg) {
        if (!ContentUtils.isTouchEnabled()) {
            msg.status = "OkButNotHandled";
            msg._data.value = "NotTouchEnabled";
        }
    },

    ReceiveGesture: function (recorder, info, elem) {
        this._behaviors.slice().reverse().some(function (behavior) {
            return behavior._gestureHandler && behavior._gestureHandler.call(this.getRecordAO(), recorder, info, elem);
        }, this);
    },

    ReceiveEventStarted: function (recorder) {
        this._behaviors.slice().reverse().some(function (behavior) {
            return behavior._eventTargetStarted && behavior._eventTargetStarted.call(this.getRecordAO(), recorder);
        }, this);
    },

    ReceiveEventEnded: function (recorder) {
        this._behaviors.slice().reverse().some(function (behavior) {
            return behavior._eventTargetEnded && behavior._eventTargetEnded.call(this.getRecordAO(), recorder);
        }, this);
    },

    GetAttrSync: function (property, msg) {
        this._logger.trace("GetAttrSync: query property " + property);
        var attrInfo = Description.getAttributeInfo(property);
        var propertyName = attrInfo.name;

        if (attrInfo.data) {
            msg = msg || new Msg(MSG_TYPES.QUERY, this.getID(), {});
            msg._data[propertyName] = attrInfo.data;
        }

        this._lazyInit("_attrs", propertyName);

        if (this._attrs[propertyName]) {
            if (this._isAttrAsync(propertyName)) {
                var partialVal = this._getAttrPartialValue(propertyName, msg);
                partialVal.value = Util.cleanSpecialChars(AttrPartialValueUtil.GetValue(partialVal));
                return partialVal;
            }
            else
                return Util.cleanSpecialChars(this._attrs[propertyName].call(this, msg));
        }
        else {
            this._logger.debug("GetAttrSync: unknown attribute " + propertyName); // not a warning since BATCH_QUERY makes a matrix of RTID and the union of properties to fetch
            return null;
        }
    },
    QueryAttributesSync: function(attrsObj) {
        this._logger.trace("QueryAttributesSync: called for attributes: ", attrsObj);
        var attrsObjRes = {};
        var attrList = Object.keys(attrsObj);
        attrList.forEach(function (attr) {
            //property "id" is mapped as WEB_PN_ID as property id,which will be parsed as "WEB_PN_ID" in WebJsonParser.
            //so here the string "WEB_PN_ID" is represented as property "id", so query the "id" instead of "WEB_PN_ID" to get the real value.
            //and set the property id to "WEB_PN_ID", which will be parsed as WEB_PN_ID as property id.
            attrsObjRes[attr] = this.GetAttrSync(attr==="WEB_PN_ID"?"id":attr);
        }, this);

        return attrsObjRes;
    },
    QUERY_ATTR: function (msg, resultCallback) {
        this._logger.trace("QUERY_ATTR: called for attributes: ", msg._data);
        var attrs = Object.keys(msg._data);
        if (attrs.length < 1) {
            this._logger.warn("QUERY_ATTR: Called with no attributes");
            resultCallback(msg);
            return;
        }

        var multiResponses = new MultipleResponses(attrs.length);

        attrs.forEach(function (prop) {
            this._logger.debug("QUERY_ATTR: call GetAttr for '" + prop + "' property");
            //property "id" is mapped as WEB_PN_ID as property id,which will be parsed as "WEB_PN_ID" in WebJsonParser.
            //so here the string "WEB_PN_ID" is represented as property "id", so query the "id" instead of "WEB_PN_ID" to get the real value.
            //and set the property id to "WEB_PN_ID", which will be parsed as WEB_PN_ID as property id.
            this.GetAttr(prop==="WEB_PN_ID"?"id":prop, msg, multiResponses.callback(function (isDone, val) {
                msg._data[prop] = val;
                this._logger.debug("QUERY_ATTR: (GetAttr callback) " + prop + "=" + val);

                if (!isDone)
                    return;

                this._logger.debug("QUERY_ATTR: Finished querying all the requested attributes");
                resultCallback(msg);
            }.bind(this)));
        }.bind(this));
    },
    InvokeMethod: function (method, msg, resultCallback) {
        this._logger.trace("InvokeMethod: invoking method ", method, " for msg ", msg);
        this._lazyInit("_methods", method);

        if (!this._methods[method]) {
            this._logger.warn("InvokeMethod: unknown method " + method);
            ErrorReporter.ThrowGeneralError();
            return;
        }

        this._methods[method].call(this, msg, resultCallback);
    },
    QUERY_DESC_TO_ID: function (msg, resultCallback) {
        this._logger.trace("QUERY_DESC_TO_ID: Started");
        var additionalParams = {
            filter: function (childAO) { return childAO._elem!=this._elem }.bind(this)
        };

        this._internalQueryDescToId(msg, additionalParams, ContentUtils.addLogicalNamesToIdentificationResult(this._id, resultCallback));
    },
    QUERY_REPOSITORY_DESC2ID: function (msg, resultCallback) {
        this._logger.trace("QUERY_REPOSITORY_DESC2ID: Started");
        var additonalParams = { filter: Util.alwaysFalse, learn: true };
        
        this._internalQueryDescToId(msg, additonalParams, resultCallback);
    },
    _internalQueryDescToId: function (msg, optionalParamsObj, resultCallback) {
        this._logger.trace("_internalQueryDescToId: Started");

        Description.GetIDsByDescription(msg._data, Description.GetCandidateAOsForContent.bind(Description, this._parentID, this._elem), optionalParamsObj, function (filteredAOs) {
            resultCallback(Description.buildReturnMsg(msg._msgType, msg._to, filteredAOs, this._logger));
        }.bind(this));
    },
    getID: function () {
        this._logger.trace("getID: getting runtime id for element ", function () { return this._elem; }.bind(this));
        if (!this._id) {
            this._logger.trace("getID: objID not cached, create it from rtidManager");
            var elem = this._elem;
            if (this._radios && this._radios.length > 0) {
                elem = this._radios[0];
            }
            var obj_id = content.rtidManager.GetIDForElement(elem);
            this._id = Util.shallowObjectClone(this._parentID);
            this._id.object = obj_id;
        }
        return Util.shallowObjectClone(this._id);
    },

    SRVC_TAKE_SCREENSHOT: function (msg, callback) {
        this._logger.trace("SRVC_TAKE_SCREENSHOT: Started");
        this.QUERY_ATTR({_data: {"view_x":null, "view_y":null, "width":null, "height":null}, _to: msg._to}, function(res) {
            var rect = {"left": res._data.view_x, "right": res._data.view_x + res._data.width, "top": res._data.view_y, "bottom": res._data.view_y + res._data.height};
            var browserId = { browser: msg._to.browser, page: -1, frame: -1, object: null };
            msg._to = browserId;
            var imageType = (msg._data && msg._data.type) ? msg._data.type : null;
            msg._data = {"rect": rect, "type":imageType };
            content.dispatcher.sendMessage(msg, null, null, function(resMsg) {
                if (!BrowserServices.cropedScreenshot) {
                    // All browsers except Firefox retrieve the full screenshot and crop it here.
                    var img = new Image();
                    img.onload = function() {
                        var canvas = document.createElement("canvas");
                        var width = canvas.width = rect.right - rect.left;
                        var height = canvas.height = rect.bottom - rect.top;
                        var ctx = canvas.getContext('2d');
                        ctx.drawImage(img, rect.left, rect.top, width, height, 0, 0, width, height);
                        resMsg._data.data = canvas.toDataURL().replace(/^data:image\/(png|jpeg);base64,/, '');
                        callback(resMsg);
                    }
                    img.src = "data:image/png;base64," + resMsg._data.data;

                } else {
                    callback(resMsg);
                }
            });
        });
    },
    SRVC_MAKE_OBJ_VISIBLE: function (msg, callback) {
        var browserRtid = RtIdUtils.GetBrowserRtid(msg._to);
        if (RtIdUtils.IsRTIDBrowser(browserRtid)) {
            var msgToBrowser = new Msg("SRVC_MAKE_OBJ_VISIBLE", browserRtid, { "disable browser popup": msg._data["disable browser popup"] });
            content.dispatcher.sendMessage(msgToBrowser, browserRtid, "chrome", function () {});
        }
        this.InvokeMethod("MAKE_VISIBLE", msg, callback);
    },
    SRVC_HIGHLIGHT_OBJECT: function (msg, callback) {
        this.InvokeMethod("HIGHLIGHT_OBJECT", msg, callback);
    },
    SRVC_HIGHLIGHT_MATCHES: function (msg, callback) {
        this.InvokeMethod("HIGHLIGHT_MATCHES", msg, callback);
    },
    SRVC_CALL_OBJ_EVENT: function (msg, callback) {
        // We don't want to wait for the response, but return immediately
        msg.delay = true;

        var callEventMsg = Util.deepObjectClone(msg);

        var wrappedCallback = ContentUtils.protectCallbackAgainstPrematureNavigation(callback, msg, this._logger, 'SRVC_CALL_OBJ_EVENT');
        wrappedCallback(msg);

        this.InvokeMethod("CALL_EVENT", callEventMsg, Util.identity);
    },
    SRVC_EDIT_SET: function (msg, callback) {
        this.InvokeMethod("SET_VALUE", msg, callback);
    },
    SRVC_GET_FORM: function (msg, callback) {
        this.InvokeMethod("WEB_GETFORMA", msg, callback);
    },
    CMD_LIST_SELECT: function (msg, callback) {
        this.InvokeMethod('LIST_SELECT', msg, callback);
    },
    CMD_LIST_DESELECT: function (msg, callback) {
        this.InvokeMethod('LIST_DESELECT', msg, callback);
    },
    CMD_LIST_EXTEND_SELECT: function (msg, callback) {
        this.InvokeMethod('LIST_EXTEND_SELECT', msg, callback);
    },
    SRVC_GET_SCREEN_RECT: function (msg, callback) {
        this.InvokeMethod("GET_SCREEN_RECT", msg, callback);
    },
    QUERY_GET_TABLE_DATA: function (msg, callback) {
        this.InvokeMethod("GET_TABLE_DATA", msg, callback);
    },
    SRVC_INVOKE_METHOD: function (msg, callback) {
        this.InvokeMethod(msg._data.AN_METHOD_NAME, msg, callback);
    },
    QUERY_OBJ_PARENTS_FROM_ID: function (msg, callback) {
        this._logger.trace("onMessage: Started with: ", msg);

        msg._data = {};
        var ids = [];

        var aoParentIterator = this;
        do {
            ids.push(aoParentIterator.getID());
            aoParentIterator = aoParentIterator.getParent();
        } while (aoParentIterator);

        msg._data.WEB_PN_ID = ids.reverse();

        callback(msg);
    },
    SRVC_GET_OBJ_DESCRIPTION: function (msg, resultCallback) {
        this._logger.trace("CommonBehavior: SRVC_GET_OBJ_DESCRIPTION msg=", msg);
        var micclass = Util.getMicClass(this);
        var objIdentificationProps;
        if (msg._data.objectidentificationproperties) {
            this._logger.debug("CommonBehavior: SRVC_GET_OBJ_DESCRIPTION got object configuration in message");
            var objIdentificationConfig = JSON.parse(msg._data.objectidentificationproperties);
            objIdentificationProps = objIdentificationConfig[micclass.toLowerCase()];
        }
        if (objIdentificationProps == null) {
            this._logger.debug("CommonBehavior: SRVC_GET_OBJ_DESCRIPTION using object configuration from frame");
            objIdentificationProps = content.frame.getObjIdentificationProps(micclass);
        }

        var description = Description.createTestObjectDescription(this, objIdentificationProps, function (specialDescription) {
            this._logger.trace("Description.createTestObjectDescription return specialDescription=", specialDescription);
            msg._data.objDescription = specialDescription;
            resultCallback(msg);
        }.bind(this));
    },
    onMessage: function (msg, resultCallback) {
        this._logger.trace("onMessage: Started with: ", msg);
        if (!this[msg._msgType]) {
            this._logger.error("onMessage: Unhandled msg: ", msg._msgType);
            ErrorReporter.ThrowNotImplemented("AO." + msg._msgType);
        }

        this[msg._msgType](msg, resultCallback);
    },
    // Helper methods (may be overridden by behaviors)
    _getTagsTree: function (str_array, element, level) {
        str_array.push(level + " " + element.tagName);
        var children = element.children;
        for (var i = 0; i < children.length; i++) {
            this._getTagsTree(str_array, children[i], level + 1);
        }
    },

    _fireEvent: function (target, event, data, relatedTarget) {
        return ContentUtils.fireEvent(target, event, data, this._logger, relatedTarget);
    },

    _isRealLink: function () {
        var elem = this._elem;

        //if href of link end with %, edge will throw Invalid Arguments when get elem.href.
        //need to catch this exception and call elem.getAttribute("href").
        var href;

        try {
            href = elem.href;
        }
        catch (ex) {
            this._logger.warn("_isRealLink: throw exception when get elem.href. ex = ", ex);
            href = elem.getAttribute("href");
        }

        if (!href) {
            return false;
        }

        if (this._hasDirectTextChild(elem)) {
            return true;
        }

        if (this._hasBackgroundImage(elem)) {
            return true;
        }

        var all_children = this._elem.getElementsByTagName("*");
        for (var i = 0; i < all_children.length; i++) {
            if (this._hasDirectTextChild(all_children[i])) {
                return true;
            }
            if (this._hasBackgroundImage(all_children[i])) {
                return true;
            }
        }
        return false;
    },

    _hasDirectTextChild: function (elem) {
        var nodes = elem.childNodes;
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].nodeType === 3) { // text node
                var text = nodes[i].data;
                text = text.trim();
                if (text.length > 0) {
                    return true;
                }
            }
        }
        return false;
    },

    _hasBackgroundImage: function (elem) {
        var backgroundImg = getComputedStyle(elem, null).backgroundImage;
        if (backgroundImg.length > 0 && backgroundImg !== "none") {
            return true;
        }
        return false;
    },


    _getAttributes: function (elem, msg) {
        var attrs = msg._data.attribute;
        return Util.map(attrs, function (attr) {
            var value = elem.getAttribute(attr);
            if (!value) {
                if (attr == "tagName") {
                    value = elem["tagName"] || "";
                } else {
                    value = "";
                }
            }
            return value;
        }, this);
    },

    _getCSSValues: function (elem, msg) {
        var style = getComputedStyle(elem, null);
        var attrs = msg._data.style;
        return Util.map(attrs, style.getPropertyValue.bind(style));
    },

    _getImageParentAnchor: function () {
        var parent = this._elem.parentNode;
        var tagsAllowedInPath = ["FONT", "B", "I", "STRONG", "DIV", "NOBR", "EM", "DD", "CENTER", "SPAN"];
        // TODO:
        //var untilTop = REG_VAL_CHECK_IMAGE_LINK_UP_UNTIL_TOP;

        while (parent) {
            if (parent.tagName === "A") {
                return parent;
            }
            /*
                if (!untilTop) {
                    break;
                }
            */
            if (tagsAllowedInPath.indexOf(parent.tagName) === -1) {
                break;
            }
            parent = parent.parentNode;
        }
        return null;
    },

    _getParentAO: function (elem) {
        // in the case of regular object direct parent may be general, so we need to get next element
        for (var parent = elem.parentElement; parent; parent = parent.parentElement) {
            var pao = content.kitsManager.createAO(parent, this._parentID, true); // don't create default AO
            if (pao)
                return pao;
        }
        return null;
    },

    _pointRelativeToElem: function (pos) {
        return ContentUtils.pointRelativeToElem(this._elem, pos);
    },

    _pan: function (start, delta, interval, steps, msg, callback) {
        this._logger.trace("_pan ", [start, delta, interval, steps]);
        var point = this._pointRelativeToElem(start);

        var sim = new SimulateGesture();
        sim.addTouch(this._elem, point);
        var wrappedCallback = ContentUtils.protectCallbackAgainstPrematureNavigation(callback, msg, this._logger, 'Pan');
        helper(0);
        return;

        function helper(step) {
            var scale = step / steps;
            var pos = {
                x: point.x + delta.x * scale,
                y: point.y + delta.y * scale
            };
            sim.move([pos]);

            if (step === steps) {
                sim.removeTouches();
                wrappedCallback(msg);
            }
            else
                Util.setTimeout(helper, interval, step + 1);
        }
    },

    getParent: function () {
        return this._getParentAO(this._elem);
    },
    isObjSpyable: function () {
        return true;
    },
	getControlLearnType: function () {
        return ControlLearnType.Yes;
    },
    getChildrenLearnType: function () {
        return ChildrenLearnType.Yes;
    },
    UseEventConfiguration: function (event) {
        return true;
    },
    setOuterAO: function (ao){
        this._outerAO = ao;
    },
    getRecordAO: function () {
        return this._outerAO || this;
    }
};
