var SAPButtonBehavior = {
    _micclass: ["SAPButton", "WebButton", "StdObject"],
    _attrs: {
        "innertext": function () {
            return this._elem.textContent.replace(/\xA0/g, " ");//keep space character as same as IE
        },
        "micclass": function () {
            return "SAPButton";
        },
        "name": function () {
            return this.getLogicalName();
        },
        "logical name": function () {
            return this.getLogicalName();
        },
        "sapbutton clickable id": function () {
            return this.getID();
        },

        "sapbutton menu button id": function () {
            // Get the "menu button" part of the button
            return this.getMenuButtonRuntimeID();
        },

        "sap menu button type": function () {
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPSP_PORTAL_EXPANDABLE_MENU_BUTTON))
                return 2; // SAP_MENU_BUTTON_TYPE_PORTAL_EXPANDABLE
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPSP_BUTTON_PORTALMENUBAR))
                return 3; // SAP_MENU_BUTTON_TYPE_PORTAL_MENUBAR
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPSP_BUTTON_PORTALSTANDARD))
                return 1; // SAP_MENU_BUTTON_TYPE_PORTAL_DROP
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPSP_BUTTON_CRMHISTORYMENU))
                return 5; // SAP_MENU_BUTTON_TYPE_CRM_HISTORY
            return 0; // SAP_MENU_BUTTON_TYPE_UNKNOWN
        },

        "sap drop menu id": function () {
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPSP_BUTTON_PORTALMENUBAR)) {
                return "SubMenuContainer_button" + this._elem.id + "0";
            } else
                return null;

        },

        "disabled": function () {
            return this._elem.disabled ? 1 : 0;
        },

        "type": function () {
            return this._elem.type || '';
        }
    },
    _helpers: {
        isLearnable: Util.alwaysTrue,
        getLogicalName: function () {
            if (this._elem.tagName.toUpperCase() == "IMG") {
                return SAPButtonBehavior.getFixedNameAttrByElement(this._elem, "logical name", true);
            } else {
                var textNode = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAPSP_Button_ICWC_TEXT);
                if (textNode != null) {
                    var text = SAPUtils.fixLogicalName(textNode.innerText);
                    if (!!text)
                        return text;
                }
                var text = SAPUtils.fixLogicalName(this._elem.innerText);
                if (!!text)
                    return text;

                var title = this._elem.getAttribute("title");
                if (!!title) {
                    title = SAPUtils.fixLogicalName(title);
                    if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPSP_IVIEW_MINMAXBUTTON_MAIN)) {
                        var table = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAPSP_IVIEW_CONTAINING_TABLE, 12);
                        if (table != null) {
                            var header = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAPSP_IVIEW_TITLE);
                            if (header != null) {
                                title = header.innerText + "_" + title;
                            }
                        }
                    }
                    return title;
                }

                var innerButton = this.getInnerObject(this._elem, false);
                if (innerButton != null && innerButton !== this._elem) {
                    var text = SAPButtonBehavior.getFixedNameAttrByElement(innerButton, "logical name");
                    if (!!text)
                        return text;
                }

                var value = this._elem.getAttribute("value");
                if (!!value)
                    return value;
            }
            return "";
        },

        isDisabled: function () {
            return SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPSP_IMAGEBUTTON_DISABLED);
        },

        isMenuButtonElement: function (elem) {
            if (elem == null)
                return false;

            if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_BUTTON_PORTALMENUBAR_HISTORY))
                return false;
            // Can we be sure spElement is a menu button?
            if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_BUTTON_MENU_ARROW))
                return true;

            var children = elem.children;
            if (children != null) {
                for (var i = 0; i < children.length; i++) {
                    if (SapConfigurationUtil.isElementOfSpecifier(children[i], SAP_SPECIFIER_ENUM.SAPSP_MENU_BUTTON_IMG))
                        return true;
                }
            }
            //In Protal7.3, the "IMG" icon may be in a descendants, instead of a child
            if (SapConfigurationUtil.getElementOfCollection(elem, SAP_SPECIFIER_ENUM.SAPSP_MENU_BUTTON_IMG) != null)
                return true;

            // Don't continue if this is the root element of this button
            if (elem === this._elem)
                return false;

            // Maybe spElement parent is a menu button
            if (elem.parentElement == null)
                return false;

            // continue with parent
            return this.isMenuButtonElement(elem.parentElement);
        },

        getMenuButtonRuntimeID: function () {

            var innerObj = this.getInnerMenuButtonObject();
            if (!innerObj)
                return null;

            var menuAO = SAPKitFactory.createAO(innerObj, this.getID(), [SAPButtonBehavior]);
            return menuAO.getID();
        },

        getInnerMenuButtonObject: function () {
            var arrowButton = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_BUTTON_ARROW_SPAN);
            if (arrowButton) {
                return arrowButton;
            }
            return this.getInnerObject(this._elem, true);
        },

        getInnerObject: function (elem, isMenuButton) {
            //isMenuButton - if 'true' look for a menu button element.
            //               if 'false' look for a non-menu button element.
            if (elem.childElementCount == undefined)
                return null;

            if (elem.childElementCount == 0) {
                if ((isMenuButton == this.isMenuButtonElement(elem)) ||
                    SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_PORTAL_EXPANDABLE_MENU_BUTTON))
                    return elem;
                else
                    return null;
            }

            // Try out the different branches
            for (var i = 0; i < elem.childElementCount; i++) {
                var child = elem.children[i];
                if (!child)
                    return null;
                var innerButton = this.getInnerObject(child, isMenuButton);
                if (innerButton)
                    return innerButton;
            }

            return null;
        },
    },

    _handlerFunc: function (recorder, ev) {
        if (ev.type === 'click') {
            recorder.sendRecordEvent(this, ev, {
                event: 'onclick',
                'event point': { x: ev.clientX, y: ev.clientY },
                "sapbutton is menu button": this.isMenuButtonElement(ev.target)
            });
            return true;
        }
    },

    _eventHandler: function (recorder, ev) {
        this._logger.trace('SAPButton.eventHandler: Received recordable event on ' + this._elem.tagName + ': ' + ev.type);

        var target = ev.target;
        if (target == null)
            return false;

        if (SapConfigurationUtil.isElementOfSpecifier(target, SAP_SPECIFIER_ENUM.SAP_SCROLL_BUTTON)) {
            if (ev.type == "mousedown" || ev.type == "mouseup")
                ev["is scroll button"] = true;
            else
                return false;
        } else {
            if (SapConfigurationUtil.isElementOfSpecifier(target, SAP_SPECIFIER_ENUM.SAPSP_BUTTON_NWBC_POPUPCLOSE)) {
                if (ev.type == "mousedown")
                    return false;
            } else {
                if (ev.type == "mouseup")
                    return false;
            }
            if (ev.type == "mousedown" || ev.type == "mouseup")
                ev["event"] = "onclick";
        }

        if (this.isDisabled())
            return false;

        if (SapConfigurationUtil.isElementOfSpecifier(target, SAP_SPECIFIER_ENUM.SAPSP_ICWC_FOOT_BUTTONS))
            return false;

        if (ContentUtils.isTouchEnabled())
            return SAPButtonBehavior._eventHandlerTouchEnabled.call(this, recorder, ev);

        return SAPButtonBehavior._handlerFunc.call(this, recorder, ev);
    },

    getFixedNameAttrByElement: function(obj, attr, onlyWebKit) {
        if (!obj) 
            return "";

        var ao;
        if (onlyWebKit) {
            ao = WebKit.createAO(obj, this._parentID); 
        }
        else {
            ao = content.kitsManager.createAO(obj, this._parentID);
        }
        
        return SAPButtonBehavior.getFixedNameAttr(ao, attr);
    },

    getFixedNameAttr: function (ao, attr) {
        if (!ao)
            return "";
        var value = ao.GetAttrSync(attr);
        if (!!value && typeof value == "string")
            return SAPUtils.fixLogicalName(value);
        else
            return "";
    }
};
var SAPCRMButtonBehavior = {
    _micclass: ["SAPButton", "WebButton", "StdObject"],
    _helpers: {
        getLogicalName: function () {
            if (this.isMenuButtonElement(this._elem)) {
                var innerObject = this.getInnerObject(this._elem, false);
                if (innerObject != null && innerObject !== this._elem) {
                    var logicalName = SAPButtonBehavior.getFixedNameAttrByElement(innerObject, "logical name", true);
                    if (!!logicalName)
                        return logicalName;
                }
            }

            var logicalName = SAPUtils.fixLogicalName(this._elem.innerText);
            if (!!logicalName)
                return logicalName;

            logicalName = SAPUtils.fixLogicalName(this._elem.getAttribute("title"));
            if (!!logicalName)
                return logicalName;

            logicalName = SAPUtils.fixLogicalName(this._elem.getAttribute("value"));
            if (!!logicalName)
                return logicalName;

            return "";
        },
        isDisabled: function () {
            return SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_BUTTON_DISABLED) &&
                !SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_BUTTON_FAKE_DISABLED);
        },
        isMenuButtonElement: function (elem) {
            if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_A) &&
                SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_BUTTON_SECOND, 2) != null)
                return elem.title && elem.title.toUpperCase().indexOf("MENU") >= 0;
            else
                return false;
        },
        getInnerObject: function (elem, isMenu) {
            if (isMenu == this.isMenuButtonElement(elem))
                return elem;
            if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_A) &&
                SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_BUTTON_SECOND, 2) != null) {
                var container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_ROW, 4);
                if (container != null) {
                    var collection = SapConfigurationUtil.filterCollection(container, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_A);
                    for (var i = 0; i < collection.length; i++) {
                        if (isMenu == this.isMenuButtonElement(collection[i])) {
                            return collection[i];
                        }
                    }
                }
            }
            return null;
        }
    },

};

var SAPWDAButtonBehavior = {
    _micclass: ["SAPButton", "WebButton", "StdObject"],
    _attrs: {
        "wda object": function () { //PN_SAP_IS_WDA
            return true;
        },
        "get nearby arrow": function () { //PN_GET_ARROW_BUTTON
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_STANDARDBUTTON)) {
                var parent = this._elem.parentNode;
                var arrow = SapConfigurationUtil.getElementOfCollection(parent, SAP_SPECIFIER_ENUM.SAP_WDA_BUTTONCHOICE);
                if (arrow != null) {
                    var ao = KitUtil.createAO(arrow, this.getParent(), [SAPWDAButtonBehavior]);
                    if (ao != null)
                        return ao.id;
                }
            }
        },
        "is menu open": function () {
            return this.isDropDownMenuOpen();
        },
        "sap menu button type": function () {
            return 4; // SAP_MENU_BUTTON_TYPE_WDA
        },
        "sap drop menu id": function () {
            var menuId;
            // NWBC Standard dropdownmenu Button
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPSP_PORTAL_SEARCHBAR_BUTTON1)) {
                var domId = this._elem.id;
                // The drop menu id should be from the lsdata, normally format like this:
                // {0:'STANDARD',1:'',2:true,3:false,4:false,5:false,6:'',7:'',8:'',9:true,10:'mnu_s___AGIM0:D:0',11:false,12:'',13:'NONE',14:false,15:false,16:'',17:'NONE'}
                var lsdata, strData;
                lsdata = SAPButtonBehavior.getFixedNameAttr(this, "lsdata");
                strData = SAPKitUtil.getLsDataStringParameter(lsdata, 10);
                menuId = strData;
                // See if there is a more appropriate item in lsdata.
                var index = -1;
                while ((!strData || -1 == strData.indexOf("mnu_")) && ++index <= 17) {
                    if (10 == index)
                        continue;

                    strData = SAPKitUtil.getLsDataStringParameter(lsdata, index);
                }
                if (index <= 17)
                    menuId = strData;

                if (!menuId) {
                    // this scenario dropdownmenu id is from attribute like this:
                    // he popup="aaabFBPB.ContentCatalogDisplayView.NewButton.2147483647"
                    // funny this is that property name should not contain space, so here get value with property name "popup"
                    // menu table is like this:
                    // <TABLE style="WIDTH: 57px" id=aaabFBPB.ContentCatalogDisplayView.NewButton.2147483647-r
                    menuId = SAPButtonBehavior.getFixedNameAttr(this, "popup");
                    if (!!menuId) {
                        menuId += "-r";
                    }
                }

                return menuId;
            }

            var visibleMenuIndex = -1;
            var vecMenuElems = SapConfigurationUtil.filterCollection(document, SAP_SPECIFIER_ENUM.SAP_WDA_DROPDOWNMENU);
            if (vecMenuElems && vecMenuElems.length == 1)
                visibleMenuIndex = 0;
            if (vecMenuElems && vecMenuElems.length > 1) {
                //If have several menus, choose the first visible menu
                for (let i = 0; i < vecMenuElems.length; i++) {
                    var isMenuVisible = SAPUtils.isWDADropDownMenuVisible(vecMenuElems[i]);
                    if (isMenuVisible) {
                        visibleMenuIndex = i;
                        break;
                    }
                }

                //if all the menus are invisible, choose the first menu
                if (visibleMenuIndex < 0)
                    visibleMenuIndex = 0;
            }
            if (visibleMenuIndex >= 0) {
                menuId = vecMenuElems[visibleMenuIndex].id;
            }
            return menuId;
        }
    },
    _helpers: {
        getLogicalName: function () {
            var name = SAPButtonBehavior._helpers.getLogicalName.call(this);

            if (!name) {
                var lsdata = SAPUtils.fixLogicalName(this._elem.getAttribute("lsdata"));
                name = SAPKitUtil.getLsDataStringParameter(lsdata, 1);
            }
            if (!name) {
                name = SAPUtils.fixLogicalName(this._elem.getAttribute("oldtitle"));
            }
            if (!name) {
                var popupTrigger = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_POPUP_TRIGGER, 2);
                if (popupTrigger != null) {
                    name = popupTrigger.innerText;
                }
            }
            return name;
        },
        isMenuButtonElement: function (elem) {
            if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_LINK2ACTIONBUTTON) ||
                SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_POPUP_TRIGGER_MENUBUTTON) ||
                SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_EP_NAVIGATION_TRIGGER_MENUBUTTON))
                return true;
            else
                return SAPButtonBehavior._helpers.isMenuButtonElement.call(this, elem);
        },
        isDropDownMenuOpen: function () {
            var vecMenuElems = SapConfigurationUtil.filterCollection(document, SAP_SPECIFIER_ENUM.SAP_WDA_DROPDOWNMENU);
            for (let i = 0; i < vecMenuElems.length; i++) {
                var menuOpen = SAPUtils.isWDADropDownMenuInOpenState(vecMenuElems[i]);
                if (menuOpen)
                    return true;
            }
        }
    },


};

var SAPSearchButtonBehavior = {
    _micclass: SAPButtonBehavior._micclass,
    _attrs: SAPButtonBehavior._attrs,

    // To find the edit box that is adjacent to the button, which is relevant for "OpenPossibleEntries"
    _findEdit: function () {
        if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPSP_MATCHCODE_CONTAINER)) {
            var buttonRect = this._elem.getBoundingClientRect();

            var items = SapConfigurationUtil.filterCollection(document, SAP_SPECIFIER_ENUM.SAPSP_MATCHCODE_EDIT);
            for (var i = 0; i < items.length; i++) {
                var editRect = items[i].getBoundingClientRect();
                if (Math.abs(editRect.top - buttonRect.top) < 8 &&
                    Math.abs(editRect.right - buttonRect.left) < 8 &&
                    !SAPCalendar.isCalendar(items[i])) {
                    return SAPKitFactory.createAO(items[i], this._parentID, [SAPEditBehavior]);
                }
                else if ((Math.abs(editRect.top - buttonRect.top) < 8 &&
                    editRect.right < buttonRect.left) &&
                    !SAPCalendar.isCalendar(items[i])) {
                    var editParent = items[i].parentElement;
                    if (editParent) {
                        var editParentRect = editParent.getBoundingClientRect();
                        if (Math.abs(editParentRect.top - buttonRect.top) < 8 &&
                            Math.abs(editParentRect.right - buttonRect.left) < 8) {
                            return SAPKitFactory.createAO(items[i], this._parentID, [SAPEditBehavior]);
                        }
                    }
                }
            }
        } else {
            var pattern = "webguiRaiseSearchhelp('";
            var start = this._elem.outerHTML.indexOf(pattern);
            var end = this._elem.outerHTML.indexOf("')", start);
            if (start >= 0 && start < end) {
                var name = this._elem.outerHTML.substring(start + pattern.length, end);
                // TODO: GetParentFrame
                var parentFrame = this.getParent();
                if (parentFrame != null) {
                    var inputElementCollection = document.getElementsByTagName("input");
                    var lengthInputCol = inputElementCollection != null ? inputElementCollection.length : 0;

                    if (lengthInputCol > 0 && (inputElementCollection != null)) {

                        var disp = inputElementCollection[name];
                        if (disp != null)
                            return SAPKitFactory.createAO(disp, this._parentID, [SAPEditBehavior]);

                    }
                }
            }
        }
        return null;
    },

    _findWdjTable: function () {
        if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPSP_MATCHCODE_CONTAINER)) { //NavBar_NodeContainer
            var buttonDomRect = SAPUtils.getRectangle(this._elem);
            if (buttonDomRect == null)
                return null;

            var editElements = SapConfigurationUtil.filterCollection(document, SAP_SPECIFIER_ENUM.SAPSP_MATCHCODE_EDIT);
            for (let i = 0; i < editElements.length; i++) {
                var editElem = editElements[i];
                var editDomRect = SAPUtils.getRectangle(editElem);
                if (editDomRect == null)
                    continue;

                //ACTUAL SEARCH FOR WDJ TABLE
                var wdjTable = SapConfigurationUtil.getContainerElement(editElem, SAP_SPECIFIER_ENUM.SAP_WDJ_TABLE, 10);
                if (wdjTable != null) {
                    var wdjWrappingTable = SapConfigurationUtil.getContainerElement(wdjTable, SAP_SPECIFIER_ENUM.SAP_WRAPPER_TABLE, 10);
                    if (wdjWrappingTable != null) {
                        var id = wdjWrappingTable.id;
                        if ((id.indexOf("WD") != 0) && (id.indexOf("aaaa") != 0)) {
                            //not WDA and not PORTAL. IE - the id of the wrapping table is not a WDA id and not portal id
                            return wdjTable;
                        }
                    }

                }
            }
        }
        return null;
    },

    _getParentSapTable: function (sapEdit) {
        return SAPUtils.getParentSapTable(sapEdit); 
    },

    _handlerFunc: function (recorder, ev) {
        if (ev.type === 'click') {
            var editAO = SAPSearchButtonBehavior._findEdit.call(this);
            if (editAO) {
                recorder.sendRecordEvent(editAO, ev, {
                    event: 'onclick',
                    "sap event from help button": true,
                    'event point': { x: ev.clientX, y: ev.clientY }
                });
            }
            //Do not let other AO handle this event.
            return true;
        }
    },

    _eventHandler: function (recorder, ev) {
        this._logger.trace('SAPSearchButton.eventHandler: Received recordable event on ' + this._elem.tagName + ': ' + ev.type);
        if (ContentUtils.isTouchEnabled())
            return SAPSearchButtonBehavior._eventHandlerTouchEnabled.call(this, recorder, ev);


        var htmlWdjTable = SAPSearchButtonBehavior._findWdjTable.call(this);
        if (htmlWdjTable != null)
            return true;

        var sapEdit = SAPSearchButtonBehavior._findEdit.call(this);
        if (sapEdit == null)
            return true;

        var parentTable = SAPSearchButtonBehavior._getParentSapTable.call(this,sapEdit);
        var params = {event: 'onclick'};

        if (parentTable == null) {
            params["mic class"] = "SAPEdit";
        }
        else {
            ev.element = sapEdit._elem;
            ev.params = params;
            parentTable._behaviors.slice().reverse().some(function (behavior) {
                return behavior._eventHandler && behavior._eventHandler.call(parentTable, recorder, ev);
            }, this);
            params = ev.params;
            params["SearchButtonInTable"] = true;
        }

        params["id"] = sapEdit.getID();
        if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPSP_MATCHCODE_CONTAINER))
            params["sap event from help button"] = true;

        if (parentTable == null) {
            recorder.sendRecordEvent(sapEdit, ev, params);
        }
        else {
            recorder.sendRecordEvent(parentTable, ev, params);
        }

        return true;
    }
};

