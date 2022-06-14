var SAPListBoxBehavior = {
    _micclass: ["SAPList", "WebList", "StdObject"],

    _attrs: {
        "logical name": function () {
            return SAPUtils.getLabelOrAttachedText(this);
        },

        "sap attached text": function () {
            return SAPUtils.getLabelOrAttachedText(this, false);
        },

        "sap label": function () {
            return SAPUtils.getLabelOrAttachedText(this, false, true);
        },

        "webdynpro itemlistbox": function () {
            return SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_MAIN);
        },

        "default value": function () {
            return SAPUtils.getLabelOrAttachedText(this, false);
        },

        //Override method if elem is SAP_WDA_LISTBOX.
        "type": function () {
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX)) {
                return this._getSelectType();
            }
            else {
                return ListBehavior._attrs["type"];
            }
        },

        "visible items": function () {
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX)) {
                return this._getWDAVisibleItems();
            }
            else {
                return ListBehavior._attrs["visible items"];
            }
        },

        //overiting the parents implementation for WebDynpro lists		
        "name": function () {
            if (this.GetAttrSync("webdynpro itemlistbox") == true) {
                return SAPUtils.getLabelOrAttachedText(this);
            }
            else {
                return ListBehavior._attrs["name"];
            }
        },

        "selection": function () {
            if (this.GetAttrSync("webdynpro itemlistbox") == true) {
                return this._getSingleSelectValue();
            }
            else {
                return ListBehavior._attrs["selection"];
            }
        },

        "value": function () {
            if (this.GetAttrSync("webdynpro itemlistbox") == true) {
                return SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX) ?
                    this._getWDAItemsValues() :
                    1;//Non WDA
            }
            else {
                return ListBehavior._attrs["value"];
            }
        },

        "all items": function () {
            if (this.GetAttrSync("webdynpro itemlistbox") == true) {
                return this._getAllItems();
            }
            else {
                return ListBehavior._attrs["all items"];
            }
        },

        "items count": function () {
            if (this.GetAttrSync("webdynpro itemlistbox") == true) {
                return this._getNumOfItems();
            }
            else {
                return ListBehavior._attrs["items count"];
            }
        },

        "multiple": function () {
            if (this.GetAttrSync("webdynpro itemlistbox") == true) {
                return false;
            }
            else {
                return ListBehavior._attrs["multiple"];
            }
        },

        "selected item index": function () {
            if (this.GetAttrSync("webdynpro itemlistbox") == true) {
                return this._getSelectedItemsValues("k");
            }
            else {
                return ListBehavior._attrs["selected item index"];
            }
        },

        "select type": function () {
            if (this.GetAttrSync("webdynpro itemlistbox") == true) {
                var type = this._getSelectType();
                if (type == "ILBS") {
                    return "Single Selection";
                }
                else if (type == "ILBM") {
                    return "Extended Selection";
                }
                return "";
            }
            else {
                //CWIListBox::GetAttrEx
                var value;
                var multiple = this._elem.multiple;
                if (!Util.isNullOrUndefined(multiple)) {
                    if (multiple == true)
                        value = "Extended Selection";
                    else
                        value = "Single Selection";
                }
                return value;
            }
        },

        "selected items count": function () {
            if (this.GetAttrSync("webdynpro itemlistbox") == true) {
                return SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX) ?
                    this._getSelectedItemsValues() :
                    1;//Non WDA
            }
            else {
                return ListBehavior._attrs["selected items count"];
            }
        },
        "disabled": function () {
            if (this.GetAttrSync("webdynpro itemlistbox") == true) {
                var bDisabled = this._isListboxDsbl();
                return bDisabled ? 1 : 0;
            }
            else {
                return ListBehavior._attrs["disabled"];
            }
        },

        //CWIListBox::GetAttrEx
        "multiple value": function () {
            //To do
            this._logger.trace("SAPListBoxBehavior: _Attr[] multiple value");
        }
    },

    _methods: {
        //SAP_WD_GET_LIST_ITEM is used by the WebDynpro listbox to get the selected item 
        //object to perform the click on it.
        "SAP_WD_GET_LIST_ITEM": function (msg, resultCallback) {
            this._logger.trace("SAPListBoxBehavior: on command SAP_WD_GET_LIST_ITEM msg = " + msg);
            this._getItem(msg);
            resultCallback(msg);
        },

        //the package uses WD_NUM_TO_ITEM for GetItem method - we give the item's index
        //and get the item string back.
        "WD_NUM_TO_ITEM": function (msg, resultCallback) {
            this._logger.trace("SAPListBoxBehavior: on command WD_NUM_TO_ITEM msg = " + msg);
            var itemIndex = msg._data["item_index"];
            if (!Util.isNullOrUndefined(itemIndex)) {
                if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX)) {
                    this._getWDASingleItem(itemIndex, msg);
                    resultCallback(msg);
                    return;
                }
                var returnValues = {};
                if (this._getItemByIndex(itemIndex, returnValues)) {
                    msg._data.AN_ITEM_TEXT = returnValues.val;
                }
            }
            resultCallback(msg);
        }
        //To do check whether other method should apply listbox method?
        //return CWIListBox::InvokeMethod(MethodName , ppWebInfo);
    },

    _eventHandler: function (recorder, ev) {
        // this._logger.trace('SAPListBox._eventHandler: Received recordable event: ' + ev.type);
        // if (ContentUtils.isTouchEnabled())
        //     return this._eventHandlerTouchEnabled.call(this, recorder, ev);

        switch (ev.type) {
            case 'click':
                var elem = ev.target;
                var params = { event: 'onclick' };
                if (this._isListboxDsbl())
                    return false;

                SAPComboBox_getLastClicked = null;
                SAPListBox_getLastClicked = elem;
                params["webdynpro list item"] = true;
                params["webdynpro listbox item"] = true;

                //MSHTML::IHTMLElementPtr pCell(pElement);
                if (elem) {
                    var val = "";
                    var tr = elem.parentElement;
                    if (tr) {
                        var tagName = tr.tagName;
                        if (tagName === "TR" || tagName === "TD" ||
                            tagName === "tr" || tagName === "td") {
                            var vecOfElements;
                            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX)) {
                                // Go up to the WDA_Listbox_Item container and look for the TDs i.e. elements 
                                var containerElement = SapConfigurationUtil.getContainerElement(tr, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX_ITEM, 5);
                                if (!containerElement)
                                    return false;
                                vecOfElements = SapConfigurationUtil.filterCollection(containerElement, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_TD);
                            }
                            else //Non WDA
                                vecOfElements = SapConfigurationUtil.filterCollection(tr, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM);

                            //get the first TD in the row. 
                            for (var i = 0; i < vecOfElements.length; i++) {
                                var itemTitle = vecOfElements[i].innerText;
                                //take the first element, and ignore the rest which is probably only &nbsp
                                if (!itemTitle || itemTitle.length == 0)
                                    continue;
                                itemTitle = itemTitle.trim();
                                val += itemTitle;
                            }
                        }//if
                    }
                    if (!val) //Fallback: if the parent is not TR, just take the value of the cell.
                    {
                        val = cell.innerText;
                    }

                    var selectedVal = this._getSingleSelectValue();
                    if (selectedVal == null)
                        return false;

                    if (selectedVal == val)// if the user reselct the same value we don't record.
                        return false;
                    params["value"] = val;
                }
                else
                    return false;

                recorder.sendRecordEvent(this, ev, params);
                return true;
        }
    },

    _helpers: {
        isLearnable: Util.alwaysTrue,

        _getSelectType: function () {
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX)) {
                var topContainer = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX);
                if (topContainer != null) {
                    var attr = topContainer.getAttribute("ct");
                    if (!Util.isNullOrUndefined(attr) && attr.length > 0) {
                        if (attr == "ILBS" || attr == "ILBM") {
                            return attr;
                        }
                    }
                }
            }
            return "";
        },

        _getSelectedItemsValues: function (attr) {
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX)) //For WDA case Listbox
            {
                var vecOfElements = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX_SELECTEDITEM);
                var numOfElements = vecOfElements.length;
                if (!attr)
                    //The number of selected items
                    return numOfElements;

                var vtAttr;
                var strAttribs = "";
                //Get the attribute values
                var ind = 0;
                for (; ind < numOfElements; ind++) {
                    vtAttr = vecOfElements[ind].getAttribute(attr);
                    if (!!vtAttr)
                        strAttribs += vtAttr + ";";
                }
                if (strAttribs.endsWith(";")) {
                    strAttribs.substr(0, strAttribs.length - 1);
                }
                return strAttribs;
            }

            var vecOfElements = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM);
            for (var i = 0; i < vecOfElements.length; i++) {
                var parentElement = vecOfElements[i].parentElement;
                if (!parentElement)
                    continue;
                if (SapConfigurationUtil.isElementOfSpecifier(parentElement, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_SELECTED_ITEM))
                    return i;
            }
            //Failed to get the value index.
            return -1;
        },

        _getWDAVisibleItems: function () {
            var lsData = this._elem.getAttribute("lsdata");
            if (Util.isNullOrUndefined(lsData))
                return "";
            var i = lsData.indexOf("1:");
            if (i <= -1)
                return "";
            var j = lsData.indexOf(",2:");
            if (j <= -1)
                return "";

            var numOfCharactersOfData = j - i + 2;
            var idx = parseInt(lsData.substr(i + 2, numOfCharactersOfData));
            return idx;
        },

        _getSingleSelectValue: function () {
            var element = this._elem;
            var listBoxItem;
            var selectedValue = "";

            var listBoxSelectedItem = SapConfigurationUtil.getElementOfCollection(element, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_SELECTED_ITEM);
            if (listBoxSelectedItem != null) {
                var children = listBoxSelectedItem.children;
                if (children != null) {
                    listBoxItem = SapConfigurationUtil.getElementOfCollection(children, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM);
                    if (listBoxItem != null) {
                        selectedValue = listBoxItem.innerText;
                    }
                }
            }

            return selectedValue;
        },

        _getAllItems: function () {
            var value;
            var vecOfRows;
            //go over all the rows - TR
            vecOfRows = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_ROW); //sometime in a row there can be two TD one with &nbsp which we want to ignore.
            for (var j = 0; j < vecOfRows.length; j++) {
                var row = vecOfRows[j];
                if (row) {
                    var vecOfElements;
                    vecOfElements = SapConfigurationUtil.filterCollection(row, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM);
                    var itemFullTitle = "";
                    //get the first TD in the row. 
                    for (var i = 0; i < vecOfElements.length; i++) {
                        var itemTitle;
                        //take the first element, and ignore the rest which is probably only &nbsp
                        itemTitle = vecOfElements[i].innerText;
                        if (!itemTitle)
                            continue;
                        itemFullTitle += itemTitle;
                    }//if

                    if (!value)
                        value = itemFullTitle;
                    else
                        value += ";" + itemFullTitle;
                }

            }
            return value;
        },

        _getNumOfItems: function () {
            var vecOfRows = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_ROW);
            return vecOfRows != null ? vecOfRows.length : 0;
        },

        _isListboxDsbl: function () {
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX)) {
                return SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX_DISABLED);;
            }
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_DISABLED)) {
                return true;
            }
            else {
                //sometimes the table under the span is marked as disabled.
                var children = this._elem.children;
                if (!Util.isNullOrUndefined(children)) {
                    var listDsblItem = SapConfigurationUtil.getElementOfCollection(children, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_TABLE_DISABLED);
                    return listDsblItem != null;;
                }
                else {
                    var disabled = this._elem.disabled;
                    if (!Util.isNullOrUndefined(disabled)) {
                        return disabled;
                    }
                    else {
                        this._logger.trace('SAPListBoxBehavior._isListboxDsbl: disabled is null or undefined: ');
                        return false;
                    }
                }
            }
        },

        _getWDAItemsValues: function () {
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX)) {
                var vecOfElements = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX_ITEM);
                var numOfElements = vecOfElements != null ? vecOfElements.length : 0;

                var itemTitle;
                var attribs = "";
                //Get the attribute values
                var index = 0;
                for (; index < numOfElements; index++) {
                    itemTitle = vecOfElements[index].innerText;
                    if (!Util.isNullOrUndefined(itemTitle) && itemTitle.length > 0)
                        attribs += itemTitle + ";";
                }
                if (attribs.endsWith(";")) {
                    attribs.substr(0, attribs.length - 1);
                }
                return attribs;
            }
            return "";
        },

        /*	This method creates an Agent Object for the item part of a WebDynpro listbox. 
	    The AO's id is inserted into WebInfo for the package to use it.
        */
        _getItem: function (msg) {
            var element = this._elem;
            var listItem;
            var vecOfElements;
            
            if (SapConfigurationUtil.isElementOfSpecifier(element, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX))
                vecOfElements = SapConfigurationUtil.filterCollection(element, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX_ITEM);
            else {
                vecOfElements = SapConfigurationUtil.filterCollection(element, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM);
            }
            var iNumOfElements = vecOfElements.length;
            var selectedItem = msg._data["webdynpro list selected item"];
            var index = selectedItem.indexOf("#");
            if (index == 0)//got an index of an item
            {
                var itemIndexString = selectedItem.substr(1,selectedItem.length-1);
                index = parseInt(itemIndexString);//gets zero value if was zero-String or non-numeric-String
                if (index == 0 && (itemIndexString != "0"))//in case we have an item that looks like: <#itemName>
                    index = -1;//so we'll get to the next if
                //we got an index (can be zero also)
                if ((index > 0 && iNumOfElements > index) || (index == 0)) {
                    listItem = vecOfElements[index];
                    index = 0;//so we won't get into the next 'if'
                }
            }
            if (index != 0) {//didnt used 'else' since we can can get here also if in the begining index was 0
                //go through the elements
                for (var i = 0; i < iNumOfElements; i++) {
                    var itemTitle = vecOfElements[i].textContent;
                    if (Util.isNullOrUndefined(itemTitle))
                        continue;

                    //we try to trim blank chars at the end of the item and compare 
                    itemTitle = itemTitle.trim();
                    if (selectedItem.toLowerCase() == itemTitle.toLowerCase()) {
                        listItem = vecOfElements[i];
                        break;
                    }
                }
            }
            if (listItem != null) {
                //create an AO for returning its ID
                var itemAO = SAPKitFactory.createAO(listItem, this.getID(), [SAPListItemBehavior]);
                if (itemAO != null) {
                    msg._data["id"] = itemAO.getID();
                    return;
                }
            }
            //we shouldn't get here
            return;
        },

        _getWDASingleItem: function (itemIndex, msg) {
            //Search for all items of ct=="ILBI"|"ILBM"
            var vecOfElements = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX_ITEM);
            var numOfElements = vecOfElements.length;
            if (numOfElements == 0 || itemIndex < 0 || itemIndex > numOfElements + 1) {
                this._logger.error('SAPListBoxBehavior._getWDASingleItem: Error! numOfElements ==  ' + numOfElements + ', itemIndex == ' + itemIndex);
                return;
            }

            var attr;
            var txt;
            //Get the attribute "k" values
            for (var index = 0; index < numOfElements; index++) {
                attr = vecOfElements[index].getAttribute("k");
                if (Util.isNullOrUndefined(attr) || attr.length == 0) {
                    this._logger.error('SAPListBoxBehavior._getWDASingleItem: Error! raw_getAttribute');
                    break;
                }
                if (itemIndex == parseInt(attr) - 1) // The "k" val is 1..n
                {
                    txt = vecOfElements[index].innerText;
                    if (Util.isNullOrUndefined(txt)) {
                        this._logger.error('SAPListBoxBehavior._getWDASingleItem: Error! get_innerText index = ' + index);
                        return;
                    }

                    msg._data.AN_ITEM_TEXT = txt;
                    return;
                }
            }

            var vecOfRows;
            vecOfRows = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_ROW); //sometime in a row there can be two TD one with &nbsp which we want to ignore.
            if (vecOfRows.length == 0 || itemIndex > vecOfRows.length) {
                this._logger.error('SAPListBoxBehavior._getWDASingleItem: Error! numOfElements ==  ' + vecOfRows.length + ', itemIndex == ' + itemIndex);
                return;
            }

            var row = vecOfRows[itemIndex];
            if (row != null) {
                vecOfElements = SapConfigurationUtil.filterCollection(row, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM);
                var itemFullTitle = "";
                //get the first TD in the row. 
                for (let i = 0; i < vecOfElements.length; i++) {
                    var itemTitle = vecOfElements[i].innerText;
                    //take the first element, and ignore the rest which is probably only &nbsp
                    if (Util.isNullOrUndefined(itemTitle))
                        continue;
                    itemFullTitle += itemTitle;
                }

                msg._data.AN_ITEM_TEXT = itemFullTitle;
                return;
            }
            return;
        },

        _getItemByIndex: function (itemIndex, returnValues) {
            var index = itemIndex; //Numeric index of the item. Index values begin with 0". 
            // Return the number of items in the zero-based list
            var numOfItems = this._getNumOfItems();
            if (index < 0 || index >= numOfItems) {
                return false;
            }
            var realIndex = index;
            var element = this._elem;
            var vecOfElements = SapConfigurationUtil.filterCollection(element, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM);
            if (vecOfElements.length != 0) {
                returnValues.elem = vecOfElements[realIndex];
                returnValues.val = vecOfElements[realIndex].innerText;
                return true;
            }
            return false;
        },
    }
};

SAPListBox_getLastClicked = null;

var SAPListBoxS4HanaBehavior = {
    _micclass: ["SAPList", "WebList", "StdObject"],

    _attrs: {
        //overiting the parents implementation for WebDynpro lists		
        "name": function () {
            return SAPUtils.getLabelOrAttachedText(this);
        },

        "selection": function () {
            return this._getSingleSelectValue();
        },

        "value": function () {
            return SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX) ?
                this._getWDAItemsValues() :
                1;//Non WDA
        },

        "webdynpro itemlistbox": function () {
            return SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_MAIN_S4HANA);
        },

        "all items": function () {
            return this._getAllItems();
        },

        "items count": function () {
            return this._getNumOfItems();
        },

        "multiple": function () {
            return 0;
        },

        "selected item index": function () {
            return this._getSelectedItemsValues("k");
        },

        "select type": function () {
            var type = this._getSelectType();
            if (type == "LIB_S") {
                return "Single Selection";
            }
            else if (type == "LIB_M") {
                return "Extended Selection";
            }
            return "";
        },

        "selected items count": function () {
            return SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX) ?
                this._getSelectedItemsValues() :
                1;//Non WDA
        },
        "disabled": function () {
            var bDisabled = this._isListboxDsbl();
            return bDisabled ? 1 : 0;
        },

        //CWIListBox::GetAttrEx
        "multiple value": function () {
            //To do
            this._logger.trace("SAPListBoxBehavior: _Attr[] multiple value");
        }
    },

    _eventHandler: function (recorder, ev) {
        // this._logger.trace('SAPListBox._eventHandler: Received recordable event: ' + ev.type);
        // if (ContentUtils.isTouchEnabled())
        //     return this._eventHandlerTouchEnabled.call(this, recorder, ev);

        switch (ev.type) {
            case 'click':
                var elem = ev.target;
                var params = { event: 'onclick' };
                if (this._isListboxDsbl())
                    return false;

                SAPComboBox_getLastClicked = null;
                SAPListBox_getLastClicked = elem;
                params["webdynpro list item"] = true;
                params["webdynpro listbox item"] = true;

                //MSHTML::IHTMLElementPtr pCell(pElement);
                if (elem) {
                    var val = "";
                    var items = elem.parentElement;
                    var itemId = elem.id;
                    if (items) {
                        var tagName = items.tagName;
                        if (tagName === "DIV" || tagName === "div") {
                            var vecOfElementSelected;
                            vecOfElementSelected = SapConfigurationUtil.filterCollection(items, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM_S4HANA);
                            var elemIndex = -1;
                            for (var i = 0; i < vecOfElementSelected.length; i++) {
                                var id = vecOfElementSelected[i].id;
                                if (itemId.toLowerCase() == id.toLowerCase()) {
                                    elemIndex = i;
                                    break;
                                }
                            }
                            if (elemIndex != -1) {
                                items = items.parentElement;
                                var vecOfElementsGroup = SapConfigurationUtil.filterCollection(items, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM_VALUES_S4HANA);
                                var elemVectors = [];
                                for (var i = 0; i < vecOfElementsGroup.length; i++) {
                                    var vecOfElements = SapConfigurationUtil.filterCollection(vecOfElementsGroup[i], SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM_S4HANA);
                                    elemVectors.push(vecOfElements);
                                }
                                for (var i = 0; i < elemVectors.length; i++) {
                                    var itemTitle = elemVectors[i][elemIndex].innerText;
                                    if (!itemTitle)
                                        continue;
                                    val += itemTitle;
                                }
                                val.trim();
                            }
                        }//if
                    }
                    if (!val) //Fallback: if the parent is not TR, just take the value of the cell.
                    {
                        val = elem.innerText;
                    }

                    var selectedVal = this._getSingleSelectValue();
                    if (selectedVal == null)
                        return false;

                    if (selectedVal == val)// if the user reselct the same value we don't record.
                        return false;
                    params["value"] = val;
                }
                else
                    return false;

                recorder.sendRecordEvent(this, ev, params);
                return true;
        }
    },

    _helpers: {
        isLearnable: Util.alwaysTrue,

        _getSelectedItemsValues: function (attr) {
            var vecOfElements = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM_S4HANA);
            for (var i = 0; i < vecOfElements.length; i++)
            {
                if (SapConfigurationUtil.isElementOfSpecifier(vecOfElements[i], SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_SELECTED_ITEM_S4HANA))
                return i;
            }
            //Failed to get the value index.
            return -1;
        },

        _getWDAItemsValues: function () {
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX)) {
                var vecOfElementsGroup = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM_VALUES_S4HANA);
                var numOfElements = vecOfElementsGroup.length;

                var elemVectors = [];
                for (var i = 0; i < numOfElements; i++) {
                    var vecOfElements = SapConfigurationUtil.filterCollection(vecOfElementsGroup[i], SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM_S4HANA);
                    elemVectors.push(vecOfElements);
                }

                var attribs = "";
                if (elemVectors.length > 0) {
                    //elemVectors' every child should have the same size.
                    var size = elemVectors[0].length;
                    for (var i = 0; i < size; i++) {
                        var itemFullTitle;
                        for (var j = 0; j < elemVectors.length; j++) {
                            var itemTitle = elemVectors[j][i].innerText;
                            if (!itemTitle)
                                continue;
                            itemFullTitle += itemTitle;
                        }
                        if (!attribs)
                            attribs = itemFullTitle;
                        else
                            attribs += ";" + itemFullTitle;
                    }
                }

                if (attribs.endsWith(";")) {
                    attribs.substr(0, attribs.length - 1);
                }
                return attribs;
            }
            return "";
        },

        _getSelectType: function () {
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX)) {
                var topContainer = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX);
                if (topContainer != null) {
                    var attr = topContainer.getAttribute("ct");
                    if (!Util.isNullOrUndefined(attr) && attr.length > 0) {
                        if (attr == "LIB_S" || attr == "LIB_M") {
                            return attr;
                        }
                    }
                }
            }
            return "";
        },

        _getAllItems: function () {
            var value;
            //Get all items for S/4 HANA Structures;
            var vecOfRows = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM_VALUES_S4HANA);
            var elemVectors = [];
            for (var i = 0; i < vecOfRows.length; i++) {
                var vecOfElements = SapConfigurationUtil.filterCollection(vecOfRows[i], SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM_S4HANA);
                elemVectors.push(vecOfElements);
            }
            if (elemVectors.length > 0) {
                //elemVectors' every child should have the same size.
                var size = elemVectors[0].length;
                for (var i = 0; i < size; i++) {
                    var itemFullTitle = "";
                    for (var j = 0; j < elemVectors.length; j++) {
                        var itemTitle = elemVectors[j][i].innerText;
                        if (!itemTitle)
                            continue;
                        itemFullTitle += itemTitle;
                    }
                    if (!value)
                        value = itemFullTitle;
                    else
                        value += ";" + itemFullTitle;
                }
            }

            return value;
        },

        _getSingleSelectValue: function () {
            var selectedValue;
            var listBoxSelectedItem = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_SELECTED_ITEM_S4HANA);
            if (listBoxSelectedItem) {
                selectedValue = listBoxSelectedItem.innerText;
            }
            return selectedValue;
        },

        _getWDASingleItem: function (itemIndex, msg) {
            var vecOfRows = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM_VALUES_S4HANA);
            var elemVectors = [];
            for (var i = 0; i < vecOfRows.length; i++) {
                var vecOfElements = SapConfigurationUtil.filterCollection(vecOfRows[i], SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM_S4HANA);
                elemVectors.push(vecOfElements);
            }
            if (elemVectors.length > 0) {
                //elemVectors' every child should have the same size.
                var size = elemVectors[0].length;
                if (size == 0 || itemIndex >= size) {
                    this._logger.error("Error! numOfElements ==  " + size + ", itemIndex == " + itemIndex);
                    return;
                }

                var itemFullTitle = "";
                for (var j = 0; j < size; j++) {
                    var itemTitle = elemVectors[j][itemIndex].innerText;
                    if (!itemTitle)
                        continue;
                    itemFullTitle += itemTitle;
                }

                msg._data.AN_ITEM_TEXT = itemFullTitle;

                return;
            }
            return;
        },

        _getItemByIndex: function (itemIndex, returnValues) {
            var index = itemIndex; //Numeric index of the item. Index values begin with 0". 
            // Return the number of items in the zero-based list
            var numOfItems = this._getNumOfItems();

            if (index < 0 || index >= numOfItems) {
                return false;
            }
            var realIndex = index;
            var element = this._elem;
            var itemFullTitle = "";
            var vecOfElementsGroup = SapConfigurationUtil.filterCollection(elem, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM_VALUES_S4HANA);
            if (vecOfElementsGroup.length != 0) {
                for (var i = 0; i < vecOfElementsGroup.length; i++) {
                    var vecOfElements = SapConfigurationUtil.filterCollection(vecOfElementsGroup[i], SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM_S4HANA);
                    if (realIndex >= vecOfElements.length)
                        continue;
                    var itemTitle = vecOfElements[realIndex].innerText;
                    if (!itemTitle)
                        continue;
                    itemFullTitle += itemTitle;
                }
                returnValues.val = itemFullTitle;
                return true;
            }
            return false;
        },

        _getNumOfItems: function () {
            var vecOfRows = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM_VALUES_S4HANA);
            var vecOfElements;
            if (vecOfRows.length > 0) {
                vecOfElements = SapConfigurationUtil.filterCollection(vecOfRows[0], SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM_S4HANA);
            }
            return vecOfElements != null ? vecOfElements.length : 0;
        },

        /*	This method creates an Agent Object for the item part of a WebDynpro listbox. 
	    The AO's id is inserted into WebInfo for the package to use it.
        */
        _getItem: function (msg) {
            var element = this._elem;
            var listItem;
            var vecOfElementsGroup = SapConfigurationUtil.filterCollection(element, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM_S4HANA);
            var elemVectors = [];
            for (var i = 0; i < vecOfElementsGroup.length; i++)
            {
                var vecOfElements = SapConfigurationUtil.filterCollection(vecOfElementsGroup[i], SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM_S4HANA);
                elemVectors.push(vecOfElements);
            }
            var numOfElements = elemVectors.length != 0 ? elemVectors[0].length : 0;
            var selectedItem = msg._data["webdynpro list selected item"];
            var index = selectedItem.indexOf("#");
            if (index == 0)//got an index of an item
            {
                var itemIndexString = selectedItem.substr(1, selectedItem.length - 1);
                index = parseInt(itemIndexString);//gets zero value if was zero-String or non-numeric-String
                if (index == 0 && (itemIndexString != "0"))//in case we have an item that looks like: <#itemName>
                    index = -1;//so we'll get to the next if
                //we got an index (can be zero also)
                if ((index > 0 && numOfElements > index) || (index == 0)) {
                    //return first group element as the listitem.
                    listItem = vecOfElements[index];
                    index = 0;//so we won't get into the next 'if'
                }
            }
            if (index != 0) {//didnt used 'else' since we can can get here also if in the begining index was 0
                //go through the elements
                for (var i = 0; i < numOfElements; i++)
                {
                    var itemFullTitle = "";
                    for (var j = 0; j < elemVectors.length; j++)
                    {
                        var itemTitle = elemVectors[j][i].innerText;
                        if (!itemTitle)
                            continue;
                        itemFullTitle += itemTitle;
                    }
                    itemFullTitle = itemFullTitle.trim();
                    if (selectedItem.toLowerCase() == itemFullTitle.toLowerCase()) {
                        listItem = elemVectors[0][i];
                        break;
                    }
                }
            }
            if (listItem != null) {
                //create an AO for returning its ID
                var itemAO = SAPKitFactory.createAO(listItem, this.getID(), [SAPListItemBehavior]);
                if (itemAO != null) {
                    msg._data["id"] = itemAO.getID();
                    return;
                }
            }
            //we shouldn't get here
            return;
        },
    }
}
