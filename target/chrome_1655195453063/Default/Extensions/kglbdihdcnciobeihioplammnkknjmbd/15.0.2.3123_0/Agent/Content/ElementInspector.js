function ElementInspector(frameId) {
    this._init(frameId);
}

ElementInspector.prototype = {
    _logger: null,
    _frameId: null,
    _handlers: null,
    _outliner: null,
    _spyOptions: null,

    _init: function (frameId) {
		this._logger = new LoggerUtil("Content.ElementInspector");
		this._frameId = frameId;
		this._handlers = {};
        this._spyOptions = {};
		var mouseEvents = ['click', 'dblclick', 'mousedown', 'mouseup', 'mouseover'];
		var defaultHandler = this._eventHandler.bind(this);
		mouseEvents.forEach(function (name) {
			this._handlers[name] = defaultHandler;
		}, this);

		this._handlers.mousemove = this._mouseMove.bind(this);

		this._handlers.mouseout = this._mouseOut.bind(this);
		this._handlers.keydown = this._keyDown.bind(this);
		this._handlers.keyup = this._keyUp.bind(this);
		this._handlers.contextmenu = this._contextMenu.bind(this);
    },

    startSpy: function (msg,resultCallback) {
        this._internalStartSpy(msg._data);
        if (resultCallback) {
            resultCallback(msg);
        }
    },

    _internalStartSpy:function(spyOptions){
        this._logger.trace("startSpy: called with options", spyOptions);
        this._spyOptions = spyOptions || {};
        this._outliner = new ContentUtils.ElementBorder();
        this._outliner.run(function (elem) { elem.style.cursor = 'pointer'; });

        Object.keys(this._handlers).forEach(function (h) { document.addEventListener(h, this._handlers[h], true); }, this);
    },

    stopSpy: function (msg,resultCallback) {
        this._internalStopSpy();
        resultCallback(msg);
    },

    _internalStopSpy:function(){
        this._logger.trace("stopSpy: called");
        this._spyOptions = {};
        if (this._outliner) {
            this._outliner.remove();
            this._outliner = null;
        }

        Object.keys(this._handlers).forEach(function (h) { document.removeEventListener(h, this._handlers[h], true); }, this);
    },

    _shouldFilterEvent: function (ev) {
        return ev.metaKey || ev.ctrlKey;
    },

    _eventHandler: function (ev) {
        this._logger.trace('_eventHandler: called');
        if (this._shouldFilterEvent(ev)) {
            this._logger.trace('handler is paused, exiting');
            return;
        }

        ev.stopPropagation();
        ev.preventDefault();

        if (ev.type === 'mouseup' && ev.button === 2){ // Cancel spy on right mouse button click
            this._logger.trace("keyDownHandler: Cancelling Spy");
            var inspectAutMsg = new Msg("EVENT_INSPECT_CANCEL", content.dispatcher.getParentDispatcherID(), {});
            content.dispatcher.sendEvent(inspectAutMsg);
            return false;
        }

        if (ev.type === 'click') {
            this._inspect(ev);
        }
    },

    _addTitle: function (elem) {
        var titleBuilder = this._titleBuilders[this._spyOptions.outlinerTitleMode] || this._titleBuilders.uft;
        var self = this;

        titleBuilder.call(this, elem, function(title){
            self._outliner.run(function (overlay) { overlay.title = title; });
        });        
        
    },

    _titleBuilders: {
        uft: function (elem, callback) {
            var ao = content.kitsManager.createAO(elem, this._frameId);
            ao.GetAttr('micclass', null, function (micclasses) {
                var micclass = Array.isArray(micclasses) ? micclasses[0] : micclasses;
                var title =  'Class Name: ' + micclass + '\nhtml tag: ' + elem.tagName;
                callback(title);
            });
        },

        // Display tooltip with translation for micclass and property names and configurable property set per class. The tooltip looks like
        // class name : logical name
        // property name : property value
        // property name : property value
        //
        // The configuration should be of the form 
        // {
        //   <micclass (lower case)> : {
        //     dispalyName: string,
        //     properties:{
        //        propName: {
        //          displayName: string
        //        },
        //        *
        //     }
        //   },
        //   *
        // }  
        leanft: function (elem, callback) {
            var ao = content.kitsManager.createAO(elem, this._frameId);
            var self = this;
            ao.QUERY_ATTR({_data:{'micclass':null,"logical name":null}}, function (result) {
                var data = result._data || {};
                var micclasses = data.micclass;
                var logicalName = data["logical name"] || "";
                // Make sure name is not too long.
                logicalName = logicalName.substring(0,30);
                var micclass = Array.isArray(micclasses) ? micclasses[0] : micclasses;
                var classConfig = self._getClassConfig(micclass);

                if (!classConfig) {
                    self._logger.debug("_titleBuilders.leanFT: class without config ", micclass);
                    title = micclass + " : " + logicalName;
                    callback(title);
                    return;
                }

                self._logger.debug("_titleBuilders.leanFT: Using classConfig ", classConfig);
                
                // Display the class name according to the config
                var leanFtClass = classConfig.displayName || micclass;
                var title = leanFtClass;

                if (logicalName) {
                    title = title + " : " + logicalName; 
                }
                title = title + "\n";

                // Add properties to the tooltip according to configuration for the class.

                // Collect properties to query from AO and add to tooltip 
                var props = {};
                var propsConfig = classConfig.properties || {};

                var propsToQuery = Object.keys(propsConfig).forEach(function(propName) {
                    props[propName] = null;
                });
                ao.QUERY_ATTR({_data: props}, function (propsResult){
                    Object.keys(propsResult._data).forEach(function(propName){
                        var propVal = propsResult._data[propName];

                        // don't show empty properties
                        if (propVal == null || propVal === "") {
                            return;
                        }

                        // diplay property name according to the config
                        var propTitle = propsConfig[propName].displayName || propName;

                        // Since we display in tooltip shorten properties with long values like innerText.
                        propVal = propVal.toString();
                        var MAX_PROP_VAL_LENGTH = 50;
                        if (propVal.length > MAX_PROP_VAL_LENGTH) {
                            propVal = propVal.substring(0,MAX_PROP_VAL_LENGTH -3) + "...";
                        }
                        title = title + "\n" + propTitle + ": " + propVal;
                    });
                    callback(title);
                });
            });
        }
    },

    _getClassConfig: function(micclass) {
        var translationTable = this._spyOptions.classTranslation || {};
        return translationTable[micclass.toLowerCase()] || {properties:{}}; 
    },

    _inspect: function (ev) {
        this._outliner.hide();
        var point = { x: ev.clientX, y: ev.clientY };
        this._getObjectFromClientPoint(point, function (resMsg) {
            this._logger.trace("_inspect: QUERY_OBJ_CLIENT_POINT_TO_ID result: ", resMsg);
            var webIdsArr = resMsg._data.WEB_PN_ID;

            if (!Array.isArray(webIdsArr) || webIdsArr.length < 1) {
                this._logger.trace("_inspect: QUERY_OBJ_CLIENT_POINT_TO_ID didn't return any Runtime Ids");
                return;
            }

            this._dispatchInspectMsg(webIdsArr.pop());
        }.bind(this));
    },

    _getObjectFromClientPoint: function (point, resultCallback) {
        var queryClientPointMsg = new Msg("QUERY_OBJ_CLIENT_POINT_TO_ID", Util.shallowObjectClone(this._frameId), { pos: point });
        queryClientPointMsg.isCoordinatesRelativeToFrame = true;
        content.dispatcher.sendMessage(queryClientPointMsg, null, null, resultCallback);
    },

    _mouseMove: function (ev) {
        if (this._shouldFilterEvent(ev)) {
            this._outliner.hide();
            return;
        }
        var elem = this._internalMouseMove(ev);

        if (!elem)
            return;
			
        if (this._outliner.wrap(elem))
            this._addTitle(elem);

        this._outliner.show();
    },

    _internalMouseMove:function(ev){
        ev.stopPropagation();
        ev.preventDefault();

        this._outliner.hide(); // allow getting the real element by hiding the outliner
        var elem = document.elementFromPoint(ev.clientX, ev.clientY);
        if (elem.tagName === 'IFRAME')
            return;// If entering a frame, don't need to show rect on outer document
			
        return elem;
    },

    _mouseOut: function (ev) {
        if (!ev.relatedTarget) // if the related target is undefined it means it's part of another document
            this._outliner.hide();
    },

    _dispatchInspectMsg: function (rtid) {
        this._logger.trace("_dispatchInspectMsg: called");
        var inspectAutMsg = new Msg("EVENT_INSPECT_ELEMENT", content.dispatcher.getParentDispatcherID(), { WEB_PN_ID: [rtid] });

        content.dispatcher.sendEvent(inspectAutMsg);
    },

    _keyDown: function (ev) {
        if (ev.keyCode === 27) { // ESC
            this._logger.trace("_keyDown: Esc key - cancelling Spy");
            var inspectAutMsg = new Msg("EVENT_INSPECT_CANCEL", content.dispatcher.getParentDispatcherID(), {});
            content.dispatcher.sendEvent(inspectAutMsg);
            return;
        }

        if (this._shouldFilterEvent(ev)) {
            this._outliner.hide();
        }
    },

    _keyUp: function (ev) {
        if (this._shouldFilterEvent(ev)) {
            this._outliner.show();
        }
    },

    _contextMenu: function(ev) {
        this._logger.trace('_contextMenu: called');
        if (this._shouldFilterEvent(ev)) {
            this._logger.trace('handler is paused, exiting');
            return true;
        }

        // contextMenu can be opened by rightclicking or by pressing the context menu key.
        // At least in chrome even when pressing the context menu key the event comes with button==2
        // so we do our best to cancel all context menus during spy. 
        // User can still hold down control to enable context menus.

        this._logger.debug('_contextMenu: cnacelling context menu');
        ev.stopPropagation();
        ev.preventDefault();
    }
};