
var SAPWDADropDownMenuBehavior = {
    _micclass: ["SAPDropDownMenu", "WebElement", "StdObject"],
    _attrs: {
        "wda object": function () { //PN_SAP_IS_WDA
            return true;
        },
        "logical name": function () {
            return this._GetLogicalName();
        },
        "all items": function () {
            return this._GetMenuItems(this._elem);
        },
        "sap id": function () {
            if (!SAPUtils.isWDADropDownMenuVisible(this._elem)) {
                // if myself is invisible, try to locate the visible one with same html id in urframes-like div.
                var bstrMyId = this._elem.getAttribute('id');
                var dropdownElements = SAPUtils.findElementsRecursive(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_DROPDOWNMENU);
                var spOther;
                for (var i = 0; i < dropdownElements.length; i++) {
                    if (dropdownElements[i].getAttribute('id') == bstrMyId
                        && SAPUtils.isWDADropDownMenuVisible(dropdownElements[i])) {
                        spOther = dropdownElements[i];
                    }
                }

                if (spOther) {
                    var spOtherAo = new AO(spOther, this.getID());
                    spOtherAo.mergeBehavior(CommonBehavior);
                    return spOtherAo.GetAttrSync('id');
                }

            }
            return "";
        },

    },
    _helpers: {
        isLearnable: Util.alwaysTrue,
        _GetLogicalName: function () {
            // return the text of the first node
            var firstNode = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_DROPDOWNMENUITEM);
            if (firstNode) {
                return this._GetMenuItemText(firstNode);
            }
            return "";
        },
        _GetMenuItemText: function (elem) {
            var text = "";
            var menuItemLabel = SapConfigurationUtil.getElementOfCollection(elem, SAP_SPECIFIER_ENUM.SAP_WDA_DROPDOWNMENUITEM_TEXT);
            if (menuItemLabel) {
                text = menuItemLabel.innerText;
            }
            text = text.trim();
            if (!text) {
                text = elem.innerText;
                text = text.trim();
            }
            if (text) {
                text = text.replace('\t', ' ');
                text = text.replace('\n', '');
                text = text.replace('\r', '');
            }
            return text;
        },
        GetDropDownPath: function (spMenuItemElem, Path) {
            if (spMenuItemElem == null)
                return;
            //get sub_menu element for provided menu_item
            var spMenuElem = SapConfigurationUtil.getContainerElement(spMenuItemElem, SAP_SPECIFIER_ENUM.SAP_WDA_DROPDOWNMENU, 3);
            if (spMenuElem == null)
                return;
            //get a parent menu_item that is pointing to this sub_menu
            var spParentMenuItemElem = this._GetMenuMember(spMenuElem, 0);
            //prevent infinite loop
            if (spParentMenuItemElem != null && SapConfigurationUtil.isElementOfSpecifier(spParentMenuItemElem, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_ACTIVEITEM)
                && spMenuElem != SapConfigurationUtil.getContainerElement(spParentMenuItemElem, SAP_SPECIFIER_ENUM.SAP_WDA_DROPDOWNMENU, 3)) {
                this.GetDropDownPath(spParentMenuItemElem, Path);//recursive call with a parent menu_item
            }
            var menuItemText = this._GetMenuItemText(spMenuItemElem);
            Path.value = !Path.value ? menuItemText : Path.value + ";" + menuItemText;
            return;
        },
        _GetMenuItems: function (elem) {
            var spChildrenCol = elem.getElementsByTagName('*');
            var vecOfElements;
            if (spChildrenCol) {
                vecOfElements = SapConfigurationUtil.filterCollection(spChildrenCol, SAP_SPECIFIER_ENUM.SAP_WDA_DROPDOWNMENUITEM);
                if (vecOfElements.length <= 0)
                    vecOfElements = SapConfigurationUtil.filterCollection(spChildrenCol, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENUITEM);
            }
            return vecOfElements;
        },
        _IsLeafMenuItem: function (spItemElement) {
            if (spItemElement == null)
                return true;
            //check if menu item has a child whose className = urMnuSubOn|NewMenuArrow
            var vecOfElements = SapConfigurationUtil.filterCollection(spItemElement, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_ARROWITEM);
            if (vecOfElements.length == 0) {
                vecOfElements = SapConfigurationUtil.filterCollection(spItemElement, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_ARROWITEM1);
            }
            return vecOfElements.length == 0;
        },
        _GetActiveMenuItem: function (spMenuElement) {
            var spChildrenCol = spMenuElement.getElementsByTagName('*');
            if (spChildrenCol != null) {
                var vecOfElements = SapConfigurationUtil.filterCollection(spChildrenCol, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_ACTIVEITEM);
                if (vecOfElements.length > 0)
                    return vecOfElements[0];
            }
            return null;
        },
        GetNextWDAMenuMemberID: function (lsDataStr) {
            //handle the lsdata like below, to extract id of submenu.
            // lsdata="{0:'',1:'User Settings',2:false,3:false,4:false,5:true,6:true,7:'WD88',8:false,9:'',10:'',11:'INHERIT',12:false,13:'',14:false,15:'NONE',16:false,17:'NONE'}"
            var lsIndexStr = SAPUtils.extractDataFromLsDataStr(lsDataStr, "7:'", "',8");
            if (lsIndexStr.indexOf("WD") == 0)// sub menu id begin with WD
                return lsIndexStr;
            else
                return "";
        },
        GetNextMenuMemberIDByType: function (lsDataStr, menuMemberType) {
            var strNextMenuMemberID = "";
            switch (menuMemberType) {
                case 0:
                    {
                        //handle the lsdata like below, to extract id of parent.
                        //lsdata="{6:'\x7b\x22SID\x22\x3a\x22wnd\x5b0\x5d\x2fmbar\x2fmenu\x5b6\x5d\x22,\x22Type\x22\x3a\x22GuiMenu\x22\x7d'}"
                        var i = lsDataStr.indexOf("wnd");
                        if (i > 0) {
                            var j = lsDataStr.indexOf("\\x22", i);
                            if (j > 0) {
                                strNextMenuMemberID = lsDataStr.substr(i, j - 1);
                                strNextMenuMemberID = strNextMenuMemberID.replace("\\x5b", "[");
                                strNextMenuMemberID = strNextMenuMemberID.replace("\\x5d", "]");
                                strNextMenuMemberID = strNextMenuMemberID.replace("\\x2f", "/");
                            }
                        }
                        //handle the lsdata like below, to extract id of parent.
                        //lsdata = "{6:{SID:'wnd[0]/mbar/menu[4]',Type:'GuiMenu'}}"
                        if (strNextMenuMemberID.length == 0) {
                            lsIndexStr = SAPUtils.extractDataFromLsDataStr(lsDataStr, "SID:'", "'");
                            if (lsIndexStr.indexOf("wnd") == 0)
                                strNextMenuMemberID = lsIndexStr;
                        }
                        break;
                    }
                case 1:
                    {
                        //handle the lsdata like below, to extract id of submenu.
                        //{1:'Help', 6 : true, 7 : 'mnu_165', 18 : '\x7b\x22SID\x22\x3a\x22wnd\x5b0\x5d\x2fmbar\x2fmenu\x5b6\x5d\x22,\x22Type\x22\x3a\x22GuiMenu\x22\x7d'}
                        lsIndexStr = SAPUtils.extractDataFromLsDataStr(lsDataStr, "7:'", "'");
                        if (lsIndexStr.indexOf('mnu') == 0 || lsIndexStr.indexOf('WD') == 0 || lsIndexStr.indexOf('TreeView') > 0)// sub menu id begin with mnu or WD
                            strNextMenuMemberID = lsIndexStr;
                    }
            }
            return strNextMenuMemberID;
        },
        GetRebuildNextMenuMemberID: function (strID, menuMemberType) {
            var strNextMenuMemberID = "";
            var strNumericID = strID.substr(2);//remove first two characters that are not numbers (WD01AF --> 01AF)
            var strNumber = parseInt(strNumericID, 16);

            switch (menuMemberType) {
                case 1:
                    ++strNumber;//sub_menu_id = menu_item_id + 1; (01AF --> 01B0)
                    break;
                case 0:
                    --strNumber;//parent_menu_item_id = menu_id - 1; (01AF --> 01AE)
                    break;
                default:
                    return "";
            }
            strNextMenuMemberID = strID.substr(0, 2) + strNumber.toString().padStart(4, "0").toUpperCase();
            return strNextMenuMemberID;
        },
        _GetNextMenuMemberID: function (lsDataStr, strID, menuMemberType) {
            var NextWDAMenuMemberID = this.GetNextWDAMenuMemberID(lsDataStr);
            if (NextWDAMenuMemberID != "")
                return NextWDAMenuMemberID;

            var strNextMenuMemberID = this.GetNextMenuMemberIDByType(lsDataStr, menuMemberType);
            if (strNextMenuMemberID != "")
                return strNextMenuMemberID;

            var rebuildNextMenuMemberID = this.GetRebuildNextMenuMemberID(strID, menuMemberType);
            return rebuildNextMenuMemberID;
        },
        _GetMenuMember: function (spElement, menuMemberType) {
            //get element id as long
            var strID = spElement.getAttribute('id');
            // For a new case in CRM, the id is xxxxx.ID_xxxxxx:xxxxx
            // TODO: Find out the method to get the sub menu items.
            // id is like below, for example:
            // Case1:
            // <TABLE id=/SAPSRM/WDC_UI_SC_DOTC_BD.ID_000100060008:V_SC_DOTC_BASIC.ADD_ITEM.1 
            //	...
            //		<TR id=/SAPSRM/WDC_UI_SC_DOTC_BD.ID_000100060008:V_SC_DOTC_BASIC.DESCRIBE_ITEM
            // Case2:
            // <TABLE id=FPM_OIF_COMPONENT.ID_0001:CNR_VIEW.BT_CALL_HELP.1
            //	...
            //		<TR id=FPM_OIF_COMPONENT.ID_0001:CNR_VIEW.HELP_CENTER
            var strNextMenuMemberID;
            if (strID.match("\\.ID_.*:") != null) {
                return this._GetActiveMenuItem(spElement);
            }
            if (strID.indexOf("AGIM") >= 0) {// NWBC ITS menu
                switch (menuMemberType) {
                    case 1:
                        {
                            strNextMenuMemberID = "mnu_" + strID;
                            return document.getElementById(strNextMenuMemberID);
                        }
                    case 0:
                        {
                            var menu = SapConfigurationUtil.getContainerElement(spElement, SAP_SPECIFIER_ENUM.SAP_WDA_DROPDOWNMENU, 4);
                            if (menu) {
                                var menuID = menu.getAttribute('id');
                                // top level menu id is like __AGIM0:D:X
                                if (menuID[menuID.length - 1].match('^[0-9]')
                                    && menuID[menuID.length - 3] == 'D') {
                                    // already at top level, cannot go further
                                    return null;
                                }
                                strNextMenuMemberID = menuID.substr(menuID.indexOf("__AGIM"));
                                var parentMenuItem = document.getElementById(strNextMenuMemberID);
                                if (parentMenuItem) {
                                    var parentMenu = SapConfigurationUtil.getContainerElement(parentMenuItem, SAP_SPECIFIER_ENUM.SAP_WDA_DROPDOWNMENU, 2);
                                    return this._GetActiveMenuItem(parentMenu);
                                }
                            }
                            return null;
                        }
                }
            }
            // For a new case in EP 7.5, the dropdown menu id is aaaaJKNEPINJ.ModifyUserView.TabStrip:x
            if (strID.match("\\aaaaJKNE.*") != null) {
                switch (menuMemberType) {
                    case 0:
                        {
                            var indexLastColon = strID.lastIndexOf(':');
                            if (indexLastColon < 0)
                                return null;
                            strNextMenuMemberID = strID.substr(0, indexLastColon + 1);
                            var container = SapConfigurationUtil.getContainerElement(spElement, SAP_SPECIFIER_ENUM.SAP_WDA_DROPDOWNMENU_CONTAINER, 3);
                            var parentElem;
                            if (container != null) {
                                parentElem = container.ownerDocument.getElementById(strNextMenuMemberID);
                            }
                            return parentElem;
                        }
                    default:
                        {
                            return null;
                        }
                }
            }

            var lsDataValue = spElement.getAttribute('lsdata');
            if (lsDataValue) {
                strNextMenuMemberID = this._GetNextMenuMemberID(lsDataValue, strID, menuMemberType);
                if (!strNextMenuMemberID)
                    return null;
            }

            // IMPORTENT : GetMenuMember-Explanation
            // This change was introduced due to the fact that menu and submenu relations can come in two flavours
            // 1. Item X --> Sub Menu X+1 - The original treathed way
            // 2. Menu X --> Sub Menu X+1 - Newly found way - And we calculate the path using the items that are from the urMnuRowOn class
            // History : flavour 1 solution ( Original) --> Thought it was a mistake --> changed to handle to the second flavour (3/1/2012) -->
            //	--> found a case that fits to the first flavour --> made the necessary adjustments (6/1/2012)
            // In the remarks in this file I will use the terms "First Flavour" and "Second Flavour" as described above

            if (menuMemberType == 0) {
                var container = SapConfigurationUtil.getContainerElement(spElement, SAP_SPECIFIER_ENUM.SAP_WDA_DROPDOWNMENU_CONTAINER, 4);
                var parentMenu;
                if (container) {
                    parentMenu = container.parentElement.ownerDocument.getElementById(strNextMenuMemberID);
                }

                if (parentMenu && SapConfigurationUtil.isElementOfSpecifier(parentMenu, SAP_SPECIFIER_ENUM.SAP_WDA_DROPDOWNMENU)) {
                    // This is the second flavour handling
                    return this._GetActiveMenuItem(parentMenu);
                }
                else if (parentMenu && SapConfigurationUtil.isElementOfSpecifier(parentMenu, SAP_SPECIFIER_ENUM.SAP_WDA_DROPDOWNMENUITEM)) {
                    // In this case, parentMenu is actually the menu item itself --> First flavour
                    return parentMenu;
                }
                else {
                    // else, this is the end of the path
                    return this._GetActiveMenuItem(spElement);
                }
            }
            else {// Looking for sub menu
                //S4HANA find the submenu directly
                var subMenu = document.getElementById(strNextMenuMemberID);
                return subMenu != null ? subMenu : spElement;
            }

        },
        _GetSubMenu: function (spMenuItemElem) {
            var spSubMenuElem = this._GetMenuMember(spMenuItemElem, 1);
            return spSubMenuElem;
        },
        _GetSelectionStatus: function (msg) {
            if (!msg || !msg._data["sap path"])
                return;
            msg.status = "ERROR";

            var pPath = msg._data["sap path"];
            if (typeof (pPath) == "string")
                pPath = pPath.split();
            else
                pPath = pPath[0];
            var pathSize = pPath.length;

            //get last open menu item in the selection chain.
            var ItemAndLevel = this._GetLastOpenItemInPath(pPath, pathSize);
            var spLastItem = ItemAndLevel["spLastItem"];
            var lPathLevel = ItemAndLevel["lPathLevel"];
            //store sub-menu level
            msg._attr_names.push("sap path index");
            msg._data["sap path index"] = lPathLevel;

            msg._attr_names.push("state");
            if (!spLastItem) {
                // we didn't find any item of the path
                msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_NOTFOUND;
                msg.status = "OK";
                return;
            }

            if (this.IsItemDisabled(spLastItem))
                msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_DISABLED;

            var bIsLeaf = this._IsLeafMenuItem(spLastItem);
            if (lPathLevel == pathSize)// last item
            {
                if (bIsLeaf == true)// last leaf
                    msg._data["state"] = SAP_NODESTATE_ENUM.SAP_LEAF;
                else// last not leaf
                    msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_OPENED;
            }
            else {// this is not the last item in the path
                if (bIsLeaf == true)
                    msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_NOTFOUND;
                else
                    msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_CLOSED;
            }

            //fill in the webinfo the RTID of the menu item. required for the package for the replay.
            //!!!!!!!!!!!!!!getparentframe()
            var pGenItemObj = new AO(spLastItem, this.getID());
            pGenItemObj.mergeBehavior(CommonBehavior);
            if (pGenItemObj) {
                var spWRTID = pGenItemObj.getID();
                msg._attr_names.push("id");
                msg._data["id"] = spWRTID;
            }

            msg.status = "OK";
            return;
        },
        _GetBodyElement: function (pElement) {
            return pElement.ownerDocument.getElementsByTagName('body');
        },
        _IsCorrectItemPath: function (strPath, spItemElement) {
            //IE and chrome are different - i.e: IE(Help (F1)) Chrome(Help	 (F1)) trim all white space character, including space, tab, form feed, line feed.
            strPath = strPath.replace(/\s+/g, " ");
            // The path is inner text.
            var strItemPath = this._GetMenuItemText(spItemElement).trim().replace(/\s+/g, " ");

            if (strItemPath != strPath) {
                var spItemElement_TEXT = SapConfigurationUtil.getElementOfCollection(spItemElement, SAP_SPECIFIER_ENUM.SAP_ICWC_DROPDOWNMENU_ITEM_TEXT);
                if (spItemElement_TEXT != null) {
                    strItemPath = spItemElement_TEXT.innerText.trim().replace(/\s+/g, " ");
                    if (strItemPath != strPath) {
                        var spItemElement_TEXT2 = SapConfigurationUtil.getElementOfCollection(spItemElement, SAP_SPECIFIER_ENUM.SAP_ICWC_DROPDOWNMENU_ITEM_TEXT2);
                        if (spItemElement_TEXT2 != null) {
                            strItemPath = spItemElement_TEXT2.innerText.trim().replace(/\s+/g, " ");
                        }
                    }
                }
            }
            return strItemPath == strPath;
        },
        _GetLastOpenItemInPath: function (path, lPathSize) {
            var obj = { spLastItem: null, spMenuElem: this._elem };
            var lPathLevel = 0;
            for (; lPathLevel < lPathSize && obj.spMenuElem != null; ++lPathLevel) {
                if (!SAPUtils.isWDADropDownMenuInOpenState(obj.spMenuElem)) {
                    //the element won't match WDADropDownMenu if we run out of all menu items(dropdownmenu and submenu)
                    //so, return the value
                    return { spLastItem: obj.spLastItem, lPathLevel: lPathLevel };
                }

                //match menu item path by index, NOTE: the UFT menu index starts from 1. #1 #2 #3
                //????
                var strPath = path[lPathLevel];
                if (strPath[0] == "#") {
                    //based on current frame and dropdownmenu.
                    var vecItemElements = this._GetMenuItems(obj.spMenuElem);
                    var iPathIndex = parseInt(strPath.substr(1), 10);
                    if (iPathIndex > 0 && iPathIndex <= vecItemElements.length) {
                        obj.spLastItem = vecItemElements[iPathIndex - 1];
                        //get the sub-menu that this menu item points to.
                        obj.spMenuElem = this._GetSubMenu(obj.spLastItem);
                    }
                    else {
                        obj.spMenuElem = null;
                    }
                }
                else {
                    SAPUtils.findItemAndSubmenuByText.call(this, obj, strPath);
                }
            }
            return { spLastItem: obj.spLastItem, lPathLevel: lPathLevel };
        },
    },

    _methods: {
        "GET_PATH_STATUS": function (msg, resultCallback) {
            this._logger.trace('SAPWDADropDownMenu.GET_PATH_STATUS Before :   ' + msg);
            this._GetSelectionStatus(msg);
            this._logger.trace('SAPWDADropDownMenu.GET_PATH_STATUS After  :   ' + msg);
            resultCallback(msg);
        },

    },

    _eventHandler: function (recorder, ev) {
        this._logger.trace('SAPWDADropDownMenu.eventHandler: Received recordable event on ' + this._elem.tagName + ': ' + ev.type);
        var element = ev.target;
        var id = element.getAttribute('id');
        if (id && id.indexOf('aaaaJKNE.') >= 0) {
            // EP7.5 case: It uses onmousedown event as onclick to record
            if (ev.type != 'mousedown')
                return false;
            ev.type = 'click';
        }
        else {
            // Filter onmousedown event
            if (ev.type == 'mousedown')
                return false;
        }

        //call base implementation
        //??????? 

        //assign the selection text (a text represents the selection done by the user)
        //to the webinfo's PN_SAP_PATH attribute.
        //var spMenuItemElem = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_DROPDOWNMENUITEM, 3);
        //in javascript we get this record message from table not the cell inside dropdownmenuitem, 
        //so that we use getelementofcollection and SAPSP_DROPDOWNMENU_ACTIVEITEM rather than getContainerElement and SAP_WDA_DROPDOWNMENUITEM
	    var spMenuItemElem = SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAP_WDA_DROPDOWNMENUITEM, 3);
        if (!spMenuItemElem)
            return false;
        var Path = {};
        this.GetDropDownPath(spMenuItemElem, Path);
        if (!this._IsLeafMenuItem(spMenuItemElem) || Path.value.length <= 0)
            return false;

        var params = { event: 'on' + ev.type };
        params["sap path"] = Path.value;
        recorder.sendRecordEvent(this, ev, params);
        return true;
    }
};


var SAPCRMDropDownMenuBehavior = {
    _micclass: ["SAPDropDownMenu", "WebElement", "StdObject"],
    _attrs: {
        "all items": function () {
            return this._GetCRMMenuItems(this._elem);
        },
    },
    _helpers: {
        isLearnable: Util.alwaysTrue,
        _GetCRMMenuItems: function (elem) {
            if (elem) {
                if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_MENU4))
                    return SapConfigurationUtil.filterCollection(document, SAP_SPECIFIER_ENUM.SAP_CRM_MENU4_ITEM);
                else
                    return SapConfigurationUtil.filterCollection(document, SAP_SPECIFIER_ENUM.SAP_CRM_MENU_ITEM_DYM);
            }
            return null;
        },
        _GetSelectedItemIndex: function (menuItemsElements, selectionText) {
            var index = -1;
            if (selectionText.length > 1 && selectionText.indexOf("#") == 0) {//index-based path
                index = parseInt(selectionText.substr(1), 10) - 1;
            }
            else {//descriptive path
                var itemSelectionText;
                for (var i = 0; i < menuItemsElements.length; i++) {
                    //for each of the items, check if its "selection text" is corresponding 
                    //to the given selection path.
                    var itemSelectionText = menuItemsElements[i].innerText.trim();
                    if (itemSelectionText == selectionText) {
                        index = i;
                        break;
                    }
                }
            }
            return index; //if no item was found - returns -1
        },
        _GetSelectedItem: function (pPath) {
            //get the collection of all the menu items dom elements 
            var elVector;
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_MENU1))
                elVector = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_A);
            else if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_MENU2))
                elVector = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_MENU_ITEM);
            else
                return null;
            
            if (pPath.length == 0) 
                return null;
            //look for the selected item in the collection
            var bsText = pPath[0].trim();
            var index = this._GetSelectedItemIndex(elVector, bsText);
            var itemCount = elVector.length;
            if (index != -1 && index < itemCount)
                return elVector[index];
            return null;
        },
        _IsLeafMenuItem: function (spItemElement) {
            if (SapConfigurationUtil.isElementOfSpecifier(spItemElement, SAP_SPECIFIER_ENUM.SAP_CRM_MENU4_ITEM)) {
                if (SapConfigurationUtil.isElementOfSpecifier(spItemElement, SAP_SPECIFIER_ENUM.SAP_CRM_MENU4_SUBFOLDER))
                    return false;
                return true;
            }
            var vecOfElements = SapConfigurationUtil.filterCollection(spItemElement, SAP_SPECIFIER_ENUM.SAP_CRM_MENU_ITEM_DYM_ARROW);
            return vecOfElements.length == 0;
        },
        _IsItemDisabled: function (pItem) {
            return SapConfigurationUtil.getElementOfCollection(pItem, SAP_SPECIFIER_ENUM.SAP_CRM_MENU_ITEM_DYM_DISABLED) != null;
        },
        _GetMenuItems: function (spMenuElement) {
            var spChildrenCol = spMenuElement.getElementsByTagName('*');
            var vecOfElements;
            if (spChildrenCol) {
                if (SapConfigurationUtil.isElementOfSpecifier(spMenuElement, SAP_SPECIFIER_ENUM.SAP_CRM_MENU4))
                    vecOfElements = SapConfigurationUtil.filterCollection(spChildrenCol, SAP_SPECIFIER_ENUM.SAP_CRM_MENU4_ITEM);
                else
                    vecOfElements = SapConfigurationUtil.filterCollection(spChildrenCol, SAP_SPECIFIER_ENUM.SAP_CRM_MENU_ITEM_DYM);
            }
            return vecOfElements;
        },
        _GetParentMenuItemID: function (itemID) {
            // TODO !!!!!!!!!!!!!!
            // menu item ID from top to bottom would be like
            // C24_W77_V78_thtmlb_menuButton_1__items____4_item
            // C24_W77_V78_thtmlb_menuButton_1__items____4____41_item
            // C24_W77_V78_thtmlb_menuButton_1__items____4____41____411_item
            // to find parent menu item id, we simple strip the right most number
            return "this function is for record";

        },
        _GetMenuMember: function (spElement, menuMemberType) {
            //get element id as long
            var strID, strNumericID, strNextMenuMemberID;
            strID = spElement.getAttribute("id");
            switch (menuMemberType) {
                case 1:
                    {
                        if (SapConfigurationUtil.isElementOfSpecifier(spElement, SAP_SPECIFIER_ENUM.SAP_CRM_MENU4_ITEM)) {
                            strNextMenuMemberID = strID + "_H";
                            break;
                        }
                        strNextMenuMemberID = strID.substr(0, strID.length - 4) + "submenu"; //delete "item" add "submenu"
                        break;

                    }
                case 0:
                    {
                        if (SapConfigurationUtil.isElementOfSpecifier(spElement, SAP_SPECIFIER_ENUM.SAP_CRM_MENU4_ITEM))
                            return SapConfigurationUtil.getContainerElement(spElement, SAP_SPECIFIER_ENUM.SAP_CRM_MENU4, 2);
                        strNextMenuMemberID = this._GetParentMenuItemID(strID);
                        break;
                    }
                default:
                    return null;
            }
            return document.getElementById(strNextMenuMemberID);
        },
        _GetSubMenu: function (spMenuItemElem) {
            return this._GetMenuMember(spMenuItemElem, 1);
        },
        _IsCorrectItemPath: function (strPath, spItemElement) {
            var spTextContainer = spItemElement;
            if (SapConfigurationUtil.isElementOfSpecifier(spItemElement, SAP_SPECIFIER_ENUM.SAP_CRM_MENU4_ITEM)) {
                var pChildren = spItemElement.children;
                if (pChildren) {
                    var clength = pChildren.length;
                    for (var i = 0; i < clength; i++) {
                        var pChildElement = pChildren[i];
                        if (SapConfigurationUtil.isElementOfSpecifier(pChildElement, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_A)) {
                            spTextContainer = pChildElement;
                            break;
                        }
                    }
                }
            }
            // The path is inner text.
            var strItemPath = spTextContainer.innerText.trim().replace(/\s+/g, " ");
            return strItemPath == strPath.replace(/\s+/g, " ");
        },
        _GetLastOpenItemInPath: function (path, lPathSize) {
            var obj = { spLastItem: null, spMenuElem: this._elem };
            var lPathLevel = 0;
            for (; lPathLevel < lPathSize && obj.spMenuElem != null; ++lPathLevel) {
                var strPath = path[lPathLevel];

                if (strPath[0] == "#") {
                    //based on currrent frame and dropdownmenu.
                    var vecItemElements = this._GetMenuItems(obj.spMenuElem);
                    var iPathIndex = parseInt(strPath.substr(1), 10);
                    if (iPathIndex > 0 && iPathIndex <= vecItemElements.length) {
                        obj.spLastItem = vecItemElements[iPathIndex - 1];
                        //get the sub-menu that this menu item points to.
                        obj.spMenuElem = this._GetSubMenu(obj.spLastItem);
                    }
                    else {
                        obj.spMenuElem = null;
                    }
                }
                else {
                    SAPUtils.findItemAndSubmenuByText.call(this, obj, strPath);
                }
            }
            return { spLastItem: obj.spLastItem, lPathLevel: lPathLevel };
        },
        _IsRecordableSelection: function (pElem) {
            if (SapConfigurationUtil.getContainerElement(pElem, SAP_SPECIFIER_ENUM.SAP_CRM_MENU_ITEM_DYM_ARROW, 2)// selection on non-leaf menu
                || SapConfigurationUtil.getContainerElement(pElem, SAP_SPECIFIER_ENUM.SAP_CRM_MENU4_SUBFOLDER, 2)
                || SapConfigurationUtil.getContainerElement(pElem, SAP_SPECIFIER_ENUM.SAP_CRM_MENU_ITEM_DYM_DISABLED, 4))// selection on disabled item
                return false;
            else
                return true;
        },
        _GetSelectionStatus: function (msg) {
            if (!msg || !msg._data["sap path"])
                return;
            msg.status = "ERROR";

            var pPath = msg._data["sap path"];
            if (typeof (pPath) == "string")
                pPath = pPath.split();
            else
                pPath = pPath[0];
            var pathSize = pPath.length;

            var m_IsMultiLevelMenu = false;
            if (SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_MENU_ITEM_DYM, 5)
                || SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_MENU4)
                || SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_MENU_ITEM_DYM))
                m_IsMultiLevelMenu = true;

            if (!m_IsMultiLevelMenu)// single level menu
            {
                //get the dom element of the menu item corresponding to the given path.
                var pItem = this._GetSelectedItem(pPath);
                msg._attr_names.push("state");
                if (!pItem) {
                    //update the state of the selection
                    msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_NOTFOUND;
                    return;
                }
                msg._data["state"] = SAP_NODESTATE_ENUM.SAP_LEAF;
                //required by the package. in our case the index is always 1 since we have
                //only one level (no sub-menus).
                msg._attr_names.push("sap path index");
                msg._data["sap path index"] = 1;


                //fill in the webinfo the RTID of the menu item. required for the package for 
                //the replay.
                //!!!!!!!!!!!!!!getparentframe()
                var pGenItemObj = new AO(pItem, this.getID());
                pGenItemObj.mergeBehavior(CommonBehavior);
                if (pGenItemObj) {
                    var spWRTID = pGenItemObj.getID();
                    msg._attr_names.push("id");
                    msg._data["id"] = spWRTID;
                }

                msg.status = "OK";
                return;
            }
            else {// multi-level menu
                //get last open menu item in the selection chain.
                var ItemAndLevel = this._GetLastOpenItemInPath(pPath, pathSize);
                var spLastItem = ItemAndLevel["spLastItem"];
                var lPathLevel = ItemAndLevel["lPathLevel"];
                //store sub-menu level
                msg._attr_names.push("sap path index");
                msg._data["sap path index"] = lPathLevel;

                msg._attr_names.push("state");
                if (!spLastItem) {
                    // we didn't find any item of the path
                    msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_NOTFOUND;
                    msg.status = "OK";
                    return;
                }

                if (this.IsItemDisabled(spLastItem))
                    msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_DISABLED;

                var bIsLeaf = this._IsLeafMenuItem(spLastItem);
                if (lPathLevel == pathSize)// last item
                {
                    if (bIsLeaf == true)// last leaf
                        msg._data["state"] = SAP_NODESTATE_ENUM.SAP_LEAF;
                    else// last not leaf
                        msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_OPENED;
                }
                else {// this is not the last item in the path
                    if (bIsLeaf == true)
                        msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_NOTFOUND;
                    else
                        msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_CLOSED;
                }

                //fill in the webinfo the RTID of the menu item. required for the package for the replay.
                //!!!!!!!!!!!!!!getparentframe()
                var pGenItemObj = new AO(spLastItem, this.getID());
                pGenItemObj.mergeBehavior(CommonBehavior);
                if (pGenItemObj) {
                    var spWRTID = pGenItemObj.getID();
                    msg._attr_names.push("id");
                    msg._data["id"] = spWRTID;
                }

                msg.status = "OK";
                return;
            }

        },
    },

    _methods: {
        "GET_PATH_STATUS": function (msg, resultCallback) {
            this._logger.trace('SAPCRMDropDownMenu.GET_PATH_STATUS Before :   ' + msg);
            this._GetSelectionStatus(msg);
            this._logger.trace('SAPCRMDropDownMenu.GET_PATH_STATUS After  :   ' + msg);
            resultCallback(msg);
        },

    },

    _eventHandler: function (recorder, ev) {
        this._logger.trace('SAPCRMDropDownMenu.eventHandler: Received recordable event on ' + this._elem.tagName + ': ' + ev.type);

        if (ev.type == "mousedown" || ev.type == "dblclick")
            return false;

        //call base implementation
        //HRESULT hr = CWIObj:: FillRecordInformation(pElement, ppWebInfo);
        if (!this._IsRecordableSelection(this._elem))
            return false;

        var params = { event: 'on' + ev.type };
        //assign the selection text (a text represents the selection done by the user)
        //to the webinfo's PN_SAP_PATH attribute.
        //if it's a multil-level menu, construct a path of all of selected menu item text separated by semicolon(;)
        var spMenuItem = SapConfigurationUtil.getContainerElement(ev.target, SAP_SPECIFIER_ENUM.SAP_CRM_MENU_ITEM_DYM, 5);
        if (spMenuItem) {
            var sID = spMenuItem.getAttribute('id');
            var reg = new RegExp("{_+\\d+}_item$");

            // no level indicator number in id, assume only one level, e.g. "C14_W46_V47_Menu__items____MyFavorites_item", "C55_W144_V145_V147_TextAdd__items____CR01_item"
            var selectionText = "";
            if (!sID.match(reg)) {
                selectionText = spMenuItem.innerText.trim();
            }
            else {// multi-level menu, see ID pattern in comment of GetParentMenuItemID
                // we first save menu path text leaf to root in a stack, then use the stack to reverse it to root to leaf
                var menuPath = "";
                do {
                    menuPath = spMenuItem.innerText.trim();
                    selectionText = menuPath + ";" + selectionText;
                }
                while ((spMenuItem = this._GetMenuMember(spMenuItem, 0)) != null);
            }

            params["sap path"] = selectionText;
            recorder.sendRecordEvent(this, ev, params);
            return true;
        }

        spMenuItem = SapConfigurationUtil.getContainerElement(ev.target, SAP_SPECIFIER_ENUM.SAP_CRM_MENU4_ITEM, 2);
        if (spMenuItem) {
            //it can be a multi-level menu
            var spSubMenu;
            do {
                //get inner DOM node <A ...>
                var pChildrenDisp = spMenuItem.getElementsByTagName('A');
                var menuPath = "";
                if (pChildrenDisp) {
                    for (var i = 0; i < pChildrenDisp.length; i++) {
                        menuPath = pChildrenDisp[i].innerText.trim();
                        selectionText = menuPath + ";" + selectionText;
                    }
                }
            }
            while ((spSubMenu = SapConfigurationUtil.getContainerElement(spMenuItem, SAP_SPECIFIER_ENUM.SAP_CRM_MENU4, 3)) != null
                && (spMenuItem = SapConfigurationUtil.getContainerElement(spSubMenu, SAP_SPECIFIER_ENUM.SAP_CRM_MENU4_SUBFOLDER, 3)) != null);

            params["sap path"] = selectionText;
            recorder.sendRecordEvent(this, ev, params);
            return true;
        }

        selectionText = ev.target.innerText.trim();
        params["sap path"] = selectionText;
        recorder.sendRecordEvent(this, ev, params);
        return true;
    }

};


var SAPDropDownMenuBehavior = {
    _micclass: ["SAPDropDownMenu", "WebElement", "StdObject"],
    _attrs: {
        "micclass": function () {
            return "SAPDropDownMenu";
        },
        "sap web component name": function () {
            return SAPUtils.getComponentName(this._elem, this);
        },
        "sap web component runtime ID": function () {
            return SAPUtils.GetComponentRuntimeID(this._elem, this);
        },
        "all items": function () {
            return this._GetMenuItems(this._elem);
        },
    },
    _helpers: {
        isLearnable: Util.alwaysTrue,

        UseEventConfiguration: function (event) {
			return event.type !== "mouseup";
        },
        
        _GetMenuItemText: function (elem, oldStyleText) {//belong to CSAPMenuBase in C++
            var fullText = elem.innerText;

            if (!fullText)
                return fullText;

            if (!oldStyleText) {
                // If there is a label for this item we don't want its text (note the label is inside the item we can optimize by only searching the items children if necessary)
                var label = SAPUtils.getLabel(elem);
                if (label) {
                    var pos = fullText.indexOf(label);
                    if (pos >= 0)
                        fullText.replace(label, "");
                }
            }

            return fullText.trim();
        },
        _GetItemText: function (pElement, useOldItemTextAlgorithm) {
            // function get inner text of the Item and removes Arrow symbol if it exists (and sets bWasArrow flag to true in this case) 
            var bWasArrow = false;
            var bsItemText = "";
            // go up on level in the DOM for portal menus, because the expected collection is the TR element
            if (SapConfigurationUtil.isElementOfSpecifier(pElement, SAP_SPECIFIER_ENUM.SAPSP_IVIEW_MENU_ITEM_TEXT)) {
                pElement = pElement.parentElement;
            }

            var pCol = pElement.getElementsByTagName("*");
            if (pCol) {
                bsItemText = this._GetMenuItemText(pElement, useOldItemTextAlgorithm);
                return { bsItemText: bsItemText, bWasArrow: bWasArrow };
            }

            var pChildElement;
            for (var i = 0; i < pCol.length; i++) {
                pChildElement = pCol[i];
                if (SapConfigurationUtil.isElementOfSpecifier(pChildElement, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_ARROWITEM)) {
                    var arrowText = pChildElement.innerText.trim();
                    if (!arrowText) {
                        bsItemText = this._GetMenuItemText(pElement, useOldItemTextAlgorithm);
                        return { bsItemText: bsItemText, bWasArrow: bWasArrow };
                    }

                    var fullText = this._GetMenuItemText(pElement, useOldItemTextAlgorithm);
                    var pos = -1;
                    var tmpPos = 0;
                    while (tmpPos != -1) {
                        pos = tmpPos;
                        tmpPos = fullText.indexOf(arrowText, pos + 1);
                    }
                    if (pos > 0) {
                        bWasArrow = true;
                        itemText = fullText.substr(0, pos);
                    }
                    else
                        itemText = fullText;
                    bsItemText = itemText;
                    return;
                }
                else if (SapConfigurationUtil.isElementOfSpecifier(pChildElement, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_ARROWITEM1)) {
                    bWasArrow = true;
                    break;
                }
                else
                    continue;
            }
            bsItemText = this._GetMenuItemText(pElement, useOldItemTextAlgorithm);
            return { bsItemText: bsItemText, bWasArrow: bWasArrow };

        },
        _GetMenuItems: function () {
            if (document)
                return SapConfigurationUtil.filterCollection(document, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENUITEM);
            return null;
        },
        _GetMenuPopdowns: function () {
            // get collection of all IFRAMEs as Element
            var elVector = [];
            elVector = SapConfigurationUtil.filterCollection(this._elem.ownerDocument, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_POPDOWNFRAME);
            //if we don't identify any IFRAME we try to identify the popdown by second definition
            if (elVector.length <= 0) {
                var documMenus = SapConfigurationUtil.filterCollection(this._elem.ownerDocument, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_SECOND);
                //now we filter only dropdown menus
                var menuParent;
                for (var i = 0; i < documMenus.length; i++) {
                    menuParent = documMenus[i].parentElement;
                    if (menuParent) {
                        if (documMenus[i].parentElement.offsetTop > 0 && SapConfigurationUtil.isElementOfSpecifier(menuParent, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_POPDOWN_PARENT))
                            elVector.push(documMenus[i]);
                    }
                }
            }
            return elVector;
        },
        _GetPopdownDocument: function (pDisp) {
            if (pDisp.tagName.toUpperCase() == "IFRAME" || pDisp.tagName.toUpperCase() == "FRAME")
                return pDisp.contentDocument;
            return pDisp.ownerDocument;
        },
        _GetPopdownActiveItem: function (pPopdown) {
            if (SapConfigurationUtil.isElementOfSpecifier(pPopdown, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_POPDOWNFRAME)) {
                var pFrameDocument = this._GetPopdownDocument(pPopdown);
                if (pFrameDocument) {
                    return SapConfigurationUtil.getElementOfCollection(pFrameDocument, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_ACTIVEITEM);
                }
            }
            else {
                //we are dealing with popdown specified by the second definition "DIV",so
                //we search active item in the popdown children
                return SapConfigurationUtil.getElementOfCollection(pPopdown, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_ACTIVEITEM);
            }
            return null;
        },
        _GetPopdownItems: function (pPopdown) {
            var elVector = [];
            if (SapConfigurationUtil.isElementOfSpecifier(pPopdown, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_POPDOWNFRAME)) {
                var pFrameDocument = this._GetPopdownDocument(pPopdown);
                if (pFrameDocument) {
                    elVector = SapConfigurationUtil.filterCollection(pFrameDocument, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_POPDOWNITEM);
                }
            }
            else {
                //we are dealing with popdown specified by the second definition "DIV",so
                //we get it's direct children
                elVector = SapConfigurationUtil.filterCollection(pPopdown, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_POPDOWNITEM);
            }
            return elVector;
        },
        _GetPopdownItem: function (spElement) {
            if (SapConfigurationUtil.isElementOfSpecifier(spElement, SAP_SPECIFIER_ENUM.SAPSP_PORTAL_POPDOWN_MENU))
                return SapConfigurationUtil.getElementOfCollection(spElement, SAP_SPECIFIER_ENUM.SAPSP_IVIEW_MENU_ITEM_TEXT)
            else
                return spElement;
        },
        _GetPopdownItemByText: function (pPopdown, Text) {
            var elVector = this._GetPopdownItems(pPopdown);
            // Support scripts created by QTP6.5 that recorded different selected texts. First try the new way then if that fails the old.
            for (var useOldGetItemText = 0; useOldGetItemText <= 1; ++useOldGetItemText) {
                for (var i = 0; i < itemCount; i++) {
                    var obj = this._GetItemText(elVector[i], useOldGetItemText != 0)
                    if (obj.bsItemText.length == 0)
                        continue;
                    if (Text == obj.bsItemText)
                        return this._GetPopdownItem(elVector[i]);
                }
            }
            return null;
        },
        _GetPopdownItemByIndex: function (pPopdown, index) {
            var elVector = this._GetPopdownItems(pPopdown);
            var ItemCount = elVector.length;
            if (index >= 0 && ItemCount > index)
                return this._GetPopdownItem(elVector[index]);

            return null;
        },
        _GetLastItemInPath: function (Path, lPathIdxOri) {
            var obj = { lPath: lPathIdxOri, pFrameDocument: null, pItem: null, result: false };
            var size = Path.length;
            var pCurrentItem;
            var elPopdownMenus = this._GetMenuPopdowns();
            if (elPopdownMenus.length <= 0)
                return obj;

            while (obj.lPath < size) {
                var bsText = Path[obj.lPath];
                if (!bsText)
                    return obj;
                var index = -1;
                if (bsText.length > 1 && bsText.indexOf("#") == 0)
                    index = parseInt(bsText.substr(1), 10);
                if ((obj.lPath - lPathIdxOri) < elPopdownMenus.length) {
                    var pPopdown = elPopdownMenus[obj.lPath - lPathIdxOri];
                    // now  we search the item in the popdown
                    if (index == -1)
                        pCurrentItem = this._GetPopdownItemByText(pPopdown, bsText);
                    else
                        pCurrentItem = this._GetPopdownItemByIndex(pPopdown, index - 1);// user index 1-based

                    // if the next level is not found then we return the last one
                    obj.pItem = pCurrentItem;
                    // we need this document to change ParentObj when try get id of the WebObj  
                    obj.pFrameDocument = this._GetPopdownDocument(pPopdown);
                    obj.lPath++;
                }
                else
                    break;
            }
            obj.result = true;
            return obj;
        },
        _GetPathStatusForPortalDivMenu: function (msg, lPathIdx, pPath) {
            //Portal DIV menu only has 1 level.
            //get item text or index
            var bsText = pPath[lPathIdx];
            if (!bsText)
                return false;
            var index = -1;
            if (bsText.length > 1 && bsText.indexOf("#") == 0)
                index = parseInt(bsText.substr(1), 10);

            //get item list
            var pDispCol = this._elem.getElementsByTagName("*");
            if (!pDispCol) {
                // we didn't find any item of the path
                msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_NOTFOUND;
                msg.status = "OK";
                return;
            }

            var itemElements = SapConfigurationUtil.filterCollection(pDispCol, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENUITEM);
            if (itemElements.length < 1) {
                // we didn't find any item of the path
                msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_NOTFOUND;
                msg.status = "OK";
                return;
            }

            //Get matching item
            var pItem;
            if (index > 0) //get item by index, item index is 1-based
            {
                if (index <= itemElements.length) {
                    pItem = itemElements[index - 1];
                }
            }
            else {
                //search item by text
                for (var i = 0; i < itemElements.length; i++) {
                    var obj = this._GetItemText(itemElements[i]);
                    if (obj.bsItemText.length == 0)
                        continue;
                    if (obj.bWasArrow)
                        continue;
                    if (bsText == obj.bsItemText) {
                        pItem = itemElements[i];
                        break;
                    }

                }
            }
            if (!pItem) {// we didn't find any item of the path
                msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_NOTFOUND;
                msg.status = "OK";
                return;
            }
            //create AO for the found item
            msg._data["state"] = SAP_NODESTATE_ENUM.SAP_LEAF;
            var pGenItemObj = new AO(pItem, this.getID());
            pGenItemObj.mergeBehavior(CommonBehavior);
            if (pGenItemObj) {
                var spWRTID = pGenItemObj.getID();
                msg._attr_names.push("id");
                msg._data["id"] = spWRTID;
            }
            msg.status = "OK";
            return;
        },
        _GetPathStatus: function (msg) {// this kind of method in WDA||CRM named _GetSelectionStatus()
            var lPathIdx = 0;
            if (!msg || !msg._data["sap path"])
                return;
            msg.status = "ERROR";

            var pPath = msg._data["sap path"];
            if (typeof (pPath) == "string")
                pPath = pPath.split();
            else
                pPath = pPath[0];
            var pathSize = pPath.length;

            //i.e:  obj = { lPathIdx: lPathIdxOri, pFrameDocument: null, pItem: null, result: false }
            var obj = this._GetLastItemInPath(pPath, lPathIdx);
            msg._attr_names.push("state");            // start inserting the gathered information
            msg._attr_names.push("sap path index");
            msg._data["sap path index"] = obj.lPath;
            if (obj.result == false) {
                if (this._elem.tagName.toUpperCase() == "DIV") {
                    return this._GetPathStatusForPortalDivMenu(msg, obj.lPath, pPath);
                }
                msg._data["state"] = SAP_NODESTATE_ENUM.SAP_ALL_CLOSED;
                msg.status = "OK";
                return;
            }

            // start inserting the gathered information
            msg._attr_names.push("sap path index");
            msg._data["sap path index"] = obj.lPath;
            if (!obj.pItem) {
                // we didn't find any item of the path
                msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_NOTFOUND;
                msg.status = "OK";
                return;
            }

            if (this.IsItemDisabled(obj.pItem))
                msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_DISABLED;
            else {
                var objitem = this._GetItemText(obj.pItem);

                if (lPathIdx == pathSize)// last item
                {
                    if (!objitem.bWasArrow)// last without arrow
                        msg._data["state"] = SAP_NODESTATE_ENUM.SAP_LEAF;
                    else if (this.IsItemHighlighted(obj.pItem))// last with arrow and highlighted
                        msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_OPENED;
                    else // last with arrow and not highlighed
                        msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_CLOSED;
                }
                else	// this is not the last item in the path
                {				// with arrow and not highlighted
                    if (bWasArrow)
                        msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_CLOSED;
                    else
                        msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_NOTFOUND;
                }

            }

            var pGenItemObj = new AO(obj.pItem, this.getID());
            pGenItemObj.mergeBehavior(CommonBehavior);
            if (pGenItemObj) {
                var spWRTID = pGenItemObj.getID();
                msg._attr_names.push("id");
                msg._data["id"] = spWRTID;
            }

            msg.status = "OK";
            return;


        },
        _GetMainElement: function (pDoc) {
            if (!pDoc)
                return null;
            var elem = SapConfigurationUtil.getElementOfCollection(pDoc, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_MAIN);
            if (elem)
                return elem;
            else {
                var menusVector = SapConfigurationUtil.filterCollection(pDoc, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_SECOND);
                if (!menusVector || menusVector.length <= 0)
                    return null;
                var menuTop = -1;
                var menuParent;
                for (var i = 0; i < menusVector.length; i++) {
                    menuParent = menusVector[i].parentElement;
                    if (menuParent) {
                        menuTop = menuParent.offsetTop;
                        if (SapConfigurationUtil.isElementOfSpecifier(menuParent, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_POPDOWN_PARENT) && menuTop > 0)
                            return menusVector[i];
                    }
                }
            }
            return null;
        },
        _ConcatMenuItems: function (vecItemElements) {
            var retVal = "", fullText = "";
            for (var i = 0; i < vecItemElements.length; i++) {
                fullText = vecItemElements[i].innerText;
                if (fullText.length > 0) {
                    if (retVal.length > 0)
                        retVal += ";";
                    retVal += fullText;
                }
            }
            return retVal;
        },
        GetDropDownPath: function () {
            // the function gets text of every item from the DropDown 'path' and  puts them to vector
            var elVector = this._GetMenuPopdowns();
            var elemItem;
            var elemsText = "";
            for (var i = 0; i < elVector.length; i++) {
                elemItem = this._GetPopdownActiveItem(elVector[i]);
                if (elemItem == null)
                    break; // if there isn't highlighted item - this level not active, and all deeper levels too

                if (this.IsItemDisabled(elemItem))
                    return ""; // don't record click on disabled items

                var obj = this._GetItemText(elemItem);
                if (obj.bsItemText != "")
                    elemsText = elemsText + ";" + obj.bsItemText;
            }

            if (elemsText.length <= 0 || obj.bWasArrow) // don't record click on menu bar item or item with arrow( not the last in the path)
                return "";

            return elemsText;
        },
        IsItemHighlighted: function (pItem) {
            return SapConfigurationUtil.isElementOfSpecifier(pItem, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_ACTIVEITEM) != null;
        },
        IsItemDisabled: function (pItem) {
            return SapConfigurationUtil.isElementOfSpecifier(pItem, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_ITEMDISABLED) != null ||
                SapConfigurationUtil.isElementOfSpecifier(pItem, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_ITEMHILTEDEDDISABLED) != null;
        }
    },

    _methods: {
        "GET_PATH_STATUS": function (msg, resultCallback) {
            this._logger.trace('SAPDropDownMenu.GET_PATH_STATUS Before :   ' + msg);
            this._GetPathStatus(msg);
            this._logger.trace('SAPDropDownMenu.GET_PATH_STATUS After  :   ' + msg);
            resultCallback(msg);
        },

    },

    _eventHandler: function (recorder, ev) {
        this._logger.trace('SAPDropDownMenu.eventHandler: Received recordable event on ' + this._elem.tagName + ': ' + ev.type);
        if (ev.type == "mousedown" || ev.type == "dblclick")
            return false;

        // call the base implementation
        //???HRESULT hr = CWIObj::FillRecordInformation(pElement, ppWebInfo);
        // If this is an expandable element the click isn't a selection, it's part of the navigation => ignore.
        // We're interested in isArrow and not in the actual text.
        var targetElem = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAPSP_EPDROPDOWNMENUITEM);
        if (!targetElem)
            targetElem = this._elem;
        var obj = this._GetItemText(targetElem.parentElement);
        var params = { event: 'on' + ev.type };
        // first we add the path information of the DropDown object
        if (obj.bWasArrow == true)
            return false;

        var Path = this.GetDropDownPath();

        if (Path.length <= 0) {
            //Check if it is a DIV menu, which exists in NW Portal 7.3
            //It only has 1 level.
            if (this._elem.tagName.toUpperCase() == "DIV") {
                params["sap path"] = obj.bsItemText;
                recorder.sendRecordEvent(this, ev, params);
                return true;
            }
            return false;
        }
        params["sap path"] = Path;
        // now we check if the menu is activated we let it record the message
        // if the Menu is not active then we record the selection as an DropDown Object

        // get the Menu object
        var pDisp = this._GetPopdownDocument(this._elem);
        var pMenu = this._GetMainElement(pDisp);
        if (pMenu)// ITS 6.2 p3 - main menu doesn't exists at all
        {
            //????????????????
            /*IWebObjPtr spMenuObj = WIKitsUtils::NewAO(pMenu, this);
            if (spMenuObj == NULL)
                return E_FAIL;
    
            IWebObj2* pMenuObj = spMenuObj;
            if (CSAPMenu* pSapMenu = dynamic_cast<CSAPMenu*>(pMenuObj))
                if (pSapMenu->IsActive())
                {
                    SWIEventData dummy = {0};
                    return pMenuObj->FillRecordInformation(pElement, dummy, ppWebInfo);
                }*/
        }
        recorder.sendRecordEvent(this, ev, params);
        return true;
    }

};

var SAPDropDownMenuItemBehavior = {
    _micclass: ["SAPDropDownMenuItem", "StdObject"],
    _attrs: {
        "mic class": function () { //PN_SAP_IS_WDA
            return "SAPDropDownMenuItem";
        },
    },
    _helpers: {
        getParent: function () {
            //get the item's parent frame
            var spMenuElem = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_MAIN, 20);
            //create and return the parent menu AO
            if (spMenuElem) {
                return SAPKitFactory.createAO(spMenuElem, this._parentID, [SAPDropDownMenuBehavior]);
            }

            //to be continue
            //if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_POPDOWNFRAME))
            var spMainElement = SAPDropDownMenuBehavior._GetMainElement(document);
            return SAPKitFactory.createAO(spMainElement, this._parentID, [SAPDropDownMenuBehavior]);
        },

        isObjSpyable: function () {
            return false;
        },
    }
};


var SAPCRMDropDownMenuItemBehavior = {
    _micclass: ["SAPDropDownMenuItem", "StdObject"],
    _attrs: {
        "mic class": function () { //PN_SAP_IS_WDA
            return "SAPDropDownMenuItem";
        },
    },
    _helpers: {
        getParent: function () {
            //get the item's parent frame
            var pDropDownMenu = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_MENU_TESTMODE, 5);
            //create and return the parent menu AO
            if (pDropDownMenu) {
                return SAPKitFactory.createAO(pDropDownMenu, this._parentID, [SAPDropDownMenuBehavior, SAPCRMDropDownMenuBehavior]);;
            }
            return null;
        },

        isObjSpyable: function () {
            return false;
        },
    },
};

var SAPWDADropDownMenuItemBehavior = {
    _micclass: ["SAPDropDownMenuItem", "StdObject"],
    _attrs: {
        "mic class": function () { //PN_SAP_IS_WDA
            return "SAPDropDownMenuItem";
        },
    },
    _helpers: {
        getParent: function () {
            //get the menu dom element (<TABLE ct=POMN>)
            var dropDownMenu = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_DROPDOWNMENU, 6);
            //create and return the parent menu AO
            if (dropDownMenu) {
				return SAPKitFactory.createAO(dropDownMenu, this._parentID, [SAPDropDownMenuBehavior,SAPWDADropDownMenuBehavior]);;
            }
            return null;
        },

        isObjSpyable:function(){
            return false;
        }
    }
};
