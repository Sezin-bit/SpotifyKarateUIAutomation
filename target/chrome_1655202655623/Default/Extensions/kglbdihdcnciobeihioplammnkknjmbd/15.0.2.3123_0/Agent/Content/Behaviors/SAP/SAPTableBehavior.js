var SAPTableBehavior = {
	TABLE_ROW_OR_COL_INVALID: -100,
	TABLE_CELL_STRING_NOT_FIND: -101,
	_micclass: ["SAPTable"],

	_attrs: {
		"micclass": function () {
			return "SAPTable";
		},

		"title": function () {
			return this._getTitle();
		},

		"sap column": function (msg) {
			//It seems this function is wrong. 
			//Could test it when others are ready.
			return this._getColumnTitle(msg);
		},

		"cell id": function (msg) {
			return this._getCellId(msg);
		},

		"sap searchbutton id": function () {
			return SAPUtils.findSearchButton(this, true).getID();
		},

		"highlight source index": function () {
			var tmpElement = this._elem;
			var parentElement = null;
			var sourceIndex;

			while (tmpElement != null) {
				parentElement = tmpElement.offsetParent;
				if (!parentElement)
					return "";

				if (SapConfigurationUtil.isElementOfSpecifier(tmpElement, SAP_SPECIFIER_ENUM.SAPSP_TABLE_MAIN)) {
					//Chrome objects does not have the source Index,
					//To do
					//It seems this attribute does not been used. Leave it here.
					return parentElement.sourceIndex;
				}
				tmpElement = pParentElement;
			}

			return sourceIndex;
		},

		"findrowbycellcontent": function (msg) {
			return this._queryRowsByCellContent(msg);
		},

		"getcelldataex": function (msg) {
			return this._queryCellDataByCellContent(msg);
		},

		"sap web component name": function () {
			return SAPUtils.getComponentName(this._elem, this);
		},

		"sap web component runtime ID": function () {
			return SAPUtils.getComponentRuntimeID(this._elem, this);
		}
	},


	_methods: {
		"GET_TABLE_DATA": function (msg, resultCallback) {
			//we have to write this function
			this._getTableData(msg);
			resultCallback(msg);
		},

		"SET_CELL_IF_RADIO_BUTTON": function (msg, resultCallback) {
			this._setCellRdBtnOrChkBx(msg);
			resultCallback(msg);
		}
	},

	_eventHandler: function (recorder, ev) {
		//To do 
		// this._logger.trace('SAPListButton._eventHandler: Received recordable event: ' + ev.type);
		// if (ContentUtils.isTouchEnabled())
		// 	return this._eventHandlerTouchEnabled.call(this._elem, recorder, ev);
		if (ev.type == "mousedown" || ev.type == "mouseup")
			return false;
		
		var params = ev.params ? ev.params : { event: 'on' + ev.type };	
		var index = {};
		var element = ev.target;
		if (element == null)
			return false;
		var cellElement = this._getCellIndexByElement(element, index);
		if (cellElement != null && index.row && index.col) {
			// override the cell index and set the object id and micclass to be the sapTable
			//To do Need to check "assign id action" whether is right or not
			//params["id"] = this.getID();
			params["mic class"] = Util.getMicClass(this);
			params["row"] = index.row;
			params["col"] = index.col;

			var ao = SAPKit.createAO(cellElement, this._parentID, null, null,true);
			if (ao != null) {
				var value = ao.GetAttrSync("inner cell data");
				//check if we have a radio button or a checkbox inside the cell and get the data we need.
				//if the method returns false it means we don't need to record this operation
				if (!this._isRecordRdBtnOrChckBxInCell(cellElement, params))
					return false;
				params["inner cell data"] = value;
			}
			else {
				this._logger.error('SAPTableBehavior._eventHandler: Error! ao == null ');
				return false;
			}

			//if ICWCTable send this information in WebInfo so we know not to record a SelectCell in such a case
			//at all just record an activity on the table like SetCellData. Unless the cell contains a link, in which 
			// case we want to record
			var link = element;

			//insert an indication if we are dealing with CRM searchable edit for recording OpenPossibleEntries	
			if (SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAP_CRM_SEARCHABLE_EDIT_TESTMODE) != null)
				params["sap is crm edit"] = true;

			//insert an indication if we are dealing with CRM header cell opening dropdown menu.	
			if (SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_HEADER_CELL_FILTERABLE) != null)
				params["CRM filterable header in table"] = true;

			// if we are dealing with cell containing several items we insert here the item name or index that
			// we should record in SelectItemInCell
			if (SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_CELL_ELEMENTS_TESTMODE) != null) {
				var tableCell = SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_CELL);
				var vectorOfElements = SapConfigurationUtil.filterCollection(tableCell, SAP_SPECIFIER_ENUM.SAP_CRM_LINK);
				if (tableCell != null && vectorOfElements.length > 0) {
					vectorOfElements = SapConfigurationUtil.filterCollection(tableCell, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_CELL_ELEMENTS_TESTMODE);
					if (vectorOfElements.length > 1) {
						var elemName = this._getCellItemName(element);
						if (elemName != null)
							params["webdynpro list selected item"] = elemName;
					}
				}
			}

			if ((link == null || SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAP_CRM_LIST_TESTMODE)) &&
				!SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAP_CRM_IMAGE_TESTMODE) &&
				!SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAP_CRM_TEXTVIEW_TESTMODE)) {
				// Not a link, ignore if in ICWC
				var elemTable = SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAP_ICWC_TABLE);
				if (elemTable == null)
					elemTable = SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_TESTMODE);
				if (elemTable != null)
					params["sap is icwc table"] = true;

				var isICWCTable = SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_TESTMODE) != null;
				params["sap is icwc table"] = isICWCTable;
			}

			//Handle SAPSearchButton click event, do not record this event.
			if (ev.params != null) {
				ev.params = params;
				return true;
			}

			recorder.sendRecordEvent(this, ev, params);
			return true;
		}
		return false;

	},

	_helpers: {
		isLearnable: Util.alwaysTrue,

		UseEventConfiguration: function (event) {
			return event.type !== "blur";
		},

		_getTitle: function () {
			return "";
		},

		_getColumnTitle: function (msg) {
			var col = msg._data.col;
			if (col < 1)
				return;
			var cellVector = [];
			var size = _getColumnTitleCells(cellVector);
			if (size > (col - 1)) {
				return cellVector[col - 1].GetAttrSync(PN_TEXT);
			}

			return "";
		},

		_getColumnTitleCells: function (vCellList) {
			var cellList;
			var rowList = this._getRows();
			var rowCount = rowList != null ? rowList.length : 0;

			var cellListSize = 0;

			if (rowCount > 0) {
				var count = (rowCount > 3 ? 3 : rowCount);

				for (let i = 0; i < count; i++) {
					var curRow = rowList[i];
					cellList = this._getCells(curRow);
					var curCell = cellList[0];
					cellListSize = (cellList != null) ? cellList.length : 0;
					if (cellListSize > 0) {
						var elem = curCell;
						if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_TABLE_COLTITLE))
							break;
						else
							cellList = [];
					}
				}
			}
			return cellListSize;
		},

		_getCellId: function (msg) {
			var rowColObj = {};
			if (!this._parseIndexAttr(msg, rowColObj))
				return null;
			var rowID = rowColObj.rowID;
			var colID = rowColObj.colID;
			// When the coordinates are (0;0) --> return the table id
			if (rowID == 0 && colID == 0) {
				return this.getID();
			}

			var id = msg._to;
			// If the column is 0 --> return the row id
			if (colID == 0) {
				var row = this._getRow(rowID, {}, false);
				id.object = content.kitsManager.createAO(row, this._parentID).getID().object;
				return id;
			}

			var cell = this._getCell(rowID, colID);
			if (cell == null)
				return null;

			id.object = SAPKit.createAO(cell, this._parentID, null, null, true).getID().object;
			// return the correct cell id
			return id;
		},

		_parseIndexAttr: function (msg, rowColObj) {
			//TO do, need check the param passed.
			var rowNameOrId = msg._data["cell id"][0][0];
			var colNameOrId = msg._data["cell id"][0][1];

			// get the column from the string or by the number
			if (typeof colNameOrId == "string") {
				var cellVector;
				var size = this._getColumnTitle(cellVector);

				var i;
				for (i = 0; i < size; i++) {
					if (cellVector[i].GetAttrSync("text").trim() == colNameOrId.trim()) // trim spaces
						break;
				}

				if (i >= size)
					return false;

				rowColObj.colID = i + 1;
			}
			else
				rowColObj.colID = colNameOrId;

			// get the row from the string or by the number
			if (typeof rowNameOrId == "string") {
				var cellList;
				var rowList = this._getRows();
				var size = (rowList != null) ? rowList.length : 0;
				var i;
				for (i = 0; i < size; i++) {
					var curRow = rowList[i];
					cellList = this._getCells(curRow);
					if ((cellList != null) && (cellList.length > 0)) {
						//Some misunderstanding.
						var curCell = cellList[0];
						var cellText = SAPKit.createAO(curCell, this._parentID, null, null,true).GetAttrSync("text");
						if (cellText.trim() == rowNameOrId.trim()) // trim spaces, case sensitive
							break;
					}
				}

				if (i >= size)
					return false;

				rowColObj.rowID = i + 1;
			}
			else
				rowColObj.rowID = rowNameOrId;

			return true;
		},

		_getRow: function (rowID, tmpColID, hasRowSelectorElement) {
			// Get the list of rows
			var rowList = this._getRows();
			var size = (rowList != null) ? rowList.length : 0;

			// Make sure the row number is valid
			if ((rowID <= 0) || (rowID > size))
				return "";

			// Get the row
			return rowList[rowID - 1];
		},

		_getCell: function (rowID, colID) {
			//The dom structure of NWBC WDA ITS table is special:
			//It row-selector cells (namely the first column) are separated in a dedicated table
			var rowSelectorElement;
			if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_ITS_NWBC_TABLE)) {
				//Check if row-selector cells existed, because some NWBC tables do not contain them		
				var parent = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_TABLE_PARENT, 6);
				if (parent) {
					var isWDARowSelector = false;
					var parentTableId, rowSelectorId;
					parentTableId = parent.id;
					rowSelectorId = parentTableId + "-rowselector-" + (rowID - 1).toString();

					// It is only applied for nwbc table's row selector cell. WDA table's row selector should be treated as normal cell.
					rowSelectorElement = document.getElementById(rowSelectorId);
					if (!rowSelectorElement) {
						// For WDA7.5, there exists such a table that row-selector cells are separated in a dedicated table
						var leftTable = SapConfigurationUtil.getElementOfCollection(parent, SAP_SPECIFIER_ENUM.SAP_WDA_ITS_TABLE_LEFT);
						if (leftTable) {
							rowSelectorElement = SapConfigurationUtil.getElementOfCollection(leftTable, SAP_SPECIFIER_ENUM.SAP_WDA_ITS_TABLE_ROWSELECTOR);
							isWDARowSelector = true;
						}
					}
					//if row-selector cells existed
					if (rowSelectorElement) {
						colID--;

						//if the target cell is row-selector cell
						// WDA row selector cell will use normal method to get
						if (colID == 0 && !isWDARowSelector) {
							//table cell or table row ?
							//TO do
							return rowSelectorElement;
						}
					}
				}
			}

			// Get the row
			var tmpColID = { colID: colID };
			var row = this._getRow(rowID, tmpColID, rowSelectorElement != null ? true : false);
			if (!row)
				return null;
			colID = tmpColID.colID;

			var cellList = this._getCells(row);
			var size = (cellList != null) ? cellList.length : 0;
			// Make sure the column number is valid
			if ((colID <= 0) || (colID > size))
				return null;

			// Get the cell 
			return cellList[colID - 1];
		},

		_getRowsCount: function () {
			return this._getRows().length;
		},

		//this method receives a value, a column name and a starting line. it returns the first index of row 
		//whose cell value in the given column equal the given value. starting the search at the given 
		//starting row default starting row is 1.
		//communicate with package -- zero based, In -- one based
		_queryRowsByCellContent: function (msg) {
			//extract the data
			var colVal = msg._data["FindRowByCellContent"][0][0];
			var cellVal = msg._data["FindRowByCellContent"][0][1];
			var rowIndex = msg._data["FindRowByCellContent"][0][2];

			if (colVal == null || cellVal == null || rowIndex == null)
				return null;

			//get the rows of the table and check that the starting row is valid
			var rowList, cellList;
			//var filterStruct = SAPUtils.createFilter();
			//rowList = this._getDirectChildren(filterStruct);
			rowList = this._getRows();
			if (!rowList)
				return null;

			if (rowIndex < 1) {
				//the starting row is not valid - return TABLE_ROW_OR_COL_INVALID!
				return SAPTableBehavior.TABLE_ROW_OR_COL_INVALID;
			}

			var curRow = rowList[0];
			cellList = this._getCells(curRow);
			if (!cellList)
				return null;

			var cell = cellList[0];
			var isTitlesRow;
			isTitlesRow = this._isRowTitles(cell);
			if (isTitlesRow == false) {
				//its not a title row, its a data row. check it too!
				rowIndex -= 1;
			}

			//check that the column is valid. (check start row column count) 
			var rowListSize = (rowList != null) ? rowList.length : 0;
			if (rowIndex >= rowListSize) {
				//the starting row is not valid - return TABLE_ROW_OR_COL_INVALID!
				return SAPTableBehavior.TABLE_ROW_OR_COL_INVALID;
			}

			var child = rowList[rowIndex];
			var childCount = this._getCells(child).length;
			if (childCount == 0)
				return null;

			if (colVal < 1 || colVal > childCount) {
				//invalid column number - return TABLE_ROW_OR_COL_INVALID.
				return SAPTableBehavior.TABLE_ROW_OR_COL_INVALID;
			}

			//loop over the rows - in each, get the cell in the column index and compare the cell's value to given value
			for (; rowIndex < rowListSize; rowIndex++) {
				//extract the cells of the current row
				var row = rowList[rowIndex];
				var curCellList = this._getCells(row);
				var curCellListSize = (curCellList != null) ? curCellList.length : 0;
				//extract the cell from the list of cells
				//compare the current cell value with the given value
				if (colVal <= curCellListSize) {
					//when we ask the table for its list of rows, we get EVERY row, including rows that
					//are not part of the tables data. these rows don't always have the expected number
					//of cells. therefore, we must check it before the actual comparison!
					var col = curCellList[colVal - 1];
					var colAO = SAPKit.createAO(col, this._parentID, null, null,true);
					var colText = colAO.GetAttrSync("inner cell data");
					if (cellVal == colText) {
						//we have a match
						// Allow derived table classes to give their "correct" row number
						rowIndex = this._fixRowNumber(col, rowIndex);
						return rowIndex + (isTitlesRow ? 0 : 1);
					}
				}
			}
			return -1; //did not find!	
		},

		_isRowTitles: function (cell) {
			return true;
		},

		_fixRowNumber: function (cell, rowIndex) {
			return rowIndex;
		},

		_isRecordRdBtnOrChckBxInCell: function (elem, params) {
			return true;
		},

		_queryCellDataByCellContent: function (msg) {
			//extract the data
			var colVal = msg._data["GetCellDataEx"][0][0];
			var cellVal = msg._data["GetCellDataEx"][0][1];
			var rowIndex = msg._data["GetCellDataEx"][0][2];
			var destColVal = msg._data["GetCellDataEx"][0][3];

			if (colVal == null || cellVal == null || rowIndex == null || destColVal == null)
				return null;

			//get the rows of the table and check that the starting row is valid
			var rowList, cellList;
			rowList = this._getRows();
			if (!rowList)
				return null;

			if (rowIndex < 1) {
				//the starting row is not valid - return TABLE_ROW_OR_COL_INVALID!
				return SAPTableBehavior.TABLE_ROW_OR_COL_INVALID;
			}

			var curRow = rowList[0];
			cellList = this._getCells(curRow);
			if (!cellList)
				return null;

			var cell = cellList[0];
			var isTitlesRow;
			isTitlesRow = this._isRowTitles(cell);
			if (isTitlesRow == false) {
				//its not a title row, its a data row. check it too!
				rowIndex -= 1;
			}

			//check that the column is valid. (check start row column count) 
			var rowListSize = (rowList != null) ? rowList.length : 0;
			if (rowIndex >= rowListSize) {
				//the starting row is not valid - return TABLE_ROW_OR_COL_INVALID!
				return SAPTableBehavior.TABLE_ROW_OR_COL_INVALID;
			}

			var child = rowList[rowIndex];
			var childCount = this._getCells().length;
			if (childCount == 0)
				return null;

			//check that the column is valid. (check start row column count) 
			if ((colVal < 1 || colVal > childCount) ||
				(destColVal < 1 || destColVal > childCount)) {
				//invalid column number - return TABLE_ROW_OR_COL_INVALID.
				return SAPTableBehavior.TABLE_ROW_OR_COL_INVALID;
			}

			//loop over the rows - in each, get the cell in the column index and compare the cell's value to given value
			for (; rowIndex < rowListSize; rowIndex++) {
				//extract the cells of the current row
				var row = rowList[rowIndex];
				var curCellList = this._getCells(row);
				var curCellListSize = (curCellList != null) ? curCellList.length : 0;
				//extract the cell from the list of cells
				//compare the current cell value with the given value
				if (colVal <= curCellListSize) {
					//when we ask the table for its list of rows, we get EVERY row, including rows that
					//are not part of the tables data. these rows don't always have the expected number
					//of cells. therefore, we must check it before the actual comparison!
					var col = curCellList[colVal - 1];
					var colAO = SAPKit.createAO(col, this._parentID, null, null,true);
					var colText = colAO.GetAttrSync("inner cell data");
					//Use text property instead "inner cell data" which is used in IE.
					if (cellVal == colText) {
						if (destColVal <= curCellListSize) {
							var destCol = curCellList[destColVal - 1];
							if (!destCol)
								return null;
							var destColAO = SAPKit.createAO(destCol, this._parentID, null, null,true);
							return destColAO.GetAttrSync("inner cell data");
						}
					}
				}
			}
			return SAPTableBehavior.TABLE_CELL_STRING_NOT_FIND;
		},

		_getCellIndexByElement: function (elem, index) {
			if (elem == null || index == null)
				return null;

			var cellElement;
			var element = elem;
			var sapCell = null;
			while (element != null) {
				// get pointer to Cell and save it 
				if (element.tagname.toLowerCase() == "td")
					sapCell = cell;

				// if this table - the SAPTable - break
				if (element.tagname.toLowerCase() == "table" && element == this._elem)
					break;

				element = element.parentElement;
			}

			// if pParentElement==NULL - parent table not found - this is error
			if (sapCell != null && element != null) {
				var row = -1, col = -1;
				col = sapCell.cellIndex;
				cellElement = sapCell;
				var rowElement = cellElement.parentElement;
				while (rowElement != null) {
					var curRow = rowElement;
					if (rowElement.tagname.toLowerCase() == "tr") {
						row = rowElement.rowIndex;
						break;
					}
					rowElement = rowElement.parentElement;
				}
				// !!! indexes used in script 1-based, in MSHTML 0-based 
				if (row != -1 && col != -1) {
					index.row = row + 1;
					index.col = col + 1;
				}
			}

			return cellElement;
		},

		_getCellItemName: function (element) {
			var itemName = element.innerText;
			if (!itemName)
				itemName == element.title;

			if (!!itemName) {
				return itemName.trim();
			}

			// if there is no innertext or title to cell item than we return it's order in the cell
			var itemTestmode = SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAP_CRM_TESTMODE_CONTAINER, 4);
			var itemOuterHtml;
			if (itemTestmode != null)
				itemOuterHtml = pItemTestmode.outerHTML;
			var cell = SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_CELL);
			var vectorOfElements = SapConfigurationUtil.filterCollection(cell, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_CELL_ELEMENTS_TESTMODE);
			var vectorSize = vectorOfElements.length;
			var outerHtml;
			for (let i = 0; i < vectorSize; i++) {
				outerHtml = vectorOfElements[i].outerHTML;
				if (!!outerHtml && outerHtml == itemOuterHtml) {
					return "#" + i.toString();
				}
			}
			return "";
		},

		//Invoke method
		_getTableData: function (msg) {
			var childrenVector = this._getRows();
			if (childrenVector) {
				var rows = 0, maxcol = 0;
				rows = childrenVector.length;
				for (let i = 0; i < rows; i++) {
					var curObj = childrenVector[i];
					if (curObj == null)
						continue;

					// If the row contains Role attribute, it will be identified as WebAcc row.
					// However, WebAcc row's GetDirectChildren method is different from the WebRow's.
					// What SAPTable needs is the WebRow's method.
					var cellList = this._getCells(curObj);
					maxcol = cellList.length > maxcol ? cellList.length : maxcol;
					var cellValue = [[]];
					for (let j = 0; j < cellList.length; j++) {
						var cell = cellList[j];
						if (cell == null)
							continue;

						var cellAO = SAPKit.createAO(cell, this._parentID, null, null,true);
						var cellText = cellAO.GetAttrSync("inner cell data");
						if (cellText != null)
						{
							//For chrome, the cellText contains "&nbsp;" which will not matches " " on IE when comparing checkpoint
							//replace "&nbsp;" with " " here for SAPTable only as Web leaves it as a limitation.
							cellText = SAPUtils.replaceNbspToSpace(cellText);
							cellValue[0].push(cellText);
						}
					}

					msg._data["WEB_PN_ROW_DATA" + (i + 1)] = cellValue;
				}
				msg._data["row"] = rows;
				msg._data.WEB_AN_MAX_COLUMN = maxcol;
			}

			return;
		},

		// We find the HTML element for performing the operation and either click on it here or
		// return it to the package side so the package clicks on it (decision as to which way to go is based on what works ;o))
		// Returns: true if we handled the case or false if this is not a cell containing a relevant object.
		_setCellRdBtnOrChkBx: function (msg) {
			var pnID = msg._data.WEB_PN_ID;
			var element;
			if (pnID) {
				element = content.rtidManager.GetElementFromID(pnID.object);
			}

			if (!element) {
				return;
			}

			var isON = false;
			//we check that we received either "ON" or "OFF" as a parameter
			var cellData = msg._data["inner cell data"];
			if (cellData) {
				if (cellData == "ON" || cellData == "OFF") {
					isON = cellData == "ON";
				}
				else {
					ErrorReporter.ThrowInvalidArg();
					return false;
				}
			}
			else {
				ErrorReporter.ThrowInvalidArg();
				return false;
			}

			var checkBoxImage = SapConfigurationUtil.getElementOfCollection(element, SAP_SPECIFIER_ENUM.SAPWD_CHECKBOX_IMG_A1S);
			if (checkBoxImage == null)
				return false;

			//we get the child element in order to find the 'checked' property
			var child = SapConfigurationUtil.GetElementOfCollection(element, SAP_SPECIFIER_ENUM.SAPWD_CHECKBOX_MAIN);
			if (child == null)
				return false;

			var optionButton = child;
			var isChecked = false;
			if (optionButton != null && optionButton.tagname.toLowerCase() == "input")
				isChecked = optionButton.checked;

			//if the checkbox is checked and we need to set it "OFF" or the checkbox is not checked and we need to set it on, we need to click.
			if ((isChecked && !isON) || (!isChecked && isON))
				checkBoxImage.click();

			return true;
		},

		_convertRowNumberToZeroBased: function (number) {
			return number - 1;
		},
	}
};

var SAPICWCTableBehavior = {
	_attrs: {
		"rows": function () {
			//In order to get the footer we need a larger container than the regular ICWCTable, which will
			//include the foot of the table as well
			var container = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_ICWC_CONTAINING_TABLE);
			if (container != null) {
				var button = SapConfigurationUtil.getElementOfCollection(container, SAP_SPECIFIER_ENUM.SAPSP_ICWC_PAGE_UP);
				if (!button) // if not succeeded the button was disabled try with button down.
					button = SapConfigurationUtil.getElementOfCollection(container, SAP_SPECIFIER_ENUM.SAPSP_ICWC_PAGE_DOWN);

				if (!button) {
					// if no button is enabled find number of rr's in the current page
					var rowNumElements = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_ROW_NUMBER);
					//fill RowNumElements vector with all the "rr" items currently displayed
					return rowNumElements.length;
				}

				// Take from the onclick string the number
				// extract number of rows to AttrVal
				var clickCmd = SAPUtils.extractDataFromLsDataStr(button.outerHTML, "onclick=\"", '"');
				if (!clickCmd) {
					return 0x80004005;
				}
				var end = clickCmd.lastIndexOf(",P");
				if (end == -1)
					return 0x80004005;
				clickCmd = clickCmd.substr(0, end);
				var begin = clickCmd.lastIndexOf(',');
				if (begin == -1)
					return 0x80004005;
				var numStr = clickCmd.substr(begin + 1, onClickLength - begin - 1);
				var numRows = parseInt(numStr);
				if (!isNaN(numRows)) {
					return numRows;
				}
			}
			return 0x80004005;
		},
	},

	_methods: {
		"SET_CELL_IF_RADIO_BUTTON": function (msg, resultCallback) {
			this._setCellRdBtnOrChkBx(msg);
			resultCallback(msg);
		},

		"NAVIGATE_TO_ICWC_TABLE": function (msg, resultCallback) {
			this._navigateIfNeeded(msg);
			resultCallback(msg);
		}
	},

	_helpers: {
		isLearnable: Util.alwaysTrue,

		_isRowTitles: function (cell) {
			return true;
		},

		_fixRowNumber: function (cell, rowIndex) {
			var number = SAPUtils.getContainingRowNumber(cell);
			if (number != null) {
				number = this._convertRowNumberToZeroBased(number);
				return number;  // we communicate with package on zero-based.
			}
			return rowIndex; // failed return the initial value
		},

		_isRecordRdBtnOrChckBxInCell: function (elem, params) {
			var child = SapConfigurationUtil.getElementOfCollection(elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_RADIOGROUP);
			//Does not be used , comment it first.
			//var exist = false;
			if (child) {
				params["ICWC radiobutton"] = "ON";
				//exist = true;
			}
			else {
				//if we don't have a radio button check if we have a checkbox
				child = SapConfigurationUtil.getElementOfCollection(elem, SAP_SPECIFIER_ENUM.SAPSP_CHECKBOX_ICWC1);
				if (child) {
					//exist = true;
					var attrVal;
					//check which type of a checkbox we have
					if (SapConfigurationUtil.isElementOfSpecifier(child, SAP_SPECIFIER_ENUM.SAP_ICWC_CHKBX_IN_TABLE_AS_RDBTN)) {
						//in  case of a "radio button" checkbox
						//if this is a checkbox that behaves as a radio button, we only record the click if it's not checked yet.
						if (SapConfigurationUtil.isElementOfSpecifier(child, SAP_SPECIFIER_ENUM.SAPSP_CHECKBOX_ICWC_CHECKED))
							return false;
						else
							attrVal = "ON";
					}
					else { //this checkbox acts as a regular checkbox
						attrVal = SapConfigurationUtil.IsElementOfSpecifier(child, SAP_SPECIFIER_ENUM.SAPSP_CHECKBOX_ICWC_CHECKED) ? "OFF" : "ON";
					}
					params["ICWC checkbox"] = attrVal;
				}
			}
			return true;
		},

		_getCellIndexByElement: function (elem, index) {
			if (!elem)
				return null;

			// change row number according to the rr value
			var elemRow = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_ROW_NUMBER);
			if (!elemRow)
				return null;

			var row = SAPUtils.getRowNumber(elemRow);
			if (row == null)
				return null;

			//return the Col number 
			var cellElement = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_TABLE_CELL);
			if (cellElement.tagname.toLowerCase() != "td" && cellElement.tagname.toLowerCase() != "th")
				return null;
			var col = cellElement.cellIndex;

			// !!! indexes used in script 1-based, in MSHTML 0-based 
			if (row != null && col != null) {
				index.row = row;
				index.col = col + 1;
			}
			else {
				return null;
			}

			return cellElement;
		},

		_getRow: function (rowID, tmpColID, hasRowSelectorElement) {
			//find the row according to the rr property
			var rowNumElements = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_ROW_NUMBER);
			var firstRow = -1;
			var curRow = -1;
			var rowsSize = rowNumElements.length;
			if (rowsSize == 0)
				return null;

			// check if the first row contains rr attribute and is not a header row
			// for header row rr is 0 or -1
			// for data row rr is 1..N for data row or 0 for empty data row
			firstRow = SAPUtils.getRowNumber(rowNumElements[0]);
			if (firstRow > 0 && rowID == 0) {
				//If firstRow > 0 and rowID=0, it will come here
				//The process for case GetCellData(header,col), header <tr> doesn't contain rr attribute
				// and header row is not contined in RowNumElements
				var rowList = this._getRows();
				var size = rowList != null ? rowList.length : 0;

				//The first <tr> with no rr attribute, get the header row
				if (size == rowsSize + 1) {
					// Get the row
					return rowList[rowID];
				}
				return null;
			}

			var targetRow = rowID;
			var offsetIndex = 1;
			if (firstRow > 0) offsetIndex = 0;

			//The process for case GetCellData(row,col),  header <tr> contains rr=0 or -1 or doesn't contain rr attribute	
			if (rowID == 0) // for rowID = 0 get info from the first row
			{
				curRow = 0;
				targetRow = 0;
			}
			else {
				if (rowsSize <= offsetIndex) return null;
				firstRow = SAPUtils.getRowNumber(rowNumElements[offsetIndex]);
				if (firstRow == null ||
					rowID < firstRow ||
					(rowID - firstRow + offsetIndex) >= rowsSize) {
					return null;
				}
				curRow = SAPUtils.getRowNumber(rowNumElements[rowID - firstRow + offsetIndex]);
				if (curRow == null)	// initialize curRow
					return null;
				else // convert rowID to visible row index
					targetRow = rowID - firstRow + offsetIndex;
			}

			if (curRow == rowID) // Found the correct row
			{
				return rowNumElements[targetRow];
			}

			return null;
		},

		_initialNav: function (direction, specifier, msg, element) {
			msg._data["ICWC navigate up"] = direction;
			var button = SapConfigurationUtil.getElementOfCollection(element, specifier);
			var ao = content.kitsManager.createAO(button, this._parentID);
			if (ao != null)
				msg._data.WEB_PN_ID = ao.getID();
		},

		_initialNavigation: function (row, lastCurRow, lastRowInAllTables, msg, element) {
			var middle;
			var ret = false;
			if (row > lastCurRow) {
				middle = (lastRowInAllTables - lastCurRow) / 2 + lastCurRow;
				if (row < middle) // Navigate down to next page 
					msg._data["ICWC navigate up"] = false;
				else // First click on Bottom button, then navigate up
				{
					this._initialNav(true, SAP_SPECIFIER_ENUM.SAPSP_ICWC_BOTTOM, msg, element);
					ret = true;
				}
			}
			else // lRow < lastCurRow
			{
				middle = (lastCurRow / 2);
				if (row > middle)    // Navigate up to previous page
					msg._data["ICWC navigate up"] = true;
				else  // First click on Top button, then navigate down
				{
					this._initialNav(false, SAP_SPECIFIER_ENUM.SAPSP_ICWC_TOP, msg, element);
					ret = true;
				}
			}
			msg._data["sap value"] = false;
			return ret;
		},

		_navigateIfNeeded: function (msg) {
			//value S_OK when not navigating anymore
			msg.result = 0;
			var row = msg._data["row"];
			if (!row || row < 1) {
				msg.result = 0x80070057;
				return;
			}

			//fill RowNumElements vector with all the "rr" items
			var rowNumElements = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_ROW_NUMBER);
			if (!rowNumElements)
				return;

			var firstCurRow = SAPUtils.getRowNumber(rowNumElements[0]);
			var lastCurRow = SAPUtils.getRowNumber(rowNumElements[rowNumElements.length - 1]); // last and first rows in current page
			if (firstCurRow == null
				|| lastCurRow == null
				|| (row >= firstCurRow && row <= lastCurRow)) // lRow in current page, no need to navigate
				return;

			//In order to get the footer we need a larger container than the regular ICWCTable, which will
			//include the foot of the table as well
			var container = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_ICWC_CONTAINING_TABLE);
			if (!container)
				return;

			//In initial navigation decide whether the direction of navigation is up or down 
			//whether to start from the bottom or from top. PN_SAP_VALUE is true when we are 
			//in initial navigation.
			var val = msg._data["sap value"];
			if (val) {
				//Extract number of rows in total (including invisible tables) from the table from the right bottom corner
				var lastRowInAllTables = this._totalRowsFromTable(container, rowNumElements.length);
				if (lastRowInAllTables == 0)
					return;

				if (row > lastRowInAllTables) {
					msg.result = 0x80070057;
					return;
				}

				if (this._initialNavigation(row, lastCurRow, lastRowInAllTables, msg, container))
					return;
			}

			// After initial navigation, or when in initial navigation
			// not pressing on top or bottom buttons

			//in navigation check whether navigating up or down 
			var navigateUp = msg._data["ICWC navigate up"];
			var button;
			//find and click on the needed button and return S_FALSE
			if (navigateUp)
				button = SapConfigurationUtil.getElementOfCollection(container, SAP_SPECIFIER_ENUM.SAPSP_ICWC_PAGE_UP);
			else
				button = SapConfigurationUtil.getElementOfCollection(container, SAP_SPECIFIER_ENUM.SAPSP_ICWC_PAGE_DOWN);

			if (!button)
				return;

			//create new AO for passing the buttons id to replay the click
			var ao = content.kitsManager.createAO(button, this.getID());
			if (ao != null) {
				msg._data.WEB_PN_ID = ao.getID();
				msg.result = 1;
			}
			return;
		},

		// We find the HTML element for performing the operation and either click on it here or
		// return it to the package side so the package clicks on it (decision as to which way to go is based on what works ;o))
		// Returns: true if we handled the case or false if this is not a cell containing a relevant object.	
		_setCellRdBtnOrChkBx: function (msg) {
			var value = msg._data.WEB_PN_ID;
			var element;
			if (value) {
				element = content.rtidManager.GetElementFromID(value.object);
			}

			if (element == null) {
				ErrorReporter.ThrowInvalidArg();
				return;
			}

			var isON = false;
			//we check that we received either "ON" or "OFF" as a parameter
			var attrValCellData = msg._data["inner cell data"];
			if (attrValCellData) {
				if (attrValCellData == "ON" || attrValCellData == "OFF") {
					isON = attrValCellData == "ON";
				}
				else {
					ErrorReporter.ThrowInvalidArg();
					return;
				}
			}
			else {
				ErrorReporter.ThrowInvalidArg();
				return;
			}

			var child = SapConfigurationUtil.getElementOfCollection(element, SAP_SPECIFIER_ENUM.SAPSP_ICWC_RADIOGROUP);
			if (child != null) {
				if (isON) //if we found a radio button and we need to turn it "ON", we click on it.
				{
					// In this case sending the RTID to the package side fails (probably because it's a radio group) so we just click it and don't send a RTID
					child.click();
				}
				return;
			}

			//if we don't have a radio button check if we have a check-box
			child = SapConfigurationUtil.getElementOfCollection(element, SAP_SPECIFIER_ENUM.SAPSP_CHECKBOX_ICWC1);
			if (!child)
				return;
			//check which type of a check-box we have
			if (SapConfigurationUtil.isElementOfSpecifier(child, SAP_SPECIFIER_ENUM.SAP_ICWC_CHKBX_IN_TABLE_AS_RDBTN)) {
				//in  case of a "radio button" checkbox
				//if this is a checkbox that behaves as a radio button, we only replay the click if it's not checked yet.
				if (isON && !SapConfigurationUtil.isElementOfSpecifier(child, SAP_SPECIFIER_ENUM.SAPSP_CHECKBOX_ICWC_CHECKED)) //if it's already checked we do nothing.
				{
					//create new AO for passing the child id to replay the click
					var ao = content.kitsManager.createAO(child, this._parentID);
					if (ao != null)
						msg._data.WEB_PN_ID = ao.getID();
				}
				return;
			}

			var isChecked = SapConfigurationUtil.isElementOfSpecifier(child, SAP_SPECIFIER_ENUM.SAPSP_CHECKBOX_ICWC_CHECKED);
			//if the checkbox is checked and we need to set it "OFF" or the checkbox is not checked and we need to set it on, we need to click.
			if ((isChecked && !isON) || (!isChecked && isON)) {
				//create new AO for passing the child id to replay the click
				var ao = content.kitsManager.createAO(child, this._parentID);
				if (ao != null)
					msg._data.WEB_PN_ID = ao.getID();
			}

			return;
		},

		_totalRowsFromTable: function (element, rowsVisible) {
			var curPage = 0, lastPage = 0;
			var footer = SapConfigurationUtil.getElementOfCollection(element, SAP_SPECIFIER_ENUM.SAPSP_ICWC_TABLE_FOOTER);
			var txtFooter = footer.innerText;
			//the txt should have the format xx/xx
			var txtVec = txtFooter.split('/');
			if (txtVec.length == 2) {
				curPage = parseInt(txtVec[0]);
				lastPage = parseInt(txtVec[1]);
				if (!isNaN(curPage) && !isNaN(lastPage)) {
					return lastPage * rowsVisible;
				}
			}
			return 0;
		}
	}
};

var SAPWDATableBehavior = {
	_attrs: {

		"rows": function () {
			return this._getRowsNumber();
		},

		"cols": function () {
			return this._getColumnsNumber();
		},

		"crm drop down menu in table": function () {
			return this._isListInTable();
		},

		"wda object": function () {
			return true;
		},

		"findrowbycellcontent": function (msg) {
			return this._queryRowsByCellContent(msg);
		},

		"getcelldataex": function (msg) {
			return this._queryCellDataByCellContent(msg);
		},

		"name": function () {
			return this._getName();
		},

		"logical name": function () {
			return this._getName();
		},

		"title": function () {
			return this._getName();
		},

		"is nwbc div draw table": function () {
			return SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_NWBC_USERAREA_TABLE);
		},
	},

	_eventHandler: function (recorder, ev) {
		//To do 
		// this._logger.trace('SAPListButton._eventHandler: Received recordable event: ' + ev.type);
		// if (ContentUtils.isTouchEnabled())
		// 	return this._eventHandlerTouchEnabled.call(this._elem, recorder, ev);

		// Some WDA tables receive onmousedown event instead of onclick,
		// so we filter onmouseup only.
		// In addition, It will not record SelectCell if clicking editbox in the table.
		var element = ev.element ? ev.element : ev.target;
		var isEditBox = SapConfigurationUtil.isElementOfSpecifier(element, SAP_SPECIFIER_ENUM.SAP_WDA_EDITBOX);

		var eventName = ev.type;
		if ((eventName == "mouseup") ||
			((eventName == "mousedown") && isEditBox) ||
			(eventName == "keyup"))
			return false;

		var params = ev.params ? ev.params : { event: 'on' + ev.type };
		params["wda object"] = true;

		var index = {};
		var cellElement = this._getCellIndexByElement(element, index);
		if (!cellElement)
			return false;

		this._updateWebInfo(params, index.rowIndex, index.colIndex);

		var bIsRdBtnOrChkBxInCellObj = { bIsRdBtnOrChkBxInCell: false };
		//check if we have a radio button or a checkbox inside the cell and get the data we need.
		//if the method returns false it means we don't need to record  operation
		// for now the method always returns true, i.e record SetCellData or SelectCell
		if (!this._isRecordRdBtnOrChckBxInCell(element, cellElement, params, bIsRdBtnOrChkBxInCellObj))
			return false;

		var bIsRdBtnOrChkBxInCell = bIsRdBtnOrChkBxInCellObj.bIsRdBtnOrChkBxInCell;
		// If the target cell is a checkbox or radiobutton, it will not record if the event is onmousedown
		if (bIsRdBtnOrChkBxInCell && eventName == "mousedown")
			return false;

		// Here is different from IE, only click will be passed here, do not recrod click event if ev.params is not null which means
		// this method is applied by SAPSearchButton. Do not continue, return. By Allen Z
		// In order to avoid record twice (both mousedown and click events), 
		// it will replace onmousedown event as onclick and return if onclick events are received
		// except the element is editbox, checkbox or radiobutton
		if ((eventName == "click") &&
			!(isEditBox || bIsRdBtnOrChkBxInCell) &&
			ev.params != null) {
			ev.params = params;
			return false;
		}

		// Change it to click event, so that package side can record the event, package side does not record mousedown.
		if (ev.type == "mousedown" || ev.type == "mouseup") {
			params.event = 'onclick';
		}

		//SAPTable package will only record edit setcelldata action when event is blur;
		if (ev.type == "blur" && ev.target.tagName.toLowerCase() != "input") {
			return;
		}
		var cellAO = SAPKit.createAO(cellElement, this._parentID, null, null,true);
		var val = cellAO.GetAttrSync("inner cell data");
		if (val == null)
			return;

		if (this._checkIfOnlyBtnInCell(cellAO))
			return false;
		// we'll not get here if SAPSP_PORTAL_SEARCHBAR_BUTTON1 button in cell

		var isCalendar = false;
		if (SapConfigurationUtil.isElementOfSpecifier(element, SAP_SPECIFIER_ENUM.SAP_WDA_DATE_INPUT_IN_TABLE)) {
			isCalendar = SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAP_WDA_DATE_INPUT_TABLE_CONTAINIER, 5) != null;
		}
		params["sap is calendar in table"] = isCalendar;
		params["inner cell data"] = val;

		recorder.sendRecordEvent(this, ev, params);
		return true;

	},

	_methods: {
		"GET_TABLE_COLUMN": function (msg, resultCallback) {
            msg._data.col = this._getColumnsNumber();
            resultCallback(msg);
        }
	},


	_helpers: {
		isLearnable: Util.alwaysTrue,

		_getCell: function (rowID, colID) {
			//For NWBC table drawn by div
			if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_NWBC_USERAREA_TABLE)) {
				//Get userarea row No of the cell
				var topLeftImg = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_NWBC_DIVDRAW_TABLE_TOPLEFT_IMG);
				if (topLeftImg == null)
					return null;
				var topLeftImgId = topLeftImg.id;
				if (!topLeftImgId)
					return null;
				var topLeftImgUserareaRowNo = this._getNWBCUserareaRowNoByCellId(topLeftImgId);
				if (topLeftImgUserareaRowNo < 0)
					return null;
				var minUserareaColNo = this._getNWBCUserareaColumnNoByCellId(topLeftImgId);

				var userareaRowNo;
				if (rowID < 1)
					return null;
				else if (rowID == 1)
					userareaRowNo = topLeftImgUserareaRowNo + 1;
				else
					userareaRowNo = topLeftImgUserareaRowNo + lRow + 1;

				//Get max userarea column No of the table
				var topRightImg = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_NWBC_DIVDRAW_TABLE_TOPRIGHT_IMG);
				if (topRightImg == null)
					return null;
				var topRightImgId = topRightImg.id;
				if (topRightImgId == null)
					return null;
				var maxUserareaColNo = this._getNWBCUserareaColumnNoByCellId(topRightImgId);

				//get cell from row.
				var idPrefix = this._getNWBCUserareaCellIdPrefix(topLeftImgId);
				if (idPrefix == null)
					return null;

				//workaround for a SAP bug: sometime, the IMG in a horizontal line has the same html-id,
				//that is to say, html-id of top-left image and top-right image are the same.
				//So we should get max column No in userarea by other method 
				if (maxUserareaColNo == minUserareaColNo) {
					//get min/maz column No in userarea by search the left/right vertical line IMG in target row
					var itemElements = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_NWBC_DIVDRAW_TABLE_VERTICALLINE_IMG);
					var itemCount = itemElements.length;
					if (itemCount < 2)
						return null;
					maxUserareaColNo = -1;
					minUserareaColNo = -1;
					var sameRowCellIdPrefix = idPrefix + ":::" + userareaRowNo;
					for (let i = 0; i < itemCount; i++) {
						var verticalLineId = itemElements[i].id;
						if (verticalLineId.indexOf(sameRowCellIdPrefix) < 0)
							continue;
						var verticalLineColNo = this._getNWBCUserareaColumnNoByCellId(verticalLineId);
						if (minUserareaColNo < 0 || verticalLineColNo < minUserareaColNo)
							minUserareaColNo = verticalLineColNo;
						if (maxUserareaColNo < 0 || verticalLineColNo > maxUserareaColNo)
							maxUserareaColNo = verticalLineColNo;
					}
				}

				var foundCellNo = 0;
				for (let i = minUserareaColNo; i < maxUserareaColNo; i++) {
					var sameRowCellId = idPrefix + ":::" + userareaRowNo + ":" + i;
					var sameRowCellElement = document.getElementById(sameRowCellId);
					if (sameRowCellElement == null)
						continue;
					if (SapConfigurationUtil.isElementOfSpecifier(sameRowCellElement, SAP_SPECIFIER_ENUM.SAP_NWBC_DIVDRAW_TABLE_CELL)) {
						foundCellNo++;
						if (foundCellNo >= colID) {
							return sameRowCellElement;
						}
					}
				}
				return null;
			}

			return SAPTableBehavior._helpers._getCell.call(this, rowID, colID);
		},

		_getRow: function (rowID, tmpColID, hasRowSelectorElement) {
			// In WDA the header isn't a part of the table, so all the rows in the table are off by one.
			if (rowID > 0)
				rowID--;

			var tableContent;
			var tableLeft;
			// if the m_pElement is the content table, it should try again to get the whole table which also contains the left table.
			var rowElem = this._getParentTable();

			//if AUT has the same structure as following:
			// http://mydvmsap13.swinfra.net:8000/sap/bc/gui/sap/its/webgui?%7etransaction=DWDM&sap-client=001&sap-language=EN
			// http://mydvmsap13.swinfra.net:8000/sap/bc/webdynpro/sap/wdr_test_c_table?sap-client=001&sap-language=EN# 
			// https://labm3ftrnd12.swinfra.net:50001/sap/bc/ui2/flp#Action-PartnerTestMangement?VIEW_ID=THIRD_PARTY&STANDALONE_MODE=X
			var tableHeader = SapConfigurationUtil.getElementOfCollection(rowElem, SAP_SPECIFIER_ENUM.SAP_WDA_ITS_TABLE_HEADER);
			if (rowElem && tableHeader && rowID == 0) {
				if (hasRowSelectorElement) {
					tmpColID.colID += 1;
				}
				return this._getHeaderRow(rowElem, tmpColID, SAP_SPECIFIER_ENUM.SAP_WDA_ITS_TABLE_HEADER_LEFT);
			}

			var bRowSelector = this._getRowSelector() ? true : false;

			var specifier = SAP_SPECIFIER_ENUM.SAP_WDA_ITS_TABLE_CONTENT;
			var rowColCountsLeft = {};
			this._getSubLeftSize(rowColCountsLeft);
			var leftColCount = rowColCountsLeft.colCount;
			if (leftColCount != null && tmpColID.colID !=null) {
				// Whether the target is from left part.
				if ((tmpColID.colID < leftColCount) || (tmpColID.colID == leftColCount && !bRowSelector)) {
					if (bRowSelector)
						tmpColID.colID += 1;
					specifier = SAP_SPECIFIER_ENUM.SAP_WDA_ITS_TABLE_LEFT;
				}
				else if (bRowSelector) {
					tmpColID.colID -= (leftColCount - 1);
				}
				else
					tmpColID.colID -= leftColCount;
			}

			tableContent = SapConfigurationUtil.filterCollection(rowElem ? rowElem : this._elem, specifier);
			if (tableContent.length == 1) {
				//find the row according to the rr property
				var rowNumElements = SapConfigurationUtil.filterCollection(tableContent[0], SAP_SPECIFIER_ENUM.SAPSP_ICWC_ROW_NUMBER);
				var curRow = 0;
				var firstRow = SAPUtils.getRowNumber(rowNumElements[0]);
				if (firstRow != null && firstRow > 0 && rowID == 0) {
					//The process for case GetCellData(header,col), header <tr> doesn't contain rr attribute
					// and header row is not contined in RowNumElements
					var rowList = this._getRows();
					var size = (rowList != null) ? rowList.length : 0;

					//The header row is located in a separate table, so that there is only one row.
					//The first <tr> with no rr attribute, get the header row
					//If size == 1, the AUT has the same structure with following:
					// https://labm3ftrnd12.swinfra.net:50001/sap/bc/ui2/flp#Action-TPManagement?VIEW_ID=SMT_TPLN_MGNT&STANDALONE_MODE=X 
					// http://mydvmsap13.swinfra.net:8000/nwbc/Z_NWBC_TEST_ROLE/?sap-nwbc-node=0000000438&sap-nwbc-context=03HM33B030D633D533D233363134888AF70B77728E0F710D0E890FF2F771353036313635802B30303230C6A2C8C0C0D8CFDCD4C0D8C0C0D0C00000&sap-n=&sap-client=001&sap-language=EN 
					// http://mydvmsap13.swinfra.net:50200/irj/portal
					if (size == 1) {
						// Get the row
						return rowList[0];
					}

					return false;
				}

				if (rowNumElements.length == 0 || !firstRow
					|| rowID < firstRow || ((rowID - firstRow) >= rowNumElements.length)) // Out of bounds 
					return null;

				curRow = SAPUtils.getRowNumber(rowNumElements[rowID - firstRow]);
				if (curRow == null)
					return null;

				if (curRow == rowID) // Found the correct row
				{
					return rowNumElements[rowID - firstRow];
				}
			}
			return SAPICWCTableBehavior._helpers._getRow.call(this, rowID, {}, hasRowSelectorElement);
		},

		_getHeaderRow: function (rowElem, tmpColID, specifier) {
			//The process for case GetCellData(header,col), header <tr> doesn't contain rr attribute
			// and header row is not contined in RowNumElements
			var tableHeader = SapConfigurationUtil.getElementOfCollection(rowElem, specifier);
			if (tableHeader) {
				var tableContent = SapConfigurationUtil.getElementOfCollection(tableHeader, SAP_SPECIFIER_ENUM.SAP_WDA_ITS_NWBC_TABLE);
				if (tableContent) {
					var tmpTableHeader = content.kitsManager.createAO(tableContent, this._parentID);
					var rowList = tmpTableHeader._getRows();
					var size = (rowList != null) ? rowList.length : 0;

					//The header row is located in a separate table, so that there is only one row.
					//The first <tr> with no rr attribute, get the header row
					if (size == 1) {
						// Get the row
						var curRow = rowList[0];
						// Get the cells of the row
						var cellList = tmpTableHeader._getCells(curRow);
						var size = (cellList != null) ? cellList.length : 0;
						// Make sure the column number is valid
						if (tmpColID.colID <= 0)
							return null;

						if (tmpColID.colID > size) {
							//try to find it on next tr
							tmpColID.colID -= size;
							return this._getHeaderRow(rowElem, tmpColID, SAP_SPECIFIER_ENUM.SAP_WDA_ITS_TABLE_HEADER);
						}
						return curRow;
					}
				}
				else
					return null;
			}
			else if (specifier == SAP_SPECIFIER_ENUM.SAP_WDA_ITS_TABLE_HEADER) {
				return null;
			}

			return this._getHeaderRow(rowElem, tmpColID, SAP_SPECIFIER_ENUM.SAP_WDA_ITS_TABLE_HEADER);

		},

		_getRowSelector: function () {
			var parent = this._getParentTable();
			if (parent) {
				// Some WDA tables also has row selector, it should take it into account.
				return SapConfigurationUtil.getElementOfCollection(parent, SAP_SPECIFIER_ENUM.SAP_WDA_ITS_TABLE_ROWSELECTOR);
			}
			return null;
		},

		_getRowsNumber: function () {
			var parentTable = this._getParentTable();
			if (null == parentTable)
				return this._getRowsCount();

			var lsData = parentTable.getAttribute("lsdata");

			if (lsData) {
				var idx = this._extractTableDataFromLsData(lsData, "2:", ",3:");
				var idxNum = parseInt(idx);
				if (!isNaN(idxNum) && idxNum != -1) {
					var rowofWebTable = this._getRowsCount();
					var rowOfSAPTable = idxNum + 1; 
					if (rowofWebTable > rowOfSAPTable)
						return rowofWebTable;
					return rowOfSAPTable;
				}

				var tableContent = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_ITS_TABLE_CONTENT);
				if (tableContent) {
					var segrc = tableContent.getAttribute("segrc");
					if (!segrc)
						return 0;

					var row = parseInt(segrc);
					return isNaN(row) ? 0 : row;
				}
			}
			var rowColCounts = {};
			this._getSubContentSize(rowColCounts);
			var rowCount = rowColCounts.rowCount;
			if (rowCount)
				return rowCount + 1;	// plus 1 header row.

			return 0;
		},

		_getParentTable: function () {
			return SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_TABLE_PARENT, 8);
		},

		//WITable method
		_getColsCount: function (rowID = 0) {
			var table = this._elem;
			var rowsVector = this._getRows();
			if (rowID >= rowsVector.length)
				return 0;

			var row = rowsVector[rowID];
			var cols = row.cells;
			if (!cols)
				return 0;

			return cols.length;
		},

		_getSubContentSize: function (rowColCounts) {
			// The m_pElement may be a partial table, it should try to get the whole table.
			var elem = this._getParentTable();
			if (!elem) {
				elem = this._elem;
			}
			var elements = SapConfigurationUtil.filterCollection(elem, SAP_SPECIFIER_ENUM.SAP_WDA_ITS_TABLE_CONTENT);
			if (!elements || elements.length == 0)
				return;
			return this._getSegTableSize(elements[0], rowColCounts);
		},

		_getSegTableSize: function (element, rowColCounts) {
			if (!element)
				return;

			var segcc = element.getAttribute("segcc");
			if (!segcc)
				return;
			var colCount = parseInt(segcc);
			if (isNaN(colCount))
				return;
			rowColCounts.colCount = colCount;

			var segrc = element.getAttribute("segrc");
			if (!segrc)
				return;
			var rowCount = parseInt(segrc);
			if (isNaN(rowCount))
				return;
			rowColCounts.rowCount = rowCount;
			return;
		},

		_getColumnsNumber: function () {
			var parentTable = this._getParentTable();
			if (parentTable == null)
				return this._getColsCount();

			var lsData = parentTable.getAttribute("lsdata");
			if (lsData) {
				var idx = this._extractTableDataFromLsData(lsData, "3:", ",4:");
				var idxNum = parseInt(idx);
				if (!isNaN(idxNum) && idxNum != -1)
					return idxNum;

				var tableContentPtr = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_ITS_TABLE_CONTENT, 2);
				// In WDA7.5, the column header and table content are seperate, and both are identified as SAPTable.
				if (tableContentPtr == null)
					tableContentPtr = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_ITS_TABLE_HEADER, 2);

				if (tableContentPtr != null) {
					var segcc = tableContentPtr.getAttribute("segcc");
					if (!segcc)
						return 0;

					var col = parseInt(segcc);
					if (isNaN(col))
						return 0;

					return col;
				}

			}

			// Table consists of 1 or 2 sub seg tables, left part(row headers) and content part.
			var rowColCountsLeft = {};
			var rowColCountsContent = {};
			this._getSubLeftSize(rowColCountsLeft);
			this._getSubContentSize(rowColCountsContent);
			return rowColCountsLeft.colCount + rowColCountsContent.colCount;
		},

		//This method extracts the row number and column number from lsData, as explained above
		_extractTableDataFromLsData: function (lsDataValue, startStringLocation, endStringLocation) {
			// If it cannot find the start string or end string, it should return -1 instead of 0
			var i = lsDataValue.indexOf(startStringLocation);
			if (i <= -1)
				return -1;

			i += startStringLocation.length;

			var j = lsDataValue.indexOf(endStringLocation);
			if (j <= -1)
				return -1;

			//The length of the data in characters is given with j - i + 2 (we add 2 since we start after '2:')
			var numOfCharactersOfData = j - i;
			var dataStr = lsDataValue.substr(i, numOfCharactersOfData);
			dataStr.trim();
			dataStr.replace('\'', '');
			if (!dataStr)
				return -1;

			return dataStr;
		},

		_getSubLeftSize: function (rowColCountsLeft) {
			// The m_pElement may be a partial table, it should try to get the whole table.
			var elem = this._getParentTable();
			if (!elem) {
				elem = this._elem;
			}
			var elements = SapConfigurationUtil.filterCollection(elem, SAP_SPECIFIER_ENUM.SAP_WDA_ITS_TABLE_LEFT);
			if (!elements || elements.length == 0) {
				return;
			}

			return this._getSegTableSize(elements[0], rowColCountsLeft);
		},

		_isListInTable: function () {
			// check if we have a list inside the cell
			if (SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAPWD_LIST_MAIN) != null)
				return true;
			return false;
		},

		//this method extracts a value, a column name and a starting line. it returns the first index of row 
		//whose cell value in the given column equals the given value. starting the search at the given 
		//starting row default starting row is 1.
		//communicate with package -- zero based, In -- one based
		_queryRowsByCellContent: function (msg) {
			//extract the data
			var colVal = msg._data["FindRowByCellContent"][0][0];
			var cellVal = msg._data["FindRowByCellContent"][0][1];
			var rowIndex = msg._data["FindRowByCellContent"][0][2];

			var rowList = this._fillTableRowsList();
			if (!rowList) // These rows are only the content tables' and the column header is not included.
				return null;

			var rowListSize = rowList.length;
			if (!this._isRowAndColumnValid(rowIndex, rowListSize, rowList, colVal))
				return SAPTableBehavior.TABLE_ROW_OR_COL_INVALID;

			//loop over the rows - in each, get the cell in the column index and compare the cell's value to given value
			//lRowIndex starts from 1.
			for (; rowIndex <= rowListSize; rowIndex++) {
				//extract the cells of the current row
				var cellList = this._getCellsOfCurrentRow(rowList, rowIndex);
				var cellListSize = cellList != null ? cellList.length : 0;
				if (cellListSize == 0)
					return null;

				if (colVal > cellListSize)
					continue;

				//extract the cell from the list of cells
				//compare the current cell value with the given value
				//when we ask the table for its list of rows, we get EVERY row, including rows that
				//are not part of the tables data. these rows don't always have the expected number
				//of cells. therefore, we must check it before the actual comparison!
				var col = cellList[colVal - 1];
				if (!col)
					return null;

				var colAO = SAPKit.createAO(col, this._parentID, null, null,true);
				if (colAO && colAO.GetAttrSync("inner cell data") == cellVal) {
					//Is NwbcWdaTable ?
					var cell = col;
					if (this._isNwbcWdaTable(cell)) {
						var rrIndex = this._getRowNumberByrrProperty(cell);
						if (rrIndex) {
							return rrIndex - 1;
						}
					}

					var row = 0;
					//lFirstRowIndex get the tr rr property, starts from 1
					var firstRowIndex = this._getFirstVisibleRowIndex();
					rowIndex = this._convertRowNumberToZeroBased(rowIndex);
					// In EP table, the first row index is -1.
					if (firstRowIndex == -1) {
						row = rowIndex;
					}
					else {
						firstRowIndex = this._convertRowNumberToZeroBased(firstRowIndex);
						row = firstRowIndex + rowIndex;
					}
					//we have a match
					return row;
				}
			}

			return -1; //did not find!	

		},

		_fillTableRowsList: function () {
			return this._getRows();
		},

		_isRowAndColumnValid: function (rowIndex, rowListSize, rowList, colVal) {
			if (!this._isRowValid(rowIndex, rowListSize) || !this._isColumnValid(rowList, rowIndex, colVal))
				return false;
			return true;
		},

		//get the rows of the table and check that the starting row is valid
		_isRowValid: function (rowIndex, rowListSize) {
			if ((rowIndex < 1) || (rowIndex >= rowListSize)) {
				//the starting row is not valid - return TABLE_ROW_OR_COL_INVALID!
				return false;
			}
			return true;
		},

		//check that the column is valid. (check start row column count) 
		_isColumnValid: function (rowList, rowIndex, colVal) {
			var child = rowList[rowIndex];
			if (!child)
				return false;
			// RoleBased row ao has overriden the GetDirectChildCount method,
			// which doesn't work for the SAPTable's row ao.
			var cellList = this._getCells(child);
			var childCount = cellList != null ? cellList.length : 0;
			if (colVal < 1 || colVal > childCount) {
				return false;
			}
			return true;
		},

		_getCellsOfCurrentRow: function (rowList, rowIndex) {
			return rowList[rowIndex - 1].cells;
		},

		//return true if the table is a NwbcWdaTable (rr property of this table is available)
		_isNwbcWdaTable: function (element) {
			var container = SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAP_WDA_ITS_NWBC_TABLE);
			if (!container)
				return false;

			var classname = container.className;
			if (!classname)
				return false;

			return classname.indexOf("urST5OuterOffBrd urBorderBox") >= 0;
		},

		//return Row number when "rr" property is available
		_getRowNumberByrrProperty: function (element) {
			var container = SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAPSP_ICWC_ROW_NUMBER);
			if (!container)
				return null;

			var rr = container.getAttribute("rr");
			if (rr) {
				var rc = parseInt(rr);
				if (!isNaN(rc)) {
					return rc;
				}
			}
			return null;
		},

		_getFirstVisibleRowIndex: function () {
			var firstRow = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_ROW_NUMBER);
			return SAPUtils.getRowNumber(firstRow);
		},

		_queryCellDataByCellContent: function (msg) {
			//extract the data
			//To do check
			var colVal = msg._data["GetCellDataEx"][0][0];
			var cellVal = msg._data["GetCellDataEx"][0][1];
			var rowIndex = msg._data["GetCellDataEx"][0][2];
			var destColVal = msg._data["GetCellDataEx"][0][3];

			//var rowList = this._fillTableRowsList();
			var rowList = this._getRows();
			if (!rowList) // These rows are only the content tables' and the column header is not included.
				return false;

			var rowListSize = rowList != null ? rowList.length : 0;
			if (!this._isRowAndColumnValid(rowIndex, rowListSize, rowList, colVal) ||
				!this._isColumnValid(rowList, rowIndex, destColVal))
				return false;

			//loop over the rows - in each, get the cell in the column index and compare the cell's value to given value
			//lRowIndex starts from 1.
			for (; rowIndex <= rowListSize; rowIndex++) {
				//extract the cells of the current row
				var cellList = this._getCellsOfCurrentRow(rowList, rowIndex, cellList);
				var cellListSize = cellList != null ? cellList.length : 0;
				if (cellListSize == 0)
					return false;

				if (colVal > cellListSize ||
					(destColVal > cellListSize))
					continue;

				//extract the cell from the list of cells
				//compare the current cell value with the given value
				//when we ask the table for its list of rows, we get EVERY row, including rows that
				//are not part of the tables data. these rows don't always have the expected number
				//of cells. therefore, we must check it before the actual comparison!
				var col = cellList[colVal - 1];
				if (!col)
					return null;
				var colAO = SAPKit.createAO(col, this._parentID, null, null,true);
				if (colAO.GetAttrSync("inner cell data") == cellVal) {
					var destCol = cellList[destColVal - 1];
					if (!destCol)
						return null;
					var destColAO = SAPKit.createAO(destCol, this._parentID, null, null,true);
					return destColAO.GetAttrSync("inner cell data");
				}
			}

			return SAPTableBehavior.TABLE_CELL_STRING_NOT_FIND;
		},

		_getName: function () {
			var parent = this._getParentTable();
			if (!!parent) {
				var header = SapConfigurationUtil.getElementOfCollection(parent, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_TABLE_HEADER);
				if (!!header) {
					return header.innerText;
				}
			}
			return null;
		},

		_getParentTable: function () {
			return SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_TABLE_PARENT, 8);
		},

		_getCellIndexByElement: function (element, index) {
			var cellElement;
			if (!element)
				return null;
			var row = -1;
			var col = -1;

			//For NWBC table drawn by div
			if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_NWBC_USERAREA_TABLE)) {
				cellElement = SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAP_NWBC_DIVDRAW_TABLE_CELL, 2);
				if (cellElement == null)
					return null;
				var cellId = cellElement.id;
				if (cellId == null)
					return null;
				var userareaRowNo = this._getNWBCUserareaRowNoByCellId(cellId);
				if (userareaRowNo < 0)
					return null;
				var userareaColNo = this._getNWBCUserareaColumnNoByCellId(cellId);
				if (userareaColNo < 0)
					return null;
				var idPrefix = this._getNWBCUserareaCellIdPrefix(cellId);
				if (idPrefix == null)
					return null;

				//get row No.
				var topLeftImg = SapConfigurationUtil.GetElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_NWBC_DIVDRAW_TABLE_TOPLEFT_IMG);
				if (topLeftImg == null)
					return null;
				var topLeftImgId = topLeftImg.id;
				if (topLeftImgId == null)
					return null;
				var topLeftImgUserareaRowNo = this._getNWBCUserareaRowNoByCellId(topLeftImgId);
				if (topLeftImgUserareaRowNo < 0)
					return null;

				//the returned row index should be 0-based
				if (userareaRowNo < topLeftImgUserareaRowNo) // not in the table
					return null;
				else if (userareaRowNo < topLeftImgUserareaRowNo + 3) //head row
					row = 0;
				else
					row = userareaRowNo - topLeftImgUserareaRowNo - 2;
				index.rowIndex = row;

				//get column No.
				col = 1;
				for (let i = 0; i < userareaColNo; i++) {
					if (i > 500) //prevent dead loop
						break;
					var sameRowCellId = idPrefix + ":::" + userareaRowNo + ":" + i.toString();
					var pSameRowCellElement = document.getElementById(sameRowCellId);
					if (pSameRowCellElement == null)
						continue;
					if (SapConfigurationUtil.isElementOfSpecifier(pSameRowCellElement, SAP_SPECIFIER_ENUM.SAP_NWBC_DIVDRAW_TABLE_CELL))
						col++;
				}
				//the returned row index should be 1-based
				index.colIndex = col;

				return cellElement;
			}

			// change row number according to the rr value
			var elemRow = SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAPSP_ICWC_ROW_NUMBER, 8);
			if (elemRow) {
				var row = SAPUtils.getRowNumber(elemRow);
				if (row == null) {
					// Didn't get a valid row. Nothing to do.
					return null;
				}
			}

			//return the Col number 
			cellElement = SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAP_WDA_TABLE_CELL, 7);
			if (!cellElement)
				return null;

			if (SapConfigurationUtil.isElementOfSpecifier(cellElement, SAP_SPECIFIER_ENUM.SAP_WDA_TABLE_HEADERCELL)) {
				// It is the wda table's header row, it doesn't contain rr attr and
				// the Row index is fixed to zero.
				row = 0;

				// The table header cell doesn't contain cc attr either. 
				// Using its index of location in the cells vector as the col number.
				var colNumElements = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_TABLE_HEADERCELL);
				if (colNumElements && colNumElements.length > 0) {
					for (let index = 0; index < colNumElements.length; index++) {
						if (cellElement == colNumElements[index]) {
							col = index;
						}
					}
				}
			}
			else if (row > 0) {
				// If you get here, it means the current cell is a normal one
				// so it should already get the row number that is greater than zero.
				var cc = cellElement.getAttribute("cc");
				if (cc == null)
					cc = cellElement.getAttribute("lsMatrixColIndex");

				if (cc == null)
					return null;

				col = parseInt(cc);
			}
			else // Neither header cell nor content cell, error
				return null;

			if (col < 0) {
				// Didn't get a valid col. Nothing to do.
				return null;
			}

			// Got a valid row, just set it.
			index.rowIndex = row;
			// Indexes used in script 1-based, in MSHTML 0-based
			index.colIndex = col + 1;
			return cellElement;
		},

		// This method converts NWBC userarea cell ID to row No. in NWBC userarea.
		// Returen -1 on failure.
		_getNWBCUserareaRowNoByCellId: function (cellId) {
			if (!cellId)
				return -1;

			var indexTripleColon = cellId.indexOf(":::");
			if (indexTripleColon < 0)
				return -1;
			var bsAfterTripleColon = cellId.substr(indexTripleColon + 3, cellId.length - indexTripleColon - 3);

			var indexNextColon = bsAfterTripleColon.indexOf(":");
			if (indexNextColon < 0)
				return -1;
			var bsUserareaRowNo = bsAfterTripleColon.substr(0, indexNextColon);
			var userareaRowNo = parseInt(bsUserareaRowNo);
			return isNaN(userareaRowNo) ? -1 : userareaRowNo;
		},

		// This method converts NWBC userarea cell ID to column No. in NWBC userarea.
		// Returen -1 on failure.
		_getNWBCUserareaColumnNoByCellId(cellId) {
			if (!cellId)
				return -1;

			var indexLastColon = cellId.lastIndexOf(':');
			if (indexLastColon < 0)
				return -1;
			var bsUserareaColNo = cellId.substr(indexLastColon + 1, cellId.length - indexLastColon - 1);
			var userareaColNo = parseInt(bsUserareaColNo);
			return isNaN(userareaColNo) ? -1 : userareaColNo;
		},

		// This method extract the common prefix in NWBC userarea cell ID, namely the part before ":::"
		// For example, we will extract "__AGIM0:U" from "__AGIM0:U:::8:0"
		// Returen NULL on failure.
		_getNWBCUserareaCellIdPrefix(cellId) {
			if (!cellId)
				return null;

			var indexTripleColon = cellId.indexOf(":::");
			if (indexTripleColon < 0)
				return null;

			return cellId.substr(0, indexTripleColon);
		},

		_updateWebInfo: function (params, row, col) {
			if (!params)
				return;

			// override the cell index and set the object id and micclass to be the sapTable
			//params["id"] = this.getID();
			params["mic class"] = Util.getMicClass(this);
			// In WDA the header isn't a part of the table, so all the rows in the table are off by one.
			params["row"] = row + 1;
			params["col"] = col;
		},

		_isRecordRdBtnOrChckBxInCell: function (element, cellElement, params, bIsRdBtnOrChkBxInCellObj) {
			if (!params)
				return true;

			var isElementOfSpecifier = false;
			// radio box?
			if (SapConfigurationUtil.getElementOfCollection(cellElement, SAP_SPECIFIER_ENUM.SAP_WDA_RADIOBUTTON)) {
				isElementOfSpecifier = SapConfigurationUtil.isElementOfSpecifier(element, SAP_SPECIFIER_ENUM.SAPSP_RADIOGROUP_EP7);
				if (!isElementOfSpecifier)
					isElementOfSpecifier = SapConfigurationUtil.isElementOfSpecifier(element, SAP_SPECIFIER_ENUM.SAP_WDA_RADIOBUTTON);
				if (!isElementOfSpecifier)
					isElementOfSpecifier = SapConfigurationUtil.isElementOfSpecifier(element, SAP_SPECIFIER_ENUM.SAPWD_CHECKBOX_IMG_A1S);
			}

			if (!isElementOfSpecifier) {
				isElementOfSpecifier = SapConfigurationUtil.isElementOfSpecifier(element, SAP_SPECIFIER_ENUM.SAPSP_ICWC_RADIOGROUP2);
			}

			if (isElementOfSpecifier) {
				bIsRdBtnOrChkBxInCellObj.bIsRdBtnOrChkBxInCell = true;
				params["ICWC radiobutton"] = "ON";
				return true;
			}

			// check box?
			if (SapConfigurationUtil.getElementOfCollection(cellElement, SAP_SPECIFIER_ENUM.SAP_WDA_CHECKBOX)) {
				isElementOfSpecifier = SapConfigurationUtil.isElementOfSpecifier(element, SAP_SPECIFIER_ENUM.SAPWD_CHECKBOX_IMG_MAYBEINWDATABLE); // img.urCImg.*

				if (!isElementOfSpecifier)
					isElementOfSpecifier = SapConfigurationUtil.isElementOfSpecifier(element, SAP_SPECIFIER_ENUM.SAP_WDA_CHECKBOX);

				if (!isElementOfSpecifier)
					isElementOfSpecifier = SapConfigurationUtil.isElementOfSpecifier(element, SAP_SPECIFIER_ENUM.SAPWD_CHECKBOX_IMG_A1S); // span.urCl1

				if (isElementOfSpecifier) {
					//if we reach this code and the checkbox is checked we would like to record a click on the 
					//checkbox which turns it off and therefore we give the value OFF to be recorded in the script
					var value = "ON";
					// For WDA 7.4 and 7.5, it contains role attribute
					// It will get the checkbox status that is after clicking instead of before it.
					//For chrome, the status is before click it. change this logic.
					//var bIsWDAAdvCheckbox = SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAP_WDA_CHECKBOXADV);
					// if (bIsWDAAdvCheckbox != null
					// 	&& SapConfigurationUtil.getElementOfCollection(cellElement, SAP_SPECIFIER_ENUM.SAPSP_IMAGECHECKBOX_CHECKED) !=null) {
					// 	value = "OFF";
					// }

					if (SapConfigurationUtil.getElementOfCollection(cellElement, SAP_SPECIFIER_ENUM.SAPSP_IMAGECHECKBOX_CHECKED) != null) {
						value = "OFF";
					}

					params["ICWC checkbox"] = value;
					bIsRdBtnOrChkBxInCellObj.bIsRdBtnOrChkBxInCell = true;
					return true;

				}
			}

			//CheckBox in Table has the same structure as http://mydvmsap07.swinfra.net:8000/sap/bc/webdynpro/sap/wdr_test_c_table?sap-client=001&sap-language=EN# Mandy/W3lcome1
			var spCheckBoxSpan = SapConfigurationUtil.getElementOfCollection(cellElement, SAP_SPECIFIER_ENUM.SAP_WDA_CHECKBOX_SPAN);
			if (spCheckBoxSpan) {
				var value = "OFF";
				var micClassName = spCheckBoxSpan.className;
				//The class name will be got before the checkbox status changed which means
				//string contains "unchecked" will be got if current check box is unchecked status.
				if (!!micClassName && micClassName.indexOf("unchecked") != -1) {
					value = "ON";
				}

				params["ICWC checkbox"] = value;
				bIsRdBtnOrChkBxInCellObj.bIsRdBtnOrChkBxInCell = true;
				return true;
			}

			// combo box?
			var child = SapConfigurationUtil.getElementOfCollection(cellElement, SAP_SPECIFIER_ENUM.SAP_WDA_COMBOBOX);
			if (child) {
				params["CRM list in table"] = true;
				bIsRdBtnOrChkBxInCellObj.bIsRdBtnOrChkBxInCell = true;
				return true;
			}
			return true;
		},

		_checkIfOnlyBtnInCell: function (elemAO) {
			var objList = [];
			var length = elemAO._getAllChildrenWithData(objList);
			if (0 == length) {
				// Should check all SAPButton, but for risk consideration, check for the given scenario only here, i.e. Portal_Searchbar_Button1.
				// Todo, think about hwo to cover a label with no data in the same cell.
				var searchButton1 = SapConfigurationUtil.getElementOfCollection(elemAO._elem, SAP_SPECIFIER_ENUM.SAPSP_PORTAL_SEARCHBAR_BUTTON1);
				if (searchButton1) {
					return true;
				}
				return false;
			}
		},

		// We find the HTML element for performing the operation and either click on it here or
		// return it to the package side so the package clicks on it (decision as to which way to go is based on what works ;o))
		// Returns: true if we handled the case or false if this is not a cell containing a relevant object.
		_setCellRdBtnOrChkBx: function (msg) {
			var isONObj = { isON: false };
			if (!this._retrieveValueToSet(msg, isONObj))
				return false;

			var element = this._retrieveCellElement(msg);
			if (!element) {
				return false;
			}

			if (this._handleRadioButton(element, isONObj.isON))
				return true;

			return this._handleCheckBox(element, isONObj.isON, msg);
		},

		_retrieveValueToSet: function (msg, isONObj) {
			//We check that we received either "ON" or "OFF" as a parameter
			var attrValCellData = msg._data["inner cell data"];
			if (!attrValCellData) {
				//Unexpected empty parameter used (should be 'ON' or 'OFF')
				return false;
			}

			if (attrValCellData == "ON" || attrValCellData == "OFF") {
				isONObj.isON = attrValCellData == "ON";
				return true;
			}
			//Invalid parameter used should be 'ON' or 'OFF'
			return false;
		},

		_retrieveCellElement: function (msg) {
			var attrVal = msg._data.WEB_PN_ID;
			if (!attrVal)
				return null;
			var elem = content.rtidManager.GetElementFromID(attrVal.object);
			return elem;
		},

		_handleRadioButton: function (element, isON) {
			var child = SapConfigurationUtil.getElementOfCollection(element, SAP_SPECIFIER_ENUM.SAP_WDA_RADIOBUTTON);
			if (!child) {
				child = SapConfigurationUtil.getElementOfCollection(element, SAP_SPECIFIER_ENUM.SAPSP_ICWC_RADIOGROUP2);
				if (!child) {
					return false;
				}
			}

			if (isON) { //if we found a radio button and we need to turn it "ON", we click on it.
				// In this case sending the RTID to the package side fails (probably because it's a radio group) so we just click it and don't send a RTID
				child.click();
			}
			return true;
		},

		_handleCheckBox: function (element, isON, msg) {
			//if we don't have a radio button check if we have a check-box
			var child = SapConfigurationUtil.getElementOfCollection(element, SAP_SPECIFIER_ENUM.SAP_WDA_CHECKBOX);
			var childSpan = SapConfigurationUtil.getElementOfCollection(element, SAP_SPECIFIER_ENUM.SAP_WDA_CHECKBOX_SPAN);

			if (child) {
				var isChecked = false;
				if (SapConfigurationUtil.getElementOfCollection(element, SAP_SPECIFIER_ENUM.SAPSP_IMAGECHECKBOX_CHECKED))
					isChecked = true;

				//if the checkbox is checked and we need to set it "OFF" or the checkbox is not checked and we need to set it on, we need to click.
				if (isChecked == isON)
					return true;

				//create new AO for passing the child id to replay the click
				var ao = content.kitsManager.createAO(child, this._parentID);
				if (ao)
					msg._data.WEB_PN_ID = ao.getID();
				return true;
			}
			else if (childSpan) {
				var isChecked = true;
				var micClassName = childSpan.className;
				if (!!micClassName && micClassName.indexOf("unchecked") != -1)
					isChecked = false;

				//if the checkbox is checked and we need to set it "OFF" or the checkbox is not checked and we need to set it on, we need to click.
				if (isChecked == isON)
					return true;
				//create new AO for passing the child id to replay the click
				var ao = content.kitsManager.createAO(childSpan, this._parentID);
				if (ao != null)
					msg._data.WEB_PN_ID = ao.getID();
				return true;
			}
			return false;
		},

	}
};

var SAPCRMTableBehavior = {
	_attrs: {
		"rows": function () {
			return this._getRowsNumber();
		},
	},

	_helpers: {
		isLearnable: Util.alwaysTrue,

		_getRowsNumber: function () {
			var tableTestmode = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_TESTMODE);
			if (tableTestmode != null) {
				var tableFooter = SapConfigurationUtil.getElementOfCollection(tableTestmode, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_FOOTER);

				if (tableFooter == null) {
					// only one page , therefore footer doesn't exist.
					var rowsVector = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_ROW);
					if (rowsVector && rowsVector.length != 0)
						return rowsVector.length;
				}
				else {
					var pagerForward = SapConfigurationUtil.getElementOfCollection(tableFooter, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_PAGER_FORWARD);
					var forwardLink = SapConfigurationUtil.getElementOfCollection(pagerForward, SAP_SPECIFIER_ENUM.SAP_CRM_LINK);

					//we try to find if the forward link is disabled or not
					var outerHtml;
					var findTxt = "onclick=\"";
					var onClickBegin = -1;
					if (forwardLink)
						outerHtml = forwardLink.outerHTML;
					if (outerHtml)
						onClickBegin = outerHtml.indexOf(findTxt);
					if (onClickBegin == -1) {
						// the forward link is disabled , so we try the back link
						var pagerBack = SapConfigurationUtil.getElementOfCollection(tableFooter, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_PAGER_BACK);
						var backLink = SapConfigurationUtil.getElementOfCollection(pagerBack, SAP_SPECIFIER_ENUM.SAP_CRM_LINK);

						if (backLink)
							outerHtml = backLink.outerHTML;
						if (outerHtml)
							onClickBegin = outerHtml.indexOf(findTxt);
					}

					if (onClickBegin < 0)
						return 0;

					onClickBegin += findTxt.length; // skip onclick='
					var onClickEnd = outerHtml.indexOf(",P\');\"", onClickBegin);
					if (onClickEnd < 0)
						return 0;

					var onClickLength = onClickEnd - onClickBegin;
					var onClickStr = outerHtml.substr(onClickBegin, onClickLength);

					var pos = onClickStr.lastIndexOf(',');

					var numStr = onClickStr.substr(pos + 1);

					var numRows = parseInt(numStr);
					if (!isNaN(numRows))
						return numRows + 1;//we include the header row
				}

			}
			return 0;
		},

		//returns columns number in the current row
		_getColsCount: function (rowID = 0) {
			if (this._elem == null)
				return 0;

			var rowsNum = this._getRowsNumber();

			if ((rowsNum > rowID) && (rowID >= 0)) {
				// because the number of columns in the whole table is the same,so we return the number of
				// columns from the table header row.
				var tableHeaderCells = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_HEADER_CELL);
				return tableHeaderCells != null ? tableHeaderCells.length : 0;
			}

			return 0;
		},

		//Navigate to the page in the CRM table where the row we are looking for is located 
		_navigateIfNeeded: function (msg) {
			//value S_OK when not navigating anymore

			var row = msg._data["row"];
			//This check should be before the GetRowsNumber(), because if lRow == 1, we don't care how many rows we have in total. (bug #95181)
			if (!row || row < 1 || row > this._getRowsNumber()) {
				return;
			}

			if (row == 1)
				return; //first row is the header row ,so we don't need to navigate. 

			var rowElements = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_ROW);
			var rowsNumber = rowElements != null ? rowElements.length : 0;
			if (rowsNumber == 0)
				return;

			var firstCurRow = 0, lastCurRow = 0; // last and first rows in current page

			firstCurRow = this._getCRMRowNumber(rowElements[1]);
			lastCurRow = this._getCRMRowNumber(rowElements[rowsNumber - 1]);
			if (!firstCurRow || !lastCurRow ||
				(row >= firstCurRow && row <= lastCurRow)) // lRow in current page, no need to navigate
				return;

			// In initial navigation decide whether the direction of navigation is left (up) or right(down), 
			// and whether to start the navigation from "Page1" or last page.
			// PN_SAP_VALUE is true when we are in initial navigation.
			var val = msg._data["sap value"];
			var pageNum = (row - 2) / (rowsNumber - 1) + 1;
			if (val != null && val == true) {
				var totalRowsNumber = this._getRowsNumber();
				if (totalRowsNumber == 0)
					return;

				if (row > totalRowsNumber) {
					return;
				}

				if (this._initialNavigation(pageNum, msg))
					return;
			}

			// After initial navigation, or when in initial navigation
			// not pressing on first or last pages links in the table.
			if (this._navigateToPage(pageNum, msg))
				return;
		},

		_getCRMRowNumber: function (element) {
			if (element == null)
				return 0;

			var value = element.rowIndex;
			if (!value)
				return 0;

			var rowIndex = parseInt(value); // row number in the current page

			if (!isNaN(rowIndex) && rowIndex == 0)
				return 1;  // we are dealing with header row - it is a first row in table;

			var pageNumber = this._getCurrentPageNumber();
			if (pageNumber == 0)
				return 0;

			var currentTableRows = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_ROW);
			var currentRowsNumber = currentTableRows != null ? currentTableRows.length : 0;
			if (currentRowsNumber == 0) //at least the header row must exist
				return 0;

			return (currentRowsNumber - 1) * (pageNumber - 1) + 1 + rowIndex;
		},

		_getCurrentPageNumber: function () {
			var tableTestmode = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_TESTMODE);
			if (tableTestmode == null)
				return 0;

			var tableFooter = SapConfigurationUtil.getElementOfCollection(tableTestmode, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_FOOTER);
			if (tableFooter == null)
				return 1; // only one page, therefore there is no footer

			var pagerLabel = 0;
			if (SapConfigurationUtil.getElementOfCollection(tableFooter, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_PAGER_LABEL) != null)
				pagerLabel = 1;

			var pagesVector = SapConfigurationUtil.filterCollection(tableFooter, SAP_SPECIFIER_ENUM.SAP_CRM_LINK); // filtering pages labels
			var numberOfPages = pagesVector != null ? pagesVector.length : 0;
			if (numberOfPages < ((pagerLabel + 1) * 2))
				return 0;

			var outerHtml;
			var findTxt = "onclick=";

			// we are searching for disabled page label,because it represents the current
			// page number , we also skip the  "Page1", "<-Back ", "->Forward" ,"LastPage" four labels. 
			for (let i = 1 + pagerLabel; i < numberOfPages - 1 - pagerLabel; i++) {
				outerHtml = pagesVector[i].outerHTML;
				if (outerHtml.indexOf(findTxt) == -1) {
					// there is no "onclick" event in the page number link ,therefore this page
					// number is disabled ,namely it is a current page number.

					var parentElem = pagesVector[i].parentElement;
					if (parentElem) {
						var pageNumberStr = parentElem.innerText;
						var pageNumber = parseInt(pageNumberStr);
						if (!isNaN(pageNumber))
							return pageNumber;
					}
				}
			}
			return 0;
		},

		//The method finds the page we should navigate to. If the requested page is presented in the current
		// pages scale we insert it's id , otherwise we navigate to last/first page in the presented scale,
		// according to the navigation direction.
		_navigateToPage: function (pageNumber, msg) {
			var tableTestmode = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_TESTMODE);
			if (tableTestmode == null)
				return false;

			var tableFooter = SapConfigurationUtil.getElementOfCollection(tableTestmode, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_FOOTER);
			if (tableFooter == null)
				return false;

			var pagesNumbersVector = SapConfigurationUtil.filterCollection(tableFooter, SAP_SPECIFIER_ENUM.SAP_CRM_PLAIN_LI);

			var currentPagesNum = pagesNumbersVector != null ? pagesNumbersVector.length : 0;
			var innerText;
			var currPageNum;

			// first we check if the requested page is found in the currently presented pages scale,
			// and if it is true so we will click directly on it and no more navigation is needed.
			// Otherwise we navigate to the last/first page currently presented in the scale according
			// to the navigation direction.
			for (let i = 0; i < currentPagesNum; i++) {
				innerText = pagesNumbersVector[i].innerText;
				currPageNum = parseInt(innerText);
				if (!isNaN(currPageNum) && (currPageNum == pageNumber)) {
					//the requested page is presented in the current pages scale.
					this._initialNav(false, SAP_SPECIFIER_ENUM.SAP_CRM_LINK, msg, pagesNumbersVector[i]);
					return true;
				}
			}

			//we need to navigate according to the direction ,so we check the navigation direction.
			var val = msg._data["ICWC navigate up"];
			var linkElem;
			// navigate up means to the left part of the scale (to the first page in the currently
			// presented scale), navigate down means to the right part of the scale( to the last page
			// in the currently presented scale).
			var pagerLabel = 0;
			if (SapConfigurationUtil.getElementOfCollection(tableFooter, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_PAGER_LABEL) != null)
				pagerLabel = 1;

			//find and click on the needed link
			if (val != null && val == true)
				linkElem = SapConfigurationUtil.getElementOfCollection(pagesNumbersVector[1 + pagerLabel], SAP_SPECIFIER_ENUM.SAP_CRM_LINK);
			else
				linkElem = SapConfigurationUtil.getElementOfCollection(pagesNumbersVector[currentPagesNum - 2 - pagerLabel], SAP_SPECIFIER_ENUM.SAP_CRM_LINK);

			if (linkElem == null)
				return false;

			//create new AO for passing the link id to replay the click
			var itemAO = content.kitsManager.createAO(linkElem, this.getID());
			if (itemAO != null) {
				msg._data.WEB_PN_ID = itemAO.getID();
				return true;
			}
			return false;
		},

		// In initial navigation, get the directions to navigate, and click on First or Last page 
		// in the whole table if needed.
		_initialNavigation: function (pageNumber, msg) {
			var tableTestmode = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_TESTMODE);
			if (tableTestmode == null) {
				msg.result = 0x80070057;
				return true;
			}

			var tableFooter = SapConfigurationUtil.getElementOfCollection(tableTestmode, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_FOOTER);
			if (tableFooter == null) {
				msg.result = 0x80070057;
				return true;
			}

			var pagesNumbersVector = SapConfigurationUtil.filterCollection(tableFooter, SAP_SPECIFIER_ENUM.SAP_CRM_PLAIN_LI);

			var currentPagesNum = pagesNumbersVector != null ? pagesNumbersVector.length : 0;
			if (currentPagesNum == 0) {
				msg.result = 0x80070057;
				return true;
			}

			if (SapConfigurationUtil.getElementOfCollection(tableFooter, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_PAGER_LABEL) == null) {
				// if there is no pager labels ( "Page 1" ,last page),so all pages presented in the
				// current pages scale, so we will find the correct page in the "NavigateToPage" method.
				msg._data["ICWC navigate up"] = false;
				msg._data["sap value"] = false; // Not initial navigation anymore
				msg.result = 1;// 1 means not found yet
				return false;
			}

			//footer structure example :" Page1 <-Back 32 33 34 35 36 37 Forward-> 37"
			//Here - TotalPages = 37, FirstPage =32 , LastPage =37 
			var totalPages, firstPage, lastPage;
			totalPages = pagesNumbersVector[currentPagesNum - 1].innerText;
			firstPage = pagesNumbersVector[2].innerText;
			lastPage = pagesNumbersVector[currentPagesNum - 3].innerText;

			if (totalPages == null || firstPage == null || lastPage == null) {
				msg.result = 0x80070057;
				return true;
			}
			var totalPagesNum, firstPageNum, lastPageNum;
			totalPagesNum = parseInt(totalPages);
			firstPageNum = parseInt(firstPage);
			lastPageNum = parseInt(lastPage);
			if (isNaN(totalPagesNum) || isNaN(firstPageNum) || isNaN(lastPageNum)) {
				msg.result = 0x80070057;
				return true;
			}

			var middle;
			var ret = false;
			if (lastPageNum < pageNumber) {
				middle = (totalPagesNum - lastPageNum) / 2 + lastPageNum;
				if (pageNumber < middle) {
					msg._data["ICWC navigate up"] = false; // Navigate right -> 
				}
				else {
					// First click on total pages number link, then navigate up
					this._initialNav(true, SAP_SPECIFIER_ENUM.SAP_CRM_LINK, msg, pagesNumbersVector[currentPagesNum - 1]);
					ret = true;
				}
			}
			if (pageNumber < firstPageNum) {
				middle = firstPageNum / 2 + 1;
				if (pageNumber > middle) {
					// Navigate left <-
					msg._data["ICWC navigate up"] = true;
				}
				else {
					// First click on Page 1 link , then navigate right ->
					this._initialNav(false, SAP_SPECIFIER_ENUM.SAP_CRM_LINK, msg, pagesNumbersVector[0]);
					ret = true;
				}
			}

			msg._data["sap value"] = false;// Not initial navigation anymore
			msg.result = 1;// S_FALSE means not found yet
			return ret;
		},

		// Get a row object by its index (1 ..n).
		_getRow: function (rowID, tmpColID, hasRowSelectorElement) {
			var rowNumElements = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_ROW);

			var rowsNum = rowNumElements != null ? rowNumElements.length : 0;

			if (rowsNum == 0)
				return null;

			if (rowID == 1)  // we want the header row
			{
				return rowNumElements[0];
			}

			var lastRowNum = rowsNum - 1;
			var firstRowNum = lastRowNum > 0 ? 1 : 0;
			var lastRow = this._getCRMRowNumber(rowNumElements[lastRowNum]);
			var firstRow = this._getCRMRowNumber(rowNumElements[firstRowNum]);

			if (rowID > lastRow || rowID < firstRow)
				return null; // at least the header row must exist. Also, prevent getting out of bounds.

			var curRow = this._getCRMRowNumber(rowNumElements[rowID - firstRow + 1]);


			if (!firstRow || !lastRow || !curRow || (rowID < firstRow) || (rowID > lastRow))
				return null;

			if (curRow == rowID) // Found the correct row
			{
				return rowNumElements[rowID - firstRow + 1];
			}

			return null;
		},

		_setCellRdBtnOrChkBx: function (msg) {
			var pnID = msg._data.WEB_PN_ID;
			var element;
			if (pnID) {
				element = content.rtidManager.GetElementFromID(pnID.object);
			}

			if (!element) {
				return;
			}

			var isON = false;
			//we check that we received either "ON" or "OFF" as a parameter
			var cellData = msg._data["inner cell data"];
			if (cellData) {
				if (cellData == "ON" || cellData == "OFF") {
					isON = cellData == "ON";
				}
				else {
					ErrorReporter.ThrowInvalidArg();
					return false;
				}
			}
			else {
				ErrorReporter.ThrowInvalidArg();
				return false;
			}

			msg._data.WEB_PN_ID = null;
			if ((SapConfigurationUtil.getElementOfCollection(element, SAP_SPECIFIER_ENUM.SAP_CRM_RADIOBUTTON_TESTMODE) != null) && isON) {
				//if we found a radio button and we need to turn it "ON", we click on it.
				var radioButtonElem = SapConfigurationUtil.getElementOfCollection(element, SAP_SPECIFIER_ENUM.SAP_CRM_RADIOBUTTON_MAIN);
				radioButtonElem.click();
				return true;
			}

			//if we don't have a radio button check if we have a check-box
			if (SapConfigurationUtil.getElementOfCollection(element, SAP_SPECIFIER_ENUM.SAP_CRM_CHECKBOX_TESTMODE) != null) {
				var isChecked = SapConfigurationUtil.getElementOfCollection(element, SAP_SPECIFIER_ENUM.SAP_CRM_CHECKBOX_CHECKED);
				var checkBoxElem = SapConfigurationUtil.getElementOfCollection(element, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_A);
				//if the checkbox is checked and we need to set it "OFF" or the checkbox is not checked and we need to set it on, we need to click.
				if ((checkBoxElem != null) && ((isChecked && !isON) || (!isChecked && isON))) {
					//create new AO for passing the child id to replay the click
					var itemAO = content.kitsManager.createAO(checkBoxElem, this._parentID);
					if (itemAO != null)
						msg._data.WEB_PN_ID = itemAO.getID();
				}
			}

			var imageCheckBoxElem = SapConfigurationUtil.getElementOfCollection(element, SAP_SPECIFIER_ENUM.SAP_CRM_LINK);
			//check if we have image checkbox
			if (imageCheckBoxElem != null) {
				var checkBoxTitle = imageCheckBoxElem.title;
				if (!!checkBoxTitle) {
					if ((checkBoxTitle.toLowerCase() == "deselect table row" && !isON) ||
						((checkBoxTitle.toLowerCase() == "select table row") && isON)) {
						//create new AO for passing the child id to replay the click
						var itemAO = content.kitsManager.createAO(imageCheckBoxElem, this._parentID);
						if (itemAO != null)
							msg._data.WEB_PN_ID = itemAO.getID();
					}
				}
			}
			return true;
		},

		_getCellIndexByElement: function (element, index) {
			var row = -1;
			var elemRow = SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_ROW);
			if (elemRow == null)
				return null;

			row = this._getCRMRowNumber(elemRow);
			if (row == 0)
				return null;

			//return the Col number 
			var cellElement = SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_CELL);
			if (cellElement == null)
				cellElement = SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_HEADER_CELL); //dealing with header cell

			var cell = cellElement;
			if (cell == null)
				return null;
			var col = cell.cellIndex;
			if (col == null)
				return false;

			// !!! indexes used in script 1-based, in MSHTML 0-based 
			if (row != -1 && col != -1) {
				index.row = row;
				index.col = col + 1;
				return cellElement;
			}
			return null;
		},

		_isRecordRdBtnOrChckBxInCell: function (element, params) {
			var child = SapConfigurationUtil.getElementOfCollection(element, SAP_SPECIFIER_ENUM.SAP_CRM_RADIOBUTTON_TESTMODE);
			//*bExist = false;
			if (child) {
				params["ICWC radiobutton"] = "ON";
				//* bExist = true;
			}
			else {
				//if we don't have a radio button check if we have a checkbox
				child = SapConfigurationUtil.getElementOfCollection(element, SAP_SPECIFIER_ENUM.SAP_CRM_CHECKBOX_TESTMODE);
				if (child != null) {
					var val = SapConfigurationUtil.getElementOfCollection(child, SAP_SPECIFIER_ENUM.SAP_CRM_CHECKBOX_CHECKED) ? "OFF" : "ON";
					params["ICWC checkbox"] = val;
					//* bExist = true;
				}
			}
			return true;
		},

		//in CRM FindRowByCellContent should return the correct row number 
		_fixRowNumber: function (cell, rowIndex) {
			var row = SapConfigurationUtil.getContainerElement(cell, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_ROW);
			if (row != null) {
				var ret = this._getCRMRowNumber(row);
				if (ret != 0) {
					ret = this._convertRowNumberToZeroBased(ret);
					return ret;  // we communicate with package on zero-based.
				}
			}
			return rowIndex; //if failed ,we return the initial value
		}
	}
};