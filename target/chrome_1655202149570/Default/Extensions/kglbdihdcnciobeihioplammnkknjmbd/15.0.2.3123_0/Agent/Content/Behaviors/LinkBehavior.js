var LinkBehavior = {
    _micclass: ["Link", "Hyperlink", "Text"],
    _attrs: {
        href: function () {
            return decodeURI(this._elem.href) || "";
        },
        url: function () {
            return this.GetAttrSync("href");
        },
        target: function () {
            return this._elem.target || "";
        },
        color: function () {
            return getComputedStyle(this._elem, null).color;
        },
        "background color": function () {
            return getComputedStyle(this._elem, null).backgroundColor;
        },
        font: function () {
            var fontFamily = getComputedStyle(this._elem, null).fontFamily;
            fontFamily = (fontFamily === "''") ? "" : fontFamily;
            return fontFamily;
        },
        innertext: function () {
            return Util.cleanTextProperty(this._elem.textContent);
        },
        data: function () {
            return this.GetAttrSync("text");
        },
        name: function () {
            return Util.cleanTextProperty(this._elem.textContent||"");
        },
        text: function () {
            return this.GetAttrSync("name");
        }
    },
    _handlerFunc: function(recorder, ev) {
        if (ev.type === 'click') {
            recorder.sendRecordEvent(this, ev, {
                event: 'onclick',
                'event point': { x: ev.clientX, y: ev.clientY },
            });
            return true;
        }
    },
    _eventHandler: function (recorder, ev) {
        this._logger.trace('Link.eventHandler: Received recordable event on ' + this._elem.tagName + ': ' + ev.type);
		if (ContentUtils.isTouchEnabled())
            return LinkBehavior._eventHandlerTouchEnabled.call(this, recorder, ev);

        return LinkBehavior._handlerFunc.call(this, recorder, ev);
    },
    _eventHandlerTouchEnabled: function(recorder, ev) {
        this._logger.trace('Link._eventHandlerTouchEnabled: Received recordable event: ' + ev.type);
        return LinkBehavior._handlerFunc.call(this, recorder, ev);
    },
    _gestureHandler: function (recorder, gestureInfo) {
        this._logger.trace('Link._gestureHandler: Received gesture: ' + gestureInfo.event);
        return gestureInfo.event === "tap"; // Do not record Tap gestures, since we are recording Click
    },
    _helpers: {
        isLearnable: Util.alwaysTrue,
    }
};