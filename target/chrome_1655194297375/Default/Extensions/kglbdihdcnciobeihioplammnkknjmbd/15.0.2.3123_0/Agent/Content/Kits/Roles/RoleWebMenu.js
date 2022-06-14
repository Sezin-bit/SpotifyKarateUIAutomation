var RoleWebMenu = {
    isRoleBased: false, //trick here: if a non-rolebased element are under menu, it still need pass through RoleWebMenu Kit.
    //constructor definition
    _MenuPathManager: function () {
        this._logger = WebKit._logger;

        //path-item:  {menu:, selectedMenuItem:, selectedMenuItemIndex}
        //path: arry of path-item: [{menu:, selectedMenuItem:, selectedMenuItemIndex}, ...]
        //path-set: array of path
        this._menuPathSet = []; //2d array: [{menu:, selectedMenuItem:, selectedMenuItemIndex}, ...], [...], ...
        this._activeRootMenu = null; //the menu which are being recorded,  to support multiple menus in one page.
    },
    _menuPathManager: null, //instance

    _util: {
        _lastItem: function (arr) {
            return arr.length ? arr[arr.length - 1] : undefined;
        },

        _isDisabled: function (elem) {
            if(elem.hasAttribute('aria-disabled') && elem['aria-disabled'])
                return true;
            if(elem.hasAttribute('disabled') && elem['disabled']) 
                return true;
            return false;
        },
        intersectDirection: {
            vert: "vert",
            horiz: "horiz",
            both: "both",
        },
        _getMenuLayout: function (menu) {
            var menuitems = RoleWebMenu._util.getMenuItems(menu);
            var intersectDirection = RoleWebMenu._util.intersectDirection;
            if (menuitems.length <= 1)
                return intersectDirection.both;
            var firstItem = menuitems[0];
            var lastItem = menuitems[menuitems.length - 1];
            var rectFirst = firstItem.getBoundingClientRect();
            var rectLast = lastItem.getBoundingClientRect();
            var deltaX = Math.abs(rectFirst.left - rectLast.left);
            var deltaY = Math.abs(rectFirst.top - rectLast.top);

            return deltaX > deltaY ? intersectDirection.horiz : intersectDirection.vert;
        },
        _reverseDirection: function (direction) {
            var intersectDirection = RoleWebMenu._util.intersectDirection;
            if (direction === intersectDirection.horiz)
                return intersectDirection.vert;
            else if (direction === intersectDirection.vert)
                return intersectDirection.horiz;
            return intersectDirection.both;
        },
        _isMenuItemAdjacentToMenu: function (menuitem, menu2, tolerance) {
            var menu1 = RoleWebMenu._util._getSurroundingMenus(menuitem)[0];
            var direction = RoleWebMenu._util._getMenuLayout(menu1);
            direction = RoleWebMenu._util._reverseDirection(direction);
            var rect1 = menuitem.getBoundingClientRect();
            rect1 = Util.shallowObjectClone(rect1);
            var rect2 = menu2.getBoundingClientRect();
            rect2 = Util.shallowObjectClone(rect2);

            return RoleWebMenu._util._isRectIntersecInDirection(rect1, rect2, tolerance, direction);
        },
        _isRectIntersecInDirection: function (rect1, rect2, tolerance, direction) {
            var intersectDirection = RoleWebMenu._util.intersectDirection;

            if (direction === intersectDirection.both || direction === intersectDirection.horiz) {
                rect1.left -= tolerance;
                rect1.right += tolerance;
                rect1.width = rect1.right - rect1.left;
            }

            if (direction === intersectDirection.both || direction === intersectDirection.vert) {
                rect1.top -= tolerance;
                rect1.bottom += tolerance;
                rect1.height = rect1.bottom - rect1.top;
            }

            var intersection = Util.intersectRect(rect1, rect2);
            return !Util.isRectEmpty(intersection)
        },
        _findAdjacentMenuNearMenuItem: function (menuItem, menus, tolerance) {
            var curMenu = RoleWebMenu._util._getSurroundingMenus(menuItem)[0];
            return Util.arrayFind(menus, function (menu) {
                if (menu == curMenu)
                    return false;
                return RoleWebMenu._util._isMenuItemAdjacentToMenu(menuItem, menu, tolerance);
            });
        },
        _simulateMouseOverOnMenuItem: function (ao, targetMenuItem, data, relatedTarget) {
            ao._fireEvent(targetMenuItem, 'mouseover', data, relatedTarget);
            if(typeof PointerEvent !== "undefined")
                ao._fireEvent(targetMenuItem, 'pointerover', data, relatedTarget);
            ao._fireEvent(targetMenuItem, 'mouseenter', data, relatedTarget);
            ao._fireEvent(targetMenuItem, 'mousemove', data);
        },
        _isRoleMenu: function (elem) {
            var role = RoleWebUtil.getRole(elem);
            return role === 'menu' || role === 'menubar';
        },
        _hasAttrRoleMenuItem:function(elem){
            var role = RoleWebUtil.getRole(elem);
            return role === 'menuitem' ||
                   role === 'menuitemradio' ||
                   role === 'menuitemcheckbox' ||
                   role === 'menuitemcheckable';
        },
        _isRoleMenuItem: function (elem) {
            var type = elem.getAttribute('type');
            if(RoleWebMenu._util._hasAttrRoleMenuItem(elem)){
                return  type !== 'separator';
            }
            if(elem.nodeName !== "LI")
            	return false;
            var parentListElem = Util.findAncestor(elem.parentElement, function(e){ return e.nodeName === "OL" || e.nodeName === "UL";});
            if(!parentListElem)
                return false;
            if(RoleWebMenu._util._isRoleMenu(parentListElem)){
                var menuItem = RoleWebMenu._util._traverseChildrenBreadth(parentListElem, function(elem){
                    return elem.nodeName === "LI" && (RoleWebMenu._util._hasAttrRoleMenuItem(elem)
                        || Util.makeArray(elem.childNodes).some(function (item) {
                            return item.nodeType === 1 && RoleWebMenu._util._hasAttrRoleMenuItem(item);
                        }));
                }, function(elem){
                    return elem.nodeName !== "LI" ;
                });
            	return !menuItem; //treat UL/OL li without any siblings _hasAttrRoleMenuItem as menuitem
            }

            return false;
        },
        _getVisibleMenuSet: function (elem) {
            var menus = Util.makeArray(elem.querySelectorAll("[role=menu],[role=menubar]"));
            menus = menus.filter(function(menu){
                if (!RoleWebMenu._util._isVisible(menu))
                    return false;
                var surroundingMenus = RoleWebMenu._util._getSurroundingMenus(menu);
                return surroundingMenus.length === 1;
            });
            return menus.filter(RoleWebMenu._util._isVisible);
        },
        _minusArray: function (source, toRemove) {
            return source.filter(function (item) {
                return toRemove.indexOf(item) < 0;
            });
        },
        _isVisible: function (elem) {
            if (!elem.offsetWidth || !elem.offsetHeight)
                return false;
            var boundRect = Util.shallowObjectClone(elem.getBoundingClientRect());
            boundRect.left += window.pageXOffset;
            boundRect.right += window.pageXOffset;
            boundRect.top += window.pageYOffset;
            boundRect.bottom += window.pageYOffset;
            var maxDocWidth = Math.max(document.documentElement.offsetWidth, window.innerWidth);
            var maxDocHeight = Math.max(document.documentElement.offsetHeight, window.innerHeight);
            var windowRect = {
                left: 0,
                top: 0,
                right: maxDocWidth,
                bottom: maxDocHeight
            };
            var intersectRect = Util.intersectRect(windowRect, boundRect);
            if (Util.isRectEmpty(intersectRect))
                return false;
            var style = getComputedStyle(elem, null);
            return style.display !== "none" && style.visibility !== "hidden";
        },

        _isVisibleIgnoreScroll: function (elem, isLeaf) {
            var style = getComputedStyle(elem, null);

            if (isLeaf || style.overflow === "hidden") {
                if (!elem.offsetWidth || !elem.offsetHeight)
                    return false;
            }
            return style.display !== "none" && style.visibility !== "hidden";
        },

        _isDisplayNone: function(elem) {
            var style = getComputedStyle(elem, null);
            return style.display == "none";
        },

        _getMenuItemText: function (elem) {
            var textArr = [];
            getItemTextUtil(elem, textArr);
            var text = textArr.join('');
            return Util.cleanTextProperty(text).trim();

            //helper function
            function getItemTextUtil(node, textArr) {
                var childNodesArray = Util.makeArray(node.childNodes);
                childNodesArray.forEach(function (node) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        textArr.push(node.textContent || '');
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        //if this menu item contains sub-menu, the text should not contain sub-menu's text.
                        if (!RoleWebMenu._util._isRoleMenu(node) && !RoleWebMenu._util._isRoleMenuItem(node) && RoleWebMenu._util._isVisibleIgnoreScroll(node, false)) {
                            //recursive call
                            getItemTextUtil(node, textArr);
                        }
                    }
                });
            }
        },
        _getDirectParentMenu: function (elem) {
            var ret = null;
            var haveMeetMenuItem = false;
            Util.findAncestor(elem, function (elemInner) {
                if (RoleWebMenu._util._isRoleMenuItem(elemInner)){
                    if(haveMeetMenuItem){
                        return true;
                    }
                    else {
                        haveMeetMenuItem = true;
                        return false;
                    }
                } else {
                    if (RoleWebMenu._util._isRoleMenu(elemInner)) {
                        ret = elemInner;
                        return true;
                    }
                }
                return false;
            });
            return ret;
        },

        _getSurroundingMenus:function(elem){
            var ret = [];
            var directMenu = RoleWebMenu._util._getDirectParentMenu(elem);
            if (!directMenu)
                return ret;

            ret.push(directMenu);
            var directMenuRect = directMenu.getBoundingClientRect();

            Util.findAncestor(directMenu.parentElement, function (elem) {
                if (RoleWebMenu._util._isRoleMenuItem(elem))
                    return true;
                if (RoleWebMenu._util._isRoleMenu(elem)) {
                    var elemRect = elem.getBoundingClientRect();
                    var rectIntersect = Util.intersectRect(elemRect, directMenuRect);
                    if (Util.isEqualRects(rectIntersect, directMenuRect)) {
                        ret.push(elem);
                    } else {
                        //outer menu is not fully containing the inner menu, so break-out.
                        return true;
                    }
                }
                return false;
                });
            ret.reverse();
            return ret;
        },
        _getOwnerMenus: function (elem) {
            var ret = [];
            var menu;
            var menuItem;

            var func = function (elemInner) {
                if (RoleWebMenu._util._isRoleMenu(elemInner)) {
                    if (!menu)
                        menu = elemInner;
                    return true;
                }
                else if (RoleWebMenu._util._isRoleMenuItem(elemInner)){
                    if (!menuItem) {
                        menuItem = elemInner;
                        return false;
                    } else {
                        return true;
                    }
                }
                return false;
            };

            Util.findAncestor(elem, func);
            if (menu) {
                if (elem === menu || menuItem) {
                    ret = RoleWebMenu._util._getSurroundingMenus(menu);
                }
            }
            return ret;
        },
        _getOwnerMenuItem: function (elem) {
            if (!elem)
                return null;
            return Util.findAncestor(elem, function (elem) {
                return RoleWebMenu._util._isRoleMenuItem(elem);
            });
        },
        _elemRectSame: function (elem, rect) {
            if (!elem || !rect)
                return false;
            var curRect = elem.getBoundingClientRect();
            //1 pixel threash hold
            return Util.isEqualRects(curRect, rect, 1);
        },
        _doReplay: function (msg, resultCallback, ao, textArr) {
            var visibleMenuSetPreviousGlobal;
            var previousMenuItem;
            var activeChildMenu;
            var timeoutForMenuExpanding = 1000;
            var timeoutForMouseOver = 600;
            var haveClickIntermediateMenuItem;
            var checkInterval = 200;
            var timeElapsed = 0;
            var lastBoundingRectOfMenu;
            var ancestorMenus = [];

            recursiveTriggerSubMenu(0);

            function callRecursiveTrigger(timeout, level, resetElapsed) {
                Util.setTimeout(recursiveTriggerSubMenu, timeout, level);
                if (resetElapsed)
                    timeElapsed = timeout;
                else
                    timeElapsed += timeout;
            }

            function triggerSubMenu(currentLevel) {
                var matchNumber = textArr[currentLevel].match(/^\s*#(\d+)\s*$/);
                var currentMenu;
                var targetMenuItem;
                var visibleMenuSetCur;
                if (currentLevel === 0) {
                    currentMenu = ao._elem;
                } else {
                    if (activeChildMenu) {
                        currentMenu = activeChildMenu;
                        if (timeElapsed < timeoutForMenuExpanding) {
                            if (!RoleWebMenu._util._isVisible(currentMenu)) {
                                if (timeElapsed > timeoutForMouseOver && !haveClickIntermediateMenuItem) {
                                    ao._fireEvent(previousMenuItem, 'click', msg._data);
                                    haveClickIntermediateMenuItem = true;
                                }
                                callRecursiveTrigger(checkInterval, currentLevel, false);
                                return;
                            }
                            if (!RoleWebMenu._util._elemRectSame(currentMenu, lastBoundingRectOfMenu)) {
                                lastBoundingRectOfMenu = currentMenu.getBoundingClientRect();
                                callRecursiveTrigger(checkInterval, currentLevel, false);
                                return;
                            }
                        }
                    } else {
                        visibleMenuSetCur = RoleWebMenu._util._getVisibleMenuSet(document.body);
                        var diffMenuSet = RoleWebMenu._util._minusArray(visibleMenuSetCur, visibleMenuSetPreviousGlobal);
                        if (diffMenuSet.length === 0) {
                            if (timeElapsed < timeoutForMenuExpanding) {
                                if (timeElapsed > timeoutForMouseOver && !haveClickIntermediateMenuItem) {
                                    //detect visibility
                                    var menusToDetect = RoleWebMenu._util._minusArray(visibleMenuSetCur, ancestorMenus);
                                    //10 pixels tolerance
                                    currentMenu = RoleWebMenu._util._findAdjacentMenuNearMenuItem(previousMenuItem, menusToDetect, 10);
                                    if (!currentMenu)
                                        ao._fireEvent(previousMenuItem, 'click', msg._data);
                                    haveClickIntermediateMenuItem = true;
                                }
                                if (!currentMenu) {
                                    callRecursiveTrigger(checkInterval, currentLevel, false);
                                    return;
                                }
                            } else {
                                var menusToDetect = RoleWebMenu._util._minusArray(visibleMenuSetCur, ancestorMenus);
                                //10 pixels tolerance
                                currentMenu = RoleWebMenu._util._findAdjacentMenuNearMenuItem(previousMenuItem, menusToDetect, 10);
                            }
                        } else {
                            currentMenu = diffMenuSet[0];
                            ancestorMenus = ancestorMenus.concat(diffMenuSet);
                        }
                    }
                    if (!currentMenu) {
                        ErrorReporter.ThrowItemNotFound();
                    }

                    if (!lastBoundingRectOfMenu) {
                        activeChildMenu = currentMenu;
                        lastBoundingRectOfMenu = currentMenu.getBoundingClientRect();
                        callRecursiveTrigger(checkInterval, currentLevel, false);
                        return;
                    }
                }

                targetMenuItem = RoleWebMenu._util.getMenuItemToSelect(currentMenu, matchNumber ? matchNumber[1] : textArr[currentLevel], !!matchNumber);
                if (!targetMenuItem)
                    ErrorReporter.ThrowItemNotFound();
                if (targetMenuItem.scrollIntoView)
                    targetMenuItem.scrollIntoView();

                if (ancestorMenus.indexOf(currentMenu) < 0)
                    ancestorMenus.push(currentMenu);

                if (currentLevel !== textArr.length - 1) {
                    activeChildMenu = RoleWebMenu._util._traverseChildrenBreadth(targetMenuItem, function (elem) { return RoleWebMenu._util._isVisible(elem) && RoleWebMenu._util._isRoleMenu(elem); });
                    if (!activeChildMenu)
                        visibleMenuSetPreviousGlobal = visibleMenuSetCur ? visibleMenuSetCur : RoleWebMenu._util._getVisibleMenuSet(document.body);
                    //simulate the mouse over event to expand the pop up menu
                    RoleWebMenu._util._simulateMouseOverOnMenuItem(ao, targetMenuItem, msg._data, previousMenuItem);
                    lastBoundingRectOfMenu = undefined;
                    haveClickIntermediateMenuItem = false;
                    if (targetMenuItem && targetMenuItem.hasAttribute('aria-haspopup')) {
                        timeoutForMenuExpanding = 2000;
                    } else {
                        timeoutForMenuExpanding = 1000;
                    }
                    callRecursiveTrigger(checkInterval, currentLevel + 1, true);
                } else {
                    RoleWebMenu._util._simulateMouseOverOnMenuItem(ao, targetMenuItem, msg._data);
                    var rect = targetMenuItem.getBoundingClientRect();
                    var elemTopMost = document.elementFromPoint((rect.left+rect.right)/2, (rect.top+rect.bottom)/2);
                    //last item fire the select event
                    ao._fireEvent(elemTopMost, 'click', msg._data); //targetMenuItem
                    resultCallback(msg);
                }
                previousMenuItem = targetMenuItem;
            }

            function recursiveTriggerSubMenu(currentLevel) {
                try {
                    triggerSubMenu(currentLevel);
                } catch (e) {
                    var logger = new LoggerUtil("RoleWebMenu");
                    logger.warn("recursiveTriggerSubMenu: Got Exception:" + e + " Details: " + (e.Details || "") + " - CallStack: " + e.stack);

                    msg.status = e.message || "ERROR";
                    resultCallback(msg);
                }
            }
        },
        getMenuItems: function (elem) {
            var surroundingMenus = RoleWebMenu._util._getSurroundingMenus(elem);

            var arr = [];
            getMenuItemUtil(elem, arr);

            return arr;

            //helper function
            function getMenuItemUtil(elem, result) {
                if (!elem.children)
                    return;
                var children = Util.makeArray(elem.children);
                children.forEach(function (elem) {
                    if(RoleWebMenu._util._isDisplayNone(elem))
                        return;

                    if (RoleWebMenu._util._isRoleMenuItem(elem)) {
                        if(RoleWebMenu._util._isVisibleIgnoreScroll(elem, true))
                            result.push(elem);
                    } else {
                        var surroundingMenusInner = RoleWebMenu._util._getSurroundingMenus(elem);
                        if (surroundingMenusInner.length && surroundingMenus.length) {
                            if(surroundingMenusInner[0] == surroundingMenus[0]){
                                //they are in the same menu, recursive call
                                getMenuItemUtil(elem, result);
                        }
                    }
                    }
                });
            }
        },
        indexOfMenuItems: function (menu, menuitem) {
            var arr = RoleWebMenu._util.getMenuItems(menu);
            return arr.indexOf(menuitem);
        },
        getMenuItemToSelect: function (elem, text, isNumber) {
            var items = RoleWebMenu._util.getMenuItems(elem);
            if (isNumber)
                return items[text];

            text = text.trim();
            return Util.arrayFind(items, function (item) {
                return RoleWebMenu._util._getMenuItemText(item) === text;
            });
        },
        getLogicalName: function (elem) {
            // Same as RoleWebUtil.getLogicalName except instead of inner text (as last resort) give top level items
            return ContentUtils.getAccNameFromControl(elem) ||
                elem.getAttribute('name') ||
                elem.getAttribute('id') ||
                RoleWebMenu._util.getMenuItems(elem)
                    .map(function (e) { return RoleWebMenu._util._getMenuItemText(e); })
                    .join(" ");
        },

        //traverse broadth first
        _traverseChildrenBreadth: function (elem, predFound, predTraverseChildren) {
            var unVisited = [];
            unVisited = unVisited.concat(Util.makeArray(elem.children));

            while (unVisited.length) {
                var elemIterate = unVisited.splice(0, 1)[0];
                if (predFound(elemIterate))
                    return elemIterate;
                else{
                    if(predTraverseChildren && !predTraverseChildren(elemIterate)){
                        continue;
                    }
                    unVisited = unVisited.concat(Util.makeArray(elemIterate.children));
                }
            }
            //not found
            return null;
        }
    },
    createAO: function (elem, parentId) {
        if (content.settings.WebActivityState === 1) { //when record
            var ownerMenus = RoleWebMenu._util._getOwnerMenus(elem);
            if (ownerMenus.length) {
                var newAo = RoleWebUtil.createAO(ownerMenus[0], parentId, [this._behavior]);
                return newAo;
            }
        } else {
            if (RoleWebMenu._util._isRoleMenu(elem)) {
                var newAo = RoleWebUtil.createAO(elem, parentId, [this._behavior]);
                return newAo;
            }
        }
        return null;
    },
    _behavior: {
        _micclass: ['WebMenu', 'StdObject'],
        name: 'RoleWebMenuBehavior',
        _helpers: {
            UseEventConfiguration: function (event) {
                return event.type !== "mouseover" &&
                       event.type !== "mousedown" &&
                       event.type !== "mouseup";
            }
        },
        _attrs: {
            'name': function () {
                return RoleWebUtil.getName(this._elem);
            },
            "logical name": function () {
                return RoleWebMenu._util.getLogicalName(this._elem);
            },
            'top level items': function () {
                var items = RoleWebMenu._util.getMenuItems(this._elem);
                return items.map(function (elem) { return RoleWebMenu._util._getMenuItemText(elem); }).join(';');
            },
            'top level items count': function () {
                var items = RoleWebMenu._util.getMenuItems(this._elem);
                return items.length;
            },
            'first item': function () {
                var items = RoleWebMenu._util.getMenuItems(this._elem);
                if (items.length > 0) {
                    return RoleWebMenu._util._getMenuItemText(items[0]);
                }
                return null;
            }
        },
        _methods: {
            LIST_SELECT: function (msg, resultCallback) {
                this._logger.trace('RoleWebMenuBehavior: on command LIST_SELECT');
                var str = msg._data.value;
                var arr = str.split && str.split(';');
                if (!arr)
                    ErrorReporter.ThrowInvalidArg();

                var wrappedCallback = ContentUtils.protectCallbackAgainstPrematureNavigation(resultCallback, msg, this._logger, 'click');
                RoleWebMenu._util._doReplay(msg, wrappedCallback, this, arr);
            }
        },
        _eventHandler: function (recorder, ev) {
            if (ContentUtils.isTouchEnabled())
                return true;
            this._logger.trace('RoleWebMenu._eventHandler: Received recordable event: ', ev.type);
            switch (ev.type) {
                case 'mousedown':
                    var selectedMenuItem = RoleWebMenu._util._getOwnerMenuItem(ev.target);
                    if (selectedMenuItem && !RoleWebMenu._util._isDisabled(selectedMenuItem)) {
                        this._elem = RoleWebMenu._menuPathManager.getActiveRootMenu();
                        var pathText = RoleWebMenu._menuPathManager.getRecordPathText(selectedMenuItem);
                        recorder.sendRecordEvent(this, ev, {
                            event: 'onchange',
                            value: pathText
                        });
                        return true;
                    }
                    if(selectedMenuItem == undefined && RoleWebMenu._util._isRoleMenu(ev.target) && ev.target.children.length == 0){
                        this._elem = ev.target;
                        this._elem._recordInfo = {
                            event: 'onclick',
                            'event point': { x: ev.clientX, y: ev.clientY }
                        };
                        return true;
                    }
                    return true;
                case 'click':
                    if(this._elem && this._elem._recordInfo){
                        var recordInfo = this._elem._recordInfo;
                        delete this._elem._recordInfo;
                        recorder.sendRecordEvent(this, ev, recordInfo);
                    }
                    return true;
                case 'mouseup':
                    return true;
                case 'mouseover':
                    var selectedMenuItem = RoleWebMenu._util._getOwnerMenuItem(ev.target);
                    if (!selectedMenuItem || RoleWebMenu._util._isDisabled(selectedMenuItem))
                        return true;
                    RoleWebMenu._menuPathManager.validate();
                    RoleWebMenu._menuPathManager.enterMenuItem(selectedMenuItem);
                    return true;
            }
            return true;
        },
        _gestureHandler: function (recorder, gestureInfo, targetElement) {
            this._logger.trace('RoleWebMenuBehavior._gestureHandler: Received gesture: ', gestureInfo.event);
            if (gestureInfo.event === "tap" || gestureInfo.event === "longTap") {
                var selectedMenuItem = RoleWebMenu._util._getOwnerMenuItem( targetElement );
                if (selectedMenuItem && !RoleWebMenu._util._isDisabled(selectedMenuItem)) {
                    RoleWebMenu._menuPathManager.validate();
                    RoleWebMenu._menuPathManager.enterMenuItem(selectedMenuItem);

                    this._elem = RoleWebMenu._menuPathManager.getActiveRootMenu();
                    var pathText = RoleWebMenu._menuPathManager.getRecordPathText(selectedMenuItem);
                    recorder.sendRecordEvent(this, null, {
                        event: 'onchange',
                        value: pathText,
                        force_record: true
                    });
                }
            }
            return true;
        }
    }
};

RoleWebMenu._MenuPathManager.prototype = {
    _logger: null,
    _menuPathSet: null,
    _activeRootMenu: null,

    validate: function () {
        //remove those menus that are not visible from history path
        this._menuPathSet.forEach(function (menuPath) {
            menuPath.forEach(function (pathItem) {
                if (!(pathItem.menu.compareDocumentPosition(pathItem.selectedMenuItem) & Node.DOCUMENT_POSITION_CONTAINED_BY)) {
                    //for some AUT, the selectedMenuItem have been removed from the document, we should recover it
                    pathItem.selectedMenuItem = RoleWebMenu._util.getMenuItems(pathItem.menu)[pathItem.selectedMenuItemIndex];
                }
            });

            var menuArr = menuPath.map(function (item) { return item.menu; });
            var nRemoveIndex = Util.arrayFindIndex(menuArr, function (item) { return !RoleWebMenu._util._isVisible(item); });
            if (nRemoveIndex >= 0) {
                menuPath.splice(nRemoveIndex);
            }

            //remove the sub-menu are not adjacent to it's predecessor, in case that multiple menubars use same sub-menu element
            for (var i = 0; i < menuPath.length - 1; i++) {
                var fatherObj = menuPath[i];
                var childObj = menuPath[i + 1];
                if (!RoleWebMenu._util._isMenuItemAdjacentToMenu(fatherObj.selectedMenuItem, childObj.menu, 10)) {
                    menuPath.splice(i + 1);
                    break;
                }
            }
        });
        this._menuPathSet = this._menuPathSet.filter(function (item) { return item.length; });
        if (this._activeRootMenu && !RoleWebMenu._util._isVisible(this._activeRootMenu)) {
            //if user deliberately first hover on sub-menu's father menuitem's sibling(sub-menu's uncle menuitem) ,then quickly moves to sub-menu,
            //and if the uncle menuitem is not near the sub-menu, then this leads to _activeRootMenu point to sub-menu, so it may be unvisible
            this._activeRootMenu = null;
        }

        if (this._activeRootMenu) {
            var activeRootIndexPairArr = this.indexPairArrByMenu(this._activeRootMenu);
            //we must make sure that _activeRootMenu is contained in _menuPathSet
            if (activeRootIndexPairArr.length === 0)
                this._activeRootMenu = null;
        }
    },

    indexPairArrByMenu: function (menuToSearch) {
        var ret = [];
        this._menuPathSet.forEach(function (menuPath, outerIndex) {
            menuPath.forEach(function (pathItem, innerIndex) {
                if (pathItem.menu == menuToSearch)
                    ret.push({ outerIndex: outerIndex, innerIndex: innerIndex });
            });
        });
        return ret;
    },

    pathItemByMenu: function (menuPath, menu) {
        return Util.arrayFind(menuPath, function (pathItem) { return pathItem.menu == menu; });
    },

    eraseFollowingSubPath: function (menuPath, remainedPathItem) {
        var indexRemained = menuPath.indexOf(remainedPathItem);
        if (indexRemained >= 0 && indexRemained + 1 < menuPath.length)
            menuPath.splice(indexRemained + 1);
    },

    enterMenuItem: function (menuItemToEnter) {
        var menuToEnter = RoleWebMenu._util._getSurroundingMenus(menuItemToEnter)[0];
        var menuItemIndex = RoleWebMenu._util.indexOfMenuItems(menuToEnter, menuItemToEnter);

        if (this._menuPathSet.length === 0) {
            this.appendNewPath(menuToEnter, menuItemToEnter, menuItemIndex, menuToEnter);
        } else {
            var activePath = this.getActiveMenuPath();

            if (activePath) {
                var locatedPathItem = this.pathItemByMenu(activePath, menuToEnter);
                if (locatedPathItem) {
                    if (locatedPathItem.selectedMenuItem != menuItemToEnter) {
                        this.eraseFollowingSubPath(activePath, locatedPathItem);
                        locatedPathItem.selectedMenuItem = menuItemToEnter;
                        locatedPathItem.selectedMenuItemIndex = menuItemIndex;
                    }
                } else {
                    var lastPathItem = RoleWebMenu._util._lastItem(activePath);
                    if (RoleWebMenu._util._isMenuItemAdjacentToMenu(lastPathItem.selectedMenuItem, menuToEnter, 10)) {
                        this.appendPathItem(activePath, menuToEnter, menuItemToEnter, menuItemIndex);
                    } else {
                        this.appendNewPath(menuToEnter, menuItemToEnter, menuItemIndex, menuToEnter);
                    }
                }
            } else {
                //if user click other AO, that leads to _activeRootMenu is cleared, so we come here.
                var locatedPathIndexPairArr = this.indexPairArrByMenu(menuToEnter);
                if (locatedPathIndexPairArr.length === 0) {
                    this.appendNewPath(menuToEnter, menuItemToEnter, menuItemIndex, menuToEnter);
                } else {
                    //to simplify logic, we just use the first item to  treat it as activeRootMenu
                    activePath = this._menuPathSet[locatedPathIndexPairArr[0].outerIndex];
                    this._activeRootMenu = activePath[0].menu;
                    var locatedPathItem = this._menuPathSet[locatedPathIndexPairArr[0].outerIndex][locatedPathIndexPairArr[0].innerIndex];
                    if (locatedPathItem.selectedMenuItem != menuItemToEnter) {
                        activePath.splice(locatedPathIndexPairArr[0].innerIndex + 1);
                        locatedPathItem.selectedMenuItem = menuItemToEnter;
                        locatedPathItem.selectedMenuItemIndex = menuItemIndex;
                    }
                }
            }
        }
    },
    appendNewPath: function (menu, menuItem, menuItemIndex, activeRootMenu) {
        this._menuPathSet.push([{ menu: menu, selectedMenuItem: menuItem, selectedMenuItemIndex: menuItemIndex }]);
        this._activeRootMenu = activeRootMenu;
    },
    appendPathItem: function (menuPath, menuToAppend, menuItemToAppend, menuItemIndex) {
        menuPath.push({ menu: menuToAppend, selectedMenuItem: menuItemToAppend, selectedMenuItemIndex: menuItemIndex });
    },

    getActiveRootMenu: function () {
        return this._activeRootMenu;
    },

    getRecordPathText: function (menuItem) {
        var activePath = this.getActiveMenuPath();
        if (!activePath)
            return "";
        var arrText = [];
        activePath.some(function (pathItem) {
            arrText.push(RoleWebMenu._util._getMenuItemText(pathItem.selectedMenuItem));
            return pathItem.selectedMenuItem == menuItem;
        });
        return arrText.join(";");
    },
    clearActiveRootMenu: function () {
        this._activeRootMenu = null;
    },

    //retrive the active Record Menu Path
    getActiveMenuPath: function () {
        var activeRootIndexArr = this.indexPairArrByMenu(this._activeRootMenu);
        if (!activeRootIndexArr.length)
            return null;
        activeRootIndexArr = activeRootIndexArr.filter(function (item) { return item.innerIndex === 0; });
        if (activeRootIndexArr.length > 1)
            this._logger.warn("RoleWebMenu._MenuPathManager.getActiveMenuPath active menu count larger than 1, it is: ", activeRootIndexArr.length);
        return this._menuPathSet[activeRootIndexArr[0].outerIndex];
    },
};

RoleWebMenu._menuPathManager = new RoleWebMenu._MenuPathManager;

RoleWebKit.registerFactory(RoleWebMenu);