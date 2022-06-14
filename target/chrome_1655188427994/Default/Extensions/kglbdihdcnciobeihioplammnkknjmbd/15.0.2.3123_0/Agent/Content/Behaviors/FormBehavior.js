var FormBehavior = {
    _eventHandler: function (recorder, ev) {
        this._logger.trace('FormBehavior.eventHandler: Received recordable event on ' + this._elem.tagName + ': ' + ev.type);
        switch (ev.type) {
            case 'keydown':
                if (ev.which === 13) // 13 is the 'Enter' key
                    this._elem._submitTargetElem = ev.target;
                return true;
            case 'click':
                if (this._elem._submitTargetElem) {
                    var ao = content.kitsManager.createAO(ev.target, this._parentID); // ev.target in this case is the submit button of the form
                    recorder.sendRecordEvent(ao, ev, {
                        event: 'onclick',
                        'event point': { x: ev.clientX, y: ev.clientY },
                    });
                    recorder.stopCurrentPropagation();
                }
                this._elem._submitTargetElem = null;
                return true;
            case 'keyup':
                var isInputEnter = this._elem._submitTargetElem && this._elem._submitTargetElem.tagName === "INPUT" && ev.which === 13;
                if (!isInputEnter) {
                    this._elem._submitTargetElem = null;
                }
                else {
                    // Send submit record after 50ms to prevent WebEdit.Set is recorded after it
                    Util.setTimeout(function () {
                        this._sendSubmitRecordEvent(recorder, ev);
                    }.bind(this), 50);
                }
                return true;
            case 'submit':
                // Check if there's a target element for the submit
                if (!this._elem._submitTargetElem)
                    return true;

                this._sendSubmitRecordEvent(recorder, ev);
                return true;
        }
    },

    _gestureHandler: function (recorder, gestureInfo) {
        this._logger.trace('FormBehavior._gestureHandler: Received gesture: ' + gestureInfo.event);
        if (gestureInfo.event === "tap") {
            // Do not record Tap gestures
            this._elem._submitTargetElem = null;
            return true;
        }
        return false;
    },

    _helpers: {
        _sendSubmitRecordEvent: function (recorder, ev) {
            var ao = content.kitsManager.createAO(this._elem._submitTargetElem, this._parentID);
            recorder.sendRecordEvent(ao, ev, {
                force_record: true,
                event: 'onsubmit'
            });
            this._elem._submitTargetElem = null;
            recorder.stopCurrentPropagation();
        }
    }
};