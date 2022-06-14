var RoleWebTab = {
    isRoleBased: true,
    _util: {
        isWebTab: function (elem) {
            var role = RoleWebUtil.getRole(elem);
            if (role !== "tablist") {
                return false;
            }

            var tabItems = RoleWebTab._util.getTabItems(elem);
            if (tabItems.length === 0) {
                return false;
            }
            return true;
        },
        getTabItems: function (elem) {
            return elem.querySelectorAll('[role=tab]');
        },
        getItemToSelect: function (elem, value) {
            var items = RoleWebTab._util.getTabItems(elem);
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
        },
        getClickableItem: function (elem) {
            if (elem.firstChild && elem.firstChild.tagName === 'A') {
                return elem.firstChild;
            }
            return elem;
        },
        getSelectedItem: function (elem) {
            var selectedItem;
            RoleWebTab._util.getTabItems(elem).forEach(function(tabItem) {
                if (tabItem.getAttribute('aria-selected') === 'true') {
                    selectedItem = tabItem;
                }
            });

            // For jQuery tab support
            if (!selectedItem) {
                selectedItem = elem.querySelector('#' + elem.getAttribute('aria-activedescendant'));
            }
            return selectedItem;
        }
    },
    createAO: function (elem, parentId) {
        if (RoleWebTab._util.isWebTab(elem)) {
            return RoleWebUtil.createAO(elem, parentId, [TabBehavior, this._behavior]);
        }

        return null;
    },
    _behavior: {
        name: 'RoleWebTabBehavior',
        _attrs: {
            "name": function () {
                return RoleWebUtil.getName(this._elem);
            },
            "logical name": function () {
                return RoleWebUtil.getLogicalName(this._elem);
            },
            "all items": function () {
                var items = RoleWebTab._util.getTabItems(this._elem);
                return Util.makeArray(items).map(RoleWebUtil.getText).join(';');
            },
            "items count": function () {
                var items = RoleWebTab._util.getTabItems(this._elem);
                return items.length;
            },
            "first item": function () {
                var items = RoleWebTab._util.getTabItems(this._elem);
                if (items.length > 0) {
                    return RoleWebUtil.getText(items[0]);
                }
                return null;
            },
            "value": function () {
                var item = RoleWebTab._util.getSelectedItem(this._elem);
                return item ? item.getAttribute('value') : '';
            },
            "selected item": function () {
                var selectedItem = RoleWebTab._util.getSelectedItem(this._elem);
                return selectedItem ? RoleWebUtil.getText(selectedItem) : '';
            }
        },
        _methods: {
            LIST_SELECT: function (msg, resultCallback) {
                this._logger.trace("RoleWebTabBehavior: on command LIST_SELECT");
                var targetTab = RoleWebTab._util.getItemToSelect(this._elem, msg._data.value);
                if (targetTab) {
                    this._elem = RoleWebTab._util.getClickableItem(targetTab);
                    // simulate
                    this._fireEvent(this._elem, 'click', msg._data);
                } else {
                    ErrorReporter.ThrowItemNotFound();
                }
                resultCallback(msg);
            }
        },
        _eventHandler: function (recorder, ev) {
            if (ContentUtils.isTouchEnabled())
                return true;
            this._logger.trace('RoleWebTab._eventHandler: Received recordable event: ', ev.type);
            switch (ev.type) {
                case 'click':
                    var tabItem = Util.findAncestor(ev.target, function (e) {
                        return e.matches && e.matches('[role=tab]');
                    });
                    tabItem = tabItem || ev.target.querySelector('[role=tab]');
                    if (tabItem) {
                        recorder.sendRecordEvent(this, ev, {
                            event: 'onchange',
                            value: RoleWebUtil.getText(tabItem)
                        });
                    }
                    return true;
            }

            return false;
        },
        _gestureHandler: function (recorder, ev, targetElement) {
            this._logger.trace('RoleWebTabBehavior._gestureHandler: Received gesture: ', ev.event);
            if (ev.event == "tap" || ev.event == "longtap") {
                var tabItem = Util.findAncestor(targetElement, function (e) {
                    return e.matches && e.matches('[role=tab]');
                });
                tabItem = tabItem || targetElement.querySelector('[role=tab]');
                if (tabItem) {
                    recorder.sendRecordEvent(this, null, {
                        event: 'onchange',
                        value: RoleWebUtil.getText(tabItem),
                        force_record: true
                    });
                }
                return true;
            }
        }
    }
};

var RoleWebTabLink = {
    isRoleBased: true,
    _util: {
        isWebTabLink: function (elem) {
            if (elem.tagName !== 'A') {
                return false;
            }
            // role is 'tab' and element is a Link
            // or element is a Link and container has role is 'tab'
            var role = RoleWebUtil.getRole(elem);
            var parentRole = RoleWebUtil.getRole(elem.parentElement);
            return (role === "tab" || parentRole === "tab");
        }
    },
    createAO: function (elem, parentId) {
        if (RoleWebTabLink._util.isWebTabLink(elem)) {
            return RoleWebUtil.createAO(elem, parentId, [this._behavior]);
        }

        return null;
    },
    _behavior: {
        _eventHandler: function (recorder, ev) {
            // do nothing here as main responsibility will be delegated to RoleWebTab
            this._logger.trace('RoleWebTabLink._eventHandler: Received recordable event: ', ev.type);
        }
    }
};

RoleWebKit.registerFactory(RoleWebTab);
RoleWebKit.registerFactory(RoleWebTabLink);