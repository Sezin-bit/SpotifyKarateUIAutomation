var SAPComboBoxBehavior = {
	_micclass: ["SAPList", "WebList", "StdObject"],
	_lstLsDataLoc: [
		["'WD", "'"],
		["'aaaaJKNE", "'"],
		["'VB", "'"],
		["'P_POSE", "'"],
		["'MEPO_TOPLINE", "'"],
		["'SCARR", "'"]
	],
	_attrs: {
		"micclass": function () {
			return "SAPList";
		},

		"logical name": function () {
			if (!SAPUtils.getParentSapTable(this))
				return this.GetAttrSync("sap attached text");
			else
				return ListBehavior._attrs["logical name"];
		},

		"sap attached text": function () {
			// If we should use the tooltip as attached text and the element has a tooltip, we return the tooltip (starting CRM7)
			// if (CSapCustomObject:: Instance() -> ShouldUseTooltip()) ===> should read reigstry value.
			// To do
			if (true) {
				// For SAP language list the tooltip is changing according to the selected item.
				if (!SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_LANGUAGE_LIST)) {
					var bstrTitle = this._elem.title;
					if (!!bstrTitle)
						return bstrTitle;
				}
			}
			return SAPUtils.getLabelOrAttachedText(this);
		},

		"sap label": function () {
			return SAPUtils.getLabelOrAttachedText(this);
		},

		"webdynpro list": function () {
			if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPWD_LIST_ELEMENT))
				return true;
			return false;
		},

		"webdynpro list button": function () {
			var button = this._getListButtonAO(SAP_SPECIFIER_ENUM.SAPWD_LIST_BUTTON_MAIN);
			if (!Util.isNullOrUndefined(button))
				return button.getID();
			return true;
		},

		"wda object": function () {
			if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_COMBOBOX))
				return true;
			return false;
		},

		"sap web component name": function () {
			return SAPUtils.getComponentName(this._elem, this);
		},

		"sap web component runtime ID": function () {
			var RTID = SAPUtils.getComponentRuntimeID(this._elem, this);
			return RTID;
		},

		//CWIComboBox property
		"select type": function () {
			return "ComboBox Select";
		},

		//overiting the parents implementation for WebDynpro lists		
		"name": function () {
			if (this.GetAttrSync("webdynpro list") == true) {
				var strName = this._getName(this._elem);
				if (strName && strName.length > 0)
					return strName;
				else
					return SAPUtils.getLabelOrAttachedText(this);
			}
			else {
				return ListBehavior._attrs["name"];
			}
		},

		"selection": function () {
			if (this.GetAttrSync("webdynpro list") == true) {
				return this._getSingleSelectValue(this._elem);
			}
			else {
				return ListBehavior._attrs["selection"];
			}
		},

		"value": function () {
			if (this.GetAttrSync("webdynpro list") == true) {
				return this._getSingleSelectValue(this._elem);
			}
			else {
				return ListBehavior._attrs["value"];
			}
		},

		"default value": function () {
			if (this.GetAttrSync("webdynpro list") == true) {
				var input = this._elem;
				if (input == null)
					return "";
				return input.defaultValue;
			}
			else {
				return ListBehavior._attrs["default value"];
			}
		},

		"all items": function () {
			if (this.GetAttrSync("webdynpro list") == true) {
				return this._getAllItems(this._elem);
			}
			else {
				return ListBehavior._attrs["all items"];
			}

		},

		"items count": function () {
			if (this.GetAttrSync("webdynpro list") == true) {
				return this._getItems().length;
			}
			else {
				return ListBehavior._attrs["items count"];
			}
		},

		"multiple": function () {
			if (this.GetAttrSync("webdynpro list") == true) {
				return false;
			}
			else {
				return ListBehavior._attrs["multiple"];
			}
		},

		"selected item index": function () {
			if (this.GetAttrSync("webdynpro list") == true) {
				var index = this._getSelectedItemIndex();
				if (index != -1)
					return index;
				return "";
			}
			else {
				return ListBehavior._attrs["selected item index"];
			}
		},

		"selected items count": function () {
			if (this.GetAttrSync("webdynpro list") == true) {
				return 1;
			}
			else {
				return ListBehavior._attrs["selected items count"];
			}
		},

		"disabled": function () {
			if (this.GetAttrSync("webdynpro list") == true) {
				var input = this._elem;
				if (input == null)
					return "";

				if (input.disabled == true)
					return 1;
				else
					return 0;
			}
			else {
				return ListBehavior._attrs["disabled"];
			}
		},

		"type": function () {
			if (this.GetAttrSync("webdynpro list") == true) {
				var input = this._elem;
				if (input == null)
					return "";
				return input.type;
			}
			else {
				return ListBehavior._attrs["type"];
			}
		},

		"visible items": function () {
			if (this.GetAttrSync("webdynpro list") == true) {
				var input = this._elem;
				if (input == null)
					return "";

				var size = input.size;
				// the default size is 1
				if (size && size <= 0)
					size = 1;
				return size;
			}
			else {
				return ListBehavior._attrs["visible items"];
			}
		}
	},

	_methods: {
		//SAP_WD_GET_LIST_ITEM is used by the WebDynpro list to get the selected item 
		//object to perform the click on it.
		"SAP_WD_GET_LIST_ITEM": function (msg, resultCallback) {
			this._getItemFromFrame(this._elem, msg);
			resultCallback(msg);
		},

		//the package uses WD_NUM_TO_ITEM for GetItem method - we give the item's index
		//and get the item string back.
		"WD_NUM_TO_ITEM": function (msg, resultCallback) {
			var itemIndex = msg._data["item_index"];
			if (itemIndex != null) {
				var returnValues = {};
				if (this._getItemByIndex(itemIndex, returnValues)) {
					msg._data.AN_ITEM_TEXT = returnValues.value;
				}
			}
			resultCallback(msg);
		},
	},

	_eventHandler: function (recorder, ev) {
		// this._logger.trace('SAPComboBox._eventHandler: Received recordable event: ' + ev.type);
		// if (ContentUtils.isTouchEnabled())
		// 	return this._eventHandlerTouchEnabled.call(this, recorder, ev);

		switch (ev.type) {
			case 'focus':
			case 'blur':
			case 'click':
				var params = { event: 'on' + ev.type };
				if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPWD_LIST_ELEMENT)) {
					SAPComboBox_getLastClicked = this._elem;
					SAPListBox_getLastClicked = null;
					params["webdynpro list item"] = false;
					var vtValue = this._elem.getAttribute("lid");
					//added for new portal - there is no "lid" attribute,so we take
					// the "id" attribute of the list.
					if (Util.isNullOrUndefined(vtValue)) {
						vtValue = this._elem.id;
						if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPWD_LIST_ELEMENT_INPUT)) {
							params['WDA Object 7.02'] = true;
						}
					}
					params["webdynpro list matched item id"] = vtValue;
					var itemData = this._elem.getAttribute("data");
					// if "data" attribute is null we try to take the "lsdata" attribute
					if (!itemData || itemData.length == 0) {
						itemData = this._elem.getAttribute("lsdata");
					}
					params["sap list"] = itemData;
				}

				var bIsEPListExtendTable = SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPWD_LIST_EXTENDEDSELECTOR_MAIN);
				if (!bIsEPListExtendTable && SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPWD_LIST_BUTTON_MAIN)) {
					// If the current element is the list button, find its related combo box
					var pContainerElement = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAPWD_LIST_CONTAINER, 4);
					if (pContainerElement) {
						var spDisp = pContainerElement.all;
						if (spDisp) {
							var pList = SapConfigurationUtil.getElementOfCollection(spDisp, SAP_SPECIFIER_ENUM.SAPWD_LIST_EXTENDEDSELECTOR_MAIN);
							bIsEPListExtendTable = pList ? true : false;
						}
					}
				}
				params["is ep list extended selector table"] = bIsEPListExtendTable;

				var value = this.GetAttrSync("value");

				if (!Util.isNullOrUndefined(value))
					params["value"] = value;

				recorder.sendRecordEvent(this, ev, params);
		}
		//Do not let other behavior handle this event.
		return true;
	},

	_helpers: {
		isLearnable: Util.alwaysTrue,
		//this function returns the button's AO which is the button part of the WebDynpro List
		_getListButtonAO: function (buttonSpecifier) {
			//get the container of the list
			var container = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAPWD_LIST_CONTAINER, 4);
			if (!Util.isNullOrUndefined(container)) {
				//found the container. now find the button
				var button = SapConfigurationUtil.getElementOfCollection(container, buttonSpecifier);
				if (!Util.isNullOrUndefined(button)) {
					var SapButtonAO = SAPKitFactory.createAO(button, this.getID(), [SAPListButtonBehavior]);
					return SapButtonAO;
				}
			}
			return null;
		},
		_getName: function (elem) {
			if (elem == null)
				return "";
			return elem.name;
		},
		_getSingleSelectValue: function (elem) {
			// get the select value
			var input = elem;
			if (input == null)
				return "";

			// single selection list
			var inputSelectedValue = input.value;
			if (Util.isNullOrUndefined(inputSelectedValue))
				return "";

			//if the value of selected item is not unique, we return index string instead
			var selectedIndex = -1;
			var isSelectedIndexGot = false;

			if (this._isItemValueUnique(inputSelectedValue) == false) {
				if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPWD_LIST_ELEMENT_INPUT_DROPDOWN1)) {
					var dataValue = elem.getAttribute("lsdata");
					if (dataValue) {
						var dataStr = dataValue;
						//handle the lsdata like: 
						//lsdata="{0:true,1:false,2:false,3:false,4:'DROPDOWNSELECT',5:true,6:'WD14',7:'1',8:false,9:'',10:false,11:'NONE',12:false,13:'',14:'OFF',15:'DEFAULT',16:false,17:false,18:false}" 
						if (dataStr.indexOf("6:'WD") >= 0) {
							var indexStr = SAPUtils.extractDataFromLsDataStr(dataStr, ",7:'", "',8:");
							if (indexStr != null && indexStr.length > 0) // one field should be read
							{
								selectedIndex = parseInt(indexStr, 10);
								if (selectedIndex) {
									isSelectedIndexGot = true;
								}
							}
						}
					}
				}

				if (isSelectedIndexGot) {
					//the index to record should be 0-based
					var indexString = "#" + (selectedIndex - 1).toString();
					return indexString;
				}
			}

			return inputSelectedValue;
		},

		//Return true by default, including the case that fail to check.
		_isItemValueUnique: function (itemValue) {
			if (itemValue == null)
				return true;

			if (!SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPWD_LIST_ELEMENT_INPUT_DROPDOWN1)) {
				return true;
			}

			var optionContainer = this._getOptionsContainer();
			if (optionContainer) {
				//search under the parent element a WDList_Item element
				var nodeElements = SapConfigurationUtil.filterCollection(optionContainer, SAP_SPECIFIER_ENUM.SAPWD_LIST_ITEM);

				nodeElements = this._excludeDuplicatedChildItems(SAP_SPECIFIER_ENUM.SAPWD_LIST_ITEM, nodeElements);

				var matchCount = 0;
				for (var i = 0; i < nodeElements.length; i++) {
					var bstrItemTitle = nodeElements[i].innerText;
					if (!bstrItemTitle)
						continue;
					if (itemValue.toLowerCase() == bstrItemTitle.toLowerCase()) {
						matchCount++;
					}
				}
				if (matchCount > 1)
					return false;
			}
			return true;
		},

		/////////////////////////////////////////////////////////////
		// Function name   : CSAPComboBox::ExcludeDuplicatedChildItems
		// Description     : fix the item duplication issue for the nodes like that: ?tr ?ct="ILBI" k="1"><td class="urCob2I">?
		//                   namely both parent-node and child-node are items of the same specifier SAPWD_LIST_ITEM = WDList_Item  
		// Return type     : 
		//		size_t in/out rElementsVector new size
		// Arguments        : 
		//		IN		long			lSpecifier /*SAPWD_LIST_ITEM*/
		//		IN/OUT	vectorElements& rElementsVector
		/////////////////////////////////////////////////////////////
		_excludeDuplicatedChildItems: function (lSpecifier, nodeElements) {
			var rcElements = [];
			var current;
			var parent;
			for (var i = 0; i < nodeElements.length; i++) {
				current = nodeElements[i];
				parent = current.parentElement;
				if (SapConfigurationUtil.isElementOfSpecifier(parent, lSpecifier)) {
					continue;
				}
				rcElements.push(current);
			}
			return rcElements;
		},

		//This method extracts the list option id from lsData
		_extractTableDataFromLsDataStr: function (dataValue, startStringLocation, endStringLocation) {
			var i = dataValue.indexOf(startStringLocation);
			if (i <= -1)
				return "";
			var startStringIndex = startStringLocation.indexOf("'") + 1;
			var j = dataValue.indexOf(endStringLocation, i + startStringLocation.length);
			if (j <= -1)
				return "";
			return dataValue.substr(i + startStringIndex, j - i - startStringIndex);
		},

		//this method receives the DOM element that contains the option list 
		// lsdata="{0:true,1:false,2:false,3:false,4:'DROPDOWNSELECT',5:true,6:'WD14',7:'1',8:false,9:'',10:false,11:'NONE',12:false,13:'',14:'OFF',15:'DEFAULT',16:false,17:false,18:false}" 
		// lsdata="{0:'',1:true,2:false,3:false,4:false,5:'DROPDOWNSELECT',6:true,7:'WD2B',8:'2-',9:false,10:'',11:'',12:false,13:false,14:'',15:'',16:'AUTO',17:'NONE',18:0,19:'LEFT',20:'STRING',21:false,22:'',23:'OFF',24:'DEFAULT',25:false,26:false,27:false,28:'',29:20,30:true}" 
		// lsdata="{0:'',1:true,2:false,3:false,4:false,5:'DROPDOWNSELECT',6:true,7:'VBAK-LIFSKSAPMV45A_ei',8:'42',9:false,10:'Delta Usage Date',11:'',12:true,13:false,14:'',15:'',16:'AUTO',17:'NONE',18:0,19:'LEFT',20:'STRING',21:true,22:'',23:'OFF',24:'DEFAULT',25:false,26:false,27:false,28:'',29:20}"
		// lsdata="{7:'VBAK\x2dLIFSKSAPMV45A',12:'Delivery\x20block\x20\x28document\x20header\x29',13:true,23:true,27:'MONOSPACE'}"
		_getOptionsContainer: function () {
			// var pIunknown = 
			// static_cast < CWIComboBox *> (this) -> CWIObj:: GetWrappedElement(& pIunknown);
			var element = this._elem;
			var value = element.getAttribute("lid");
			var listOptionId = "";
			var lsData;
			if (!value) //No "lid"
			{
				lsData = element.getAttribute("lsdata");
				if (!lsData)
					return null;

				for (var i = 0; i < SAPComboBoxBehavior._lstLsDataLoc.length; i++) {
					listOptionId = this._extractTableDataFromLsDataStr(lsData, SAPComboBoxBehavior._lstLsDataLoc[i][0], SAPComboBoxBehavior._lstLsDataLoc[i][1]);
					if (listOptionId && listOptionId.length > 0)
						break;
				}

				if (listOptionId == null || listOptionId.length <= 0)
					return null;
			}
			else
				listOptionId = value;

			// replace '\\x2d' to '-' in the listOptionId
			listOptionId = listOptionId.replace("\\x2d", "-");

			// replace '\\x2f' to '/' in the listOptionId
			listOptionId = listOptionId.replace("\\x2f", "/");

			//get the document
			if (document) {
				//filter the container of the list options
				var vectorListOptions;
				vectorListOptions = SapConfigurationUtil.filterCollection(document, SAP_SPECIFIER_ENUM.SAPWD_LIST_OPTION_CONTAINER);

				for (var l = 0; l < vectorListOptions.length; l++) {
					containerId = vectorListOptions[l].id;
					if (containerId.startsWith(listOptionId)) {
						return vectorListOptions[l];
					}
				}
			}
			return null;
		},

		_getAllItems: function (elem) {
			var value = "";
			var Separator = ";";

			var optionContainer = this._getOptionsContainer();
			if (optionContainer) {
				//search under the parent element a WDList_Item element
				var nodeElements = SapConfigurationUtil.filterCollection(optionContainer, SAP_SPECIFIER_ENUM.SAPWD_LIST_ITEM);

				nodeElements = this._excludeDuplicatedChildItems(SAP_SPECIFIER_ENUM.SAPWD_LIST_ITEM, nodeElements);

				//added for searching CRM list items
				if (!nodeElements.length)
					nodeElements = SapConfigurationUtil.filterCollection(optionContainer, SAP_SPECIFIER_ENUM.SAP_CRM_LIST_ITEM_MAIN);

				for (var i = 0; i < nodeElements.length; i++) {
					var itemTitle = nodeElements[i].innerText;
					if (!itemTitle)
						continue;
					if (value == null)
						value = itemTitle;
					else
						value += Separator + itemTitle;
				}//for
			}
			return value;
		},

		_getItems: function () {
			var optionContainer = this._getOptionsContainer();
			if (optionContainer) {
				//search under the parent element a WDList_Item element
				var NodeElements = SapConfigurationUtil.filterCollection(optionContainer, SAP_SPECIFIER_ENUM.SAPWD_LIST_ITEM);

				// if (NodeElements.length == 0) {
				// 	this._fireEvent(this._elem, "click", {});
				// 	NodeElements = SapConfigurationUtil.filterCollection(optionContainer, SAP_SPECIFIER_ENUM.SAPWD_LIST_ITEM);
				// }

				NodeElements = this._excludeDuplicatedChildItems(SAP_SPECIFIER_ENUM.SAPWD_LIST_ITEM, NodeElements);
				//added for searching CRM list items
				if (!NodeElements.length)
					NodeElements = SapConfigurationUtil.filterCollection(optionContainer, SAP_SPECIFIER_ENUM.SAP_CRM_LIST_ITEM_MAIN);

				return NodeElements;
			}
			return [];
		},

		_getSelectedItemIndex: function () {
			var input = this._elem;

			if (input == null)
				return -1;

			var item = input.value;
			if (Util.isNullOrUndefined(item))
				return -1;

			var optionContainer = this._getOptionsContainer();
			if (!Util.isNullOrUndefined(optionContainer)) {
				//search under the parent element a WDList_Item element
				var NodeElements = SapConfigurationUtil.filterCollection(optionContainer, SAP_SPECIFIER_ENUM.SAPWD_LIST_ITEM);

				NodeElements = this._excludeDuplicatedChildItems(SAP_SPECIFIER_ENUM.SAPWD_LIST_ITEM, NodeElements);

				//added for searching CRM list items
				if (!NodeElements.length)
					NodeElements = SapConfigurationUtil.filterCollection(optionContainer, SAP_SPECIFIER_ENUM.SAP_CRM_LIST_ITEM_MAIN);

				for (var i = 0; i < NodeElements.length; i++) {
					var itemTitle = NodeElements[i].innerText;
					if (Util.isNullOrUndefined(itemTitle))
						continue;
					if (item.toLowerCase() == itemTitle.toLowerCase())
						return i;
				}
			}
			return -1;
		},

		/*	This method gets an item index and returns the string that represents the item in the 
		given index. This method retrieve the item's text from the DIV container and not from
		the frame itself since when invoking it the frame might not exist (the frame is created
		only after operating on the list).
		*/
		_getItemByIndex: function (itemIndex, returnValues) {
			var index = parseInt(itemIndex);
			if (Util.isNullOrUndefined(index)) {
				return false;
			}
			// zero-based item list
			if (index < 0) {
				return false;
			}
			// Return the number of items in the zero-based list
			var items = this._getItems();

			if (index >= items.length) {
				return false;
			}
			
			if (!Util.isNullOrUndefined(items) && items.length != 0) {
				returnValues.tempElem = items[index];
				returnValues.value = items[index].innerText;
				return true;
			}
			return false;
		},

		_getItemFromFrame: function (elem, msg) {
			//get the document and extract the menu frame from it. 
			var optionsFrame = this._getOptionsFrame(elem);
			var ListItem;
			if (!Util.isNullOrUndefined(optionsFrame)) {
				//extract the DOM element from the frame
				ListItem = this._extractElementFromFrame(optionsFrame, msg);
			}
			else {
				// added for new portal - there is no options frame at all in new portal,
				// therefore we search in the whole document for collection of list items
				//( each list item contained in "TR" with id equal to ComboBox id )
				var comboBoxId = elem.id;
				// now we filter only collection of children with id equal
				// to ComboBox id and tagname "TR". 
				var vecOfElements, vectorOfListItems;
				vecOfElements = SapConfigurationUtil.filterCollection(document, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_ROW);
				if (vecOfElements.length != 0) {
					var itemId;
					var trItemId;
					var listItem;
					for (var i = 0; i < vecOfElements.length; i++) {
						itemId = vecOfElements[i].id;
						// there is a case when we have "itemid" property instead of "id"
						if (Util.isNullOrUndefined(itemId)) {
							trItemId = vecOfElements[i].getAttribute("itemid");
							if (!Util.isNullOrUndefined(itemId))
								itemId = trItemId;
						}

						if (itemId == comboBoxId) {
							// we found list item -insert it in items collection
							listItem = SapConfigurationUtil.getElementOfCollection(vecOfElements[i], SAP_SPECIFIER_ENUM.SAPWD_LIST_ITEM);
							vectorOfListItems.push_back(listItem);
						}
					}

					//added for A1S - "TR" have no "id" and no "itemid", so we take from
					//the comboBox the "data" attribute and search in the document for
					// list options container which "id"(without "-r", removed at the end) that contained
					// in the "data" attribute of the list. 
					if (Util.isNullOrUndefined(vectorOfListItems) || vectorOfListItems.length == 0) {
						var itemData = elem.getAttribute("data");
						// if "data" attribute is null we try to take the "lsdata" attribute
						if (Util.isNullOrUndefined(itemData)) {
							itemData = elem.getAttribute("lsdata");
						}

						// if "lsdata" is null, try to take the "lid" attribute
						if (Util.isNullOrUndefined(itemData)) {
							itemData = elem.getAttribute("lid");
						}
						if (!Util.isNullOrUndefined(itemData)) {
							var itemDataValue;
							var vecOptionsContainers;
							var selectedContainer = null;
							var k = 0;
							itemDataValue = itemData;
							// replace '\\x2d' to '-' in the itemDataValue
							itemDataValue = itemDataValue.replace("\\x2d", "-");
							// replace '\\x2f' to '/' in the listOptionId
							itemDataValue = itemDataValue.replace("\\x2f", "/");

							//we take from the document all list options containers
							vecOptionsContainers = SapConfigurationUtil.filterCollection(document, SAP_SPECIFIER_ENUM.SAPWD_LIST_OPTION_CONTAINER);

							var optionsContainerId;
							while ((selectedContainer == null) && (k < vecOptionsContainers.length)) {
								optionsContainerId = vecOptionsContainers[k].id;

								if (optionsContainerId && optionsContainerId.endsWith("-r")) {
									optionsContainerId = optionsContainerId.substr(0, optionsContainerId.length - 2);
								}

								// we found the right container 
								if (itemDataValue.indexOf(optionsContainerId) != -1) {
									//now we take its children
									selectedContainer = vecOptionsContainers[k];
									vectorOfListItems = SapConfigurationUtil.filterCollection(selectedContainer, SAP_SPECIFIER_ENUM.SAPWD_LIST_ITEM);

									vectorOfListItems = this._excludeDuplicatedChildItems(SAP_SPECIFIER_ENUM.SAPWD_LIST_ITEM, vectorOfListItems);

									//CRM list items
									if (!vectorOfListItems.length)
										vectorOfListItems = SapConfigurationUtil.FilterCollection(selectedContainer, SAP_SPECIFIER_ENUM.SAP_CRM_LIST_ITEM_MAIN);

								}
								k++;
							}
						}
					}

					ListItem = this._getSelectedItemFromCollection(vectorOfListItems, msg);
				}
			}

			if (ListItem != null) {
				//create an AO for returning its ID
				var itemAO = SAPKitFactory.createAO(ListItem, this.getID(), [SAPListItemBehavior]);
				if (itemAO != null) {
					msg._data["sap id"] = itemAO.getID();
					msg._data["id"] = itemAO.getID();
					return;
				}
			}
			//we shouldn't get here
			return;
		},

		//this method receives the DOM element of the List.
		//it gets the document and looks for the frame of the list's options.
		_getOptionsFrame: function (elem) {
			//filter the IFRAME of the List's options from the children of the doc:
			return SapConfigurationUtil.getElementOfCollection(document, SAP_SPECIFIER_ENUM.SAPWDLIST_FRAME);
		},

		//this method receives the frame of the List's options and extracts the DOM element of the required item
		_extractElementFromFrame: function (optionsFrame, msg) {
			//first get the document pointed by the frame of the iView:
			var frameDocument2 = SAPUtils.getDocumentPointedByFrame(pOptionsFrame);
			if (frameDocument2 != null) {
				//we have the doc! get its items
				var vecOfElements = SapConfigurationUtil.filterCollection(frameDocument2, SAP_SPECIFIER_ENUM.SAPWD_LIST_ITEM);
				vecOfElements = this._excludeDuplicatedChildItems(SAP_SPECIFIER_ENUM.SAPWD_LIST_ITEM, vecOfElements);
				//CRM list items
				if (!vecOfElements.length)
					vecOfElements = SapConfigurationUtil.filterCollection(frameDocument2, SAP_SPECIFIER_ENUM.SAP_CRM_LIST_ITEM_MAIN);

				return this._getSelectedItemFromCollection(vecOfElements, msg);
			}
			return null;
		},

		// this method gets vector of items found in the list and extracts the DOM element of the required item
		_getSelectedItemFromCollection: function (vecOfElements, msg) {

			var numOfElements = vecOfElements.length;
			// get attr PN_SAP_SELECTED_ITEM
			var bstrItem = msg._data["webdynpro list selected item"];
			var index = bstrItem.indexOf("#");
			if (index == 0)//got an index of an item
			{
				var bstrIndex = bstrItem.substr(1, bstrItem.length - 1);
				index = parseInt(bstrIndex);//gets zero value if was zero-String or non-numeric-String
				if (index == 0 && (bstrIndex != "0"))//in case we have an item that looks like: <#itemName>
					index = -1;//so we'll get to the next if
				//we got an index (can be zero also)
				if ((index > 0 && numOfElements > index) || (index == 0))
					return (vecOfElements[index]);
			}
			if (index != 0) {//didnt used 'else' since we can can get here also if in the begining index was 0
				//go through the elements
				for (var i = 0; i < numOfElements; i++) {
					var bstrItemTitle = vecOfElements[i].innerText;
					if (Util.isNullOrUndefined(bstrItemTitle)) {
						continue;
					}
					bstrItemTitle = bstrItemTitle.trim();
					if (bstrItem.toLowerCase() == bstrItemTitle.toLowerCase())
						return vecOfElements[i];
				}

				// For SAP Language List, selected value is like "English" while option innertext is "EnglishEN", so get the value
				// from the lsdata of options

				// In case selected is of value ' '
				bstrItem = bstrItem.trim();

				for (var i = 0; i < numOfElements; i++) {
					var lsData = vecOfElements[i].getAttribute("lsdata");
					if (Util.isNullOrUndefined(lsData)) {
						continue;
					}

					var listOptionValue = this._extractTableDataFromLsDataStr(lsData, "4:'", "'");
					var listOptionValueAbri = this._extractTableDataFromLsDataStr(lsData, "5:'", "'");

					listOptionValue = listOptionValue.trim();
					listOptionValueAbri = listOptionValueAbri.trim();

					if (bstrItem.toLowerCase() == listOptionValue.toLowerCase() ||
						bstrItem.toLowerCase() == listOptionValueAbri.toLowerCase())
						return vecOfElements[i];
				}
			}
			//we shouldn't get here
			return null;
		},
	},
};

SAPComboBox_getLastClicked = null;
