CommonBehavior._methods["Exist"] = function (timeout, response, resultCallback) {
    this._logger.info('call CommonBehavior.Exist function');
    PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OK);
    resultCallback(response);
};
CommonBehavior._methods["CaptureBitmap"] = function (fullFileName, overrideExisting, sendToReport, response, resultCallback) {
    this._logger.info('call CommonBehavior.CaptureBitmap function');
    var msgMakeVisible = new Msg(MSG_TYPES.SRVC_MAKE_OBJ_VISIBLE, Util.shallowObjectClone(this._parentID), { "disable browser popup": undefined });
    this.SRVC_MAKE_OBJ_VISIBLE(msgMakeVisible, function () {
        PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OK);
        resultCallback(response);
    }.bind(this));
};
CommonBehavior._methods["GetROProperties"] = function (properties, response, resultCallback) {
    this._logger.info('call CommonBehavior.GetROProperties function');
    var propsObj = {};
    properties.forEach(function (propName) {
        propsObj[propName] = null;
    }, this);
    var propsQueryMsg = new Msg("QUERY_ATTR", this.getID(), propsObj);
    this.QUERY_ATTR(propsQueryMsg, function(propsResponseMsg){
        PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OK);
        response.result = propsResponseMsg._data;
        for (var key in response.result) {
            if(response.result[key] === undefined)
                response.result[key] = null;
        }
        var testObject = PlayerUtil.getTargetTestObject(response["testObject"]);
        if(Util.isNullOrUndefined(testObject["Description properties"]["additionalInfo"]))
            testObject["Description properties"]["additionalInfo"] = {};
        Util.extend(testObject["Description properties"]["additionalInfo"], propsResponseMsg._data);
        resultCallback(response);
    }.bind(this));
};
CommonBehavior._methods["GetAllROProperties"] = function (properties, response, resultCallback) {
    this._logger.info('call CommonBehavior.GetAllROProperties function');
    CommonBehavior._methods["GetROProperties"].call(this, properties, response, resultCallback);
};
CommonBehavior._methods["GetROProperty"] = function (property, response, resultCallback) {
    this._logger.info('call CommonBehavior.GetROProperty function');
    var properties = [property];
    CommonBehavior._methods["GetROProperties"].call(this, properties, response, resultCallback);
};

CommonBehavior._methods["Click"] = function(x, y, button, response, resultCallback) {
    if (this.GetAttrSync("disabled") === 1) {
        PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OBJECT_DISABLED);
        resultCallback(response);
        return;
    }
    var btnCode = 0;
    var buttonMap = {
        "micLeftBtn": 0,
        "micRightBtn": 1,
        "micMiddleBtn": 2
    };
    if (typeof button === "string") {
        btnCode = Util.isNullOrUndefined(buttonMap[button]) ? 0 : buttonMap[button];
    } else if (typeof button === "number") {
        btnCode = button;
    }
    // We don't want to wait for the response, but return immediately
    //var wrappedCallback = ContentUtils.protectCallbackAgainstPrematureNavigation(resultCallback, response, this._logger, 'WEB_CLICK_EX');
    //wrappedCallback(response);
    PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OK);
    resultCallback(response);
    var msgMakeVisible = new Msg(MSG_TYPES.SRVC_MAKE_OBJ_VISIBLE, Util.shallowObjectClone(this._parentID), { "disable browser popup": undefined });
    this.SRVC_MAKE_OBJ_VISIBLE(msgMakeVisible, function () {
        this._fireEvent(this._elem, "click", {"x": x, "y": y, "event button": btnCode, "AN_METHOD_NAME": "WEB_CLICK_EX"});
    }.bind(this));
};

CommonBehavior._methods["MiddleClick"] = function( x, y, response, resultCallback) {
    CommonBehavior._methods["Click"].call(this, x, y, "micMiddleBtn", response, resultCallback);
};

CommonBehavior._methods["RightClick"] = function(x, y, response, resultCallback) {
    CommonBehavior._methods["Click"].call(this, x, y, "micRightBtn", response, resultCallback);
};

CommonBehavior._methods["DoubleClick"] = function(interval, x, y, response, resultCallback) {
    var wrappedCallback = ContentUtils.protectCallbackAgainstPrematureNavigation(resultCallback, response, this._logger, 'DblClick');
    var requestObj = {
        "AN_METHOD_NAME":"WEB_DOUBLE_CLICK", 
        "duration": interval, 
        "pos": {"x": x, "y":y}
    }
    this._fireEvent(this._elem, 'click', requestObj);
    Util.setTimeout(function (self) {
        self._fireEvent(self._elem, 'click', requestObj);
        self._fireEvent(self._elem, 'dblclick', requestObj);
        PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OK);
        wrappedCallback(response);
    }, interval, this);
};
CommonBehavior._methods["FireEvent"] = function(eventName, x, y, button, response, resultCallback) {
    //Don't wait for the response, return immediately
    PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OK);
    resultCallback(response);
    var buttonMap = {
        "micLeftBtn": 0,
        "micMiddleBtn": 1,
        "micRightBtn": 2
    };
    var btnCode = Util.isNullOrUndefined(buttonMap[button]) ? 0 : buttonMap[button];
    var event = eventName.toLowerCase().replace(/^on/, "");
    var requestObj = {
        "event": event,
        "x": x,
        "y": y,
        "event button": btnCode,
        "keycode": btnCode
    };
    this._fireEvent(this._elem, event, requestObj);
};
CommonBehavior._methods["LongPress"] = function(duration, x, y, response, resultCallback) {
    var point = this._pointRelativeToElem({"x":x, "y":y});
    var element = this._elem;

    // Do the callback first so UFT doesn't hang if the browser does something between setTimeouts
    if (!ContentUtils.isTouchEnabled()) {
        PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.TOUCH_NOT_ENABLED);
        resultCallback(response);
        return;
    }

    var wrappedCallback = ContentUtils.protectCallbackAgainstPrematureNavigation(resultCallback, response, this._logger, 'LongTap');
    var sim = new SimulateGesture();
    sim.addTouch(element, point);
    Util.setTimeout(function () {
        sim.removeTouches();
        PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OK);
        wrappedCallback(response);
    }, duration);
};
CommonBehavior._methods["HoverTap"] = function(x, y, response, resultCallback) {
    if (ContentUtils.isTouchEnabled()) {
        this._fireEvent(this._elem, 'click', {"x":x, "y":y});
    }
    else {
        ['mouseover', 'mouseenter', 'mousemove'].forEach(function (event) {
            this._fireEvent(this._elem, event, {"x":x, "y":y});
        }, this);
    }
    PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OK);
    resultCallback(response);
};
CommonBehavior._methods["Pan"] = function(deltaX, deltaY, duration, startX, startY, response, resultCallback) {
    if(!ContentUtils.isTouchEnabled()) {
        PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.TOUCH_NOT_ENABLED);
        resultCallback(response);
        return;
    }
    var interval = 50;
    var steps = Math.max(Math.floor(duration / interval), 1);
    PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OK);
    this._pan({"x": startX, "y": startY}, {"x": deltaX, "y": deltaY}, interval, steps, response, resultCallback);
};
CommonBehavior._methods["Swipe"] = function(direction, distance, duration, startX, startY, response, resultCallback) {

    var delta = computeDelta(direction, distance);
    var interval = 50;
    var steps = Math.max(Math.floor(duration / interval), 1);
    // Do the callback first so UFT doesn't hang if the browser does something between setTimeouts
    if(!ContentUtils.isTouchEnabled()) {
        PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.TOUCH_NOT_ENABLED);
        resultCallback(response);
        return;
    }
    PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OK);
    this._pan({"x": startX, "y": startY}, delta, interval, steps, response, resultCallback);

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
}
CommonBehavior._methods["Pinch"] = function (scale, duration, x, y, response, resultCallback) {
    if(!ContentUtils.isTouchEnabled()) {
        PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.TOUCH_NOT_ENABLED);
        resultCallback(response);
        return;
    }
    var point = this._pointRelativeToElem({"x": x, "y": y});
    var element = this._elem;

    var interval = 50; // Between moves and start/end
    var totalSteps = Math.max(Math.floor(duration / interval) - 2, 1); // -2 for start and end
    // Total time may be a little off if very short duration is specified

    var wrappedCallback = ContentUtils.protectCallbackAgainstPrematureNavigation(resultCallback, response, this._logger, 'Pinch');

    var rect = element.getBoundingClientRect();

    // From measurement the fingers in a typical pinch starts about 100 pixels apart
    // If we assume the distance is the same on the x/y axes then each finger is ~35 pixels away from the center on each axis
    // sqrt(35^2 * 2)*2 is closest to 100
    var defaultDelta = 35;

    // Ensure the points begin in the element's rectangle
    var deltaX = Math.min(defaultDelta, Math.abs(point.x - rect.left), Math.abs(rect.right - point.x));
    var deltaY = Math.min(defaultDelta, Math.abs(point.y - rect.top), Math.abs(rect.bottom - point.y));

    var first = { x: point.x - deltaX, y: point.y - deltaY };
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
                PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OK);
                wrappedCallback(response);
            }, interval);
        }
        else {
            Util.setTimeout(moveTouch, interval, step + 1);
        }
    }
};

CommonBehavior._methods["Submit"] = function(response, resultCallback) {
    PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OK);
    resultCallback(response);
    this._fireEvent(this._elem, "submit", {"event": "onsubmit"});
};

CommonBehavior._FormatBehavior = PlayerMethodFormat["Common"];