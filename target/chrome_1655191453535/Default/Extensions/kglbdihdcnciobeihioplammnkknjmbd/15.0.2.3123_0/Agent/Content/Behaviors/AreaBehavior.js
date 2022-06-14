var AreaBehavior = {
    _micclass: ["WebArea"],
    _attrs: {
        "logical name": function () {
            if (this._elem.alt) {
                return this._elem.alt;
            }

            var img = this._getImageElement();
            if (img) {
                return img.src;
            }

            return "WebArea";
        },

        "image type": function () {
            return "Client Side ImageMap";
        },

        "alt": function () {
            return this._elem.alt;
        },

        "url": function () {
            return this._elem.href;
        },

        "href": function () {
            return this.GetAttrSync("url");
        },

        "src": function () {
            var img = this._getImageElement();
            return img ? img.src : "";
        },

        "rect": function () {
            var img = this._getImageElement();
            var rect = { left: 0, top: 0, right: 0, bottom: 0 };
            if (!img) {
                return rect;
            }

            var img_rect = img.getBoundingClientRect();

            var coords = this._elem.coords.split(/\s*,\s*/);
            coords = coords.map(function (e) { return parseInt(e, 10); });
            switch (this._elem.shape.toLowerCase()) {
                case "rect":
                    if (coords.length === 4) {
                        rect.left = coords[0];
                        rect.top = coords[1];
                        rect.right = coords[2];
                        rect.bottom = coords[3];
                    }
                    break;
                case "circle":
                    if (coords.length === 3) {
                        var x = coords[0];
                        var y = coords[1];
                        var radius = coords[2];
                        if (radius < 0) {
                            break;
                        }
                        rect.left = x - radius;
                        rect.top = y - radius;
                        rect.right = x + radius;
                        rect.bottom = y + radius;
                    }
                    break;
                case "poly":
                case "polygon":
                    if (coords.length >= 2) {
                        var x1, x2;
                        var y1, y2;
                        x1 = x2 = coords[0];
                        y1 = y2 = coords[1];
                        for (var i = 2; i < coords.length; i += 2) {
                            x1 = x1 < coords[i] ? x1 : coords[i];
                            x2 = x2 > coords[i] ? x2 : coords[i];
                            y1 = y1 < coords[i + 1] ? y1 : coords[i + 1];
                            y2 = y2 > coords[i + 1] ? y2 : coords[i + 1];
                        }
                        rect.left = x1;
                        rect.top = y1;
                        rect.right = x2;
                        rect.bottom = y2;
                    }
                    break;
            }
            var zoomLevel = typeof(BrowserServices) !== "undefined" && BrowserServices.getZoomLevel && BrowserServices.getZoomLevel() || 1;
            return {
                left: Math.round((img_rect.left + rect.left) * zoomLevel),
                top: Math.round((img_rect.top + rect.top) * zoomLevel),
                right: Math.round((img_rect.left + rect.right) * zoomLevel),
                bottom: Math.round((img_rect.top + rect.bottom) * zoomLevel)
            };
        },

        "width": function () {
            var rect = this.GetAttrSync("rect");
            return rect.right - rect.left;
        },

        "height": function () {
            var rect = this.GetAttrSync("rect");
            return rect.bottom - rect.top;
        },

        "map name": function () {
            var parent = this._elem;
            while (parent) {
                if (parent.tagName === "MAP") {
                    break;
                }
                parent = parent.parentNode;
            }

            if (parent) {
                return parent.name;
            }
        },

        "coords": function () {
            return this._elem.coords;
        },

        "coordinates": function () {
            return this.GetAttrSync("coords");
        },
        "visible": function () {
            // Hardcoded defect. Always returning true to keep this aligned with IE.
            // Correct behavior should be to return the visibility of the image element.
            return true;
        },
    },
    _helpers: {
        _getImageElement: function () {
            var parent = this._elem;
            while (parent) {
                if (parent.tagName === "MAP") {
                    break;
                }
                parent = parent.parentNode;
            }

            if (parent) {
                var name = parent.name;
                var images = [];
                var shadowRoot = ShadowDomUtil.getParentShadowRoot(this._elem, this._logger);
                if (!!shadowRoot)
                    images = Util.makeArray(shadowRoot.querySelectorAll('IMG'))
                else
                    images = Util.makeArray(document.images);

                for (var i = 0; i < images.length; i++) {
                    if (images[i].useMap.substring(1) === name) {
                        return images[i];
                    }
                }
            }
        },
        getParent: function () {
            var img = this._getImageElement();
            return content.kitsManager.createAO(img, this._parentID);
        },
        isLearnable: Util.alwaysTrue,
    },
    _eventHandler: function (recorder, ev) {
        this._logger.trace('WebArea.eventHandler: Received recordable event on ' + this._elem.tagName + ': ' + ev.type);
        if (ev.type === 'click') {
            recorder.sendRecordEvent(this, ev, {
                event: 'onclick',
                'event point': { x: ev.clientX, y: ev.clientY },
            });
            return true;
        }
    },
};