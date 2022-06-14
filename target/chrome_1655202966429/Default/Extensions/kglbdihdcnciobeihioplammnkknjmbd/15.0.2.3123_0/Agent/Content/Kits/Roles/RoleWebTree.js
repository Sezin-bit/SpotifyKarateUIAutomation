var RoleWebTree = {
    isRoleBased: true,
    _util: {
        isTree: function (elem) {
            var role = RoleWebUtil.getRole(elem);
            return role === 'tree';
        },
        _getTreeItems: function (elem) {
            return Util.makeArray(elem.querySelectorAll('[role=treeitem]'));
        },
        getSelectedItem: function (elem) {
            return elem.querySelector('[aria-selected=true]');
        },
        isItemExpanded: function (elem) {
            elem = RoleWebTree._helpers._getTreeItem(elem);
            // check aria-expanded property priority.
            if (elem.getAttribute('aria-expanded') === "true")
                return true;
            if (elem.getAttribute('aria-expanded') === "false")
                return false;

            // check whether child tree displays
            var child = elem.querySelector('[role=treeitem]');
            if (child) {
                var display = child.parentNode.style.getPropertyValue("display");
                if (display === "block")
                    return true;
                if (display === "none")
                    return false;
            }

            // default is expanded.
            return true;
        },
        isItemCollapsed: function (elem) {
            return !RoleWebTree._util.isItemExpanded(elem);
        },
        isTreeItem: function (elem) {
            if (!elem || !elem.nodeName)
                return false;
            if (elem.nodeType === Node.TEXT_NODE || elem.nodeType === Node.COMMENT_NODE)
                return false;
            return elem.getAttribute("role") == "treeitem";
        },
        getTextContent: function (elem) {
            if (RoleWebTree._util.isTreeItem(elem)) {
                while (elem.hasChildNodes()) {
                    var child = Util.arrayFind(elem.childNodes, function (e) {
                        return Util.cleanTextProperty(e.textContent) && e.nodeName != "#comment";
                    });
                    if (child.hasChildNodes()) {
                        elem = child;
                    } else {
                        break;
                    }
                }
            }
            return Util.cleanTextProperty(elem.textContent);
        }
    },
    createAO: function (elem, parentId) {
        if (RoleWebTree._util.isTree(elem)) {
            return RoleWebUtil.createAO(elem, parentId, [TreeBehavior, this._behavior]);
        }
        return null;
    },
    _behavior: {
        name: 'RoleWebTreeBehavior',
        _attrs: {
            "name": function () {
                return RoleWebUtil.getName(this._elem) || RoleWebUtil.getLogicalName(this._elem);
            },
            "logical name": function () {
                return RoleWebUtil.getLogicalName(this._elem);
            },
            "all items": function () {
                var allItems = RoleWebTree._util._getTreeItems(this._elem);
                return Util.makeArray(allItems).map(RoleWebTree._util.getTextContent).join(';');
            },
            "items count": function () {
                var items = RoleWebTree._util._getTreeItems(this._elem);
                return items.length;
            },
            "selection": function () {
                var selection = RoleWebTree._util.getSelectedItem(this._elem);
                return RoleWebTree._helpers._getPathFromElem(selection);
            },
            "first item": function () {
                var firstRoot = RoleWebTree._util._getTreeItems(this._elem)[0];
                if (firstRoot) {
                    return RoleWebTree._util.getTextContent(firstRoot);
                }
                return null;
            }
        },
        _eventHandler: function (recorder, ev) {
            if(ContentUtils.isTouchEnabled())
                return true;
            switch (ev.type) {
                case 'click':
                    var elem = Util.findAncestor(ev.target, function (e) {
                        return e.matches && e.matches('[role=treeitem]');
                    });

                    var path = RoleWebTree._helpers._getPathFromElem(elem);
                    var nodes = path.split(";");
                    var text = nodes[nodes.length - 1];

                    var operation;

                    if (RoleWebTree._helpers._isLeaf(elem) || RoleWebTree._helpers._isClickOnItem(elem, text, ev.target)) {
                        operation = RoleWebTree._helpers._actionType.select;
                    } else {
                        operation = RoleWebTree._util.isItemExpanded(elem) ?
                            RoleWebTree._helpers._actionType.collapse : RoleWebTree._helpers._actionType.expand;
                    }

                    recorder.sendRecordEvent(this, ev, {		    
                        event:"onclick",
                        name: operation,
                        value: path
                    });
                    return true;

                default:
                    break;
            }
        },
        _gestureHandler: function(recorder, ev, targetElement){
            if(ev.event == "tap" || ev.event == "longtap"){
                var elem = Util.findAncestor(targetElement, function(e){
                    return e.matches && e.matches('[role=treeitem]');
                });

                var path = RoleWebTree._helpers._getPathFromElem(elem);
                var nodes = path.split(";");
                var text = nodes[nodes.length - 1];

                var operation;

                if(RoleWebTree._helpers._isLeaf(elem) || RoleWebTree._helpers._isClickOnItem(elem, text, targetElement)){
                    operation = RoleWebTree._helpers._actionType.select;
                }else{
                    operation = RoleWebTree._util.isItemExpanded(elem) ?
                        RoleWebTree._helpers._actionType.collapse : RoleWebTree._helpers._actionType.expand;
                }

                recorder.sendRecordEvent(this, null, {
                    event: "onclick",
                    name: operation,
                    value: path,
		            force_record: true
                });
                return true;
            }
        },
        _methods: {
            LIST_SELECT: function (msg, resultCallback) {
                RoleWebTree._helpers._makeSelection(msg, this, RoleWebTree._helpers._actionType.select, resultCallback);
            },
            WEB_TREE_EXPAND: function (msg, resultCallback) {
                RoleWebTree._helpers._makeSelection(msg, this, RoleWebTree._helpers._actionType.expand, resultCallback);
            },
            WEB_TREE_COLLAPSE: function (msg, resultCallback) {
                RoleWebTree._helpers._makeSelection(msg, this, RoleWebTree._helpers._actionType.collapse, resultCallback);
            }
        }
    },
    _helpers: {
        _actionType: {
            select: "Select",
            expand: "Expand",
            collapse: "Collapse"
        },
        _getPathFromElem: function (elem) {
            if (arguments.length == 0)
                return "";
            var path = [];
            for (var e = elem ; e ; e = this._getParentNode(e)) {
                if (RoleWebTree._util.isTreeItem(e))
                    path.push(RoleWebTree._util.getTextContent(e));
            }
            path = path.reverse().join(';');
            return path;
        },
        _getItemFromPath: function (path, tree) {
            if (arguments.length == 0)
                return null;
            var item = tree || this._elem;

            var nodes = path.split(";");
            for (var i = 0 ; i < nodes.length ; i++) {
                var children = this._getDirectChildrenItems(item);
                var node = nodes[i];

                var tryIndex = this._tryGetItemByIndex(node, children);
                if (tryIndex) {
                    item = tryIndex;
                } else {
                    item = Util.arrayFind(children, function (child) {
                        return node == RoleWebTree._util.getTextContent(child);
                    });
                }
            }
            if (!item)
                ErrorReporter.ThrowItemNotFound();
            return item;
        },
        _tryGetItemByIndex: function (indexStr, items) {
            if (indexStr.indexOf("#") == 0) {
                var index = Number(indexStr.substr(1));
                if (index < items.length)
                    return items[index];
                else
                    ErrorReporter.ThrowItemNotFound();
            }
        },
        _makeSelection: function (msg, current, type, resultCallback) {
            if (!current)
                return;
            var xpathForSelector = msg._data.xpath;
            var xpathForOpener = msg._data._xpath;

            var nodes = typeof msg._data.value === "string" ? [msg._data.value] : msg._data.value[0];
            var path = nodes.join(";");

            switch (type) {
                case this._actionType.select:
                    this._expandParent(current._elem, msg, current, path, xpathForOpener, function () {
                        var item = RoleWebTree._helpers._getItemFromPath(path, current._elem);
                        RoleWebTree._helpers._clickItem(item, msg, current, RoleWebTree._util.getTextContent(item), xpathForSelector);
                        resultCallback(msg);
                    });
                    break;
                case this._actionType.expand:
                    this._expandParent(current._elem, msg, current, path, xpathForOpener, function () {
                        var item = RoleWebTree._helpers._getItemFromPath(path, current._elem);
                        if (RoleWebTree._util.isItemCollapsed(item))
                            RoleWebTree._helpers._clickOpener(item, msg, current, xpathForOpener, function () { resultCallback(msg); });
                        else 
                            resultCallback(msg);
                    });
                    break;
                case this._actionType.collapse:
                    var item = this._getItemFromPath(path, current._elem);
                    if (RoleWebTree._util.isItemExpanded(item))
                        this._clickOpener(item, msg, current, xpathForOpener, function () { resultCallback(msg); });
                    else 
                        resultCallback(msg);
                    break;
                default:
                    break;
            }
        },
        _redirectByXpathAsPriority: function (item, xpath) {
            var elements = [];
            if(xpath)
                elements = Description.getElementsByXpath(xpath, item);

            if (elements.length === 0)
                ErrorReporter.ThrowItemNotFound();
            item = elements[0];
            return item;
        },
        _clickItem: function (item, msg, current, text, xpath) {
            var target = xpath ? RoleWebTree._helpers._redirectByXpathAsPriority(item, xpath) : RoleWebTree._helpers._findItem(item, text);
            current._fireEvent(target, 'click', msg._data);
        },
        _clickOpener: function (item, msg, current, xpath, onComplete) {
            var target = xpath ? RoleWebTree._helpers._redirectByXpathAsPriority(item, xpath) : RoleWebTree._helpers._findOpener(item);
            var status = RoleWebTree._util.isItemExpanded(item);

            // try to expand/collapse by mouse over -> click -> double click
            current._fireEvent(target, 'mouseover', msg._data);
            if (status == RoleWebTree._util.isItemExpanded(item))
                current._fireEvent(target, 'click', msg._data);

            Util.setTimeout(function () {
                if (status == RoleWebTree._util.isItemExpanded(item))
                    current._fireEvent(target, 'dblclick', msg._data);
                if (onComplete)
                    onComplete();
            }, 2000);
        },
        _findItem: function (item, text) {
            // click the leaf which text content is same.
            if (RoleWebTree._util.isTreeItem(item)) {
                while (item.hasChildNodes()) {
                    var child = Util.arrayFind(item.childNodes, function (itemChild) {
                        return RoleWebTree._util.getTextContent(itemChild) == text;
                    });

                    if (child && child.hasChildNodes())
                        item = child;
                    else
                        return item;
                }
            }
            return item;
        },
        _findOpener: function (item) {
            // use first leaf (not zero size) as it's opener.
            if (RoleWebTree._util.isTreeItem(item)) {
                while (item.childElementCount) {
                    item = Util.arrayFind(item.children, function (itemChild) {
                        return !RoleWebTree._helpers._isZeroSize(itemChild);
                    }) || item.firstElementChild;
                }
            }
            if (!item)
                ErrorReporter.ThrowItemNotFound();
            return item;
        },
        _isZeroSize: function (elem) {
            return elem.offsetWidth == 0 || elem.offsetHeight == 0;
        },
        _isLeaf: function (elem) {
            if (elem.hasAttribute('aria-expanded'))
                return false;
            return elem.querySelectorAll("[role=treeitem]").length === 0;
        },
        _isClickOnItem: function (elem, text, target) {
            var elemText = RoleWebTree._helpers._findItem(elem, text);
            return elemText.contains(target);
        },
        _expandParent: function (item, msg, current, path, xpath, onComplete) {
            var parent = this._getTreeRoot(item);
            var nodes = path.split(";");
            var onCompleteCalled = false;
            for (var i = 0 ; i < nodes.length - 1 ; i++) {
                var children = this._getDirectChildrenItems(parent);
                var node = nodes[i];

                var tryIndex = this._tryGetItemByIndex(node, children);
                if (tryIndex) {
                    parent = tryIndex;
                } else {
                    parent = Util.arrayFind(children, function (child) {
                        return node == RoleWebTree._util.getTextContent(child);
                    });
                }

                if (RoleWebTree._util.isItemCollapsed(parent)) {
                    this._clickOpener(parent, msg, current, xpath, onComplete);
                    onCompleteCalled = true;
                }
            }
            if (!onCompleteCalled && onComplete)
                onComplete();
        },
        _getParentNode: function (elem) {
            return this._getLogicalParentFromLevel(elem) || this._getLogicalParentFromAriaOwns(elem) || this._getParentFromDom(elem);
        },
        _getDirectChildrenItems: function (elem) {
            var children = this._getLogicalChildrenFromLevel(elem) || this._getLogicalChildrenFromAriaOwns(elem) || this._getChildrenFromDom(elem);
            return Util.makeArray(children);
        },
        _getParentFromDom: function (elem) {
            return Util.findAncestor(elem.parentElement, function (parent) {
                return parent.matches('[role=treeitem]') || parent.matches('[role=tree]');
            });
        },
        _getChildrenFromDom: function (elem) {
            var children = Util.makeArray(RoleWebTree._util._getTreeItems(elem));

            if (RoleWebTree._util.isTree(elem))
                children = children.filter(function (child) { return RoleWebTree._helpers._getPathFromElem(child).indexOf(";") == -1; });
            else
                children = children.filter(function (child) { return elem == RoleWebTree._helpers._getParentFromDom(child); });

            return children;
        },
        _getLogicalChildrenFromAriaOwns: function (elem) {
            var aria_owns = elem.getAttribute("aria-owns");
            if (!aria_owns)
                return;

            var ids = aria_owns.split(/\s+/).filter(function (id) { return id != ""; });
            var children = ids.map(function (id) {
                var item = ContentUtils.getElementById(document, id);
                if (item)
                    return Util.makeArray(item.querySelectorAll('[role=treeitem]'));
            }).reduce(function (a, b) { return a.concat(b) }, [])
              .filter(function (child) { return child; });

            var currentLevel = this._calculateLevelFromPath(elem);

            return children.filter(function (child) {
                return RoleWebTree._helpers._calculateLevelFromPath(child) == currentLevel + 1;
            });
        },
        _calculateLevelFromPath: function (elem) {
            return RoleWebTree._helpers._getPathFromElem(elem).split(";").length;
        },
        _getLogicalParentFromAriaOwns: function (elem) {
            var tree = this._getTreeRoot(elem);
            var parents = tree.querySelectorAll("[role='treeitem'][aria-owns]");
            if (parents.length == 0)
                return;
            for (var iterator = elem ; iterator != tree ; iterator = iterator.parentNode) {
                var id = iterator.id;
                if (id) {
                    if (typeof id == 'number')
                        id = "'" + id + "'";
                    var selector = "[aria-owns~=" + id + "]";
                    var searchResult = tree.querySelector(selector);
                    if (searchResult)
                        return searchResult;
                }
            }
        },
        _getLogicalChildrenFromLevel: function (elem) {
            var level = this._getLevel(elem);
            if (!level)
                return;
            var items = RoleWebTree._util._getTreeItems(this._getTreeRoot(elem));
            var index = Util.arrayFindIndex(items, function (itemChild) {
                return itemChild == elem;
            });

            var children = [];
            for (var i = index + 1 ; i < items.length ; i++) {
                var item = items[i];
                var itemLevel = this._getLevel(item);
                if (itemLevel <= level)
                    break;
                if (itemLevel == level + 1)
                    children = children.concat(item);
            }
            if (children.length == 0)
                return;

            return children;
        },
        _getLogicalParentFromLevel: function (elem) {
            var level = this._getLevel(elem);
            if (!level)
                return;
            var items = RoleWebTree._util._getTreeItems(this._getTreeRoot(elem));
            var index = Util.arrayFindIndex(items, function (item) {
                return item == elem;
            });

            // reverse find the item which level equals parent level.
            for (var i = index - 1 ; i >= 0 ; i--) {
                var item = items[i];
                if (this._getLevel(item) == level - 1)
                    return item;
            }
        },
        _getLevel: function (elem) {
            if (RoleWebTree._util.isTreeItem(elem))
                return Number(elem.getAttribute("aria-level"));
        },
        _getTreeItem: function (elem) {
            if (!RoleWebTree._util.isTreeItem(elem)) {
                elem = Util.findAncestor(elem, function (item) {
                    return item.matches && item.matches('[role=treeitem]');
                })
            }
            return elem;
        },
        _getTreeRoot: function (elem) {
            if (!RoleWebTree._util.isTree(elem)) {
                elem = Util.findAncestor(elem, function (item) {
                    return item.matches && item.matches('[role=tree]');
                })
            }
            return elem;
        }
    }
};

RoleWebKit.registerFactory(RoleWebTree);