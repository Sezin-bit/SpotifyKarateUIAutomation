var MediaBaseBehavior = {
    _attrs: {
        "src": function () {
            return this._elem.src;
        },

        "current source": function () {
            return this._elem.currentSrc;
        },

        "sources": function () {
            var srcs = Util.makeArray(this._elem.getElementsByTagName('source')).map(function (e) { return e.src; });
            return srcs.join(';');
        },

        "duration": function () {
            var d = this._elem.duration || 0;
            return Math.round(d * 1000);
        },

        "current time": function () {
            var d = this._elem.currentTime || 0;
            return Math.round(d * 1000);
        },

        "autoplay": function () {
            return this._elem.autoplay;
        },

        "loop": function () {
            return this._elem.loop;
        },

        "controls": function () {
            return this._elem.controls;
        },

        "muted": function () {
            return this._elem.muted;
        },

        "playing": function () {
            return !(this._elem.paused || this._elem.ended);
        },

        "volume": function () {
            var d = this._elem.volume;
            return d.toFixed(2);
        },

        "playback rate": function () {
            var d = this._elem.playbackRate;
            return d.toFixed(2);
        },
    },
    _methods: {
        MEDIA_PLAY: function (msg, resultCallback) {
            this._logger.trace("MediaBaseBehavior.MEDIA_PLAY: Started");

            var status = "NotImplemented";
            this._elem.addEventListener("play", function () {
                status = "OK";
            }, false);

            var play_promise = this._elem.play();
            if(play_promise !== undefined) {
                play_promise.catch(function(error) {
                    status = "IllegalOperation";
                });
            }
            
            // On iOS, fullscreen video causes issue on identifying the parent page, 
            // so exit full screen mode to workaround.
            if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) { 
                var isFullScreen = document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen;
                if (isFullScreen) {
                    if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    } else if (document.mozCancelFullscreen) {
                        document.mozCancelFullscreen();
                    }
                    else if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else {
                        this._elem.webkitExitFullScreen();
                    }
                }
            }

            // Set the status of message for mobile device specially in case the play action is not executed.
            if (ContentUtils.isTouchEnabled()) {
                Util.setTimeout(function () {
                    msg.status = status;
                    resultCallback(msg);
                }, 100);
                return;
            }

            resultCallback(msg);
        },
        MEDIA_PAUSE: function (msg, resultCallback) {
            this._logger.trace("MediaBaseBehavior.MEDIA_PAUSE: Started");
            this._elem.pause();
            resultCallback(msg);
        },
        MEDIA_LOAD: function (msg, resultCallback) {
            this._logger.trace("MediaBaseBehavior.MEDIA_LOAD: Started");
            this._elem.load();
            resultCallback(msg);
        },
    },
    _helpers: {
        UseEventConfiguration: function (ev) {
            switch (ev.type) {
                case 'play':
                case 'pause':
                    return false;
            }
            return true;
        }
    },
    _eventHandler: function (recorder, ev) {
        this._logger.trace('MediaBaseBehavior._eventHandler: Received recordable event: ' + ev.type);
        var mediaElem = ev.target;
        if (!mediaElem.controls) {
            // no controls means events must be caused by autoplay or call play() in JavaScript,
            // instead of user actions, we only record events caused by user actions
            return true;
        }
        switch (ev.type) {
            case 'click':
                return true; // Don't record clicks
            case 'play':
                if (mediaElem.autoplay && !mediaElem.hasPaused) {
                    // first play event in autoplay video, must be caused by autoplay
                    return true;
                }
                recorder.sendRecordEvent(this, ev, {
                    event: 'on' + ev.type
                });
                return true;
            case 'pause':
                mediaElem.hasPaused = true;
                var self = this;
                Util.setTimeout(function() {
                    // we don't record pause event followed by ended, because it is caused by video reaches end
                    if (!mediaElem.hasEnded) {
                        recorder.sendRecordEvent(self, ev, {
                            event: 'on' + ev.type
                        });
                    }
                    mediaElem.hasEnded = false;
                }, 50);
                return true;
            case 'ended':
                mediaElem.hasEnded = true;
                return true;
        }
    },
    _gestureHandler: function (recorder, gestureInfo) {
        this._logger.trace('MediaBaseBehavior._eventHandler: Received gesture event: ' + gestureInfo.event);
        switch (gestureInfo.event) {
            case 'tap': // Player controls (Play/Pause/FullScreen etc)
            case 'swipe': // Seek
                return true;
        }
        return false;
    },
};
