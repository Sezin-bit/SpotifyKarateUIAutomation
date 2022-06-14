var RoleWebList = {
    // we treat UL/LI are always be recognized as WebList without role property
    // so we should turn 'isRoleBased' to off to allow this AO always be run
    isRoleBased: false, 
    _util: {
        isList: function (elem) {
            if (elem.tagName === 'INPUT' || elem.tagName === 'SELECT') {
                return false;
            }

            var role = RoleWebUtil.getRole(elem);
            if (role === 'list' || role === 'listbox') {
                return true;
            }

            // if there is no Role defined for this element
            // we should check if it is mapped to UL & LI structure which LI's role equal 'option'
            if (!role && RoleWebList._util.isULhavingLIsWithOptionRole(elem)) {
                return true;
            }

            return false;
        },
        isULhavingLIsWithOptionRole: function (elem) {
            if (elem.tagName !== 'UL') {
                return false;
            }

            // should have no children has tag UL and have at least one LI[role=option]
            return elem.querySelectorAll('ul').length === 0 && elem.querySelectorAll('li[role=option]').length > 0;
        },
        getListItems: function (elem) {
            return Util.makeArray(elem.querySelectorAll('[role=option], [role=listitem]'));
        },
        getSelectedItem: function (items) {
            return Util.arrayFind(items, function (item) {
                return item.getAttribute('aria-selected') === 'true';
            });
        },
        getItemToSelect: function (elem, value) {
            var items = RoleWebList._util.getListItems(elem);
            if (typeof (value) === "number") {
                if (value >= 0 && value < items.length) {
                    return items[value];
                }
            } else {
                return Util.arrayFind(items, function (item) {
                    return RoleWebUtil.getText(item) === value;
                });
            }
            return null;
        }
    },
    createAO: function (elem, parentId) {
        if (RoleWebList._util.isList(elem)) {
            return RoleWebUtil.createAO(elem, parentId, [ListBehavior, this._behavior]);
        }
        return null;
    },
    _behavior: {
        name: 'RoleWebListBehavior',
        _attrs: {
            "logical name": function () {
                return RoleWebUtil.getLogicalName(this._elem);
            },
            "default value": function () {
                return null;
            },
            "selection": function () {
                var items = RoleWebList._util.getListItems(this._elem);
                var arr = [];
                items.forEach(function (item) {
                    if (item.getAttribute('aria-selected') === 'true') {
                        arr.push(RoleWebUtil.getText(item));
                    }
                });
                return arr.join(';');
            },
            "all items": function () {
                var containerElem;
                var ariaOwns = this._elem.getAttribute('aria-owns');
                
                if (ariaOwns) {
                    containerElem = document.getElementById(ariaOwns);
                }
                if (!containerElem) {
                    containerElem = this._elem;
                }
                var items = RoleWebList._util.getListItems(containerElem);
                return Util.makeArray(items).map(RoleWebUtil.getText).join(';');
            },
            "items count": function () {
                var items = RoleWebList._util.getListItems(this._elem);
                return items.length;
            },
            "selected item index": function () {
                var items = RoleWebList._util.getListItems(this._elem);
                var indexes = [];
                for (var i = 0; i < items.length; i++) {
                    if (items[i].getAttribute('aria-selected') === 'true') {
                        indexes.push(i);
                    }
                }
                return indexes.join(";");
            },
            "selected items count": function () {
                var items = RoleWebList._util.getListItems(this._elem);
                return items.filter(function (item) {
                    return item.getAttribute('aria-selected') === 'true';
                }).length;
            },
            "visible items": function () {
                var visibleItems = this._getVisibleItems();
                return visibleItems.length;
            },
            "first item": function () {
                var items = RoleWebList._util.getListItems(this._elem);
                if (items.length > 0) {
                    return RoleWebUtil.getText(items[0]);
                }
                return null;
            },
            "is_role_based": function () {
                return true;
            }
        },
        _methods: {
            NUM_TO_ITEM: function (msg, resultCallback) {
                this._logger.trace("RoleWebListBehavior: on command NUM_TO_ITEM");
                var items = RoleWebList._util.getListItems(this._elem);
                var index = msg._data.item_index;
                if (index < 0 || index >= items.length) {
                    ErrorReporter.ThrowItemNotFound();
                }
                msg._data.AN_ITEM_TEXT = RoleWebUtil.getText(items[index]);
                resultCallback(msg);
            },
            LIST_SELECT: function (msg, resultCallback) {
                this._logger.trace("RoleWebListBehavior: on command LIST_SELECT");
                var self = this;
                function onComplete() {
                    var target = RoleWebList._util.getItemToSelect(self._elem, msg._data.value);
                    if (target) {
                        if (ContentUtils.isTouchEnabled()) {
                            // re-allocate position
                            msg._data.pos = ContentUtils.pointRelativeToElem(target, { x: Constants.noCoordinate, y: Constants.noCoordinate });
                            // re-allocate target because sometimes the target and the element retrieve from entire point are not the same
                            // the current target is overlayed by another layer that take responsible for touching
                            // so TOUCH event should be sent to that layer
                            target = document.elementFromPoint(msg._data.pos.x, msg._data.pos.y);
                        }
                        self._fireEvent(target, 'click', msg._data);
                    } else {
                        msg.status = "ItemNotFound";
                    }
                    resultCallback(msg);
                };
                this._makeItemVisible(msg._data.value, onComplete);
            },
            MAKE_ITEM_VISIBLE: function (msg, resultCallback) {
                this._logger.trace("RoleWebListBehavior: on command MAKE_ITEM_VISIBLE");
                this._scrollByXPath(msg, resultCallback);
            }
        },
        _eventHandler: function (recorder, ev) {
            if (ContentUtils.isTouchEnabled())
                return true;
            this._logger.trace('RoleWebList._eventHandler: Received recordable event: ', ev.type);
            switch (ev.type) {
                case 'click':
                    return true;
                case 'mousedown':
                    var selectedItem = Util.findAncestor(ev.target, function (e) {
                        return e.matches && e.matches('[role=option], [role=listitem]');
                    });
                    if (selectedItem) {
                        recorder.sendRecordEvent(this, ev, {
                            event: 'onchange',
                            value: RoleWebUtil.getText(selectedItem)
                        });
                    } else {
                        // in case there is no "option", "listitem" item on the list, mean that we're clicking on the entire listbox
                        // not clicking on item of listbox and we should record 'click' action
                        var items = RoleWebList._util.getListItems(this._elem);
                        if (items.length === 0) {
                            recorder.sendRecordEvent(this, ev, {
                                event: 'onclick',
                                'event point': { x: ev.clientX, y: ev.clientY }
                            });
                        }
                    }
                    return true;
            }
        },
        _gestureHandler: function (recorder, ev, targetElement) {
            this._logger.trace('RoleWebList._gestureHandler: Received gesture: ', ev.event);
            if (ev.event == "tap" || ev.event == "longtap") {
                var selectedItem = Util.findAncestor(targetElement, function (e) {
                    return e.matches && e.matches('[role=option], [role=listitem]');
                });
                // item not found
                if (!selectedItem) {
                    // we have many layers rendered at given point so we should get all elements at clicked point 
                    // and find matching item in list
                    var elements = document.elementsFromPoint(ev.clientX, ev.clientY);
                    // get matched item in list 
                    selectedItem = Util.arrayFind(elements, function (elem) {
                        var role = RoleWebUtil.getRole(elem);
                        return (role === 'option' || role === 'listitem');
                    });
                }
                if (selectedItem) {
                    recorder.sendRecordEvent(this, null, {
                        event: 'onchange',
                        value: RoleWebUtil.getText(selectedItem),
                        force_record: true
                    });
                } else {
                    // in case there is no "option" item on the list, mean that we're clicking on the entire listbox
                    // not clicking on item of listbox and we should record 'click' action
                    var items = RoleWebList._util.getListItems(this._elem);
                    if (items.length === 0) {
                        recorder.sendRecordEvent(this, null, {
                            event: 'onclick',
                            'event point': { x: ev.clientX, y: ev.clientY },
                            force_record: true
                        });
                    }
                }
                return true;
            }
        },
        _helpers: {
            _scrollDirection: { ScrollUp: 0, ScrollDown: 1 },
            _retryCounter: 0,
            _axix: {min: 0, max: 9999 },
            _makeItemVisible: function (value, onComplete) {
                var self = this;
                Util.setTimeout(function () {
                    if (!self._isItemVisible(value)) {
                        // we do scroll-up first
                        self._scrollByDirection(self._scrollDirection.ScrollUp, value, onComplete);
                        // in case still haven't found it yet, we do scroll-down
                        if (!self._isItemVisible(value)) {
                            self._scrollByDirection(self._scrollDirection.ScrollDown, value, onComplete);
                        }
                    } else if (onComplete) {
                        onComplete();
                    }
                }, 500);
            },
            _getClickableElementByDirection: function (direction) {
                switch (direction) {
                    case this._scrollDirection.ScrollUp:
                        return this._getTopRightClickableElement();
                    case this._scrollDirection.ScrollDown:
                        return this._getBottomRightClickableElement();
                }
            },
            _getTopRightClickableElement: function () {
                var elemRec = this._elem.getBoundingClientRect();
                if (Util.isRectEmpty(elemRec)) {
                    elemRec = this._elem.parentElement.getBoundingClientRect();
                }
                var topRightPosition = { x: elemRec.left + elemRec.width - 10, y: elemRec.top + 10 };
                return document.elementFromPoint(topRightPosition.x, topRightPosition.y);
            },
            _getBottomRightClickableElement: function () {
                var elemRec = this._elem.getBoundingClientRect();
                if (Util.isRectEmpty(elemRec)) {
                    elemRec = this._elem.parentElement.getBoundingClientRect();
                }
                var bottomRightPosition = { x: elemRec.left + elemRec.width - 10, y: elemRec.bottom - 10 };
                return document.elementFromPoint(bottomRightPosition.x, bottomRightPosition.y);
            },
            _getClickPosition: function (direction, clickableElement) {
                var clickableElementRec = clickableElement.getBoundingClientRect();
                var position = { x: clickableElementRec.width - 10, y: clickableElementRec.height - 10 };
                if (clickableElement.tagName === 'IMG') {
                    // in case clickable element is IMG, we will dispatch event to its parent
                    clickableElement = clickableElement.parentElement;
                    // get RECT
                    clickableElementRec = clickableElement.getBoundingClientRect();
                    // re-calculate position
                    position = { x: clickableElementRec.width - 10, y: clickableElementRec.height - 10 };
                    if (direction == this._scrollDirection.ScrollUp) {
                        position.y = 10;
                    }
                }
                return position;
            },
            _getElementByXPath: function (xpath) {
                var elements = [];

                if (xpath) {
                    elements = Description.getElementsByXpath(xpath, this._elem);;
                }

                
                if (elements.length === 0) {
                    ErrorReporter.ThrowItemNotFound();
                }

                if (elements.length > 1) {
                    ErrorReporter.ThrowItemNotUnique();
                }

                return elements[0];
            },
            _areTwoVisibleItemListEqual: function (listOne, listTwo) {
                var areEqual = true;
                if (listOne.length !== listTwo.length) {
                    areEqual = false;
                }
                for (var i = 0 ; i < listOne.length; i++) {
                    if (listOne[i] !== listTwo[i]) {
                        areEqual = false;
                        break;
                    }
                }
                this._retryCounter = areEqual ? (this._retryCounter + 1) : 0;
                return areEqual;
            },
            _scrollByDirection: function (direction, value, onComplete) {
                var clickableElement = this._getClickableElementByDirection(direction);
                if (!clickableElement) return;
                this._retryCounter = 0;
                var position = this._getClickPosition(direction, clickableElement);
                var isVisible = this._isItemVisible(value);
                while (!isVisible) {
                    var originalVisibleItems = this._getVisibleItems();
                    this._fireEvent(clickableElement, 'click', { pos: position });
                    isVisible = this._isItemVisible(value);
                    if (isVisible && onComplete) {
                        onComplete();
                        break;
                    }
                    if (this._areTwoVisibleItemListEqual(originalVisibleItems, this._getVisibleItems()) && this._retryCounter > 5) {
                        if (direction == this._scrollDirection.ScrollDown && onComplete) {
                            onComplete();
                        }
                        break;
                    }
                }
            },
            _scrollByXPath: function (msg, resultCallback) {
                var timeout = msg._data.timeout, value = msg._data.value, xpath = msg._data.xpath;
                if (timeout < 0) {
                    ErrorReporter.ThrowInvalidArg();
                    return;
                }
                var elementByXPath = this._getElementByXPath(xpath);
                var position = this._getClickPosition(null, elementByXPath);
                var expire = new Date().getTime() + timeout; // timeout is milliseconds
                var self = this;
                function scroll(value, position, expire) {
                    if (self._isItemVisible(value)) {
                        resultCallback(msg);
                    } else if (new Date().getTime() > expire) {
                        msg.status = "ERROR";
                        resultCallback(msg);
                    } else {
                        self._fireEvent(elementByXPath, 'click', { pos: position });
                        Util.setTimeout(scroll, 100, value, position, expire);
                    }
                };
                scroll(value, position, expire);
            },
            _getVisibleItems: function () {
                var items = RoleWebList._util.getListItems(this._elem);
                var visibleItems = [];
                items.forEach(function (item) {
                    if (this._isItemVisible(RoleWebUtil.getText(item))) {
                        visibleItems.push(item);
                    }
                }, this);
                return visibleItems;
            },
            _isItemVisible: function (value) {
                var item = RoleWebList._util.getItemToSelect(this._elem, value);
                if (!item) return false;
                var topRightArea = this._getTopRightClickableElement();
                var bottomRightArea = this._getBottomRightClickableElement();
                var top = topRightArea ? topRightArea.getBoundingClientRect().top : this._axix.min;
                var bottom = bottomRightArea ? bottomRightArea.getBoundingClientRect().bottom : this._axix.max;
                var itemRec = item.getBoundingClientRect();
                return ((itemRec.bottom <= bottom + itemRec.height / 2) &&
                        (itemRec.top + itemRec.height / 2 >= top));
            }
        }
    }
};

var RoleWebComboBox = {
    isRoleBased: true,
    _util: {
        isComboxBox: function (elem) {
            if (elem.tagName === 'INPUT') {
                return false;
            }
            var role = RoleWebUtil.getRole(elem);
            return role === 'combobox';
        }
    },
    createAO: function (elem, parentId) {
        if (RoleWebComboBox._util.isComboxBox(elem)) {
            return RoleWebUtil.createAO(elem, parentId, [ListBehavior, this._behavior]);
        }
        return null;
    },
    _behavior: {
        name: 'RoleWebComboBoxBehavior',
        _attrs: {
            "logical name": function () {
                return RoleWebUtil.getLogicalName(this._elem);
            },
            "default value": function () {
                return null;
            },
            "selection": function () {
                var items = Util.makeArray(RoleWebList._util.getListItems(this._elem));
                var arr = [];
                items.forEach(function (item) {
                    if (item.getAttribute('aria-selected') === 'true') {
                        arr.push(RoleWebUtil.getText(item));
                    }
                });
                return arr.join(';');
            },
            "all items": function () {
                var items = RoleWebList._util.getListItems(this._elem);
                return  Util.makeArray(items).map(RoleWebUtil.getText).join(';');
            },
            "items count": function () {
                return 0;
            },
            "is_role_based": function () {
                return true;
            },
            //align with IE behaviour
            "data": function() {
                return null;
            }
        },
        _methods: {
            CALL_EVENT: function (msg, resultCallback) {
                this._logger.trace("RoleWebComboBox: on commnad CALL_EVENT");
                var self = this;
                Util.setTimeout(function () {
                    var elemRec = self._elem.getBoundingClientRect();
                    // we're looking the dropdown-button to send event
                    // firstly, just get the properly position
                    var propPos = { x: elemRec.right - 5, y: elemRec.top + elemRec.height / 2 };
                    // get element
                    var elementFromPoint = document.elementFromPoint(propPos.x, propPos.y);
                    // send event
                    self._fireEvent(elementFromPoint, 'mousedown', msg._data);
                    self._fireEvent(elementFromPoint, 'mouseup', msg._data);
                    // report 
                    resultCallback(msg);
                }, 500);
            }
        },
        _eventHandler: function (recorder, ev) {
            this._logger.trace('RoleWebComboBox._eventHandler: Received recordable event: ', ev.type);

            switch (ev.type) {
                case 'mousedown':
                    recorder.sendRecordEvent(this, ev, {
                        event: 'onclick',
                        'event point': { x: ev.clientX, y: ev.clientY }
                    });
                    return true;
            }

            return false;
        }
    }
};

RoleWebKit.registerFactory(RoleWebList);
RoleWebKit.registerFactory(RoleWebComboBox);