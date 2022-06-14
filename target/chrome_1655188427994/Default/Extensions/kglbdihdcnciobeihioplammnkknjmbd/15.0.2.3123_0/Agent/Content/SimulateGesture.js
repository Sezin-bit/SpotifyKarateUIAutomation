function SimulateGesture() {
    this._logger = new LoggerUtil('Content.SimulateGesture');
    this._touches = [];
}

SimulateGesture.prototype = {
    _logger: null,
    _touches: null,

    addTouch: function (elem, pos) {
        var touch = this._touchInfo(elem, pos || ContentUtils.getCenterPoint(elem), Date.now());
        this._touches.push(touch);
        
        return this._dispatchTouch('touchstart', elem, this._touches, [touch]);
    },

    move: function (positions) {
        if (positions.length !== this._touches.length) {
            Util.assert(false, "mismatch between touch and positions count", this._logger);
            return;
        }

        positions.forEach(function (pos, i) { // Update locations
            this._touches[i].pos = pos;
        }, this);

        return this._dispatchTouch('touchmove', this._touches[0].elem, this._touches, this._touches);
    },

    removeTouches: function () {
        var notCancled = true;
        while (this._touches.length) {
            var touch = this._touches.pop();
            var curr = this._dispatchTouch('touchend', touch.elem, this._touches, [touch]);
            notCancled = notCancled && curr; // note seperate lines to avoid boolean short circuting
        }
        return notCancled;
    },

    _touchInfo: function(element, pos, id) {
        return {
            elem: element,
            pos: pos,
            id: id,
        };
    },

    _dispatchTouch: function (type, elem, touches, changed) {
        var originalElemId = elem.id || '';
        var idWasCreated = ensureHasId(elem, 'target');
        try {
            var safeTouches = serializableTouches(touches);
            var safeChanged = serializableTouches(changed);
            return ContentUtils.runOnDocSync(dispatchTouchEvent, [type, elem.id, safeTouches, safeChanged]);
        }
        finally {
            if (idWasCreated)
                elem.id = originalElemId;
            touches.forEach(clearIdIfNeeded);
            changed.forEach(clearIdIfNeeded);
        }

        return; // not reached
        // Helper functions
        function ensureHasId(elem, hint) {
            if (elem.id) {
                if (elem === ContentUtils.getElementById(document, elem.id))
                    return false;
            }

            elem.id = '__fakeIdForUFT#' + hint;
            return true;
        }

        function clearIdIfNeeded(t) {
            if (t.definedId) {
                t.elem.id = t.originalElemId;
                t.definedId = false;
            }
        }

        function serializableTouches(touches) {
            return touches.map(function (t) {
                t.originalElemId = t.elem.id || '';
                t.definedId = ensureHasId(t.elem, t.id);

                return {
                    elemId: t.elem.id,
                    touchId: t.id,
                    pos: t.pos,
                };
            });
        }

        function dispatchTouchEvent(type, elemId, safeTouches, safeChanged) {      
            var element = ContentUtils.getElementById(document, elemId);

            var event = document.createEvent('Event');
            event.initEvent(type, true, true);

            event.touches = createTouchList(safeTouches);
            event.changedTouches = createTouchList(safeChanged);
            event.targetTouches = createTouchList(safeTouches);
            event.view = event.view || document.defaultView;

            return element.dispatchEvent(event);

            // Helper functions
            function createTouchList(touches) {
                var serialized = touches && touches.map(function (t) {
                    var elem = ContentUtils.getElementById(document, t.elemId);
                    var touch = createTouch(elem, t.pos.x, t.pos.y, t.touchId);
                    return touch;
                });

                if (document.createTouchList) {
                    if (serialized && serialized.length) {
                        return document.createTouchList.apply(document, serialized);
                    }
                    else { //create empty touch list
                        return document.createTouchList();
                    }
                }

                return Array.isArray(serialized) ? serialized : [serialized];
            }

            function createTouch(element, x, y, touchId) {
                var pageX = document.body.scrollLeft + x;
                var pageY = document.body.scrollTop + y;
                var touchInfo = {
                    view: window,
                    target: element,
                    identifier: touchId,
                    pageX: pageX,
                    pageY: pageY,
                    clientX: x,
                    clientY: y
                };

                if (document.createTouch)
                    return document.createTouch(window, element, touchId, pageX, pageY, x, y);
                
                if (typeof(Touch) === 'function')
                    return new Touch(touchInfo);

                return touchInfo;
            }
        }
    },
};