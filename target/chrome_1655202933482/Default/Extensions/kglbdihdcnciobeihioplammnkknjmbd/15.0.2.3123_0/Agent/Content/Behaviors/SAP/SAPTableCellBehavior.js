//Relize WICell behavior
var SAPTableCellBehavior = {
	_micclass: ["SAPTableCell"],
	_attrs: {
		"name": function () {
			return this.GetAttrSync("inner cell data");
		},

		"row": function () {
			var row = SAPUtils.getAncestorAOForTag(this, "TR");
			if (!row)
				return null;
			return row.GetAttrSync("row");
		},

		"col": function () {
			var cell = this._elem;
			if (!cell || (cell.tagName.toLowerCase() != "td" && cell.tagName.toLowerCase() != "th"))
				return;

			var col = cell.cellIndex;
			if (col)
				col++; // Number of columns begins from 1!

			return col;
		},

		"parent": function () {// override of parent attribute to return table rather than row.
			var table = SAPUtils.getAncestorAOForTag(this, "TABLE");
			if (!table)
				return null;
			return table.getID();
		},

		"table_index": function () {
			var table = SAPUtils.getAncestorAOForTag(this, "TABLE");
			if (!table)
				return null;
			return SAPUtils.getTableIndex(table);
		},

		"text": function () {
			return this._elem.innerText.trim();
		},

		"IsIgnored": function () {
			return 1;
		},

		"inner cell data": function () {
			var childrenList = [];
			// now we get data only for single object with data
			// more objects we not support!!
			if (this._getAllChildrenWithData(childrenList) == 1 && childrenList[0] != null) {
				return childrenList[0].GetAttrSync("data");
			}

			// need get data of the cell itself
			return this.GetAttrSync("text");
		},

		"inner cell select id": function () {
			return this._getSelectIdOrActivateId();
		},

		"inner cell activate id": function () {
			return this._getSelectIdOrActivateId();
		},
	},

	_methods: {
		"SET_INNER_CELL_DATA": function (msg, resultCallback) {
			var value = msg._data["inner cell data"];
			if (value == null)
				return;

			var childrenList = [];
			if (this._getAllChildrenWithData(childrenList) == 1 && childrenList[0] != null) {
				msg._data["data"] = value;
				childrenList[0].InvokeMethod("SET_DATA", msg, resultCallback);
			}
		},

		"MAKE_VISIBLE": function (msg, resultCallback) {
			// if exists object inside the cell - call MakeVisible for it,
			// because bug in IE - we can't to make visible TD element itself for tables inside container( f.e. DIV with scrollbars) 
			var pt = msg._data.pos ? { x: msg._data.pos.x, y: msg._data.pos.y } : { x: 0, y: 0 };
			var children = this._elem.children;
			if (children && children.length > 0) {
				// we don't scroll document by point in this case
				// To send him also the WEB_PN_SCROLL_TO_CENTER flag:
				var obj = content.kitsManager.createAO(children[0], this._parentID);
				if (!obj)
					return;

				obj.InvokeMethod("MAKE_VISIBLE", msg, resultCallback);
				// if no need make scroll to point -  return
				if ((pt.x == 0) && (pt.y == 0))
					return;
			}
		},
	},

	_eventHandler: function (recorder, ev) {
		//Do not record anything on cell AO.
		//Do not create cell ao when record steps is the best way to resolve the issue.
		return true;
	},

	_helpers: {
		isLearnable: Util.alwaysTrue,

		isObjSpyable: function () {
			return false;
		},

		_getAllChildrenWithData: function (childrenList) {
			var children = this._elem.querySelectorAll("*");
			if (children == null)
				return 0;

			for (let i = 0; i < children.length; i++) {
				var child = children[i];

				if (child) {
					var ao = content.kitsManager.createAO(child, this._parentID);
					var data = ao.GetAttrSync("data");
					if (data != null)
						childrenList.push(ao);
				}
			}
			return childrenList.length;
		},

		_getSelectIdOrActivateId: function () {
			var childrenList = [];
			if (this._getAllChildrenWithData(childrenList) == 1 && childrenList[0] != null) {
				return childrenList[0].getID();
			}
			else {
				return this.getID();
			}
		}
	}
};

var SAPICWCTableCellBehavior = {
	_attrs: {
		"inner cell data": function () {
			var calendar = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_ICWC_CALENDAR);
			if (calendar == null) {
				calendar = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_ICWC_CALENDAR2);
				if (calendar != null && !SAPUtils.isCalendarByParent(calendar)) {
					calendar = null;
				}
			}
			if (calendar == null)
				calendar = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_CALENDAR_TESTMODE);

			//For these two kinds of tablecell, some ChildrenList will have two elements.
			//Check the cell contains such kind of checkbox or not. return the "data" directly.
			var checkBox = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAPWD_CHECKBOX_MAIN);
			if (checkBox == null)
				checkBox = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_ICWC_CHKBX1);
			if (checkBox != null) {
				var ao = content.kitsManager.createAO(checkBox, this._parentID);
				if (ao)
					return ao.GetAttrSync("data");;
			}

			// in case we have more then one child with data, return the PN_TEXT, otherwise return the data.
			// in calendar objects we have 2 agent objects (with the same data) in the cell, we need
			// to return the WEB_PN_DATA and not the PN_TEXT
			var childrenList = [];
			if ((this._getAllChildrenWithData(childrenList) == 1 && childrenList[0] != null) || (calendar != null)) {
				return childrenList[0].GetAttrSync("data");
			}

			// need get data of the cell itself
			return this._getCellText();
		},
	},


	_methods: {
		"SET_INNER_CELL_DATA": function (msg, resultCallback) {
			// In all cases we call CWICell::InvokeMethod in order to invoke SET_DATA on the contained object. 
			// In calendar we have 2 agent objects in the cell, we need to invoke SET_DATA on one of them so we implement
			// a specific InvokeMethod to deal with that case.
			var calendar = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_ICWC_CALENDAR);
			if (calendar == null) {
				calendar = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_ICWC_CALENDAR2);
				if (calendar != null && !SAPUtils.isCalendarByParent(calendar)) {
					calendar = null;
				}
			}
			if (calendar == null)
				calendar = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_CALENDAR_TESTMODE);

			if (calendar != null) {
				var value = msg._data["inner cell data"];
				if (value == null) {
					return;
				}
				else {
					var childrenList = [];
					if (this._getAllChildrenWithData(childrenList) && childrenList[0] != null) {
						msg._data["data"] = value;
						msg._data["value"] = value;
						childrenList[0].InvokeMethod("SET_DATA", msg, resultCallback);
					}
				}
			}

			SAPTableCellBehavior._methods.SET_INNER_CELL_DATA.call(this, msg, resultCallback);
		}
	},

	_helpers: {
		isLearnable: Util.alwaysTrue,

		_getCellText: function () {
			var dataValue;

			//for some reason, WDA SAPTable get duplicated cell data in checkpoint and GetCellData
			//we need to get the table cell which contains one single text.
			var single_text = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_ICWC_TABLE_INNER_SINGLE_TEXT);
			if (single_text != null) {
				return single_text.innerText;
			}

			var dataObj = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_ICWC_TABLE_INNER_CHILD4);
			if (dataObj != null) {
				//Only ct = I will get the "0" value.
				//lsdata = {0:'17.11.1995',1:true,2:'DATE',5:true,6:true,10:'dd.MM.yyyy',23:'FILL_FIXED_LAYOUT'}
				//lsdata = {0:'02.05.2012',2:'DATE',6:true,10:'dd.MM.yyyy',23:'FILL_FIXED_LAYOUT'}
				//lsdata = {0:'Monday',6:true,23:'FILL_FIXED_LAYOUT'}
				dataValue = dataObj.getAttribute("lsdata");
				if (dataValue) {
					var value = SAPUtils.extractDataFromLsDataStr(dataValue, "0:'", "',");
					if (!!value) {
						value = value.replace("\\x20", " ");
						return value;
					}
				}
			}

			var child2;
			var child1 = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_ICWC_TABLE_INNER_CHILD1);

			if (child1 != null) {
				child2 = SapConfigurationUtil.getElementOfCollection(child1, SAP_SPECIFIER_ENUM.SAP_ICWC_TABLE_INNER_CHILD2);
			}

			if (child2 != null) {
				dataValue = child2.getAttribute("lsdata");
			}

			var text_readonly = SapConfigurationUtil.getElementOfCollection(child2, SAP_SPECIFIER_ENUM.SAP_ICWC_TABLE_INNER_CHILD3);
			if (text_readonly != null) {
				dataValue = text_readonly.getAttribute("lsdata");
				if (SapConfigurationUtil.isElementOfSpecifier(text_readonly, SAP_SPECIFIER_ENUM.SAP_ICWC_TABLE_INNER_CHKBOX_CHECK))
					return "ON";

				if (SapConfigurationUtil.isElementOfSpecifier(text_readonly, SAP_SPECIFIER_ENUM.SAP_ICWC_TABLE_INNER_CHKBOX_UNCHECK))
					return "OFF";
			}

			if (dataValue) {
				var indexStr = SAPUtils.extractDataFromLsDataStr(dataValue, "value:'", "'");
				if (!!indexStr)
					return indexStr;
			}

			var elem = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_ICWC_TABLE_INNER);
			if (elem == null && SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_TABLE_CELL))
				elem = this._elem;

			if (elem != null) {
				//IE will return the invisible node text while using innerText which is confusing.
				//Use elem.textContent if innerText is "";
				return elem.innerText || elem.textContent;
			}

			return this.GetAttrSync("text");
		}

	}
};


var SAPWDATableCellBehavior = {
	_attrs: {
		"crm list in table": function () {
			return this._isWDADropDownInTable();
		}
	},

	_methods: {
		"SET_CELL_IF_CRM_LIST": function (msg, resultCallback) {
			var listInput = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_COMBOBOX);
			//create new AO for passing the listInput id to replay the selection of items in the list
			if (listInput == null)
				return SAPICWCTableCellBehavior._methods.SET_CELL_IF_CRM_LIST.call(this, msg, resultCallback);

			var itemAO = content.kitsManager.createAO(listInput, this._parentID);
			if (itemAO != null)
				msg._data.WEB_PN_ID = itemAO.getID();
			resultCallback(msg);
			return;
		}
	},

	_helpers: {
		_isWDADropDownInTable: function () {
			if (SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_COMBOBOX))
				return true;
			return false;
		}
	}
};


var SAPCRMTableCellBehavior = {
	_attrs: {
		"inner cell data": function () {
			//we have a checkbox in the cell
			if (SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_CHECKBOX_TESTMODE) != null)
				return SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_CHECKBOX_CHECKED) ? "ON" : "OFF";
			else if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_CELL)) {
				var elem_text = this._elem.innerText;
				if (!elem_text.trim()) {
					var inputMain = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_INPUT_MAIN);
					if (inputMain == null)
						inputMain = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_INPUT_SEARCH_FORM);
					if (inputMain != null && inputMain.tagName.toLowerCase() == "input")
						elem_text = inputMain.value;
				}
				return elem_text;
			}

			return SAPICWCTableCellBehavior._attrs["inner cell data"].call(this);
		},

		"sap searchbutton id": function () {
			//we are dealing with searchable edit field ,so we return the searchable button id
			if (SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_SEARCHABLE_EDIT_TESTMODE) != null) {
				var searchableButton = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_INPUT_BUTTON_MAIN);
				if (searchableButton != null) {
					var button = content.kitsManager.createAO(searchableButton, this.getID());
					if (button != null)
						return button.getID();
					return null;
				}
			}
			
		},

		// check if we have a list inside the cell
		"crm list in table": function () {
			if (SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_LIST_TESTMODE) != null)
				return true;
		},

		"crm drop down menu in table": function () {
			// check if we have a drop down menu inside the cell
			if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_HEADER_CELL_FILTERABLE))
				return true;
		},

		"inner cell select id": function () {
			var elem = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_LINK);
			if (elem && SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_IMAGE_TESTMODE)) {
				var link = content.kitsManager.createAO(elem, this.getID());
				if (link != null)
					return link.getID();
				return null;
			}
			return SAPTableCellBehavior._attrs["inner cell select id"].call(this);
		},
	},

	_methods: {
		"SET_CELL_IF_CRM_LIST": function (msg, resultCallback) {
			if (SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_LIST_TESTMODE) != null) {
				var listInput = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_INPUT_MAIN);
				//create new AO for passing the listInput id to replay the selection of items in the list
				if (listInput != null) {
					var itemAO = content.kitsManager.createAO(listInput, this._parentID);
					if (itemAO != null)
						msg._data.WEB_PN_ID = itemAO.getID();
				}
			}
			resultCallback(msg);
		},

		"GET_CRM_TABLE_CELL_SELECT_ITEM_ID": function (msg, resultCallback) {
			var cellData = msg._data["webdynpro list selected item"];
			if (cellData) {
				var selectItem = this._getTableCellSelectItem(cellData);
				if (selectItem != null) {
					var itemAO = content.kitsManager.createAO(selectItem, this.getID());
					if (itemAO != null) {
						msg._data.WEB_PN_ID = itemAO.getID();
					}
				}
			}
			resultCallback(msg);
			return;
		}
	},

	_helpers: {
		_getTableCellSelectItem: function (bstrItem) {
			//filtering selectable  elements from cell
			var vecOfElements = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_CELL_ELEMENTS_TESTMODE);
			if (!bstrItem || !vecOfElements || vecOfElements.length == 0)
				return null;

			var numOfElements = vecOfElements.length;
			bstrItem = bstrItem.trim();
			var index = bstrItem.indexOf("#");
			var elem;
			if (index == 0) { //got an index of an item
				var bstrIndex = bstrItem.substr(1);
				index = parseInt(bstrIndex);//gets zero value if was zero-String or non-numeric-String
				if ((isNaN(index) || index == 0) && (bstrIndex != "0"))//in case we have an item that looks like: <#itemName>
					index = -1;//so we'll get to the next if
				//we got an index (can be zero also)
				if ((index > 0 && numOfElements > index) || (index == 0)) {
					elem = SapConfigurationUtil.getElementOfCollection(vecOfElements[index], SAP_SPECIFIER_ENUM.SAP_CRM_LINK);
					if (!elem)
						elem = SapConfigurationUtil.getElementOfCollection(vecOfElements[index], SAP_SPECIFIER_ENUM.SAP_CRM_TEXTVIEW_MAIN);
					return elem;
				}
			}
			if (index != 0) {
				//go through the elements
				for (let i = 0; i < numOfElements; i++) {
					var bstrItemTitle = vecOfElements[i].innerText;
					if (!bstrItemTitle) {
						// if we are dealing with image in the cell ,we try to get the image title.
						var image = SapConfigurationUtil.getElementOfCollection(vecOfElements[i], SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_IMAGE);
						if (image != null)
							bstrItemTitle = image.title;

						if (!bstrItemTitle)
							continue;
					}
					bstrItemTitle = bstrItemTitle.trim();
					if (bstrItem.toLowerCase() == bstrItemTitle.toLowerCase()) {
						elem = SapConfigurationUtil.getElementOfCollection(vecOfElements[i], SAP_SPECIFIER_ENUM.SAP_CRM_LINK);
						if (!elem)
							elem = SapConfigurationUtil.getElementOfCollection(vecOfElements[i], SAP_SPECIFIER_ENUM.SAP_CRM_TEXTVIEW_MAIN);
						return elem;
					}
				}
			}
			return null;
		}
	}
};
