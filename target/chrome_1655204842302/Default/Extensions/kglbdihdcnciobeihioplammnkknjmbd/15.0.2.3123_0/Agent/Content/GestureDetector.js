function GestureDetector() {
    this._logger = new LoggerUtil('Content.GestureDetector');
    this._detectors = [this.SwipePanDetector, this.TapDetector, this.PinchDetector].map(function (detector) {
        return new detector(this);
    }, this);

    var handler = this._addEvent.bind(this);
    ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(function (name) {
        window.addEventListener(name, handler, true);
    }, this);
    
    // Add a dummy listener to touchstart on document, which solves following issue:
    // With Safari/iOS, our touch event listeners are not triggered, until add touch
    // event listener on document, or some operation on control like combo-box, pop-up.
    // 
    document.addEventListener('touchstart', Util.identity, true);

    this._listeners = [];

    this._logger.trace('GestureDetector created');
}


GestureDetector.prototype = {
    _logger: null,
    _detectors: null,
    _listeners: null,

    fireEvent: function (event, info) {
        
        var eventTarget;
        if (ShadowDomUtil.isOpenShadowRoot(event.target)) {
            eventTarget = ShadowDomUtil.getElemInShadowRootByPoint(event.target, { x: info.clientX, y: info.clientY }, this._logger);
        }
        eventTarget = eventTarget ||event.target;
        this._listeners.forEach(function (listener) {
            listener(eventTarget, info);
        });

        // No other detector should detect a gesture for this event
        this._detectors.forEach(function (d) {
            d.discard();
        });
    },

    addListener: function (listener) {
        if (this._listeners.indexOf(listener) === -1)
            this._listeners.push(listener);
    },

    isSingleTouch: function (event) {
        return event.touches && event.touches.length === 1;
    },

    _addEvent: function (e) {
        switch (e.type) {
            case 'touchstart':
                this._detectors.forEach(function (d) { d.touchStart(e); });
                break;
            case 'touchmove':
                this._detectors.forEach(function (d) { d.touchMove(e); });
                break;
            case 'touchend':
                this._detectors.forEach(function (d) { d.touchEnd(e); });
                break;
            case 'touchcancel':
                this._detectors.forEach(function (d) { d.touchCancel(e); });
                break;
            default:
                this._logger.warn('addEvent: unexpected event type - ' + e.type);
        }
    },
};


/**************************************************************************************************************************/
/****************************************************   SWIPE/PAN   *******************************************************/
/**************************************************************************************************************************/
GestureDetector.prototype.SwipePanDetector = function (owner) {
    this._owner = owner;
    this._logger = new LoggerUtil('Content.SwipePanDetector');
    this._logger.trace("Created");
};

GestureDetector.prototype.SwipePanDetector.prototype = {
    _owner: null,
    _logger: null,
    _info: null,

    _constants: {
        minDistance: 50,
        maxOffsetRatio: 0.20, // the ratio between the horizontal and vertical distances to use when calculating the max offset
        initialMaxOffset: 30,  // the minimum offset value
        maxDuration: 1500,
        maxScroll: 50, // If the page is scrolled do not record swipe
    },

    discard: function () {
        this._info = null;
    },

    _deltaX: function () {
        return Math.abs(this._info.startX - this._info.x);
    },

    _deltaY: function () {
        return Math.abs(this._info.startY - this._info.y);
    },

    _rectArea: function (rect) {        
        return rect.width * rect.height;
    },

    touchStart: function (e) {
        if (!this._owner.isSingleTouch(e)) {
            return;
        }

        if (this._info)
            this._logger.warn('touchStart: Overwriting existing touch event');

        var touch = e.touches[0];
        var rect = e.target.getBoundingClientRect();
        this._info = {
            direction: null,
            target: e.target,
            start: e.timeStamp,
            startX: touch.pageX,
            startY: touch.pageY,
            startScrollPosition: { x: window.scrollX, y: window.scrollY },
            startPosition: { left: rect.left, top: rect.top }, // check if element moved (e.g. sliders)
        };
    },

    touchMove: function (e) {
        if (!this._info)
            return;

        if (!this._owner.isSingleTouch(e))
            return this.discard();

        var duration = (e.timeStamp - this._info.start);
        if (duration > this._constants.maxDuration) {
            this._logger.trace('touchMove: Timeout exceeded ' + duration); 
            return this.discard();
        }

        this._processTouch(e.touches[0]);
    },

    touchEnd: function (e) {
        if (this._info && e.changedTouches.length && this._processTouch(e.changedTouches[0]) && this._shouldFire(e))
            this._fireEvent(e);
        else
            this.discard();
    },

    touchCancel: function (e) {
        this.touchEnd(e); // treat cancel as end
    },

    _processTouch: function (touch) {
        if (!this._info)
            return false;

        this._info.x = touch.pageX;
        this._info.y = touch.pageY;

        switch (this._info.direction) {
            case null:
                if (this._deltaX() > this._constants.minDistance) {
                    if (this._deltaY() > this._getMaxOffset(this._deltaX())) {
                        this._logger.trace('_processTouch: Not swipe, too much offset ' + this._deltaY() + ' - current distance: ' + this._deltaX());
                        return this._markAsDiagonal();
                    }

                    this._logger.trace('_processTouch: Deducing Swipe direction to be horizontal');
                    this._info.direction = 'horizontal';
                    return true;
                }

                if (this._deltaY() > this._constants.minDistance) {
                    if (this._deltaX() > this._getMaxOffset(this._deltaY())) {
                        this._logger.trace('_processTouch: Not swipe, too much offset ' + this._deltaX() + ' - current distance: ' + this._deltaY());
                        return this._markAsDiagonal();
                    }

                    this._logger.trace('_processTouch: Deducing Swipe direction to be vertical');
                    this._info.direction = 'vertical';
                    return true;
                }
                return true; // Wait and see

            case 'vertical':
                if (this._deltaX() > this._getMaxOffset(this._deltaY())) {
                    this._logger.trace('_processTouch: Not vertical swipe, too much offset ' + this._deltaX() + ' - current distance: ' + this._deltaY());
                    return this._markAsDiagonal();
                }
                return true;

            case 'horizontal':
                if (this._deltaY() > this._getMaxOffset(this._deltaX())) {
                    this._logger.trace('_processTouch: Not horizontal swipe, too much offset ' + this._deltaY() + ' - current distance: ' + this._deltaX());
                    return this._markAsDiagonal();
                }
                return true;
            case 'diagonal':
                return true;
            default:
                this._logger.error('_processTouch: unexpected direction: ' + this._direction);
        }
        return true;
    },

    _markAsDiagonal: function () {
        this._info.direction = 'diagonal';
        return true;
    },

    _getMaxOffset: function(currentDistance) {
        return Math.max(this._constants.initialMaxOffset, this._constants.maxOffsetRatio * currentDistance);
    },

    _updateDirectionFromElementMotion: function(e) {
        // If the element has moved (like a slider) don't take minimums into account
        if (e.target === this._info.target) { // Consider element moved if the start and end are on the same element
            
            var rect = e.target.getBoundingClientRect();
            
            if (this._info.startPosition.left !== rect.left && this._info.startPosition.top === rect.top) {
                if (this._deltaX() === 0) 
                    return false;
                    
                this._logger.trace('_updateDirectionFromElementMotion: direction is horizontal due to offset change of ' + (this._info.startPosition.left - rect.left));
                this._info.direction = 'horizontal';
                return true;
            }
            
            if (this._info.startPosition.left === rect.left && this._info.startPosition.top !== rect.top) {
                if (this._deltaY() === 0) 
                    return false;
                    
                this._logger.trace('_updateDirectionFromElementMotion: direction is vertical due to offset change of ' + (this._info.startPosition.top - rect.top));
                this._info.direction = 'vertical';
                return true;
            }
        }
    },

    _didScrollingOccur: function(e) {
        // Do not record the default web scrolling
        var startScrollPosition = this._info.startScrollPosition;
        var scrollX = startScrollPosition.x - window.scrollX;
        if (Math.abs(scrollX) > this._constants.maxScroll) {
            this._logger.debug('_didScrollingOccur: window has scrolled horizontaly by ' + scrollX);
            return true;
        }

        var scrollY = startScrollPosition.y - window.scrollY;
        if (Math.abs(scrollY) > this._constants.maxScroll) {
            this._logger.debug('_didScrollingOccur: window has scrolled vertically by ' + scrollY);
            return true;
        }

        return false;
    },

    _shouldFire: function(e) {
        if (!this._info)
            return false;

        if (this._didScrollingOccur(e))
            return false;

        if (!this._info.direction) {
            // If no direction then we're under the minimum  but allow swipe if the element has moved (e.g slider)
            if (this._updateDirectionFromElementMotion(e)) 
                return true;
        }

        switch (this._info.direction) {
            case 'horizontal':
                if (this._deltaX() < this._constants.minDistance) {
                    if (this._deltaY() > this._constants.minDistance) {
                        this._logger.trace('_shouldFire: Changing from horizontal swipe to pan');
                        return this._markAsDiagonal();
                    }
                    this._logger.trace('_shouldFire: Not horizontal swipe, distance has shrunk');
                    return false;
                }
                return true;
            case 'vertical':
                if (this._deltaY() < this._constants.minDistance) {
                    if (this._deltaX() > this._constants.minDistance) {
                        this._logger.trace('_shouldFire: Changing from vertical swipe to pan');
                        return this._markAsDiagonal();
                    }
                    this._logger.trace('_shouldFire: Not vertical swipe, distance has shrunk');
                    return false;
                }
                return true;
            case null:
            case 'diagonal':
                if (this._deltaX() > this._constants.minDistance ||
                    this._deltaY() > this._constants.minDistance) {
                    this._logger.trace('_shouldFire: Pan over minDistance');
                    return this._markAsDiagonal();
                }
                this._logger.trace('_shouldFire: with direction ' + this._info.direction + ' still under minDistance');
                return false;
            default:
                this._logger.error('_shouldFire: unexpected direction: ' + this._info.direction);
        }

        return false;
    },

    _fireEvent: function (e) {
        var direction;
        var distance;

        switch (this._info.direction) {
            case 'horizontal':
                distance = this._info.x - this._info.startX;
                direction = distance > 0 ? 'Right' : 'Left';
                break;
            case 'vertical':
                distance = this._info.y - this._info.startY;
                direction = distance > 0 ? 'Down' : 'Up';
                break;
            case 'diagonal':
                var args = {
                    event: 'pan',
                    x: Math.round(this._info.startX - this._info.x),
                    y: Math.round(this._info.startY - this._info.y),
                    duration: e.timeStamp - this._info.start
                };
                this._logger.trace('_fireEvent: Pan ', args);
                return this._owner.fireEvent(e, args);
        }

        var absDistance = Math.round(Math.abs(distance));

        var args = {
            event: 'swipe',
            direction: 'move' + direction,
            duration: e.timeStamp - this._info.start,
            distance: absDistance
        };
        this._logger.trace('_fireEvent: Swipe ', args);
        this._owner.fireEvent(e, args);
    },
};

/**************************************************************************************************************************/
/*******************************************************   TAP   **********************************************************/
/**************************************************************************************************************************/
GestureDetector.prototype.TapDetector = function (owner) {
    this._owner = owner;
    this._logger = new LoggerUtil('Content.TapDetector');
    this._logger.trace("Created");
};

GestureDetector.prototype.TapDetector.prototype = {
    _owner: null,
    _logger: null,
    _info: null,

    _constants: {
        maxOffset: 10,
        tapMaxTime: 750,
    },

    discard: function () {
        this._info = null;
    },

    touchStart: function (e) {
        if (!this._owner.isSingleTouch(e)) {
            this.discard();
            return;
        }

        if (this._info)
            this._logger.warn('touchStart: overwrting existing info');

        var touch = e.touches[0];
        this._info = {
            x: touch.pageX,
            y: touch.pageY,
            start: e.timeStamp,
        };
    },

    touchMove: function (e) {
        if (!this._info)
            return;

        if (!this._owner.isSingleTouch(e)) {
            this._logger.warn('touchMove: got irrelevant move, should have been discareded in touchStart');
            return this.discard();
        }

        this._processTouch(e.touches[0]);
    },

    touchEnd: function (e) {
        if (this._info && e.changedTouches.length && this._processTouch(e.changedTouches[0])) {
            this._fireEvent(e);
            return;
        }
        this.discard();
    },

    touchCancel: function (e) {
        return this.touchEnd(e);
    },

    _processTouch: function (touch, timeStamp) {
        if ((Math.abs(touch.pageX - this._info.x) > this._constants.maxOffset) ||
            (Math.abs(touch.pageY - this._info.y) > this._constants.maxOffset)) {
            this._logger.trace('touchMove: discarded, too much offset or too little time');
            this.discard();
            return false;
        }

        return true;
    },

    _fireEvent: function (e) {
        var duration = e.timeStamp - this._info.start;
        var eventName = duration < this._constants.tapMaxTime ? 'tap' : 'longTap';

        var args = {
            event: eventName,
            duration: duration,
            clientX: this._info.x,
            clientY: this._info.y
        };

        this._logger.trace('_fireEvent: ', eventName, ' ', args);
        this._owner.fireEvent(e, args);
    },
};

/**************************************************************************************************************************/
/*******************************************************  PINCH  **********************************************************/
/**************************************************************************************************************************/
GestureDetector.prototype.PinchDetector = function (owner) {
    this._owner = owner;
    this._logger = new LoggerUtil('Content.PinchDetector');
    this._logger.trace("Created");
};

GestureDetector.prototype.PinchDetector.prototype = {
    _owner: null,
    _logger: null,
    _info: null,

    _constants: {
        maxOffset: 100, // Move of center point
        minScaleDiff: 0.1,
    },

    discard: function () {
        this._info = null;
    },

    touchStart: function (e) {
        switch (e.touches && e.touches.length) {
            case 1:
                this._info = { start: e.timeStamp };
                break;
            case 2:
                if (!this._info)
                    this._info = { start: e.timeStamp };

                this._info.pos = this._center(e.touches);
                this._info.initialDistance = this._distance(e.touches);
                break;
            default:
                this.discard();
        }
    },

    touchMove: function (e) {
        if (!this._info || !this._info.pos)
            return false;

        if (e.touches.length !== 2) {
            this._logger.trace("touchMove: Discarding pinch, touch count is " + e.touches);
            return this.discard();
        }

        var pos = this._center(e.touches);
        var moved = this._distance([pos, this._info.pos]);
        if (moved > this._constants.maxOffset) {
            this._logger.trace("touchMove: discarding pinch, center point moved by " + moved);
            return this.discard();
        }
        this._info.currentDistance = this._distance(e.touches);
        return true;
    },

    touchEnd: function (e) {
        if (!this._info || !this._info.pos)
            return false;

        if (e.touches.length !== 1) { // remaining touches
            this._logger.trace("touchEnd: discarding pinch, ended with touch count = " + e.touches.length)
            return this.discard();
        }

        var scale = this._info.currentDistance / this._info.initialDistance;
        if (scale && Math.abs(1 - scale) > this._constants.minScaleDiff) {
            var args = {
                event: 'pinch',
                scale: scale,
                duration: e.timeStamp - this._info.start,
            };
            this._logger.trace("touchEnd: recording pinch ", args);
            this._owner.fireEvent(e, args);
        }
        else {
            this._logger.trace("touchEnd: not recording pinch, scale is ", scale)
        }
    },

    touchCancel: function (e) {
        if (this._info)
            this._logger.warn("Discarding pinch, got 'touchCancel' => event is treated by the browser not the web application.");

        return this.discard();
    },
    
    _distance: function (points) {
        if (points.length != 2)
            return 0;

        return Math.sqrt(sq(points[0].clientX - points[1].clientX)
            + sq(points[0].clientY - points[1].clientY));

        // Helper
        function sq(x) { return x * x; }
    },
    
    _center: function (touches) {
        if (touches.length != 2)
            return;

        return {
            clientX: (touches[0].clientX + touches[1].clientX) / 2,
            clientY: (touches[0].clientY + touches[1].clientY) / 2,
        };
    },
};

